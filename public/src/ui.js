import { upgradesDef, costeSiguiente, getUpgradeLevel } from './balance.js';
import { buyUpgrade } from './main.js';
import * as audio from './audio.js';

let $contador,$jps,$bonusBar,$bonusText,$tapBoat,$tapFx,$popupRoot,$dock;
let $shopList; const shopNodes = new Map();

export function initUI(){
  $contador  = document.getElementById('contador')  || $contador;
  $jps       = document.getElementById('jps')       || $jps;
  $bonusBar  = document.getElementById('bonusBar')  || $bonusBar;
  $bonusText = document.getElementById('bonusText') || $bonusText;
  $tapBoat   = document.getElementById('tapBoat')   || $tapBoat;
  $tapFx     = document.getElementById('tapFx')     || $tapFx;
  $popupRoot = document.getElementById('popupRoot') || $popupRoot;
  $dock      = document.getElementById('dock')      || $dock;

  // Swallow ghost clicks (ya hecho en versiones previas si aplica)
}

export function renderHUD(s){
  if (!$contador||!$jps||!$bonusBar||!$bonusText) initUI();
  if ($contador) $contador.textContent = fmt(s.jornales);
  if ($jps) $jps.textContent = `${fmt(s.jornalesPerSec)} Jornales/s`;
  const cd=s.bonus.cooldown, total=s.bonus.cooldownMax+s.bonus.duration;
  const pct = s.bonus.active?100:(cd>0?100-Math.floor((cd/total)*100):100);
  if ($bonusBar)  $bonusBar.style.width = pct+'%';
  if ($bonusText) $bonusText.textContent = s.bonus.active?'Marea viva activa':(cd>0?'Marea en enfriamiento':'Marea viva lista');
}

/* ---------- POPUPS / TOASTS ---------- */
export function showAchievementToast(ach){
  if (!$popupRoot) return;
  const d = document.createElement('div');
  d.className = 'toast';
  d.innerHTML = `
    <h4>🏆 Logro: ${ach.titulo}</h4>
    <div style="opacity:.9;margin:4px 0 10px">${ach.desc||''}</div>
    <div class="row"><button type="button" class="btn">Vale</button></div>
  `;
  const btn = d.querySelector('.btn');
  btn.addEventListener('click', ()=> d.remove());
  $popupRoot.appendChild(d);
  audio.playAchievement?.();
  setTimeout(()=>d.remove(), 4000);
}

/* ---------- EFECTOS VISUALES ---------- */
export function flashDock(){
  if (!$dock) return;
  $dock.classList.add('flash');
  audio.playShip?.();
  setTimeout(()=> $dock && $dock.classList.remove('flash'), 600);
}
export function flashShopItem(id){
  const node = shopNodes.get(id); if (!node) return;
  node.root.classList.add('flash');
  audio.playFlash?.();
  setTimeout(()=> node.root.classList.remove('flash'), 400);
}

/* ---------- TIENDA ---------- */
export function buildShop(){
  $shopList = document.getElementById('shopList');
  if (!$shopList) return;
  $shopList.innerHTML=''; shopNodes.clear();
  upgradesDef.forEach(def=>{
    const root=document.createElement('div'); root.className='item'; root.dataset.id=def.id;
    const info=document.createElement('div'); const title=document.createElement('h3');
    const level=document.createElement('span'); level.className='level'; level.textContent='Nivel 0';
    title.textContent=def.nombre+' '; title.appendChild(level);
    const desc=document.createElement('p'); desc.textContent=def.desc||'';
    info.appendChild(title); info.appendChild(desc);
    const row2=document.createElement('div'); row2.className='row2';
    const price=document.createElement('div'); price.className='price'; price.textContent='Coste 0';
    const btn=document.createElement('button'); btn.type='button'; btn.className='buy'; btn.textContent='Comprar';
    btn.addEventListener('click', ()=> buyUpgrade(def.id));
    row2.appendChild(price); row2.appendChild(btn);
    root.appendChild(info); root.appendChild(row2);
    $shopList.appendChild(root);
    shopNodes.set(def.id,{root,levelEl:level,priceEl:price,buyBtn:btn,def});
  });
}
export function updateShop(state){
  if (!shopNodes.size) return;
  for (const [id, node] of shopNodes){
    const def=node.def;
    if (def.unlockJps && state.jornalesPerSec < def.unlockJps){
      node.root.classList.add('locked');
      node.levelEl.textContent='Bloqueado';
      node.priceEl.textContent=`Desbloquea a ${def.unlockJps} J/s`;
      node.buyBtn.disabled=true; continue;
    } else node.root.classList.remove('locked');
    const nivel=getUpgradeLevel(state,id);
    const coste=costeSiguiente(def,nivel);
    node.levelEl.textContent=`Nivel ${nivel}`;
    node.priceEl.textContent=`Coste ${fmt(coste)}`;
    node.buyBtn.disabled=!(state.jornales>=coste);
  }
}

/* utils */
function fmt(n){ const num=Number(n)||0;
  if (Math.abs(num)>=1e12) return num.toExponential(2).replace('+','');
  if (Math.abs(num)>=1e9)  return (num/1e9).toFixed(2)+'B';
  if (Math.abs(num)>=1e6)  return (num/1e6).toFixed(2)+'M';
  if (Math.abs(num)>=1e3)  return (num/1e3).toFixed(2)+'K';
  return Math.floor(num).toString();
}
