// Añade un set básico de logros con títulos y descripciones
export const factorCoste = 1.12;

export const upgradesDef = [
  {id:"martillos",  tipo:"click",      nombre:"Martillos reforzados", desc:"+1 jornal por tap", baseCoste:15,  baseEfecto:1},
  {id:"yunque",     tipo:"click",      nombre:"Yunque estable",       desc:"+3 inicial, +2 por nivel", baseCoste:60,  baseEfecto:3, extraPorNivel:2},
  {id:"equipo",     tipo:"click-mult", nombre:"Equipo de remachado",  desc:"x1.2 al valor por tap", baseCoste:240, multiplicador:1.2, unlockJps:10},
  {id:"aprendices", tipo:"pasivo",     nombre:"Aprendices",           desc:"+0.5 J/s por nivel", baseCoste:40,  jps:0.5},
  {id:"capataz",    tipo:"pasivo",     nombre:"Capataz veterano",     desc:"+3 J/s por nivel",   baseCoste:180, jps:3, unlockJps:25},
  {id:"dique",      tipo:"pasivo",     nombre:"Dique seco mejorado",  desc:"+10 J/s por nivel",  baseCoste:600, jps:10, unlockJps:60}
];

export function getDef(id){ return upgradesDef.find(u=>u.id===id); }
export function getUpgradeLevel(state, id){ const u=(state.upgrades||[]).find(x=>x.id===id); return u ? (Number(u.nivel)||0) : 0; }
export function costeSiguiente(def, nivel){ return Math.floor(def.baseCoste * Math.pow(factorCoste, Number(nivel)||0)); }
export function valorClick(state){
  const nMart = getUpgradeLevel(state,"martillos");
  const nYunq = getUpgradeLevel(state,"yunque");
  const nEq   = getUpgradeLevel(state,"equipo");
  const base = (Number(state.baseClick)||1) + nMart*1 + (nYunq>0?(3+(nYunq-1)*2):0);
  const mult = Math.pow(1.2, nEq||0);
  return base * mult;
}
export function jpsTotal(state){
  return getUpgradeLevel(state,"aprendices")*0.5
       + getUpgradeLevel(state,"capataz")*3
       + getUpgradeLevel(state,"dique")*10;
}

/* Logros */
export const achievementsDef = [
  {id:'taps100',    titulo:'Aprendiz de dique', desc:'Realiza 100 taps.', cond:{type:'taps', value:100}},
  {id:'taps1k',     titulo:'Mano firme', desc:'Realiza 1.000 taps.', cond:{type:'taps', value:1000}},
  {id:'jps10',      titulo:'Producción estable', desc:'Alcanza 10 Jornales/s.', cond:{type:'maxJps', value:10}},
  {id:'jps50',      titulo:'Capataz de verdad', desc:'Alcanza 50 Jornales/s.', cond:{type:'maxJps', value:50}},
  {id:'compras20',  titulo:'Jefe de cuadrilla', desc:'Compra 20 mejoras en total.', cond:{type:'compras', value:20}},
  {id:'barcos5',    titulo:'Manada de barcos', desc:'Consigue 5 barcos en la dársena.', cond:{type:'barcos', value:5}},
  {id:'jps100',     titulo:'Astillero en marcha', desc:'Alcanza 100 Jornales/s.', cond:{type:'maxJps', value:100}},
  {id:'taps5k',     titulo:'Manos de hierro', desc:'Realiza 5.000 taps.', cond:{type:'taps', value:5000}}
];

export function isAchieved(state, ach){
  const p = state.achievements?.progress || {};
  switch(ach.cond.type){
    case 'taps':   return (p.taps||0) >= ach.cond.value;
    case 'maxJps': return (p.maxJps||0) >= ach.cond.value;
    case 'compras':return (p.compras||0) >= ach.cond.value;
    case 'barcos': return (p.barcos||0) >= ach.cond.value;
    default: return false;
  }
}
