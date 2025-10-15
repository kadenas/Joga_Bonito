import * as ui from './ui.js';
import * as audio from './audio.js';
import { upgradesDef, jpsTotal, valorClick, getUpgradeLevel, getDef, costeSiguiente, achievementsDef, isAchieved } from './balance.js';

const globalAstillero = window.Astillero || {};
window.Astillero = globalAstillero;

function createDefaultAchievements(){
  return {
    claimed: {},
    ready: {},
    progress: { taps:0, totalJornales:0, maxJps:0, compras:0, barcos:0 }
  };
}

function createDefaultState(){
  return {
    jornales: 0,
    jornalesPerSec: 0,
    baseClick: 1,
    upgrades: upgradesDef.map(u=>({ id: u.id, nivel: 0 })),
    bonus: { active:false, remaining:0, cooldown:0, duration:30000, cooldownMax:120000, multiplier:2, permaMult:1 },
    totals: { taps:0, acumulados:0 },
    settings: { audio:true, vibrate:true, notation:'abbr' },
    achievements: createDefaultAchievements()
  };
}

let existingState = globalAstillero.state;
if (!existingState || typeof existingState !== 'object') {
  existingState = createDefaultState();
  globalAstillero.state = existingState;
}

export const state = existingState;

function ensureStateShape(){
  const defaults = createDefaultState();

  if (!state.bonus || typeof state.bonus !== 'object') state.bonus = {};
  if (!state.totals || typeof state.totals !== 'object') state.totals = {};
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  if (!state.achievements || typeof state.achievements !== 'object') state.achievements = createDefaultAchievements();

  if (!state.achievements.claimed || typeof state.achievements.claimed !== 'object') state.achievements.claimed = {};
  if (!state.achievements.ready || typeof state.achievements.ready !== 'object') state.achievements.ready = {};
  if (!state.achievements.progress || typeof state.achievements.progress !== 'object') {
    state.achievements.progress = { ...defaults.achievements.progress };
  }

  if (Array.isArray(state.upgrades)) {
    const normalized = upgradesDef.map(def=>{
      const current = state.upgrades.find(item => item && (item.id === def.id || item.key === def.id));
      const nivel = Number(current?.nivel ?? current?.level ?? current) || 0;
      return { id: def.id, nivel };
    });
    state.upgrades.length = 0;
    normalized.forEach(entry => state.upgrades.push(entry));
  } else if (state.upgrades && typeof state.upgrades === 'object') {
    for (const def of upgradesDef) {
      const entry = state.upgrades[def.id];
      if (entry && typeof entry === 'object') {
        entry.nivel = Number(entry.nivel ?? entry.level ?? 0) || 0;
        if ('level' in entry && !('nivel' in entry)) delete entry.level;
      } else {
        state.upgrades[def.id] = Number(entry) || 0;
      }
    }
  } else {
    state.upgrades = [...defaults.upgrades];
  }
}

function sanitizeNumber(value, fallback = 0){
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sanitizeInt(value, fallback = 0){
  const num = sanitizeNumber(value, fallback);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.floor(num));
}

