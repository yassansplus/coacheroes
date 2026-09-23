import { ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { buildTrainingContext } from '../program/context';
import { ProgramGenerator, type GenerationOutput } from '../program/generator';
import { TrainingProgram } from '../program/program.entity';
import { ChatAi } from './chat-ai';
import { ChatConversation, ChatMessage } from './chat.entity';

@Injectable()
export class ProgramReviewService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private stopped = false;
  private abort?: AbortController;
  private readonly logger = new Logger(ProgramReviewService.name);
  constructor(private readonly db: DataSource, private readonly ai: ChatAi, private readonly generator: ProgramGenerator) {}
  onModuleInit() { this.timer = setInterval(() => { void this.tick().catch(() => this.logger.error('Program review worker unavailable; messages retained.')); }, 2000); this.timer.unref(); }
  onModuleDestroy() { this.stopped = true; this.abort?.abort(); if (this.timer) clearInterval(this.timer); }
  private async view(row: ChatConversation, manager = this.db.manager) {
    const messages = await manager.find(ChatMessage, { where: { conversationId: row.id }, order: { createdAt: 'ASC', id: 'ASC' } });
    return { id: row.id, purpose: row.purpose, status: row.status, sourceRevision: row.sourceRevision, proposalId: row.programRunId,
      choices: [], error: row.error, messages: messages.map(m => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt, requestId: m.requestId })) };
  }
  private message(manager: EntityManager, row: ChatConversation, text: string) {
    return manager.save(ChatMessage, manager.create(ChatMessage, { conversationId: row.id, role: 'assistant', text, requestId: null }));
  }
  private audit(manager: EntityManager, row: ChatConversation, type: string, payload: Record<string, unknown>) {
    return manager.save(JournalEntry, manager.create(JournalEntry, { userId: row.userId, type, requestId: randomUUID(), occurredAt: new Date(),
      payload: { conversationId: row.id, turnId: row.turnId, proposalId: row.programRunId, ...payload } }));
  }
  private async proposal(manager: EntityManager, userId: string) {
    const profile = await manager.findOneOrFail(Onboarding, { where: { userId }, lock: { mode: 'pessimistic_write' } });
    const program = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
    if (!program || program.status !== 'ready' || !program.output || program.acceptedAt || program.sourceRevision !== profile.revision || program.context.schemaVersion !== 2)
      throw new ConflictException('Recharge ton programme pour continuer.');
    return program;
  }
  async open(userId: string) {
    return this.db.transaction(async manager => {
      const program = await this.proposal(manager, userId);
      let row = await manager.findOne(ChatConversation, { where: { userId, purpose: 'program_review' }, lock: { mode: 'pessimistic_write' } });
      if (row?.programRunId === program.runId) return this.view(row, manager);
      row ??= manager.create(ChatConversation, { userId, purpose: 'program_review' });
      Object.assign(row, { status: 'awaiting_answer', programRunId: program.runId, sourceRevision: program.sourceRevision, question: null, pendingMessageId: null, turnId: null, leaseUntil: null, attempts: 0, error: null });
      await manager.save(row);
      await this.message(manager, row, 'Tu veux ajuster un truc dans ton programme ?');
      return this.view(row, manager);
    });
  }
  async send(userId: string, id: string, requestId: string, text: string, proposalId: string) {
    return this.db.transaction(async manager => {
      const program = await this.proposal(manager, userId);
      const row = await manager.findOne(ChatConversation, { where: { id, userId, purpose: 'program_review' }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException();
      const receipt = await manager.findOneBy(ChatMessage, { conversationId: id, requestId });
      if (receipt && receipt.text !== text) throw new ConflictException('Ce message a déjà été envoyé avec un autre contenu.');
      if (receipt && !(row.status === 'failed' && row.pendingMessageId === receipt.id)) return this.view(row, manager);
      if (row.programRunId !== program.runId || proposalId !== program.runId) throw new ConflictException('Ton programme a changé. Recharge-le avant de répondre.');
      if (!receipt && row.status !== 'awaiting_answer') throw new ConflictException('Ton coach te répond, un instant.');
      if (!receipt && await manager.countBy(ChatMessage, { conversationId: id }) >= 200) throw new ConflictException('Cette discussion est complète.');
      this.ai.ensureConfigured();
      const message = receipt ?? await manager.save(ChatMessage, manager.create(ChatMessage, { conversationId: id, role: 'user', text, requestId }));
      Object.assign(row, { status: 'queued', pendingMessageId: message.id, turnId: randomUUID(), leaseUntil: null, attempts: 0, error: null });
      await manager.save(row); await this.audit(manager, row, 'program.review_message_sent', { messageId: message.id });
      return this.view(row, manager);
    });
  }
  async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const claim = await this.db.transaction(async manager => {
        const row = await manager.getRepository(ChatConversation).createQueryBuilder('chat')
          .where("chat.purpose = 'program_review' AND (chat.status = 'queued' OR (chat.status = 'processing' AND chat.lease_until < :now))", { now: new Date() })
          .orderBy('chat.updated_at', 'ASC').take(1).setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (!row) return null;
        if (row.attempts >= 3) { row.status = 'failed'; row.error = 'Je n’ai pas pu terminer. Réessaie.'; row.leaseUntil = null; await manager.save(row); return null; }
        Object.assign(row, { status: 'processing', attempts: row.attempts + 1, turnId: randomUUID(), leaseUntil: new Date(Date.now() + 480000) });
        return manager.save(row);
      });
      if (!claim) return;
      const abort = new AbortController(); this.abort = abort;
      const deadline = setTimeout(() => abort.abort(), 420000);
      try {
        const program = await this.db.getRepository(TrainingProgram).findOneByOrFail({ userId: claim.userId });
        if (!program.output || program.runId !== claim.programRunId || program.acceptedAt) throw new Error('PROPOSAL_CHANGED');
        const profile = await this.db.getRepository(Onboarding).findOneByOrFail({ userId: claim.userId });
        const user = await this.db.getRepository(User).findOneByOrFail({ id: claim.userId });
        const messages = await this.db.getRepository(ChatMessage).find({ where: { conversationId: claim.id }, order: { createdAt: 'ASC', id: 'ASC' } });
        const pending = messages.find(m => m.id === claim.pendingMessageId);
        if (!pending) throw new Error('MESSAGE_MISSING');
        const context = buildTrainingContext(profile.profile, profile.revision, user.firstName, profile.coachingDetails);
        const response = await this.ai.review(context, program.output, pending.text, messages.filter(m => m.id !== pending.id));
        let revised: GenerationOutput | null = null;
        if (response.answer.action === 'revise') {
          if (!response.answer.instruction) throw new Error('REVISION_MISSING');
          revised = await this.generator.generate(context, async () => {}, abort.signal, { request: JSON.stringify({ message: pending.text, adjustment: response.answer.instruction }), previous: program.output });
        }
        await this.db.transaction(async manager => {
          const currentProfile = await manager.findOneOrFail(Onboarding, { where: { userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
          const current = await manager.findOneOrFail(TrainingProgram, { where: { userId: claim.userId }, lock: { mode: 'pessimistic_write' } });
          const row = await manager.findOneOrFail(ChatConversation, { where: { id: claim.id }, lock: { mode: 'pessimistic_write' } });
          if (row.turnId !== claim.turnId || row.status !== 'processing') return;
          if (current.runId !== claim.programRunId || current.acceptedAt || currentProfile.revision !== claim.sourceRevision) throw new Error('PROPOSAL_CHANGED');
          if (revised?.result.outcome === 'ready') {
            const before = current.output;
            current.output = revised; current.runId = randomUUID(); current.acceptedAt = null; await manager.save(current);
            row.programRunId = current.runId;
            await this.audit(manager, row, 'program.proposal_adjusted', { previousProposalId: claim.programRunId, before, after: revised, messageId: pending.id, trace: response.trace });
          }
          row.status = 'awaiting_answer'; row.leaseUntil = null; row.error = null; await manager.save(row);
          await this.message(manager, row, revised ? revised.result.outcome === 'ready' ? 'C’est ajusté 💪 Regarde si ça te convient avant de valider.' : revised.result.questions.join(' ') : response.answer.reply);
          await this.audit(manager, row, 'program.review_answered', { messageId: pending.id, answer: response.answer, unfulfilledRevision: revised?.result.outcome === 'needs_clarification' ? revised : null, trace: response.trace });
        });
      } catch {
        await this.db.transaction(async manager => {
          const row = await manager.findOneOrFail(ChatConversation, { where: { id: claim.id }, lock: { mode: 'pessimistic_write' } });
          if (row.turnId !== claim.turnId || row.status !== 'processing') return;
          row.status = 'failed'; row.leaseUntil = null; row.error = 'Je n’ai pas pu terminer. Ta proposition est conservée, on réessaie ?';
          await manager.save(row); await this.audit(manager, row, 'program.review_failed', { messageId: row.pendingMessageId });
        });
      } finally { clearTimeout(deadline); this.abort = undefined; }
    } finally { this.busy = false; }
  }
}
