const KEY = 'baradero.save.v1';
const BONUS_DEFAULT = {active:false, remaining:0, cooldown:0, duration:30000, cooldownMax:120000, multiplier:2, permaMult:1};
const ACH_PROGRESS_DEFAULT = {taps:0,totalJornales:0,maxJps:0,compras:0,barcos:0};

export function load(defaultState){
  try{
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(defaultState);
    const s = JSON.parse(raw);
    return normalizeState(s, defaultState);
  }catch{ return structuredCloneSafe(defaultState); }
}

export function save(state){
  try{
    const minimal = JSON.stringify(state);
    localStorage.setItem(KEY, minimal);
  }catch{}
}

export function exportGame(state){
  try{ return JSON.stringify(state); }catch{ return ''; }
}

export function importGame(text, defaultState){
  const parsed = JSON.parse(text);
  const normalized = normalizeState(parsed, defaultState);
  localStorage.setItem(KEY, JSON.stringify(normalized));
  return normalized;
}

function normalizeState(data, defaults={}){
  const base = {
    ...structuredCloneSafe(defaults),
    ...data
  };
  base.jornales = Number(base.jornales)||0;
  base.jornalesPerSec = Number(base.jornalesPerSec)||0;
  base.baseClick = Number(base.baseClick)||1;

  const upgradeDefaults = (defaults?.upgrades && Array.isArray(defaults.upgrades))
    ? defaults.upgrades
    : [];
  const upgradeSource = Array.isArray(data?.upgrades) ? data.upgrades : base.upgrades;
  const upgradesMap = new Map((upgradeSource||[]).map(u=>[u.id, u]));
  base.upgrades = upgradeDefaults.length
    ? upgradeDefaults.map(u=>({ id: u.id, nivel: Number(upgradesMap.get(u.id)?.nivel)||0 }))
    : (Array.isArray(upgradeSource) ? upgradeSource.map(u=>({ id:u.id, nivel:Number(u.nivel)||0 })) : []);

  base.bonus = Object.assign({}, BONUS_DEFAULT, defaults?.bonus || {}, data?.bonus || {});
  base.totals = Object.assign({taps:0,acumulados:0}, defaults?.totals || {}, data?.totals || {});
  const claimedDefault = defaults?.achievements?.claimed || {};
  const progressDefault = defaults?.achievements?.progress || {};
  const claimedImported = data?.achievements?.claimed || data?.achievements || {};
  const progressImported = data?.achievements?.progress || {};
  base.achievements = {
    claimed: Object.assign({}, claimedDefault, claimedImported),
    progress: Object.assign({}, ACH_PROGRESS_DEFAULT, progressDefault, progressImported)
  };
  base.settings = Object.assign({audio:true, vibrate:true, notation:'abbr'}, defaults?.settings || {}, data?.settings || {});
  return base;
}

function structuredCloneSafe(obj){
  if (typeof structuredClone === 'function'){
    try{ return structuredClone(obj); }catch{}
  }
  return obj ? JSON.parse(JSON.stringify(obj)) : obj;
}
