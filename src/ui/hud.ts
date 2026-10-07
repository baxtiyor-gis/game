import * as THREE from 'three';
import { handling, t } from '../core/data';
import type { GameWorld, System, VehicleHandle } from '../core/types';
import { Flag, Prop, Txt, h, reducedMotion } from './dom';
import { aheadDistance, fillTemplate, formatScore, isCritical, litSegments, ndcToPixel, stageColor, stageOf, worldToRadar } from './format';
import type { RadarPoint } from './format';
import { HUD } from './hudConfig';
import { HUD_CSS } from './hudStyle';
import { Radar } from './radar';

const SLOTS = 3;
type MsgKind = 'whammy' | 'destroyed' | 'pickup';
interface Msg {
  text: string;
  kind: MsgKind;
}

/** O'yin ichidagi HUD: DOM/CSS overlay + radar canvas. Faqat o'zgargan qiymatlar DOM ga yoziladi. */
export class Hud implements System {
  readonly name = 'hud';
  private readonly box: HTMLElement;
  private readonly style: HTMLStyleElement;
  private readonly off: Array<() => void>;
  private readonly onResize = (): void => {
    this.w = this.box.clientWidth;
    this.hgt = this.box.clientHeight;
  };
  private w = 0;
  private hgt = 0;

  private readonly hpPanel: Flag;
  private readonly hpColor: Prop;
  private readonly segs: HTMLElement[] = [];
  private segFlags: Flag[] = [];
  private lit = -1;
  private readonly driver: Txt;
  private readonly vehicle: Txt;
  private driverId = '';
  private readonly slotName: Txt[] = [];
  private readonly slotAmmo: Txt[] = [];
  private readonly slotSel: Flag[] = [];
  private readonly mgName: Txt;
  private readonly mgAmmo: Txt;
  private readonly spName: Txt;
  private readonly spAmmo: Txt;
  private readonly enemies: Txt;
  private readonly scoreTxt: Txt;
  private readonly radar: Radar;
  private readonly msgEl: HTMLElement;
  private readonly endEl: HTMLElement;
  private readonly endTxt: Txt;
  private readonly endLose: Flag;
  private readonly endShow: Flag;
  private readonly target: HTMLElement;
  private readonly targetShow: Flag;
  private targetXf = '';

  private queue: Msg[] = [];
  private msgLeft = 0;
  private sawEnemies = false;

  private readonly pt: RadarPoint = { x: 0, y: 0, clamped: false };
  private readonly tmpV = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly pos = new THREE.Vector3();

  constructor(
    private readonly world: GameWorld,
    root: HTMLElement,
    private readonly player: () => VehicleHandle | undefined,
    private readonly score?: (id: string) => number,
  ) {
    this.style = document.createElement('style');
    this.style.textContent = HUD_CSS;
    document.head.appendChild(this.style);
    this.box = h('div', 'hud', root);

    // 1) Sog'liq paneli
    const hp = h('div', 'hud-panel hud-hp', this.box);
    this.driver = new Txt(h('div', 'hud-driver', hp));
    this.vehicle = new Txt(h('div', 'hud-vehicle', hp));
    const bar = h('div', 'hud-bar', hp);
    for (let i = 0; i < HUD.segments; i++) this.segs.push(h('i', 'hud-seg', bar));
    this.segFlags = this.segs.map((s) => new Flag(s, 'on'));
    this.hpPanel = new Flag(hp, 'crit');
    this.hpColor = new Prop(bar, '--hp');

    // 2) Qurollar
    const wpn = h('div', 'hud-panel hud-wpn', this.box);
    for (let i = 0; i < SLOTS; i++) {
      const row = h('div', 'hud-slot', wpn);
      this.slotName.push(new Txt(h('span', '', row)));
      this.slotAmmo.push(new Txt(h('span', '', row)));
      this.slotSel.push(new Flag(row, 'sel'));
    }
    const mg = h('div', 'hud-slot mg', wpn);
    this.mgName = new Txt(h('span', '', mg));
    this.mgAmmo = new Txt(h('span', '', mg));
    this.mgName.set(t('weapon.mg'));
    this.mgAmmo.set(t('hud.infinite'));
    const sp = h('div', 'hud-slot mg', wpn);
    this.spName = new Txt(h('span', '', sp));
    this.spAmmo = new Txt(h('span', '', sp));
    this.spName.set(t('hud.special'));

    // 3) Radar
    const rp = h('div', 'hud-panel hud-radar', this.box);
    this.radar = new Radar(h('canvas', '', rp));

    // 5) Raqiblar soni va ochko
    const top = h('div', 'hud-top', this.box);
    this.enemies = new Txt(h('span', '', top));
    this.scoreTxt = new Txt(h('span', 'big', top));

    // 4) Markaziy xabar, 7) g'alaba/mag'lubiyat, 6) nishon
    this.msgEl = h('div', 'hud-msg', this.box);
    this.endEl = h('div', 'hud-end', this.box);
    this.endTxt = new Txt(this.endEl);
    this.endLose = new Flag(this.endEl, 'lose');
    this.endShow = new Flag(this.endEl, 'show');
    this.target = h('div', 'hud-target', this.box);
    this.targetShow = new Flag(this.target, 'show');

    this.onResize();
    window.addEventListener('resize', this.onResize);

    const ev = world.events;
    this.off = [
      ev.on('whammy', (e) => {
        if (e.sourceId === this.player()?.id) this.push(fillTemplate(t('hud.whammy'), { n: e.count }), 'whammy');
      }),
      ev.on('destroyed', (e) => {
        const id = this.player()?.id;
        if (id && e.sourceId === id && e.targetId !== id) this.push(t('hud.destroyed'), 'destroyed');
      }),
      ev.on('pickup', (e) => {
        if (e.vehicleId !== this.player()?.id) return;
        const key = e.kind === 'health' || e.kind === 'special' ? `hud.pickup.${e.kind}` : `weapon.${e.kind}`;
        this.push(fillTemplate(t('hud.pickup'), { name: t(key) }), 'pickup');
      }),
    ];
  }

