// Expo web :8092 + Chromium CDP :9223. Review artifacts remain in /tmp.
import { mkdir, writeFile } from 'node:fs/promises';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
for (let i = 0; i < 160; i++) {
  try { if ((await (await fetch('http://127.0.0.1:8092/status', { signal: AbortSignal.timeout(1000) })).text()).includes('running')) break; } catch {}
  await pause(500);
}
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const socket = new WebSocket(targets.find(item => item.type === 'page').webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let id = 0; const pending = new Map(); const errors = []; const started = Date.now();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error' && message.params.timestamp >= started) errors.push(message.params.args.map(arg => arg.value ?? arg.description));
  if (pending.has(message.id)) { const entry = pending.get(message.id); pending.delete(message.id); message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { pending.set(++id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
const evaluate = async expression => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.value;
async function waitFor(text) { for (let i = 0; i < 180; i++) { if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) return; await pause(500); } throw new Error(`Missing ${text}: ${JSON.stringify(errors)}`); }
async function click(label, aria = false) {
  const found = await evaluate(`(() => { const el = [...document.querySelectorAll('[role="button"],button,[role="radio"],[role="tab"]')].find(el => el.getClientRects().length && ${aria ? 'el.getAttribute("aria-label")' : 'el.textContent.trim()'} === ${JSON.stringify(label)}); if (!el) return false; el.click(); return true; })()`);
  if (!found) throw new Error(`Missing control ${label}`); await pause(250);
}
async function input(value) {
  await evaluate(`(() => { const el = document.querySelector('[aria-label="Message au coach"]'); const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); })()`); await pause(150);
}
async function absent(text) { if (await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`)) throw new Error(`Unexpected ${text}`); }
const output = '/tmp/coacheroes-coach-review'; await mkdir(output, { recursive: true });
async function shot(name) {
  await pause(700); const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${output}/${name}.png`, Buffer.from(data, 'base64'));
  if (await evaluate('document.documentElement.scrollWidth > window.innerWidth')) throw new Error(`Horizontal overflow ${name}`);
  console.log(`Captured ${name}`);
}
try {
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: 'http://127.0.0.1:8092/coach' }); await waitFor('Questions rapides'); await shot('01-questions');
  await click('Mes conversations', true); await waitFor('Ta première conversation'); await shot('07-empty-history'); await click('Nouvelle conversation');
  await click('Dois-je alléger ma séance ?', true); await waitFor('Voir l’ajustement');
  await input('Et pour la boxe samedi ?'); await click('Envoyer le message', true); await waitFor('Aucun changement pour la boxe'); await shot('02-chat');
  await click('Voir l’ajustement'); await waitFor('Pourquoi cet ajustement'); await shot('03-reasons');
  await click('Règle d’adaptation utilisée', true); await shot('03-rule'); await click('Compris');
  await click('Voir la séance modifiée'); await shot('04-proposal');
  await click('Développé épaules', true); await waitFor('Une série de moins'); await click('Compris');
  await click('Comparer les versions'); await shot('05-compare');
  await click('Voir les données utilisées'); await click('Retour à la comparaison');
  await click('Continuer'); await shot('06-decision-week');
  await click('Jusqu’à nouvel ordre'); await absent('Retour automatique au programme initial'); await shot('06-decision-ongoing');
  await click('Ajuster avec le coach'); await waitFor('Coach IA');
  await input(''); await click('Voir l’ajustement'); await click('Voir la séance modifiée'); await click('Comparer les versions'); await click('Continuer');
  await click('Appliquer les changements'); await waitFor('Ajustement appliqué'); await shot('08-applied');
  await click('Voir mon programme'); await waitFor('Muscu B allégée'); await shot('09-programme');
  await click('Ouvrir Muscu B, Jeudi', true); await waitFor('RIR 3'); await click('Commencer la séance'); await waitFor('14 séries'); await shot('09-session-ready');
  await click('Retour au programme'); await click('Rétablir le programme initial'); await click('Rétablir'); await absent('Muscu B allégée');
  await evaluate('window.history.back()'); await waitFor('Coach IA'); await click('Mes conversations', true); await shot('07-history'); await click('Nouvelle conversation');
  await click('Que manger avec 430 kcal ?', true); await waitFor('Il reste 430 kcal'); await absent('Voir l’ajustement'); await shot('10-no-adjustment');
  await click('Mes conversations', true); await click('Dois-je alléger ma séance ?', true); await waitFor('Ajustement appliqué');
  await click('Questions rapides', true);
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 720, deviceScaleFactor: 1, mobile: true }); await shot('11-small-entry');
  await click('Dois-je alléger ma séance ?', true); await click('Voir l’ajustement'); await shot('11-small-reasons');
  await click('Voir la séance modifiée'); await shot('11-small-proposal'); await click('Comparer les versions'); await shot('11-small-compare'); await click('Continuer'); await shot('11-small-decision');
  await click('Conserver le programme actuel'); await waitFor('Programme conservé'); await shot('11-small-chat');
  if (errors.length) throw new Error(JSON.stringify(errors));
  console.log('Coach flow, history, accept/refuse and Programme integration passed without runtime errors.');
} finally { socket.close(); }
