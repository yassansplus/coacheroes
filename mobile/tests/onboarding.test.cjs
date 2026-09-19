const assert = require('node:assert/strict');
const { test } = require('node:test');
const { complementarySports, createInitialProfile, foods, sports } = require('../src/features/onboarding/data.ts');
const { buildPreviewSchedule, commitFoodInputs, foodLabel, inRange, setFoodSelections, toggleComplementarySport, toggleItem, validateStep } = require('../src/features/onboarding/utils.ts');
const { mergeTags, parseTagInput } = require('../src/components/TagInput/utils.ts');

test('profile validation accepts French decimal weights, rejects missing and malformed values', () => {
  const profile = { ...createInitialProfile(), age: '28', height: '176', weight: '75,5' };
  assert.equal(validateStep(3, profile), null);
  for (const weight of ['', '0', '351', '75,2,5', 'NaN', 'Infinity']) {
    assert.ok(validateStep(3, { ...profile, weight }), `rejected weight: ${weight}`);
  }
  assert.ok(validateStep(3, { ...profile, age: '28,5' }));
  assert.equal(inRange('86,5', 10, 250), true);
});

test('required choices and a deliberate pain answer are needed before proceeding', () => {
  const profile = createInitialProfile();
  for (const step of [2, 3, 4, 6, 8, 9]) assert.ok(validateStep(step, profile));
  assert.equal(validateStep(9, { ...profile, noPain: true }), null);
  assert.equal(validateStep(9, { ...profile, pains: ['left_wrist'] }), null);
  assert.ok(validateStep(6, { ...profile, sports: ['strength', 'running'] }));
  assert.equal(validateStep(6, { ...profile, sports: ['strength', 'running'], places: ['club'] }), null);
});

test('strength training alone is selected by default and needs no complementary sport', () => {
  const profile = { ...createInitialProfile(), places: ['gym'] };
  assert.deepEqual(profile.sports, ['strength']);
  assert.equal(validateStep(6, profile), null);
  const sessions = buildPreviewSchedule(profile).filter(day => day.sport);
  assert.equal(sessions.length, profile.sessions);
  assert.ok(sessions.every(day => day.sport === 'strength'));
});

test('complementary sports toggle independently and removing all keeps strength training', () => {
  const initial = createInitialProfile().sports;
  let selected = toggleComplementarySport(initial, 'running');
  selected = toggleComplementarySport(selected, 'swimming');
  assert.deepEqual(selected, ['strength', 'running', 'swimming']);
  assert.deepEqual(initial, ['strength']);
  selected = toggleComplementarySport(selected, 'running');
  assert.deepEqual(selected, ['strength', 'swimming']);
  selected = toggleComplementarySport(selected, 'swimming');
  assert.deepEqual(selected, ['strength']);
  assert.equal(validateStep(6, { ...createInitialProfile(), sports: selected, places: ['home'] }), null);
});

test('every optional sport has labels and can be selected then removed without dropping strength', () => {
  assert.ok(complementarySports.length > 2);
  assert.ok(!complementarySports.includes('strength'));
  for (const sport of complementarySports) {
    assert.ok(sports[sport].title);
    assert.ok(sports[sport].shortTitle);
    const selected = toggleComplementarySport(['strength'], sport);
    assert.deepEqual(selected, ['strength', sport]);
    assert.deepEqual(toggleComplementarySport(selected, sport), ['strength']);
  }
});

test('objectives can be selected independently', () => {
  let objectives = [];
  objectives = toggleItem(objectives, 'fat-loss');
  objectives = toggleItem(objectives, 'muscle');
  assert.deepEqual(objectives, ['fat-loss', 'muscle']);
  assert.equal(validateStep(2, { ...createInitialProfile(), goal: objectives }), null);
  assert.deepEqual(toggleItem(objectives, 'fat-loss'), ['muscle']);
});

test('optional measurements may be blank, but entered values must be valid', () => {
  const profile = createInitialProfile();
  assert.equal(validateStep(13, profile), null);
  assert.ok(validateStep(13, { ...profile, measurements: { ...profile.measurements, waist: '1,2,3' } }));
});

