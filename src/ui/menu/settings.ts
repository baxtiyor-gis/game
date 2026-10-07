import { t } from '../../core/data';
import { h } from '../dom';
import { MENU, type Action } from './config';
import { Rows } from './rows';
import { backButton, type Host, type Screen } from './screen';

/** Sozlamalar: ovoz balandligi, Retro (PS1) grafika, Hammasini ochish. */
export function settingsScreen(host: Host): Screen {
  const el = h('section', 'm-screen');
  backButton(el, host);
  h('h2', 'm-title', el, t('settings.title'));
  h('div', 'm-stripe', el);
  const s = host.settings;
  const onOff = (v: boolean): string => t(v ? 'settings.on' : 'settings.off');
  const rows = new Rows(el, [
    {
      label: () => t('settings.volume'),
      value: () => `${Math.round(s.volume * 100)}%`,
      adjust: (d) => {
        s.volume = Math.min(1, Math.max(0, Math.round((s.volume + d * MENU.volume.step) * 100) / 100));
        host.save();
      },
      ok: () => {
        s.volume = s.volume >= 1 ? 0 : Math.min(1, Math.round((s.volume + MENU.volume.step) * 100) / 100);
        host.save();
      },
    },
    {
      label: () => t('settings.retro'),
      value: () => onOff(s.retro),
      adjust: () => {
        s.retro = !s.retro;
        host.save();
      },
    },
    {
      label: () => t('settings.unlock'),
      value: () => onOff(s.unlockAll),
      adjust: () => {
        s.unlockAll = !s.unlockAll;
        host.save();
      },
    },
    { label: () => t('menu.back'), ok: () => host.back() },
  ], 'wide');
  h('div', 'm-hint', el, `${t('menu.hint.nav')}   ${t('menu.hint.adjust')}`);
  return {
    id: 'settings',
    el,
    enter: () => rows.setFocus(0),
    action: (a: Action) => {
      if (a === 'up') rows.move(-1);
      else if (a === 'down') rows.move(1);
      else if (a === 'left') rows.adjust(-1);
      else if (a === 'right') rows.adjust(1);
      else if (a === 'ok') rows.ok();
    },
  };
}
