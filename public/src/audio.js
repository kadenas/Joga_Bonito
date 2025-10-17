let ctx=null, enabled=true, unlocked=false;

/* ===== control global ===== */
export function initOnFirstInteraction(){ if(unlocked) return;
  const resume=()=>{ try{ if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)(); if(ctx.state==='suspended') ctx.resume(); unlocked=true; }catch{} };
  window.addEventListener('pointerdown',resume,{once:true,capture:true});
  window.addEventListener('keydown',resume,{once:true,capture:true});
}
export function setEnabled(on){ enabled=!!on; if(!enabled) stopTide(); }
export function isEnabled(){ return !!enabled; }

/* ===== beeps cortos ===== */
function beep(freq=440,dur=0.08,type='square',gain=0.04){
  if(!enabled) return; if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
  const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain();
  o.type=type; o.frequency.setValueAtTime(freq,t);
  g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(gain,t+.01);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g).connect(ctx.destination); o.start(t); o.stop(t+dur+.05);
}
export function playTap(){ const f=420+Math.random()*60; beep(f,0.07,'square',0.06); }
export function playUpgrade(){ beep(360,0.06,'sawtooth',0.06); setTimeout(()=>beep(520,0.06,'sawtooth',0.05),60); }
export function playAchievement(){ beep(520,0.07,'triangle',0.08); setTimeout(()=>beep(780,0.07,'triangle',0.08),60); setTimeout(()=>beep(1040,0.09,'triangle',0.08),120); }
export function playShip(){ beep(300,0.08,'sine',0.07); setTimeout(()=>beep(600,0.06,'sine',0.06),70); }
export function playFlash(){ beep(900,0.03,'square',0.06); }

/* ===== aviso: marea lista ===== */
export function playTideReady(){
  // pequeño arpegio ascendente
  beep(660,0.08,'triangle',0.08);
  setTimeout(()=>beep(880,0.08,'triangle',0.09),80);
  setTimeout(()=>beep(1175,0.10,'triangle',0.10),160);
}

/* ===== Música de Marea Viva (más volumen y más ritmo) ===== */
let tide=null; // {master, drone, droneGain, arpOsc, arpGain, timer}
const TIDE_VOL = 1.7;       // multiplicador global de volumen (antes ~1.0)
const TIDE_TEMPO = 120;     // BPM (antes 96) -> más animado

export function startTide(){
  if(!enabled) return;
  if(!ctx) ctx=new (window.AudioContext||window.webkitAudioContext)();
  if(tide) return;

  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(0.18*TIDE_VOL, now+0.35); // subir master
  master.connect(ctx.destination);

  // Drone
  const drone = ctx.createOscillator();
  const droneGain = ctx.createGain();
  drone.type='sine';
  drone.frequency.setValueAtTime(55, now);      // A1
  droneGain.gain.setValueAtTime(0.08*TIDE_VOL, now);
  drone.connect(droneGain).connect(master);
  drone.start(now);

  // Arpegio
  const arpOsc = ctx.createOscillator();
  const arpGain = ctx.createGain();
  arpOsc.type='triangle';
  arpGain.gain.setValueAtTime(0.0, now);
  arpOsc.connect(arpGain).connect(master);
  arpOsc.start(now);

  // Secuenciador simple
  const stepDur = 60 / TIDE_TEMPO;                 // negra
  const scale = [0,2,5,7,9];                       // pentatónica
  let step = 0;

  const timer = setInterval(()=>{
    if(!enabled || !tide) return;
    const t = ctx.currentTime + 0.02;

    // Nota cada 1/2
    if(step % 2 === 0){
      const degree = scale[(step/2) % scale.length | 0];
      const base = 440; // A4
      const freq = base * Math.pow(2, (degree-12)/12);
      arpOsc.frequency.setValueAtTime(freq, t);
      arpGain.gain.cancelScheduledValues(t);
      arpGain.gain.setValueAtTime(0, t);
      arpGain.gain.linearRampToValueAtTime(0.16*TIDE_VOL, t+0.02);    // más ataque y volumen
      arpGain.gain.exponentialRampToValueAtTime(0.0001, t+stepDur*0.8);
    }

    // “hat” con ruido en cada negra
    triggerHat(ctx, master, t, 0.02, 0.12*TIDE_VOL);

    step++;
  }, stepDur*1000);

  tide = { master, drone, droneGain, arpOsc, arpGain, timer };
}

export function stopTide(){
  if(!tide || !ctx) return;
  const t = ctx.currentTime;
  try{
    tide.master.gain.cancelScheduledValues(t);
    tide.master.gain.setValueAtTime(tide.master.gain.value, t);
    tide.master.gain.linearRampToValueAtTime(0, t+0.25);
  }catch{}
  if (tide.timer) clearInterval(tide.timer);
  try{ tide.drone.stop(); tide.arpOsc.stop(); }catch{}
  tide = null;
}

/* ===== helpers ===== */
function noiseBuffer(ctx){
  const len = ctx.sampleRate * 0.2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<len;i++) data[i] = Math.random()*2-1;
  return buf;
}
function triggerHat(ctx, master, when, dur=0.02, vol=0.1){
  const src = ctx.createBufferSource(); src.buffer = noiseBuffer(ctx);
  const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=6000; hp.Q.value=0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when+dur);
  src.connect(hp).connect(g).connect(master);
  src.start(when); src.stop(when+dur+0.02);
}
