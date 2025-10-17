let ctx=null, enabled=true, unlocked=false, tide=null;

export function initOnFirstInteraction(){ if(unlocked) return;
  const resume=()=>{ try{ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended') ctx.resume(); unlocked=true; }catch{} };
  window.addEventListener('pointerdown',resume,{once:true,capture:true});
  window.addEventListener('keydown',resume,{once:true,capture:true});
}
export function setEnabled(on){
  enabled=!!on;
  if(!enabled){ stopTide(); }
}
export function isEnabled(){ return !!enabled; }
function ensureCtx(){
  if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
  return ctx;
}
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

/* =======================
   Música de Marea Viva
   ======================= */
let lastArpStep=0;
let hatBuffer=null;

export function startTide(){
  if(!enabled) return;
  const ac=ensureCtx();
  if(ac.state==='suspended' && typeof ac.resume==='function'){
    ac.resume().catch(()=>{});
  }
  if(tide) return;

  const now=ac.currentTime;
  const master=ac.createGain();
  master.gain.setValueAtTime(0,now);
  master.gain.linearRampToValueAtTime(0.18,now+0.35);
  master.connect(ac.destination);

  // Drone grave con ligera modulación
  const drone=ac.createOscillator();
  drone.type='sine';
  drone.frequency.setValueAtTime(55,now);
  const droneGain=ac.createGain();
  droneGain.gain.setValueAtTime(0.08,now);
  drone.connect(droneGain).connect(master);
  drone.start(now);

  const lfo=ac.createOscillator();
  lfo.type='sine'; lfo.frequency.setValueAtTime(0.12,now);
  const lfoGain=ac.createGain();
  lfoGain.gain.setValueAtTime(3,now);
  lfo.connect(lfoGain).connect(drone.frequency);
  lfo.start(now);

  // Arpegio suave
  const arpOsc=ac.createOscillator();
  arpOsc.type='triangle';
  const arpGain=ac.createGain();
  arpGain.gain.setValueAtTime(0,now);
  arpOsc.connect(arpGain).connect(master);
  arpOsc.start(now);

  const tempo=92;
  const stepDur=60/tempo;
  const scale=[0,2,5,7,9]; // pentatónica mayor
  lastArpStep=0;

  const timer=setInterval(()=>{
    if(!enabled || !tide) return;
    const t=ac.currentTime+0.03;
    if(lastArpStep%2===0){
      const degree=scale[(lastArpStep/2)%scale.length|0];
      const base=220; // A3
      const freq=base*Math.pow(2,degree/12);
      arpOsc.frequency.setValueAtTime(freq,t);
      const gain=arpGain.gain;
      gain.cancelScheduledValues(t);
      gain.setValueAtTime(0,t);
      gain.linearRampToValueAtTime(0.12,t+0.02);
      gain.exponentialRampToValueAtTime(0.0001,t+stepDur*0.85);
    }

    triggerHat(ac, master, t, 0.025, 0.07);
    lastArpStep++;
  }, stepDur*1000);

  tide={ master, drone, droneGain, lfo, lfoGain, arpOsc, arpGain, timer };
}

export function stopTide(){
  if(!tide || !ctx) return;
  const ac=ctx;
  const current=tide;
  tide=null;
  if(current.timer) clearInterval(current.timer);

  const now=ac.currentTime;
  current.master.gain.cancelScheduledValues(now);
  current.master.gain.setValueAtTime(current.master.gain.value,now);
  current.master.gain.linearRampToValueAtTime(0,now+0.25);

  const stopAt=now+0.3;
  try{ current.drone.stop(stopAt); }catch{}
  try{ current.lfo.stop(stopAt); }catch{}
  try{ current.arpOsc.stop(stopAt); }catch{}

  setTimeout(()=>{
    disconnectNode(current.drone);
    disconnectNode(current.droneGain);
    disconnectNode(current.lfo);
    disconnectNode(current.lfoGain);
    disconnectNode(current.arpOsc);
    disconnectNode(current.arpGain);
    disconnectNode(current.master);
  }, 320);
}

function disconnectNode(node){
  try{ node?.disconnect(); }catch{}
}

function getHatBuffer(ac){
  if(hatBuffer) return hatBuffer;
  const len=ac.sampleRate*0.2;
  const buf=ac.createBuffer(1,len,ac.sampleRate);
  const data=buf.getChannelData(0);
  for(let i=0;i<len;i++) data[i]=Math.random()*2-1;
  hatBuffer=buf;
  return hatBuffer;
}

function triggerHat(ac, master, when, dur=0.02, vol=0.06){
  const src=ac.createBufferSource();
  src.buffer=getHatBuffer(ac);
  const hp=ac.createBiquadFilter();
  hp.type='highpass'; hp.frequency.value=6000; hp.Q.value=0.8;
  const gain=ac.createGain();
  gain.gain.setValueAtTime(vol,when);
  gain.gain.exponentialRampToValueAtTime(0.0001,when+dur);
  src.connect(hp).connect(gain).connect(master);
  src.start(when);
  src.stop(when+dur+0.05);
}
