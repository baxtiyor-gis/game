import { t, vehicleDef } from '../../core/data';
import { h } from '../dom';
import { MENU, type Action } from './config';
import { Rows } from './rows';
import { backButton, type Host, type Screen } from './screen';

const wrap = (i: number, d: number, n: number): number => (((i + d) % n) + n) % n;

/** Arena, raqiblar soni, qiyinlik + BOSHLASH. */
export function setupScreen(host: Host): Screen {
  const el = h('section', 'm-screen');
  backButton(el, host);
  h('h2', 'm-title', el, t('setup.title'));
  h('div', 'm-stripe', el);
  const who = h('div', 'm-who', el);
  const s = host.settings;
  const arenaIdx = (): number => Math.max(0, MENU.arenas.findIndex((a) => a.id === s.arena));
  const diffIdx = (): number => Math.max(0, MENU.difficulties.findIndex((d) => d.id === s.difficulty));
  const rows = new Rows(el, [
    {
      label: () => t('setup.arena'),
      value: () => t(MENU.arenas[arenaIdx()]!.name),
      tag: () => (MENU.arenas[arenaIdx()]!.enabled ? '' : t('menu.soon')),
      adjust: (d) => {
        s.arena = MENU.arenas[wrap(arenaIdx(), d, MENU.arenas.length)]!.id;
        host.save();
      },
    },
    {
      label: () => t('setup.rivals'),
      value: () => String(s.rivals),
      adjust: (d) => {
        s.rivals = Math.min(MENU.rivals.max, Math.max(MENU.rivals.min, s.rivals + d));
        host.save();
      },
    },
    {
      label: () => t('setup.difficulty'),
      value: () => t(MENU.difficulties[diffIdx()]!.label),
      adjust: (d) => {
        s.difficulty = MENU.difficulties[wrap(diffIdx(), d, MENU.difficulties.length)]!.id;
        host.save();
      },
    },
    { label: () => t('menu.start'), enabled: () => MENU.arenas[arenaIdx()]!.enabled, ok: () => host.startArcade() },
  ], 'wide');
  h('div', 'm-hint', el, `${t('menu.hint.nav')}   ${t('menu.hint.adjust')}`);
  return {
    id: 'setup',
    el,
    enter: () => {
      const d = vehicleDef(s.vehicle);
      who.innerHTML = '';
      h('b', '', who, t(d.driver));
      h('i', '', who, `  ·  ${t(d.name)}`);
      rows.setFocus(3);
    },
    action: (a: Action) => {
      if (a === 'up') rows.move(-1);
      else if (a === 'down') rows.move(1);
      else if (a === 'left') rows.adjust(-1);
      else if (a === 'right') rows.adjust(1);
      else if (a === 'ok') rows.ok();
    },
  };
}
