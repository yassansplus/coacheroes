const { test } = require('node:test');
const assert = require('node:assert/strict');
const { totals, quantityInUnit, quantityToBase, remaining, saveMeal, mealsInPeriod, shiftedDate } = require('../src/features/nutrition/utils.ts');
const { foodById, initialMeals, exampleItems } = require('../src/features/nutrition/data.ts');

test('nutrition: the journal sum equals the sum of all its meals', () => {
  const meals = initialMeals('2026-09-20');
  const day = totals(meals.flatMap(meal => meal.items), foodById);
  assert.equal(Math.round(day.calories), 1820);
  assert.equal(Math.round(meals.reduce((sum, meal) => sum + totals(meal.items, foodById).calories, 0)), Math.round(day.calories));
  assert.equal(remaining(day.calories, 2250), 430);
});
test('nutrition: grams, bowls and chicken pieces retain the same effective amount', () => {
  for (const foodId of ['rice', 'chicken', 'cola']) {
    for (const unit of foodById[foodId].units) {
      const amount = foodById[foodId].portion;
      assert.ok(Math.abs(quantityToBase(quantityInUnit(amount, unit), unit) - amount) < 0.001);
    }
  }
  assert.equal(quantityToBase(2, foodById.rice.units[2]), 500);
  assert.equal(quantityToBase(2, foodById.chicken.units[2]), 300);
  assert.equal(quantityToBase(1, foodById.cola.units[2]), 330);
});
test('nutrition: updating a draft does not mutate the journal, saving twice does not duplicate it', () => {
  const meals = initialMeals('2026-09-20');
  const draft = { ...meals[1], items: meals[1].items.map(item => ({ ...item, amount: item.amount * 2 })) };
  const saved = saveMeal(meals, draft);
  assert.equal(saved.length, meals.length);
  assert.equal(saveMeal(saved, draft).length, meals.length);
  assert.equal(meals[1].items[0].amount, 220);
  assert.equal(saved[1].items[0].amount, 440);
  draft.items[0].amount = 1;
  assert.equal(saved[1].items[0].amount, 440);
});
test('nutrition: removing food and duplicating meals update derived totals', () => {
  const meals = initialMeals('2026-09-20');
  const copy = { ...meals[1], id: 'copy' };
  const saved = saveMeal(meals, copy);
  assert.equal(saved.length, 5);
  const base = totals(meals.flatMap(meal => meal.items), foodById).calories;
  const duplicated = totals(saved.flatMap(meal => meal.items), foodById).calories;
  assert.ok(Math.abs(duplicated - base - totals(copy.items, foodById).calories) < 0.001);
  assert.ok(totals(exampleItems().filter(item => item.foodId !== 'rice'), foodById).calories < totals(exampleItems(), foodById).calories);
});
test('nutrition: empty, invalid quantities and exceeded goals are safe', () => {
  assert.equal(totals([], foodById).calories, 0);
  assert.equal(totals([{ foodId: 'rice', amount: NaN }, { foodId: 'rice', amount: -2 }], foodById).calories, 0);
  assert.equal(remaining(2600, 2250), 0);
  assert.equal(quantityToBase(NaN, foodById.rice.units[0]), 1);
});
test('nutrition: day, Monday-based week and month filters include only their period', () => {
  const meals = ['2026-08-31', '2026-09-01', '2026-09-14', '2026-09-20', '2026-09-21', '2026-10-01'].map((date, i) => ({ ...initialMeals(date)[0], id: String(i) }));
  assert.equal(mealsInPeriod(meals, '2026-09-20', 'day').length, 1);
  assert.equal(mealsInPeriod(meals, '2026-09-20', 'week').length, 2);
  assert.equal(mealsInPeriod(meals, '2026-09-20', 'month').length, 4);
  assert.equal(shiftedDate('2026-03-01', -1), '2026-02-28');
});
