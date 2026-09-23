import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('coach_conversations')
@Index('coach_conversations_user_updated', ['userId', 'updatedAt'])
export class CoachConversation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'coach_conversations_user_id_fkey' }) user!: unknown;
  @Column({ type: 'varchar', length: 100 }) title!: string;
  @Column({ type: 'text', default: '' }) summary!: string;
  @Column({ name: 'summary_count', default: 0 }) summaryCount!: number;
  @Column({ name: 'processing_until', type: 'timestamptz', nullable: true }) processingUntil!: Date | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}

@Entity('coach_messages')
@Index('coach_messages_conversation_time', ['conversationId', 'createdAt'])
export class CoachMessage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'conversation_id', type: 'uuid' }) conversationId!: string;
  @ManyToOne(() => CoachConversation, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'conversation_id', foreignKeyConstraintName: 'coach_messages_conversation_id_fkey' }) conversation!: CoachConversation;
  @Column({ type: 'varchar' }) role!: 'user' | 'assistant';
  @Column({ type: 'text' }) text!: string;
  @Column({ name: 'request_id', type: 'uuid', nullable: true, unique: true }) requestId!: string | null;
  @Column({ name: 'proposal_id', type: 'uuid', nullable: true }) proposalId!: string | null;
  @ManyToOne(() => CoachProposal, { nullable: true, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'proposal_id', foreignKeyConstraintName: 'coach_messages_proposal_id_fkey' }) proposal!: CoachProposal | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}

@Entity('coach_proposals')
export class CoachProposal {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'conversation_id', type: 'uuid' }) conversationId!: string;
  @ManyToOne(() => CoachConversation, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'conversation_id', foreignKeyConstraintName: 'coach_proposals_conversation_id_fkey' }) conversation!: CoachConversation;
  @Column({ type: 'varchar' }) kind!: 'program_exercise' | 'meal_portion';
  @Column({ type: 'varchar', default: 'pending' }) status!: 'pending' | 'applied' | 'declined';
  @Column({ type: 'jsonb' }) change!: Record<string, unknown>;
  @Column({ type: 'text' }) description!: string;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
