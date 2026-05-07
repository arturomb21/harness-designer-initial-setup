/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — ui.js                                                  ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Eliminación de nodos/enlaces, selección e inspector, atajos de teclado,
 * controles de formulario, inspector de nodos/enlaces y selectores de color.
 * ║  Secciones: 23, 24, 25, 26, 27, 28, 29                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 23: ELIMINACIÓN DE NODOS Y ENLACES
 * Diálogo de confirmación, limpieza de elementos DOM, comentarios
 * asociados, y re-renderizado tras la eliminación.
 * ══════════════════════════════════════════════════════════════════════════ */
function removeNode(nodeId, skipConfirm = false){
  const node=AppState.nodes[nodeId]; if(!node) return;
  
  // Verificar si tiene conexiones activas
  const activeConnections = AppState.links.filter(l=>l.fromNodeId===nodeId||l.toNodeId===nodeId);
  const hasConnections = activeConnections.length > 0;
  
  // Si no tiene conexiones y no se solicita confirmación, eliminar directamente
  if(!hasConnections && !skipConfirm) {
    performNodeDeletion(nodeId);
    return;
  }
  
  // Si tiene conexiones o se solicita confirmación, mostrar diálogo
  if(!skipConfirm) {
    const backdrop = document.getElementById('deleteNodeConfirmBackdrop');
    const message = document.getElementById('deleteNodeMessage');
    const warning = document.getElementById('deleteNodeConnectionsWarning');
    
    // Mensaje principal
    const nodeType = node.type === 'connector' ? 'conector' : node.type === 'terminal' ? 'terminal' : 'bifurcación';
    if(hasConnections) {
      message.textContent = `¿Estás seguro de que quieres eliminar este ${nodeType} "${node.name}"? Esta acción no se puede deshacer.`;
    } else {
      message.textContent = `¿Estás seguro de que quieres eliminar este ${nodeType} "${node.name}"? Esta acción no se puede deshacer.`;
    }
    
    // Mostrar advertencia si tiene conexiones
    warning.style.display = hasConnections ? 'block' : 'none';
    
    // Configurar botones
    const cancelBtn = document.getElementById('deleteNodeCancel');
    const acceptBtn = document.getElementById('deleteNodeAccept');
    
    const closeModal = () => {
      backdrop.style.display = 'none';
      cancelBtn.removeEventListener('click', closeModal);
      acceptBtn.removeEventListener('click', confirmDelete);
    };
    
    const confirmDelete = () => {
      closeModal();
      performNodeDeletion(nodeId);
    };
    
    cancelBtn.addEventListener('click', closeModal);
    acceptBtn.addEventListener('click', confirmDelete);
    
    // Activar soporte de teclado para confirmaciones de eliminación
    backdrop.style.display = 'flex';
    backdrop.tabIndex = -1;
    backdrop.focus();
    return;
  }
  
  performNodeDeletion(nodeId);
}

