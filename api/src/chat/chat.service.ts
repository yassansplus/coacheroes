import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { buildTrainingContext } from '../program/context';
import { TrainingProgram } from '../program/program.entity';
import { ProgramService } from '../program/program.service';
import { ChatAi } from './chat-ai';
import { ChatConversation, ChatMessage } from './chat.entity';
import { nextQuestion, needsReview } from './questions';
import { projectAnswer } from './apply-answer';

@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private stopped = false;
  private readonly logger = new Logger(ChatService.name);
  constructor(private readonly db: DataSource, private readonly ai: ChatAi, private readonly programs: ProgramService) {}
  onModuleInit() { this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error('Chat worker unavailable; messages retained.')); }, 2000); this.timer.unref(); }
  onModuleDestroy() { this.stopped = true; if (this.timer) clearInterval(this.timer); }
  private async view(row: ChatConversation, manager = this.db.manager) {
    const messages = await manager.find(ChatMessage, { where: { conversationId: row.id }, order: { createdAt: 'ASC', id: 'ASC' } });
    return { id: row.id, purpose: row.purpose, proposalId: row.programRunId, status: row.status, sourceRevision: row.sourceRevision,
      choices: row.status === 'awaiting_answer' ? row.question?.choices ?? [] : [], error: row.error,
      messages: messages.map(m => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt, requestId: m.requestId })) };
  }
  private message(manager: EntityManager, row: ChatConversation, text: string) {
    return manager.save(ChatMessage, manager.create(ChatMessage, { conversationId: row.id, role: 'assistant', text, requestId: null }));
  }
  private audit(manager: EntityManager, row: ChatConversation, type: string, payload: Record<string, unknown>) {
    return manager.save(JournalEntry, manager.create(JournalEntry, { userId: row.userId, requestId: randomUUID(), type,
      occurredAt: new Date(), payload: { conversationId: row.id, turnId: row.turnId, sourceRevision: row.sourceRevision, ...payload } }));
  }
  async get(userId: string, id: string) {
    const row = await this.db.getRepository(ChatConversation).findOneBy({ id, userId });
    if (!row) throw new NotFoundException();
    return this.view(row);
  }
  async prepare(userId: string) {
    return this.db.transaction(async manager => {
      const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
      if (!profile.completedAt) throw new ConflictException('Termine tes réponses pour continuer.');
      const user = await manager.findOneByOrFail(User, { id: userId });
      let row = await manager.findOne(ChatConversation, { where: { userId, purpose: 'onboarding' }, lock: { mode: 'pessimistic_write' } });
      if (row && (['queued', 'processing'].includes(row.status) || row.status === 'failed' && row.sourceRevision === profile.revision)) return this.view(row, manager);
      const context = buildTrainingContext(profile.profile, profile.revision, user.firstName, profile.coachingDetails);
      const program = await manager.findOneBy(TrainingProgram, { userId });
      const pendingQuestion = program?.sourceRevision === profile.revision && program.status === 'needs_clarification' ? program.output?.result.questions[0] : undefined;
      const question = nextQuestion(context, needsReview(context) ? undefined : pendingQuestion);
      const status = question ? 'awaiting_answer' : needsReview(context) ? 'blocked' : 'ready';
      const changed = !row || row.sourceRevision !== profile.revision || row.question?.key !== question?.key || row.question?.text !== question?.text || row.question?.sport !== question?.sport || JSON.stringify(row.question?.choices) !== JSON.stringify(question?.choices) || row.status !== status;
      row ??= manager.create(ChatConversation, { userId, purpose: 'onboarding', attempts: 0, pendingMessageId: null, turnId: null, leaseUntil: null });
      Object.assign(row, { sourceRevision: profile.revision, question, status, error: null });
      await manager.save(row);
      if (changed) await this.message(manager, row, question?.text ?? (status === 'blocked' ? 'J’ai noté ta douleur. Fais valider les mouvements adaptés avec un pro avant de lancer ton programme.' : `Nickel${user.firstName && user.firstName !== 'toi' ? ` ${user.firstName}` : ''} 💪 Je prépare ta semaine.`));
      return this.view(row, manager);
    });
  }
  async send(userId: string, id: string, requestId: string, text: string) {
    return this.db.transaction(async manager => {
      const row = await manager.findOne(ChatConversation, { where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException();
      if (row.purpose !== 'onboarding') throw new ConflictException('Utilise le chat de ton programme.');
      const receipt = await manager.findOneBy(ChatMessage, { conversationId: id, requestId });
      if (receipt) {
        if (receipt.text !== text) throw new ConflictException('Ce message a déjà été envoyé avec un autre contenu.');
        if (row.status !== 'failed' || row.pendingMessageId !== receipt.id) return this.view(row, manager);
      } else {
        if (row.status !== 'awaiting_answer' || !row.question) throw new ConflictException('Attends la réponse du coach avant de continuer.');
        if (await manager.countBy(ChatMessage, { conversationId: id }) >= 100) throw new ConflictException('Cette discussion est complète. Modifie ton profil pour continuer.');
      }
      this.ai.ensureConfigured();
      const message = receipt ?? await manager.save(ChatMessage, manager.create(ChatMessage, { conversationId: id, role: 'user', text, requestId }));
      Object.assign(row, { pendingMessageId: message.id, status: 'queued', turnId: randomUUID(), leaseUntil: null, attempts: 0, error: null });
      await manager.save(row);
      await this.audit(manager, row, receipt ? 'chat.turn_retried' : 'chat.message_sent', { messageId: message.id });
      return this.view(row, manager);
    });
  }
  async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const claim = await this.db.transaction(async manager => {
        const row = await manager.getRepository(ChatConversation).createQueryBuilder('chat')
          .where("chat.purpose = 'onboarding' AND (chat.status = 'queued' OR (chat.status = 'processing' AND chat.lease_until < :now))", { now: new Date() })
          .orderBy('chat.updated_at', 'ASC').take(1).setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (!row) return null;
        if (row.attempts >= 3) {
          row.status = 'failed'; row.error = 'Je n’ai pas pu terminer. On réessaie ?'; row.leaseUntil = null;
          await manager.save(row); return null;
        }
        row.status = 'processing'; row.turnId = randomUUID(); row.attempts++; row.leaseUntil = new Date(Date.now() + 90000);
        await manager.save(row); return row;
      });
      if (!claim) return;
      try {
        const profile = await this.db.getRepository(Onboarding).findOneByOrFail({ userId: claim.userId });
        const user = await this.db.getRepository(User).findOneByOrFail({ id: claim.userId });
        const messages = await this.db.getRepository(ChatMessage).find({ where: { conversationId: claim.id }, order: { createdAt: 'ASC', id: 'ASC' } });
        const pending = messages.find(m => m.id === claim.pendingMessageId);
        if (!pending || !claim.question) throw new Error('CHAT_INVALID_TURN');
        const response = await this.ai.answer(buildTrainingContext(profile.profile, profile.revision, user.firstName, profile.coachingDetails), claim.question, pending.text, messages.filter(m => m.id !== pending.id));
        const ready = await this.db.transaction(async manager => {
          const current = await manager.findOneOrFail(Onboarding, { where: { userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
          const row = await manager.findOneOrFail(ChatConversation, { where: { id: claim.id }, lock: { mode: 'pessimistic_write' } });
          if (row.turnId !== claim.turnId || row.status !== 'processing') return false;
          const account = await manager.findOneOrFail(User, { where: { id: claim.userId }, lock: { mode: 'pessimistic_write' } });
          if (current.revision !== claim.sourceRevision) {
            row.status = 'awaiting_answer'; row.sourceRevision = current.revision; row.leaseUntil = null;
            row.question = nextQuestion(buildTrainingContext(current.profile, current.revision, account.firstName, current.coachingDetails));
            if (!row.question) row.status = needsReview(buildTrainingContext(current.profile, current.revision, account.firstName, current.coachingDetails)) ? 'blocked' : 'ready';
            await manager.save(row); await this.message(manager, row, row.question?.text ?? 'Ton profil a changé. Je repars de tes dernières réponses.');
            await this.audit(manager, row, 'chat.answer_obsolete', { messageId: pending.id, answer: response.answer, trace: response.trace }); return row.status === 'ready';
          }
          const projected = projectAnswer(current.profile, current.coachingDetails, account.firstName, claim.question!, response.answer, pending.text);
          row.leaseUntil = null; row.error = null;
          if (!projected) {
            row.status = 'awaiting_answer'; await manager.save(row);
            await this.message(manager, row, response.answer.understood ? 'Il me manque un détail. ' + claim.question!.text : response.answer.reply);
            await this.audit(manager, row, 'chat.answer_received', { applied: false, answer: response.answer, trace: response.trace }); return false;
          }
          const before = { profile: current.profile, coachingDetails: current.coachingDetails, firstName: account.firstName };
          current.profile = projected.profile; current.coachingDetails = projected.details; current.revision++;
          account.firstName = projected.firstName;
          await manager.save(current); await manager.save(account);
          const context = buildTrainingContext(current.profile, current.revision, account.firstName, current.coachingDetails);
          row.sourceRevision = current.revision; row.question = nextQuestion(context);
          row.status = row.question ? 'awaiting_answer' : needsReview(context) ? 'blocked' : 'ready';
          await manager.save(row);
          await this.audit(manager, row, 'profile.coaching_answer_applied', { messageId: pending.id, before,
            after: { profile: current.profile, coachingDetails: current.coachingDetails, firstName: account.firstName }, answer: response.answer, trace: response.trace });
          const next = row.question?.text ?? (row.status === 'blocked' ? 'J’ai noté. Fais valider les mouvements adaptés avec un pro avant de lancer ton programme.' : `Nickel${account.firstName && account.firstName !== 'toi' ? ` ${account.firstName}` : ''} 💪 Je prépare ta semaine.`);
          await this.message(manager, row, next);
          return row.status === 'ready';
        });
        // Also starts when the mobile app was closed during this turn; POST remains idempotent.
        if (ready) await this.programs.start(claim.userId).catch(() => undefined);
      } catch {
        await this.db.transaction(async manager => {
          const row = await manager.findOneOrFail(ChatConversation, { where: { id: claim.id }, lock: { mode: 'pessimistic_write' } });
          if (row.turnId !== claim.turnId || row.status !== 'processing') return;
          row.status = 'failed'; row.leaseUntil = null; row.error = 'Petit souci de connexion. Ton message est gardé, on réessaie ?';
          await manager.save(row); await this.audit(manager, row, 'chat.turn_failed', { messageId: row.pendingMessageId });
        });
      }
    } finally { this.busy = false; }
  }
}
