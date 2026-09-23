import type { MigrationInterface, QueryRunner } from 'typeorm';
export class CoachingChat1790200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`ALTER TABLE users ADD COLUMN first_name text;
      ALTER TABLE onboardings ADD COLUMN coaching_details jsonb NOT NULL DEFAULT '{}';
      CREATE TABLE chat_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL CONSTRAINT chat_conversations_user_id_fkey REFERENCES users(id) ON DELETE RESTRICT,
        purpose varchar NOT NULL, status varchar NOT NULL, source_revision integer NOT NULL, question jsonb,
        pending_message_id uuid, turn_id uuid, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0, error text,
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chat_conversations_user_purpose_key UNIQUE(user_id, purpose));
      CREATE TABLE chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL CONSTRAINT chat_messages_conversation_id_fkey REFERENCES chat_conversations(id) ON DELETE RESTRICT,
        role varchar NOT NULL, text text NOT NULL, request_id uuid, created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chat_messages_conversation_request_key UNIQUE(conversation_id, request_id));
      CREATE TRIGGER chat_messages_append_only BEFORE UPDATE OR DELETE ON chat_messages
        FOR EACH ROW EXECUTE FUNCTION prevent_journal_mutation();`);
  }
  async down(): Promise<void> { throw new Error('Conversation history must be retained.'); }
}
