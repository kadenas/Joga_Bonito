import { buyUpgrade, doTap, toggleBonus } from './main.js';
import { upgradesDef, costeSiguiente, getUpgradeLevel, achievementsDef } from './balance.js';
import * as audio from './audio.js';
import * as save from './save.js';

let $contador,$jps,$bonusBar,$bonusText,$tapBoat,$tapFx,$popupRoot;
let $btnBonus,$navDock,$navShop,$navAch,$dockPanel,$shopPanel,$achPanel,$dockShips,$dockWorkers,$dockCranes;
let $shopList,$achList,$achCount,$dock;
let $muteBtn,$resetBtn;
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
  $muteBtn   = document.getElementById('muteBtn')   || $muteBtn;
  $resetBtn  = document.getElementById('btnReset')  || $resetBtn;
  $btnBonus  = document.getElementById('btnBonus')  || $btnBonus;

  $dockPanel = document.getElementById('dockPanel') || $dockPanel;
  $shopPanel = document.getElementById('shopPanel') || $shopPanel;
  $achPanel  = document.getElementById('achPanel')  || $achPanel;
  $navDock   = document.getElementById('nav-dock')  || $navDock;
  $navShop   = document.getElementById('nav-shop')  || $navShop;
  $navAch    = document.getElementById('nav-ach')   || $navAch;

  $dockShips   = document.getElementById('dockShips')   || $dockShips;
  $dockWorkers = document.getElementById('dockWorkers') || $dockWorkers;
  $dockCranes  = document.getElementById('dockCranes')  || $dockCranes;
  $dock        = document.getElementById('dock')        || $dock;

  $shopList = document.getElementById('shopList') || $shopList;
  $achList  = document.getElementById('achList')  || $achList;
  $achCount = document.getElementById('achCount') || $achCount;

  wireTapBoat();
  wireBonusButton();
  wireBottomNav();
  syncNavWithPanels();
}

export function hookHudButtons(){
  initUI();
  const syncMute = ()=>{
    if(!$muteBtn) return;
    const on = !!window.Astillero?.state?.settings?.audio;
    $muteBtn.setAttribute('aria-pressed', String(!on));
    $muteBtn.textContent = on ? '🔊' : '🔇';
  };
  syncMute();

  if ($muteBtn && !$muteBtn.__wired){
    $muteBtn.addEventListener('click', ()=>{
      const st = window.Astillero?.state;
      if (!st) return;
      st.settings.audio = !st.settings.audio;
      audio.setEnabled(st.settings.audio);
      save.save(st);
      syncMute();
    });
    $muteBtn.__wired = true;
  }

  if ($resetBtn && !$resetBtn.__wired){
    $resetBtn.addEventListener('click', ()=>{
      const ok = confirm('¿Seguro que quieres reiniciar la partida? Se perderá el progreso.');
      if (!ok) return;
      window.Astillero?.resetGame?.();
      syncMute();
      alert('Guardado eliminado. Empezamos de cero.');
    });
    $resetBtn.__wired = true;
  }
}

function wireTapBoat(){
  if (!$tapBoat || $tapBoat.__wired) return;
  const onTap = ev=>{
    const now=performance.now(); if(now-_lastPointerTs<140) return; _lastPointerTs=now;
    ev.preventDefault?.(); ev.stopPropagation?.();
    const gain = doTap(); showTapFloat(gain); spawnBolts(ev, 12+(Math.random()*8|0));
  };
  $tapBoat.addEventListener('pointerdown', onTap, {passive:false});
  $tapBoat.addEventListener('click', e=>{ e.preventDefault(); e.stopPropagation(); }, {capture:true});
  $tapBoat.__wired = true;
  if(!$tapFx){ const fx=document.createElement('div'); fx.id='tapFx'; $tapBoat.parentElement?.appendChild(fx); $tapFx=fx; }
}

function wireBonusButton(){
  if(!$btnBonus || $btnBonus.__wired) return;
  $btnBonus.addEventListener('click', ()=>{
    if($btnBonus.disabled) return;
    toggleBonus();
    updateBonusButton(window.Astillero?.state);
  });
  $btnBonus.__wired = true;
}

function wireBottomNav(){
  const panels=[
    {node:$dockPanel, id:'dock', nav:()=>($navDock = document.getElementById('nav-dock') || $navDock)},
    {node:$shopPanel, id:'shop', nav:()=>($navShop = document.getElementById('nav-shop') || $navShop)},
    {node:$achPanel,  id:'ach',  nav:()=>($navAch  = document.getElementById('nav-ach')  || $navAch)}
  ];

  if($navDock && !$navDock.__wired){
    $navDock.addEventListener('click', ()=>{ openPanel('dock'); setCurrent($navDock); });
    $navDock.__wired=true;
  }
  if($navShop && !$navShop.__wired){
    $navShop.addEventListener('click', ()=>{ openPanel('shop'); setCurrent($navShop); });
    $navShop.__wired=true;
  }
  if($navAch && !$navAch.__wired){
    $navAch.addEventListener('click', ()=>{ openPanel('ach'); setCurrent($navAch); renderAchievements(window.Astillero?.state); });
    $navAch.__wired=true;
  }

  panels.forEach(({node,id,nav})=>{
    if(!node || node.__wired) return;
    node.addEventListener('toggle', ()=>{
      if(node.open){
        setCurrent(nav());
        if(id==='ach') renderAchievements(window.Astillero?.state);
      } else {
        syncNavWithPanels();
      }
    });
    node.__wired=true;
  });
}

