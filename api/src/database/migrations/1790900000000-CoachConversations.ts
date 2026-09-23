import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CoachConversations1790900000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE coach_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        title varchar(100) NOT NULL, summary text NOT NULL DEFAULT '', summary_count integer NOT NULL DEFAULT 0,
        processing_until timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX coach_conversations_user_updated ON coach_conversations(user_id, updated_at DESC);
      CREATE TABLE coach_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES coach_conversations(id) ON DELETE RESTRICT,
        role varchar NOT NULL, text text NOT NULL,
        request_id uuid UNIQUE, proposal_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX coach_messages_conversation_time ON coach_messages(conversation_id, created_at);
      CREATE FUNCTION prevent_coach_message_change() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Coach messages are append-only'; END $$;
      CREATE TRIGGER coach_messages_immutable BEFORE UPDATE OR DELETE ON coach_messages FOR EACH ROW EXECUTE FUNCTION prevent_coach_message_change();
      CREATE TABLE coach_proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES coach_conversations(id) ON DELETE RESTRICT,
        kind varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'pending',
        change jsonb NOT NULL, description text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE coach_messages ADD CONSTRAINT coach_messages_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES coach_proposals(id) ON DELETE RESTRICT;
    `);
  }
  async down() { throw new Error('Coach history must be retained.'); }
}
