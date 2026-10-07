// Jang testi: o'yinchi harakatsiz turadi, botlar unga hujum qilishi kerak (15 s).
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';

const exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;
const server = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
const fires = [];
await page.goto('http://localhost:5198/');
await page.waitForFunction(() => window.__game);
await page.evaluate(() => {
  window.__fires = {};
  window.__game.world.events.on('fire', (e) => (window.__fires[e.sourceId + ':' + e.weapon] = (window.__fires[e.sourceId + ':' + e.weapon] ?? 0) + 1));
  window.__dmg = 0;
  window.__game.world.events.on('damage', (e) => e.targetId === window.__game.player.id && (window.__dmg += e.amount));
});
await page.waitForTimeout(15000);
const r = await page.evaluate(() => ({ hp: window.__game.player.hp, max: window.__game.player.maxHp, dmg: window.__dmg, fires: window.__fires,
  t: window.__game.world.time.toFixed(1), bots: window.__game.world.vehicles.filter((v) => v !== window.__game.player).map((v) => { const p = v.body.translation(); return { id: v.id, hp: Math.round(v.hp), pos: [p.x, p.y, p.z].map(Math.round), spd: v.speed().toFixed(1) }; }) }));
await page.screenshot({ path: process.argv[2] ?? 'test-results/combat.png' });
await browser.close();
await server.close();
console.log(JSON.stringify(r));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
if (r.dmg <= 0) { console.error('Botlar o\'yinchiga zarar yetkazmadi'); process.exit(1); }
console.log('combat OK');
