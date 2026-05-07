/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — canvas.js                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Drag & drop desde la paleta y selección por arrastre en el canvas.        
 * ║  Secciones: 12, 13                                                         ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 12: DRAG & DROP DESDE LA PALETA
 * Arrastre de componentes desde la barra lateral al canvas.
 * Incluye ghost image personalizado y validación de tipo.
 * ══════════════════════════════════════════════════════════════════════════ */
palette.querySelectorAll('.palette-item').forEach(item=>{
  item.addEventListener('dragstart', e=>{
    const type = item.dataset.type;
    const ghost = document.createElement('div');
    ghost.style.cssText=`width:${NODE_W}px;height:${NODE_H}px;border-radius:8px;background:#0c1828;border:1px solid rgba(59,130,246,0.3);color:#e8f0fc;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;position:absolute;top:-1000px`;
    ghost.textContent = type==='connector'?'Conector':type==='bifurcation'?'Bifurcación':'Terminal';
    document.body.appendChild(ghost);
    e.dataTransfer.setData('text/plain', type);
    e.dataTransfer.setDragImage(ghost, NODE_W/2, NODE_H/2);
    setTimeout(()=>document.body.removeChild(ghost),0);
  });
});
canvas.addEventListener('dragover', e=> {
  // Solo permitir drop si viene de la paleta (tiene dataTransfer)
  if(e.dataTransfer.types.length === 0) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
});


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 13: SELECCIÓN POR ARRASTRE EN EL CANVAS
 * Rectángulo de selección visual al arrastrar sobre el fondo del canvas.
 * Selecciona nodos que intersectan el área de arrastre.
 * ══════════════════════════════════════════════════════════════════════════ */
// Implementación de selección por arrastre - volver a solución simple pero corregida
let dragStartPos = null;
let minDragDistance = 5;
let isDragging = false;

canvas.addEventListener('pointerdown', e => {
  // Solo iniciar selección por arrastre si el clic es en el canvas vacío
  if(e.target === canvas || e.target === svg) {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left + canvas.scrollLeft;
    const y = e.clientY - rect.top + canvas.scrollTop;
    
    dragStartPos = { x, y };
    isDragging = false;
  }
});

document.addEventListener('pointermove', e => {
  if(!dragStartPos) return;
  
  const rect = canvas.getBoundingClientRect();
  const currentX = e.clientX - rect.left + canvas.scrollLeft;
  const currentY = e.clientY - rect.top + canvas.scrollTop;
  
  // Calcular distancia del arrastre
  const dragDistance = Math.sqrt(
    Math.pow(currentX - dragStartPos.x, 2) + 
    Math.pow(currentY - dragStartPos.y, 2)
  );
  
  // Si no ha alcanzado la distancia mínima, salir
  if(dragDistance < minDragDistance) return;
  
  if(!isDragging) {
    isDragging = true;
    clearNodeSelection();
    
    // Crear elemento visual para el rectángulo de selección
    if(AppState.selection.box && AppState.selection.box.parentNode) {
      AppState.selection.box.parentNode.removeChild(AppState.selection.box);
    }
    AppState.selection.box = document.createElement('div');
    AppState.selection.box.style.cssText = `
      position: absolute;
      border: 2px dashed rgba(74, 144, 226, 0.8);
      background: rgba(74, 144, 226, 0.2);
      pointer-events: none;
      z-index: 1000;
      left: ${dragStartPos.x}px;
      top: ${dragStartPos.y}px;
      width: 0;
      height: 0;
    `;
    canvas.appendChild(AppState.selection.box);
  }
  
  // Actualizar el rectángulo de selección
  const left = Math.min(dragStartPos.x, currentX);
  const top = Math.min(dragStartPos.y, currentY);
  const width = Math.abs(currentX - dragStartPos.x);
  const height = Math.abs(currentY - dragStartPos.y);
  
  AppState.selection.box.style.left = `${left}px`;
  AppState.selection.box.style.top = `${top}px`;
  AppState.selection.box.style.width = `${width}px`;
  AppState.selection.box.style.height = `${height}px`;
  
  // Seleccionar nodos en el área
  clearNodeSelection();
  
  Object.keys(AppState.nodes).forEach(nodeId => {
    const node = AppState.nodes[nodeId];
    if(!node || !node.el) return;
    
    const nodeRect = node.el.getBoundingClientRect();
    const nodeLeft = nodeRect.left - rect.left + canvas.scrollLeft;
    const nodeTop = nodeRect.top - rect.top + canvas.scrollTop;
    const nodeRight = nodeLeft + nodeRect.width;
    const nodeBottom = nodeTop + nodeRect.height;
    
    // Verificar si el nodo intersecta con el rectángulo de selección
    if(!(nodeRight < left || nodeLeft > left + width || 
         nodeBottom < top || nodeTop > top + height)) {
      node.el.classList.add('selected');
      AppState.selection.multi.add(nodeId);
    }
  });
});

document.addEventListener('pointerup', e => {
  // Eliminar el rectángulo de selección si existe
  if(AppState.selection.box && AppState.selection.box.parentNode) {
    AppState.selection.box.parentNode.removeChild(AppState.selection.box);
    AppState.selection.box = null;
  }
  
  // Resetear variables
  isDragging = false;
  dragStartPos = null;
});
canvas.addEventListener('drop', e=>{
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  // Verificar que el tipo sea válido para evitar componentes fantasmas
  if(!type || !['connector', 'bifurcation', 'terminal'].includes(type)) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  let x = e.clientX - rect.left + canvas.scrollLeft - NODE_W/2;
  let y = e.clientY - rect.top  + canvas.scrollTop  - NODE_H/2;
  if(snapToggle.checked){ const p=snapToGrid(x,y); x=p.x; y=p.y; }
  else { x=Math.max(0,x); y=Math.max(0,y); }
  const newNodeId = createNode(type, x, y);
  redrawAll();
  markCurrentDirty();
  
  // Update connection labels table if needed
  if (connectionLabelsTableManager) {
    connectionLabelsTableManager.showHarnessTable(`harness_${AppState.harness.current + 1}`);
  }
  
  // Seleccionar automáticamente el nuevo componente para edición
  if(newNodeId && AppState.nodes[newNodeId]) {
    selectNode(AppState.nodes[newNodeId].el);
  }
});
