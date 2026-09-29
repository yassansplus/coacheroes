import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UserLanguage1791800000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query("ALTER TABLE users ADD COLUMN language text NOT NULL DEFAULT 'fr' CHECK (language IN ('fr', 'en'))");
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query('ALTER TABLE users DROP COLUMN language');
  }
}
