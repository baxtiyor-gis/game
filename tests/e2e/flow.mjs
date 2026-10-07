// Oqim testi: pauza (fizika to'xtaydi), natija ekrani, 5 marta ketma-ket qayta boshlash (xotira oqmasligi).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5196, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const fail = (msg) => {
  console.error('XATO: ' + msg + (errors.length ? '\n' + errors.join('\n') : ''));
  process.exit(1);
};
const state = () => page.evaluate(() => window.__flow.state);
const waitState = (s) => page.waitForFunction((x) => window.__flow.state === x, s, { timeout: 60000 });
const snap = () => page.evaluate(() => {
  const w = window.__game.world;
  const i = w.renderer.info;
  return { geo: i.memory.geometries, tex: i.memory.textures, vehicles: w.vehicles.length, bodies: w.physics.bodies.len(), children: w.scene.children.length };
});

await page.goto('http://localhost:5196/#play');
await waitState('playing');
await page.waitForTimeout(1500);

// Pauza
await page.keyboard.press('Escape');
await waitState('paused');
const t0 = await page.evaluate(() => window.__game.world.time);
await page.waitForTimeout(800);
const t1 = await page.evaluate(() => window.__game.world.time);
if (t1 !== t0) fail(`pauzada fizika to'xtamadi: ${t0} -> ${t1}`);
await page.screenshot({ path: 'test-results/menu-pause.png' });
await page.keyboard.press('Escape');
await waitState('playing');
await page.waitForTimeout(500);
if ((await page.evaluate(() => window.__game.world.time)) <= t1) fail('davom ettirilgandan keyin vaqt yurmadi');

// Natija: barcha raqiblar o'ladi -> g'alaba (2 s kechikish)
await page.evaluate(() => window.__game.world.vehicles.forEach((v) => v !== window.__game.player && (v.alive = false)));
await waitState('result');
await page.waitForTimeout(500);
await page.screenshot({ path: 'test-results/menu-result.png' });

// 5 marta ketma-ket qayta boshlash
const first = [];
for (let i = 0; i < 5; i++) {
  await page.keyboard.press('Enter'); // Qayta o'ynash
  await waitState('playing');
  await page.waitForTimeout(600);
  first.push(await snap());
  await page.keyboard.press('Escape');
  await waitState('paused');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // Qayta boshlash
  await waitState('playing');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__game.world.vehicles.forEach((v) => v !== window.__game.player && (v.alive = false)));
  await waitState('result');
}
console.log(JSON.stringify(first));
// Resurs oqishi chegarasi: match boshiga 0 (geometriya/tekstura/tana/bolalar o'smasligi kerak).
const base = first[0];
first.forEach((s, i) => {
  for (const k of Object.keys(base)) {
    if (s[k] > base[k]) fail(`resurs oqishi: ${k} ${base[k]} -> ${s[k]} (${i}-tsikl)`);
  }
});

// Bosh menyuga qaytish
await page.keyboard.press('ArrowDown');
await page.keyboard.press('ArrowDown');
await page.keyboard.press('Enter');
await waitState('menu');
await page.waitForTimeout(2500);
await page.screenshot({ path: 'test-results/menu-home-after.png' });
await browser.close();
await server.close();
if (errors.length) fail('konsol xatolari');
console.log('flow OK');
