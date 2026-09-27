import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ProfileAvatar1791400000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE profile_avatar_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        source_image bytea NOT NULL,
        generated_image bytea,
        model text NOT NULL,
        status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','ready','failed','superseded')),
        error_code text,
        worker_token uuid,
        started_at timestamptz,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX profile_avatar_versions_user_time ON profile_avatar_versions(user_id,created_at DESC);
      CREATE INDEX profile_avatar_versions_pending ON profile_avatar_versions(status,started_at) WHERE status IN ('pending','processing');
      CREATE TABLE profile_avatars (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
        current_version_id uuid NOT NULL REFERENCES profile_avatar_versions(id) ON DELETE RESTRICT,
        revision integer NOT NULL DEFAULT 1,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`DO $$ DECLARE app_role text; BEGIN SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.profile_avatar_versions, public.profile_avatars TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('Profile avatar history must be retained.'); }
}
