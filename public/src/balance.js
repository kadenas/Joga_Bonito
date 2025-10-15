export const factorCoste = 1.12;

export const upgradesDef = [
  { id: 'martillos',  tipo: 'click',      nombre: 'Martillos reforzados', desc: '+1 jornal por tap', baseCoste: 15, baseEfecto: 1 },
  { id: 'yunque',     tipo: 'click',      nombre: 'Yunque estable', desc: '+3 inicial, +2 por nivel', baseCoste: 60, baseEfecto: 3, extraPorNivel: 2 },
  { id: 'equipo',     tipo: 'click-mult', nombre: 'Equipo de remachado', desc: 'x1.2 al valor por tap', baseCoste: 240, multiplicador: 1.2, unlockJps: 10 },
  { id: 'aprendices', tipo: 'pasivo',     nombre: 'Aprendices', desc: '+0.5 J/s por nivel', baseCoste: 40, jps: 0.5 },
  { id: 'capataz',    tipo: 'pasivo',     nombre: 'Capataz veterano', desc: '+3 J/s por nivel', baseCoste: 180, jps: 3, unlockJps: 25 },
  { id: 'dique',      tipo: 'pasivo',     nombre: 'Dique seco mejorado', desc: '+10 J/s por nivel', baseCoste: 600, jps: 10, unlockJps: 60 }
];

export const upgrades = upgradesDef;

const upgradeMap = new Map(upgradesDef.map((u) => [u.id, u]));

export function getDef(id) {
  return upgradeMap.get(id);
}

export function costeSiguiente(idOrDef, nivel) {
  const def = typeof idOrDef === 'string' ? upgradeMap.get(idOrDef) : idOrDef;
  if (!def) return Infinity;
  return Math.floor(def.baseCoste * Math.pow(factorCoste, nivel));
}

export function getUpgradeLevel(state, id) {
  if (!state || !id) return 0;
  const source = state.upgrades;
  if (Array.isArray(source)) {
    const found = source.find((item) => item && (item.id === id || item.key === id));
    if (!found) return 0;
    return found.nivel ?? found.level ?? 0;
  }
  if (source && typeof source === 'object') {
    const entry = source[id];
    if (typeof entry === 'number') return entry;
    if (entry && typeof entry === 'object') {
      return entry.nivel ?? entry.level ?? 0;
    }
  }
  return 0;
}

export function valorClick(state) {
  const base = state?.baseClick ?? 1;
  let additive = 0;
  let multiplier = 1;
  for (const up of upgradesDef) {
    const nivel = getUpgradeLevel(state, up.id);
    if (!nivel) continue;
    if (up.tipo === 'click') {
      const extra = up.extraPorNivel ? up.extraPorNivel * Math.max(0, nivel - 1) : 0;
      additive += nivel * up.baseEfecto + extra;
    } else if (up.tipo === 'click-mult') {
      multiplier *= Math.pow(up.multiplicador, nivel);
    }
  }
  const permaMult = state?.bonus?.permaMult ?? 1;
  return (base + additive) * multiplier * permaMult;
}

export function jpsTotal(state) {
  let total = 0;
  for (const up of upgradesDef) {
    if (up.tipo !== 'pasivo') continue;
    const nivel = getUpgradeLevel(state, up.id);
    if (!nivel) continue;
    total += nivel * up.jps;
  }
  const permaMult = state?.bonus?.permaMult ?? 1;
  return total * permaMult;
}

export const achievementsDef = [
  { id: 'aprendiz-dique', titulo: 'Aprendiz de dique', desc: 'Realiza 100 taps en el casco.', cond: { type: 'taps', value: 100 }, reward: { type: 'flat', amount: 200 } },
  { id: 'mano-firme', titulo: 'Mano firme', desc: 'Da 1000 golpes precisos.', cond: { type: 'taps', value: 1000 }, reward: { type: 'flat', amount: 2000 } },
  { id: 'produccion-estable', titulo: 'Producción estable', desc: 'Alcanza 10 Jornales/s máximos.', cond: { type: 'maxJps', value: 10 }, reward: { type: 'flat', amount: 1000 } },
  { id: 'capataz-verdad', titulo: 'Capataz de verdad', desc: 'Mantén un ritmo de 50 Jornales/s.', cond: { type: 'maxJps', value: 50 }, reward: { type: 'mult', amount: 0.05 } },
  { id: 'manada-barcos', titulo: 'Manada de barcos', desc: 'Reúne 5 barcos en la dársena.', cond: { type: 'barcos', value: 5 }, reward: { type: 'flat', amount: 5000 } },
  { id: 'jefe-cuadrilla', titulo: 'Jefe de cuadrilla', desc: 'Compra 20 mejoras en total.', cond: { type: 'compras', value: 20 }, reward: { type: 'mult', amount: 0.05 } },
  { id: 'astillero-marcha', titulo: 'Astillero en marcha', desc: 'Supera los 100 Jornales/s máximos.', cond: { type: 'maxJps', value: 100 }, reward: { type: 'flat', amount: 20000 } },
  { id: 'viento-favor', titulo: 'Viento a favor', desc: 'Llega a 250 Jornales/s máximos.', cond: { type: 'maxJps', value: 250 }, reward: { type: 'mult', amount: 0.1 } },
  { id: 'darsena-llena', titulo: 'Dársena llena', desc: 'Gestiona 15 barcos simultáneos.', cond: { type: 'barcos', value: 15 }, reward: { type: 'flat', amount: 100000 } },
  { id: 'manos-hierro', titulo: 'Manos de hierro', desc: 'Logra 5000 taps manuales.', cond: { type: 'taps', value: 5000 }, reward: { type: 'mult', amount: 0.1 } },
];

export function isAchieved(state, achievement) {
  if (!state || !achievement) return false;
  const progress = state.achievements?.progress;
  if (!progress) return false;
  const { type, value } = achievement.cond || {};
  if (!type || typeof value !== 'number') return false;
  switch (type) {
    case 'taps':
      return (progress.taps ?? 0) >= value;
    case 'maxJps':
      return (progress.maxJps ?? 0) >= value;
    case 'compras':
      return (progress.compras ?? 0) >= value;
    case 'barcos':
      return (progress.barcos ?? 0) >= value;
    default:
      return false;
  }
}

export function canClaim(state, achievement) {
  if (!isAchieved(state, achievement)) return false;
  const claimedMap = state.achievements?.claimed || {};
  return !claimedMap[achievement.id];
}

export function applyReward(state, achievement) {
  if (!state || !achievement?.reward) return;
  const { type, amount } = achievement.reward;
  if (type === 'flat') {
    state.jornales = (state.jornales ?? 0) + amount;
    const progress = state.achievements?.progress;
    if (progress) {
      progress.totalJornales = (progress.totalJornales ?? 0) + amount;
    }
  } else if (type === 'mult') {
    if (!state.bonus) state.bonus = {};
    const current = state.bonus.permaMult ?? 1;
    state.bonus.permaMult = current * (1 + amount);
  }
}
