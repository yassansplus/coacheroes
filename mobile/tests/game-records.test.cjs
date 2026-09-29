const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const box = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, box);
  return box.exports;
}
const { buildGameRecords } = load('features/game/records.ts');
const point = (date, weight, reps, extra = {}) => ({ date, weight, reps, volume: 0, estimatedMax: null, ...extra });

test('no logged performance produces no records, including onboarding baselines', () => {
  const data = { exercises: [{ id: 'bench', title: 'Bench', points: [point('2026-09-01', 100, 0, { baseline: true })] }], tests: [] };
  assert.equal(buildGameRecords(data, '2026-09-30').history.length, 0);
  assert.equal(buildGameRecords({ exercises: [], tests: [] }, '2026-09-30').records.length, 0);
});
test('records follow logged dates and real improvements, excluding ties, regressions, unknowns and future dates', () => {
  const data = { exercises: [{ id: 'bench', title: 'My exercise', points: [
    point('2026-09-03', 60, 9), point('2026-09-01', 60, 8), point('2026-09-02', 60, 8),
    point('2026-09-04', 50, 12), point('2026-09-05', 70, 0), point('2026-10-01', 90, 8),
  ] }, { id: 'pullups', title: 'Pullups', points: [point('2026-09-01', 0, 8), point('2026-09-06', 0, 10)] }], tests: [
    { id: 'b1', kind: 'Sac', date: '2026-09-01', value: 120 },
    { id: 'b2', kind: 'Sac', date: '2026-09-04', value: 120 },
    { id: 'b3', kind: 'Sac', date: '2026-09-05', value: 140 },
    { id: 'r1', kind: 'Corde', date: '2026-09-07', value: 75 },
  ] };
  const result = buildGameRecords(data, '2026-09-30');
  assert.equal(result.history.length, 7);
  assert.equal(result.records.length, 4);
  assert.equal(result.history[0].date, '2026-09-07');
  const bench = result.records.find(record => record.performanceId === 'strength:bench');
  assert.equal(bench.title, 'My exercise'); assert.equal(bench.value, 60); assert.equal(bench.reps, 9);
  const pullups = result.records.find(record => record.performanceId === 'strength:pullups');
  assert.equal(pullups.metric, 'reps'); assert.equal(pullups.value, 10);
  const corrected = buildGameRecords({ ...data, tests: data.tests.filter(item => item.id !== 'b3') }, '2026-09-30');
  assert.equal(corrected.records.find(record => record.performanceId === 'boxing:Sac').value, 120);
});
