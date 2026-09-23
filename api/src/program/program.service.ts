import { workoutAiContext } from '../workouts/ai-context';
import { ProgramBlock, WorkoutSession } from '../workouts/workout.entity';
import { ConflictException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { buildTrainingContext, requiredClarifications } from './context';
import { ProgramGenerator, type GenerationOutput, type Phase } from './generator';
import { ChatConversation } from '../chat/chat.entity';
import { TrainingProgram } from './program.entity';

@Injectable()
export class ProgramService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private stopped = false;
  private activeAbort?: AbortController;
  private readonly logger = new Logger(ProgramService.name);
  constructor(private readonly db: DataSource, private readonly generator: ProgramGenerator) {}
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
  private view(row: TrainingProgram, stale = false) {
    return { proposalId: row.runId, acceptedAt: row.acceptedAt, status: row.status, phase: row.phase, sourceRevision: row.sourceRevision, stale,
      result: row.output?.result ?? null, exercises: row.output?.exercises ?? [], error: row.error,
      updatedAt: row.updatedAt };
  }
  private async journal(manager: EntityManager, row: TrainingProgram, type: string, payload: Record<string, unknown>) {
    await manager.save(JournalEntry, manager.create(JournalEntry, { userId: row.userId, requestId: randomUUID(),
      type, occurredAt: new Date(), payload: { schemaVersion: 1, runId: row.runId, sourceRevision: row.sourceRevision, ...payload } }));
  }
  async start(userId: string, retry = false, renew = false) {
    return this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!profile.completedAt) throw new ConflictException('Termine ton onboarding avant de générer ton programme.');
      let row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (renew && row?.acceptedAt) {
        const block = await manager.findOneBy(ProgramBlock, {id: row.runId, userId});
        if (!block || block.endsAt.getTime() > Date.now()) throw new ConflictException('Ton bloc est encore en cours.');
      } else if (renew) throw new ConflictException('Valide ton programme avant de le renouveler.');
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
  async accept(userId: string, proposalId: string) {
    return this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      const row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!row || row.runId !== proposalId || row.status !== 'ready' || row.output?.result.outcome !== 'ready' || row.sourceRevision !== profile.revision || row.context.schemaVersion !== 2)
        throw new ConflictException('Ton programme a changé. Recharge-le avant de le valider.');
      const chat = await manager.findOne(ChatConversation, { where: { userId, purpose: 'program_review' }, lock: { mode: 'pessimistic_write' } });
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
