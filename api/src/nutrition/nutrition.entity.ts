import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { MealWrite } from './nutrition.schema';

@Entity('nutrition_plans')
@Index('nutrition_plans_user', ['userId'])
export class NutritionPlan {
  @PrimaryColumn({ name: 'program_run_id', type: 'uuid' }) programRunId!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nutrition_plans_user_id_fkey' }) user!: unknown;
  @Column({ type: 'varchar' }) status!: 'queued' | 'processing' | 'ready' | 'failed';
  @Column({ type: 'jsonb' }) context!: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) targets!: { calories: number; protein: number; carbs: number; fat: number; coachNote: string; assumptions: string[] } | null;
  @Column({ type: 'jsonb', nullable: true }) trace!: Record<string, unknown> | null;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('nutrition_foods')
@Unique('nutrition_foods_provider_provider_id_key', ['provider', 'providerId'])
export class NutritionFood {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid', nullable: true }) userId!: string | null;
  @ManyToOne('User', { nullable: true, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nutrition_foods_user_id_fkey' }) user!: unknown;
  @Column({ type: 'varchar' }) provider!: 'open_food_facts' | 'usda' | 'manual';
  @Column({ name: 'provider_id', type: 'text' }) providerId!: string;
  @Column({ type: 'text' }) name!: string;
  @Column({ type: 'varchar' }) icon!: string;
  @Column({ name: 'base_unit', type: 'varchar' }) baseUnit!: 'g' | 'ml';
  @Column({ type: 'jsonb' }) per100!: { calories: number; protein: number; carbs: number; fat: number };
  @Column({ type: 'jsonb' }) units!: { label: string; amount: number }[];
  @Column({ type: 'float', default: 100 }) portion!: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('nutrition_meals')
@Index('nutrition_meals_user_date', ['userId', 'date'])
@Check('nutrition_meals_revision_check', '"revision" >= 0')
export class NutritionMeal {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nutrition_meals_user_id_fkey' }) user!: unknown;
  @Column({ type: 'date' }) date!: string;
  @Column({ default: 0 }) revision!: number;
  @Column({ type: 'jsonb' }) snapshot!: Omit<MealWrite, 'requestId' | 'revision' | 'items'> & { coachNote?: string; coachOpinion?: { text: string; at: string; basedOnRevision: number }; totals?: { calories: number; protein: number; carbs: number; fat: number }; items: { id: string; foodId: string; amount: number; food: { name: string; baseUnit: string; per100: { calories: number; protein: number; carbs: number; fat: number } } }[] };
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('nutrition_coach_opinions')
@Unique('nutrition_coach_opinions_meal_revision_key', ['mealId', 'mealRevision'])
@Index('nutrition_coach_opinions_user_time', ['userId', 'createdAt'])
export class NutritionCoachOpinion {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nutrition_coach_opinions_user_id_fkey' }) user!: unknown;
  @Column({ name: 'meal_id', type: 'uuid' }) mealId!: string;
  @ManyToOne(() => NutritionMeal, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'meal_id', foreignKeyConstraintName: 'nutrition_coach_opinions_meal_id_fkey' }) meal!: NutritionMeal;
  @Column({ name: 'meal_revision', type: 'integer' }) mealRevision!: number;
  @Column({ type: 'text' }) text!: string;
  @Column({ type: 'jsonb' }) context!: Record<string, unknown>;
  @Column({ type: 'jsonb' }) trace!: Record<string, unknown>;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('nutrition_photos')
export class NutritionPhoto {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'nutrition_photos_user_id_fkey' }) user!: unknown;
  @Column({ name: 'content_type', type: 'varchar' }) contentType!: string;
  @Column({ type: 'bytea', select: false }) content!: Buffer;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
