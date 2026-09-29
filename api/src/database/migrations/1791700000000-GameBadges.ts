import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GameBadges1791700000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE game_badges (
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      badge_id text NOT NULL,
      unlocked_at timestamptz NOT NULL DEFAULT now(),
      celebrated_at timestamptz,
      PRIMARY KEY(user_id,badge_id)
    )`);
    await q.query(`DO $$ DECLARE app_role text; BEGIN
      SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.game_badges TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('Badge unlock history must be retained.'); }
}
