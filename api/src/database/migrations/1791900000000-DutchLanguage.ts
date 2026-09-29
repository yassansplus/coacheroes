import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DutchLanguage1791900000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users DROP CONSTRAINT users_language_check');
    await q.query("ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IN ('fr', 'en', 'nl'))");
  }
  async down(q: QueryRunner): Promise<void> {
    // Refuse rollback while Dutch is selected rather than overwrite a user's choice.
    await q.query('ALTER TABLE users DROP CONSTRAINT users_language_check');
    await q.query("ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IN ('fr', 'en'))");
  }
}
