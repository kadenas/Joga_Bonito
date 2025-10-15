export const factorCoste = 1.12;

export const upgradesDef = [
  { id: 'martillos', tipo: 'click', nombre: 'Martillos reforzados', baseCoste: 15, baseEfecto: 1 },
  { id: 'yunque', tipo: 'click', nombre: 'Yunque estable', baseCoste: 60, baseEfecto: 3, extraPorNivel: 2 },
  { id: 'equipo', tipo: 'click-mult', nombre: 'Equipo de remachado', baseCoste: 240, multiplicador: 1.2 },
  { id: 'aprendices', tipo: 'pasivo', nombre: 'Aprendices', baseCoste: 40, jps: 0.5 },
  { id: 'capataz', tipo: 'pasivo', nombre: 'Capataz veterano', baseCoste: 180, jps: 3 },
  { id: 'dique', tipo: 'pasivo', nombre: 'Dique seco mejorado', baseCoste: 600, jps: 10 }
];

export const upgrades = upgradesDef;

const upgradeMap = new Map(upgradesDef.map((u) => [u.id, u]));

export function costeSiguiente(idOrDef, nivel) {
  const def = typeof idOrDef === 'string' ? upgradeMap.get(idOrDef) : idOrDef;
  if (!def) return Infinity;
  return def.baseCoste * Math.pow(factorCoste, nivel);
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
  return (base + additive) * multiplier;
}

export function jpsTotal(state) {
  let total = 0;
  for (const up of upgradesDef) {
    if (up.tipo !== 'pasivo') continue;
    const nivel = getUpgradeLevel(state, up.id);
    if (!nivel) continue;
    total += nivel * up.jps;
  }
  return total;
}