function performNodeDeletion(nodeId){
  const node=AppState.nodes[nodeId]; if(!node) return;
  if(node.el.parentNode) node.el.parentNode.removeChild(node.el);
  if(node.backshellBadgeEl&&node.backshellBadgeEl.parentNode) node.backshellBadgeEl.parentNode.removeChild(node.backshellBadgeEl);
  if(node.labelBadgeEl&&node.labelBadgeEl.parentNode) node.labelBadgeEl.parentNode.removeChild(node.labelBadgeEl);
  AppState.links.filter(l=>l.fromNodeId===nodeId||l.toNodeId===nodeId).forEach(l=>removeLink(l,false));
  
  // Eliminar comentarios asociados al nodo
  if(AppState.comments.data[nodeId]) {
    delete AppState.comments.data[nodeId];
    showNotification(`Comentarios eliminados para "${node.name}"`, 'info');
  }
  
  delete AppState.nodes[nodeId];
  AppState.selection.multi.delete(nodeId);
  recomputeNameCounters();
  Object.keys(AppState.nodes).forEach(id=>updatePortConnectedState(id));
  markCurrentDirty();
  
  // Update connection labels table when node is deleted
  if (connectionLabelsTableManager) {
    connectionLabelsTableManager.updateTableForCurrentHarness();
  }
  
  // Forzar re-render completo del canvas para eliminar artefactos visuales
  setTimeout(() => {
    // Solución CSS: forzar actualización de estilos del grid
    const currentBg = canvas.style.backgroundColor;
    const currentBgImage = canvas.style.backgroundImage;
    
    // Temporalmente remover el background para limpiar artefactos
    canvas.style.backgroundImage = 'none';
    canvas.style.backgroundColor = 'transparent';
    
    // Forzar reflow
    void canvas.offsetHeight;
    
    // Restaurar el background original
    canvas.style.backgroundColor = currentBg || 'var(--bg)';
    canvas.style.backgroundImage = currentBgImage || `linear-gradient(rgba(74,144,226,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(74,144,226,0.06) 1px, transparent 1px), linear-gradient(rgba(74,144,226,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(74,144,226,0.03) 1px, transparent 1px)`;
    canvas.style.backgroundSize = 'var(--grid-px) var(--grid-px), var(--grid-px) var(--grid-px), calc(var(--grid-px)*4) calc(var(--grid-px)*4), calc(var(--grid-px)*4) calc(var(--grid-px)*4)';
    
    // Forzar otro reflow
    void canvas.offsetHeight;
    
    // Actualizar badges
    updateAllBadges();
    
    // Actualizar el grid para evitar líneas blancas
    updateGridOffset();
    
    clearSelection();
  }, 50);
}
function removeLink(link, dirty=true){
  if(!link) return;
  
  // Obtener nombres para la notificación
  const fromName = getNodeDisplayName(link.fromNodeId);
  const toName = getNodeDisplayName(link.toNodeId);
  
  if(link.lineElement&&link.lineElement.parentNode) link.lineElement.parentNode.removeChild(link.lineElement);
  if(link.labelGroup&&link.labelGroup.parentNode) link.labelGroup.parentNode.removeChild(link.labelGroup);
  [link.mallaTop, link.mallaBottom, link.termoTop, link.termoBottom].forEach(el=>{ if(el&&el.parentNode) el.parentNode.removeChild(el); });
  AppState.links=AppState.links.filter(l=>l!==link);
  updatePortConnectedState(link.fromNodeId);
  updatePortConnectedState(link.toNodeId);
  clearSelection();
  if(dirty) markCurrentDirty();
  
  // Mostrar notificación de conexión eliminada
  showNotification(`Conexión eliminada: ${fromName} → ${toName}`, 'info');
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 24: SELECCIÓN, INSPECTOR Y BOX-SELECT
 * Funciones de selección individual (nodo/enlace), limpiar selección,
 * box-select con rectángulo visual y click en canvas vacío.
 * ══════════════════════════════════════════════════════════════════════════ */
AppState.selection.node=null; AppState.selection.link=null;
function clearLinkSelection(){
  AppState.selection.links.forEach(linkId => {
    const link = AppState.links.find(l => l.id === linkId);
    if(link && link.lineElement) link.lineElement.classList.remove('selected');
  });
  AppState.selection.links.clear();
  if(AppState.selection.link){
    if(AppState.selection.link.lineElement) AppState.selection.link.lineElement.classList.remove('selected');
    AppState.selection.link = null;
  }
}

function selectNode(el, addToSelection=false){
  if(!addToSelection){
    clearSelection();
  }
  if(!el) return;
  AppState.selection.node=el;
  el.classList.add('selected');
  AppState.selection.multi.add(el.dataset.id);
  if(!addToSelection || AppState.selection.multi.size === 1){
    showInspectorForNode(el.dataset.id);
  }
}
function selectLink(link, addToSelection=false){
  if(!link) return;
  if(!addToSelection){
    clearNodeSelection();
    clearLinkSelection();
    AppState.selection.link = link;
    showInspectorForLink(link);
  } else {
    AppState.selection.link = link;
  }
  if(link.lineElement) link.lineElement.classList.add('selected');
  AppState.selection.links.add(link.id);
}
function clearSelection(){
  clearNodeSelection();
  clearLinkSelection();
  if(AppState.selection.node){ AppState.selection.node=null; }
  if(AppState.selection.box && AppState.selection.box.parentNode){ AppState.selection.box.parentNode.removeChild(AppState.selection.box); AppState.selection.box=null; }
  inspectorContent.innerHTML='<div class="hint">Selecciona un nodo o un ramal para editar sus propiedades.</div>';
  
  // Actualizar el grid para evitar líneas blancas
  updateGridOffset();
}

function rectIntersectsLine(x1,y1,x2,y2,left,top,right,bottom){
  const pointInRect = (x,y) => x >= left && x <= right && y >= top && y <= bottom;
  if(pointInRect(x1,y1) || pointInRect(x2,y2)) return true;
  function cross(ax,ay,bx,by){ return ax*by - ay*bx; }
  function segmentsIntersect(x1,y1,x2,y2,x3,y3,x4,y4){
    const d1 = cross(x4-x3,y4-y3, x1-x3,y1-y3);
    const d2 = cross(x4-x3,y4-y3, x2-x3,y2-y3);
    const d3 = cross(x2-x1,y2-y1, x3-x1,y3-y1);
    const d4 = cross(x2-x1,y2-y1, x4-x1,y4-y1);
    return d1*d2 < 0 && d3*d4 < 0;
  }
  return segmentsIntersect(x1,y1,x2,y2,left,top,right,top)
      || segmentsIntersect(x1,y1,x2,y2,right,top,right,bottom)
      || segmentsIntersect(x1,y1,x2,y2,right,bottom,left,bottom)
      || segmentsIntersect(x1,y1,x2,y2,left,bottom,left,top);
}

// Box selection mejorada con clase CSS
canvas.addEventListener('pointerdown', e => {
  if(e.target !== canvas && e.target !== svg) return;
  
  const rect = canvas.getBoundingClientRect();
  AppState.selection.start.x = e.clientX - rect.left + canvas.scrollLeft;
  AppState.selection.start.y = e.clientY - rect.top  + canvas.scrollTop;
  
  AppState.selection.isBoxSelecting = true;
  
  AppState.selection.box = document.createElement('div');
  AppState.selection.box.className = 'selection-box';
  AppState.selection.box.style.left = AppState.selection.start.x + 'px';
  AppState.selection.box.style.top = AppState.selection.start.y + 'px';
  AppState.selection.box.style.width = '0px';
  AppState.selection.box.style.height = '0px';
  canvas.appendChild(AppState.selection.box);
  
  e.preventDefault();
});

canvas.addEventListener('pointermove', e => {
  if(!AppState.selection.isBoxSelecting || !AppState.selection.box) return;
  
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left + canvas.scrollLeft;
  const currentY = e.clientY - rect.top  + canvas.scrollTop;
  
  const left = Math.min(AppState.selection.start.x, currentX);
  const top = Math.min(AppState.selection.start.y, currentY);
  const width = Math.abs(currentX - AppState.selection.start.x);
  const height = Math.abs(currentY - AppState.selection.start.y);
  
  AppState.selection.box.style.left = left + 'px';
  AppState.selection.box.style.top = top + 'px';
  AppState.selection.box.style.width = width + 'px';
  AppState.selection.box.style.height = height + 'px';
});

canvas.addEventListener('pointerup', e => {
  if(!AppState.selection.isBoxSelecting || !AppState.selection.box) return;
  
  AppState.selection.isBoxSelecting = false;
  AppState.selection.skipNextCanvasClick = true;
  
  const rect = canvas.getBoundingClientRect();
  const endX = e.clientX - rect.left + canvas.scrollLeft;
  const endY = e.clientY - rect.top  + canvas.scrollTop;
  
  const left = Math.min(AppState.selection.start.x, endX);
  const top = Math.min(AppState.selection.start.y, endY);
  const right = Math.max(AppState.selection.start.x, endX);
  const bottom = Math.max(AppState.selection.start.y, endY);
  
  // Clear previous selection if not holding shift/ctrl
  if(!e.shiftKey && !e.ctrlKey) {
    clearSelection();
  }
  
  // Select nodes within the box
  Object.values(AppState.nodes).forEach(node => {
    const nodeCenterX = node.x + NODE_W/2;
    const nodeCenterY = node.y + NODE_H/2;
    
    if(nodeCenterX >= left && nodeCenterX <= right && 
       nodeCenterY >= top && nodeCenterY <= bottom) {
      AppState.selection.multi.add(node.id);
      node.el.classList.add('selected');
    }
  });

  // Select links that intersect the selection rectangle
  AppState.links.forEach(link => {
    if(!link.lineElement) return;
    const x1 = parseFloat(link.lineElement.getAttribute('x1'));
    const y1 = parseFloat(link.lineElement.getAttribute('y1'));
    const x2 = parseFloat(link.lineElement.getAttribute('x2'));
    const y2 = parseFloat(link.lineElement.getAttribute('y2'));
    if(rectIntersectsLine(x1,y1,x2,y2,left,top,right,bottom)){
      AppState.selection.links.add(link.id);
      if(link.lineElement) link.lineElement.classList.add('selected');
      AppState.selection.link = link;
    }
  });

  if(AppState.selection.multi.size === 1 && AppState.selection.links.size === 0){
    showInspectorForNode(Array.from(AppState.selection.multi)[0]);
  } else if(AppState.selection.multi.size === 0 && AppState.selection.links.size === 1){
    const linkId = Array.from(AppState.selection.links)[0];
    const link = AppState.links.find(l => l.id === linkId);
    if(link) showInspectorForLink(link);
  } else if(AppState.selection.multi.size || AppState.selection.links.size){
    inspectorContent.innerHTML = `<div class="hint">Seleccionados ${AppState.selection.multi.size} nodos y ${AppState.selection.links.size} ramales.</div>`;
  }
  
  if(AppState.selection.box && AppState.selection.box.parentNode) {
    AppState.selection.box.parentNode.removeChild(AppState.selection.box);
  }
  AppState.selection.box = null;
});

canvas.addEventListener('click', e => {
  if(e.target===canvas || e.target===svg) {
    if(AppState.selection.skipNextCanvasClick) {
      AppState.selection.skipNextCanvasClick = false;
      return;
    }
    clearSelection();
  }
});


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 25: ATAJOS DE TECLADO
 * Delete/Backspace para eliminar nodos o enlaces seleccionados.
 * ══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e=>{
  const active=document.activeElement;
  const tag=(active&&active.tagName)?active.tagName.toUpperCase():'';
  const editable=tag==='INPUT'||tag==='TEXTAREA'||(active&&active.isContentEditable);
  if((e.key==='Delete'||e.key==='Backspace')&&!editable){
    if(AppState.selection.multi.size > 0){
      // Eliminar todos los nodos seleccionados
      AppState.selection.multi.forEach(nodeId => {
        const node = AppState.nodes[nodeId];
        if(node) removeNode(nodeId); // Seguir mismo flujo que botón
      });
    } else if(AppState.selection.node){ removeNode(AppState.selection.node.dataset.id); } // Seguir mismo flujo que botón
    else if(AppState.selection.link){ removeLink(AppState.selection.link); }
  }

  if(editable) return;
  if(e.key==='Escape'){
    if(deleteNodeConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); deleteNodeCancel.click();
      return;
    }
    if(closeTabConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); closeTabCancel.click();
      return;
    }
    if(clearConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); clearCancel.click();
      return;
    }
  }

  if(e.key==='Enter'){
    if(deleteNodeConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); deleteNodeAccept.click();
      return;
    }
    if(closeTabConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); closeTabAccept.click();
      return;
    }
    if(clearConfirmBackdrop.style.display==='flex'){
      e.preventDefault(); clearAccept.click();
      return;
    }
  }
});


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 26: CONTROLES DE FORMULARIO (inputs, selects)
 * Funciones para crear campos de texto con Enter/Escape, selectores
 * de tipo de cable, calibre AWG/mm² y formato de valores.
 * ══════════════════════════════════════════════════════════════════════════ */
