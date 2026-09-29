import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GameEquipment1792000000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE game_equipment (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
      frame text NOT NULL DEFAULT 'none' CHECK(frame IN ('none','azur','cobalt')),
      title text NOT NULL DEFAULT 'none' CHECK(title IN ('none','confirmed','regular')),
      theme text NOT NULL DEFAULT 'light' CHECK(theme IN ('light','violet')),
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);
    await q.query(`DO $$ DECLARE app_role text; BEGIN
      SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.game_equipment TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('Saved equipment must be retained.'); }
}
