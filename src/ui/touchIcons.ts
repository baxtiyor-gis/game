// Sensorli tugmalar uchun qo'shimcha SVG ikonkalar (pulemyot/qurol/maxsus ikonkalari icons.ts da). currentColor.
const svg = (d: string): string =>
  `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" fill-rule="evenodd" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;

export const TOUCH_ICONS = {
  pause: svg('M6 4h4v16H6zM14 4h4v16h-4z'),
  // Drift: ikki egri iz
  drift: svg('M4 20c2-6 5-9 9-11l1.5 2.6C11 13 8.600 15.400 7.200 20zM11 20c1.400-3.600 3.400-6 6-7.400l1.500 2.600C16.600 16.200 15.200 17.800 14.200 20z'),
  // Qurol almashtirish: aylana o'q
  cycle: svg('M12 4a8 8 0 0 1 7.400 5H22l-3.500 4.500L15 9h2.500A5.500 5.500 0 0 0 6.600 10.500L4.300 9.500A8 8 0 0 1 12 4zM12 20a8 8 0 0 1-7.400-5H2l3.500-4.500L9 15H6.500a5.500 5.500 0 0 0 10.900-1.500l2.300 1A8 8 0 0 1 12 20z'),
  // Kombo: yulduz
  combo: svg('M12 2l2.900 6.200 6.800.8-5 4.700 1.300 6.700L12 17l-6 3.400 1.300-6.700-5-4.700 6.800-.8z'),
} as const;

export type TouchIconId = keyof typeof TOUCH_ICONS;