function normalizeState(){
  ensureStateShape();

  state.jornales = sanitizeNumber(state.jornales, 0);
  state.jornalesPerSec = sanitizeNumber(state.jornalesPerSec, 0);
  state.baseClick = Math.max(1, sanitizeNumber(state.baseClick, 1));

  const bonus = state.bonus;
  bonus.active = !!bonus.active;
  bonus.remaining = Math.max(0, sanitizeNumber(bonus.remaining, 0));
  bonus.cooldown = Math.max(0, sanitizeNumber(bonus.cooldown, 0));
  bonus.duration = Math.max(0, sanitizeNumber(bonus.duration, 30000));
  bonus.cooldownMax = Math.max(0, sanitizeNumber(bonus.cooldownMax, 120000));
  bonus.multiplier = Math.max(1, sanitizeNumber(bonus.multiplier, 2));
  bonus.permaMult = Math.max(1, sanitizeNumber(bonus.permaMult, 1));

  state.totals.taps = sanitizeInt(state.totals.taps, 0);
  state.totals.acumulados = sanitizeNumber(state.totals.acumulados, 0);

  state.settings.audio = state.settings.audio !== false;
  state.settings.vibrate = state.settings.vibrate !== false;
  if (typeof state.settings.notation !== 'string') state.settings.notation = 'abbr';

  const progress = state.achievements.progress;
  progress.taps = sanitizeInt(progress.taps, 0);
  progress.totalJornales = sanitizeNumber(progress.totalJornales, 0);
  progress.maxJps = sanitizeNumber(progress.maxJps, 0);
  progress.compras = sanitizeInt(progress.compras, 0);
  progress.barcos = sanitizeInt(progress.barcos, 0);

  if (Array.isArray(state.upgrades)) {
    state.upgrades.forEach(entry => {
      entry.nivel = sanitizeInt(entry?.nivel ?? entry?.level ?? entry, 0);
      entry.id = entry.id || entry.key;
    });
  } else if (state.upgrades && typeof state.upgrades === 'object') {
    for (const def of upgradesDef) {
      const entry = state.upgrades[def.id];
      if (entry && typeof entry === 'object') {
        entry.nivel = sanitizeInt(entry.nivel ?? entry.level ?? 0, 0);
        entry.id = def.id;
        if ('level' in entry && !('nivel' in entry)) delete entry.level;
      } else {
        state.upgrades[def.id] = sanitizeInt(entry, 0);
      }
    }
  }
}

normalizeState();

// desbloqueo audio en la primera interacción
audio.initOnFirstInteraction();
audio.setEnabled(state.settings.audio);

// Lógica de juego
export function doTap(){
  normalizeState();
  let gain = Math.max(0, Number(valorClick(state)) || 0);
  if (state.bonus.active) gain *= state.bonus.multiplier;
  gain *= state.bonus.permaMult ?? 1;

  state.jornales = sanitizeNumber(state.jornales, 0) + gain;
  state.totals.taps = sanitizeInt(state.totals.taps, 0) + 1;
  state.totals.acumulados = sanitizeNumber(state.totals.acumulados, 0) + gain;

  const prog = state.achievements?.progress;
  if (prog){
    prog.taps = sanitizeInt(prog.taps, 0) + 1;
    prog.totalJornales = sanitizeNumber(prog.totalJornales, 0) + gain;
  }

  if (state.settings.audio) audio.playTap();
  ui.renderHUD(state);
  ui.updateShop?.(state);
  return gain;
}

export function toggleBonus(){
  normalizeState();
  if (!state.bonus.active && state.bonus.cooldown <= 0){
    state.bonus.active = true;
    state.bonus.remaining = state.bonus.duration;
    state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
  }
  ui.renderHUD(state);
  ui.updateShop?.(state);
}

export function buyUpgrade(id){
  normalizeState();
  const def = getDef(id) || upgradesDef.find(u=>u.id===id);
  if (!def) return;

  const nivelActual = getUpgradeLevel(state, id);
  const cost = Math.floor(costeSiguiente(def, nivelActual));
  if (!Number.isFinite(cost) || cost < 0) return;
  if (sanitizeNumber(state.jornales, 0) < cost) return;

  state.jornales = Math.max(0, sanitizeNumber(state.jornales, 0) - cost);

  if (Array.isArray(state.upgrades)){
    const entry = state.upgrades.find(x=>x && (x.id === id || x.key === id));
    if (entry){
      entry.nivel = sanitizeInt(entry.nivel ?? entry.level ?? 0, 0) + 1;
      entry.id = entry.id || id;
    } else {
      state.upgrades.push({ id, nivel: 1 });
    }
  } else if (state.upgrades && typeof state.upgrades === 'object'){
    const current = state.upgrades[id];
    if (typeof current === 'object' && current !== null){
      current.nivel = sanitizeInt(current.nivel ?? current.level ?? 0, 0) + 1;
      current.id = id;
      if ('level' in current && !('nivel' in current)) delete current.level;
    } else {
      const prev = sanitizeInt(current, 0);
      state.upgrades[id] = prev + 1;
    }
  }

  const prog = state.achievements?.progress;
  if (prog){
    prog.compras = sanitizeInt(prog.compras, 0) + 1;
  }

  _lastSig = ''; // fuerza redibujar dársena
  ui.updateShop?.(state);
  ui.renderHUD(state);
  if (state.settings.audio) audio.playUpgrade();
}

