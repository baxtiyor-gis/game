// Yuklanish/kadr profili: menyu orqa foni, BOSHLASH -> match, `#play`, `#play-valley_farms`, `#play-aircraft_graveyard`, `#play-secret_base`, `#play-hoover_dam`, `#play-ski_resort`, `#play-casino_city`.
// Natija: test-results/perf.json (+ test-results/loading.png). Ishga tushirish: node tests/e2e/perf.mjs
// Muhit: FRAMES=300, MAX_LONGTASK=3000, SCENARIOS=menu,play,play-valley_farms,play-aircraft_graveyard,play-secret_base,play-hoover_dam,play-ski_resort,play-casino_city
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const FRAMES = Number(process.env.FRAMES ?? 300);
const MAX_LONGTASK = Number(process.env.MAX_LONGTASK ?? 3000); // eng uzun bloklovchi vazifa chegarasi (ms); 0 — tekshirilmaydi
const ONLY = (process.env.SCENARIOS ?? 'menu,play,play-valley_farms,play-aircraft_graveyard,play-secret_base,play-hoover_dam,play-ski_resort,play-casino_city').split(',');
const server = await createServer({ server: { port: 5195, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];

// Sahifa ochilishidan oldin: longtask kuzatuvchisi (buffered)
const INIT = () => {
  window.__long = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
};

const measures = (prefix) => page.evaluate((p) => performance.getEntriesByType('measure').filter((m) => m.name.startsWith(p)).map((m) => [m.name, Math.round(m.startTime), Math.round(m.duration)]), prefix);
let page;

/** Oxirgi `name` measure paydo bo'lguncha kutadi (count — nechanchi marta). */
const waitMeasure = (name, count = 1) => page.waitForFunction(([n, c]) => performance.getEntriesByName(n).length >= c, [name, count], { timeout: 120000 });

async function frames() {
  return page.evaluate((n) => new Promise((done) => {
    const d = [];
    let last = performance.now();
    const f = (now) => {
      d.push(now - last);
      last = now;
      if (d.length < n) requestAnimationFrame(f);
      else done(d);
    };
    requestAnimationFrame(f);
  }), FRAMES);
}

/** Bitta qo'lda render: sahnaning draw call/uchburchaklari (soya o'tishi bilan). */
const info = () => page.evaluate(() => {
  const w = window.__game.world;
  const r = w.renderer;
  r.info.autoReset = false;
  r.info.reset();
  r.render(w.scene, w.camera);
  const out = { calls: r.info.render.calls, triangles: r.info.render.triangles, geometries: r.info.memory.geometries, textures: r.info.memory.textures, programs: r.info.programs?.length ?? 0 };
  r.info.autoReset = true;
  return out;
});

function stats(d) {
  const s = [...d.slice(1)].sort((a, b) => a - b); // birinchi delta — yuklanishdan keyingi kadr
  const avg = s.reduce((a, b) => a + b, 0) / s.length;
  return { avg: +avg.toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1) };
}

const longIn = (from, to) => page.evaluate(([a, b]) => window.__long.filter(([s, d]) => s + d >= a && s <= b).reduce((m, [, d]) => Math.max(m, d), 0), [from, to]);

async function open(url) {
  page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(INIT);
  await page.goto(url);
}

/** Match yuklanishi (firstFrame measure) + kadrlar + renderer.info */
async function matchReport(count = 1) {
  await waitMeasure('match:firstFrame', count);
  const all = await measures('match:firstFrame');
  const [, start, dur] = all[all.length - 1];
  const steps = (await measures('load:')).filter(([, s]) => s >= start - 1);
  const built = (await measures('match:built')).at(-1)[2];
  const longest = await longIn(start, start + dur);
  const fr = stats(await frames());
  return { loadMs: dur, builtMs: built, firstFrameMs: dur - built, longestTaskMs: longest, frames: fr, info: await info(), steps: sumSteps(steps) };
}

/** Qadam nomi -> umumiy ms (bir nomli qadamlar, masalan pmrem, qo'shiladi) */
function sumSteps(steps) {
  const by = {};
  for (const [n, , d] of steps) by[n.slice(5)] = (by[n.slice(5)] ?? 0) + d;
  return by;
}

const report = { date: new Date().toISOString(), frames: FRAMES, scenarios: {} };
const base = 'http://localhost:5195/';

// 1) Menyu: boot -> orqa fon tayyor; keyin BOSHLASH -> match
if (ONLY.includes('menu')) {
  await open(base);
  await waitMeasure('menu:backdrop');
  await page.waitForTimeout(300);
  const bd = (await measures('menu:backdrop'))[0];
  const bootLong = await longIn(0, bd[1] + bd[2]);
  await page.evaluate(() => window.__flow.start());
  // Yuklanish ekrani skrinshoti (progress bar yarim yo'lda)
  await page.waitForFunction(() => document.querySelector('.ld-root.show') && parseFloat(document.querySelector('.ld-pct')?.textContent ?? '0') >= 30, null, { timeout: 60000 });
  await page.screenshot({ path: 'test-results/loading.png' });
  const menuStart = await matchReport();
  report.scenarios.menu = { bootToMenuMs: bd[1] + bd[2], backdropMs: bd[2], longestTaskMs: bootLong, start: menuStart };
  await page.close();
}

// 2) #play, #play-valley_farms, #play-aircraft_graveyard, #play-secret_base, #play-hoover_dam, #play-ski_resort va #play-casino_city (menyu o'tkazib yuboriladi)
for (const hash of ['play', 'play-valley_farms', 'play-aircraft_graveyard', 'play-secret_base', 'play-hoover_dam', 'play-ski_resort', 'play-casino_city'].filter((h) => ONLY.includes(h))) {
  await open(base + '#' + hash);
  const r = await matchReport();
  const all = await measures('match:firstFrame');
  r.bootToPlayMs = all[0][1] + all[0][2];
  report.scenarios[hash] = r;
  await page.close();
}

await browser.close();
await server.close();
mkdirSync('test-results', { recursive: true });
writeFileSync('test-results/perf.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 1));
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const worst = Math.max(0, ...Object.values(report.scenarios).flatMap((s) => [s.longestTaskMs ?? 0, s.start?.longestTaskMs ?? 0]));
if (MAX_LONGTASK > 0 && worst > MAX_LONGTASK) {
  console.error(`Eng uzun bloklovchi vazifa ${worst} ms > ${MAX_LONGTASK} ms`);
  process.exit(1);
}
console.log('perf OK');
