import { BadRequestException, ConflictException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { NutritionCoachContext } from '../nutrition/nutrition-coach-context';
import { NutritionMeal, NutritionPlan } from '../nutrition/nutrition.entity';
import { TrainingProgram } from '../program/program.entity';
import { ProgramBlock, WorkoutSession } from '../workouts/workout.entity';
import { anonymousData, workoutAiContext } from '../workouts/ai-context';
import { CoachAi, type CoachAnswer } from './coach-ai';
import { CoachConversation, CoachMessage, CoachProposal } from './coach.entity';

@Injectable()
export class CoachService {
  constructor(private readonly db: DataSource, private readonly ai: CoachAi, private readonly nutritionContext: NutritionCoachContext) {}
  private async journal(manager: EntityManager, userId: string, type: string, payload: Record<string, unknown>, requestId: string = randomUUID()) {
    await manager.save(JournalEntry, manager.create(JournalEntry, { userId, type, payload: { schemaVersion: 1, ...payload }, requestId, occurredAt: new Date() }));
  }
  async list(userId: string) {
    const rows = await this.db.getRepository(CoachConversation).find({ where: { userId }, order: { updatedAt: 'DESC' } });
    return rows.map(row => ({ id: row.id, title: row.title, updatedAt: row.updatedAt }));
  }
  async get(userId: string, id: string) {
    const row = await this.db.getRepository(CoachConversation).findOneBy({ id, userId });
    if (!row) throw new NotFoundException('Conversation introuvable.');
    const [messages, proposals] = await Promise.all([
      this.db.getRepository(CoachMessage).find({ where: { conversationId: id }, order: { createdAt: 'ASC', id: 'ASC' } }),
      this.db.getRepository(CoachProposal).find({ where: { conversationId: id }, order: { createdAt: 'ASC' } }),
    ]);
    return { id: row.id, title: row.title, updatedAt: row.updatedAt,
      messages: messages.map(m => ({ id: m.id, role: m.role === 'assistant' ? 'coach' : 'user', text: m.text, createdAt: m.createdAt, proposalId: m.proposalId })),
      proposals: proposals.map(p => ({ id: p.id, status: p.status, kind: p.kind, description: p.description, change: p.change, createdAt: p.createdAt })) };
  }
  private async base(userId: string) {
    const [user, onboarding, program, plan] = await Promise.all([
      this.db.getRepository(User).findOneByOrFail({ id: userId }),
      this.db.getRepository(Onboarding).findOneBy({ userId }),
      this.db.getRepository(TrainingProgram).findOneBy({ userId }),
      this.db.getRepository(NutritionPlan).find({ where: { userId }, order: { createdAt: 'DESC' }, take: 1 }),
    ]);
    const { photos: _photos, ...profile } = onboarding?.profile ?? {};
    return { firstName: user.firstName, onboarding: profile, coachingDetails: onboarding?.coachingDetails ?? {},
      program: { accepted: Boolean(program?.acceptedAt), runId: program?.acceptedAt ? program.runId : null },
      nutritionTargets: plan[0]?.status === 'ready' && plan[0]?.programRunId === program?.runId ? plan[0].targets : null,
      now: new Date().toISOString() };
  }
  private async tool(userId: string, currentId: string, localDate: string, name: string, args: Record<string, unknown>): Promise<unknown> {
    const user = await this.db.getRepository(User).findOneByOrFail({ id: userId });
    if (name === 'get_program') {
      const row = await this.db.getRepository(TrainingProgram).findOneBy({ userId });
      if (!row?.acceptedAt || row.output?.result.outcome !== 'ready') return { available: false };
      return anonymousData({ runId: row.runId, summary: row.output.result.summary, blockWeeks: row.output.result.blockWeeks,
        sessions: row.output.result.sessions.map((s, sessionIndex) => ({ sessionIndex, name: s.name, sport: s.sport, weekday: s.weekday,
          estimatedMinutes: s.estimatedMinutes, exercises: s.exercises.map((e, exerciseIndex) => ({ exerciseIndex,
            name: row.output?.exercises.find(item => item.id === e.exerciseId)?.name ?? `Exercice ${e.exerciseId}`,
            sets: e.sets, minReps: e.minReps, maxReps: e.maxReps, rir: e.rir })) })) }, user.firstName);
    }
    if (name === 'get_nutrition') {
      const [program, plan, meals] = await Promise.all([
        this.db.getRepository(TrainingProgram).findOneBy({ userId }),
        this.db.getRepository(NutritionPlan).find({ where: { userId }, order: { createdAt: 'DESC' }, take: 1 }),
        this.db.getRepository(NutritionMeal).find({ where: { userId, deletedAt: IsNull() }, order: { date: 'DESC', createdAt: 'DESC' }, take: 30 }),
      ]);
      return anonymousData({ targets: program?.acceptedAt && plan[0]?.programRunId === program.runId && plan[0]?.status === 'ready' ? plan[0].targets : null,
        meals: meals.map(m => ({ id: m.id, revision: m.revision, date: m.date, moment: m.snapshot.moment,
          totals: m.snapshot.totals, items: m.snapshot.items.map(item => ({ id: item.id, actionTargetId: `${m.id}:${item.id}`,
            name: item.food.name, amount: item.amount, unit: item.food.baseUnit })) })) }, user.firstName);
    }
    if (name === 'get_seven_day_journal') return this.nutritionContext.sevenDayJournal(userId, localDate);
    if (name === 'get_prior_coach_advice') return this.nutritionContext.coachMemory(userId, 0, 30);
    if (name === 'get_workout_history') {
      const rows = await this.db.getRepository(WorkoutSession).find({ where: { userId, status: 'completed' }, order: { startedAt: 'DESC' }, take: 30 });
      return rows.map(row => workoutAiContext(row.snapshot, user.firstName));
    }
    if (name === 'get_daily_checkins') {
      const rows = await this.db.query(`SELECT date::text AS date, data FROM daily_check_ins
        WHERE user_id=$1 AND completed_at IS NOT NULL AND date <= $2 ORDER BY date DESC LIMIT 30`, [userId, localDate]) as { date: string; data: unknown }[];
      return anonymousData(rows, user.firstName);
    }
    if (name === 'search_memory') {
      const query = typeof args.query === 'string' ? args.query.trim().slice(0, 80) : '';
      if (query.length < 2) throw new BadRequestException('Recherche invalide.');
      const words = query.toLowerCase().split(/\s+/).filter(word => word.length > 2).slice(0, 5);
      const rows = await this.db.getRepository(CoachConversation).find({ where: { userId }, order: { updatedAt: 'DESC' } });
      return anonymousData(rows.filter(row => row.id !== currentId && words.some(word => `${row.title} ${row.summary}`.toLowerCase().includes(word)))
        .slice(0, 10).map(row => ({ id: row.id, title: row.title, summary: row.summary, updatedAt: row.updatedAt })), user.firstName);
    }
    if (name === 'read_conversation') {
      const id = typeof args.conversationId === 'string' ? args.conversationId : '';
      if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: 'Identifiant invalide.' };
      const row = await this.db.getRepository(CoachConversation).findOneBy({ id, userId });
      if (!row || row.id === currentId) return { error: 'Conversation introuvable.' };
      const messages = await this.db.getRepository(CoachMessage).find({ where: { conversationId: id }, order: { createdAt: 'DESC' }, take: 40 });
      return anonymousData({ title: row.title, summary: row.summary,
        messages: messages.reverse().map(m => ({ role: m.role, text: m.text, at: m.createdAt })) }, user.firstName);
    }
    throw new BadRequestException('Outil inconnu.');
  }
  private async proposed(userId: string, answer: CoachAnswer) {
    if (answer.actionType === 'program_exercise') {
      const row = await this.db.getRepository(TrainingProgram).findOneBy({ userId });
      if (!row?.acceptedAt || row.output?.result.outcome !== 'ready') return null;
      const [profile, block] = await Promise.all([
        this.db.getRepository(Onboarding).findOneBy({ userId }),
        this.db.getRepository(ProgramBlock).findOneBy({ id: row.runId, userId }),
      ]);
      if (!profile || row.sourceRevision !== profile.revision || !block || block.endsAt <= new Date()) return null;
      const session = row.output.result.sessions[answer.sessionIndex];
      const exercise = session?.exercises[answer.exerciseIndex];
      if (!exercise || answer.sets < 1 || answer.sets > 6 || answer.rir < 2 || answer.rir > 5 ||
        (exercise.sets === answer.sets && exercise.rir === answer.rir)) return null;
      const name = row.output.exercises.find(item => item.id === exercise.exerciseId)?.name ?? 'Exercice';
      return { kind: 'program_exercise' as const, description: `${session.name} · ${name} : ${exercise.sets} → ${answer.sets} séries, RIR ${exercise.rir} → ${answer.rir}.`,
        change: { runId: row.runId, sessionIndex: answer.sessionIndex, exerciseIndex: answer.exerciseIndex,
          oldSets: exercise.sets, oldRir: exercise.rir, sets: answer.sets, rir: answer.rir } };
    }
    if (answer.actionType === 'meal_portion') {
      // targetId is "meal UUID:item UUID" to keep the model's action unambiguous.
      const parts = answer.targetId.split(':');
      if (parts.length !== 2 || parts.some(part => !/^[0-9a-f-]{36}$/i.test(part))) return null;
      const meal = await this.db.getRepository(NutritionMeal).findOneBy({ id: parts[0], userId, deletedAt: IsNull() });
      const food = meal?.snapshot.items.find(value => value.id === parts[1]);
      if (!meal || !food || answer.amount <= 0 || answer.amount > 10000 || answer.amount === food.amount) return null;
      return { kind: 'meal_portion' as const, description: `${meal.snapshot.moment} · ${food.food.name} : ${food.amount} → ${answer.amount} ${food.food.baseUnit}.`,
        change: { mealId: meal.id, revision: meal.revision, itemId: food.id, oldAmount: food.amount, amount: answer.amount } };
    }
    return null;
  }
  async send(userId: string, id: string | null, requestId: string, text: string, localDate: string) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) throw new BadRequestException('Écris un message de 1 à 2000 caractères.');
    const claim = await this.db.transaction(async manager => {
      const existing = await manager.findOneBy(CoachMessage, { requestId });
      if (existing) {
        const owner = await manager.findOneBy(CoachConversation, { id: existing.conversationId, userId });
        if (!owner || existing.text !== trimmed) throw new ConflictException('Ce message a déjà été utilisé.');
        return { id: owner.id, duplicate: true };
      }
      let row = id ? await manager.findOne(CoachConversation, { where: { id, userId }, lock: { mode: 'pessimistic_write' } }) : null;
      if (id && !row) throw new NotFoundException('Conversation introuvable.');
      if (row?.processingUntil && row.processingUntil > new Date()) throw new ConflictException('Le coach répond déjà, un instant.');
      row ??= manager.create(CoachConversation, { userId, title: trimmed.slice(0, 80), summary: '', summaryCount: 0 });
      row.processingUntil = new Date(Date.now() + 6 * 60000);
      await manager.save(row);
      await manager.save(CoachMessage, manager.create(CoachMessage, { conversationId: row.id, role: 'user', text: trimmed, requestId, proposalId: null }));
      await this.journal(manager, userId, 'coach.message.sent', { conversationId: row.id, text: trimmed }, requestId);
      return { id: row.id, duplicate: false };
    });
    if (claim.duplicate) return this.get(userId, claim.id);
    try {
      const row = await this.db.getRepository(CoachConversation).findOneByOrFail({ id: claim.id });
      const messages = await this.db.getRepository(CoachMessage).find({ where: { conversationId: claim.id }, order: { createdAt: 'ASC', id: 'ASC' } });
      const summaries = (await this.db.getRepository(CoachConversation).find({ where: { userId }, order: { updatedAt: 'DESC' }, take: 21 }))
        .filter(item => item.id !== claim.id).slice(0, 20)
        .map(item => ({ id: item.id, title: item.title, summary: item.summary, updatedAt: item.updatedAt }));
      const { answer, trace } = await this.ai.answer({ ...await this.base(userId), localDate }, messages.map(m => ({ role: m.role, text: m.text })), summaries,
        (name, args) => this.tool(userId, claim.id, localDate, name, args));
      const action = await this.proposed(userId, answer);
      await this.db.transaction(async manager => {
        const current = await manager.findOneOrFail(CoachConversation, { where: { id: claim.id, userId }, lock: { mode: 'pessimistic_write' } });
        let proposal: CoachProposal | null = null;
        if (action) proposal = await manager.save(CoachProposal, manager.create(CoachProposal, { conversationId: current.id,
          kind: action.kind, status: 'pending', change: action.change, description: action.description }));
        const reply = action ? `${answer.reply.trim()} ${action.description}`.trim()
          : answer.actionType !== 'none' ? 'Je n’ai pas assez de données fiables pour préparer ce changement. On précise ensemble ?' : answer.reply.trim();
        await manager.save(CoachMessage, manager.create(CoachMessage, { conversationId: current.id, role: 'assistant', text: reply, requestId: null, proposalId: proposal?.id ?? null }));
        if (messages.length === 1 && answer.title.trim()) current.title = answer.title.trim().slice(0, 80);
        current.processingUntil = null;
        current.updatedAt = new Date();
        await manager.save(current);
        await this.journal(manager, userId, 'coach.message.answered', { conversationId: current.id, reply, proposalId: proposal?.id ?? null, trace });
      });
      // A failed memory refresh does not discard a delivered answer; the next message retries it.
      const count = messages.filter(m => m.role === 'user').length;
      if (count - row.summaryCount >= 5) {
        try {
          const latest = await this.db.getRepository(CoachMessage).find({ where: { conversationId: row.id }, order: { createdAt: 'DESC' }, take: 12 });
          const memory = await this.ai.summarize(row.summary, latest.reverse().map(m => ({ role: m.role, text: m.text })));
          await this.db.transaction(async manager => {
            const current = await manager.findOneOrFail(CoachConversation, { where: { id: row.id, userId }, lock: { mode: 'pessimistic_write' } });
            if (current.summaryCount >= count) return;
            const before = current.summary;
            current.summary = memory.summary; current.summaryCount = count;
            await manager.save(current);
            await this.journal(manager, userId, 'coach.memory.updated', { conversationId: row.id, before, after: current.summary, messageCount: count, trace: memory.trace });
          });
        } catch { /* Retried after the next message. */ }
      }
      return this.get(userId, claim.id);
    } catch (error) {
      await this.db.getRepository(CoachConversation).update({ id: claim.id, userId }, { processingUntil: null });
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('Le coach n’a pas pu répondre. Réessaie dans un instant.');
    }
  }
  async decide(userId: string, conversationId: string, proposalId: string, decision: 'applied' | 'declined') {
    await this.db.transaction(async manager => {
      const conversation = await manager.findOneBy(CoachConversation, { id: conversationId, userId });
      if (!conversation) throw new NotFoundException('Conversation introuvable.');
      const proposal = await manager.findOne(CoachProposal, { where: { id: proposalId, conversationId }, lock: { mode: 'pessimistic_write' } });
      if (!proposal) throw new NotFoundException('Proposition introuvable.');
      if (proposal.status !== 'pending') return;
      if (decision === 'applied') {
        if (proposal.kind === 'program_exercise') {
          const c = proposal.change;
          const row = await manager.findOne(TrainingProgram, { where: { userId }, lock: { mode: 'pessimistic_write' } });
          if (!row?.acceptedAt || row.runId !== c.runId || row.output?.result.outcome !== 'ready') throw new ConflictException('Le programme a changé. Redemande une proposition.');
          const profile = await manager.findOneBy(Onboarding, { userId });
          const block = await manager.findOne(ProgramBlock, { where: { id: row.runId, userId }, lock: { mode: 'pessimistic_write' } });
          if (!profile || row.sourceRevision !== profile.revision || !block || block.endsAt <= new Date())
            throw new ConflictException('Le programme a changé. Redemande une proposition.');
          const before = structuredClone(row.output);
          const exercise = row.output.result.sessions[Number(c.sessionIndex)]?.exercises[Number(c.exerciseIndex)];
          if (!exercise || exercise.sets !== c.oldSets || exercise.rir !== c.oldRir) throw new ConflictException('La séance a changé. Redemande une proposition.');
          exercise.sets = Number(c.sets); exercise.rir = Number(c.rir);
          row.output = { ...row.output };
          await manager.save(row);
          block.prescription = { ...block.prescription, output: row.output }; await manager.save(block);
          await this.journal(manager, userId, 'coach.program.corrected', { proposalId, before, after: row.output });
        } else {
          const c = proposal.change;
          const meal = await manager.findOne(NutritionMeal, { where: { id: String(c.mealId), userId }, lock: { mode: 'pessimistic_write' } });
          if (!meal || meal.deletedAt || meal.revision !== c.revision) throw new ConflictException('Le repas a changé. Redemande une proposition.');
          const before = structuredClone(meal.snapshot);
          const item = meal.snapshot.items.find(value => value.id === c.itemId);
          if (!item || item.amount !== c.oldAmount) throw new ConflictException('Le repas a changé. Redemande une proposition.');
          item.amount = Number(c.amount);
          const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          for (const food of meal.snapshot.items) for (const key of ['calories', 'protein', 'carbs', 'fat'] as const)
            totals[key] += food.food.per100[key] * food.amount / 100;
          for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) totals[key] = Math.round(totals[key] * 10) / 10;
          meal.snapshot = { ...meal.snapshot, items: [...meal.snapshot.items], totals, coachOpinion: undefined };
          meal.revision++;
          await manager.save(meal);
          await this.journal(manager, userId, 'coach.meal.corrected', { proposalId, mealId: meal.id, before, after: meal.snapshot, revision: meal.revision });
        }
      }
      proposal.status = decision;
      await manager.save(proposal);
      await manager.save(CoachMessage, manager.create(CoachMessage, { conversationId, role: 'assistant', requestId: null, proposalId: null,
        text: decision === 'applied' ? 'C’est fait, j’ai enregistré le changement.' : 'Ok, on garde ça comme avant.' }));
      await this.journal(manager, userId, `coach.proposal.${decision}`, { conversationId, proposalId, change: proposal.change });
    });
    return this.get(userId, conversationId);
  }
}
