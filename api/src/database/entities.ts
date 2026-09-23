import { WorkoutSession, ProgramBlock } from '../workouts/workout.entity';
import { ChatConversation, ChatMessage } from '../chat/chat.entity';
import { TrainingProgram } from '../program/program.entity';
import { NutritionCoachOpinion, NutritionFood, NutritionMeal, NutritionPhoto, NutritionPlan } from '../nutrition/nutrition.entity';
import { CoachConversation, CoachMessage, CoachProposal } from '../coach/coach.entity';
import { Check, Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'apple_subject', unique: true }) appleSubject!: string;
  @Column({ name: 'first_name', type: 'text', nullable: true }) firstName!: string | null;
  @Column({ type: 'text', nullable: true }) email!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('auth_challenges')
export class AuthChallenge {
  @PrimaryColumn({ name: 'nonce_hash' }) nonceHash!: string;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true }) usedAt!: Date | null;
}

@Entity('sessions')
export class Session {
  @PrimaryColumn({ name: 'token_hash' }) tokenHash!: string;
  @Index('sessions_user') @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'sessions_user_id_fkey' }) user!: User;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @Column({ name: 'expires_at', type: 'timestamptz' }) expiresAt!: Date;
  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
}

@Entity('onboardings')
@Check('onboardings_current_step_check', '"current_step" BETWEEN 2 AND 14')
@Check('onboardings_revision_check', '"revision" >= 0')
export class Onboarding {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @OneToOne(() => User, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'onboardings_user_id_fkey' }) user!: User;
  @Column({ type: 'jsonb', default: {} }) profile!: Record<string, unknown>;
  @Column({ name: 'coaching_details', type: 'jsonb', default: {} }) coachingDetails!: Record<string, unknown>;
  @Column({ name: 'current_step', default: 2 }) currentStep!: number;
  @Column({ default: 0 }) revision!: number;
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('journal_entries')
@Index('journal_user_time', ['userId', 'occurredAt'])
@Unique('journal_entries_user_id_request_id_key', ['userId', 'requestId'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'journal_entries_user_id_fkey' }) user!: User;
  @Column() type!: string;
  @Column({ name: 'request_id', type: 'uuid' }) requestId!: string;
  @Column({ name: 'occurred_at', type: 'timestamptz' }) occurredAt!: Date;
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' }) recordedAt!: Date;
  @Column({ type: 'jsonb' }) payload!: Record<string, unknown>;
}

@Entity('onboarding_photos')
@Unique('onboarding_photos_user_id_sha256_key', ['userId', 'sha256'])
export class OnboardingPhoto {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'onboarding_photos_user_id_fkey' }) user!: User;
  @Column() sha256!: string;
  @Column({ name: 'content_type' }) contentType!: string;
  @Column({ type: 'bytea', select: false }) content!: Buffer;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

export const entities = [WorkoutSession, ProgramBlock, User, AuthChallenge, Session, Onboarding, JournalEntry, OnboardingPhoto, TrainingProgram, ChatConversation, ChatMessage, CoachConversation, CoachMessage, CoachProposal, NutritionPlan, NutritionFood, NutritionMeal, NutritionPhoto, NutritionCoachOpinion];
