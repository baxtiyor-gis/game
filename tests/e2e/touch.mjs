// Sensorli boshqaruv e2e: iPhone landshaft (844x390) va portret (390x844). Menyu sensor bilan -> o'yin -> joystik/tugmalar.
// Ishga tushirish: node tests/e2e/touch.mjs. Skrinshotlar: test-results/touch-*.png
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync } from 'node:fs';

mkdirSync('test-results', { recursive: true });
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5199, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const fail = (msg) => {
  console.error('XATO: ' + msg + (errors.length ? '\n' + errors.join('\n') : ''));
  process.exit(1);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const [name, w, h] of [['landscape', 844, 390], ['portrait', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id })) });
  const state = () => page.evaluate(() => window.__flow.state);
  const waitState = (s) => page.waitForFunction((x) => window.__flow.state === x, s, { timeout: 90000 });
  const shot = (n) => page.screenshot({ path: `test-results/touch-${name}-${n}.png` });
  const center = async (sel) => {
    const b = await page.locator(sel).first().boundingBox();
    if (!b) fail(`${name}: ${sel} topilmadi`);
    return [b.x + b.width / 2, b.y + b.height / 2];
  };
  const tapRow = async (sel, n) => page.locator(sel).nth(n).tap();

  await page.goto('http://localhost:5199/');
  await waitState('menu');
  await sleep(1500);
  await shot('menu');

  // Menyu: sensor bilan ARCADE -> mashina tanlash
  await tapRow('.m-screen.show .m-rows .m-row', 0);
  await page.waitForFunction(() => window.__flow.app.screen === 'select');
  await sleep(800);

  // Swipe: mashina almashadi
  const driver = () => page.evaluate(() => document.querySelector('.m-card.sel b')?.textContent);
  const d0 = await driver();
  const [px, py] = await center('.m-prev');
  await touch('touchStart', [[px + 60, py, 1]]);
  await touch('touchMove', [[px, py, 1]]);
  await touch('touchMove', [[px - 70, py, 1]]);
  await touch('touchEnd', []);
  await sleep(300);
  const d1 = await driver();
  if (d0 === d1) fail(`${name}: swipe mashinani almashtirmadi (${d0})`);
  await shot('select');
  // Orqaga swipe -> boshlang'ich mashina
  await touch('touchStart', [[px - 60, py, 1]]);
  await touch('touchMove', [[px + 70, py, 1]]);
  await touch('touchEnd', []);
  await sleep(300);
  if ((await driver()) !== d0) fail(`${name}: teskari swipe ishlamadi`);

  await tapRow('.m-screen.show .m-confirm .m-row', 0);
  await page.waitForFunction(() => window.__flow.app.screen === 'setup');
  await sleep(500);
  await shot('setup');
  await tapRow('.m-screen.show .m-rows .m-row', 3); // BOSHLASH
  await waitState('playing');
  await sleep(400);
  // Portretda "telefonni yoting" maslahati ko'rinadi (bloklamaydi), landshaftda yo'q
  const hint = await page.evaluate(() => {
    const e = document.querySelector('.tc-hint');
    return { show: e.classList.contains('show'), pe: getComputedStyle(e).pointerEvents };
  });
  if (hint.show !== (h > w) || hint.pe !== 'none') fail(`${name}: maslahat holati noto'g'ri ${JSON.stringify(hint)}`);

  await shot('game-idle');
  await sleep(1500);

  const ui = await page.evaluate(() => ({
    show: !!document.querySelector('.tc-root.show'),
    hudOn: document.documentElement.classList.contains('tc-on'),
  }));
  if (!ui.show || !ui.hudOn) fail(`${name}: sensorli boshqaruv ko'rinmadi ${JSON.stringify(ui)}`);

  // Joylashuv: tugmalar ekran ichida, HUD panellari bilan kesishmaydi
  const overlap = await page.evaluate(() => {
    const r = (e) => e.getBoundingClientRect();
    const btns = [...document.querySelectorAll('.tc-btn')].filter((e) => !e.closest('.tc-panel')).map((e) => [e.className, r(e)]);
    const hud = [...document.querySelectorAll('.hud-hp,.hud-radar,.hud-wpn,.hud-top')].map((e) => [e.className, r(e)]);
    const bad = [];
    const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
    for (const [n, b] of btns) {
      if (b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight) bad.push(`${n} ekrandan tashqarida`);
      for (const [hn, hb] of hud) if (hit(b, hb)) bad.push(`${n} x ${hn}`);
      for (const [n2, b2] of btns) if (n < n2 && hit(b, b2)) bad.push(`${n} x ${n2}`);
    }
    return bad;
  });
  if (overlap.length) fail(`${name}: ustma-ust: ${overlap.join('; ')}`);

  // Joystik (gaz) + pulemyot (ko'p barmoq) -> mashina harakatlanadi, 'fire' chiqadi
  await page.evaluate(() => {
    window.__fires = 0;
    window.__game.world.events.on('fire', (e) => e.sourceId === window.__game.player.id && window.__fires++);
  });
  const sx = Math.round(w * 0.2);
  const sy = Math.round(h * 0.65);
  const rad = 64;
  await touch('touchStart', [[sx, sy, 1]]);
  await touch('touchMove', [[sx, sy - rad, 1]]);
  const [mx, my] = await center('.tc-mg');
  await touch('touchStart', [[sx, sy - rad, 1], [mx, my, 2]]);
  await sleep(600);
  await shot('game-drive');
  await sleep(1200);
  const mid = await page.evaluate(() => ({ speed: window.__game.player.speed(), fires: window.__fires, input: window.__game.player.input }));
  if (!(mid.speed > 1)) fail(`${name}: joystik mashinani harakatlantirmadi (speed=${mid.speed})`);
  if (!(mid.fires > 0)) fail(`${name}: pulemyot 'fire' chiqarmadi`);
  if (!(mid.input.throttle > 0.9)) fail(`${name}: throttle=${mid.input.throttle}`);
  // Rul: o'ngga
  await touch('touchMove', [[sx + rad, sy, 1], [mx, my, 2]]);
  await sleep(200);
  const steer = await page.evaluate(() => window.__game.player.input.steer);
  if (!(steer > 0.9)) fail(`${name}: steer=${steer}`);
  await touch('touchEnd', []);
  await sleep(200);
  const rel = await page.evaluate(() => window.__game.player.input);
  if (rel.throttle !== 0 || rel.steer !== 0 || rel.fireMG) fail(`${name}: barmoq ko'tarilgach input tozalanmadi ${JSON.stringify(rel)}`);

  // Kombo paneli: tugma ochadi, panelda 3 ta harakat
  await page.locator('.tc-combo-btn').tap();
  await sleep(300);
  const acts = await page.locator('.tc-panel.open .tc-act').count();
  if (acts !== 3) fail(`${name}: kombo panelida ${acts} tugma`);
  await shot('game-combo');
  await page.locator('.tc-combo-btn').tap();

  // Klaviatura bosilsa yashirinadi, keyin sensor qaytaradi
  await page.keyboard.press('KeyA');
  await sleep(200);
  if (await page.evaluate(() => !!document.querySelector('.tc-root.show'))) fail(`${name}: klaviatura bosilganda yashirinmadi`);
  await touch('touchStart', [[sx, sy, 1]]);
  await touch('touchEnd', []);
  await sleep(200);
  if (await page.evaluate(() => !document.querySelector('.tc-root.show'))) fail(`${name}: sensor qayta ko'rsatmadi`);

  // Rejim "O'chirilgan"
  await page.evaluate(() => (window.__flow.app.settings.touch = 'off', window.__flow.app.save()));
  await sleep(200);
  if (await page.evaluate(() => !!document.querySelector('.tc-root.show'))) fail(`${name}: "O'chirilgan" rejimda ko'rinib qoldi`);
  await page.evaluate(() => (window.__flow.app.settings.touch = 'auto', window.__flow.app.save()));
  await sleep(200);

  // Pauza tugmasi
  await page.locator('.tc-pause').tap();
  await waitState('paused');
  await shot('paused');
  await tapRow('.m-screen.show .m-rows .m-row', 0); // Davom etish
  await waitState('playing');
  await ctx.close();
  console.log(`${name}: OK (speed=${mid.speed.toFixed(1)}, fires=${mid.fires})`);
}

await browser.close();
await server.close();
if (errors.length) {
  console.error('Konsol xatolari:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('touch e2e: OK');
