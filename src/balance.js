export const factorCoste = 1.12;

export const upgrades = [
  { id: 'martillos', tipo: 'click', nombre: 'Martillos reforzados', baseCoste: 15, baseEfecto: 1 },
  { id: 'yunque', tipo: 'click', nombre: 'Yunque estable', baseCoste: 60, baseEfecto: 3, extraPorNivel: 2 },
  { id: 'equipo', tipo: 'click-mult', nombre: 'Equipo de remachado', baseCoste: 240, multiplicador: 1.2 },
  { id: 'aprendices', tipo: 'pasivo', nombre: 'Aprendices', baseCoste: 40, jps: 0.5 },
  { id: 'capataz', tipo: 'pasivo', nombre: 'Capataz veterano', baseCoste: 180, jps: 3 },
  { id: 'dique', tipo: 'pasivo', nombre: 'Dique seco mejorado', baseCoste: 600, jps: 10 }
];

const upgradeMap = new Map(upgrades.map((u) => [u.id, u]));

export function costeSiguiente(id, nivel) {
  const data = upgradeMap.get(id);
  if (!data) return Infinity;
  return data.baseCoste * Math.pow(factorCoste, nivel);
}

export function getUpgradeLevel(state, id) {
  if (!state) return 0;
  const upgradesState = state.upgrades || {};
  return upgradesState[id] || 0;
}

export function valorClick(state) {
  let base = state.baseClick || 1;
  let additive = 0;
  let multiplier = 1;
  for (const up of upgrades) {
    const nivel = state.upgrades[up.id] || 0;
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
  for (const up of upgrades) {
    if (up.tipo === 'pasivo') {
      const nivel = state.upgrades[up.id] || 0;
      if (nivel) {
        total += nivel * up.jps;
      }
    }
  }
  return total;
}