// Totales para la dársena
export function getTotalsForVisuals(s){
  const sumNiveles = (s.upgrades||[]).reduce((a,u)=>a+(u.nivel||0),0);
  const barcos = Math.min(20, Math.floor(sumNiveles/5));
  const obreros = getUpgradeLevel(s, 'aprendices');
  const gruas = Math.floor((getUpgradeLevel(s,'equipo') + getUpgradeLevel(s,'capataz'))/3);
  return { barcos, obreros, gruas };
}

// Bucle principal
let _lastSig = '';
let _prev = performance.now();
function frame(now){
  const dt = Math.max(0, now - _prev);
  _prev = now;

  normalizeState();

  if (state.bonus.active){
    state.bonus.remaining = Math.max(0, state.bonus.remaining - dt);
    if (state.bonus.remaining === 0) {
      state.bonus.active = false;
    }
  }
  if (state.bonus.cooldown > 0){
    state.bonus.cooldown = Math.max(0, state.bonus.cooldown - dt);
  }

  const baseJps = sanitizeNumber(jpsTotal(state), 0);
  const multiplier = state.bonus.active ? state.bonus.multiplier : 1;
  state.jornalesPerSec = sanitizeNumber(baseJps * multiplier, 0);

  const delta = state.jornalesPerSec * (dt / 1000);
  if (delta) {
    state.jornales = sanitizeNumber(state.jornales, 0) + delta;
    state.totals.acumulados = sanitizeNumber(state.totals.acumulados, 0) + Math.max(0, delta);
  }

  const prog = state.achievements?.progress;
  if (prog){
    prog.totalJornales = sanitizeNumber(prog.totalJornales, 0) + Math.max(0, delta);
    prog.maxJps = Math.max(sanitizeNumber(prog.maxJps, 0), state.jornalesPerSec);
  }

  // HUD
  ui.renderHUD(state);
  ui.updateShop?.(state);

  // Dársena
  const t = getTotalsForVisuals(state);
  if (prog){
    prog.barcos = sanitizeInt(t.barcos, 0);
  }
  const sig = `${t.barcos}|${t.obreros}|${t.gruas}`;
  if (sig !== _lastSig){
    ui.updateDarsena?.(t);
    _lastSig = sig;
  }

  if (prog){
    for (const ach of achievementsDef){
      if (state.achievements.claimed?.[ach.id]) continue;
      if (isAchieved(state, ach) && !state.achievements.ready[ach.id]){
        state.achievements.ready[ach.id] = true;
        ui.showAchievementToast?.(ach);
      }
    }
  }

  ui.renderAchievements?.(state);

  requestAnimationFrame(frame);
}

// Bootstrap seguro: engancha listeners cuando el DOM existe
window.addEventListener('DOMContentLoaded', ()=>{
  normalizeState();
  ui.initUI?.();
  ui.initDarsena?.();
  ui.buildShop?.();
  ui.mountAchievements?.();

  const btnBonus = document.getElementById('btnBonus');
  btnBonus?.addEventListener('click', ()=>{ toggleBonus(); });

  // Primera pintura
  ui.renderHUD(state);
  ui.updateShop?.(state);
  ui.updateDarsena?.(getTotalsForVisuals(state));
  ui.renderAchievements?.(state);

  requestAnimationFrame(frame);
});

// Exponer para depurar en consola
Object.assign(globalAstillero, { state, doTap, buyUpgrade, toggleBonus });
