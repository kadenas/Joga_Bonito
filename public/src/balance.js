// Rebalance con progresión más pausada y más contenido
export const factorCoste = 1.17;

export const upgradesDef = [
  // Click
  {id:'martillos',  tipo:'click',      nombre:'Martillos reforzados',    desc:'+1 jornal por tap',                baseCoste:30,   baseEfecto:1},
  {id:'yunque',     tipo:'click',      nombre:'Yunque estable',          desc:'+3 inicial, +2 por nivel',         baseCoste:120,  baseEfecto:3, extraPorNivel:2, unlockJps:2},
  {id:'remaches',   tipo:'click',      nombre:'Remaches templados',      desc:'+2 por tap',                        baseCoste:280,  baseEfecto:2, unlockJps:6},
  {id:'equipo',     tipo:'click-mult', nombre:'Equipo de remachado',     desc:'x1.15 al valor por tap',           baseCoste:350,  multiplicador:1.15, unlockJps:10},
  {id:'soldadura',  tipo:'click-mult', nombre:'Soplete y soldadura',     desc:'x1.15 adicional al tap',            baseCoste:700,  multiplicador:1.15, unlockJps:25},

  // Pasivo
  {id:'aprendices', tipo:'pasivo',     nombre:'Aprendices',              desc:'+0.4 J/s por nivel',               baseCoste:60,   jps:0.4},
  {id:'capataz',    tipo:'pasivo',     nombre:'Capataz veterano',        desc:'+2.5 J/s por nivel',               baseCoste:240,  jps:2.5, unlockJps:8},
  {id:'carros',     tipo:'pasivo',     nombre:'Carros de varada',        desc:'+4 J/s por nivel',                 baseCoste:500,  jps:4, unlockJps:15},
  {id:'dique',      tipo:'pasivo',     nombre:'Dique seco mejorado',     desc:'+8 J/s por nivel',                 baseCoste:900,  jps:8, unlockJps:20},
  {id:'portrico',   tipo:'pasivo',     nombre:'Grúa pórtico',            desc:'+14 J/s por nivel',                baseCoste:2200, jps:14, unlockJps:50},
  {id:'taller',     tipo:'pasivo',     nombre:'Taller nocturno',         desc:'+30 J/s por nivel',                baseCoste:5200, jps:30, unlockJps:120},

  // Mixtas
  {id:'aceites',    tipo:'click-mult', nombre:'Aceites y grasas',        desc:'x1.1 al tap y +1 J/s',             baseCoste:1600, multiplicador:1.10, jps:1, unlockJps:40},
  {id:'automat',    tipo:'pasivo',     nombre:'Automatización ligera',   desc:'+60 J/s por nivel',                baseCoste:12000, jps:60, unlockJps:240}
];

export function getDef(id){
  return upgradesDef.find(u=>u.id===id);
}

export function getUpgradeLevel(state, id){
  const u = (state.upgrades||[]).find(x=>x.id===id);
  return u ? (Number(u.nivel)||0) : 0;
}

export function costeSiguiente(def, nivel){
  return Math.floor(def.baseCoste * Math.pow(factorCoste, Number(nivel)||0));
}

export function valorClick(state){
  const nMart = getUpgradeLevel(state,'martillos');
  const nYunq = getUpgradeLevel(state,'yunque');
  const nRem  = getUpgradeLevel(state,'remaches');
  const nEq   = getUpgradeLevel(state,'equipo');
  const nSol  = getUpgradeLevel(state,'soldadura');
  const nAce  = getUpgradeLevel(state,'aceites');
  let base = (Number(state.baseClick)||1)
           + nMart * 1
           + (nYunq>0 ? (3 + (nYunq-1)*(Number(getDef('yunque')?.extraPorNivel)||0)) : 0)
           + nRem * 2;
  const mult = Math.pow(1.15, nEq||0) * Math.pow(1.15, nSol||0) * Math.pow(1.1, nAce||0);
  return base * mult;
}

export function jpsTotal(state){
  return getUpgradeLevel(state,'aprendices')*0.4
       + getUpgradeLevel(state,'capataz')*2.5
       + getUpgradeLevel(state,'carros')*4
       + getUpgradeLevel(state,'dique')*8
       + getUpgradeLevel(state,'portrico')*14
       + getUpgradeLevel(state,'taller')*30
       + getUpgradeLevel(state,'aceites')*1
       + getUpgradeLevel(state,'automat')*60;
}

export const achievementsDef = [
  {id:'taps50',     titulo:'Calentar muñeca', desc:'50 taps.', cond:{type:'taps', value:50}},
  {id:'taps200',    titulo:'Ritmo de astillero', desc:'200 taps.', cond:{type:'taps', value:200}},
  {id:'taps1k',     titulo:'Mano firme', desc:'1.000 taps.', cond:{type:'taps', value:1000}},
  {id:'taps5k',     titulo:'Manos de hierro', desc:'5.000 taps.', cond:{type:'taps', value:5000}},

  {id:'jps5',       titulo:'Producción básica', desc:'5 J/s.', cond:{type:'maxJps', value:5}},
  {id:'jps15',      titulo:'Turno rentable', desc:'15 J/s.', cond:{type:'maxJps', value:15}},
  {id:'jps50',      titulo:'Capataz de verdad', desc:'50 J/s.', cond:{type:'maxJps', value:50}},
  {id:'jps120',     titulo:'Varadero en marcha', desc:'120 J/s.', cond:{type:'maxJps', value:120}},
  {id:'jps300',     titulo:'Industria local', desc:'300 J/s.', cond:{type:'maxJps', value:300}},

  {id:'compras5',   titulo:'Primer catálogo', desc:'5 compras.', cond:{type:'compras', value:5}},
  {id:'compras20',  titulo:'Jefe de cuadrilla', desc:'20 compras.', cond:{type:'compras', value:20}},
  {id:'compras60',  titulo:'Mayorista', desc:'60 compras.', cond:{type:'compras', value:60}},

  {id:'barcos3',    titulo:'Tres en grada', desc:'3 barcos.', cond:{type:'barcos', value:3}},
  {id:'barcos6',    titulo:'Media dársena', desc:'6 barcos.', cond:{type:'barcos', value:6}},
  {id:'barcos12',   titulo:'Dársena llena', desc:'12 barcos.', cond:{type:'barcos', value:12}},

  {id:'unlock-eq',  titulo:'Equipo listo', desc:'Desbloquea “Equipo de remachado”.', cond:{type:'maxJps', value:10}},
  {id:'unlock-por', titulo:'Brazo de acero', desc:'Desbloquea “Grúa pórtico”.', cond:{type:'maxJps', value:50}},
  {id:'unlock-auto',titulo:'Luces encendidas', desc:'Desbloquea “Automatización ligera”.', cond:{type:'maxJps', value:240}},

  {id:'maraton',    titulo:'Jornada larga', desc:'Acumula 50.000 jornales totales.', cond:{type:'total', value:50000}},
  {id:'maraton2',   titulo:'Semana en el varadero', desc:'Acumula 1.000.000 jornales.', cond:{type:'total', value:1000000}}
];

export function isAchieved(state, ach){
  const p = state.achievements?.progress || {};
  switch(ach.cond.type){
    case 'taps':   return (p.taps||0) >= ach.cond.value;
    case 'maxJps': return (p.maxJps||0) >= ach.cond.value;
    case 'compras':return (p.compras||0) >= ach.cond.value;
    case 'barcos': return (p.barcos||0) >= ach.cond.value;
    case 'total':  return (p.totalJornales||0) >= ach.cond.value;
    default: return false;
  }
}
