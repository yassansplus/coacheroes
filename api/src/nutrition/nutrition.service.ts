import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import { z } from 'zod';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { profileSchema } from '../onboarding/onboarding.schema';
import { TrainingProgram } from '../program/program.entity';
import { NutritionAi } from './nutrition-ai';
import { NutritionCoachContext } from './nutrition-coach-context';
import { NutritionCatalog, iconFor } from './nutrition-catalog';
import { NutritionCoachOpinion, NutritionFood, NutritionMeal, NutritionPhoto, NutritionPlan } from './nutrition.entity';
import { anonymousData } from '../workouts/ai-context';
import type { MealWrite } from './nutrition.schema';

function baseline(profile: z.infer<typeof profileSchema>, sessions: { estimatedMinutes: number }[]) {
  const weight = Number(profile.weight.replace(',', '.'));
  const height = Number(profile.height.replace(',', '.'));
  const age = Number(profile.age.replace(',', '.'));
  // For an unspecified sex marker use the midpoint, with that uncertainty recorded.
  const offset = profile.gender === 'male' ? 5 : profile.gender === 'female' ? -161 : -78;
  const resting = 10 * weight + 6.25 * height - 5 * age + offset;
  const activityFactor = profile.skippedSteps.includes(10) ? 1.35 : { 'very-low': 1.25, low: 1.35, moderate: 1.5, high: 1.65 }[profile.activity];
  const trainingMinutes = sessions.reduce((sum, session) => sum + session.estimatedMinutes, 0);
  const maintenanceCalories = Math.round(resting * activityFactor + Math.min(350, trainingMinutes * 4 / 7));
  return { maintenanceCalories, restingCalories: Math.round(resting), weeklyTrainingMinutes: trainingMinutes,
    activityFactor, method: 'Mifflin-St Jeor avec activité quotidienne et charge sportive indicative', uncertainSexOffset: profile.gender === 'other' };
}

