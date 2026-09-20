// Local visual smoke test: Expo web :8092, Chromium CDP :9223.
import { mkdir, writeFile } from 'node:fs/promises';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map(); const errors = []; const started = Date.now();
let fileChooser;
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Page.fileChooserOpened') fileChooser = message.params;
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' && message.params.timestamp >= started) errors.push(message.params.args.map(arg => arg.value ?? arg.description));
  if (pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitFor(text) { for (let i = 0; i < 160; i++) { if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) return; await sleep(500); } throw new Error(`Missing ${text}: ${JSON.stringify(errors)}`); }
async function click(label, aria = false) {
  const found = await evaluate(`(() => { const el = [...document.querySelectorAll('[role="button"],button,[role="radio"],[role="tab"]')].find(el => el.getClientRects().length && ${aria ? 'el.getAttribute("aria-label")' : 'el.textContent.trim()'} === ${JSON.stringify(label)}); if (!el) return false; el.click(); return true; })()`);
  if (!found) throw new Error(`Missing control ${label}`); await sleep(250);
}
async function input(label, value) {
  await evaluate(`(() => { const el = document.querySelector('[aria-label=${JSON.stringify(label)}]'); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await sleep(200);
}
const output = '/tmp/coacheroes-nutrition-review'; await mkdir(output, { recursive: true });
async function shot(name) {
  await sleep(800); const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'));
  const overflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
  if (overflow) throw new Error(`Horizontal overflow: ${name}`);
  console.log(`Captured ${name}`);
}
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8092/nutrition' }); await waitFor('Voir les calories restantes');
  await shot('01-dashboard');
  await click('Options Nutrition', true); await shot('01-menu'); await click('Voir l’historique'); await waitFor('Repas enregistrés'); await shot('06-history');
  if (!await evaluate(`([...document.querySelectorAll('[role="button"]')].filter(el => /^[LMJVSD]\\n\\d+$/.test(el.textContent.trim())).every(el => el.getBoundingClientRect().width > 35))`)) throw new Error('Calendar day buttons too narrow');
  await click('Semaine'); await shot('06-week'); await click('Mois'); await shot('06-month'); await click('Retour', true);
  await click('Voir les calories restantes'); await shot('05-remaining'); await click('Retour à Nutrition');
  await click('Midi', true); await shot('03-detail'); await click('Modifier le repas'); await shot('03-validation');
  await click('Riz blanc', true); await shot('04-rice'); await click('bol'); await shot('04-rice-bowl'); await click('Enregistrer');
  await click('Poulet braisé', true); await shot('04-chicken'); await click('cuisse'); await click('Enregistrer');
  await click('Enregistrer les modifications'); await waitFor('Voir les calories restantes');
  await click('Ajouter un repas'); await shot('02-text'); await click('Photo'); await shot('02-photo');
  if (!await evaluate(`document.querySelector('[aria-label="Cadre de prise de photo"]').getBoundingClientRect().height > 250`)) throw new Error('Missing photo frame');
  if (process.env.TEST_CAMERA === '1') {
    for (let i = 0; i < 40; i++) { if (await evaluate(`document.querySelector('video')?.readyState >= 2`)) break; await sleep(250); }
    await click('Prendre la photo', true); await waitFor('Photo prête à être utilisée'); await shot('02-captured');
    if (await evaluate(`Boolean(document.querySelector('video'))`)) throw new Error('Camera remained mounted after capture');
    await click('Reprendre');
    for (let i = 0; i < 40; i++) { if (await evaluate(`document.querySelector('video')?.readyState >= 2`)) break; await sleep(250); }
    await shot('02-camera-live');
    await send('Page.setInterceptFileChooserDialog', { enabled: true });
    const galleryPoint = await evaluate(`(() => { const el = document.querySelector('[aria-label="Galerie"]'); el.scrollIntoView({ block: 'center' }); const box = el.getBoundingClientRect(); return { x: box.x + box.width / 2, y: box.y + box.height / 2 }; })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...galleryPoint, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...galleryPoint, button: 'left', clickCount: 1 });
    for (let i = 0; i < 40 && !fileChooser; i++) await sleep(100);
    if (!fileChooser) throw new Error('Gallery did not open');
    await send('DOM.setFileInputFiles', { backendNodeId: fileChooser.backendNodeId, files: ['/mnt/e/coacHeroes/mobile/assets/onboarding/chicken.png'] });
    await waitFor('Photo prête à être utilisée'); await shot('02-gallery-import');
    await send('Page.setInterceptFileChooserDialog', { enabled: false });
  }
  await click('Texte');
  await input('Description du repas', 'Poulet et riz'); await click('Analyser le repas'); await click('Continuer avec l’exemple'); await waitFor('Composition'); await click('Ajouter au journal');
  await click('Options Nutrition', true); await click('Voir l’historique'); await shot('06-after-add'); await click('Retour', true);
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true }); await shot('07-small-dashboard');
  await click('Matin', true); await click('Dupliquer'); await click('Ajouter au journal');
  await click('Matin', true); await click('Supprimer le repas'); await click('Supprimer'); await waitFor('Voir les calories restantes');
  await click('Ajouter un repas'); await click('Ajouter les aliments manuellement'); await click('Ajouter un aliment'); await shot('07-small-search'); await click('Œuf', true); await shot('07-small-editor'); await click('Enregistrer'); await click('Ajouter au journal');
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log('Nutrition flows passed; no runtime errors.');
} finally { socket.close(); }
