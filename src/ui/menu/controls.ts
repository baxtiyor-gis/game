import { combos, controls, t } from '../../core/data';
import { h } from '../dom';
import { MENU, type Action } from './config';
import { backButton, type Host, type Screen } from './screen';

const keyLabel = (code: string): string => MENU.keyLabels[code] ?? code.replace(/^(Key|Digit)/, '');

function caps(parent: HTMLElement, labels: string[], cls = ''): void {
  const box = h('span', 'm-keys', parent);
  for (const l of labels) h('span', `m-key ${cls}`, box, l);
}

/** Boshqaruv: tugmalar jadvali (klaviatura + gamepad) va kombo ro'yxati (o'qlar bilan). */
export function controlsScreen(host: Host): Screen {
  const el = h('section', 'm-screen');
  backButton(el, host);
  h('h2', 'm-title', el, t('controls.title'));
  h('div', 'm-stripe', el);
  const wrap = h('div', 'm-ctl', el);

  const kb = h('div', 'm-box', wrap);
  h('h3', '', kb, `${t('controls.keyboard')} / ${t('controls.gamepad')}`);
  const kbMap = controls.keyboard as Record<string, string[]>;
  for (const r of MENU.controlRows) {
    const row = h('div', 'm-kv', kb);
    h('span', '', row, t(r.label));
    const right = h('span', 'm-keys', row);
    const codes = [...(r.codes ?? []), ...(r.kb ?? []).flatMap((k) => kbMap[k] ?? [])];
    caps(right, [...new Set(codes)].map(keyLabel));
    if (r.padText) h('span', 'm-key pad', right, t(r.padText));
    caps(right, (r.pad ?? []).map((b) => MENU.padLabels[String(b)] ?? `#${b}`), 'pad');
  }

  const cb = h('div', 'm-box', wrap);
  h('h3', '', cb, t('controls.combos'));
  h('p', 'm-text', cb, t('controls.comboHint'));
  const mg = keyLabel(kbMap.mg?.[0] ?? 'Space');
  for (const c of combos) {
    const row = h('div', 'm-combo', cb);
    const name = h('span', '', row, t(`combo.${c.id}`));
    h('small', '', name, t(`weapon.${c.weapon}`));
    const right = h('span', 'm-keys', row);
    for (const d of c.input) h('span', 'm-key arr', right, MENU.arrows[d] ?? d);
    h('span', 'm-key', right, mg);
  }
  h('div', 'm-hint', el, t('menu.hint.nav'));
  return {
    id: 'controls',
    el,
    enter: () => {
      wrap.scrollTop = 0;
    },
    action: (a: Action) => {
      if (a === 'ok') host.back();
      else if (a === 'up') wrap.scrollBy({ top: -80, behavior: 'smooth' });
      else if (a === 'down') wrap.scrollBy({ top: 80, behavior: 'smooth' });
    },
  };
}
