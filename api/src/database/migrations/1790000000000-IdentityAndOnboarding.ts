import { MigrationInterface, QueryRunner } from 'typeorm';

export class IdentityAndOnboarding1790000000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), apple_subject varchar NOT NULL UNIQUE,
        email text, created_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE auth_challenges (nonce_hash varchar PRIMARY KEY, expires_at timestamptz NOT NULL, used_at timestamptz);
      CREATE TABLE sessions (token_hash varchar PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz);
      CREATE INDEX sessions_user ON sessions(user_id);
      CREATE TABLE onboardings (user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE RESTRICT, profile jsonb NOT NULL DEFAULT '{}',
        current_step integer NOT NULL DEFAULT 2 CHECK (current_step BETWEEN 2 AND 14),
        revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0), completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
      CREATE TABLE journal_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        type varchar NOT NULL, request_id uuid NOT NULL, occurred_at timestamptz NOT NULL,
        recorded_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL,
        UNIQUE (user_id, request_id));
      CREATE INDEX journal_user_time ON journal_entries(user_id, occurred_at);
      CREATE FUNCTION prevent_journal_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Journal entries cannot be updated or deleted'; END;
      $$;
      CREATE TRIGGER journal_append_only BEFORE UPDATE OR DELETE ON journal_entries
        FOR EACH ROW EXECUTE FUNCTION prevent_journal_mutation();
      CREATE TABLE onboarding_photos (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        sha256 varchar NOT NULL, content_type varchar NOT NULL, content bytea NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, sha256));
    `);
  }
  async down(): Promise<void> {
    throw new Error('This migration contains user history; automatic destructive rollback is disabled.');
  }
}
