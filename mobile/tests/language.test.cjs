const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const en = require('../src/i18n/en.json');
const nl = require('../src/i18n/nl.json');
function core() {
  const source = fs.readFileSync(require.resolve('../src/i18n/core.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const box = { exports: {}, require: name => { assert.ok(['./en.json', './nl.json'].includes(name)); return name === './nl.json' ? nl : en; } };
  vm.runInNewContext(code, box);
  return box.exports;
}
test('French is unchanged and switching back preserves copy, numbers and unknown content', () => {
  const c = core(); let updates = 0;
  const unsubscribe = c.subscribeLanguage(() => updates++);
  assert.equal(c.getLanguage(), 'fr');
  assert.equal(c.t('Mon programme'), 'Mon programme');
  c.applyLanguage('en');
  assert.equal(c.t('Mon programme'), 'My programme');
  assert.equal(c.t('Niveau {p0}', { p0: 12 }), 'Level 12');
  assert.equal(c.t('  Continuer '), '  Continue ');
  assert.equal(c.t('My own note: 70 kg × 8'), 'My own note: 70 kg × 8');
  assert.equal(c.getLocale(), 'en-GB');
  c.applyLanguage('en'); assert.equal(updates, 1);
  c.applyLanguage('fr'); assert.equal(c.t('Niveau {p0}', { p0: 12 }), 'Niveau 12');
  assert.equal(c.getLocale(), 'fr-FR');
  unsubscribe(); c.applyLanguage('en'); assert.equal(updates, 2);
  assert.equal(c.isLanguage('nl'), true);
  c.applyLanguage('nl');
  assert.equal(c.t('Mon programme'), 'Mijn programma');
  assert.equal(c.t('Niveau {p0}', {p0:12}), 'Niveau 12');
  assert.equal(c.t('My own note: 70 kg × 8'), 'My own note: 70 kg × 8');
  assert.equal(c.getLocale(), 'nl-NL');
  assert.equal(c.dayInitials().join(''), 'MDWDVZZ');
  assert.equal(c.t('constructor'), 'constructor');
  c.applyLanguage('fr');
  assert.equal(c.t('Mon programme'), 'Mon programme');
});
test('English and Dutch catalogues cover the same copy without introducing unknown parameters', () => {
  assert.deepEqual(Object.keys(nl).sort(), Object.keys(en).sort());
  assert.ok(Object.keys(en).length > 1500);
  for (const [source, translated] of [en, nl].flatMap(catalogue => Object.entries(catalogue))) {
    assert.equal(typeof translated, 'string'); assert.ok(translated.trim(), source);
    const keys = new Set([...source.matchAll(/\{(\w+)\}/g)].map(m => m[1]));
    for (const match of translated.matchAll(/\{(\w+)\}/g)) assert.ok(keys.has(match[1]), source);
    for (const key of keys) {
      const grammaticalSuffix = key === 'p1' && ['{p0} exclusion{p1}', '{p0} terminé{p1}'].includes(source);
      if (!grammaticalSuffix) assert.ok(translated.includes(`{${key}}`), `Missing ${key}: ${source}`);
    }
  }
});

function storage({ os = 'ios', saved = null, locale = 'nl-BE', appleLanguages, browserLanguages, storageFails = false } = {}) {
  const c = core(); const writes = [];
  const read = () => { if (storageFails) throw Error('Storage unavailable'); return saved; };
  const write = (key, value) => { writes.push(value); saved = value; };
  const source = fs.readFileSync(require.resolve('../src/storage/language.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const box = {
    exports: {},
    Intl: { DateTimeFormat: () => ({ resolvedOptions: () => ({ locale }) }) },
    navigator: { languages: browserLanguages, language: locale },
    localStorage: { getItem: read, setItem: write },
    require: name => {
      if (name === '@/i18n/core') return c;
      if (name === 'react-native') return { Platform: { OS: os }, Settings: { get: () => appleLanguages } };
      if (name === 'expo-secure-store') return { getItemAsync: async () => read(), setItemAsync: async (...args) => write(...args) };
      throw Error(name);
    },
  };
  vm.runInNewContext(code, box);
  return { ...box.exports, c, writes };
}
test('first launch follows the device language, including regional variants, with a French fallback', async () => {
  for (const os of ['ios', 'android', 'web']) {
    for (const [locale, expected] of [['nl-BE','nl'], ['nl-NL','nl'], ['en-US','en'], ['fr-BE','fr'], ['de-DE','fr'], ['NL_be','nl']]) {
      const s = storage({os,locale}); await s.restoreLanguage();
      assert.equal(s.c.getLanguage(), expected, `${os} ${locale}`);
      assert.deepEqual(s.writes, []);
    }
  }
  const ios = storage({locale:'en-US',appleLanguages:['nl-BE','en-US']});
  await ios.restoreLanguage(); assert.equal(ios.c.getLanguage(),'nl');
  const web = storage({os:'web',locale:'en-US',browserLanguages:['fr-BE','en-US']});
  await web.restoreLanguage(); assert.equal(web.c.getLanguage(),'fr');
});
test('a saved choice wins over the device and survives a restart; unavailable storage still allows launch', async () => {
  for (const os of ['ios','android','web']) {
    const s = storage({os,locale:'nl-NL',saved:'en'});
    await s.restoreLanguage(); assert.equal(s.c.getLanguage(),'en');
    await s.saveLanguage('fr'); assert.equal(s.c.getLanguage(),'fr');
    s.c.applyLanguage('nl'); await s.restoreLanguage(); assert.equal(s.c.getLanguage(),'fr');
    assert.deepEqual(s.writes,['fr']);
    const invalid = storage({os,locale:'nl-BE',saved:'de'});
    await invalid.restoreLanguage(); assert.equal(invalid.c.getLanguage(),'nl');
    const blocked = storage({os,locale:'nl-BE',storageFails:true});
    await blocked.restoreLanguage(); assert.equal(blocked.c.getLanguage(),'nl');
  }
});
