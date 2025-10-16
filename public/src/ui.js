import { upgradesDef, costeSiguiente, getUpgradeLevel, achievementsDef } from './balance.js';
import { buyUpgrade, doTap, state } from './main.js';

// HUD mínimo; si ya tienes más UI, conserva y añade estos refs
let $contador,$jps,$bonusBar,$bonusText;
let $rowBarcos,$rowObreros,$rowGruas,$sumBarcos,$sumObreros,$sumGruas;
let $shopList;
const shopNodes = new Map();
let $achList,$achCount;
let _achSig = '';
let $tapBoat,$tapFx;
let _popTimer = 0;
let _lastPointerTs = 0;

export function initUI(){
  $contador = document.getElementById('contador') || $contador;
  $jps = document.getElementById('jps') || $jps;
  $bonusBar = document.getElementById('bonusBar') || $bonusBar;
  $bonusText = document.getElementById('bonusText') || $bonusText;

  initTapBoat();

  const dockPanel = document.getElementById('dockPanel');
  if (dockPanel){
    const mq = window.matchMedia('(min-width: 768px)');
    const syncDock = ()=>{
      if (mq.matches){
        dockPanel.setAttribute('open','');
      }
    };
    syncDock();
    mq.addEventListener?.('change', syncDock);
  }

}
export function renderHUD(s){
  if (!$contador || !$jps || !$bonusBar || !$bonusText) initUI();

  if ($contador) $contador.textContent = fmt(s.jornales);
  if ($jps){
    const perma = s.bonus?.permaMult ?? 1;
    const permaLabel = perma > 1 ? ` · x${perma.toFixed(2)}` : '';
    $jps.textContent = `${fmt(s.jornalesPerSec)} Jornales/s${permaLabel}`;
  }

  const cd = s.bonus.cooldown;
  const total = s.bonus.cooldownMax + s.bonus.duration;
  const pct = s.bonus.active ? 100 : (cd>0 ? 100 - Math.floor((cd/total)*100) : 100);
  if ($bonusBar) $bonusBar.style.width = pct + '%';
  if ($bonusText) $bonusText.textContent = s.bonus.active ? 'Marea viva activa' : (cd>0 ? 'Marea en enfriamiento' : 'Marea viva lista');
}

/* ---------- TIENDA ---------- */
export function mountShop(){
  $shopList = document.getElementById('shopList') || $shopList;
  if (!$shopList || shopNodes.size) return;
  buildShop();
}

export function mountAchievements(){
  $achList = document.getElementById('achList');
  $achCount = document.getElementById('achCount');
}

export function invalidateShop(){
  if ($shopList) $shopList.innerHTML = '';
  shopNodes.clear();
}

export function updateShop(state){
  if (!$shopList) {
    $shopList = document.getElementById('shopList') || $shopList;
  }
  if (!$shopList) return;
  if (!shopNodes.size) buildShop();

  const currentJps = state.jornalesPerSec ?? 0;

  upgradesDef.forEach((def)=>{
    const node = shopNodes.get(def.id);
    if (!node) return;

    if (def.unlockJps && currentJps < def.unlockJps){
      const ratio = def.unlockJps ? currentJps / def.unlockJps : 0;
      if (ratio < 0.8){
        node.root.style.display = 'none';
        return;
      }
      node.root.style.display = '';
      node.root.classList.add('locked');
      node.levelEl.textContent = '';
      node.descEl.textContent = `Desbloquea al alcanzar ${fmt(def.unlockJps)} J/s`;
      node.priceEl.textContent = '🔒';
      node.buyBtn.disabled = true;
      node.buyBtn.style.display = 'none';
      return;
    }

    node.root.style.display = '';
    node.root.classList.remove('locked');

    const nivel = getUpgradeLevel(state, def.id);
    const coste = costeSiguiente(def, nivel);
    const afford = state.jornales >= coste;

    node.levelEl.textContent = `Nivel ${nivel}`;
    node.descEl.textContent = def.desc || '';
    node.priceEl.textContent = `Coste ${fmt(coste)}`;
    node.buyBtn.disabled = !afford;
    node.buyBtn.style.display = '';
  });
}

export function buildShop(){
  $shopList = document.getElementById('shopList') || $shopList;
  if (!$shopList) return;

  $shopList.innerHTML = '';
  shopNodes.clear();

  upgradesDef.forEach((def)=>{
    const root = document.createElement('div');
    root.className = 'item';
    root.dataset.id = def.id;

    const info = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = def.nombre + ' ';
    const level = document.createElement('span');
    level.className = 'level';
    level.textContent = 'Nivel 0';
    title.appendChild(level);

    const desc = document.createElement('p');
    desc.textContent = def.desc || '';

    info.appendChild(title);
    info.appendChild(desc);

    const row2 = document.createElement('div');
    row2.className = 'row2';
    const price = document.createElement('div');
    price.className = 'price';
    price.textContent = 'Coste 0';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'buy';
    btn.textContent = 'Comprar';
    btn.dataset.id = def.id;
    btn.addEventListener('click', ()=>{
      if (btn.disabled) return;
      buyUpgrade(def.id);
    });

    row2.appendChild(price);
    row2.appendChild(btn);

    root.appendChild(info);
    root.appendChild(row2);
    root.style.display = 'none';

    $shopList.appendChild(root);
    shopNodes.set(def.id, { root, levelEl: level, descEl: desc, priceEl: price, buyBtn: btn });
  });
}

