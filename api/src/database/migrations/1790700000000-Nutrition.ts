import type { MigrationInterface, QueryRunner } from 'typeorm';
export class Nutrition1790700000000 implements MigrationInterface {
  async up(q: QueryRunner) { await q.query(`
    CREATE TABLE nutrition_plans (
      program_run_id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      status varchar NOT NULL, context jsonb NOT NULL, targets jsonb, trace jsonb, error text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX nutrition_plans_user ON nutrition_plans(user_id);
    CREATE TABLE nutrition_foods (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE RESTRICT,
      provider varchar NOT NULL, provider_id text NOT NULL, name text NOT NULL, icon varchar NOT NULL,
      base_unit varchar NOT NULL, per100 jsonb NOT NULL, units jsonb NOT NULL, portion double precision NOT NULL DEFAULT 100,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(provider, provider_id)
    );
    CREATE TABLE nutrition_meals (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      date date NOT NULL, revision integer NOT NULL DEFAULT 0, snapshot jsonb NOT NULL, deleted_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(revision>=0)
    );
    CREATE INDEX nutrition_meals_user_date ON nutrition_meals(user_id,date);
    CREATE TABLE nutrition_photos (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      content_type varchar NOT NULL, content bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE nutrition_write_receipts (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, request_id uuid NOT NULL,
      meal_id uuid NOT NULL, payload_hash text NOT NULL, PRIMARY KEY(user_id,request_id)
    );
  `); }
  async down() { throw new Error('Nutrition history must be retained.'); }
}
