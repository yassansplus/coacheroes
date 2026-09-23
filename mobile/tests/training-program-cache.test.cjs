const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');

function loadStorage(files = new Map()) {
  const source = fs.readFileSync(path.join(__dirname, '../src/storage/trainingProgram.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const fileSystem = {
    documentDirectory: '/private/',
    readAsStringAsync: async target => {
      if (!files.has(target)) throw new Error('missing');
      return files.get(target);
    },
    writeAsStringAsync: async (target, value) => files.set(target, value),
  };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: name => {
      if (name === 'expo-file-system/legacy') return fileSystem;
      if (name === 'react-native') return { Platform: { OS: 'ios' } };
      throw new Error(name);
    },
    Map,
    Promise,
    JSON,
    Error,
  });
  return module.exports;
}

const program = updatedAt => ({ proposalId: 'program-1', acceptedAt: '2026-09-22T08:00:00Z', status: 'ready', phase: 'validating', sourceRevision: 4, stale: false, result: { title: 'Programme' }, exercises: [], error: null, updatedAt });

test('program cache survives restart, keeps accounts separate and recovers the previous complete slot', async () => {
  const files = new Map();
  const first = loadStorage(files);
  await first.writeTrainingProgramCache('user-a', program('2026-09-22T08:00:00Z'));
  await first.writeTrainingProgramCache('user-a', program('2026-09-22T08:05:00Z'));
  await first.writeTrainingProgramCache('user-b', null);

  const restarted = loadStorage(files);
  assert.equal((await restarted.readTrainingProgramCache('user-a')).program.updatedAt, '2026-09-22T08:05:00Z');
  assert.equal((await restarted.readTrainingProgramCache('user-b')).program, null);

  const newest = [...files.entries()].filter(([target]) => target.includes('user-a')).sort(([, a], [, b]) => JSON.parse(b).sequence - JSON.parse(a).sequence)[0][0];
  files.set(newest, '{partial');
  assert.equal((await loadStorage(files).readTrainingProgramCache('user-a')).program.updatedAt, '2026-09-22T08:00:00Z');
});
