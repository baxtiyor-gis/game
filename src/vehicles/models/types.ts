import type { Kit } from './kit';
import type { WheelStyle } from './wheels';

export interface ModelBuilder {
  wheel: WheelStyle;
  build(k: Kit): void;
}
