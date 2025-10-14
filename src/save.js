const STORAGE_KEY = 'astillero-idle-save';
const SCHEMA_VERSION = 1;
let autosaveHandle;

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

export function load(defaultState, upgradeIds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return prepare(defaultState, upgradeIds);
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return prepare(defaultState, upgradeIds);
    }
    const data = {
      ...defaultState,
      ...parsed,
      bonus: { ...defaultState.bonus, ...parsed.bonus },
      totals: { ...defaultState.totals, ...parsed.totals },
      settings: { ...defaultState.settings, ...parsed.settings }
    };
    data.upgrades = { ...defaultState.upgrades };
    const loadedUpgrades = parsed.upgrades || {};
    for (const id of upgradeIds) {
      const level = Number(loadedUpgrades[id] || 0);
      data.upgrades[id] = Number.isFinite(level) && level >= 0 ? level : 0;
    }
    if (typeof parsed.baseClick === 'number') {
      data.baseClick = parsed.baseClick;
    }
    data.jornales = Number(parsed.jornales) || 0;
    data.jornalesPerSec = Number(parsed.jornalesPerSec) || 0;
    return data;
  } catch (err) {
    console.warn('Fallo al cargar, usando valores por defecto', err);
    return prepare(defaultState, upgradeIds);
  }
}

function prepare(defaultState, upgradeIds) {
  const fresh = cloneState(defaultState);
  fresh.upgrades = {};
  for (const id of upgradeIds) {
    fresh.upgrades[id] = 0;
  }
  return fresh;
}

export function save(state) {
  try {
    const snapshot = cloneState(state);
    snapshot.version = SCHEMA_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('No se pudo guardar el progreso', err);
  }
}

export function scheduleAutosave(getState, intervalMs = 10000) {
  clearInterval(autosaveHandle);
  autosaveHandle = setInterval(() => {
    save(getState());
  }, intervalMs);
}

export function registerBeforeUnload(getState) {
  window.addEventListener('beforeunload', () => {
    save(getState());
  });
}

export function exportGame(state) {
  const payload = {
    version: SCHEMA_VERSION,
    timestamp: Date.now(),
    state: cloneState(state)
  };
  return JSON.stringify(payload);
}

export function importGame(text, defaultState, upgradeIds) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Formato inválido');
    }
    const source = parsed.state || parsed;
    const merged = load(defaultState, upgradeIds);
    Object.assign(merged, source);
    merged.bonus = { ...defaultState.bonus, ...source.bonus };
    merged.totals = { ...defaultState.totals, ...source.totals };
    merged.settings = { ...defaultState.settings, ...source.settings };
    merged.upgrades = { ...defaultState.upgrades };
    const upgradesSource = source.upgrades || {};
    for (const id of upgradeIds) {
      const level = Number(upgradesSource[id] || 0);
      merged.upgrades[id] = Number.isFinite(level) && level >= 0 ? level : 0;
    }
    merged.jornales = Number(source.jornales) || 0;
    merged.jornalesPerSec = Number(source.jornalesPerSec) || 0;
    return merged;
  } catch (err) {
    throw new Error('No se pudo importar: ' + err.message);
  }
}
