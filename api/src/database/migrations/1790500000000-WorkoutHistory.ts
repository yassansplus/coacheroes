import type { MigrationInterface,QueryRunner } from 'typeorm';
export class WorkoutHistory1790500000000 implements MigrationInterface {
 async up(q:QueryRunner):Promise<void> { await q.query(`
 CREATE TABLE program_blocks(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,prescription jsonb NOT NULL,started_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,extensions integer NOT NULL DEFAULT 0,created_at timestamptz NOT NULL DEFAULT now());
 INSERT INTO program_blocks(id,user_id,prescription,started_at,ends_at) SELECT run_id,user_id,jsonb_build_object('output',output,'context',context),accepted_at,accepted_at+interval '28 days' FROM training_programs WHERE accepted_at IS NOT NULL AND output IS NOT NULL;
 CREATE TABLE workout_sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,program_version_id uuid,revision integer NOT NULL DEFAULT 0,status varchar NOT NULL,started_at timestamptz NOT NULL,ended_at timestamptz,snapshot jsonb NOT NULL,summary jsonb NOT NULL,analysis jsonb,analysis_applied_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX workout_user_start ON workout_sessions(user_id,started_at);
 CREATE TABLE workout_write_receipts(user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,request_id uuid NOT NULL,session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE RESTRICT,request_hash text NOT NULL,revision integer NOT NULL,recorded_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,request_id));
 `); }
 async down():Promise<void> { throw new Error('Workout history must be retained.'); }
}
