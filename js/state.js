/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — state.js                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Estado global centralizado de la aplicación.                           ║
 * ║  Todas las variables de estado se agrupan en el objeto AppState.        ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

const AppState = {

  // ── Datos de arneses ───────────────────────────────────────────────────
  harness: {
    list: [],       // Array de objetos arnés
    current: -1     // Índice del arnés activo
  },

  // ── Nodos y conexiones ─────────────────────────────────────────────────
  nodes: {},        // Mapa { id: nodeObject }
  links: [],        // Array de enlaces

  // ── Contadores auto-incrementales ──────────────────────────────────────
  counters: {
    node: 0,        // ID de nodo
    link: 0,        // ID de enlace
    connector: 0,   // Índice de conector (para nombres A, B, C…)
    terminal: 0     // Índice de terminal (para nombres A, B, C…)
  },

  // ── Estado de selección (UI) ───────────────────────────────────────────
  selection: {
    node: null,           // Elemento DOM del nodo seleccionado
    link: null,           // Objeto del enlace seleccionado
    multi: new Set(),     // Set de nodos multi-seleccionados
    links: new Set(),     // Set de enlaces multi-seleccionados
    isBoxSelecting: false,
    skipNextCanvasClick: false,
    box: null,            // Elemento DOM del rectángulo de selección
    start: { x: 0, y: 0 }
  },

  // ── Datos del proyecto ─────────────────────────────────────────────────
  project: {
    name: '',
    meta: {}
  },

  // ── Sistema de comentarios ─────────────────────────────────────────────
  comments: {
    data: {},
    editing: {
      nodeId: null,
      type: 'add',
      index: null
    },
    deleting: {
      nodeId: null,
      index: null
    }
  },

  // ── Configuración de usuario ───────────────────────────────────────────
  config: {
    lastSelectedAWG: '20',
    currentUser: ''
  },

  // ── Estado temporal de modales ─────────────────────────────────────────
  modals: {
    editingNodeId: null,
    pendingCloseTab: null
  },

  // ── Estado temporal de interacción ─────────────────────────────────────
  interaction: {
    activePort: null
  }
};

function ensureProjectMeta() {
  if (!AppState.project) AppState.project = { name: '', meta: {} };
  if (!AppState.project.meta) AppState.project.meta = {};
}

function getProjectName() {
  return AppState.project?.name || '';
}

function setProjectName(value) {
  ensureProjectMeta();
  AppState.project.name = value || '';
}

function getProjectMeta(key) {
  return AppState.project?.meta?.[key] || '';
}

function setProjectMeta(key, value) {
  ensureProjectMeta();
  AppState.project.meta[key] = value;
}

function setProjectObject(projectObj) {
  AppState.project = projectObj || { name: '', meta: {} };
  ensureProjectMeta();
}

function ensureConfig() {
  if (!AppState.config) AppState.config = { lastSelectedAWG: '20', currentUser: '', useLocalStorage: false };
}

function getConfigValue(key) {
  return AppState.config?.[key];
}

function setConfigValue(key, value) {
  ensureConfig();
  AppState.config[key] = value;
}

function getCurrentUser() {
  return getConfigValue('currentUser') || '';
}

function setCurrentUser(value) {
  setConfigValue('currentUser', value || '');
}

function getCurrentHarnessIndex() {
  return typeof AppState.harness?.current === 'number' ? AppState.harness.current : -1;
}

function setCurrentHarnessIndex(index) {
  if (typeof index === 'number') AppState.harness.current = index;
}

function ensureHarness(index) {
  if (!AppState.harness.list[index]) {
    AppState.harness.list[index] = { nodes: [], links: [], meta: {} };
  }
}

function getCurrentHarness() {
  const idx = getCurrentHarnessIndex();
  return AppState.harness.list[idx] || null;
}

function getNodeDisplayName(nodeId) {
  const node = AppState.nodes[nodeId];
  if (!node) return 'Nodo desconocido';
  return node.label && node.label.trim() ? node.label.trim() : node.name;
}

function setCurrentHarnessMeta(key, value) {
  const idx = getCurrentHarnessIndex();
  if (idx < 0) return;
  ensureHarness(idx);
  AppState.harness.list[idx].meta[key] = value;
}
