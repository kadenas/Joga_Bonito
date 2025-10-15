import { upgradesDef, costeSiguiente, getUpgradeLevel, achievementsDef, canClaim, isAchieved, applyReward } from './balance.js';
import { buyUpgrade, doTap, state } from './main.js';
import * as audio from './audio.js';

// HUD mínimo; si ya tienes más UI, conserva y añade estos refs
let $contador,$jps,$bonusBar,$bonusText;
let $rowBarcos,$rowObreros,$rowGruas,$sumBarcos,$sumObreros,$sumGruas;
let $shopList;
const shopNodes = new Map();
let $achList;
let _achSig = '';
let _toastNode = null;
let _toastTimer = 0;
let $tapBoat,$tapFx;
let _popTimer = 0;

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

  const navShop = document.getElementById('navShop');
  navShop?.addEventListener('click', ()=>{
    const panel = document.getElementById('shopPanel');
    panel?.setAttribute('open','');
    panel?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
  const navSettings = document.getElementById('navSettings');
  navSettings?.addEventListener('click', ()=>{
    document.getElementById('settingsPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });
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

function buildShop(){
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
  const sig = achievementsDef.map((ach)=>{
    const status = claimed[ach.id] ? 'C' : (canClaim(currentState, ach) ? 'R' : (isAchieved(currentState, ach) ? 'A' : 'L'));
    return `${ach.id}:${status}`;
  }).join('|');
  if (sig === _achSig) return;
  _achSig = sig;

  const html = achievementsDef.map((ach)=>{
    const wasClaimed = !!claimed[ach.id];
    const readyNow = canClaim(currentState, ach);
    const achieved = !wasClaimed && (readyNow || isAchieved(currentState, ach));
    const stateLabel = wasClaimed ? 'Reclamado' : (readyNow ? 'Reclamar' : 'Bloqueado');
    const extraClass = wasClaimed ? 'claimed' : (readyNow ? 'ready' : (achieved ? 'achieved' : 'locked'));
    const button = readyNow ? `<button type="button" class="ach-claim" data-claim="${ach.id}">Reclamar</button>` : `<span class="status">${stateLabel}</span>`;
    return `
      <article class="item achievement ${extraClass}" data-ach="${ach.id}">
        <div>
          <h3>${ach.titulo}</h3>
          <p>${ach.desc}</p>
        </div>
        <div class="row2">
          ${button}
        </div>
      </article>
    `;
  }).join('');

  $achList.innerHTML = html;
  $achList.querySelectorAll('button[data-claim]').forEach((btn)=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.claim;
      claimAchievement(id);
    });
  });
}

export function claimAchievement(id){
  const ach = achievementsDef.find((a)=>a.id === id);
  if (!ach) return;
  if (!canClaim(state, ach)) return;
  applyReward(state, ach);
  state.achievements.claimed[ach.id] = true;
  if (state.achievements.ready) delete state.achievements.ready[ach.id];
  renderHUD?.(state);
  renderAchievements?.(state);
  if (_toastNode){
    _toastNode.remove();
    _toastNode = null;
  }
}

export function showAchievementToast(ach){
  if (!ach) return;
  if (_toastNode){
    _toastNode.remove();
    _toastNode = null;
  }
  if (_toastTimer){
    clearTimeout(_toastTimer);
    _toastTimer = 0;
  }
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <strong>¡Logro listo!</strong>
    <div>${ach.titulo}</div>
    <button type="button" class="ach-claim" data-toast-claim="${ach.id}">Reclamar</button>
  `;
  document.body.appendChild(toast);
  _toastNode = toast;
  const btn = toast.querySelector('button[data-toast-claim]');
  btn?.addEventListener('click', ()=>{
    claimAchievement(ach.id);
    toast.remove();
    _toastNode = null;
  });
  _toastTimer = window.setTimeout(()=>{
    toast?.classList.add('fade');
    window.setTimeout(()=>{
      if (toast === _toastNode){
        toast.remove();
        _toastNode = null;
      }
    }, 500);
  }, 4000);
  audio.playAchievement?.();
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
  $tapBoat = document.getElementById('tapBoat');
  $tapFx = document.getElementById('tapFx');
  if (!$tapBoat) return;
  if ($tapBoat.dataset.tapReady) return;
  $tapBoat.dataset.tapReady = '1';

  const handlePointer = (evt)=>{
    if (evt.button !== undefined && evt.button !== 0) return;
    evt.stopPropagation?.();
    evt.preventDefault?.();
    const count = 10 + Math.floor(Math.random()*11);
    spawnParticles(evt, count);
    doTap();
    if (state.settings?.vibrate !== false && navigator.vibrate){
      try { navigator.vibrate(12); } catch (err) { /* ignore */ }
    }
    $tapBoat.classList.add('pop');
    clearTimeout(_popTimer);
    _popTimer = window.setTimeout(()=>{
      $tapBoat?.classList.remove('pop');
    }, 160);
  };

  const handleKey = (evt)=>{
    if (evt.key === 'Enter' || evt.key === ' '){
      evt.preventDefault();
      const count = 10 + Math.floor(Math.random()*11);
      spawnParticles(null, count);
      doTap();
      if (state.settings?.vibrate !== false && navigator.vibrate){
        try { navigator.vibrate(12); } catch (err) { /* ignore */ }
      }
      $tapBoat.classList.add('pop');
      clearTimeout(_popTimer);
      _popTimer = window.setTimeout(()=>{
        $tapBoat?.classList.remove('pop');
      }, 160);
    }
  };

  if (window.PointerEvent){
    $tapBoat.addEventListener('pointerdown', handlePointer);
  } else {
    $tapBoat.addEventListener('click', handlePointer);
  }
  $tapBoat.addEventListener('keydown', handleKey);
}

function spawnParticles(evt, n){
  if (!$tapBoat || !$tapFx) return;
  const rect = $tapBoat.getBoundingClientRect();
  let clientX = rect.left + rect.width/2;
  let clientY = rect.top + rect.height/2;

  if (evt && 'touches' in evt && evt.touches?.length){
    clientX = evt.touches[0].clientX;
    clientY = evt.touches[0].clientY;
  } else if (evt && 'changedTouches' in evt && evt.changedTouches?.length){
    clientX = evt.changedTouches[0].clientX;
    clientY = evt.changedTouches[0].clientY;
  } else if (evt && typeof evt.clientX === 'number'){ 
    clientX = evt.clientX;
    clientY = evt.clientY;
  }

  const originX = clientX - rect.left;
  const originY = clientY - rect.top;

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
