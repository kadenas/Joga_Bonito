import { upgradesDef, costeSiguiente, valorClick, jpsTotal } from './balance.js';
import { unlockOnInteraction } from './audio.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

const darsenaState = {
  initialized: false,
  rows: {},
  summary: {}
};

export function initDarsena() {
  if (darsenaState.initialized) {
    return darsenaState;
  }
  const section = document.getElementById('darsena');
  if (!section) {
    return darsenaState;
  }
  const rows = {
    barcos: document.querySelector('#row-barcos .tokens'),
    obreros: document.querySelector('#row-obreros .tokens'),
    gruas: document.querySelector('#row-gruas .tokens')
  };
  Object.values(rows).forEach((row) => {
    if (!row) return;
    const wrapper = row.parentElement;
    if (wrapper && !wrapper.querySelector('.water')) {
      const water = document.createElement('div');
      water.className = 'water';
      wrapper.insertBefore(water, row);
    }
  });
  const summary = {
    barcos: document.getElementById('sum-barcos'),
    obreros: document.getElementById('sum-obreros'),
    gruas: document.getElementById('sum-gruas')
  };
  darsenaState.initialized = true;
  darsenaState.rows = rows;
  darsenaState.summary = summary;
  return darsenaState;
}

export function renderTokens(container, count, createTokenFn) {
  if (!container) return;
  const current = container.children.length;
  if (current > count) {
    for (let i = current - 1; i >= count; i -= 1) {
      container.removeChild(container.children[i]);
    }
  } else if (current < count) {
    const fragment = document.createDocumentFragment();
    for (let i = current; i < count; i += 1) {
      fragment.appendChild(createTokenFn(i));
    }
    container.appendChild(fragment);
  }
}

export function createShipToken(index) {
  const token = document.createElement('div');
  token.className = 'token ship';
  token.setAttribute('role', 'listitem');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.innerHTML = `
    <use href="#ship-hull"></use>
    <use href="#ship-cabin"></use>
    <use href="#ship-mast"></use>
  `;
  syncUseReferences(svg);
  token.appendChild(svg);
  const duration = (2.8 + Math.random() * 0.7).toFixed(2);
  const delay = (-Math.random() * duration).toFixed(2);
  token.style.animationDuration = `${duration}s`;
  token.style.animationDelay = `${delay}s`;
  if (index % 2) {
    token.style.animationDirection = 'alternate';
  }
  return token;
}

export function createWorkerToken(index) {
  const token = document.createElement('div');
  token.className = 'token worker';
  token.setAttribute('role', 'listitem');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.innerHTML = `
    <use href="#worker"></use>
  `;
  syncUseReferences(svg);
  token.appendChild(svg);
  const duration = (1.9 + Math.random() * 0.6).toFixed(2);
  const delay = (-Math.random() * duration).toFixed(2);
  token.style.animationDuration = `${duration}s`;
  token.style.animationDelay = `${delay}s`;
  if (index % 2) {
    token.style.animationDirection = 'alternate';
  }
  return token;
}

export function createCraneToken(index) {
  const token = document.createElement('div');
  token.className = 'token crane';
  token.setAttribute('role', 'listitem');
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.innerHTML = `
    <use href="#crane"></use>
  `;
  syncUseReferences(svg);
  token.appendChild(svg);
  const duration = (4 + Math.random() * 1.5).toFixed(2);
  const delay = (-Math.random() * duration).toFixed(2);
  token.style.animationDuration = `${duration}s`;
  token.style.animationDelay = `${delay}s`;
  token.style.animationDirection = index % 2 ? 'alternate-reverse' : 'alternate';
  return token;
}

export function updateDarsena(totals = { barcos: 0, obreros: 0, gruas: 0 }) {
  const current = initDarsena();
  const { rows, summary } = current;
  renderTokens(rows.barcos, totals.barcos || 0, createShipToken);
  renderTokens(rows.obreros, totals.obreros || 0, createWorkerToken);
  renderTokens(rows.gruas, totals.gruas || 0, createCraneToken);
  if (summary.barcos) summary.barcos.textContent = String(totals.barcos || 0);
  if (summary.obreros) summary.obreros.textContent = String(totals.obreros || 0);
  if (summary.gruas) summary.gruas.textContent = String(totals.gruas || 0);
}

function syncUseReferences(svg) {
  const uses = svg.querySelectorAll('use');
  uses.forEach((node) => {
    const href = node.getAttribute('href');
    if (href) {
      node.setAttributeNS(XLINK_NS, 'xlink:href', href);
    }
  });
}

