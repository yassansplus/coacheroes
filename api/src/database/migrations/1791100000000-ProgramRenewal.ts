import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProgramRenewal1791100000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE program_blocks ADD COLUMN renewal_review jsonb;
      ALTER TABLE chat_conversations DROP CONSTRAINT chat_conversations_user_purpose_key;
      CREATE UNIQUE INDEX chat_conversations_onboarding_unique ON chat_conversations(user_id) WHERE purpose = 'onboarding';
      CREATE UNIQUE INDEX chat_conversations_review_run_unique ON chat_conversations(user_id, program_run_id) WHERE purpose = 'program_review';`);
  }
  async down(): Promise<void> { throw new Error('Program renewal history must be retained.'); }
}
