import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import type { TrainingContext } from './context';
import type { GenerationOutput, Phase } from './generator';
// Relation by name avoids a circular runtime import of the entities registry.
@Entity('training_programs')
export class TrainingProgram {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' }) userId!: string;
  @OneToOne('User', { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'training_programs_user_id_fkey' }) user!: unknown;
  @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true }) acceptedAt!: Date | null;
  @Column({ name: 'source_revision' }) sourceRevision!: number;
  @Column({ type: 'varchar' }) status!: 'queued' | 'generating' | 'ready' | 'needs_clarification' | 'failed';
  @Column({ type: 'varchar' }) phase!: Phase;
  @Column({ name: 'run_id', type: 'uuid' }) runId!: string;
  @Column({ default: 0 }) attempts!: number;
  @Column({ name: 'lease_until', type: 'timestamptz', nullable: true }) leaseUntil!: Date | null;
  @Column({ type: 'jsonb' }) context!: TrainingContext;
  @Column({ type: 'jsonb', nullable: true }) output!: GenerationOutput | null;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
