import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Progression1791200000000 implements MigrationInterface {
  async up(q: QueryRunner): Promise<void> {
    await q.query(`
      CREATE TABLE progression_weights (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        date date NOT NULL, value_kg double precision NOT NULL CHECK (value_kg BETWEEN 30 AND 350),
        source text NOT NULL, revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, date)
      );
      CREATE TABLE progression_measurements (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        date date NOT NULL,
        waist_cm double precision, chest_cm double precision, arm_cm double precision, thigh_cm double precision,
        revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (user_id, date),
        CHECK (waist_cm BETWEEN 10 AND 300 OR waist_cm IS NULL),
        CHECK (chest_cm BETWEEN 10 AND 300 OR chest_cm IS NULL),
        CHECK (arm_cm BETWEEN 10 AND 300 OR arm_cm IS NULL),
        CHECK (thigh_cm BETWEEN 10 AND 300 OR thigh_cm IS NULL)
      );
      CREATE TABLE progression_photos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        date date NOT NULL, images jsonb NOT NULL DEFAULT '{}'::jsonb,
        revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, date)
      );
      CREATE TABLE progression_boxing_tests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        date date NOT NULL, kind text NOT NULL CHECK (kind IN ('Sac','Corde','Sparring')),
        value integer NOT NULL CHECK (value BETWEEN 1 AND 100000),
        revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
        created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, date, kind)
      );
      CREATE TABLE progression_write_receipts (
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        request_id uuid NOT NULL, payload_hash text NOT NULL,
        PRIMARY KEY (user_id, request_id)
      );
    `);
    // Preserve the original onboarding baseline for accounts that completed before this migration.
    // Later profile edits are reversed from their existing audit entries where available.
    const accounts = await q.query(`SELECT user_id, completed_at, profile FROM onboardings WHERE completed_at IS NOT NULL`);
    for (const account of accounts as { user_id: string; completed_at: Date; profile: Record<string, any> }[]) {
      let profile = structuredClone(account.profile);
      const completion = (await q.query(`SELECT recorded_at, payload FROM journal_entries WHERE user_id=$1 AND type='onboarding.completed' ORDER BY recorded_at ASC LIMIT 1`, [account.user_id]))[0];
      const changes = await q.query(`SELECT type, payload FROM journal_entries WHERE user_id=$1 AND recorded_at>$2 AND type IN ('onboarding.updated','onboarding.renewal_updated','profile.coaching_answer_applied') ORDER BY recorded_at DESC, id DESC`, [account.user_id, completion?.recorded_at ?? account.completed_at]);
      for (const event of changes as { type: string; payload: any }[]) {
        if (event.type === 'onboarding.updated') {
          for (const [key, value] of Object.entries(event.payload?.changes ?? {}) as [string, any][]) profile[key] = value?.before;
        } else if (event.payload?.before?.profile) profile = event.payload.before.profile;
      }
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: completion?.payload?.timezone ?? 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(account.completed_at));
      const weight = Number(String(profile.weight ?? '').replace(',', '.'));
      if (weight >= 30 && weight <= 350) await q.query(`INSERT INTO progression_weights(user_id,date,value_kg,source) VALUES($1,$2,$3,'onboarding') ON CONFLICT DO NOTHING`, [account.user_id, date, weight]);
      const measures = profile.measurements ?? {};
      const values = ['waist', 'chest', 'arms', 'thighs'].map(key => {
        const value = Number(String(measures[key] ?? '').replace(',', '.'));
        return String(measures[key] ?? '').trim() && value >= 10 && value <= 300 ? value : null;
      });
      if (values.some(value => value !== null)) await q.query(`INSERT INTO progression_measurements(user_id,date,waist_cm,chest_cm,arm_cm,thigh_cm) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [account.user_id, date, ...values]);
      const images = Object.fromEntries([['face', profile.photos?.front], ['profile', profile.photos?.side], ['back', profile.photos?.back]].filter(([, id]) => typeof id === 'string'));
      if (Object.keys(images).length) await q.query(`INSERT INTO progression_photos(user_id,date,images) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [account.user_id, date, JSON.stringify(images)]);
    }
    // The migration can run under an administrative role distinct from the API role.
    await q.query(`DO $$ DECLARE app_role text; BEGIN SELECT pg_get_userbyid(relowner) INTO app_role FROM pg_class WHERE oid='public.users'::regclass;
      EXECUTE format('GRANT SELECT, INSERT, UPDATE ON TABLE public.progression_weights, public.progression_measurements, public.progression_photos, public.progression_boxing_tests, public.progression_write_receipts TO %I', app_role);
    END $$;`);
  }
  async down(): Promise<void> { throw new Error('Progression history must be retained.'); }
}
