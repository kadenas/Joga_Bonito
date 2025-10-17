import * as ui from './ui.js';
import * as audio from './audio.js';
import { upgradesDef, jpsTotal, valorClick, getDef, getUpgradeLevel, achievementsDef, isAchieved, costeSiguiente } from './balance.js';
import * as save from './save.js';

export const defaultState = {
  jornales:0,
  jornalesPerSec:0,
  baseClick:1,
  upgrades: upgradesDef.map(u=>({id:u.id, nivel:0})),
  bonus:{active:false,remaining:0,cooldown:0,duration:30000,cooldownMax:120000,multiplier:2,permaMult:1},
  totals:{taps:0,acumulados:0},
  achievements:{claimed:{}, progress:{taps:0,totalJornales:0,maxJps:0,compras:0,barcos:0}},
  settings:{audio:true,vibrate:true,notation:'abbr'}
};

export const state = (window.Astillero && window.Astillero.state) || save.load(defaultState);
window.Astillero = Object.assign(window.Astillero||{}, { state });

audio.initOnFirstInteraction(); audio.setEnabled(!!state.settings.audio);

function cloneDefault(){
  if (typeof structuredClone === 'function'){
    try{ return structuredClone(defaultState); }catch{}
  }
  return JSON.parse(JSON.stringify(defaultState));
}

const initialSigTotals = getTotalsForVisuals(state);
let _lastShipSig = `${initialSigTotals.barcos}|${initialSigTotals.obreros}|${initialSigTotals.gruas}`;

export function doTap(){
  let gain = Number(valorClick(state))||0;
  if (state.bonus.active) gain*=state.bonus.multiplier;
  gain *= (state.bonus.permaMult||1);
  state.jornales = Number(state.jornales)+gain;
  state.totals.taps = (state.totals.taps||0)+1;
  state.achievements.progress.taps++;
  state.achievements.progress.totalJornales = (state.achievements.progress.totalJornales||0) + gain;
  if (state.settings.audio) audio.playTap();
  ui.renderHUD(state); ui.updateShop(state); ui.renderDock(state);
  save.save(state);
  return gain;
}

export function toggleBonus(){
  if (!state.bonus.active && state.bonus.cooldown <= 0){
    state.bonus.active = true;
    state.bonus.remaining = state.bonus.duration;
    state.bonus.cooldown = state.bonus.cooldownMax + state.bonus.duration;
    if (state.settings.audio) audio.startTide?.();
    ui.renderHUD(state);
    save.save(state);
  }
}

export function buyUpgrade(id){
  const u = state.upgrades.find(x=>x.id===id);
  const def = getDef(id);
  const nivel = Number(u?.nivel||0);
  const cost = costeSiguiente(def, nivel);
  if (state.jornales >= cost){
    state.jornales -= cost; u.nivel = nivel+1;
    state.achievements.progress.compras++;
    if (state.settings.audio) audio.playUpgrade();
    ui.flashShopItem?.(id);
    ui.renderHUD(state); ui.updateShop(state); ui.renderDock(state);
    save.save(state);
  }
}

export function resetGame(){
  const prevAudio = !!state.settings?.audio;
  save.wipe();
  const fresh = cloneDefault();
  fresh.settings.audio = prevAudio;
  Object.keys(state).forEach(k=> delete state[k]);
  Object.assign(state, fresh);
  audio.stopTide?.();
  audio.setEnabled(!!state.settings.audio);
  const totals = getTotalsForVisuals(state);
  _lastShipSig = `${totals.barcos}|${totals.obreros}|${totals.gruas}`;
  ui.renderHUD(state); ui.updateShop(state); ui.renderDock(state); ui.renderAchievements?.(state);
  save.save(state);
}

export function getTotalsForVisuals(s){
  const sumNiv=(s.upgrades||[]).reduce((a,u)=>a+(Number(u.nivel)||0),0);
  const barcos=Math.min(20,Math.floor(sumNiv/5));
  const obreros=getUpgradeLevel(s,'aprendices');
  const gruas=Math.floor((getUpgradeLevel(s,'equipo')+getUpgradeLevel(s,'capataz'))/3);
  return { barcos, obreros, gruas };
}

let prev=performance.now();
let _prevCooldown=0;
function frame(now){
  const dt=now-prev; prev=now;
  if (state.bonus.active){
    state.bonus.remaining-=dt;
    if (state.bonus.remaining<=0){
      state.bonus.active=false; state.bonus.remaining=0;
      audio.stopTide?.();
    }
  }
  if (state.bonus.cooldown>0){ state.bonus.cooldown-=dt; if (state.bonus.cooldown<0) state.bonus.cooldown=0; }

  if (_prevCooldown>0 && state.bonus.cooldown===0 && !state.bonus.active){
    if (state.settings.audio) audio.playTideReady?.();
  }
  _prevCooldown=state.bonus.cooldown;

  const mult=(state.bonus.active?state.bonus.multiplier:1)*(state.bonus.permaMult||1);
  state.jornalesPerSec=Number(jpsTotal(state))*mult||0;
  state.jornales = Number(state.jornales)+ state.jornalesPerSec*(dt/1000);
  state.achievements.progress.totalJornales += state.jornalesPerSec*(dt/1000);
  state.achievements.progress.maxJps = Math.max(state.achievements.progress.maxJps||0, state.jornalesPerSec||0);

  const t = getTotalsForVisuals(state);
  const sig = `${t.barcos}|${t.obreros}|${t.gruas}`;
  if (sig !== _lastShipSig){
    const prevShips = Number(_lastShipSig.split('|')[0]||0);
    if (t.barcos > prevShips){ ui.flashDock?.(); }
    _lastShipSig = sig;
  }
  state.achievements.progress.barcos = t.barcos;

  for(const ach of achievementsDef){
    const already = !!state.achievements.claimed[ach.id];
    if (!already && isAchieved(state, ach)){
      state.achievements.claimed[ach.id]=true;
      ui.showAchievementToast?.(ach);
      ui.renderAchievements?.(state);
    }
  }
  if (document.getElementById('achPanel')?.open){
    ui.renderAchievements?.(state);
  }
  ui.renderHUD(state); ui.updateShop(state); ui.renderDock(state);
  save.save(state);
  requestAnimationFrame(frame);
}

window.addEventListener('DOMContentLoaded', ()=>{
  ui.initUI(); ui.buildShop(); ui.hookHudButtons?.();
  ui.renderHUD(state); ui.updateShop(state); ui.renderDock(state); ui.renderAchievements(state);
  requestAnimationFrame(frame);
});

Object.assign(window.Astillero,{ doTap, buyUpgrade, toggleBonus, resetGame, getTotalsForVisuals });
