import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowJournalDeletion1790400000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TRIGGER journal_append_only ON journal_entries;
      CREATE FUNCTION prevent_journal_update() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Journal entries cannot be updated'; END;
      $$;
      CREATE TRIGGER journal_no_updates BEFORE UPDATE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_journal_update();
    `);
  }
  async down(q: QueryRunner): Promise<void> {
    await q.query(`
      DROP TRIGGER journal_no_updates ON journal_entries;
      DROP FUNCTION prevent_journal_update();
      CREATE TRIGGER journal_append_only BEFORE UPDATE OR DELETE ON journal_entries
      FOR EACH ROW EXECUTE FUNCTION prevent_journal_mutation();
    `);
  }
}