function formatNumber(value, notation = 'abbr') {
  if (!Number.isFinite(value)) return '0';
  if (value === 0) return '0';
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    return value.toExponential(2);
  }
  if (notation === 'abbr') {
    const suffixes = [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' }
    ];
    for (const { v, s } of suffixes) {
      if (abs >= v) {
        return `${(value / v).toFixed(2)}${s}`;
      }
    }
  }
  return value.toLocaleString('es-ES', {
    maximumFractionDigits: value < 10 ? 2 : value < 100 ? 1 : 0
  });
}

function describeUpgrade(upgrade, nivel) {
  const current = nivel || 0;
  if (upgrade.tipo === 'click') {
    const extra = upgrade.extraPorNivel ? upgrade.extraPorNivel * Math.max(0, current - 1) : 0;
    const total = current ? current * upgrade.baseEfecto + extra : 0;
    const nextExtra = upgrade.extraPorNivel ? upgrade.extraPorNivel * Math.max(0, current) : 0;
    const nextTotal = (current + 1) * upgrade.baseEfecto + nextExtra;
    return `+${total.toFixed(2)} por toque (sig: +${nextTotal.toFixed(2)})`;
  }
  if (upgrade.tipo === 'click-mult') {
    const actual = current ? Math.pow(upgrade.multiplicador, current) : 1;
    const next = Math.pow(upgrade.multiplicador, current + 1);
    return `Multiplica toque x${actual.toFixed(2)} (sig: x${next.toFixed(2)})`;
  }
  if (upgrade.tipo === 'pasivo') {
    const actual = current * upgrade.jps;
    const next = (current + 1) * upgrade.jps;
    return `+${actual.toFixed(2)} J/s (sig: +${next.toFixed(2)})`;
  }
  return '';
}

