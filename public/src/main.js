import * as ui from './ui.js';
import { upgradesDef, jpsTotal, valorClick, getUpgradeLevel } from './balance.js';

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

// Lógica de juego
export function doTap(){
  let gain = valorClick(state);
  if (state.bonus.active) gain *= state.bonus.multiplier;
  state.jornales += gain;
  state.totals.taps++;
}
export function toggleBonus(){
  if (!state.bonus.active && state.bonus.cooldown<=0){
    state.bonus.active = true;
    state.bonus.remaining = state.bonus.duration;
    state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
  }
}
export function buyUpgrade(id){
  const def = upgradesDef.find(u=>u.id===id);
  const u = state.upgrades.find(x=>x.id===id);
  const cost = Math.floor(def.baseCoste * Math.pow(1.12, u.nivel));
  if (state.jornales >= cost){
    state.jornales -= cost;
    u.nivel++;
    _lastSig = ''; // fuerza redibujar dársena
  }
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

  const btnTap = document.getElementById('btnTap');
  const btnBonus = document.getElementById('btnBonus');
  btnTap?.addEventListener('click', ()=>{ doTap(); ui.renderHUD?.(state); }, {passive:true});
  btnBonus?.addEventListener('click', ()=>{ toggleBonus(); }, {passive:true});

  // Primera pintura
  ui.renderHUD?.(state);
  ui.updateDarsena?.(getTotalsForVisuals(state));

  requestAnimationFrame(frame);
});

// Exponer para depurar en consola
window.Astillero = { state, doTap, buyUpgrade, toggleBonus };
