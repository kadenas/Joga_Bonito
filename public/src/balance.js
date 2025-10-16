// Balance más duro y nuevas mejoras/logros
export const factorCoste = 1.20; // sube escalado base
export const upgradesDef = [
  // Click
  {id:"martillos",  tipo:"click",      nombre:"Martillos reforzados",    desc:"+1 jornal por tap",                baseCoste:40,   baseEfecto:1},
  {id:"yunque",     tipo:"click",      nombre:"Yunque estable",          desc:"+3 inicial, +2 por nivel",         baseCoste:140,  baseEfecto:3, extraPorNivel:2, unlockJps:3},
  {id:"equipo",     tipo:"click-mult", nombre:"Equipo de remachado",     desc:"x1.15 al tap",                     baseCoste:420,  multiplicador:1.15, unlockJps:12},
  {id:"remaches",   tipo:"click",      nombre:"Remaches templados",      desc:"+2 por tap",                        baseCoste:320,  baseEfecto:2, unlockJps:8},
  {id:"soldadura",  tipo:"click-mult", nombre:"Soplete y soldadura",     desc:"x1.15 al tap",                      baseCoste:800,  multiplicador:1.15, unlockJps:28},
  {id:"plantilla",  tipo:"click",      nombre:"Plantillas de casco",     desc:"+3 por tap",                        baseCoste:900,  baseEfecto:3, unlockJps:22},

  // Pasivo
  {id:"aprendices", tipo:"pasivo",     nombre:"Aprendices",              desc:"+0.35 J/s por nivel",              baseCoste:70,   jps:0.35},
  {id:"capataz",    tipo:"pasivo",     nombre:"Capataz veterano",        desc:"+2.2 J/s por nivel",               baseCoste:260,  jps:2.2, unlockJps:10},
  {id:"carros",     tipo:"pasivo",     nombre:"Carros de varada",        desc:"+3.6 J/s por nivel",               baseCoste:560,  jps:3.6, unlockJps:18},
  {id:"dique",      tipo:"pasivo",     nombre:"Dique seco mejorado",     desc:"+7 J/s por nivel",                 baseCoste:980,  jps:7, unlockJps:26},
  {id:"portrico",   tipo:"pasivo",     nombre:"Grúa pórtico",            desc:"+12 J/s por nivel",                baseCoste:2500, jps:12, unlockJps:60},
  {id:"taller",     tipo:"pasivo",     nombre:"Taller nocturno",         desc:"+24 J/s por nivel",                baseCoste:5600, jps:24, unlockJps:140},
  {id:"aceites",    tipo:"click-mult", nombre:"Aceites y grasas",        desc:"x1.1 al tap y +1 J/s",             baseCoste:1900, multiplicador:1.10, jps:1, unlockJps:45},
  {id:"automat",    tipo:"pasivo",     nombre:"Automatización ligera",   desc:"+50 J/s por nivel",                baseCoste:14000, jps:50, unlockJps:260},
  // Nuevas
  {id:"logistica",  tipo:"pasivo",     nombre:"Logística de muelle",     desc:"+85 J/s por nivel",                baseCoste:24000, jps:85, unlockJps:400},
  {id:"ingenieria", tipo:"click-mult", nombre:"Ingeniería naval",        desc:"x1.2 al tap",                      baseCoste:30000, multiplicador:1.2, unlockJps:520},
  {id:"compuestos", tipo:"click",      nombre:"Compuestos ligeros",      desc:"+8 por tap",                        baseCoste:12000, baseEfecto:8, unlockJps:320},
  {id:"automat2",   tipo:"pasivo",     nombre:"Automatización pesada",   desc:"+140 J/s por nivel",               baseCoste:52000, jps:140, unlockJps:800}
];

export function getDef(id){ return upgradesDef.find(u=>u.id===id); }
export function getUpgradeLevel(state,id){ const u=(state.upgrades||[]).find(x=>x.id===id); return u?(Number(u.nivel)||0):0; }
export function costeSiguiente(def,n){ 
  const nivel = Number(n)||0;
  let cost = def.baseCoste * Math.pow(factorCoste, nivel);
  // suavizado: a partir de nivel 25 la pendiente sube un poco extra
  if (nivel>25) cost *= Math.pow(1.03, nivel-25);
  return Math.floor(cost);
}
export function valorClick(state){
  const g = (id)=>getUpgradeLevel(state,id);
  let base = (Number(state.baseClick)||1) + g("martillos")*1 + (g("yunque")>0?(3+(g("yunque")-1)*2):0) + g("remaches")*2 + g("plantilla")*3 + g("compuestos")*8;
  const mult = Math.pow(1.15,g("equipo")) * Math.pow(1.15,g("soldadura")) * Math.pow(1.1,g("aceites")) * Math.pow(1.2,g("ingenieria"));
  return base * mult;
}
export function jpsTotal(state){
  const g = (id)=>getUpgradeLevel(state,id);
  return g("aprendices")*0.35 + g("capataz")*2.2 + g("carros")*3.6 + g("dique")*7 + g("portrico")*12 + g("taller")*24 + g("aceites")*1 + g("automat")*50 + g("logistica")*85 + g("automat2")*140;
}

