import { upgrades, costeSiguiente, valorClick, jpsTotal } from './balance.js';
import { unlockOnInteraction } from './audio.js';

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
  const jornalesDisplay = document.getElementById('jornalesDisplay');
  const jpsDisplay = document.getElementById('jpsDisplay');
  const tapButton = document.getElementById('tapButton');
  const bonusButton = document.getElementById('bonusButton');
  const bonusStatus = document.getElementById('bonusStatus');
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

  unlockOnInteraction(tapButton);

  let modalMode = null;

  const upgradeElements = new Map();
  upgradesList.innerHTML = '';
  for (const upgrade of upgrades) {
    const article = document.createElement('article');
    article.className = 'upgrade';
    const header = document.createElement('header');
    const title = document.createElement('h3');
    title.textContent = upgrade.nombre;
    const level = document.createElement('span');
    level.className = 'badge';
    level.textContent = 'Nivel 0';
    header.appendChild(title);
    header.appendChild(level);
    const desc = document.createElement('p');
    desc.textContent = describeUpgrade(upgrade, 0);
    const cost = document.createElement('button');
    cost.type = 'button';
    cost.textContent = `Comprar (${formatNumber(costeSiguiente(upgrade.id, 0))})`;
    cost.addEventListener('click', () => callbacks.onBuyUpgrade(upgrade.id));
    article.appendChild(header);
    article.appendChild(desc);
    article.appendChild(cost);
    upgradesList.appendChild(article);
    upgradeElements.set(upgrade.id, { article, level, desc, cost });
  }

  function handleTap() {
    callbacks.onTap();
  }

  tapButton.addEventListener('pointerdown', handleTap, { passive: true });
  tapButton.addEventListener('click', handleTap);

  bonusButton.addEventListener('click', () => callbacks.onBonus());

  audioToggle.checked = state.settings.audio;
  audioToggle.addEventListener('change', () => {
    callbacks.onToggleAudio(audioToggle.checked);
  });

  vibrationToggle.checked = state.settings.vibrate;
  vibrationToggle.addEventListener('change', () => {
    callbacks.onToggleVibration(vibrationToggle.checked);
  });

  exportButton.addEventListener('click', () => {
    const data = callbacks.onExport();
    showExportModal(data);
  });

  importButton.addEventListener('click', () => {
    showImportModal();
  });

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

  modalClose.addEventListener('click', closeModal);

  function showModal() {
    modal.classList.add('active');
    modalTextarea.focus();
  }

  function closeModal() {
    modal.classList.remove('active');
    modalMode = null;
    modalTextarea.value = '';
    modalTextarea.readOnly = false;
    modalCopy.textContent = 'Copiar';
  }

  function showExportModal(text) {
    modalMode = 'export';
    modalTitle.textContent = 'Exportar progreso';
    modalTextarea.value = text;
    modalTextarea.readOnly = true;
    modalCopy.textContent = 'Copiar';
    showModal();
  }

  function showImportModal() {
    modalMode = 'import';
    modalTitle.textContent = 'Importar progreso';
    modalTextarea.value = '';
    modalTextarea.readOnly = false;
    modalTextarea.placeholder = 'Pega aquí tu JSON de guardado';
    modalCopy.textContent = 'Importar';
    showModal();
  }

  function updateBonusUI(bonus) {
    if (bonus.active) {
      bonusStatus.textContent = `Marea viva activa: ${(bonus.remaining / 1000).toFixed(1)}s`;
      bonusButton.disabled = false;
      bonusButton.textContent = 'Marea viva activa';
    } else if (bonus.cooldown > 0) {
      bonusStatus.textContent = `En enfriamiento: ${(bonus.cooldown / 1000).toFixed(0)}s`;
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
    jornalesDisplay.textContent = format(nextState.jornales);
    jpsDisplay.textContent = `${format(totalJps)} Jornales/s`;
    tapButton.textContent = `Remachar casco (+${format(clickValue)})`;
    updateBonusUI(nextState.bonus);
    for (const up of upgrades) {
      const els = upgradeElements.get(up.id);
      if (!els) continue;
      const nivel = nextState.upgrades[up.id] || 0;
      const cost = costeSiguiente(up.id, nivel);
      els.level.textContent = `Nivel ${nivel}`;
      els.desc.textContent = describeUpgrade(up, nivel);
      els.cost.textContent = `Comprar (${format(cost)})`;
      els.cost.disabled = nextState.jornales < cost;
    }
    audioToggle.checked = nextState.settings.audio;
    vibrationToggle.checked = nextState.settings.vibrate;
  }

  return {
    render,
    closeModal
  };
}
