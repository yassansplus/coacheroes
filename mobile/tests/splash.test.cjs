const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const src = path.resolve(__dirname, '../src');

// Exercise the real lifecycle with explicit image/layout/native-animation events.
function mount(file, exportName, dependencies, props = {}) {
  const slots = [], effects = [];
  let cursor = 0, dirty = true, tree, Component;
  const equal = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!slots[i]) slots[i] = { value: typeof initial === 'function' ? initial() : initial };
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next;
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true; }
      }];
    },
    useRef(initial) { const i = cursor++; slots[i] ??= { current: initial }; return slots[i]; },
    useId() { return react.useRef('splash-test').current; },
    useCallback(callback, deps) {
      const i = cursor++;
      if (!equal(slots[i]?.deps, deps)) slots[i] = { value: callback, deps };
      return slots[i].value;
    },
    useEffect(callback, deps) {
      const i = cursor++;
      if (!equal(slots[i]?.deps, deps)) {
        const previous = slots[i]; slots[i] = { deps, cleanup: previous?.cleanup };
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = callback(); });
      }
    },
  };
  const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
  const box = { exports: {}, require: name => {
    if (name === 'react') return react;
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in dependencies) return dependencies[name];
    throw new Error(`Unmocked dependency: ${name}`);
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(src, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, box);
  Component = box.exports[exportName];
  const render = () => { cursor = 0; dirty = false; tree = Component(props); while (effects.length) effects.shift()(); };
  return {
    async settle() { for (let i = 0; i < 15; i++) { if (dirty) render(); await Promise.resolve(); } return tree; },
    update(next) { props = { ...props, ...next }; dirty = true; },
    tree: () => tree,
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
function find(tree, type) {
  if (!tree || typeof tree !== 'object') return undefined;
  if (Array.isArray(tree)) return tree.map(item => find(item, type)).find(Boolean);
  if (tree.type === type) return tree;
  return find(tree.props?.children, type);
}
function deferred() { let resolve; return { promise: new Promise(done => { resolve = done; }), resolve: () => resolve() }; }
function splashEnvironment(reduced = false) {
  const jobs = [], listeners = new Set();
  class Value {
    constructor(value) { this.value = value; }
    setValue(value) { this.value = value; }
    interpolate(config) { return { config }; }
  }
  const animation = kind => ({
    kind, stopped: false,
    start(callback) { this.callback = callback; jobs.push(this); },
    stop() { this.stopped = true; this.callback?.({ finished: false }); },
    finish() { if (!this.stopped) this.callback?.({ finished: true }); },
  });
  const Animated = { Value, View: 'AnimatedView', multiply: () => ({}),
    timing: () => animation('timing'), parallel: () => animation('intro'),
    sequence: () => animation('sequence'), delay: () => animation('delay'), loop: () => animation('loop') };
  const colors = new Proxy({}, { get: (_, name) => name === 'splashBackground' ? '#080d38' : '#fff' });
  const dependencies = {
    'react-native': { Animated, Easing: { out: x => x, inOut: x => x, cubic: 'cubic', quad: 'quad', sin: 'sin' },
      Image: 'Image', View: 'View', StyleSheet: { create: x => x, absoluteFill: {} },
      useWindowDimensions: () => ({ width: 430, height: 932 }),
      AccessibilityInfo: { isReduceMotionEnabled: async () => reduced, addEventListener: (_, callback) => {
        listeners.add(callback); return { remove: () => listeners.delete(callback) };
      } } },
    'expo-linear-gradient': { LinearGradient: 'Gradient' }, 'expo-status-bar': { StatusBar: 'StatusBar' },
    'react-native-svg': { __esModule: true, default: 'Svg', Circle: 'Circle', Defs: 'Defs', Path: 'Path', RadialGradient: 'RadialGradient', Stop: 'Stop' },
    '@/components/LocalizedText': { Text: 'Text' }, '@/config/brand': { appBrand: { icon: 1, splashLogoSize: 200, splashBackground: '#080d38' } },
    '@/i18n/core': { t: x => x }, '@/i18n/useLanguage': { useLanguage() {} },
    '@/theme/colors': { colors, gradients: { splash: ['#080d38', '#10226d', '#211052'] } },
    '@/theme/typography': { fontFamily: { extraBold: 'Montserrat_800ExtraBold' } },
  };
  return { jobs, listeners, dependencies, changeMotion(value) { for (const listener of listeners) listener(value); } };
}
function splash(environment, props) {
  return mount('components/AnimatedSplash/AnimatedSplash.tsx', 'AnimatedSplash', environment.dependencies, props);
}
async function paint(instance) {
  await instance.settle();
  find(instance.tree(), 'Image').props.onLoadEnd();
  instance.tree().props.onLayout();
  await instance.settle();
}

test('handoff waits for both layout and logo, then waits for the native hide to complete', async () => {
  const env = splashEnvironment(), native = deferred(); let hide = 0, completed = 0;
  const instance = splash(env, { ready: false, onPresented: () => { hide++; return native.promise; }, onFinish: () => completed++ });
  await instance.settle();
  find(instance.tree(), 'Image').props.onLoadEnd(); await instance.settle();
  assert.equal(hide, 0); assert.equal(env.jobs.length, 0);
  instance.tree().props.onLayout(); await instance.settle();
  assert.equal(hide, 1); assert.equal(env.jobs.length, 0);
  native.resolve(); await instance.settle();
  assert.ok(env.jobs.some(job => job.kind === 'intro')); assert.equal(completed, 0);
  instance.unmount(); assert.equal(env.listeners.size, 0);
});
test('a completed intro keeps waiting for the session; once ready it fades and completes exactly once', async () => {
  const env = splashEnvironment(); let completed = 0;
  const instance = splash(env, { ready: false, onFinish: () => completed++ });
  await paint(instance);
  env.jobs.find(job => job.kind === 'intro').finish(); await instance.settle();
  assert.equal(completed, 0); assert.ok(!env.jobs.some(job => job.kind === 'timing'));
  instance.update({ ready: true }); await instance.settle();
  env.jobs.find(job => job.kind === 'timing').finish(); await instance.settle();
  assert.equal(completed, 1);
  instance.update({ ready: true }); await instance.settle(); assert.equal(completed, 1);
  instance.unmount(); assert.ok(env.jobs.find(job => job.kind === 'loop').stopped);
});
test('reduce motion skips animation but still waits for session readiness, including live preference changes', async () => {
  for (const reduced of [true, false]) {
    const env = splashEnvironment(reduced); let completed = 0;
    const instance = splash(env, { ready: false, onFinish: () => completed++ });
    await paint(instance);
    if (!reduced) { env.changeMotion(true); await instance.settle(); }
    assert.equal(completed, 0);
    assert.ok(env.jobs.every(job => job.stopped));
    instance.update({ ready: true }); await instance.settle();
    assert.equal(completed, 1); assert.ok(!env.jobs.some(job => job.kind === 'timing'));
    instance.unmount();
  }
});
test('unmounting during native handoff cancels subsequent animation and completion', async () => {
  const env = splashEnvironment(), native = deferred(); let completed = 0;
  const instance = splash(env, { ready: true, onPresented: () => native.promise, onFinish: () => completed++ });
  await paint(instance); instance.unmount(); native.resolve(); await instance.settle();
  assert.equal(env.jobs.length, 0); assert.equal(completed, 0); assert.equal(env.listeners.size, 0);
});
test('bootstrap preserves font/preload/decode gates, including the font error fallback', async () => {
  const preload = deferred(); let fonts = [false, null], nativeHeld = 0;
  const dependencies = {
    '@expo-google-fonts/montserrat': { useFonts: () => fonts },
    'react-native': { View: 'View', StyleSheet: { create: x => x } },
    'expo-splash-screen': { preventAutoHideAsync: async () => { nativeHeld++; }, hideAsync: async () => {} },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    '@/components/AnimatedSplash': { AnimatedSplash: 'Splash' }, '@/components/ImageWarmup': { ImageWarmup: 'Warmup' },
    '@/config/preloadAssets': { imageAssets: [1], preloadAppImages: () => preload.promise },
    '@/config/brand': { appBrand: { splashBackground: '#080d38' } }, '@/storage/language': { restoreLanguage: async () => {} },
    '@/theme/colors': { colors: { background: '#f4f4f4' } },
    './AppProviders': { AppProviders: 'Providers' }, './SessionProvider': { useSession: () => ({ loading: false }) },
    './AppStartupContext': { AppStartupContext: { Provider: 'StartupProvider' }, useAppStarting: () => true },
  };
  const instance = mount('providers/AppBootstrap.tsx', 'AppBootstrap', dependencies, { children: 'Navigation' });
  await instance.settle(); assert.equal(nativeHeld, 1); assert.equal(find(instance.tree(), 'Providers'), undefined);
  find(instance.tree(), 'Warmup').props.onReady(); await instance.settle();
  fonts = [true, null]; instance.update({}); await instance.settle();
  assert.equal(find(instance.tree(), 'Providers'), undefined);
  preload.resolve(); await instance.settle(); assert.ok(find(instance.tree(), 'Providers'));
  fonts = [false, new Error('Font unavailable')]; instance.update({}); await instance.settle();
  assert.ok(find(instance.tree(), 'Providers')); instance.unmount();
});
test('native and animated splash share the exact icon, background and nominal logo size', () => {
  const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../app.json'), 'utf8')).expo;
  const native = config.plugins.find(plugin => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen')[1];
  const themeBox = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(src, 'theme/colors.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, themeBox);
  const brandBox = { exports: {}, require: name => name === '@/theme/colors' ? themeBox.exports : path.resolve(src, 'config', name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(src, 'config/brand.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, brandBox);
  const brand = brandBox.exports.appBrand;
  assert.equal(native.backgroundColor, brand.splashBackground); assert.equal(native.imageWidth, brand.splashLogoSize);
  assert.equal(path.resolve(__dirname, '..', native.image), brand.icon); assert.ok(fs.existsSync(brand.icon));
});
