import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileAvatarChoices1791500000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE profile_avatar_versions
      ADD COLUMN platform text NOT NULL DEFAULT 'playstation_5',
      ADD COLUMN genre text NOT NULL DEFAULT 'rpg',
      ADD COLUMN art_style text NOT NULL DEFAULT 'stylized_3d'`);
  }
  async down(): Promise<void> { throw new Error('Profile avatar choices must be retained.'); }
}
