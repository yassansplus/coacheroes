import type { MigrationInterface, QueryRunner } from 'typeorm';
export class DailyCheckIns1790600000000 implements MigrationInterface {
  async up(q: QueryRunner) { await q.query(`
    CREATE TABLE daily_check_ins (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      date date NOT NULL, timezone text NOT NULL, revision integer NOT NULL DEFAULT 0,
      opened_at timestamptz, completed_at timestamptz, data jsonb, adjustment jsonb,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY(user_id,date), CHECK(revision>=0)
    );
    CREATE TABLE daily_write_receipts (user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, request_id uuid NOT NULL, payload_hash text NOT NULL, date date NOT NULL, PRIMARY KEY(user_id,request_id));
    CREATE TABLE daily_preferences (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT, timezone text NOT NULL);
    CREATE TABLE daily_push_devices (token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, session_hash text NOT NULL REFERENCES sessions(token_hash) ON DELETE RESTRICT, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX daily_push_devices_user ON daily_push_devices(user_id);
    CREATE TABLE daily_reminders (user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, date date NOT NULL, status text NOT NULL, tickets jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,date));
  `); }
  async down() { throw new Error('Daily history must not be removed by rollback.'); }
}
