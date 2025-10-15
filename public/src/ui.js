import { upgradesDef, costeSiguiente, getUpgradeLevel } from './balance.js';
import { buyUpgrade } from './main.js';

// HUD mínimo; si ya tienes más UI, conserva y añade estos refs
let $contador,$jps,$bonusBar,$bonusText;
let $rowBarcos,$rowObreros,$rowGruas,$sumBarcos,$sumObreros,$sumGruas;
let $shopList;
let _shopSig = '';
let _lastRenderMs = 0;

export function initUI(){
  $contador = document.getElementById('contador');
  $jps = document.getElementById('jps');
  $bonusBar = document.getElementById('bonusBar');
  $bonusText = document.getElementById('bonusText');
}
export function renderHUD(s){
  if (!$contador) return;
  $contador.textContent = fmt(s.jornales);
  $jps.textContent = `${fmt(s.jornalesPerSec)} Jornales/s`;

  const cd = s.bonus.cooldown;
  const total = s.bonus.cooldownMax + s.bonus.duration;
  const pct = s.bonus.active ? 100 : (cd>0 ? 100 - Math.floor((cd/total)*100) : 100);
  if ($bonusBar) $bonusBar.style.width = pct + '%';
  if ($bonusText) $bonusText.textContent = s.bonus.active ? 'Marea viva activa' : (cd>0 ? 'Marea en enfriamiento' : 'Marea viva lista');
}

/* ---------- TIENDA ---------- */
export function mountShop(){
  $shopList = document.getElementById('shopList');
}

export function invalidateShop(){
  _shopSig = '';
}

export function renderShop(state){
  if (!$shopList) return;
  const now = performance.now();
  if (now - _lastRenderMs < 250) return;
  _lastRenderMs = now;

  const sig = upgradesDef.map((def)=>`${def.id}:${getUpgradeLevel(state, def.id)}`).join('|') + '|' + Math.floor(state.jornales);
  if (sig === _shopSig) return;
  _shopSig = sig;

  const html = upgradesDef.map((def)=>{
    const nivel = getUpgradeLevel(state, def.id);
    const coste = costeSiguiente(def, nivel);
    const afford = state.jornales >= coste;
    const desc = def.desc || '';
    return `
      <div class="item" data-id="${def.id}">
        <div>
          <h3>${def.nombre} <span class="level">Nivel ${nivel}</span></h3>
          <p>${desc}</p>
        </div>
        <div class="row2">
          <div class="price">Coste ${fmt(coste)}</div>
          <button type="button" class="buy" data-id="${def.id}" ${afford ? '' : 'disabled'} onclick="window.Astillero && Astillero.buyUpgrade && Astillero.buyUpgrade('${def.id}')">Comprar</button>
        </div>
      </div>
    `;
  }).join('');

  $shopList.innerHTML = html;

  $shopList.querySelectorAll('button.buy').forEach((btn)=>{
    btn.addEventListener('click', (ev)=>{
      if (btn.disabled) return;
      const id = btn.dataset.id;
      try {
        buyUpgrade(id);
      } catch (err) {
        console.error(err);
      }
      ev.stopPropagation();
    });
  });
}

// Dársena
export function initDarsena(){
  $rowBarcos = document.querySelector('#row-barcos .tokens');
  $rowObreros = document.querySelector('#row-obreros .tokens');
  $rowGruas   = document.querySelector('#row-gruas .tokens');
  $sumBarcos  = document.getElementById('sum-barcos');
  $sumObreros = document.getElementById('sum-obreros');
  $sumGruas   = document.getElementById('sum-gruas');
}

function renderTokens(container, count, factory){
  if (!container) return;
  const cur = container.children.length;
  for (let i=cur;i<count;i++) container.appendChild(factory(i));
  for (let i=container.children.length-1;i>=count;i--) container.removeChild(container.children[i]);
}
function ship(i){
  const d = document.createElement('div');
  d.className = 'token ship';
  d.style.animationDelay = (i*0.13)+'s';
  d.innerHTML = `<svg viewBox="0 0 64 64">
    <use href="#ship-hull"></use><use href="#ship-cabin"></use><use href="#ship-mast"></use>
  </svg>`;
  return d;
}
function worker(i){
  const d = document.createElement('div');
  d.className = 'token worker';
  d.style.animationDelay = (i*0.11)+'s';
  d.innerHTML = `<svg viewBox="0 0 64 64"><use href="#worker"></use></svg>`;
  return d;
}
function crane(i){
  const d = document.createElement('div');
  d.className = 'token crane';
  d.style.animationDelay = (i*0.2)+'s';
  d.innerHTML = `<svg viewBox="0 0 64 64"><use href="#crane"></use></svg>`;
  return d;
}
export function updateDarsena({barcos,obreros,gruas}){
  renderTokens($rowBarcos, barcos, ship);
  renderTokens($rowObreros, obreros, worker);
  renderTokens($rowGruas, gruas, crane);
  if ($sumBarcos)  $sumBarcos.textContent  = String(barcos);
  if ($sumObreros) $sumObreros.textContent = String(obreros);
  if ($sumGruas)   $sumGruas.textContent   = String(gruas);
}

// util
function fmt(n){
  if (!isFinite(n)) return '∞';
  if (Math.abs(n) >= 1e12) return n.toExponential(2).replace('+','');
  const a = Math.abs(n);
  if (a>=1e9) return (n/1e9).toFixed(2)+'B';
  if (a>=1e6) return (n/1e6).toFixed(2)+'M';
  if (a>=1e3) return (n/1e3).toFixed(2)+'K';
  return Math.floor(n).toString();
}
