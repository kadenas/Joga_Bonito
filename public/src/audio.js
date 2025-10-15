// Audio WebAudio sintetizado y desbloqueo en primera interacción
let ctx = null, enabled = true, unlocked = false;

export function setEnabled(on){ enabled = !!on; }
export function isEnabled(){ return enabled; }

export function initOnFirstInteraction(){
  if (unlocked) return;
  const resume = () => {
    try{
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      unlocked = true;
      window.removeEventListener('pointerdown', resume, {capture:true});
      window.removeEventListener('keydown', resume, {capture:true});
    }catch{}
  };
  window.addEventListener('pointerdown', resume, {capture:true, once:true});
  window.addEventListener('keydown', resume, {capture:true, once:true});
}

function beep(freq=440, dur=0.08, type='square', gain=0.04){
  if (!enabled) return;
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t+0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

export function playTap(){
  // variación pequeña para que no canse
  const f = 420 + Math.random()*60;
  beep(f, 0.07, 'square', 0.05);
}
export function playUpgrade(){
  beep(320, 0.06, 'sawtooth', 0.05);
  setTimeout(()=>beep(480, 0.06, 'sawtooth', 0.04), 50);
}