function openPanel(which){
  $dockPanel = document.getElementById('dockPanel') || $dockPanel;
  $shopPanel = document.getElementById('shopPanel') || $shopPanel;
  $achPanel  = document.getElementById('achPanel')  || $achPanel;
  const open=(el,v)=>{ if(el){ el.open=v; if(v) el.scrollIntoView?.({block:'nearest'}); } };
  open($dockPanel, which==='dock');
  open($shopPanel, which==='shop');
  open($achPanel, which==='ach');
}

function setCurrent(btn){
  [$navDock,$navShop,$navAch].forEach(b=>{
    if(!b) return;
    if(b===btn){ b.setAttribute('aria-current','true'); }
    else { b.removeAttribute('aria-current'); }
  });
}

function syncNavWithPanels(){
  if($dockPanel?.open){ setCurrent($navDock); return; }
  if($shopPanel?.open){ setCurrent($navShop); return; }
  if($achPanel?.open){ setCurrent($navAch); return; }
  setCurrent(null);
}

/* HUD */
export function renderHUD(s){
  if(!$contador||!$jps||!$bonusBar||!$bonusText||!$btnBonus) initUI();
  if ($contador) $contador.textContent = fmt(s.jornales);
  if ($jps)      $jps.textContent      = `${fmt(s.jornalesPerSec)} Jornales/s`;
  const cd=s.bonus.cooldown, total=s.bonus.cooldownMax+s.bonus.duration;
  const pct = s.bonus.active?100:(cd>0?100-Math.floor((cd/total)*100):100);
  if ($bonusBar)  $bonusBar.style.width = pct+'%';
  if ($bonusText) $bonusText.textContent = s.bonus.active?'Marea viva activa':(cd>0?'Marea en enfriamiento':'Marea viva lista');
  updateBonusButton(s);
}

export function showTapFloat(gain){
  if(!$tapFx) return;
  const n=document.createElement('div'); n.className='tapFloat';
  const g=(typeof gain==='number' && isFinite(gain))?gain:0;
  n.textContent = `+${fmt(g)}`;
  n.style.left='50%'; n.style.top='50%'; n.style.transform='translate(-50%,-10%)';
  $tapFx.appendChild(n); setTimeout(()=>n.remove(), 900);
}
function spawnBolts(ev,n){
  if(!$tapFx||!$tapBoat) return;
  const rect=$tapBoat.getBoundingClientRect();
  const baseX=(ev?.clientX??rect.left+rect.width/2)-rect.left;
  const baseY=(ev?.clientY??rect.top+rect.height/2)-rect.top;
  for(let i=0;i<n;i++){
    const p=document.createElement('div'); p.className='bolt '+(i%3===0?'r1':i%3===1?'r2':'');
    const dx=(Math.random()*84-42).toFixed(1)+'px';
    const dy=(60+Math.random()*90).toFixed(1)+'px';
    const rot=(Math.random()*180-90).toFixed(1)+'deg';
    p.style.setProperty('--dx',dx); p.style.setProperty('--dy',dy); p.style.setProperty('--rot',rot);
    p.style.left=Math.max(6,Math.min(rect.width-6,baseX+(Math.random()*16-8)))+'px';
    p.style.top =Math.max(6,Math.min(rect.height-6,baseY+(Math.random()*16-8)))+'px';
    $tapFx.appendChild(p); setTimeout(()=>p.remove(),740);
  }
}

/* Dársena */
export function renderDock(state){
  if(!$dockShips||!$dockWorkers||!$dockCranes) initUI();
  if(!$dockShips||!$dockWorkers||!$dockCranes) return;
  const ship = `<svg class="ship" viewBox="0 0 24 24" aria-hidden="true"><path fill="#FF8C00" d="M3 14h18l-2 4H5z"/><path fill="#c7e7ff" d="M6 10l5 3H6z"/><rect x="11" y="8" width="2" height="3" fill="#c7e7ff"/></svg>`;
  const worker = `<svg class="worker" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="#ffd27a"/><rect x="8" y="12" width="8" height="8" rx="2" fill="#4aa3ff"/></svg>`;
  const crane = `<svg class="crane" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16" stroke="#a0c7ff" stroke-width="2"/><path d="M6 20V8l8-4 4 4" stroke="#a0c7ff" stroke-width="2" fill="none"/><circle cx="18" cy="12" r="2" fill="#a0c7ff"/></svg>`;
  const totals = window.Astillero?.getTotalsForVisuals ? window.Astillero.getTotalsForVisuals(state) : {barcos:0,obreros:0,gruas:0};
  $dockShips.innerHTML   = ship.repeat(totals.barcos||0);
  $dockWorkers.innerHTML = worker.repeat(totals.obreros||0);
  $dockCranes.innerHTML  = crane.repeat(totals.gruas||0);
}

