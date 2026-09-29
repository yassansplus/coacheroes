import type { MigrationInterface, QueryRunner } from 'typeorm';

export class GameProgress1791600000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE game_xp_events (
        id bigserial PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        rule text NOT NULL,
        source_key text NOT NULL,
        category text NOT NULL,
        title text NOT NULL,
        xp integer NOT NULL CHECK (xp > 0),
        week_key date NOT NULL,
        occurred_at timestamptz NOT NULL,
        awarded_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, rule, source_key)
      );
      CREATE INDEX game_xp_events_user_id_id ON game_xp_events(user_id,id DESC);
      CREATE INDEX game_xp_events_user_week ON game_xp_events(user_id,week_key);
      CREATE TABLE game_processed_journal (
        journal_id uuid PRIMARY KEY,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        processed_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX game_processed_journal_user ON game_processed_journal(user_id);
    `);
    await q.query(`DO $$ DECLARE app_role text; BEGIN SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT ON TABLE public.game_xp_events, public.game_processed_journal TO %I', app_role);
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.game_xp_events_id_seq TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('XP history must be retained.'); }
}
