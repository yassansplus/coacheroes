import type { MigrationInterface, QueryRunner } from 'typeorm';

/** The API role owns users and the existing journal; a privileged migrator may not. */
export class CoachTablePrivileges1791000000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      DO $$
      DECLARE app_role text;
      BEGIN
        SELECT pg_get_userbyid(c.relowner) INTO app_role
        FROM pg_class c
        WHERE c.oid = 'public.users'::regclass;
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.coach_conversations TO %I', app_role);
        EXECUTE format('GRANT SELECT, INSERT ON TABLE public.coach_messages TO %I', app_role);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.coach_proposals TO %I', app_role);
      END $$;
    `);
  }
  async down() { throw new Error('Coach table privileges must remain available to the application.'); }
}
