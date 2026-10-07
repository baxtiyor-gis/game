// HUD CSS: 70-yillar funk arkada uslubi. Bitta <style> sifatida qo'shiladi.
export const HUD_CSS = `
.hud{position:absolute;inset:0;overflow:hidden;font-family:Impact,'Arial Black',sans-serif;color:#ffd23f;
  text-transform:uppercase;letter-spacing:.04em;text-shadow:2px 2px 0 #000;user-select:none;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.hud *{box-sizing:border-box}
.hud-panel{position:absolute;background:linear-gradient(135deg,rgba(0,0,0,.72),rgba(70,12,0,.62));
  border:clamp(2px,.6vw,3px) solid #ffd23f;box-shadow:4px 4px 0 #000;padding:clamp(4px,1.2vw,8px)}
.hud-panel::before{content:'';position:absolute;left:0;right:0;top:0;height:clamp(3px,.9vw,6px);
  background:linear-gradient(90deg,#ffd23f 0 34%,#ff8a1f 34% 67%,#e5252a 67%)}
.hud-hp{left:clamp(6px,2vw,16px);top:clamp(6px,2vw,16px);width:clamp(120px,34vw,280px);padding-top:clamp(8px,2.2vw,14px)}
.hud-driver{font-size:clamp(13px,3.6vw,24px);line-height:1}
.hud-vehicle{font-size:clamp(8px,2.2vw,13px);color:#ff8a1f;margin-bottom:clamp(2px,.8vw,6px)}
.hud-bar{display:flex;gap:clamp(1px,.4vw,3px);--hp:#ffd23f}
.hud-seg{flex:1;height:clamp(9px,2.6vw,18px);background:#2a1000;border:1px solid #000;transform:skewX(-14deg)}
.hud-seg.on{background:var(--hp);box-shadow:inset 0 -3px 0 rgba(0,0,0,.35)}
.hud-hp.crit .hud-seg.on{animation:hud-blink .4s steps(2,jump-none) infinite}
.hud-hp.crit{border-color:#e5252a}
.hud-radar{right:clamp(6px,2vw,16px);top:clamp(6px,2vw,16px);width:clamp(84px,24vw,160px);height:clamp(84px,24vw,160px);
  padding:0;border-radius:50%;overflow:hidden}
.hud-radar::before{display:none}
.hud-radar canvas{display:block;width:100%;height:100%;image-rendering:pixelated}
.hud-top{position:absolute;left:50%;top:clamp(6px,2vw,16px);transform:translateX(-50%);text-align:center;
  font-size:clamp(11px,3vw,20px);line-height:1.05;white-space:nowrap}
.hud-top .big{display:block;font-size:clamp(16px,4.6vw,34px);color:#ff8a1f}
.hud-wpn{right:clamp(6px,2vw,16px);bottom:clamp(6px,2vw,16px);width:clamp(120px,34vw,220px);
  padding-top:clamp(8px,2.2vw,14px);display:flex;flex-direction:column;gap:clamp(2px,.7vw,5px)}
.hud-slot{display:flex;justify-content:space-between;gap:6px;padding:clamp(1px,.5vw,3px) clamp(3px,1vw,6px);
  font-size:clamp(10px,2.8vw,17px);color:#b9863a;border:2px solid transparent;background:rgba(0,0,0,.35)}
.hud-slot.sel{color:#1a0a00;background:linear-gradient(90deg,#ffd23f,#ff8a1f);border-color:#fff;text-shadow:none;
  transform:translateX(clamp(-10px,-2vw,-4px))}
.hud-slot.mg{color:#ffd23f}
.hud-msg{position:absolute;left:50%;top:30%;transform:translate(-50%,-50%);opacity:0;white-space:nowrap;
  font-size:clamp(24px,8vw,64px);color:#ffd23f;text-shadow:3px 3px 0 #000,-1px -1px 0 #e5252a}
.hud-msg.whammy{color:#ff8a1f;font-size:clamp(30px,10vw,84px);text-shadow:4px 4px 0 #000,-2px -2px 0 #e5252a}
.hud-msg.pickup{top:42%;font-size:clamp(14px,4vw,28px);color:#fff}
.hud-end{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);display:none;white-space:nowrap;
  font-size:clamp(34px,13vw,128px);color:#ffd23f;text-shadow:5px 5px 0 #000,-2px -2px 0 #e5252a;animation:hud-pop .6s ease-out}
.hud-end.show{display:block}
.hud-end.lose{color:#e5252a;text-shadow:5px 5px 0 #000,-2px -2px 0 #ffd23f}
.hud-target{position:absolute;left:0;top:0;width:0;height:0;display:none;will-change:transform;
  margin:-22px 0 0 -10px;border-left:10px solid transparent;border-right:10px solid transparent;
  border-top:18px solid #e5252a;filter:drop-shadow(2px 2px 0 #000)}
.hud-target.show{display:block}
@keyframes hud-blink{50%{background:#e5252a;opacity:.3}}
@keyframes hud-pop{from{transform:translate(-50%,-50%) scale(1.8);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
@media (prefers-reduced-motion:reduce){
  .hud-hp.crit .hud-seg.on{animation:none;background:#e5252a}
  .hud-end{animation:none}
  .hud-slot.sel{transform:none}
}
`;
