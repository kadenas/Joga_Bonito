let audioContext;
let masterGain;
let enabled = true;

function ensureContext() {
  if (!audioContext) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioContext = new Ctx();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(audioContext.destination);
  }
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playTone({ duration = 0.12, frequency = 440, type = 'square' } = {}) {
  if (!enabled) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  const now = ctx.currentTime;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(1, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

export function playTap() {
  const base = 380 + Math.random() * 60;
  playTone({ frequency: base, duration: 0.1, type: 'sawtooth' });
}

export function playUpgrade() {
  const base = 520 + Math.random() * 80;
  playTone({ frequency: base, duration: 0.18, type: 'triangle' });
}

export function setEnabled(value) {
  enabled = value;
  if (enabled) {
    ensureContext();
  }
  if (masterGain) {
    masterGain.gain.value = enabled ? 0.15 : 0;
  }
}

export function isEnabled() {
  return enabled;
}

export function unlockOnInteraction(element) {
  if (!element) return;
  const handler = () => {
    ensureContext();
    element.removeEventListener('pointerdown', handler);
    element.removeEventListener('keydown', handler);
  };
  element.addEventListener('pointerdown', handler, { passive: true });
  element.addEventListener('keydown', handler);
}
