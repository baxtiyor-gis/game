// Smoke: build qilingan o'yinni ochadi, 4 s haydaydi, konsol xatolarini tekshiradi, skrinshot oladi.
// Ishga tushirish: npm run e2e  (avval npm run build)
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

const out = process.argv[2] ?? 'test-results/smoke.png';
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5199, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('http://localhost:5199/');
await page.waitForFunction(() => window.__flow?.state === 'menu', null, { timeout: 60000 });
await page.waitForTimeout(2500); // orqa fon sahnasi yuklansin
await page.screenshot({ path: 'test-results/menu-home.png' });
await page.keyboard.press('Enter'); // ARCADE
await page.waitForTimeout(1200);
await page.screenshot({ path: 'test-results/menu-select.png' });
await page.keyboard.press('ArrowRight'); // mashinani almashtirish
await page.keyboard.press('ArrowLeft');
await page.keyboard.press('Enter'); // mashina tanlandi -> sozlash
await page.waitForTimeout(500);
await page.screenshot({ path: 'test-results/menu-setup.png' });
await page.keyboard.press('Enter'); // BOSHLASH
await page.waitForFunction(() => window.__game && window.__flow.state === 'playing', null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.down('Space'); // pulemyot
await page.keyboard.press('KeyJ'); // tanlangan qurol
await page.waitForTimeout(150);
await page.screenshot({ path: out }); // tracer, snaryad va sandiqlar ko'rinadi
await page.keyboard.down('KeyW');
await page.waitForTimeout(2000);
await page.keyboard.down('KeyD');
await page.waitForTimeout(800);
await page.keyboard.up('KeyD');
await page.keyboard.up('KeyW');
await page.keyboard.up('Space');
await browser.close();
await server.close();
if (errors.length) {
  console.error('XATOLAR:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('smoke OK →', out);