export function renderAchievements(currentState){
  if (!$achList) return;
  const claimed = currentState.achievements?.claimed || {};
  const sig = achievementsDef.map((ach)=>`${ach.id}:${claimed[ach.id] ? '1' : '0'}`).join('|');
  if (sig === _achSig) return;
  _achSig = sig;

  const total = achievementsDef.length;
  const done = achievementsDef.reduce((acc, ach)=> acc + (claimed[ach.id] ? 1 : 0), 0);
  if ($achCount) $achCount.textContent = `(${done}/${total})`;

  const html = achievementsDef.map((ach)=>{
    const ok = !!claimed[ach.id];
    return `
      <div class="ach ${ok ? '' : 'locked'}">
        <div>
          <div style="font-weight:800">${ach.titulo}</div>
          <div class="desc">${ach.desc}</div>
        </div>
        <div class="state">${ok ? 'Conseguido' : 'Bloqueado'}</div>
      </div>
    `;
  }).join('');

  $achList.innerHTML = html;
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

export function initTapBoat(){
  $tapBoat = document.getElementById('tapBoat') || $tapBoat;
  $tapFx = document.getElementById('tapFx') || $tapFx;

  if (!$tapBoat || $tapBoat.dataset.tapReady) return;
  $tapBoat.dataset.tapReady = '1';

  const triggerTap = (evt)=>{
    const count = 10 + Math.floor(Math.random()*11);
    spawnParticles(evt, count);
    const gain = doTap();
    showTapFloat(gain, evt);
    if (state.settings?.vibrate !== false && navigator.vibrate){
      try { navigator.vibrate(12); } catch (err) { /* ignore */ }
    }
    $tapBoat.classList.add('pop');
    clearTimeout(_popTimer);
    _popTimer = window.setTimeout(()=>{
      $tapBoat?.classList.remove('pop');
    }, 160);
  };

  const handlePointer = (evt)=>{
    if (evt.button !== undefined && evt.button !== 0) return;
    const now = performance.now();
    if (now - _lastPointerTs < 140) return;
    _lastPointerTs = now;
    evt.stopPropagation?.();
    evt.preventDefault?.();
    triggerTap(evt);
  };

  const handleKey = (evt)=>{
    if (evt.key === 'Enter' || evt.key === ' '){
      evt.preventDefault();
      triggerTap(null);
    }
  };

  $tapBoat.addEventListener('pointerdown', handlePointer, {passive:false});
  $tapBoat.addEventListener('click', (evt)=>{
    evt.preventDefault();
    evt.stopPropagation();
  }, {capture:true});
  $tapBoat.addEventListener('keydown', handleKey);
}

function spawnParticles(evt, n){
  if (!$tapBoat || !$tapFx) return;
  const rect = $tapBoat.getBoundingClientRect();
  const point = getEventPoint(evt);
  const originX = point ? point.x - rect.left : rect.width / 2;
  const originY = point ? point.y - rect.top : rect.height / 2;

  for (let i = 0; i < n; i++){
    const particle = document.createElement('div');
    particle.className = 'particle';
    const dx = (Math.random()*80) - 40;
    const dy = 60 + Math.random()*60;
    const rot = (Math.random()*100) - 50;
    const offsetX = originX + (Math.random()*12 - 6);
    const offsetY = originY + (Math.random()*12 - 6);
    particle.style.left = `${offsetX}px`;
    particle.style.top = `${offsetY}px`;
    particle.style.setProperty('--dx', dx.toFixed(1)+'px');
    particle.style.setProperty('--dy', dy.toFixed(1)+'px');
    particle.style.setProperty('--rot', rot.toFixed(1)+'deg');
    $tapFx.appendChild(particle);
    window.setTimeout(()=>{ particle.remove(); }, 720);
  }
}

function showTapFloat(value, evt){
  const host = $tapFx = document.getElementById('tapFx') || $tapFx;
  if (!host) return;
  const safe = Math.max(0, Number(value)||0);
  const node = document.createElement('div');
  node.className = 'tapFloat';
  node.textContent = `+${fmt(safe)}`;

  const rect = host.getBoundingClientRect();
  const point = getEventPoint(evt);
  const left = point ? point.x - rect.left : rect.width / 2;
  const top = point ? point.y - rect.top : rect.height / 2;
  node.style.left = `${left}px`;
  node.style.top = `${top}px`;

  host.appendChild(node);
  window.setTimeout(()=>{ node.remove(); }, 850);
}

function getEventPoint(evt){
  if (!evt) return null;
  if ('touches' in evt && evt.touches?.length){
    return { x: evt.touches[0].clientX, y: evt.touches[0].clientY };
  }
  if ('changedTouches' in evt && evt.changedTouches?.length){
    return { x: evt.changedTouches[0].clientX, y: evt.changedTouches[0].clientY };
  }
  if (typeof evt.clientX === 'number' && typeof evt.clientY === 'number'){
    return { x: evt.clientX, y: evt.clientY };
  }
  return null;
}

// util
function fmt(value){
  const num = Number(value);
  if (!Number.isFinite(num)) return '0';
  const abs = Math.abs(num);
  if (abs >= 1e12) return num.toExponential(2).replace('+','');
  if (abs >= 1e9) return (num/1e9).toFixed(2)+'B';
  if (abs >= 1e6) return (num/1e6).toFixed(2)+'M';
  if (abs >= 1e3) return (num/1e3).toFixed(2)+'K';
  return Math.floor(num).toString();
}
