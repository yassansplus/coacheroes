import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { CoachingQuestion } from './questions';
@Entity('chat_conversations')
@Unique('chat_conversations_user_purpose_key', ['userId', 'purpose'])
export class ChatConversation {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @ManyToOne('User', { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'chat_conversations_user_id_fkey' }) user!: unknown;
  @Column({ type: 'varchar' }) purpose!: 'onboarding' | 'program_review';
  @Column({ type: 'varchar' }) status!: 'awaiting_answer' | 'queued' | 'processing' | 'ready' | 'failed' | 'blocked';
  @Column({ name: 'program_run_id', type: 'uuid', nullable: true }) programRunId!: string | null;
  @Column({ name: 'source_revision' }) sourceRevision!: number;
  @Column({ type: 'jsonb', nullable: true }) question!: CoachingQuestion | null;
  @Column({ name: 'pending_message_id', type: 'uuid', nullable: true }) pendingMessageId!: string | null;
  @Column({ name: 'turn_id', type: 'uuid', nullable: true }) turnId!: string | null;
  @Column({ name: 'lease_until', type: 'timestamptz', nullable: true }) leaseUntil!: Date | null;
  @Column({ default: 0 }) attempts!: number;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
}
@Entity('chat_messages')
@Unique('chat_messages_conversation_request_key', ['conversationId', 'requestId'])
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'conversation_id', type: 'uuid' }) conversationId!: string;
  @ManyToOne(() => ChatConversation, { nullable: false, onDelete: 'RESTRICT' }) @JoinColumn({ name: 'conversation_id', foreignKeyConstraintName: 'chat_messages_conversation_id_fkey' }) conversation!: ChatConversation;
  @Column({ type: 'varchar' }) role!: 'user' | 'assistant';
  @Column({ type: 'text' }) text!: string;
  @Column({ name: 'request_id', type: 'uuid', nullable: true }) requestId!: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
