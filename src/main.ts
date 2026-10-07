import { World } from './core/world';
import { Keyboard } from './input/keyboard';
import { Gamepad } from './input/gamepad';
import { PlayerController } from './input/playerController';
import { Flow } from './modes/flow';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const keyboard = new Keyboard();
  const world = await World.create({ canvas, afterFixed: () => keyboard.endTick() });
  const player = new PlayerController('p1', keyboard, new Gamepad(0));
  const flow = new Flow({ world, ui: document.getElementById('ui')!, keyboard, player });
  // Testlar uchun (Playwright): oqim holati
  (window as unknown as { __flow: unknown }).__flow = flow;
  flow.init();
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55">${String(e)}</pre>`);
});
