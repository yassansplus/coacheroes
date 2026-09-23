import type { MigrationInterface, QueryRunner } from 'typeorm';
export class ProgramAcceptance1790300000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE training_programs ADD COLUMN accepted_at timestamptz; ALTER TABLE chat_conversations ADD COLUMN program_run_id uuid;');
  }
  async down(): Promise<void> { throw new Error('Program acceptance history must be retained.'); }
}
