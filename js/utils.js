/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — utils.js                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Funciones de utilidad, grid/layout, notificaciones, persistencia,
 * gestión de usuarios, carga/guardado, estado dirty y nombres de componentes.
 * ║  Secciones: 4, 5, 5b, 6, 7, 8, 9, 10, 11                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 4: FUNCIONES DE UTILIDAD
 * Clonación profunda, clave de almacenamiento y helpers genéricos.
 * ══════════════════════════════════════════════════════════════════════════ */
const STORAGE_KEY = 'harnesses_project_v23';
function deepClone(o){ return JSON.parse(JSON.stringify(o)); }


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 5: GRID, LAYOUT Y EVENTOS DE VENTANA
 * Actualización del offset del grid y listeners de scroll/resize.
 * ══════════════════════════════════════════════════════════════════════════ */
function updateGridOffset(){
  const ox = -(canvas.scrollLeft % (GRID * 4));
  const oy = -(canvas.scrollTop  % (GRID * 4));
  canvas.style.backgroundPosition = `${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px, ${ox}px ${oy}px`;
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 6: SISTEMA DE NOTIFICACIONES
 * Creación y animación de notificaciones tipo toast.
 * ══════════════════════════════════════════════════════════════════════════ */
function showNotification(message, type = 'info', duration = 2500) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    position: fixed !important;
    top: 80px !important;
    right: 20px !important;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    z-index: 10000 !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
    transition: all 0.15s ease;
    transform: translateX(100%);
    opacity: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  `;

  const dot = document.createElement('span');
  dot.style.cssText = `
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: block;
    flex-shrink: 0;
  `;

  if (type === 'success') {
    notification.style.background = 'linear-gradient(160deg, rgba(16,185,129,0.9), rgba(5,150,105,0.9))';
    notification.style.border = '1px solid var(--green)';
    notification.style.color = '#fff';
    notification.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
    dot.style.background = 'var(--green)';
    dot.style.boxShadow = '0 0 4px rgba(16,185,129,0.5)';
  } else if (type === 'error') {
    notification.style.background = 'linear-gradient(160deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))';
    notification.style.border = '1px solid var(--red)';
    notification.style.color = '#fff';
    notification.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
    dot.style.background = 'var(--red)';
    dot.style.boxShadow = '0 0 4px rgba(239,68,68,0.5)';
  } else {
    notification.style.background = 'linear-gradient(160deg, rgba(59,130,246,0.9), rgba(37,99,235,0.9))';
    notification.style.border = '1px solid var(--accent)';
    notification.style.color = '#fff';
    notification.style.textShadow = '0 1px 2px rgba(0,0,0,0.3)';
    dot.style.background = 'var(--accent)';
    dot.style.boxShadow = '0 0 4px rgba(59,130,246,0.5)';
  }

  notification.appendChild(dot);
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  notification.appendChild(textSpan);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
    notification.style.opacity = '1';
  }, 10);

  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    }, 150);
  }, duration);
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 5b: EVENTOS DE SCROLL Y RESIZE
 * Listeners que actualizan el grid y redibujan al hacer scroll o resize.
 * ══════════════════════════════════════════════════════════════════════════ */
function redrawAll(){} // Placeholder, redefined in links.js
canvas.addEventListener('scroll', ()=>{ updateGridOffset(); redrawAll(); });
window.addEventListener('resize', ()=>{ updateGridOffset(); redrawAll(); });
updateGridOffset();


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 7: PERSISTENCIA DE DATOS (localStorage)
 * Guardar y recuperar el estado completo del proyecto.
 * ══════════════════════════════════════════════════════════════════════════ */
function persistToLocalStorage(){
  localStorage.setItem('harnesses_project_v23',JSON.stringify({
    projectData:AppState.project,
    harnesses:AppState.harness.list,
    currentHarness:AppState.harness.current,
    lastSelectedAWG:AppState.config.lastSelectedAWG,
    currentUser:AppState.config.currentUser
  }));
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 8: GESTIÓN DE USUARIOS
 * Memoria del nombre de usuario actual entre sesiones.
 * ══════════════════════════════════════════════════════════════════════════ */
function saveCurrentUser(username){
  setCurrentUser(username.trim());
  persistToLocalStorage();
}

function loadCurrentUser(){
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved){
    try{
      const data = JSON.parse(saved);
      setCurrentUser(data.currentUser || '');
      return getCurrentUser();
    }catch(e){
      console.error('Error loading user from localStorage:', e);
    }
  }
  return '';
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 9: CARGA Y GUARDADO DE DATOS
 * Lectura del localStorage al iniciar la aplicación.
 * ══════════════════════════════════════════════════════════════════════════ */
function loadFromLocalStorage(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return null;
    const p = JSON.parse(raw);
    if(p.project) setProjectObject(p.project);
    if(p.lastAWG) setConfigValue('lastSelectedAWG', p.lastAWG);
    if(p.currentUser) setCurrentUser(p.currentUser);
    return Array.isArray(p.harnesses) ? p.harnesses : null;
  }catch(e){ return null; }
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 10: GESTIÓN DE ESTADO DIRTY / CLEAN
 * Marca de cambios no guardados por arnés y limpieza general.
 * ══════════════════════════════════════════════════════════════════════════ */
function markHarnessDirty(index){
  if(index === undefined || index === null) return;
  if(!AppState.harness.list[index]) AppState.harness.list[index] = { nodes:[], links:[], meta:{} };
  AppState.harness.list[index].meta.dirty = true;
  renderTabs();
  persistToLocalStorage();
}

function markCurrentDirty(){ 
  if(AppState.harness.current >= 0) {
    // Marcar como dirty pero no limpiar otros arneses
    if(!AppState.harness.list[AppState.harness.current]) AppState.harness.list[AppState.harness.current] = { nodes:[], links:[], meta:{} };
    AppState.harness.list[AppState.harness.current].meta.dirty = true;
    renderTabs();
    persistToLocalStorage();
  }
}

function markAllClean(){ 
  // Solo limpiar cuando se guarda todo el proyecto
  AppState.harness.list.forEach(h=>{ if(!h.meta) h.meta={}; h.meta.dirty=false; }); 
  renderTabs(); 
  persistToLocalStorage(); 
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 11: GESTIÓN DE NOMBRES DE COMPONENTES
 * Conversión de índice a letras (A, B, ..., Z, AA, AB, ...) y
 * asignación automática de nombres únicos a conectores y terminales.
 * ══════════════════════════════════════════════════════════════════════════ */
function indexToLetters(n){ let s=''; while(n>0){ const r=(n-1)%26; s=String.fromCharCode(65+r)+s; n=Math.floor((n-1)/26); } return s; }

function getNextAvailableName(type){
  const usedNames = new Set();
  Object.values(AppState.nodes).forEach(node => {
    if(node.type === type && node.name) {
      usedNames.add(node.name);
    }
  });
  
  let index = 1;
  while(true) {
    const name = type === 'connector' ? 'Conector ' + indexToLetters(index) : 'Terminal ' + indexToLetters(index);
    if(!usedNames.has(name)) {
      return name;
    }
    index++;
  }
}

function nextConnectorName(){ return getNextAvailableName('connector'); }
function nextTerminalName(){ return getNextAvailableName('terminal'); }
function recomputeNameCounters(){
  // Ya no necesitamos mantener contadores, usamos getNextAvailableName
}

// Limpiar cache al iniciar la app
localStorage.removeItem(STORAGE_KEY);
localStorage.removeItem('projectData');
