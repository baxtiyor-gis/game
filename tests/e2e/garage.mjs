// Garage: 13 mashinani 4x4 to'rda skrinshot qiladi (test-results/garage.png). GARAGE_IDS=rattler,bus — yakka yaqin ko'rinishlar.
// Ishga tushirish: node tests/e2e/garage.mjs [chiqish.png]
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

const out = process.argv[2] ?? 'test-results/garage.png';
const ids = (process.env.GARAGE_IDS ?? '').split(',').filter(Boolean);
const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5198, watch: null }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

async function shot(query, path) {
  await page.goto(`http://localhost:5198/garage.html${query}`);
  await page.waitForFunction(() => window.__garageReady === true, null, { timeout: 60000 });
  await page.screenshot({ path });
  return page.evaluate(() => window.__tris);
}

const tris = await shot('', out);
for (const id of ids) {
  const yaw = process.env.GARAGE_YAW ?? '0.65';
  await shot(`?id=${id}&yaw=${yaw}`, out.replace('.png', `-${id}.png`));
}
await browser.close();
await server.close();
if (errors.length) {
  console.error('XATOLAR:\n' + errors.join('\n'));
  process.exit(1);
}
console.log('garage OK ->', out, `(${Math.round(tris)} tris)`);
