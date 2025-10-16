import { buyUpgrade, doTap } from './main.js';
import { upgradesDef, costeSiguiente, getUpgradeLevel } from './balance.js';
import * as audio from './audio.js';

let $contador,$jps,$bonusBar,$bonusText,$tapBoat,$tapFx,$popupRoot,$dock,$shopList;
const shopNodes = new Map();
let _lastPointerTs = 0;

export function initUI(){
  $contador  = document.getElementById('contador')  || $contador;
  $jps       = document.getElementById('jps')       || $jps;
  $bonusBar  = document.getElementById('bonusBar')  || $bonusBar;
  $bonusText = document.getElementById('bonusText') || $bonusText;
  $tapBoat   = document.getElementById('tapBoat')   || $tapBoat;
  $tapFx     = document.getElementById('tapFx')     || $tapFx;
  $popupRoot = document.getElementById('popupRoot') || $popupRoot;
  $dock      = document.getElementById('dock')      || $dock;
  $shopList  = document.getElementById('shopList')  || $shopList;

  wireTapBoat();
}

/* ------------ TAP DEL BARCO (robusto) ------------ */
function wireTapBoat(){
  if (!$tapBoat || $tapBoat.__wired) return;

  const onTap = ev=>{
    const now = performance.now();
    if (now - _lastPointerTs < 140) return; // anti doble disparo (down/up)
    _lastPointerTs = now;

    ev.preventDefault?.();
    ev.stopPropagation?.();

    const gain = doTap();      // suma y refresca HUD/tienda
    showTapFloat(gain);        // indicador +X grande
  };

  // Usar solo pointerdown; tragarse el click fantasma (iOS/Android).
  $tapBoat.addEventListener('pointerdown', onTap, {passive:false});
  $tapBoat.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); }, {capture:true});
  $tapBoat.__wired = true;

  // Garantizar el contenedor de FX
  if (!$tapFx){
    const fx = document.createElement('div');
    fx.id = 'tapFx';
    $tapBoat.parentElement?.appendChild(fx);
    $tapFx = fx;
  }
}

export function showTapFloat(gain){
  if (!$tapFx) return;
  const n = document.createElement('div');
  n.className = 'tapFloat';
  const g = (typeof gain === 'number' && isFinite(gain)) ? gain : 0;
  n.textContent = `+${fmt(g)}`;
  n.style.left = '50%';
  n.style.top  = '50%';
  n.style.transform = 'translate(-50%,-10%)';
  $tapFx.appendChild(n);
  setTimeout(()=> n.remove(), 900);
}

/* ------------ HUD ------------ */
export function renderHUD(s){
  if (!$contador || !$jps || !$bonusBar || !$bonusText) initUI();
  if ($contador) $contador.textContent = fmt(s.jornales);
  if ($jps)      $jps.textContent      = `${fmt(s.jornalesPerSec)} Jornales/s`;
  const cd=s.bonus.cooldown, total=s.bonus.cooldownMax+s.bonus.duration;
  const pct = s.bonus.active ? 100 : (cd>0 ? 100 - Math.floor((cd/total)*100) : 100);
  if ($bonusBar)  $bonusBar.style.width = pct + '%';
  if ($bonusText) $bonusText.textContent = s.bonus.active ? 'Marea viva activa' : (cd>0 ? 'Marea en enfriamiento' : 'Marea viva lista');
}

/* ------------ POPUPS / TOASTS ------------ */
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

/* ------------ EFECTOS VISUALES ------------ */
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

/* ------------ TIENDA (sin parpadeos) ------------ */
export function buildShop(){
  $shopList = document.getElementById('shopList');
  if (!$shopList) return;
  $shopList.innerHTML = '';
  shopNodes.clear();

  upgradesDef.forEach(def=>{
    const root = document.createElement('div'); root.className='item'; root.dataset.id=def.id;
    const info = document.createElement('div');
    const title = document.createElement('h3');
    const level = document.createElement('span'); level.className='level'; level.textContent='Nivel 0';
    title.textContent = def.nombre + ' '; title.appendChild(level);
    const desc = document.createElement('p'); desc.textContent = def.desc || '';
    info.appendChild(title); info.appendChild(desc);

    const row2 = document.createElement('div'); row2.className='row2';
    const price = document.createElement('div'); price.className='price'; price.textContent='Coste 0';
    const btn = document.createElement('button'); btn.type='button'; btn.className='buy'; btn.textContent='Comprar';
    btn.addEventListener('click', ()=> buyUpgrade(def.id));
    row2.appendChild(price); row2.appendChild(btn);

    root.appendChild(info); root.appendChild(row2);
    $shopList.appendChild(root);
    shopNodes.set(def.id, { root, levelEl:level, priceEl:price, buyBtn:btn, def });
  });
}

export function updateShop(state){
  if (!shopNodes.size) return;
  for (const [id, node] of shopNodes){
    const def = node.def;
    if (def.unlockJps && state.jornalesPerSec < def.unlockJps){
      node.root.classList.add('locked');
      node.levelEl.textContent = 'Bloqueado';
      node.priceEl.textContent = `Desbloquea a ${def.unlockJps} J/s`;
      node.buyBtn.disabled = true;
      continue;
    } else {
      node.root.classList.remove('locked');
    }
    const nivel = getUpgradeLevel(state, id);
    const coste = costeSiguiente(def, nivel);
    node.levelEl.textContent = `Nivel ${nivel}`;
    node.priceEl.textContent = `Coste ${fmt(coste)}`;
    node.buyBtn.disabled = !(state.jornales >= coste);
  }
}

/* ------------ util ------------ */
function fmt(n){
  const num = Number(n)||0;
  if (Math.abs(num) >= 1e12) return num.toExponential(2).replace('+','');
  if (Math.abs(num) >= 1e9)  return (num/1e9).toFixed(2)+'B';
  if (Math.abs(num) >= 1e6)  return (num/1e6).toFixed(2)+'M';
  if (Math.abs(num) >= 1e3)  return (num/1e3).toFixed(2)+'K';
  return Math.floor(num).toString();
}