/* LOGROS ampliados (30+) */
export const achievementsDef = [
  // taps
  {id:'t50',  titulo:'Calentar muñeca', desc:'50 taps', cond:{type:'taps', value:50}},
  {id:'t200', titulo:'Ritmo de astillero', desc:'200 taps', cond:{type:'taps', value:200}},
  {id:'t1k',  titulo:'Mano firme', desc:'1.000 taps', cond:{type:'taps', value:1000}},
  {id:'t5k',  titulo:'Manos de hierro', desc:'5.000 taps', cond:{type:'taps', value:5000}},
  {id:'t20k', titulo:'Brazo biónico', desc:'20.000 taps', cond:{type:'taps', value:20000}},
  {id:'t50k', titulo:'Resistencia legendaria', desc:'50.000 taps', cond:{type:'taps', value:50000}},
  // jps
  {id:'j5',   titulo:'Producción básica', desc:'5 J/s', cond:{type:'maxJps', value:5}},
  {id:'j15',  titulo:'Turno rentable', desc:'15 J/s', cond:{type:'maxJps', value:15}},
  {id:'j50',  titulo:'Capataz de verdad', desc:'50 J/s', cond:{type:'maxJps', value:50}},
  {id:'j120', titulo:'Varadero en marcha', desc:'120 J/s', cond:{type:'maxJps', value:120}},
  {id:'j300', titulo:'Industria local', desc:'300 J/s', cond:{type:'maxJps', value:300}},
  {id:'j800', titulo:'A todo vapor', desc:'800 J/s', cond:{type:'maxJps', value:800}},
  {id:'j1500', titulo:'Turbinas encendidas', desc:'1.500 J/s', cond:{type:'maxJps', value:1500}},
  {id:'j3500', titulo:'Dominio del astillero', desc:'3.500 J/s', cond:{type:'maxJps', value:3500}},
  // compras
  {id:'c5',   titulo:'Primer catálogo', desc:'5 compras', cond:{type:'compras', value:5}},
  {id:'c20',  titulo:'Jefe de cuadrilla', desc:'20 compras', cond:{type:'compras', value:20}},
  {id:'c60',  titulo:'Mayorista', desc:'60 compras', cond:{type:'compras', value:60}},
  {id:'c150', titulo:'Proveedor favorito', desc:'150 compras', cond:{type:'compras', value:150}},
  {id:'c220', titulo:'Almacén siempre lleno', desc:'220 compras', cond:{type:'compras', value:220}},
  {id:'c400', titulo:'Consorcio aliado', desc:'400 compras', cond:{type:'compras', value:400}},
  // barcos
  {id:'b3',   titulo:'Tres en grada', desc:'3 barcos', cond:{type:'barcos', value:3}},
  {id:'b6',   titulo:'Media dársena', desc:'6 barcos', cond:{type:'barcos', value:6}},
  {id:'b12',  titulo:'Dársena llena', desc:'12 barcos', cond:{type:'barcos', value:12}},
  {id:'b18',  titulo:'Cola hasta la ría', desc:'18 barcos', cond:{type:'barcos', value:18}},
  {id:'b20',  titulo:'Dársena interminable', desc:'20 barcos', cond:{type:'barcos', value:20}},
  // total moneda
  {id:'m50k',  titulo:'Jornada larga', desc:'50.000 jornales acumulados', cond:{type:'total', value:50000}},
  {id:'m1m',   titulo:'Semana en el varadero', desc:'1.000.000 jornales acumulados', cond:{type:'total', value:1000000}},
  {id:'m25m',  titulo:'Contrato gordo', desc:'25.000.000 jornales acumulados', cond:{type:'total', value:25000000}},
  {id:'m250m', titulo:'Astillero global', desc:'250.000.000 jornales acumulados', cond:{type:'total', value:250000000}},
  // hitos de desbloqueo
  {id:'u-equipo',   titulo:'Equipo listo', desc:'Desbloquea “Equipo de remachado”', cond:{type:'maxJps', value:12}},
  {id:'u-portrico', titulo:'Brazo de acero', desc:'Desbloquea “Grúa pórtico”', cond:{type:'maxJps', value:60}},
  {id:'u-auto',     titulo:'Turno automático', desc:'Desbloquea “Automatización ligera”', cond:{type:'maxJps', value:260}},
  {id:'u-log',      titulo:'Cadena de suministro', desc:'Desbloquea “Logística de muelle”', cond:{type:'maxJps', value:400}},
  {id:'u-comp',     titulo:'Materiales innovadores', desc:'Desbloquea “Compuestos ligeros”', cond:{type:'maxJps', value:320}},
  {id:'u-ing',      titulo:'Ingeniería aplicada', desc:'Desbloquea “Ingeniería naval”', cond:{type:'maxJps', value:520}},
  {id:'u-auto2',    titulo:'Astillero autónomo', desc:'Desbloquea “Automatización pesada”', cond:{type:'maxJps', value:800}}
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
