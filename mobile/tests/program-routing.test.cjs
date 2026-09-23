const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = require('react/jsx-runtime');
function screen(flow) {
  const filename = path.join(__dirname, '../src/features/program/screens/GeneratedProgramScreen.tsx');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'react-native') return { StyleSheet: { create: x => x }, View: 'View', KeyboardAvoidingView: 'KeyboardAvoidingView', ScrollView: 'ScrollView', Platform: { OS: 'ios' } };
    if (name === '@/hooks/useTrainingProgram') return { useTrainingProgram: () => flow };
    if (name === '@/theme/colors') return { colors: {} };
    return new Proxy({}, { get: (_, key) => String(key) });
  } });
  return module.exports.GeneratedProgramScreen({ onHome() {}, onProgress() {}, onCoach() {}, onProfile() {}, onEditProfile() {} });
}
function find(element, type) {
  if (!element || typeof element !== 'object') return null;
  if (element.type === type) return element;
  for (const child of [element.props?.children].flat(Infinity)) { const match = find(child, type); if (match) return match; }
  return null;
}
test('ready proposal stays in review until explicitly accepted', () => {
  const flow = { program: { status: 'ready', stale: false, acceptedAt: null, proposalId: 'v1' } };
  const tree = screen(flow);
  assert.ok(find(tree, 'ProgramProposal')); assert.equal(find(tree, 'ProgramScreen'), null);
});
test('accepted proposal restores the original program screen with actual backend data', () => {
  const program = { status: 'ready', stale: false, acceptedAt: '2026-09-22T10:00:00Z', proposalId: 'v2', result: { title: 'Mon vrai programme' } };
  const tree = screen({ program });
  assert.equal(tree.type, 'ProgramScreen'); assert.equal(tree.props.program, program); assert.equal(find(tree, 'ProgramProposal'), null);
});
test('a stale or missing program cannot enter the active workout interface', () => {
  for (const program of [null, { status: 'ready', stale: true, acceptedAt: '2026-09-22', proposalId: 'old' }]) {
    const tree = screen({ program }); assert.ok(find(tree, 'ProgramProposal')); assert.equal(find(tree, 'ProgramScreen'), null);
  }
});
