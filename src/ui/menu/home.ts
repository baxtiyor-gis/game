import { t } from '../../core/data';
import { h } from '../dom';
import { MENU, type Action, type ScreenId } from './config';
import { Rows } from './rows';
import type { Host, Screen } from './screen';

const TARGET: Record<string, ScreenId> = { arcade: 'select', settings: 'settings', controls: 'controls' };

/** Bosh sahifa: logotip + ARCADE / QUEST / VERSUS / SOZLAMALAR / BOSHQARUV. */
export function homeScreen(host: Host): Screen {
  const el = h('section', 'm-screen');
  h('h1', 'm-logo', el, t('game.title'));
  h('div', 'm-tagline', el, t('menu.tagline'));
  h('div', 'm-stripe', el);
  const rows = new Rows(
    el,
    MENU.home.map((it) => ({
      label: () => t(it.label),
      enabled: () => it.enabled,
      tag: () => (it.enabled ? '' : t('menu.soon')),
      ok: () => {
        const to = TARGET[it.id];
        if (to) host.go(to);
      },
    })),
  );
  h('div', 'm-hint', el, t('menu.hint.nav'));
  return {
    id: 'home',
    el,
    enter: () => {
      rows.setFocus(0);
    },
    action: (a: Action) => {
      if (a === 'up') rows.move(-1);
      else if (a === 'down') rows.move(1);
      else if (a === 'ok') rows.ok();
    },
  };
}
