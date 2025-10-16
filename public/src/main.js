import * as ui from './ui.js';
import * as audio from './audio.js';
import { upgradesDef, jpsTotal, valorClick, getDef, getUpgradeLevel, achievementsDef, isAchieved, costeSiguiente } from './balance.js';
import * as save from './save.js';

function createDefaultState(){
  return {
    jornales: 0, jornalesPerSec: 0, baseClick: 1,
    upgrades: upgradesDef.map(u=>({id:u.id, nivel:0})),
    bonus: { active:false, remaining:0, cooldown:0, duration:30000, cooldownMax:120000, multiplier:2, permaMult:1 },
    totals: { taps:0, acumulados:0 },
    achievements: { claimed:{}, progress:{ taps:0, totalJornales:0, maxJps:0, compras:0, barcos:0 } },
    settings: { audio:true, vibrate:true, notation:"abbr" }
  };
}

// Estado con logros y progreso
export const state = (window.Astillero && window.Astillero.state) || save.load(createDefaultState());
window.Astillero = Object.assign(window.Astillero||{}, { state });

audio.initOnFirstInteraction();
audio.setEnabled(!!state.settings.audio);

// Tap
export function doTap(){
  let gain = Number(valorClick(state)) || 0;
  if (state.bonus.active) gain *= state.bonus.multiplier;
  gain *= (state.bonus.permaMult||1);
  state.jornales = Number(state.jornales) + gain;
  state.totals.taps = (state.totals.taps||0) + 1;
  state.totals.acumulados = (state.totals.acumulados||0) + gain;
  state.achievements.progress.taps++;
  state.achievements.progress.totalJornales = (state.achievements.progress.totalJornales||0) + gain;
  if (state.settings.audio && audio.isEnabled()) audio.playTap();
  ui.renderHUD(state); ui.updateShop(state); ui.renderAchievements(state);
  save.save(state);
  return gain;
}

export function toggleBonus(){
  if (!state.bonus.active && (state.bonus.cooldown||0)<=0){
    state.bonus.active = true;
    state.bonus.remaining = state.bonus.duration;
    state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
  }
}

// Compra
export function buyUpgrade(id){
  const u = state.upgrades.find(x=>x.id===id);
  const def = getDef(id);
  const nivel = Number(u?.nivel||0);
  const cost = costeSiguiente(def, nivel);
  if (state.jornales >= cost){
    state.jornales -= cost; u.nivel = nivel + 1;
    state.achievements.progress.compras++;
    if (state.settings.audio && audio.isEnabled()) audio.playUpgrade();
    ui.renderHUD(state); ui.updateShop(state); ui.renderAchievements(state);
    save.save(state);
  }
}

// Dársena (si la usas)
export function getTotalsForVisuals(s){
  const sumNiv = (s.upgrades||[]).reduce((a,u)=>a+(Number(u.nivel)||0),0);
  const barcos = Math.min(24, Math.floor(sumNiv/4));
  const obreros = getUpgradeLevel(s,'aprendices') + getUpgradeLevel(s,'capataz') + Math.floor(getUpgradeLevel(s,'taller')/2);
  const gruas = getUpgradeLevel(s,'portrico') + Math.floor((getUpgradeLevel(s,'equipo') + getUpgradeLevel(s,'soldadura'))/2);
  return { barcos, obreros, gruas };
}

// Bucle
let prev = performance.now();
function frame(now){
  const dt = now - prev; prev = now;

  if (state.bonus.active){
    state.bonus.remaining -= dt;
    if (state.bonus.remaining<=0){ state.bonus.active=false; state.bonus.remaining=0; }
  }
  if (state.bonus.cooldown>0){
    state.bonus.cooldown -= dt;
    if (state.bonus.cooldown<0) state.bonus.cooldown=0;
  }

  const mult = (state.bonus.active?state.bonus.multiplier:1) * (state.bonus.permaMult||1);
  state.jornalesPerSec = Number(jpsTotal(state))*mult || 0;
  state.jornales = Number(state.jornales) + state.jornalesPerSec * (dt/1000);
  state.achievements.progress.totalJornales += state.jornalesPerSec * (dt/1000);
  state.achievements.progress.maxJps = Math.max(state.achievements.progress.maxJps||0, state.jornalesPerSec||0);

  // barcos para logros
  try {
    const totals = getTotalsForVisuals(state);
    state.achievements.progress.barcos = totals.barcos;
    ui.updateDarsena?.(totals);
  } catch {}

  // check logros
  let anyNew = false;
  for (const ach of achievementsDef){
    if (!state.achievements.claimed[ach.id] && isAchieved(state, ach)){
      state.achievements.claimed[ach.id] = true; // auto-claim en MVP
      anyNew = true;
    }
  }
  if (anyNew && state.settings.audio && audio.isEnabled()) audio.playAchievement();

  ui.renderHUD(state); ui.updateShop(state); ui.renderAchievements(state);
  save.save(state);

  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', ()=>{
  ui.initUI();
  ui.initDarsena?.();
  ui.buildShop();
  ui.renderHUD(state);
  ui.updateShop(state);
  ui.mountAchievements(); ui.renderAchievements(state);
  ui.updateDarsena?.(getTotalsForVisuals(state));

  // botón mute
  const m = document.getElementById('muteBtn');
  if (m){
    const sync = ()=>{ m.setAttribute('aria-pressed', String(!state.settings.audio?true:false)); m.textContent = state.settings.audio ? '🔊' : '🔇'; };
    sync();
    m.addEventListener('click', ()=>{
      state.settings.audio = !state.settings.audio;
      audio.setEnabled(state.settings.audio);
      sync(); save.save(state);
    });
  }

  // export/import
  const btnE = document.getElementById('btnExport');
  const btnI = document.getElementById('btnImport');
  const box  = document.getElementById('exportBox');
  btnE?.addEventListener('click', ()=>{ box.value = save.exportGame(state); box.select(); });
  btnI?.addEventListener('click', ()=>{
    try{
      const s = save.importGame(box.value.trim(), createDefaultState());
      Object.assign(state, s);
      ui.renderHUD(state); ui.updateShop(state); ui.renderAchievements(state);
      ui.updateDarsena?.(getTotalsForVisuals(state));
      audio.setEnabled(!!state.settings.audio);
      alert('Importado correctamente');
    }catch(e){ alert('JSON inválido'); }
  });

  document.getElementById('btnBonus')?.addEventListener('click', ()=>{
    toggleBonus();
  });
  document.getElementById('navShop')?.addEventListener('click', ()=>{
    const panel = document.getElementById('shopPanel');
    panel?.setAttribute('open','');
    panel?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
  document.getElementById('navLogros')?.addEventListener('click', ()=>{
    const panel = document.getElementById('achPanel');
    panel?.setAttribute('open','');
    panel?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  requestAnimationFrame(frame);
});

Object.assign(window.Astillero, { doTap, buyUpgrade, toggleBonus });
