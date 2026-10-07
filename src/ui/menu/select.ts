import { t } from '../../core/data';
import type { VehicleDef } from '../../core/types';
import { h } from '../dom';
import { DRIVERS, MENU, type Action } from './config';
import { accelTime, factionGroups, fill, flatOrder, statBars, stepGroup, topSpeedKmh } from './logic';
import { Preview } from './preview';
import { Rows } from './rows';
import { onSwipe } from './swipe';
import { backButton, type Host, type Screen } from './screen';
import { isUnlocked } from './store';

const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1.5a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
const factionOf = (id: string) => MENU.factions.find((f) => f.id === id)!;

/** Mashina tanlash: fraksiya bo'yicha kartochkalar, aylanuvchi 3D model, xarakteristikalar, qurol, biografiya. */
export function selectScreen(host: Host, vehicles: readonly VehicleDef[]): Screen {
  const order = flatOrder(vehicles);
  let idx = Math.max(0, order.findIndex((v) => v.id === host.settings.vehicle));
  const el = h('section', 'm-screen');
  backButton(el, host);
  const sel = h('div', 'm-sel', el);
  const head = h('div', 'm-head', sel);
  h('h2', 'm-title', head, t('select.title'));
  h('div', 'm-stripe', head);

  // Chap: kartochkalar (fraksiya guruhlari)
  const cards = h('div', 'm-cards', sel);
  const cardEls = new Map<string, HTMLElement>();
  for (const g of factionGroups(vehicles)) {
    const f = factionOf(g.faction);
    const fh = h('div', 'm-fh', cards, t(f.label));
    fh.style.setProperty('--fc', f.color);
    const grid = h('div', 'm-grid', cards);
    for (const def of g.items) {
      const c = h('div', 'm-card', grid);
      c.style.setProperty('--fc', f.color);
      c.style.setProperty('--vc', def.color);
      h('b', '', c, t(def.driver));
      h('i', '', c, t(def.name));
      h('span', 'dot', c);
      c.insertAdjacentHTML('beforeend', LOCK_SVG);
      c.onclick = () => (order[idx] === def ? confirm() : choose(order.indexOf(def)));
      cardEls.set(def.id, c);
    }
  }

  // O'ng: 3D ko'rinish + ma'lumot
  const detail = h('div', 'm-detail', sel);
  const prevBox = h('div', 'm-prev', detail);
  const preview = new Preview(prevBox);
  onSwipe(prevBox, (d) => choose(idx + d));
  const lockBox = h('div', 'm-lockbox', prevBox);
  h('b', '', lockBox, t('select.locked'));
  h('span', '', lockBox, t('select.lockedHint'));
  const info = h('div', 'm-info', detail);
  const colA = h('div', '', info);
  const colB = h('div', '', info);
  const driver = h('div', 'm-driver', colA);
  const vname = h('div', 'm-vname', colA);
  const vtext = h('span', '', vname);
  const badge = h('span', 'm-badge', vname);
  const bars = MENU.bars.map((b) => {
    const row = h('div', 'm-bar', colA);
    h('span', '', row, t(b.label));
    const fillEl = h('div', 'm-fill', h('div', 'm-track', row));
    return { fillEl, val: h('b', '', row) };
  });
  const nums = h('div', 'm-nums', colB);
  const numEls = ['stat.mass', 'stat.topKmh', 'stat.accel100'].map((k) => {
    const n = h('div', 'm-num', nums);
    h('span', '', n, t(k));
    return h('b', '', n);
  });
  h('div', 'm-sec', colB, t('select.special'));
  const spName = h('div', 'm-spname', colB);
  const spDesc = h('p', 'm-text', colB);
  h('div', 'm-sec', colB, t('select.driver'));
  const bio = h('p', 'm-text', colB);
  const okRows = new Rows(detail, [{ label: () => (isUnlocked(order[idx]!, host.settings) ? t('select.confirm') : t('select.locked.btn')), enabled: () => isUnlocked(order[idx]!, host.settings), ok: () => confirm() }], 'm-confirm');
  h('div', 'm-hint', el, t('menu.hint.select'));

  function render(): void {
    const def = order[idx]!;
    const f = factionOf(def.faction);
    const d = DRIVERS[def.id];
    const open = isUnlocked(def, host.settings);
    cardEls.forEach((c, id) => {
      const v = vehicles.find((x) => x.id === id)!;
      c.classList.toggle('sel', id === def.id);
      c.classList.toggle('lock', !isUnlocked(v, host.settings));
    });
    const narrow = matchMedia('(max-width:760px)').matches;
    cardEls.get(def.id)?.scrollIntoView({ block: 'nearest', inline: narrow ? 'center' : 'nearest' });
    if (!narrow) cards.scrollLeft = 0;
    info.style.setProperty('--fc', f.color);
    driver.textContent = t(def.driver);
    vtext.textContent = t(def.name);
    badge.textContent = t(f.label);
    statBars(def).forEach((b, i) => {
      bars[i]!.fillEl.style.setProperty('--v', String(b.fraction));
      bars[i]!.val.textContent = String(b.value);
    });
    const at = accelTime(def);
    numEls[0]!.textContent = fill(t('unit.kg'), def.mass);
    numEls[1]!.textContent = fill(t('unit.kmh'), topSpeedKmh(def));
    numEls[2]!.textContent = at === null ? t('stat.none') : fill(t('unit.sec'), at.toFixed(1));
    spName.textContent = d ? t(d.specialName) : '';
    spDesc.textContent = d ? t(d.specialDesc) : '';
    bio.textContent = d ? t(d.bio) : '';
    lockBox.classList.toggle('show', !open);
    preview.show(def);
    okRows.refresh();
  }

  function choose(i: number): void {
    idx = (i + order.length) % order.length;
    render();
  }

  function confirm(): void {
    const def = order[idx]!;
    if (!isUnlocked(def, host.settings)) {
      lockBox.classList.remove('shake');
      void lockBox.offsetWidth;
      lockBox.classList.add('shake');
      return;
    }
    host.settings.vehicle = def.id;
    host.save();
    host.go('setup');
  }

  return {
    id: 'select',
    el,
    enter: () => {
      idx = Math.max(0, order.findIndex((v) => v.id === host.settings.vehicle));
      bars.forEach((b) => b.fillEl.style.setProperty('--v', '0'));
      void el.offsetWidth;
      render();
    },
    tick: (dt) => preview.tick(dt),
    action: (a: Action) => {
      if (a === 'left') choose(idx - 1);
      else if (a === 'right') choose(idx + 1);
      else if (a === 'up') choose(stepGroup(order, idx, -1));
      else if (a === 'down') choose(stepGroup(order, idx, 1));
      else if (a === 'ok') confirm();
    },
    dispose: () => preview.dispose(),
  };
}