export function flashDock(){
  $dock = document.getElementById('dock') || $dock;
  if(!$dock) return;
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

/* Tienda */
export function buildShop(){
  $shopList = document.getElementById('shopList');
  if (!$shopList) return;
  $shopList.innerHTML='';
  shopNodes.clear();
  upgradesDef.forEach(def=>{
    const root=document.createElement('div'); root.className='item'; root.dataset.id=def.id;
    const info=document.createElement('div');
    const title=document.createElement('h3');
    const level=document.createElement('span'); level.className='level'; level.textContent='Nivel 0';
    title.textContent=def.nombre+' '; title.appendChild(level);
    const desc=document.createElement('p'); desc.textContent=def.desc||'';
    info.appendChild(title); info.appendChild(desc);

    const row=document.createElement('div'); row.className='row2';
    const price=document.createElement('div'); price.className='price'; price.textContent='Coste 0';
    const btn=document.createElement('button'); btn.type='button'; btn.className='buy'; btn.textContent='Comprar';
    btn.addEventListener('click', ()=> buyUpgrade(def.id));
    row.appendChild(price); row.appendChild(btn);

    root.appendChild(info); root.appendChild(row);
    $shopList.appendChild(root);
    shopNodes.set(def.id,{root,levelEl:level,priceEl:price,buyBtn:btn,def});
  });
}

export function updateShop(state){
  if(!shopNodes.size) return;
  for(const [id,node] of shopNodes){
    const def=node.def;
    if(def.unlockJps && state.jornalesPerSec < def.unlockJps){
      node.root.classList.add('locked');
      node.levelEl.textContent='Bloqueado';
      node.priceEl.textContent=`Desbloquea a ${def.unlockJps} J/s`;
      node.buyBtn.disabled=true;
      continue;
    } else {
      node.root.classList.remove('locked');
    }
    const nivel=getUpgradeLevel(state,id);
    const coste=costeSiguiente(def,nivel);
    node.levelEl.textContent=`Nivel ${nivel}`;
    node.priceEl.textContent=`Coste ${fmt(coste)}`;
    node.buyBtn.disabled=!(state.jornales>=coste);
  }
}

/* Logros */
export function renderAchievements(state){
  $achList = document.getElementById('achList') || $achList;
  $achCount = document.getElementById('achCount') || $achCount;
  if(!$achList) return;
  const total=achievementsDef.length;
  const done=achievementsDef.filter(a=>state?.achievements?.claimed?.[a.id]).length;
  if($achCount) $achCount.textContent=`(${done}/${total})`;
  $achList.innerHTML = achievementsDef.map(a=>{
    const ok=!!state?.achievements?.claimed?.[a.id];
    return `<div class="ach ${ok?'':'locked'}">`+
      `<div><div style="font-weight:800">${a.titulo}</div><div class="desc">${a.desc||''}</div></div>`+
      `<div class="state">${ok?'Conseguido':'Bloqueado'}</div>`+
    `</div>`;
  }).join('');
}

export function showAchievementToast(ach){
  if(!$popupRoot) return;
  const d=document.createElement('div');
  d.className='toast';
  d.innerHTML=`
    <h4>🏆 Logro: ${ach.titulo}</h4>
    <div style="opacity:.9;margin:4px 0 10px">${ach.desc||''}</div>
    <div class="row"><button type="button" class="btn">Vale</button></div>
  `;
  const btn=d.querySelector('.btn');
  btn.addEventListener('click', ()=>d.remove());
  $popupRoot.appendChild(d);
  audio.playAchievement?.();
  setTimeout(()=>d.remove(),4000);
}

function updateBonusButton(s){
  if(!$btnBonus || !s?.bonus) return;
  if(s.bonus.active){
    $btnBonus.textContent='Marea viva activa';
    $btnBonus.disabled=true;
  }else if(s.bonus.cooldown>0){
    $btnBonus.textContent='Marea en enfriamiento';
    $btnBonus.disabled=true;
  }else{
    $btnBonus.textContent='Marea viva';
    $btnBonus.disabled=false;
  }
}

function fmt(n){
  const num=Number(n)||0;
  if(Math.abs(num)>=1e12) return num.toExponential(2).replace('+','');
  if(Math.abs(num)>=1e9)  return (num/1e9).toFixed(2)+'B';
  if(Math.abs(num)>=1e6)  return (num/1e6).toFixed(2)+'M';
  if(Math.abs(num)>=1e3)  return (num/1e3).toFixed(2)+'K';
  return Math.floor(num).toString();
}