function focusInspectorField(nodeId, field){
  const node=AppState.nodes[nodeId]; if(!node) return;
  selectNode(node.el);
  setTimeout(()=>{
    const sel = field==='backshell'?'input[data-backshell]':field==='label'?'input[data-label]':'input[data-pn]';
    const inp = inspectorContent.querySelector(sel);
    if(inp){ 
      inp.focus(); 
      inp.select(); 
    }
  },120);
}
function makeEnterInput(val, onCommit, attrs={}){
  const input=document.createElement('input');
  input.type='text'; input.value=val||''; input.dataset.orig=val||'';
  Object.keys(attrs).forEach(k=>input.setAttribute(k,attrs[k]));
  input.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'){
      ev.preventDefault();
      const v=input.value.trim();
      onCommit(v); input.dataset.orig=v; input.blur(); markCurrentDirty();
    } else if(ev.key==='Escape'){ ev.preventDefault(); input.value=input.dataset.orig; input.blur(); }
  });
  input.addEventListener('blur',()=>{
    const v=input.value.trim();
    if(v !== input.dataset.orig){
      onCommit(v); input.dataset.orig=v; markCurrentDirty();
    }
  });
  return input;
}

function createCableTypeSelect(selectedValue = ''){
  const select = document.createElement('select');
  select.style.cssText='';
  
  const cableTypes = [
    { value: '', text: '—' },
    { value: 'unifilar', text: 'Unifilar AWG' },
    { value: 'unifilar_mm2', text: 'Unifilar mm²' },
    { value: 'par_trenzado', text: 'Par Trenzado' },
    { value: 'par_trenzado_apantallado', text: 'Par Trenzado Apantallado' },
    { value: 'manguera_corriente', text: 'Manguera Corriente' },
    { value: 'coaxial', text: 'Coaxial' },
    { value: 'ethernet', text: 'Ethernet' }
  ];
  
  cableTypes.forEach(type => {
    const option = document.createElement('option');
    option.value = type.value;
    option.textContent = type.text;
    option.style.background = 'var(--panel2)';
    option.style.color = 'var(--text-bright)';
    if (type.value === selectedValue) {
      option.selected = true;
    }
    select.appendChild(option);
  });
  
  return select;
}