export function initUI(initialState, callbacks) {
  const state = initialState;
  const jornalesDisplay = document.getElementById('contador');
  const jpsDisplay = document.getElementById('jps');
  const tapButton = document.getElementById('btnTap');
  const bonusButton = document.getElementById('btnBonus');
  const bonusBar = document.getElementById('bonusBar');
  const bonusStatus = document.getElementById('bonusText');
  const upgradesList = document.getElementById('upgradesList');
  const audioToggle = document.getElementById('audioToggle');
  const vibrationToggle = document.getElementById('vibrationToggle');
  const exportButton = document.getElementById('exportButton');
  const importButton = document.getElementById('importButton');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalTextarea = document.getElementById('modalTextarea');
  const modalCopy = document.getElementById('modalCopy');
  const modalClose = document.getElementById('modalClose');

  initDarsena();

  if (tapButton) {
    unlockOnInteraction(tapButton);
  }

  let modalMode = null;

  const upgradeElements = new Map();
  if (upgradesList) {
    upgradesList.innerHTML = '';
    for (const upgrade of upgradesDef) {
      const article = document.createElement('article');
      article.className = 'upgrade';
      const header = document.createElement('header');
      const title = document.createElement('h3');
      title.textContent = upgrade.nombre;
      const level = document.createElement('span');
      level.className = 'chip';
      level.textContent = 'Nivel 0';
      header.appendChild(title);
      header.appendChild(level);
      const desc = document.createElement('p');
      desc.textContent = describeUpgrade(upgrade, 0);
      const cost = document.createElement('button');
      cost.type = 'button';
      cost.className = 'btn secondary';
      cost.textContent = `Comprar (${formatNumber(costeSiguiente(upgrade.id, 0))})`;
      cost.addEventListener('click', () => callbacks.onBuyUpgrade(upgrade.id));
      article.appendChild(header);
      article.appendChild(desc);
      article.appendChild(cost);
      upgradesList.appendChild(article);
      upgradeElements.set(upgrade.id, { article, level, desc, cost });
    }
  }

  function handleTap() {
    callbacks.onTap();
  }

  if (tapButton) {
    tapButton.addEventListener('pointerdown', handleTap, { passive: true });
    tapButton.addEventListener('click', handleTap);
  }

  if (bonusButton) {
    bonusButton.addEventListener('click', () => callbacks.onBonus());
  }

  if (audioToggle) {
    audioToggle.checked = state.settings.audio;
    audioToggle.addEventListener('change', () => {
      callbacks.onToggleAudio(audioToggle.checked);
    });
  }

  if (vibrationToggle) {
    vibrationToggle.checked = state.settings.vibrate;
    vibrationToggle.addEventListener('change', () => {
      callbacks.onToggleVibration(vibrationToggle.checked);
    });
  }

  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const data = callbacks.onExport();
      showExportModal(data);
    });
  }

  if (importButton) {
    importButton.addEventListener('click', () => {
      showImportModal();
    });
  }

  if (modalCopy) {
    modalCopy.addEventListener('click', () => {
      if (modalMode === 'export') {
        const text = modalTextarea.value;
        if (navigator.clipboard && text) {
          navigator.clipboard.writeText(text).then(() => {
            modalCopy.textContent = 'Copiado';
            setTimeout(() => (modalCopy.textContent = 'Copiar'), 1200);
          });
        }
      } else if (modalMode === 'import') {
        try {
          callbacks.onImport(modalTextarea.value.trim());
          closeModal();
        } catch (err) {
          window.alert(err.message);
        }
      }
    });
  }

  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }

  function showModal() {
    if (!modal) return;
    modal.classList.add('active');
    if (modalTextarea) {
      modalTextarea.focus();
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    modalMode = null;
    if (modalTextarea) {
      modalTextarea.value = '';
      modalTextarea.readOnly = false;
    }
    if (modalCopy) {
      modalCopy.textContent = 'Copiar';
    }
  }

  function showExportModal(text) {
    modalMode = 'export';
    if (modalTitle) modalTitle.textContent = 'Exportar progreso';
    if (modalTextarea) {
      modalTextarea.value = text;
      modalTextarea.readOnly = true;
    }
    if (modalCopy) modalCopy.textContent = 'Copiar';
    showModal();
  }

  function showImportModal() {
    modalMode = 'import';
    if (modalTitle) modalTitle.textContent = 'Importar progreso';
    if (modalTextarea) {
      modalTextarea.value = '';
      modalTextarea.readOnly = false;
      modalTextarea.placeholder = 'Pega aquí tu JSON de guardado';
    }
    if (modalCopy) modalCopy.textContent = 'Importar';
    showModal();
  }

  function updateBonusUI(bonus) {
    if (bonusBar) {
      const total = bonus.cooldownMax + bonus.duration;
      let pct = 100;
      if (bonus.active) {
        pct = 100;
      } else if (bonus.cooldown > 0 && total > 0) {
        pct = 100 - Math.floor((bonus.cooldown / total) * 100);
      }
      bonusBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
    if (!bonusStatus || !bonusButton) return;
    if (bonus.active) {
      bonusStatus.textContent = `Marea viva activa (${(bonus.remaining / 1000).toFixed(1)}s)`;
      bonusButton.disabled = false;
      bonusButton.textContent = 'Marea viva activa';
    } else if (bonus.cooldown > 0) {
      bonusStatus.textContent = `Marea en enfriamiento (${Math.ceil(bonus.cooldown / 1000)}s)`;
      bonusButton.disabled = true;
      bonusButton.textContent = 'Marea viva (CD)';
    } else {
      bonusStatus.textContent = 'Marea viva lista';
      bonusButton.disabled = false;
      bonusButton.textContent = 'Marea viva';
    }
  }

  function render(nextState) {
    const format = (value) => formatNumber(value, nextState.settings.notation);
    const clickValue = valorClick(nextState) * (nextState.bonus.active ? nextState.bonus.multiplier : 1);
    const baseJps = jpsTotal(nextState);
    const totalJps = baseJps * (nextState.bonus.active ? nextState.bonus.multiplier : 1);
    if (jornalesDisplay) {
      jornalesDisplay.textContent = format(nextState.jornales);
    }
    if (jpsDisplay) {
      jpsDisplay.textContent = `${format(totalJps)} Jornales/s`;
    }
    if (tapButton) {
      tapButton.textContent = `Remachar casco (+${format(clickValue)})`;
    }
    updateBonusUI(nextState.bonus);
    for (const up of upgradesDef) {
      const els = upgradeElements.get(up.id);
      if (!els) continue;
      const nivel = nextState.upgrades[up.id] || 0;
      const cost = costeSiguiente(up.id, nivel);
      els.level.textContent = `Nivel ${nivel}`;
      els.desc.textContent = describeUpgrade(up, nivel);
      els.cost.textContent = `Comprar (${format(cost)})`;
      els.cost.disabled = nextState.jornales < cost;
    }
    if (audioToggle) {
      audioToggle.checked = nextState.settings.audio;
    }
    if (vibrationToggle) {
      vibrationToggle.checked = nextState.settings.vibrate;
    }
  }

  updateBonusUI(state.bonus);

  return {
    render,
    closeModal,
    updateDarsena
  };
}