test('a week contains only selected days and sports; totals remain consistent', () => {
  const profile = { ...createInitialProfile(), sports: ['strength', 'running', 'swimming'], days: [0, 2, 4, 6], sessions: 4, duration: '45' };
  const week = buildPreviewSchedule(profile);
  assert.equal(week.length, 7);
  assert.deepEqual(week.filter(day => day.sport).map(day => day.day), [0, 2, 4, 6]);
  assert.deepEqual(week.filter(day => day.sport).map(day => day.sport), ['strength', 'running', 'swimming', 'strength']);
  assert.equal(week.filter(day => !day.sport).length, 3);
  assert.equal(week.filter(day => day.sport).reduce((minutes, day) => minutes + day.minutes, 0), 180);
  assert.ok(validateStep(7, { ...profile, days: [0], sessions: 4 }));
});

test('skipping availability uses a consistent example, without previously edited days', () => {
  const profile = { ...createInitialProfile(), sports: ['strength', 'cycling'], days: [], sessions: 7, duration: '90', skippedSteps: [7] };
  const sessions = buildPreviewSchedule(profile).filter(day => day.sport);
  assert.deepEqual(sessions.map(day => day.day), [0, 2, 4]);
  assert.deepEqual(sessions.map(day => day.sport), ['strength', 'cycling', 'strength']);
  assert.ok(sessions.every(day => day.minutes === 60));
});

test('commas turn completed entries into tags while preserving the unfinished draft', () => {
  assert.deepEqual(parseTagInput('avocat, fraises, lentilles'), { tags: ['avocat', 'fraises'], inputValue: ' lentilles' });
  assert.deepEqual(parseTagInput('avocat, fraises, lentilles', true), { tags: ['avocat', 'fraises', 'lentilles'], inputValue: '' });
  assert.deepEqual(parseTagInput('avocat,'), { tags: ['avocat'], inputValue: '' });
  assert.deepEqual(parseTagInput(' , ,\n ', true), { tags: [], inputValue: '' });
});

test('tags ignore blank entries, extra spaces, case and accent duplicates', () => {
  assert.deepEqual(mergeTags(['Épinards'], [' epinards ', 'Patate   douce', '', 'PATATE DOUCE']), ['Épinards', 'Patate douce']);
});

test('food tags reuse preset IDs and preserve custom names in program details', () => {
  const result = setFoodSelections(createInitialProfile(), 'liked', [' Poulet ', 'chicken', 'Pates', 'Avocat', 'avocat', ' '], foods);
  assert.deepEqual(result.likedFoods, ['chicken', 'pasta', 'Avocat']);
  assert.deepEqual(result.likedFoods.map(value => foodLabel(value, foods)), ['Poulet', 'Pâtes', 'Avocat']);
});

test('custom exclusions replace None and removing tags leaves the other choices intact', () => {
  const profile = { ...createInitialProfile(), likedFoods: ['chicken', 'Avocat'], avoidedFoods: ['none'] };
  const result = setFoodSelections(profile, 'avoided', ['none', 'Brocoli', 'brocoli', 'Olives'], foods);
  assert.deepEqual(result.avoidedFoods, ['Brocoli', 'Olives']);
  assert.deepEqual(result.likedFoods, profile.likedFoods);
  const removed = setFoodSelections(result, 'avoided', ['Olives'], foods);
  assert.deepEqual(removed.avoidedFoods, ['Olives']);
  assert.deepEqual(setFoodSelections(removed, 'avoided', ['none'], foods).avoidedFoods, ['none']);
});

test('continuing or going back commits the last food without a trailing comma', () => {
  const profile = { ...createInitialProfile(), likedFoods: ['rice'], avoidedFoods: ['none'] };
  const result = commitFoodInputs(profile, { liked: 'avocat, fraises', avoided: 'champignons' }, foods);
  assert.deepEqual(result.likedFoods, ['rice', 'avocat', 'fraises']);
  assert.deepEqual(result.avoidedFoods, ['champignons']);
  assert.deepEqual(commitFoodInputs(result, { liked: '', avoided: '' }, foods), result);
});

test('free text keeps existing food exclusion rules and removes opposite duplicates', () => {
  const profile = { ...createInitialProfile(), likedFoods: ['yogurt', 'pasta', 'Avocat'] };
  const result = setFoodSelections(profile, 'avoided', ['Lactose', 'Gluten', 'avocat'], foods);
  assert.deepEqual(result.likedFoods, []);
  assert.deepEqual(result.avoidedFoods, ['lactose', 'gluten', 'avocat']);
});
