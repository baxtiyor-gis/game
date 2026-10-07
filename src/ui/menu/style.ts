// Menyu CSS (1): umumiy qatlamlar, logo, qatorlar, sozlash/pauza/natija. 70-yillar funk arkada uslubi (HUD bilan bir palitra).
export const MENU_CSS = `
.m-root{position:absolute;inset:0;z-index:10;display:none;overflow:hidden;font-family:Impact,'Arial Black',sans-serif;color:#ffd23f;
  text-transform:uppercase;letter-spacing:.04em;text-shadow:2px 2px 0 #000;user-select:none;-webkit-user-select:none;
  padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}
.m-root *{box-sizing:border-box}
.m-root.open{display:block;pointer-events:auto}
.m-root.open[data-screen=result]~.hud,#ui:has(.m-root.open[data-screen=result]) .hud{visibility:hidden}
.m-bg{position:absolute;inset:0;pointer-events:none;transition:opacity .4s}
.m-scrim{background:linear-gradient(180deg,rgba(18,6,0,.25),rgba(18,6,0,.7))}
.m-sunset{opacity:0;background:linear-gradient(180deg,#14041f 0%,#4a0f48 34%,#b8281f 62%,#ff8a1f 80%,#ffd23f 100%)}
.m-sun{position:absolute;left:50%;bottom:18%;width:min(72vw,560px);aspect-ratio:1;border-radius:50%;transform:translateX(-50%);opacity:0;
  background:linear-gradient(180deg,#ffd23f,#ff8a1f 55%,#e5252a);transition:opacity .4s;
  -webkit-mask-image:linear-gradient(#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 70%,#000 70% 78%,transparent 78% 85%,#000 85%);
  mask-image:linear-gradient(#000 0 52%,transparent 52% 56%,#000 56% 64%,transparent 64% 70%,#000 70% 78%,transparent 78% 85%,#000 85%)}
.m-ground{position:absolute;left:0;right:0;bottom:0;height:20%;opacity:0;transition:opacity .4s;
  background:repeating-linear-gradient(90deg,rgba(255,210,63,.18) 0 2px,transparent 2px 48px),linear-gradient(180deg,#2a0a00,#0d0300)}
.m-root[data-screen=select] .m-sunset,.m-root[data-screen=setup] .m-sunset,.m-root[data-screen=settings] .m-sunset,
.m-root[data-screen=controls] .m-sunset,.m-root[data-screen=select] .m-sun,.m-root[data-screen=setup] .m-sun,
.m-root[data-screen=settings] .m-sun,.m-root[data-screen=controls] .m-sun,.m-root[data-screen=select] .m-ground,
.m-root[data-screen=setup] .m-ground,.m-root[data-screen=settings] .m-ground,.m-root[data-screen=controls] .m-ground{opacity:1}
.m-root[data-screen=select] .m-sun,.m-root[data-screen=controls] .m-sun{opacity:.35}
.m-root[data-screen=pause] .m-scrim,.m-root[data-screen=result] .m-scrim{background:rgba(10,3,0,.72)}
.m-screen{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;padding:clamp(10px,3vh,28px) clamp(10px,3vw,32px) clamp(26px,5vh,44px)}
.m-screen.show{display:flex;animation:m-in .35s ease-out both}
@keyframes m-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.m-logo{margin:clamp(8px,6vh,60px) 0 0;font-size:clamp(40px,min(13vw,15vh),128px);line-height:.95;text-align:center;font-weight:400;transform:skewX(-8deg);
  background:linear-gradient(180deg,#fff2a0 0%,#ffd23f 40%,#ff8a1f 72%,#e5252a 100%);-webkit-background-clip:text;background-clip:text;
  color:transparent;text-shadow:none;filter:drop-shadow(3px 3px 0 #000) drop-shadow(7px 7px 0 #b3120f);animation:m-pop .7s cubic-bezier(.2,1.4,.4,1) both}
@keyframes m-pop{from{transform:skewX(-8deg) scale(.6);opacity:0}to{transform:skewX(-8deg) scale(1);opacity:1}}
.m-tagline{margin-top:clamp(4px,1.4vh,14px);font-size:clamp(11px,2.6vw,20px);color:#ff8a1f;letter-spacing:.3em}
.m-stripe{width:min(88vw,520px);height:clamp(6px,1.4vh,12px);margin:clamp(8px,2vh,18px) 0;transform:skewX(-20deg);
  background:linear-gradient(90deg,#ffd23f 0 34%,#ff8a1f 34% 67%,#e5252a 67%);box-shadow:3px 3px 0 #000}
.m-title{margin:0;font-weight:400;font-size:clamp(20px,min(5.4vw,7vh),46px);color:#ffd23f;text-shadow:3px 3px 0 #000,-1px -1px 0 #e5252a;text-align:center}
.m-sub{font-size:clamp(11px,2.6vw,18px);color:#ff8a1f;text-align:center}
.m-rows{display:flex;flex-direction:column;gap:clamp(5px,1.4vh,12px);width:min(92vw,460px);margin-top:clamp(6px,2vh,20px)}
.m-rows.wide{width:min(94vw,600px)}
.m-row{position:relative;display:flex;align-items:center;gap:10px;padding:clamp(7px,1.6vh,13px) clamp(12px,3vw,20px);cursor:pointer;
  font-size:clamp(16px,min(4.4vw,4.6vh),28px);line-height:1.05;color:#ffd23f;transform:skewX(-9deg);border:3px solid #ffd23f;box-shadow:4px 4px 0 #000;
  background:linear-gradient(135deg,rgba(0,0,0,.78),rgba(70,12,0,.7));transition:transform .12s,background .12s}
.m-row .m-label{flex:1}
.m-row.sel{color:#1a0a00;text-shadow:none;border-color:#fff;transform:skewX(-9deg) translateX(clamp(6px,1.6vw,14px));
  background:linear-gradient(90deg,#ffd23f,#ff8a1f)}
.m-row.sel::before{content:'';position:absolute;left:-.9em;top:50%;border:.38em solid transparent;border-left:.62em solid #ffd23f;transform:translateY(-50%);filter:drop-shadow(2px 2px 0 #000)}
.m-row.off{opacity:.55;cursor:default;border-color:#7a5a3c;color:#b9863a}
.m-topback{position:absolute;left:clamp(8px,2vw,20px);top:clamp(8px,2vw,20px);padding:4px 14px;font-size:clamp(11px,2.6vw,16px);z-index:2;width:auto}
.m-loading{display:none;position:absolute;inset:0;align-items:center;justify-content:center;font-size:clamp(20px,6vw,44px);
  background:linear-gradient(180deg,rgba(18,6,0,.85),rgba(70,12,0,.85));animation:m-blink 1s steps(2,jump-none) infinite}
.m-root.loading .m-loading{display:flex}
@keyframes m-blink{50%{opacity:.45}}
.m-tag{font-size:.5em;padding:.15em .6em;color:#fff;background:#e5252a;border:2px solid #000;box-shadow:2px 2px 0 #000;white-space:nowrap}
.m-tag:empty{display:none}
.m-val{display:flex;align-items:center;gap:.5em}
.m-vtext{min-width:4.5em;text-align:center}
.m-arrow{font-size:.7em;padding:0 .3em;opacity:.8;cursor:pointer}
.m-arrow:hover{opacity:1;color:#fff}
.m-hint{position:absolute;left:0;right:0;bottom:clamp(6px,2vh,18px);text-align:center;font-size:clamp(9px,2.2vw,14px);color:#b9863a;letter-spacing:.12em;padding:0 8px}
.m-who{margin-top:clamp(4px,1vh,10px);font-size:clamp(13px,3.2vw,22px);color:#fff;text-align:center}
.m-who b{font-weight:400;color:#ffd23f}
.m-who i{font-style:normal;color:#ff8a1f}
.m-end{font-size:clamp(34px,11vw,96px);margin:clamp(8px,5vh,48px) 0 0;line-height:1;font-weight:400;text-align:center;
  text-shadow:4px 4px 0 #000,-2px -2px 0 #e5252a;transform:skewX(-8deg);color:#ffd23f}
.m-end.lose{color:#ff5a3a}
.m-stats{display:grid;grid-template-columns:1fr 1fr;gap:clamp(6px,1.6vw,12px);width:min(92vw,460px);margin-top:clamp(8px,2.4vh,22px)}
.m-stat{padding:clamp(5px,1.4vw,10px) clamp(8px,2vw,14px);border:3px solid #ff8a1f;background:rgba(0,0,0,.7);box-shadow:3px 3px 0 #000;transform:skewX(-6deg)}
.m-stat span{display:block;font-size:clamp(9px,2.2vw,13px);color:#ff8a1f}
.m-stat b{display:block;font-weight:400;font-size:clamp(20px,5.4vw,38px);color:#ffd23f}
@media (pointer:coarse){.m-root{touch-action:manipulation;-webkit-tap-highlight-color:transparent}.m-arrow{padding:.25em .7em}.m-topback{padding:8px 16px}}
@media (max-width:760px){.m-topback{position:static;align-self:flex-start;margin-bottom:2px}}
@media (max-height:520px){.m-logo{margin-top:6px;font-size:clamp(34px,9vh,70px)}.m-row{padding:5px 14px;font-size:17px}.m-rows{gap:5px}.m-tagline{display:none}}
@media (prefers-reduced-motion:reduce){.m-root *{animation:none!important;transition:none!important}}
`;