@Injectable()
export class NutritionService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private busy = false;
  private readonly logger = new Logger(NutritionService.name);
  constructor(private readonly db: DataSource, private readonly ai: NutritionAi, private readonly catalog: NutritionCatalog, private readonly coachContext: NutritionCoachContext) {}
  onModuleInit() { this.timer = setInterval(() => { void this.tick().catch(() => this.logger.warn('Nutrition worker unavailable.')); }, 5000); this.timer.unref(); }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  private async journal(manager: EntityManager, userId: string, type: string, payload: Record<string, unknown>, requestId: string = randomUUID()) {
    await manager.save(JournalEntry, manager.create(JournalEntry, { userId, type, requestId, occurredAt: new Date(), payload: { schemaVersion: 1, ...payload } }));
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      const job = await this.db.transaction(async manager => {
        const program = await manager.getRepository(TrainingProgram).createQueryBuilder('p')
          .where("p.status = 'ready' AND NOT EXISTS (SELECT 1 FROM nutrition_plans n WHERE n.program_run_id = p.run_id)")
          .andWhere('EXISTS (SELECT 1 FROM onboardings o WHERE o.user_id = p.user_id AND o.revision = p.source_revision)')
          .orderBy('p.updated_at', 'ASC').setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (program) {
          const profile = await manager.findOneBy(Onboarding, { userId: program.userId });
          if (!profile || profile.revision !== program.sourceRevision) return null;
          const plan = manager.create(NutritionPlan, { programRunId: program.runId, userId: program.userId,
            status: 'queued', context: { profileRevision: profile.revision }, targets: null, trace: null, error: null });
          await manager.save(plan);
          await this.journal(manager, program.userId, 'nutrition.plan.queued', { programRunId: program.runId });
        }
        const plan = await manager.getRepository(NutritionPlan).createQueryBuilder('n').where("n.status = 'queued' OR (n.status = 'processing' AND n.updated_at < :expired)", { expired: new Date(Date.now() - 900000) })
          .orderBy('n.created_at', 'ASC').setLock('pessimistic_write').setOnLocked('skip_locked').getOne();
        if (!plan) return null;
        plan.status = 'processing'; plan.updatedAt = new Date(); await manager.save(plan);
        return plan;
      });
      if (!job) return;
      try { await this.generate(job); }
      catch (error) {
        await this.db.transaction(async manager => {
          const row = await manager.findOneBy(NutritionPlan, { programRunId: job.programRunId });
          if (!row || row.status !== 'processing') return;
          row.status = 'failed'; row.error = error instanceof Error ? error.message.slice(0, 120) : 'NUTRITION_FAILED';
          await manager.save(row); await this.journal(manager, row.userId, 'nutrition.plan.failed', { programRunId: row.programRunId, code: row.error });
        });
      }
    } finally { this.busy = false; }
  }
  private async generate(job: NutritionPlan) {
    const profile = await this.db.getRepository(Onboarding).findOneByOrFail({ userId: job.userId });
    const program = await this.db.getRepository(TrainingProgram).findOneByOrFail({ userId: job.userId });
    if (program.runId !== job.programRunId || program.status !== 'ready' || profile.revision !== program.sourceRevision || program.output?.result.outcome !== 'ready') throw new Error('NUTRITION_PROGRAM_CHANGED');
    const p = profileSchema.parse(profile.profile);
    const sessions = program.output.result.sessions;
    const anonymousProfile = { objective: p.goal, ageYears: Number(p.age), heightCm: Number(p.height.replace(',', '.')),
      weightKg: Number(p.weight.replace(',', '.')), gender: p.gender, activity: p.activity, steps: p.steps,
      mealsPerDay: p.meals, cooking: p.cooking, restaurants: p.restaurants, tracking: p.tracking,
      likedFoods: p.likedFoods, avoidedFoods: p.avoidedFoods, allergies: p.allergies };
    const anonymousProgram = { blockWeeks: program.output.result.blockWeeks, sessions: sessions.map(s => ({ sport: s.sport, weekday: s.weekday, estimatedMinutes: s.estimatedMinutes, setting: s.setting })) };
    const estimate = baseline(p, sessions);
    const { targets, trace } = await this.ai.plan(anonymousProfile, anonymousProgram, estimate);
    await this.db.transaction(async manager => {
      const row = await manager.findOne(NutritionPlan, { where: { programRunId: job.programRunId }, lock: { mode: 'pessimistic_write' } });
      const current = await manager.findOneBy(TrainingProgram, { userId: job.userId });
      if (!row || row.status !== 'processing' || current?.runId !== job.programRunId) return;
      row.status = 'ready'; row.targets = targets; row.context = { profile: anonymousProfile, program: anonymousProgram, baseline: estimate };
      row.trace = trace; row.error = null; await manager.save(row);
      await this.journal(manager, row.userId, 'nutrition.plan.generated', { programRunId: row.programRunId, targets, trace, baseline: estimate });
    });
  }
  async retryPlan(userId: string) {
    return this.db.transaction(async manager => {
      const program = await manager.findOneBy(TrainingProgram, { userId });
      if (!program || program.status !== 'ready') throw new ConflictException('Ton programme doit être prêt.');
      const plan = await manager.findOne(NutritionPlan, { where: { programRunId: program.runId, userId }, lock: { mode: 'pessimistic_write' } });
      if (plan?.status === 'failed') { plan.status = 'queued'; plan.error = null; await manager.save(plan);
        await this.journal(manager, userId, 'nutrition.plan.retried', { programRunId: program.runId }); }
      return { status: plan?.status ?? 'queued' };
    });
  }
  async activePlan(userId: string) {
    const program = await this.db.getRepository(TrainingProgram).findOneBy({ userId });
    if (!program?.acceptedAt) return null;
    const plan = await this.db.getRepository(NutritionPlan).findOneBy({ userId, programRunId: program.runId });
    return plan ? { programRunId: plan.programRunId, status: plan.status, targets: plan.status === 'ready' ? plan.targets : null } : { programRunId: program.runId, status: 'queued', targets: null };
  }
  async dashboard(userId: string) {
    const meals = await this.db.getRepository(NutritionMeal).find({ where: { userId, deletedAt: IsNull() }, order: { date: 'DESC', createdAt: 'DESC' } });
    const foods = new Map<string, ReturnType<NutritionCatalog['view']>>();
    for (const meal of meals) for (const item of meal.snapshot.items) foods.set(item.foodId, item.food as ReturnType<NutritionCatalog['view']>);
    return { plan: await this.activePlan(userId), meals: meals.map(row => ({ ...row.snapshot, revision: row.revision })), foods: [...foods.values()] };
  }
  async uploadPhoto(userId: string, content: Buffer) {
    if (!Buffer.isBuffer(content) || content.length < 100 || content.length > 8 * 1024 * 1024) throw new BadRequestException('Photo invalide ou trop volumineuse.');
    const type = content.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ? 'image/jpeg' : content.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? 'image/png' : null;
    if (!type) throw new BadRequestException('Utilise une photo JPEG ou PNG.');
    return this.db.transaction(async manager => {
      const photo = await manager.save(NutritionPhoto, manager.create(NutritionPhoto, { userId, contentType: type, content }));
      await this.journal(manager, userId, 'nutrition.photo.uploaded', { photoId: photo.id, contentType: type, bytes: content.length });
      return { id: photo.id };
    });
  }
  async analyze(userId: string, source: 'text' | 'photo', description: string, photoId?: string) {
    let photo: { content: Buffer; contentType: string } | undefined;
    if (source === 'photo') {
      if (!photoId) throw new BadRequestException('Ajoute une photo.');
      const row = await this.db.getRepository(NutritionPhoto).createQueryBuilder('p').addSelect('p.content').where('p.id = :id AND p.user_id = :userId', { id: photoId, userId }).getOne();
      if (!row) throw new NotFoundException('Photo introuvable.');
      photo = { content: row.content, contentType: row.contentType };
    } else if (!description.trim()) throw new BadRequestException('Décris ton repas.');
    const plan = await this.activePlan(userId);
    const onboarding = await this.db.getRepository(Onboarding).findOneBy({ userId });
    const profile = onboarding ? profileSchema.safeParse(onboarding.profile) : null;
    const preferences = profile?.success ? { objective: profile.data.goal, avoidedFoods: profile.data.avoidedFoods, allergies: profile.data.allergies } : {};
    const { analysis, trace } = await this.ai.analyze(source, description, plan?.targets ?? null, preferences, photo);
    const items: { id: string; foodId: string; amount: number; estimatedFood: { id: string; name: string; baseUnit: 'g' | 'ml'; per100: typeof analysis.foods[number]['per100']; macroSource: 'estimated' | 'web'; sourceUrl: string | null } }[] = [];
    const foods: Record<string, unknown>[] = [];
    const unresolved: string[] = [];
    for (const candidate of analysis.foods) {
      const id = `estimate:${randomUUID()}`;
      const estimatedFood = { id, name: [candidate.brand, candidate.name].filter(Boolean).join(' · '),
        baseUnit: candidate.unit, per100: candidate.per100, macroSource: candidate.macroSource, sourceUrl: candidate.sourceUrl };
      foods.push({ ...estimatedFood, icon: iconFor(candidate.name), units: [{ label: candidate.unit, amount: 1 },
        { label: 'portion', amount: candidate.estimatedAmount }], portion: candidate.estimatedAmount, provider: 'ai_estimate', providerId: id });
      items.push({ id: randomUUID(), foodId: id, amount: candidate.estimatedAmount, estimatedFood });
    }
    await this.db.transaction(manager => this.journal(manager, userId, 'nutrition.meal.analyzed', {
      source, description: source === 'text' ? description : null, photoId: photoId ?? null,
      analysis, items, foods, unresolved, trace,
    }));
    return { items, foods, unresolved, clarificationQuestion: analysis.clarificationQuestion, source, photoId: photoId ?? null, trace };
  }
  async saveMeal(userId: string, input: MealWrite) {
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const plan = await this.activePlan(userId);
    return this.db.transaction(async manager => {
      const receipt = await manager.query('SELECT payload_hash FROM nutrition_write_receipts WHERE user_id=$1 AND request_id=$2', [userId, input.requestId]) as { payload_hash: string }[];
      if (receipt.length) { if (receipt[0].payload_hash !== hash) throw new ConflictException('Requête déjà utilisée avec un autre repas.'); const row = await manager.findOneBy(NutritionMeal, { id: input.id, userId }); return row && { ...row.snapshot, revision: row.revision }; }
      let row = await manager.findOne(NutritionMeal, { where: { id: input.id, userId }, lock: { mode: 'pessimistic_write' } });
      if (row && (row.deletedAt || row.revision !== input.revision)) throw new ConflictException('Ce repas a changé. Recharge-le avant de modifier.');
      if (!row && input.revision !== 0) throw new ConflictException('Version du repas invalide.');
      const seen = new Set<string>();
      const items = [];
      for (const item of input.items) {
        if (seen.has(item.id)) throw new BadRequestException('Aliment dupliqué.');
        seen.add(item.id);
        if (item.estimatedFood) {
          if (input.source === 'manual' || item.foodId !== item.estimatedFood.id) throw new BadRequestException('Estimation alimentaire invalide.');
          const food = { ...item.estimatedFood, icon: iconFor(item.estimatedFood.name),
            units: [{ label: item.estimatedFood.baseUnit, amount: 1 }, { label: 'portion', amount: item.amount }],
            portion: item.amount, provider: 'ai_estimate' as const };
          items.push({ ...item, food });
        } else {
          const food = await manager.findOneBy(NutritionFood, { id: item.foodId });
          if (!food || (food.userId && food.userId !== userId)) throw new BadRequestException('Aliment introuvable.');
          items.push({ ...item, food: this.catalog.view(food) });
        }
      }
      const before = row?.snapshot ?? null;
      const { requestId: _requestId, revision: _revision, ...meal } = input;
      if (input.photoId && !await manager.findOneBy(NutritionPhoto, { id: input.photoId, userId })) throw new BadRequestException('Photo du repas introuvable.');
      const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      for (const item of items) for (const key of ['calories', 'protein', 'carbs', 'fat'] as const)
        totals[key] += item.food.per100[key] * item.amount / 100;
      for (const key of ['calories', 'protein', 'carbs', 'fat'] as const) totals[key] = Math.round(totals[key] * 10) / 10;
      const coachNote = plan?.targets ? totals.protein >= Math.max(20, plan.targets.protein / 5)
        ? 'Bonne dose de protéines sur ce repas. Vérifie les portions, et on garde le cap.'
        : 'Repas noté. Pense à compléter tes protéines sur la journée si besoin.'
        : 'Repas noté. Les quantités restent ajustables si tu veux les préciser.';
      row ??= manager.create(NutritionMeal, { id: input.id, userId, revision: 0, deletedAt: null });
      row.date = input.date; row.snapshot = { ...meal, items, totals, coachNote }; row.revision++;
      await manager.save(row);
      await manager.query('INSERT INTO nutrition_write_receipts(user_id,request_id,meal_id,payload_hash) VALUES($1,$2,$3,$4)', [userId, input.requestId, input.id, hash]);
      await this.journal(manager, userId, before ? 'nutrition.meal.corrected' : 'nutrition.meal.created', { mealId: input.id, before, after: row.snapshot, revision: row.revision }, input.requestId);
      return { ...row.snapshot, revision: row.revision };
    });
  }
  async opinion(userId: string, id: string) {
    const row = await this.db.getRepository(NutritionMeal).findOneBy({ userId, id, deletedAt: IsNull() });
    if (!row) throw new NotFoundException('Repas introuvable.');
    if (row.snapshot.coachOpinion?.basedOnRevision === row.revision) return { ...row.snapshot, revision: row.revision };
    const user = await this.db.getRepository(User).findOneBy({ id: userId });
    const plan = await this.activePlan(userId);
    const mealContext = anonymousData({ date: row.date, moment: row.snapshot.moment, time: row.snapshot.time,
      foods: row.snapshot.items.map(item => ({ name: item.food.name, amount: item.amount, unit: item.food.baseUnit })),
      totals: row.snapshot.totals ?? null }, user?.firstName);
    const targets = plan?.targets ? anonymousData({ calories: plan.targets.calories, protein: plan.targets.protein,
      carbs: plan.targets.carbs, fat: plan.targets.fat }, user?.firstName) : null;
    const { text, trace } = await this.ai.opinion(mealContext, targets, {
      sevenDayJournal: () => this.coachContext.sevenDayJournal(userId, row.date),
      coachMemory: (offset, limit) => this.coachContext.coachMemory(userId, offset, limit),
    });
    return this.db.transaction(async manager => {
      const current = await manager.findOne(NutritionMeal, { where: { userId, id }, lock: { mode: 'pessimistic_write' } });
      if (!current || current.deletedAt || current.revision !== row.revision) throw new ConflictException('Ce repas a changé. Recharge-le avant de demander un avis.');
      if (current.snapshot.coachOpinion?.basedOnRevision === current.revision) return { ...current.snapshot, revision: current.revision };
      const opinion = { text, at: new Date().toISOString(), basedOnRevision: current.revision };
      current.snapshot = { ...current.snapshot, coachOpinion: opinion };
      await manager.save(current);
      await manager.save(NutritionCoachOpinion, manager.create(NutritionCoachOpinion, { userId, mealId: id,
        mealRevision: current.revision, text, context: { meal: mealContext, targets, journalThroughDate: row.date }, trace }));
      await this.journal(manager, userId, 'nutrition.meal.coach_opinion', { mealId: id, mealRevision: current.revision, opinion, trace });
      return { ...current.snapshot, revision: current.revision };
    });
  }
  async deleteMeal(userId: string, id: string) {
    return this.db.transaction(async manager => {
      const row = await manager.findOne(NutritionMeal, { where: { id, userId }, lock: { mode: 'pessimistic_write' } });
      if (!row) throw new NotFoundException('Repas introuvable.');
      if (!row.deletedAt) { row.deletedAt = new Date(); row.revision++; await manager.save(row);
        await this.journal(manager, userId, 'nutrition.meal.deleted', { mealId: id, before: row.snapshot, deletedAt: row.deletedAt }); }
      return { deleted: true };
    });
  }
}
