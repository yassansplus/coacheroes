import type { MigrationInterface, QueryRunner } from 'typeorm';
export class TrainingPrograms1790100000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE training_programs (
      user_id uuid PRIMARY KEY CONSTRAINT training_programs_user_id_fkey REFERENCES users(id) ON DELETE RESTRICT,
      source_revision integer NOT NULL, status varchar NOT NULL, phase varchar NOT NULL,
      run_id uuid NOT NULL, attempts integer NOT NULL DEFAULT 0, lease_until timestamptz,
      context jsonb NOT NULL, output jsonb, error text,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`);
  }
  async down(): Promise<void> { throw new Error('Training history must be retained; destructive rollback is disabled.'); }
}
