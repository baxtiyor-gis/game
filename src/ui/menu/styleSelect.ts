// Menyu CSS (2): mashina tanlash va boshqaruv ekranlari.
export const SELECT_CSS = `
.m-sel{flex:1;display:grid;grid-template-columns:minmax(250px,37%) 1fr;grid-template-rows:auto 1fr;gap:clamp(6px,1.6vw,16px);width:100%;min-height:0}
.m-sel .m-head{grid-column:1/-1;display:flex;flex-direction:column;align-items:center}
.m-sel .m-head .m-stripe{margin:clamp(4px,1vh,10px) 0 0}
.m-cards{overflow-x:hidden;overflow-y:auto;min-height:0;padding:4px 8px 4px 4px;scrollbar-width:thin;scrollbar-color:#ff8a1f #1a0a00}
.m-fh{display:flex;align-items:center;gap:8px;margin:6px 0 4px;font-size:clamp(11px,2.4vw,15px);color:var(--fc);letter-spacing:.14em}
.m-fh::after{content:'';flex:1;height:3px;background:var(--fc);opacity:.7}
.m-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.m-card{position:relative;padding:5px 22px 5px 12px;cursor:pointer;border:2px solid #000;background:rgba(10,3,0,.72);
  border-left:7px solid var(--fc);box-shadow:3px 3px 0 #000;transform:skewX(-6deg);transition:transform .12s}
.m-card b{display:block;font-weight:400;font-size:clamp(11px,2.4vw,16px);color:#ffd23f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-card i{display:block;font-style:normal;font-size:clamp(8px,1.8vw,11px);color:#ff8a1f;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.m-card .dot{position:absolute;right:6px;top:6px;width:10px;height:10px;border-radius:50%;background:var(--vc);border:2px solid #000}
.m-card.sel{background:linear-gradient(90deg,#ffd23f,#ff8a1f);border-color:#fff;transform:skewX(-6deg) scale(1.05);z-index:1}
.m-card.sel b,.m-card.sel i{color:#1a0a00;text-shadow:none}
.m-card.lock{opacity:.6}
.m-card.lock .dot{display:none}
.m-card svg{display:none;position:absolute;right:5px;top:5px;width:14px;height:14px;fill:#ffd23f;filter:drop-shadow(1px 1px 0 #000)}
.m-card.lock svg{display:block}
.m-card.sel svg{fill:#1a0a00;filter:none}
.m-detail{display:flex;flex-direction:column;min-height:0;min-width:0;gap:clamp(4px,1vw,10px)}
.m-prev{position:relative;flex:0 0 clamp(120px,36%,320px);border:3px solid #ffd23f;box-shadow:4px 4px 0 #000;overflow:hidden;
  background:radial-gradient(ellipse at 50% 110%,rgba(255,138,31,.55),rgba(20,4,31,.85) 70%)}
.m-prev canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.m-lockbox{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  background:rgba(10,3,0,.72);text-align:center;padding:10px}
.m-lockbox.show{display:flex}
.m-lockbox b{font-weight:400;font-size:clamp(20px,5vw,40px);color:#e5252a;text-shadow:3px 3px 0 #000}
.m-lockbox span{font-size:clamp(9px,2.2vw,14px);color:#ffd23f}
.m-lockbox.shake{animation:m-shake .3s}
@keyframes m-shake{25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}
.m-info{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:clamp(6px,1.6vw,16px);align-content:start;
  padding:clamp(6px,1.4vw,12px);background:linear-gradient(135deg,rgba(0,0,0,.78),rgba(70,12,0,.62));border:3px solid #ffd23f;box-shadow:4px 4px 0 #000;
  scrollbar-width:thin;scrollbar-color:#ff8a1f #1a0a00}
.m-driver{font-size:clamp(18px,min(3.6vw,5vh),36px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;color:#ffd23f}
.m-vname{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:clamp(11px,2.6vw,18px);color:#ff8a1f;margin:2px 0 4px}
.m-badge{display:inline-block;padding:1px 10px;font-size:clamp(9px,2vw,13px);color:#120600;background:var(--fc);text-shadow:none;transform:skewX(-12deg)}
.m-bar{display:grid;grid-template-columns:9em 1fr 1em;white-space:nowrap;align-items:center;gap:8px;margin:3px 0;font-size:clamp(10px,2.3vw,14px)}
.m-track{position:relative;height:clamp(10px,2.2vw,15px);background:#2a1000;border:2px solid #000;transform:skewX(-14deg);overflow:hidden}
.m-fill{position:absolute;left:0;top:0;bottom:0;width:calc(var(--v,0) * 100%);transition:width .55s cubic-bezier(.2,.9,.3,1);
  background:linear-gradient(90deg,#ffd23f,#ff8a1f 65%,#e5252a)}
.m-track::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 calc(20% - 3px),#120600 calc(20% - 3px) 20%)}
.m-bar b{font-weight:400;color:#fff}
.m-nums{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}
.m-num{padding:4px 6px;background:rgba(0,0,0,.55);border:2px solid #7a5a3c;text-align:center}
.m-num span{display:block;font-size:clamp(8px,1.8vw,11px);color:#ff8a1f}
.m-num b{display:block;font-weight:400;font-size:clamp(12px,3vw,20px);color:#ffd23f}
.m-sec{font-size:clamp(9px,2vw,12px);color:#ff8a1f;letter-spacing:.2em;margin:0 0 2px}
.m-spname{font-size:clamp(14px,3.4vw,22px);color:#fff}
.m-text{font-family:Arial,Helvetica,sans-serif;text-transform:none;letter-spacing:0;text-shadow:none;color:#f3dfb8;font-size:clamp(11px,2.5vw,15px);line-height:1.35;margin:2px 0 8px}
@media (max-width:760px){
  .m-sel{grid-template-columns:1fr;grid-template-rows:auto auto 1fr}
  .m-cards{order:2;display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;padding:4px 2px 8px}
  .m-fh{display:none}
  .m-grid{display:flex;gap:6px}
  .m-card{flex:0 0 112px}
  .m-detail{order:3}
  .m-info{grid-template-columns:1fr}
  .m-prev{flex-basis:clamp(120px,26vh,220px)}
}
.m-confirm{width:100%;margin:0;flex:none}
.m-confirm .m-row{font-size:clamp(14px,3.4vw,22px);padding:clamp(5px,1.2vh,10px) 16px;justify-content:center}
.m-ctl{width:min(96vw,980px);flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:1fr 1fr;gap:clamp(8px,2vw,20px);align-content:start;margin-top:8px;
  scrollbar-width:thin;scrollbar-color:#ff8a1f #1a0a00}
.m-box{padding:clamp(6px,1.6vw,12px);background:linear-gradient(135deg,rgba(0,0,0,.8),rgba(70,12,0,.65));border:3px solid #ffd23f;box-shadow:4px 4px 0 #000}
.m-box h3{margin:0 0 6px;font-weight:400;font-size:clamp(13px,3vw,20px);color:#ff8a1f}
.m-kv{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:3px 0;border-bottom:1px solid rgba(255,210,63,.18);font-size:clamp(10px,2.4vw,15px)}
.m-keys{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end}
.m-key{min-width:1.9em;padding:1px 7px;text-align:center;color:#120600;text-shadow:none;background:#ffd23f;border:2px solid #000;border-bottom-width:4px;border-radius:4px;font-size:.95em}
.m-key.pad{background:#4fc3ff}
.m-key.arr{background:#ff8a1f}
.m-combo{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;padding:3px 0;border-bottom:1px solid rgba(255,210,63,.18);font-size:clamp(10px,2.3vw,14px)}
.m-combo small{display:block;color:#ff8a1f;font-size:.75em}
.m-back{margin-top:8px;width:min(92vw,260px)}
@media (max-width:760px){.m-ctl{grid-template-columns:1fr}}
`;