function createAWGMM2Select(selectedType = '', selectedValue = '') {
  const container = document.createElement('div');
  container.style.cssText = 'display: flex; flex-direction: row; gap: 3px; width: 100%;';
  
  // Selector de tipo (AWG o mm2)
  const typeSelect = document.createElement('select');
  typeSelect.style.cssText='width:50%;padding:2px 2px;border-radius:4px;border:1px solid var(--border-strong);background:rgba(255,255,255,0.05);color:var(--text-bright);font-size:11px;height:26px;font-family:\'Inter\',sans-serif;transition:border-color .15s,background .15s';
  
  const typeOptions = [
    { value: 'awg', text: 'AWG' },
    { value: 'mm2', text: 'mm²' }
  ];
  
  typeOptions.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    opt.style.background = 'var(--panel2)';
    opt.style.color = 'var(--text-bright)';
    if (option.value === selectedType) {
      opt.selected = true;
    }
    typeSelect.appendChild(opt);
  });
  
  // Selector de valores (AWG o mm2)
  const valueSelect = document.createElement('select');
  valueSelect.style.cssText='width:50%;padding:2px 2px;border-radius:4px;border:1px solid var(--border-strong);background:rgba(255,255,255,0.05);color:var(--text-bright);font-size:11px;height:26px;font-family:\'Inter\',sans-serif;transition:border-color .15s,background .15s';
  
  // Tabla de conversión AWG a mm2
  const awgToMm2 = {
    '4/0': '107.0',
    '3/0': '85.0',
    '2/0': '67.4',
    '1/0': '53.5',
    '1': '42.4',
    '2': '33.6',
    '3': '26.7',
    '4': '21.2',
    '6': '13.3',
    '8': '8.37',
    '10': '5.26',
    '12': '3.31',
    '14': '2.08',
    '16': '1.31',
    '18': '0.823',
    '20': '0.518',
    '22': '0.326',
    '24': '0.205',
    '26': '0.129',
    '28': '0.081',
    '30': '0.051'
  };
  
  // Valores mm2 estándar
  const mm2Values = [
    '0.5', '0.75', '1.0', '1.5', '2.5', '4.0', '6.0', '10.0', 
    '16.0', '25.0', '35.0', '50.0', '70.0', '95.0', '120.0', '150.0'
  ];
  
  function updateValueOptions() {
    const selectedTypeValue = typeSelect.value;
    valueSelect.innerHTML = '';
    
    if (selectedTypeValue === 'awg') {
      const awgValues = ['4/0', '3/0', '2/0', '1/0', '1', '2', '3', '4', '6', '8', '10', '12', '14', '16', '18', '20', '22', '24', '26', '28', '30'];
      awgValues.forEach(value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        opt.style.background = 'var(--panel2)';
        opt.style.color = 'var(--text-bright)';
        if (selectedType === 'awg' && value === selectedValue) {
          opt.selected = true;
        }
        valueSelect.appendChild(opt);
      });
    } else if (selectedTypeValue === 'mm2') {
      mm2Values.forEach(value => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        opt.style.background = 'var(--panel2)';
        opt.style.color = 'var(--text-bright)';
        if (selectedType === 'mm2' && value === selectedValue) {
          opt.selected = true;
        }
        valueSelect.appendChild(opt);
      });
    }
  }
  
  // Event listener para cambiar los valores cuando cambia el tipo
  typeSelect.addEventListener('change', updateValueOptions);
  
  // Inicializar con los valores seleccionados
  updateValueOptions();
  
  container.appendChild(typeSelect);
  container.appendChild(valueSelect);
  
  // Almacenar referencias para acceso posterior
  container.typeSelect = typeSelect;
  container.valueSelect = valueSelect;
  
  return container;
}

