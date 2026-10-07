import { HUD } from './hudConfig';

/** Radar canvas (immediate mode): begin() -> blip()* -> end(). O'yinchi markazda, oldi yuqoriga. */
export class Radar {
  private readonly ctx: CanvasRenderingContext2D | null;
  private readonly c: number; // markaz / radius (px)

  constructor(readonly canvas: HTMLCanvasElement) {
    canvas.width = HUD.radarPx;
    canvas.height = HUD.radarPx;
    this.ctx = canvas.getContext('2d');
    this.c = HUD.radarPx / 2;
  }

  begin(): void {
    const g = this.ctx;
    if (!g) return;
    const c = this.c;
    g.clearRect(0, 0, HUD.radarPx, HUD.radarPx);
    g.fillStyle = HUD.radarBg;
    g.beginPath();
    g.arc(c, c, c - 1, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = HUD.radarLine;
    g.globalAlpha = 0.5;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(c, c, (c - 1) / 2, 0, Math.PI * 2);
    g.moveTo(c, 2);
    g.lineTo(c, HUD.radarPx - 2);
    g.moveTo(2, c);
    g.lineTo(HUD.radarPx - 2, c);
    g.stroke();
    g.globalAlpha = 1;
  }

  /** x,y: -1..1 (o'ngga/pastga musbat). */
  blip(x: number, y: number, color: string, clamped: boolean): void {
    const g = this.ctx;
    if (!g) return;
    const r = this.c - HUD.radarBlip - 1;
    const s = clamped ? HUD.radarBlip * 0.6 : HUD.radarBlip;
    g.fillStyle = color;
    g.fillRect(Math.round(this.c + x * r - s), Math.round(this.c + y * r - s), s * 2, s * 2);
  }

  end(): void {
    const g = this.ctx;
    if (!g) return;
    const c = this.c;
    const s = HUD.radarBlip * 1.6;
    g.fillStyle = HUD.radarSelf;
    g.beginPath();
    g.moveTo(c, c - s);
    g.lineTo(c + s * 0.8, c + s);
    g.lineTo(c - s * 0.8, c + s);
    g.closePath();
    g.fill();
    g.strokeStyle = HUD.radarLine;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(c, c, c - 1, 0, Math.PI * 2);
    g.stroke();
  }
}
