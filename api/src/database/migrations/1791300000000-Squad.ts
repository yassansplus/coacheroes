import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Squad1791300000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE squad_friendships (
        user_a uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        user_b uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY(user_a,user_b), CHECK(user_a < user_b)
      );
      CREATE TABLE squad_groups (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name varchar(60) NOT NULL,
        owner_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        create_request_id uuid NOT NULL UNIQUE, revision integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE squad_memberships (
        group_id uuid NOT NULL REFERENCES squad_groups(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        role varchar(12) NOT NULL CHECK(role IN ('owner','member')),
        joined_at timestamptz NOT NULL DEFAULT now(), left_at timestamptz,
        PRIMARY KEY(group_id,user_id)
      );
      CREATE INDEX squad_memberships_user ON squad_memberships(user_id) WHERE left_at IS NULL;
      CREATE TABLE squad_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), token_hash char(64) NOT NULL UNIQUE,
        kind varchar(8) NOT NULL CHECK(kind IN ('friend','group')),
        inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        group_id uuid REFERENCES squad_groups(id) ON DELETE RESTRICT,
        invitee_id uuid REFERENCES users(id) ON DELETE RESTRICT,
        status varchar(10) NOT NULL DEFAULT 'open' CHECK(status IN ('open','claimed','accepted','declined','revoked')),
        expires_at timestamptz NOT NULL, resolved_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK((kind='group' AND group_id IS NOT NULL) OR (kind='friend' AND group_id IS NULL))
      );
      CREATE INDEX squad_invitations_inbox ON squad_invitations(invitee_id,status,expires_at);
      CREATE INDEX squad_invitations_inviter ON squad_invitations(inviter_id,created_at DESC);
      CREATE TABLE squad_challenges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), group_id uuid NOT NULL REFERENCES squad_groups(id) ON DELETE RESTRICT,
        title varchar(80) NOT NULL, target_sessions integer NOT NULL CHECK(target_sessions BETWEEN 1 AND 1000),
        min_minutes integer NOT NULL DEFAULT 30 CHECK(min_minutes BETWEEN 1 AND 240),
        starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL,
        created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        create_request_id uuid NOT NULL UNIQUE,
        created_at timestamptz NOT NULL DEFAULT now(), CHECK(ends_at > starts_at)
      );
      CREATE INDEX squad_challenges_group_end ON squad_challenges(group_id,ends_at DESC);
      CREATE TABLE squad_challenge_participants (
        challenge_id uuid NOT NULL REFERENCES squad_challenges(id) ON DELETE RESTRICT,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        joined_at timestamptz NOT NULL DEFAULT now(), left_at timestamptz,
        PRIMARY KEY(challenge_id,user_id)
      );
      CREATE TABLE squad_preferences (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT,
        share_activity boolean NOT NULL DEFAULT true, share_records boolean NOT NULL DEFAULT false,
        revision integer NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await q.query(`DO $$ DECLARE app_role text; BEGIN SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.squad_friendships, public.squad_groups, public.squad_memberships, public.squad_invitations, public.squad_challenges, public.squad_challenge_participants, public.squad_preferences TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('Squad history must be retained.'); }
}
