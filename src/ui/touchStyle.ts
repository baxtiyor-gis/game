// Sensorli boshqaruv CSS: 70-yillar funk arkada uslubi (HUD bilan bir palitra). --u: tugma birligi, --op: shaffoflik.
export const TOUCH_CSS = `
.tc-root{position:absolute;inset:0;z-index:5;display:none;touch-action:none;user-select:none;-webkit-user-select:none;
  -webkit-touch-callout:none;-webkit-tap-highlight-color:transparent;font-family:Impact,'Arial Black',sans-serif;
  color:#ffd23f;text-transform:uppercase;letter-spacing:.04em;text-shadow:1px 1px 0 #000;
  --u:clamp(50px,min(14vw,17vh),84px);--g:calc(env(safe-area-inset-bottom) + clamp(6px,2vh,16px));
  --e:calc(env(safe-area-inset-right) + clamp(8px,2vw,18px))}
.tc-root.show{display:block;pointer-events:auto}
.tc-root *{box-sizing:border-box;touch-action:none}
.tc-zone{position:absolute;inset:0}
.tc-base,.tc-thumb{position:absolute;left:0;top:0;border-radius:50%;pointer-events:none;display:none;opacity:var(--op)}
.tc-base{width:calc(var(--r)*2);height:calc(var(--r)*2);margin:calc(var(--r)*-1) 0 0 calc(var(--r)*-1);
  border:3px solid #ffd23f;background:radial-gradient(circle,rgba(255,138,31,.12),rgba(0,0,0,.4));box-shadow:3px 3px 0 #000}
.tc-thumb{width:calc(var(--r)*.85);height:calc(var(--r)*.85);margin:calc(var(--r)*-.425) 0 0 calc(var(--r)*-.425);
  border:3px solid #fff;background:linear-gradient(135deg,#ffd23f,#ff8a1f 60%,#e5252a);box-shadow:3px 3px 0 #000}
.tc-root.stick .tc-base,.tc-root.stick .tc-thumb{display:block}
.tc-btn{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;
  width:calc(var(--u)*var(--s,1));height:calc(var(--u)*var(--s,1));border-radius:50%;padding:0;margin:0;cursor:pointer;
  color:#ffd23f;font:inherit;border:clamp(2px,.6vw,3px) solid #ffd23f;box-shadow:3px 3px 0 #000;opacity:var(--op);
  background:linear-gradient(135deg,rgba(0,0,0,.72),rgba(70,12,0,.62))}
.tc-btn svg{width:100%;height:100%;filter:drop-shadow(1px 1px 0 #000)}
.tc-btn .ico{display:flex;width:46%;height:46%;font-size:1em}
.tc-btn small{font-size:calc(var(--u)*var(--s,1)*.14);letter-spacing:0;line-height:1;margin-top:2px;pointer-events:none}
.tc-btn.down,.tc-btn.on{background:linear-gradient(135deg,#ffd23f,#ff8a1f);color:#1a0a00;border-color:#fff;text-shadow:none;opacity:1}
.tc-btn.down svg,.tc-btn.on svg{filter:none}
.tc-pad{position:absolute;right:var(--e);bottom:var(--g);width:calc(var(--u)*3.5);height:calc(var(--u)*2.6)}
.tc-pad .tc-btn{position:absolute}
.tc-mg{--s:1.4;right:0;bottom:0;border-color:#e5252a}
.tc-weapon{--s:1.1;right:calc(var(--u)*1.5);bottom:calc(var(--u)*.1)}
.tc-special{--s:1;right:calc(var(--u)*.2);bottom:calc(var(--u)*1.55)}
.tc-drift{--s:1;right:calc(var(--u)*1.4);bottom:calc(var(--u)*1.35)}
.tc-cycle{--s:.8;right:calc(var(--u)*2.65);bottom:calc(var(--u)*.2)}
.tc-combo-btn{--s:.8;right:calc(var(--u)*2.65);bottom:calc(var(--u)*1.15)}
.tc-pause{--s:.65;position:absolute;top:calc(env(safe-area-inset-top) + clamp(6px,2vw,16px));
  right:calc(var(--e) + clamp(84px,24vw,160px) + clamp(6px,2vw,12px))}
.tc-panel{position:absolute;display:none;gap:calc(var(--u)*.12);right:calc(var(--e) + var(--u)*3.7);bottom:var(--g)}
.tc-panel.open{display:flex}
.tc-act{position:static;width:calc(var(--u)*1.5);height:calc(var(--u)*1.05);border-radius:12px;gap:2px}
.tc-act b{font-weight:400;font-size:calc(var(--u)*.26);line-height:1;color:#fff}
.tc-act small{font-size:calc(var(--u)*.2);margin:0;text-align:center;padding:0 2px}
.tc-act.down b{color:#1a0a00}
.tc-hint{position:absolute;left:50%;top:30%;transform:translateX(-50%);
  display:none;max-width:86vw;text-align:center;font-size:clamp(11px,3.4vw,16px);padding:6px 12px;pointer-events:none;
  border:2px solid #ff8a1f;background:rgba(0,0,0,.72);box-shadow:3px 3px 0 #000}
.tc-hint.show{display:block}
@media (orientation:portrait){
  .tc-panel{right:var(--e);bottom:calc(var(--g) + var(--u)*2.75)}
  .tc-pause{right:var(--e);top:calc(env(safe-area-inset-top) + clamp(6px,2vw,16px) + clamp(84px,24vw,160px) + clamp(6px,2vw,12px))}
}
`;
