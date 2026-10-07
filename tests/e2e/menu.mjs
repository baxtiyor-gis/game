// Menyu skrinshotlari: home, tanlash, sozlash, sozlamalar, boshqaruv (+ telefon eni). Ishga tushirish: node tests/e2e/menu.mjs
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5197, hmr: false, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = [];
const sizes = process.env.SIZES ? process.env.SIZES.split(',') : ['960x540', '400x800'];
for (const sz of sizes) {
  const [w, h] = sz.split('x').map(Number);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => (errors.push(String(e)), console.error(String(e))));
  page.on('console', (m) => m.type() === 'error' && (errors.push(m.text()), console.error(m.text())));
  await page.goto('http://localhost:5197/');
  await page.waitForFunction(() => window.__flow?.state === 'menu', null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const shot = (n) => page.screenshot({ path: `test-results/menu-${n}-${sz}.png` });
  await shot('home');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  await shot('select');
  await page.keyboard.press('ArrowDown'); // coyote
  await page.keyboard.press('ArrowDown'); // secret (qulflangan)
  await page.waitForTimeout(900);
  await shot('select-locked');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // SOZLAMALAR
  await page.waitForTimeout(500);
  await shot('settings');
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter'); // BOSHQARUV
  await page.waitForTimeout(500);
  await shot('controls');
  await page.close();
}
await browser.close();
await server.close();
if (errors.length) {
  console.error('XATOLAR:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('menu OK');
