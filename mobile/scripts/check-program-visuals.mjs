// Run against a local Expo web server (8092) and Chromium CDP (9223).
// Generates review artifacts in /tmp; no application data are persisted.
import { mkdir, writeFile } from 'node:fs/promises';

const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0;
const pending = new Map();
const errors = [];
const startedAt = Date.now();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' && message.params.timestamp >= startedAt) errors.push(message.params.args.map(arg => arg.value ?? arg.description));
  if (pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const waitFor = async text => {
  for (let i = 0; i < 100; i++) { if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) return; await sleep(500); }
  throw new Error(`Missing screen: ${text}. ${JSON.stringify(errors)}`);
};
const click = async (label, aria = false) => {
  const clicked = await evaluate(`(() => { const target = [...document.querySelectorAll('[role="button"],button,[role="radio"],[role="switch"]')].find(el => ${aria ? 'el.getAttribute("aria-label")' : 'el.textContent.trim()'} === ${JSON.stringify(label)}); if(!target) return false; target.click(); return true; })()`);
  if (!clicked) throw new Error(`Missing control: ${label}`);
  await sleep(200);
};
await mkdir('/tmp/coacheroes-program-review', { recursive: true });
const shot = async name => {
  await sleep(1000);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`/tmp/coacheroes-program-review/${name}.png`, Buffer.from(data, 'base64'));
  console.log(`Captured ${name}`);
};
try {
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8092/program' });
  await waitFor('Mon programme');
  await shot('01-programme');
  await click('Ouvrir Muscu A, Lundi', true);
  await waitFor('Commencer la séance');
  await shot('02-detail');
  await click('Développé couché, historique', true);
  await waitFor('Charge de travail');
  await shot('11-historique');
  await click('Retour à la séance');
  await click('Commencer la séance');
  await waitFor('Séance prête');
  await shot('03-preparation');
  await click('Échauffement guidé', true);
  await click('Démarrer');
  await waitFor('Saisir la série 1');
  await shot('04-exercice');
  await click('Options de l’exercice', true);
  await click('Remplacer l’exercice');
  await waitFor('Suggestions');
  await shot('09-remplacement');
  await click('Annuler');
  await click('Options de l’exercice', true);
  await click('Signaler une douleur');
  await waitFor('Où as-tu mal ?');
  await shot('10-douleur');
  await click('Retour', true);
  await click('Saisir la série 1');
  await waitFor('Charges rapides');
  await shot('05-saisie');
  for (let i = 0; i < 3; i++) await click('Diminuer les répétitions', true);
  await click('Valider la saisie');
  await waitFor('Comment était la série ?');
  await shot('06-ressenti');
  await click('Difficile', true);
  await click('Continuer');
  await waitFor('Charge proposée');
  await shot('07-ajustement');
  await click('Confirmer et reprendre');
  await waitFor('Reprendre maintenant');
  await shot('08-repos');
  await click('Reprendre maintenant');
  for (let i = 1; i < 20; i++) {
    const next = await evaluate(`Array.from(document.querySelectorAll('[role="button"]')).find(el => /^Saisir la série \\d+$/.test(el.textContent.trim()))?.textContent.trim()`);
    if (!next) throw new Error(`No next series at ${i}`);
    await click(next);
    await click('Valider la saisie');
    await click('Enregistrer sans ressenti');
    if (i < 19) await click('Reprendre maintenant');
  }
  await waitFor('Débrief');
  await shot('12-debrief');
  await click('Terminer la séance');
  await waitFor('Demander l’analyse du coach');
  await shot('13-resume');
  await click('Demander l’analyse du coach');
  await waitFor('Décisions');
  await shot('14-coach');
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8092/program' });
  await waitFor('Mon programme');
  await shot('01-programme-320');
  const overflow = await evaluate('document.documentElement.scrollWidth > window.innerWidth');
  if (overflow) throw new Error('Horizontal page overflow at 320px');
  console.log('Runtime errors:', JSON.stringify(errors));
  if (errors.length) process.exitCode = 1;
} finally { socket.close(); }
