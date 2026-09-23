import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import type { WorkoutSnapshot } from './workout.schema';
@Entity('workout_sessions')
@Index('workout_user_start',['userId','startedAt'])
export class WorkoutSession {
 @PrimaryColumn('uuid') id!:string;
 @Column({name:'user_id',type:'uuid'}) userId!:string;
 @ManyToOne('User',{onDelete:'RESTRICT'}) @JoinColumn({name:'user_id',foreignKeyConstraintName:'workout_sessions_user_id_fkey'}) user!:unknown;
 @Column({name:'program_version_id',type:'uuid',nullable:true}) programVersionId!:string|null;
 @Column({default:0}) revision!:number;
 @Column() status!:string;
 @Column({name:'started_at',type:'timestamptz'}) startedAt!:Date;
 @Column({name:'ended_at',type:'timestamptz',nullable:true}) endedAt!:Date|null;
 @Column({type:'jsonb'}) snapshot!:WorkoutSnapshot;
 @Column({type:'jsonb',nullable:true}) analysis!:Record<string,unknown>|null;
 @Column({name:'analysis_applied_at',type:'timestamptz',nullable:true}) analysisAppliedAt!:Date|null;
 @Column({type:'jsonb'}) summary!:Record<string,unknown>;
 @CreateDateColumn({name:'created_at',type:'timestamptz'}) createdAt!:Date;
 @UpdateDateColumn({name:'updated_at',type:'timestamptz'}) updatedAt!:Date;
}
@Entity('program_blocks')
export class ProgramBlock {
 @PrimaryColumn('uuid') id!:string;
 @Column({name:'user_id',type:'uuid'}) userId!:string;
 @ManyToOne('User',{onDelete:'RESTRICT'}) @JoinColumn({name:'user_id',foreignKeyConstraintName:'program_blocks_user_id_fkey'}) user!:unknown;
 @Column({type:'jsonb'}) prescription!:Record<string,unknown>;
 @Column({name:'started_at',type:'timestamptz'}) startedAt!:Date;
 @Column({name:'ends_at',type:'timestamptz'}) endsAt!:Date;
 @Column({default:0}) extensions!:number;
 @CreateDateColumn({name:'created_at',type:'timestamptz'}) createdAt!:Date;
}
