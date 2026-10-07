import { t } from '../../core/data';
import { h } from '../dom';
import type { Action } from './config';
import { Rows } from './rows';
import type { Host, MatchResult, Screen } from './screen';
import { formatTime } from './logic';

const navigate = (rows: Rows, a: Action): void => {
  if (a === 'up') rows.move(-1);
  else if (a === 'down') rows.move(1);
  else if (a === 'ok') rows.ok();
};

/** Pauza: Davom etish / Qayta boshlash / Bosh menyu. */
export function pauseScreen(host: Host): Screen {
  const el = h('section', 'm-screen');
  h('h2', 'm-end', el, t('menu.pause'));
  h('div', 'm-stripe', el);
  const rows = new Rows(el, [
    { label: () => t('pause.resume'), ok: () => host.resume() },
    { label: () => t('pause.restart'), ok: () => host.restart() },
    { label: () => t('pause.home'), ok: () => host.toHome() },
  ]);
  return {
    id: 'pause',
    el,
    enter: () => rows.setFocus(0),
    action: (a) => (a === 'back' ? host.resume() : navigate(rows, a)),
  };
}

/** Natija: G'alaba/Mag'lubiyat, ochko, o'ldirishlar, vaqt, Whammy + Qayta o'ynash / Boshqa mashina / Bosh menyu. */
export function resultScreen(host: Host): Screen & { show(r: MatchResult): void } {
  const el = h('section', 'm-screen');
  const title = h('h2', 'm-end', el);
  h('div', 'm-stripe', el);
  const stats = h('div', 'm-stats', el);
  const cells = ['result.score', 'result.kills', 'result.time', 'result.whammies'].map((k) => {
    const c = h('div', 'm-stat', stats);
    h('span', '', c, t(k));
    return h('b', '', c);
  });
  const rows = new Rows(el, [
    { label: () => t('result.again'), ok: () => host.restart() },
    { label: () => t('result.other'), ok: () => host.go('select') },
    { label: () => t('result.home'), ok: () => host.toHome() },
  ]);
  return {
    id: 'result',
    el,
    enter: () => rows.setFocus(0),
    action: (a) => navigate(rows, a),
    show: (r) => {
      title.textContent = t(r.won ? 'hud.win' : 'hud.lose');
      title.classList.toggle('lose', !r.won);
      const vals = [String(r.score), String(r.kills), formatTime(r.time), String(r.whammies)];
      cells.forEach((c, i) => (c.textContent = vals[i]!));
    },
  };
}
