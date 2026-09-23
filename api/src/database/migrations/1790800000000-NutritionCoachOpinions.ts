import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NutritionCoachOpinions1790800000000 implements MigrationInterface {
  async up(q: QueryRunner) {
    await q.query(`
      CREATE TABLE nutrition_coach_opinions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        meal_id uuid NOT NULL REFERENCES nutrition_meals(id) ON DELETE RESTRICT,
        meal_revision integer NOT NULL,
        text text NOT NULL,
        context jsonb NOT NULL,
        trace jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT nutrition_coach_opinions_meal_revision_key UNIQUE(meal_id, meal_revision)
      );
      CREATE INDEX nutrition_coach_opinions_user_time ON nutrition_coach_opinions(user_id, created_at);
      CREATE FUNCTION prevent_nutrition_opinion_change() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Nutrition coach opinions are append-only'; END $$;
      CREATE TRIGGER nutrition_coach_opinions_immutable BEFORE UPDATE OR DELETE ON nutrition_coach_opinions
        FOR EACH ROW EXECUTE FUNCTION prevent_nutrition_opinion_change();
    `);
  }
  async down() { throw new Error('Nutrition coach opinion history must be retained.'); }
}