function formatAWGMM2(value) {
  if (!value) return '';
  
  // Check if value looks like mm2 (contains decimal point or is in mm2Values)
  const mm2Values = ['0.5', '0.75', '1.0', '1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0', '35.0', '50.0', '70.0', '95.0', '120.0', '150.0'];
  if (value.includes('.') || mm2Values.includes(value)) {
    return value + ' mm²';
  } else {
    return value + 'AWG';
  }
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 27: INSPECTOR DE NODOS
 * Panel lateral que muestra y permite editar las propiedades del nodo
 * seleccionado: nombre, P/N, backshell, etiqueta, mapeo de pines, etc.
 * ══════════════════════════════════════════════════════════════════════════ */
function showInspectorForNode(nodeId){
  const node=AppState.nodes[nodeId]; if(!node) return;
  const typeColor = node.type==='connector'?'var(--accent)':node.type==='bifurcation'?'var(--amber)':'var(--green)';
  inspectorContent.innerHTML='';

  const badge=document.createElement('div');
  badge.style.cssText=`display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:4px;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:1px;text-transform:uppercase;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);color:${typeColor};margin-bottom:10px`;
  const dot=document.createElement('span');
  dot.style.cssText=`width:6px;height:6px;border-radius:50%;background:${typeColor};display:block`;
  badge.appendChild(dot); 
  badge.appendChild(document.createTextNode(node.name||''));
  inspectorContent.appendChild(badge);

  // Botón eliminar nodo movido a la parte superior
  const btnDel=document.createElement('button'); 
  btnDel.className='btn btn-danger';
  btnDel.textContent='Eliminar nodo';
  btnDel.style.cssText = 'margin: 0 0 10px 0; height: 28px; padding: 0 10px; font-size: 11px; font-weight: 600; float: right; background: var(--red); color: white; border-color: var(--red); transition: all .15s;';
  btnDel.addEventListener('mouseenter',()=>{ 
    btnDel.style.background = 'var(--red-dim)'; 
    btnDel.style.borderColor = 'var(--red)';
    btnDel.style.boxShadow = '0 0 16px rgba(239,68,68,0.3)';
  });
  btnDel.addEventListener('mouseleave',()=>{ 
    btnDel.style.background = 'var(--red)'; 
    btnDel.style.boxShadow = '';
  });
  btnDel.addEventListener('click',()=>{ removeNode(nodeId); });
  inspectorContent.appendChild(btnDel);
  
  // Clear float para evitar problemas con elementos siguientes
  const clearFloat = document.createElement('div');
  clearFloat.style.cssText = 'clear: both;';
  inspectorContent.appendChild(clearFloat);

  if(node.type==='connector' || node.type==='terminal'){
    const fLabel=mkField('Etiqueta');
    const iLabel=makeEnterInput(node.label||'', v=>{
      node.label=v;
      updateBadges(nodeId);
      if(connectionLabelsTableManager){
        const hId='harness_'+(AppState.harness.current+1);
        connectionLabelsTableManager.updateNodeLabel(hId, nodeId, v);
      }
    },{'data-label':'1'});
    fLabel.appendChild(iLabel); inspectorContent.appendChild(fLabel);
  }

  if(node.type!=='bifurcation'){
    const pnLabel = node.type === 'connector' ? 'P/N CONECTOR' : 'P/N TERMINAL';
    const fPN=mkField(pnLabel);
    const iPN=makeEnterInput(node.pn, v=>{
      node.pn=v;
      node.el.querySelector('.pn').textContent=v;
    },{'data-pn':'1'});
    fPN.appendChild(iPN); inspectorContent.appendChild(fPN);
  }

  if(node.type!=='terminal' && node.type!=='bifurcation'){
    const fBs=mkField('P/N Backshell');
    const iBs=makeEnterInput(node.backshell, v=>{
      node.backshell=v;
      updateBadges(nodeId);
    },{'data-backshell':'1'});
    fBs.appendChild(iBs); inspectorContent.appendChild(fBs);
  }

  if(node.type==='connector'||node.type==='terminal'){
    const fP=mkField('Nº CONEXIONES ACTIVAS');
    const iP=makeEnterInput(node.connectionsCount ? String(node.connectionsCount) : '', v=>{
      let n=Math.max(0,Math.floor(Number(v)||0));
      if(node.type==='terminal') n=1;
      node.connectionsCount=n;
      if(!Array.isArray(node.mapping)) node.mapping=[];
      node.mapping.length=n;
      for(let i=0;i<n;i++){
        if(!node.mapping[i]) node.mapping[i]={pin:'',targetConnectorId:'',targetPin:'',signal:'',awg:AppState.config.lastSelectedAWG};
      }
      markCurrentDirty();
      updateBadges(nodeId);
    },{'data-pins':'1'});
    if(node.type==='terminal'){ iP.value='1'; iP.disabled=true; }
    fP.appendChild(iP); inspectorContent.appendChild(fP);
  }

  if(node.type==='connector'||node.type==='terminal'){
    const sep=document.createElement('div'); sep.style.cssText='border-top:1px solid var(--border);margin:10px 0';
    inspectorContent.appendChild(sep);
    const btnGroup=document.createElement('div'); btnGroup.className='btn-group';
    const btnEdit=document.createElement('button'); btnEdit.className='btn btn-ghost btn-sm'; btnEdit.textContent='Editar conexionado';
    btnEdit.addEventListener('click',()=>openMappingModal(nodeId));
    const btnSum=document.createElement('button'); btnSum.className='btn btn-ghost btn-sm'; btnSum.textContent='Ver resumen';
    btnSum.addEventListener('click',()=>openSummaryModal(nodeId));
    btnGroup.appendChild(btnEdit); btnGroup.appendChild(btnSum);
    inspectorContent.appendChild(btnGroup);
  }

  // Añadir sección de comentarios
  const commentsSection = document.createElement('div');
  commentsSection.className = 'comments-section';
  
  const commentsHeader = document.createElement('div');
  commentsHeader.className = 'comments-header';
  
  const commentsTitle = document.createElement('div');
  commentsTitle.className = 'comments-title';
  commentsTitle.textContent = 'Comentarios';
  
  const commentsActions = document.createElement('div');
  commentsActions.style.display = 'flex';
  commentsActions.style.gap = '6px';
  
  const addCommentBtn = document.createElement('button');
  addCommentBtn.className = 'add-comment-btn';
  addCommentBtn.textContent = '+ Añadir';
  addCommentBtn.addEventListener('click', () => {
    openCommentModal(nodeId, 'add');
  });
  
  commentsActions.appendChild(addCommentBtn);
  
  commentsHeader.appendChild(commentsTitle);
  commentsHeader.appendChild(commentsActions);
  commentsSection.appendChild(commentsHeader);
  
  const commentsList = document.createElement('div');
  commentsList.className = 'comments-list';
  commentsList.id = 'commentsList';
  
  commentsSection.appendChild(commentsList);
  inspectorContent.appendChild(commentsSection);
  
  // Mostrar comentarios existentes
  showCommentsInInspector(nodeId);

  // El botón eliminar nodo se movió a la parte superior
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 28: SELECTORES DE COLOR (IEC 60757)
 * Selectores de color dinámicos y selector de color IEC para cables,
 * con previsualización del color en el fondo de la opción.
 * ══════════════════════════════════════════════════════════════════════════ */
function createDynamicColorSelect(selectedValue = '', cableType = '') {
  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border-strong);background:rgba(255,255,255,0.05);color:var(--text-bright);font-size:12px;height:32px;font-family:\'Inter\',sans-serif;transition:border-color .15s,background .15s';
  
  // Opción vacía
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '—';
  sel.appendChild(emptyOption);
  
  let colorOptions = [];
  
  // Si es cable Ethernet, mostrar colores específicos
  if (cableType === 'ethernet') {
    // Colores Ethernet según estándar T568B (más común)
    colorOptions = [
      { value: 'W/O', text: 'W/O', color: '#FFE4B5' },
      { value: 'O', text: 'O', color: '#FFA500' },
      { value: 'W/G', text: 'W/G', color: '#E6FFE6' },
      { value: 'BL', text: 'BL', color: '#0066CC' },
      { value: 'W/BL', text: 'W/BL', color: '#E6F2FF' },
      { value: 'G', text: 'G', color: '#00AA00' },
      { value: 'W/BR', text: 'W/BR', color: '#F5DEB3' },
      { value: 'BR', text: 'BR', color: '#8B4513' }
    ];
  } else {
    // Colores IEC 60757 estándar para otros cables
    colorOptions = [
      { value: 'BN', text: 'BN', color: 'var(--iec-brown)' },
      { value: 'RD', text: 'RD', color: 'var(--iec-red)' },
      { value: 'OR', text: 'OR', color: 'var(--iec-orange)' },
      { value: 'YE', text: 'YE', color: 'var(--iec-yellow)' },
      { value: 'GN', text: 'GN', color: 'var(--iec-green)' },
      { value: 'YE/GN', text: 'YE/GN', color: 'linear-gradient(45deg, var(--iec-yellow) 50%, var(--iec-green) 50%)' },
      { value: 'BU', text: 'BU', color: 'var(--iec-blue)' },
      { value: 'VT', text: 'VT', color: 'var(--iec-violet)' },
      { value: 'GY', text: 'GY', color: 'var(--iec-grey)' },
      { value: 'WH', text: 'WH', color: 'var(--iec-white)' },
      { value: 'BK', text: 'BK', color: 'var(--iec-black)' }
    ];
  }
  
  colorOptions.forEach(color => {
    const option = document.createElement('option');
    option.value = color.value;
    option.textContent = color.text;
    option.style.background = color.color;
    option.style.color = getContrastColor(color.color);
    
    if (selectedValue === color.value) {
      option.selected = true;
    }
    sel.appendChild(option);
  });
  
  return sel;
}

// Función auxiliar para determinar el color de texto con mejor contraste
function getContrastColor(hexColor) {
  // Si es una variable CSS, devolver blanco por defecto
  if (hexColor.startsWith('var(')) {
    return '#fff';
  }
  
  // Convertir hex a RGB para calcular luminosidad
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calcular luminosidad relativa
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000' : '#fff';
}

// Mantener la función original para compatibilidad
function createIECColorSelect(selectedValue = '') {
  return createDynamicColorSelect(selectedValue, '');
}

function createAWGSelect(selectedValue = '') {
  const sel = document.createElement('select');
  sel.style.cssText = 'width:100%;padding:6px 8px;border-radius:6px;border:1px solid var(--border-strong);background:rgba(255,255,255,0.05);color:var(--text-bright);font-size:12px;height:32px;font-family:\'Inter\',sans-serif;transition:border-color .15s,background .15s';
  
  // Opción vacía
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '—';
  sel.appendChild(emptyOption);
  
  // Generar opciones solo con números pares de 0 a 30
  for (let awg = 0; awg <= 30; awg += 2) {
    const option = document.createElement('option');
    option.value = awg.toString();
    option.textContent = awg.toString();
    option.style.background = 'var(--panel2)';
    option.style.color = 'var(--text-bright)';
    
    if (selectedValue === awg.toString()) {
      option.selected = true;
    }
    
    sel.appendChild(option);
  }
  
  return sel;
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 29: INSPECTOR DE ENLACES
 * Panel que muestra las propiedades del enlace seleccionado:
 * nodos conectados, longitud, malla, termoretráctil, etc.
 * ══════════════════════════════════════════════════════════════════════════ */
function mkField(label){
  const d=document.createElement('div'); d.className='field';
  const l=document.createElement('label'); l.textContent=label;
  d.appendChild(l); return d;
}

function showInspectorForLink(link){
  inspectorContent.innerHTML='';
  const badge=document.createElement('div');
  badge.style.cssText='display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:4px;font-size:10px;font-weight:700;font-family:\'JetBrains Mono\',monospace;letter-spacing:1px;text-transform:uppercase;background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.2);color:var(--accent);margin-bottom:10px';
  badge.textContent='RAMAL'; inspectorContent.appendChild(badge);

  const f0=mkField('Desde → Hasta');
  const i0=document.createElement('input'); i0.type='text';
  i0.value=(AppState.nodes[link.fromNodeId]?.name||link.fromNodeId)+' → '+(AppState.nodes[link.toNodeId]?.name||link.toNodeId);
  i0.disabled=true; f0.appendChild(i0); inspectorContent.appendChild(f0);

  const f1=mkField('Longitud (mm)  (↵ para aplicar)');
  const i1=makeEnterInput(link.lengthMm!==undefined?String(link.lengthMm):'', v=>{
    const cleaned=(v||'').replace(/\s+/g,'').replace(',','.');
    const n=parseFloat(cleaned);
    link.lengthMm = !isNaN(n)?Math.round(n):'';
    positionLink(link);
  },{'data-length':'1'});
  i1.value=link.lengthMm||''; f0.appendChild(i1); inspectorContent.appendChild(f1);

  const sep=document.createElement('div'); sep.style.cssText='border-top:1px solid var(--border);margin:10px 0';
  inspectorContent.appendChild(sep);
  const decoLabel=document.createElement('div');
  decoLabel.style.cssText='font-size:10px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--muted2);margin-bottom:8px';
  decoLabel.textContent='Decoraciones'; inspectorContent.appendChild(decoLabel);

  function mkCheckRow(text, color, checked, onChange){
    const row=document.createElement('label'); row.className='toggle-row'; row.style.marginBottom='8px';
    const chk=document.createElement('input'); chk.type='checkbox'; chk.checked=checked;
    const dot=document.createElement('span');
    dot.style.cssText=`width:10px;height:10px;border-radius:2px;background:${color};display:inline-block;flex-shrink:0`;
    chk.addEventListener('change',()=>{ onChange(chk.checked); positionLink(link); markCurrentDirty(); });
    row.appendChild(chk); row.appendChild(dot); row.appendChild(document.createTextNode(' '+text));
    inspectorContent.appendChild(row);
  }
  mkCheckRow('Malla general',    'var(--green)', !!link.malla,           v=>link.malla=v);
  mkCheckRow('Termoretráctil',   'var(--amber)', !!link.termoretractil,  v=>link.termoretractil=v);

  const sep2=document.createElement('div'); sep2.style.cssText='border-top:1px solid var(--border);margin:10px 0';
  inspectorContent.appendChild(sep2);
  const btnDel=document.createElement('button'); btnDel.className='btn btn-danger btn-full';
  btnDel.textContent='Eliminar ramal';
  btnDel.addEventListener('click',()=>{ if(confirm('¿Eliminar ramal?')) removeLink(link); });
  inspectorContent.appendChild(btnDel);
}
