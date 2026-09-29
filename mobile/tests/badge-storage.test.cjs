const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path'), ts = require('typescript');
function load(files, platform = 'ios', localStorage) {
  const exports = {};
  const dependencies = {
    'expo-secure-store': { getItemAsync: async key => files.get(key) ?? null, setItemAsync: async (key, value) => files.set(key, value) },
    'react-native': { Platform: { OS: platform } },
    '@/config/badges': { isBadgeId: id => ['first_checkin', 'first_workout'].includes(id) },
  };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/storage/game.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => dependencies[name], Map, Set, Promise, JSON, localStorage });
  return exports;
}
test('dismissed badges survive restart, are account scoped and ignore corrupt/unknown IDs', async () => {
  const files = new Map();
  let storage = load(files);
  await storage.writeCelebratedBadges('a', ['first_checkin', 'first_checkin']);
  storage = load(files);
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('a')), ['first_checkin']);
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('b')), []);
  await storage.writeCelebratedBadges('b', ['first_workout']);
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('a')), ['first_checkin']);
  files.set('coac-heroes.game.badges-seen.v1.a', '["unknown","first_workout"]');
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('a')), ['first_workout']);
  files.set('coac-heroes.game.badges-seen.v1.a', '{invalid');
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('a')), []);
});
test('web remembers dismissed badges when browser storage is unavailable', async () => {
  const storage = load(new Map(), 'web', { getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); } });
  await storage.writeCelebratedBadges('a', ['first_checkin']);
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('a')), ['first_checkin']);
  assert.deepEqual(Array.from(await storage.readCelebratedBadges('b')), []);
});