  update(dt: number): void {
    const p = this.player();
    if (p) this.updatePlayer(p);
    this.updateWorld(p);
    this.updateMessage(dt);
  }

  dispose(): void {
    for (const f of this.off) f();
    window.removeEventListener('resize', this.onResize);
    this.box.remove();
    this.style.remove();
  }

  private updatePlayer(p: VehicleHandle): void {
    if (p.id !== this.driverId) {
      this.driverId = p.id;
      this.driver.set(t(p.def.driver));
      this.vehicle.set(t(p.def.name));
    }
    const lit = litSegments(p.hp, p.maxHp, HUD.segments);
    if (lit !== this.lit) {
      this.lit = lit;
      for (let i = 0; i < this.segFlags.length; i++) this.segFlags[i].set(i < lit);
    }
    const stage = stageOf(p.hp, p.maxHp, handling.damage.stages);
    this.hpColor.set(stageColor(stage, HUD.hpPalette));
    this.hpPanel.set(isCritical(p.hp, p.maxHp, HUD.critical));

    const inv = p.inventory;
    for (let i = 0; i < SLOTS; i++) {
      const s = inv.slots[i];
      this.slotName[i].set(s ? t(`weapon.${s.weapon}`) : t('hud.empty'));
      this.slotAmmo[i].set(s ? String(s.ammo) : '');
      this.slotSel[i].set(i === inv.selected && !!s);
    }
    this.spAmmo.set(String(inv.specialAmmo));
  }

  private updateWorld(p: VehicleHandle | undefined): void {
    const vs = this.world.vehicles;
    let enemies = 0;
    let best = Infinity;
    let bestV: VehicleHandle | undefined;
    if (p) {
      p.position(this.pos);
      p.forward(this.fwd);
      if (Math.hypot(this.fwd.x, this.fwd.z) < HUD.forwardEps) this.fwd.set(0, 0, 1);
    }
    this.radar.begin();
    for (const v of vs) {
      if (v === p || !v.alive) continue;
      enemies++;
      if (!p) continue;
      v.position(this.tmpV);
      const dx = this.tmpV.x - this.pos.x;
      const dz = this.tmpV.z - this.pos.z;
      worldToRadar(dx, dz, this.fwd.x, this.fwd.z, HUD.radarRange, this.pt);
      this.radar.blip(this.pt.x, this.pt.y, HUD.factionColors[v.def.faction], this.pt.clamped);
      const d = aheadDistance(dx, dz, this.fwd.x, this.fwd.z, HUD.targetRange, HUD.targetMinCos);
      if (d < best) {
        best = d;
        bestV = v;
      }
    }
    this.radar.end();
    if (enemies > 0) this.sawEnemies = true;

    this.enemies.set(`${t('hud.enemies')} ${enemies}`);
    this.scoreTxt.set(`${t('hud.score')} ${formatScore(p && this.score ? this.score(p.id) : 0, HUD.scorePad)}`);
    this.updateTarget(p && p.alive ? bestV : undefined);

    const lose = !!p && !p.alive;
    const win = !!p && p.alive && enemies === 0 && this.sawEnemies;
    this.endShow.set(lose || win);
    this.endLose.set(lose);
    if (lose || win) this.endTxt.set(t(lose ? 'hud.lose' : 'hud.win'));
  }

  private updateTarget(v: VehicleHandle | undefined): void {
    if (!v) return this.targetShow.set(false);
    v.position(this.tmpV);
    this.tmpV.y += v.def.size[1];
    this.tmpV.project(this.world.camera);
    if (this.tmpV.z > 1 || Math.abs(this.tmpV.x) > 1 || Math.abs(this.tmpV.y) > 1) return this.targetShow.set(false);
    const px = ndcToPixel(this.tmpV.x, this.tmpV.y, this.w, this.hgt);
    const xf = `translate(${Math.round(px.x)}px,${Math.round(px.y)}px)`;
    if (xf !== this.targetXf) {
      this.targetXf = xf;
      this.target.style.transform = xf;
    }
    this.targetShow.set(true);
  }

  private push(text: string, kind: MsgKind): void {
    if (this.queue.length >= HUD.msgQueueMax) this.queue.shift();
    this.queue.push({ text, kind });
  }

  private updateMessage(dt: number): void {
    this.msgLeft -= dt;
    if (this.msgLeft > 0 || this.queue.length === 0) return;
    const m = this.queue.shift()!;
    // Navbat to'lsa xabarlar tezroq almashadi
    const secs = HUD.msgSeconds / (1 + this.queue.length);
    this.msgLeft = secs;
    this.msgEl.className = `hud-msg ${m.kind}`;
    this.msgEl.textContent = m.text;
    const still = reducedMotion();
    const at = (s: number): string => (still ? 'translate(-50%,-50%)' : `translate(-50%,-50%) scale(${s})`);
    this.msgEl.animate?.(
      [
        { opacity: 0, transform: at(1.7) },
        { opacity: 1, transform: at(1), offset: 0.15 },
        { opacity: 1, transform: at(1), offset: 0.75 },
        { opacity: 0, transform: at(0.95) },
      ],
      { duration: secs * 1000, fill: 'forwards' },
    );
  }
}
