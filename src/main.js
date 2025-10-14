import { upgradesDef, costeSiguiente, valorClick, jpsTotal, getUpgradeLevel } from './balance.js';
import { initUI } from './ui.js';
import { playTap, playUpgrade, setEnabled as setAudioEnabled } from './audio.js';
import { load, save, scheduleAutosave, registerBeforeUnload, exportGame, importGame } from './save.js';

const defaultState = {
  jornales: 0,
  jornalesPerSec: 0,
  baseClick: 1,
  upgrades: {},
  bonus: {
    active: false,
    remaining: 0,
    cooldown: 0,
    duration: 30000,
    cooldownMax: 120000,
    multiplier: 2
  },
  totals: {
    taps: 0,
    acumulados: 0
  },
  settings: {
    audio: true,
    vibrate: true,
    notation: 'abbr'
  }
};

const upgradeIds = upgradesDef.map((u) => u.id);
let state = load(defaultState, upgradeIds);

setAudioEnabled(state.settings.audio);

const ui = initUI(state, {
  onTap: handleTap,
  onBonus: activateBonus,
  onBuyUpgrade: buyUpgrade,
  onToggleAudio: (value) => {
    state.settings.audio = value;
    setAudioEnabled(value);
    save(state);
  },
  onToggleVibration: (value) => {
    state.settings.vibrate = value;
    save(state);
  },
  onExport: () => exportGame(state),
  onImport: (text) => {
    if (!text) throw new Error('No se ha pegado ningún dato');
    const imported = importGame(text, defaultState, upgradeIds);
    applyImportedState(imported);
    save(state);
  }
});

scheduleAutosave(() => state);
registerBeforeUnload(() => state);

let lastFrame = performance.now();
let tickAccumulator = 0;
const TICK_MS = 100;
let lastVisualSignature = null;

function applyImportedState(source) {
  const keepKeys = new Set(Object.keys(defaultState));
  for (const key of keepKeys) {
    if (key === 'upgrades') {
      state.upgrades = { ...source.upgrades };
    } else if (key === 'bonus' || key === 'totals' || key === 'settings') {
      state[key] = { ...source[key] };
    } else {
      state[key] = source[key];
    }
  }
  lastVisualSignature = null;
}

function handleTap() {
  const multiplier = state.bonus.active ? state.bonus.multiplier : 1;
  const gain = valorClick(state) * multiplier;
  state.jornales += gain;
  state.totals.acumulados += gain;
  state.totals.taps += 1;
  if (state.settings.audio) {
    playTap();
  }
  if (state.settings.vibrate && navigator.vibrate) {
    navigator.vibrate(30);
  }
}

function buyUpgrade(id) {
  const nivel = state.upgrades[id] || 0;
  const coste = costeSiguiente(id, nivel);
  if (state.jornales < coste) return;
  state.jornales -= coste;
  state.upgrades[id] = nivel + 1;
  if (state.settings.audio) {
    playUpgrade();
  }
  save(state);
}

function activateBonus() {
  if (state.bonus.active) return;
  if (state.bonus.cooldown > 0) return;
  state.bonus.active = true;
  state.bonus.remaining = state.bonus.duration;
  state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
}

function processTick(delta) {
  const bonus = state.bonus;
  if (bonus.active) {
    bonus.remaining = Math.max(0, bonus.remaining - delta);
    if (bonus.remaining === 0) {
      bonus.active = false;
    }
  }
  if (bonus.cooldown > 0) {
    bonus.cooldown = Math.max(0, bonus.cooldown - delta);
  }

  const baseJps = jpsTotal(state);
  const multiplier = bonus.active ? bonus.multiplier : 1;
  state.jornalesPerSec = baseJps * multiplier;
  const gain = state.jornalesPerSec * (delta / 1000);
  if (gain > 0) {
    state.jornales += gain;
    state.totals.acumulados += gain;
  }
}

function frame(now) {
  const delta = now - lastFrame;
  lastFrame = now;
  tickAccumulator += delta;
  while (tickAccumulator >= TICK_MS) {
    processTick(TICK_MS);
    tickAccumulator -= TICK_MS;
  }
  ui.render(state);
  const totals = getTotalsForVisuals(state);
  const signature = `${totals.barcos}|${totals.obreros}|${totals.gruas}`;
  if (signature !== lastVisualSignature) {
    ui.updateDarsena(totals);
    lastVisualSignature = signature;
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

export function getTotalsForVisuals(currentState) {
  const totalNiveles = upgradesDef.reduce((acc, up) => acc + getUpgradeLevel(currentState, up.id), 0);
  const barcos = Math.min(20, Math.floor(totalNiveles / 5));
  const obreros = getUpgradeLevel(currentState, 'aprendices');
  const equipo = getUpgradeLevel(currentState, 'equipo');
  const capataz = getUpgradeLevel(currentState, 'capataz');
  const gruas = Math.floor((equipo + capataz) / 3);
  return { barcos, obreros, gruas };
}
