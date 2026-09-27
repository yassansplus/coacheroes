import { workoutAiContext } from '../workouts/ai-context';
import { ProgramBlock, WorkoutSession } from '../workouts/workout.entity';
import { BadRequestException, ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { DataSource, EntityManager } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { buildTrainingContext, requiredClarifications } from './context';
import { ProgramGenerator, type GenerationOutput, type Phase } from './generator';
import { ChatConversation } from '../chat/chat.entity';
import { TrainingProgram } from './program.entity';
import { profileSchema, completionError } from '../onboarding/onboarding.schema';
import { coachingDetailsSchema } from '../chat/planning';
import { RenewalSummary } from './renewal-summary';
import type { z } from 'zod';
import type { renewalRequestSchema } from './renewal.schema';

@Injectable()
export class ProgramService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private stopped = false;
  private activeAbort?: AbortController;
  private readonly logger = new Logger(ProgramService.name);
  constructor(private readonly db: DataSource, private readonly generator: ProgramGenerator, private readonly renewalSummary: RenewalSummary = new RenewalSummary(db)) {}
  onModuleInit() {
    this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error('Program worker unavailable; pending jobs retained.')); }, 2000);
    this.timer.unref();
  }
  onModuleDestroy() { this.stopped = true; this.activeAbort?.abort(); if (this.timer) clearInterval(this.timer); }
  async get(userId: string) {
    const row = await this.db.getRepository(TrainingProgram).findOneBy({ userId });
    if (!row) return null;
    const profile = await this.db.getRepository(Onboarding).findOneByOrFail({ userId });
    return this.view(row, row.sourceRevision !== profile.revision || row.context.schemaVersion !== 2);
  }
  history(userId: string) { return this.renewalSummary.history(userId); }
  block(userId: string, id: string) { return this.renewalSummary.get(userId, id); }
  private view(row: TrainingProgram, stale = false) {
    return { proposalId: row.runId, acceptedAt: row.acceptedAt, previousBlockId: row.context.sourceBlockId ?? null,
      status: row.status, phase: row.phase, sourceRevision: row.sourceRevision, stale,
      result: row.output?.result ?? null, exercises: row.output?.exercises ?? [], error: row.error,
      updatedAt: row.updatedAt };
  }
  private async journal(manager: EntityManager, row: TrainingProgram, type: string, payload: Record<string, unknown>) {
    await manager.save(JournalEntry, manager.create(JournalEntry, { userId: row.userId, requestId: randomUUID(),
      type, occurredAt: new Date(), payload: { schemaVersion: 1, runId: row.runId, sourceRevision: row.sourceRevision, ...payload } }));
  }
  async start(userId: string, retry = false, renew = false) {
    if (renew) throw new BadRequestException('Fais le bilan du programme avant de préparer le suivant.');
    return this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!profile.completedAt) throw new ConflictException('Termine ton onboarding avant de générer ton programme.');
      let row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (retry && row?.status === 'failed' && row.context.renewal && row.sourceRevision === profile.revision) {
        row.runId = randomUUID(); row.status = 'queued'; row.phase = 'preparing'; row.attempts = 0; row.error = null; row.output = null;
        await manager.save(row); await this.journal(manager, row, 'program.renewal_retried', { sourceBlockId: row.context.sourceBlockId });
        return this.view(row);
      }
      if (!renew && row && row.sourceRevision === profile.revision && row.context.schemaVersion === 2 && !(retry && row.status === 'failed')) return this.view(row);
      const user = await manager.findOneByOrFail(User, { id: userId });
      const context = buildTrainingContext(profile.profile, profile.revision, user.firstName, profile.coachingDetails);
      if (!requiredClarifications(context).length) this.generator.ensureConfigured();
      const history=await manager.find(WorkoutSession,{where:{userId,status:'completed'},order:{startedAt:'DESC'},take:30});
      Object.assign(context,{renewal:renew,trainingHistory:history.map(w=>workoutAiContext(w.snapshot,user.firstName))});
      const previous = row ? { sourceRevision: row.sourceRevision, status: row.status, context: row.context, output: row.output, error: row.error } : null;
      row ??= manager.create(TrainingProgram, { userId });
      Object.assign(row, { sourceRevision: profile.revision, context, output: null, acceptedAt: null, status: 'queued', phase: 'preparing',
        runId: randomUUID(), attempts: 0, leaseUntil: null, error: null });
      await manager.save(row);
      await this.journal(manager, row, 'program.requested', { before: previous, after: { context, settings: this.generator.settings() } });
      return this.view(row);
    });
  }
  async renew(userId: string, input: z.infer<typeof renewalRequestSchema>) {
    return this.db.transaction(async manager => {
      const profileRow = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const previousReceipt = await manager.findOneBy(JournalEntry, { userId, requestId: input.requestId });
      if (previousReceipt?.type === 'program.renewal_requested' && row?.context.sourceBlockId === input.blockId)
        return this.view(row);
      if (previousReceipt) throw new ConflictException('Cet identifiant de requête a déjà été utilisé.');
      if (!row?.acceptedAt || row.runId !== input.blockId) throw new ConflictException('Le programme actif a changé. Recharge le bilan.');
      const block = await manager.findOne(ProgramBlock, { where: { id: input.blockId, userId }, lock: { mode: 'pessimistic_write' } });
      if (!block || block.endsAt.getTime() > Date.now()) throw new ConflictException('Ton bloc est encore en cours.');
      if (profileRow.revision !== input.profileRevision) throw new ConflictException('Ton profil a changé. Recharge tes réponses.');
      const answers = input.answers;
      const beforeProfile = profileSchema.parse(profileRow.profile);
      const review = await this.renewalSummary.get(userId, block.id, manager);
      const lastRecordedWeight = review.summary.weight.latestKnown?.kg;
      const updated = profileSchema.parse({ ...beforeProfile, goal: answers.goals, sports: answers.sports, places: answers.places,
        days: answers.days, sessions: answers.sessions, duration: answers.duration, timeOfDay: answers.timeOfDay,
        gymType: answers.gymType, equipment: answers.equipment, noPain: answers.noPain,
        pains: answers.noPain ? [] : answers.pains, painNotes: answers.noPain ? '' : answers.painNotes,
        weight: String(answers.weightKg ?? lastRecordedWeight ?? beforeProfile.weight),
        skippedSteps: beforeProfile.skippedSteps.filter(step => ![7, 8].includes(step)) });
      const error = completionError(updated);
      if (error) throw new BadRequestException(error);
      const beforeCoaching = coachingDetailsSchema.parse(profileRow.coachingDetails);
      const nextCoaching = coachingDetailsSchema.parse({ ...beforeCoaching, schedules: answers.schedules });
      const user = await manager.findOneByOrFail(User, { id: userId });
      if (!isDeepStrictEqual(beforeProfile, updated) || !isDeepStrictEqual(beforeCoaching, nextCoaching)) {
        profileRow.profile = updated; profileRow.coachingDetails = nextCoaching; profileRow.revision++;
        await manager.save(profileRow);
        await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId: randomUUID(),
          type: 'onboarding.renewal_updated', occurredAt: new Date(), payload: { blockId: block.id, before: { profile: beforeProfile, coaching: beforeCoaching },
            after: { profile: updated, coaching: nextCoaching }, revision: profileRow.revision } }));
      }
      if (answers.weightKg !== null) {
        const [preference] = await manager.query('SELECT timezone FROM daily_preferences WHERE user_id=$1', [userId]);
        const date = new Intl.DateTimeFormat('en-CA', { timeZone: preference?.timezone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
        await manager.query(`INSERT INTO progression_weights(user_id,date,value_kg,source) VALUES($1,$2,$3,'renewal')
          ON CONFLICT(user_id,date) DO UPDATE SET value_kg=EXCLUDED.value_kg,source='renewal',revision=progression_weights.revision+1,updated_at=now()`, [userId, date, answers.weightKg]);
      }
      const context = buildTrainingContext(updated, profileRow.revision, user.firstName, nextCoaching);
      const history = await manager.find(WorkoutSession, { where: { userId, programVersionId: block.id }, order: { startedAt: 'ASC' } });
      const previousProgram = (block.prescription as any).output?.result;
      Object.assign(context, { renewal: true, sourceBlockId: block.id, previousProgram,
        blockSummary: { ...review.summary, workouts: undefined }, renewalAnswers: answers,
        trainingHistory: history.filter(session => session.status === 'completed' || session.status === 'abandoned')
          .map(session => workoutAiContext(session.snapshot, user.firstName)) });
      if (!requiredClarifications(context).length) this.generator.ensureConfigured();
      const previous = { status: row.status, context: row.context, output: row.output, acceptedAt: row.acceptedAt };
      block.renewalReview = { answers, submittedAt: new Date().toISOString(), analysis: null };
      await manager.save(block);
      Object.assign(row, { sourceRevision: profileRow.revision, context, output: null, acceptedAt: null, status: 'queued',
        phase: 'preparing', runId: randomUUID(), attempts: 0, leaseUntil: null, error: null });
      await manager.save(row);
      await manager.save(JournalEntry, manager.create(JournalEntry, { userId, requestId: input.requestId,
        type: 'program.renewal_requested', occurredAt: new Date(), payload: { schemaVersion: 1, runId: row.runId,
          sourceBlockId: block.id, before: previous, answers, summary: review.summary, settings: this.generator.settings() } }));
      return this.view(row);
    });
  }
  async accept(userId: string, proposalId: string) {
    return this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!row || row.runId !== proposalId || row.status !== 'ready' || row.output?.result.outcome !== 'ready' || row.sourceRevision !== profile.revision || row.context.schemaVersion !== 2)
        throw new ConflictException('Ton programme a changé. Recharge-le avant de le valider.');
      const chat = await manager.findOne(ChatConversation, { where: { userId, purpose: 'program_review', programRunId: row.runId }, lock: { mode: 'pessimistic_write' } });
      if (chat && ['queued', 'processing'].includes(chat.status)) throw new ConflictException('Attends la réponse de ton coach avant de valider.');
      if (!row.acceptedAt) {
        row.acceptedAt = new Date(); await manager.save(row);
        await manager.save(ProgramBlock, manager.create(ProgramBlock, {id:row.runId,userId,prescription:{output:row.output,context:row.context},startedAt:row.acceptedAt,endsAt:new Date(row.acceptedAt.getTime()+28*86400000),extensions:0}));
        await this.journal(manager, row, 'program.accepted', { acceptedAt: row.acceptedAt, output: row.output });
      }
      return this.view(row);
    });
  }
  // A database lease permits restart recovery and multiple API processes without duplicate publication.
  async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const row = await this.db.transaction(async manager => {
        const job = await manager.getRepository(TrainingProgram).createQueryBuilder('program')
          .where("program.status = 'queued' OR (program.status = 'generating' AND program.lease_until < :now)", { now: new Date() })
          .orderBy('program.updated_at', 'ASC').take(1).setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (!job) return null;
        if (job.attempts >= 3) {
          job.status = 'failed'; job.error = 'La génération a été interrompue plusieurs fois. Réessaie.'; job.leaseUntil = null;
          await manager.save(job); await this.journal(manager, job, 'program.failed', { code: 'INTERRUPTED' }); return null;
        }
        job.runId = randomUUID(); job.status = 'generating'; job.attempts++; job.leaseUntil = new Date(Date.now() + 120000);
        await manager.save(job); await this.journal(manager, job, 'program.started', { attempt: job.attempts }); return job;
      });
      if (!row) return;
      const abort = new AbortController();
      this.activeAbort = abort;
      const deadline = setTimeout(() => abort.abort(), 360000);
      const heartbeat = setInterval(() => {
        void this.db.getRepository(TrainingProgram).update({ userId: row.userId, runId: row.runId, status: 'generating' }, { leaseUntil: new Date(Date.now() + 120000) })
          .then(result => { if (!result.affected) abort.abort(); }).catch(() => abort.abort());
      }, 20000);
      try {
        if (row.context.renewal && row.context.sourceBlockId) {
          const assessed = await this.generator.analyzeRenewal(row.context, abort.signal);
          row.context = { ...row.context, renewalAnalysis: assessed.analysis, renewalAnalysisTrace: assessed.trace };
        }
        const output = await this.generator.generate(row.context, phase => this.setPhase(row, phase), abort.signal);
        await this.finish(row, output);
      } catch (error) {
        const code = error instanceof Error && /^(OPENAI_|WGER_|PROGRAM_|TOOL_)/.test(error.message) ? error.message : 'GENERATION_INTERRUPTED';
        await this.finish(row, null, code);
      } finally { clearInterval(heartbeat); clearTimeout(deadline); this.activeAbort = undefined; }
    } finally { this.busy = false; }
  }
  private async setPhase(row: TrainingProgram, phase: Phase) {
    if (row.phase === phase) return;
    const result = await this.db.getRepository(TrainingProgram).update({ userId: row.userId, runId: row.runId, status: 'generating' }, { phase });
    if (!result.affected) throw new Error('GENERATION_SUPERSEDED');
    row.phase = phase;
  }
  private async finish(claim: TrainingProgram, output: GenerationOutput | null, code?: string) {
    await this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager.findOneOrFail(TrainingProgram, { where: { userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
      if (row.runId !== claim.runId || row.status !== 'generating') return;
      if (profile.revision !== row.sourceRevision) { output = null; code = 'PROFILE_CHANGED'; }
      if (claim.context.renewalAnalysis && claim.context.sourceBlockId) {
        row.context = claim.context;
        const block = await manager.findOne(ProgramBlock, { where: { id: claim.context.sourceBlockId, userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
        if (block) { block.renewalReview = { ...block.renewalReview, analysis: { analysis: claim.context.renewalAnalysis,
          trace: claim.context.renewalAnalysisTrace } }; await manager.save(block); }
      }
      row.output = output;
      row.status = output?.result.outcome ?? 'failed';
      row.leaseUntil = null;
      row.error = !output ? code === 'PROFILE_CHANGED' ? 'Ton profil a changé. Relance la génération avec tes nouvelles réponses.'
        : code === 'OPENAI_HTTP_401' || code === 'OPENAI_HTTP_403' ? 'La configuration OpenAI du serveur doit être vérifiée.'
        : 'La génération n’a pas pu aboutir. Ton profil est enregistré ; tu peux réessayer.' : null;
      await manager.save(row);
      await this.journal(manager, row, output ? 'program.generated' : 'program.failed', { output, code: code ?? null });
    });
  }
}
