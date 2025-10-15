import * as ui from './ui.js';
import * as audio from './audio.js';
import { upgradesDef, jpsTotal, valorClick, getUpgradeLevel, getDef, costeSiguiente } from './balance.js';

// Estado básico (si ya existe, conserva tus campos)
export const state = window.__STATE__ || {
  jornales: 0,
  jornalesPerSec: 0,
  baseClick: 1,
  upgrades: upgradesDef.map(u=>({id:u.id, nivel:0})),
  bonus: { active:false, remaining:0, cooldown:0, duration:30000, cooldownMax:120000, multiplier:2 },
  totals: { taps:0, acumulados:0 },
  settings: { audio:true, vibrate:true, notation:"abbr" }
};

// desbloqueo audio en la primera interacción
audio.initOnFirstInteraction();
audio.setEnabled(state.settings.audio);

// Lógica de juego
export function doTap(){
  let gain = valorClick(state);
  if (state.bonus.active) gain *= state.bonus.multiplier;
  state.jornales += gain;
  state.totals.taps++;
  if (state.settings.audio) audio.playTap();
  ui.renderHUD?.(state);
}
export function toggleBonus(){
  if (!state.bonus.active && state.bonus.cooldown<=0){
    state.bonus.active = true;
    state.bonus.remaining = state.bonus.duration;
    state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
  }
}
export function buyUpgrade(id){
  const def = getDef(id) || upgradesDef.find(u=>u.id===id);
  if (!def) return;
  const nivelActual = getUpgradeLevel(state, id);
  const cost = costeSiguiente(def, nivelActual);
  if (state.jornales < cost) return;

  state.jornales -= cost;

  if (Array.isArray(state.upgrades)){
    const entry = state.upgrades.find(x=>x.id===id);
    if (entry){
      entry.nivel = (entry.nivel ?? 0) + 1;
    } else {
      state.upgrades.push({ id, nivel: 1 });
    }
  } else if (state.upgrades && typeof state.upgrades === 'object'){
    const current = state.upgrades[id];
    if (typeof current === 'object' && current !== null){
      current.nivel = (current.nivel ?? current.level ?? 0) + 1;
    } else {
      const prev = Number(current) || 0;
      state.upgrades[id] = prev + 1;
    }
  }

  _lastSig = ''; // fuerza redibujar dársena
  ui.invalidateShop?.();
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
  const dt = now - _prev; _prev = now;

  if (state.bonus.active){
    state.bonus.remaining -= dt;
    if (state.bonus.remaining<=0){ state.bonus.active=false; state.bonus.remaining=0; }
  }
  if (state.bonus.cooldown>0){
    state.bonus.cooldown -= dt;
    if (state.bonus.cooldown<0) state.bonus.cooldown=0;
  }

  state.jornalesPerSec = jpsTotal(state) * (state.bonus.active ? state.bonus.multiplier : 1);
  state.jornales += state.jornalesPerSec * (dt/1000);

  // HUD
  ui.renderHUD?.(state);
  ui.renderShop?.(state);

  // Dársena
  const t = getTotalsForVisuals(state);
  const sig = `${t.barcos}|${t.obreros}|${t.gruas}`;
  if (sig !== _lastSig){
    ui.updateDarsena?.(t);
    _lastSig = sig;
  }

  requestAnimationFrame(frame);
}

// Bootstrap seguro: engancha listeners cuando el DOM existe
window.addEventListener('DOMContentLoaded', ()=>{
  ui.initUI?.();
  ui.initDarsena?.();
  ui.mountShop?.();

  const btnBonus = document.getElementById('btnBonus');
  btnBonus?.addEventListener('click', ()=>{ toggleBonus(); });

  // Primera pintura
  ui.renderHUD?.(state);
  ui.renderShop?.(state);
  ui.updateDarsena?.(getTotalsForVisuals(state));

  requestAnimationFrame(frame);
});

// Exponer para depurar en consola
window.Astillero = { state, doTap, buyUpgrade, toggleBonus };
