let ctx=null, enabled=true, unlocked=false;
export function initOnFirstInteraction(){ if(unlocked) return;
  const resume=()=>{ try{ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended') ctx.resume(); unlocked=true; }catch{} };
  window.addEventListener('pointerdown',resume,{once:true,capture:true});
  window.addEventListener('keydown',resume,{once:true,capture:true});
}
export function setEnabled(on){ enabled=!!on; }
export function isEnabled(){ return !!enabled; }
function beep(freq=440,dur=0.08,type='square',gain=0.04){
  if(!enabled) return; if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
  const t=ctx.currentTime, osc=ctx.createOscillator(), g=ctx.createGain();
  osc.type=type; osc.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(gain,t+0.006); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  osc.connect(g).connect(ctx.destination); osc.start(t); osc.stop(t+dur+0.05);
}
export function playTap(){ const f=420+Math.random()*60; beep(f,0.07,'square',0.05); }
export function playUpgrade(){ beep(360,0.06,'sawtooth',0.05); setTimeout(()=>beep(520,0.06,'sawtooth',0.04),50); }
export function playAchievement(){ beep(520,0.07,'triangle',0.07); setTimeout(()=>beep(780,0.07,'triangle',0.07),60); setTimeout(()=>beep(1040,0.09,'triangle',0.07),120); }
export function playShip(){ beep(300,0.08,'sine',0.06); setTimeout(()=>beep(600,0.06,'sine',0.05),70); }
export function playFlash(){ beep(900,0.03,'square',0.05); }
