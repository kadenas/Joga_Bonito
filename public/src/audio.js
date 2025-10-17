let ctx=null, enabled=true, unlocked=false, tideNodes=null;

export function initOnFirstInteraction(){ if(unlocked) return;
  const resume=()=>{ try{ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended') ctx.resume(); unlocked=true; }catch{} };
  window.addEventListener('pointerdown',resume,{once:true,capture:true});
  window.addEventListener('keydown',resume,{once:true,capture:true});
}
export function setEnabled(on){ enabled=!!on; if(!enabled) stopTide(); }
export function isEnabled(){ return !!enabled; }
function ensureCtx(){ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)(); return ctx; }
function beep(freq=440,dur=0.08,type='square',gain=0.04){
  if(!enabled) return; const ac=ensureCtx();
  const t=ac.currentTime, osc=ac.createOscillator(), g=ac.createGain();
  osc.type=type; osc.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.connect(g).connect(ac.destination); osc.start(t); osc.stop(t+dur+0.05);
}
export function playTap(){ const f=420+Math.random()*60; beep(f,0.07,'square',0.05); }
export function playUpgrade(){ beep(360,0.06,'sawtooth',0.05); setTimeout(()=>beep(520,0.06,'sawtooth',0.04),50); }
export function playAchievement(){ beep(520,0.07,'triangle',0.07); setTimeout(()=>beep(780,0.07,'triangle',0.07),60); setTimeout(()=>beep(1040,0.09,'triangle',0.07),120); }
export function playShip(){ beep(300,0.08,'sine',0.06); setTimeout(()=>beep(600,0.06,'sine',0.05),70); }
export function playFlash(){ beep(900,0.03,'square',0.05); }

export function startTide(){
  if(!enabled) return; const ac=ensureCtx(); if(tideNodes) return;
  const t=ac.currentTime;
  const o1=ac.createOscillator(); o1.type='sine'; o1.frequency.setValueAtTime(0.6,t);
  const o2=ac.createOscillator(); o2.type='triangle'; o2.frequency.setValueAtTime(2.2,t);
  const g=ac.createGain(); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.08,t+0.35);
  o1.connect(g); o2.connect(g); g.connect(ac.destination);
  o1.start(t); o2.start(t);
  tideNodes={o1,o2,g};
}
export function stopTide(){
  if(!tideNodes || !ctx) return;
  const t=ctx.currentTime;
  tideNodes.g.gain.cancelScheduledValues(t);
  tideNodes.g.gain.setValueAtTime(tideNodes.g.gain.value,t);
  tideNodes.g.gain.linearRampToValueAtTime(0,t+0.3);
  setTimeout(()=>{
    try{ tideNodes.o1.stop(); tideNodes.o2.stop(); }catch{}
    tideNodes=null;
  },350);
}
