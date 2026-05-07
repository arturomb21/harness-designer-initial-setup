/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — links.js                                               ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Puertos, creación de enlaces, posicionamiento, edición inline
 * y funciones de redibujado general.
 * ║  Secciones: 18, 19, 20, 21, 22                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 18: PUERTOS Y DIBUJO DE CONEXIONES TEMPORALES
 * Dibujo de línea temporal desde un puerto hasta el cursor, y detección
 * del puerto destino al soltar (creación de enlace).
 * ══════════════════════════════════════════════════════════════════════════ */
AppState.interaction.activePort = null;
function portPointerDown(e){
  e.stopPropagation(); e.preventDefault();
  const port   = e.currentTarget;
  const nodeEl = port.closest('.node');
  const cr     = canvas.getBoundingClientRect();
  const pr     = port.getBoundingClientRect();
  const sx = pr.left - cr.left + pr.width/2  + canvas.scrollLeft;
  const sy = pr.top  - cr.top  + pr.height/2 + canvas.scrollTop;

  const tempLine = document.createElementNS('http://www.w3.org/2000/svg','line');
  tempLine.setAttribute('x1',sx); tempLine.setAttribute('y1',sy);
  tempLine.setAttribute('x2',sx); tempLine.setAttribute('y2',sy);
  tempLine.setAttribute('stroke','var(--accent)');
  tempLine.setAttribute('stroke-width',LINE_W);
  tempLine.setAttribute('stroke-linecap','round');
  tempLine.setAttribute('stroke-dasharray','8 4');
  tempLine.classList.add('temp-line');
  svg.appendChild(tempLine);
  AppState.interaction.activePort = { nodeId:nodeEl.dataset.id, portEl:port, tempLine };

  function move(ev){
    const cr2 = canvas.getBoundingClientRect();
    const x = ev.clientX - cr2.left + canvas.scrollLeft;
    const y = ev.clientY - cr2.top  + canvas.scrollTop;
    if(AppState.interaction.activePort&&AppState.interaction.activePort.tempLine){ AppState.interaction.activePort.tempLine.setAttribute('x2',x); AppState.interaction.activePort.tempLine.setAttribute('y2',y); }
  }
  function up(ev){
    const target = document.elementFromPoint(ev.clientX, ev.clientY);
    const tPort  = target && target.closest ? target.closest('.port') : null;
    if(AppState.interaction.activePort&&AppState.interaction.activePort.tempLine){
      if(tPort){
        const tNode = tPort.closest('.node');
        if(tNode && tNode.dataset.id !== AppState.interaction.activePort.nodeId) createLink(AppState.interaction.activePort.nodeId, tNode.dataset.id);
      }
      if(AppState.interaction.activePort.tempLine.parentNode) AppState.interaction.activePort.tempLine.parentNode.removeChild(AppState.interaction.activePort.tempLine);
    }
    AppState.interaction.activePort=null;
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    markCurrentDirty();
  }
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 19: CREACIÓN Y GESTIÓN DE ENLACES (links)
 * Creación de la línea SVG principal, líneas de malla/termoretráctil,
 * etiqueta de longitud, y estado de puerto conectado.
 * ══════════════════════════════════════════════════════════════════════════ */
function makeSvgLine(){ return document.createElementNS('http://www.w3.org/2000/svg','line'); }

function createLink(fromId, toId, opts={}){
  if(AppState.links.some(l=>l.fromNodeId===fromId&&l.toNodeId===toId)) return null;

  const line = makeSvgLine();
  line.setAttribute('stroke','var(--accent)');
  line.setAttribute('stroke-width', LINE_W);
  line.setAttribute('stroke-linecap','round');
  line.style.zIndex = '1'; // Líneas debajo de los badges (z-index: 40)
  line.dataset.id = 'l'+(++AppState.counters.link);

  const mallaTop    = makeSvgLine();
  const mallaBottom = makeSvgLine();
  [mallaTop, mallaBottom].forEach(l=>{
    l.setAttribute('stroke','#10b981');
    l.setAttribute('stroke-width','2');
    l.setAttribute('stroke-linecap','round');
    l.setAttribute('stroke-dasharray','8 5');
    l.style.display='none';
    l.style.zIndex = '1'; // Líneas de malla debajo de los badges (z-index: 40)
  });

  const termoTop    = makeSvgLine();
  const termoBottom = makeSvgLine();
  [termoTop, termoBottom].forEach(l=>{
    l.setAttribute('stroke','#f59e0b');
    l.setAttribute('stroke-width','2');
    l.setAttribute('stroke-linecap','round');
    l.style.display='none';
    l.style.zIndex = '1'; // Líneas termoretractiles debajo de los badges (z-index: 40)
  });

  const labelGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
  labelGroup.setAttribute('class','link-label-group');

  [termoBottom, termoTop, mallaBottom, mallaTop, line, labelGroup].forEach(el=>svg.appendChild(el));

  const link = {
    id: line.dataset.id,
    fromNodeId:fromId, toNodeId:toId,
    lineElement:line, labelGroup,
    mallaTop, mallaBottom, termoTop, termoBottom,
    lengthMm: opts.lengthMm||'',
    malla:!!opts.malla,
    termoretractil:!!opts.termoretractil
  };
  AppState.links.push(link);
  updatePortConnectedState(fromId);
  updatePortConnectedState(toId);
  line.addEventListener('pointerdown', ev=>{ ev.stopPropagation(); selectLink(link, ev.ctrlKey); });
  line.addEventListener('dblclick', ev=>{ 
    ev.stopPropagation(); 
    selectLink(link);
    // Enfocar campo de longitud en el inspector
    setTimeout(()=>{
      const lengthInput = inspectorContent.querySelector('input[data-length]');
      if(lengthInput){ 
        lengthInput.focus(); 
        lengthInput.select(); 
      }
    }, 120);
  });
  positionLink(link);
  markCurrentDirty();
  
  // Mostrar notificación de conexión creada con nombres específicos
  const fromName = getNodeDisplayName(fromId);
  const toName = getNodeDisplayName(toId);
  showNotification(`Conexión: ${fromName} → ${toName}`, 'success');
  
  return link;
}

function updatePortConnectedState(nodeId){
  const node = AppState.nodes[nodeId]; if(!node) return;
  const port = node.el.querySelector('.port');
  const conn = AppState.links.some(l=>l.fromNodeId===nodeId||l.toNodeId===nodeId);
  if(conn){ port.classList.add('connected'); } else { port.classList.remove('connected'); }
}

function getPortCenter(nodeEl, portEl){
  if(!portEl) return null;
  const cr = canvas.getBoundingClientRect();
  const pr = portEl.getBoundingClientRect();
  return { x:pr.left-cr.left+pr.width/2+canvas.scrollLeft, y:pr.top-cr.top+pr.height/2+canvas.scrollTop };
}
function getNodeCenter(nodeEl){
  const cr = canvas.getBoundingClientRect();
  const nr = nodeEl.getBoundingClientRect();
  return { x:nr.left-cr.left+nr.width/2+canvas.scrollLeft, y:nr.top-cr.top+nr.height/2+canvas.scrollTop };
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 20: POSICIONAMIENTO Y GEOMETRÍA DE ENLACES
 * Cálculo de posiciones de líneas, offsets de malla/termoretráctil,
 * y posicionamiento de la etiqueta de longitud sobre el enlace.
 * ══════════════════════════════════════════════════════════════════════════ */
function positionLink(link){
  const fromNode = AppState.nodes[link.fromNodeId];
  const toNode   = AppState.nodes[link.toNodeId];
  if(!fromNode||!toNode) return;

  const fromPort = fromNode.el.querySelector('.port');
  const toPort   = toNode.el.querySelector('.port');
  const fromPos  = getPortCenter(fromNode.el, fromPort)||getNodeCenter(fromNode.el);
  const toPos    = getPortCenter(toNode.el,   toPort)  ||getNodeCenter(toNode.el);

  const x1=fromPos.x, y1=fromPos.y, x2=toPos.x, y2=toPos.y;
  const mx=(x1+x2)/2, my=(y1+y2)/2;
  const dx=x2-x1, dy=y2-y1;
  const len=Math.sqrt(dx*dx+dy*dy)||1;

  let pxRaw=-dy/len, pyRaw=dx/len;
  if(pyRaw > 0){ pxRaw=-pxRaw; pyRaw=-pyRaw; }
  const pu={x:pxRaw, y:pyRaw};

  link.lineElement.setAttribute('stroke','var(--accent)');
  link.lineElement.setAttribute('stroke-width', LINE_W);
  link.lineElement.setAttribute('x1',x1); link.lineElement.setAttribute('y1',y1);
  link.lineElement.setAttribute('x2',x2); link.lineElement.setAttribute('y2',y2);

  const MALLA_OFF  = 7;
  const TERMO_OFF  = 13;

  if(link.malla){
    [link.mallaTop, link.mallaBottom].forEach((l,i)=>{
      const sign = i===0 ? 1 : -1;
      const off = MALLA_OFF * sign;
      l.setAttribute('x1', x1 + pu.x*off); l.setAttribute('y1', y1 + pu.y*off);
      l.setAttribute('x2', x2 + pu.x*off); l.setAttribute('y2', y2 + pu.y*off);
      l.style.display='';
    });
  } else {
    link.mallaTop.style.display='none';
    link.mallaBottom.style.display='none';
  }

  if(link.termoretractil){
    [link.termoTop, link.termoBottom].forEach((l,i)=>{
      const sign = i===0 ? 1 : -1;
      const off = TERMO_OFF * sign;
      l.setAttribute('x1', x1 + pu.x*off); l.setAttribute('y1', y1 + pu.y*off);
      l.setAttribute('x2', x2 + pu.x*off); l.setAttribute('y2', y2 + pu.y*off);
      l.style.display='';
    });
  } else {
    link.termoTop.style.display='none';
    link.termoBottom.style.display='none';
  }

  link.labelGroup.innerHTML='';
  const mm = (link.lengthMm!==''&&link.lengthMm!==undefined) ? String(link.lengthMm) : '';
  if(mm){
    const outerOff = link.termoretractil ? TERMO_OFF : link.malla ? MALLA_OFF : 0;
    const BADGE_GAP = 35;
    const badgeOff = outerOff + BADGE_GAP;

    const bx = mx + pu.x * (badgeOff + 12);
    const by = my + pu.y * (badgeOff + 12);

    const tipX = mx + pu.x * outerOff;
    const tipY = my + pu.y * outerOff;

    const ARROW_LEN = BADGE_GAP - 8;
    const hw = 5;
    const apx = pu.x, apy = pu.y;
    const arrowPts = [
      `${tipX},${tipY}`,
      `${tipX + apx*ARROW_LEN - (-apy)*hw},${tipY + apy*ARROW_LEN - apx*hw}`,
      `${tipX + apx*ARROW_LEN + (-apy)*hw},${tipY + apy*ARROW_LEN + apx*hw}` 
    ].join(' ');
    const arrowEl = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    arrowEl.setAttribute('points', arrowPts);
    arrowEl.setAttribute('fill','rgba(203,213,225,0.8)');
    arrowEl.setAttribute('stroke','rgba(203,213,225,0.4)');
    arrowEl.setAttribute('stroke-width','1');
    link.labelGroup.appendChild(arrowEl);

    const stemEl = document.createElementNS('http://www.w3.org/2000/svg','line');
    stemEl.setAttribute('x1', tipX + apx*ARROW_LEN);
    stemEl.setAttribute('y1', tipY + apy*ARROW_LEN);
    stemEl.setAttribute('x2', bx - pu.x*12);
    stemEl.setAttribute('y2', by - pu.y*12);
    stemEl.setAttribute('stroke','rgba(203,213,225,0.5)');
    stemEl.setAttribute('stroke-width','2');
    link.labelGroup.appendChild(stemEl);

    const text = mm+' mm';
    const TW = text.length * 8 + 24;
    const TH = 24;
    const rx = bx - TW/2; const ry = by - TH/2;

    const pill = document.createElementNS('http://www.w3.org/2000/svg','rect');
    pill.setAttribute('x',rx); pill.setAttribute('y',ry);
    pill.setAttribute('width',TW); pill.setAttribute('height',TH);
    pill.setAttribute('rx','6');
    pill.setAttribute('fill','var(--accent)');
    pill.setAttribute('stroke','rgba(255,255,255,0.3)');
    pill.setAttribute('stroke-width','2');
    pill.setAttribute('filter','drop-shadow(0 2px 8px rgba(0,0,0,0.4))');
    pill.setAttribute('data-link-id', link.id);
    pill.style.cursor = 'pointer';
    link.labelGroup.appendChild(pill);

    const textEl = document.createElementNS('http://www.w3.org/2000/svg','text');
    textEl.setAttribute('x', bx);
    textEl.setAttribute('y', by);
    textEl.setAttribute('text-anchor','middle');
    textEl.setAttribute('dominant-baseline','middle');
    textEl.setAttribute('font-size','12');
    textEl.setAttribute('font-weight','700');
    textEl.setAttribute('font-family',"'Inter',sans-serif");
    textEl.setAttribute('fill','#ffffff');
    textEl.setAttribute('letter-spacing','0.3');
    textEl.textContent = text;
    textEl.style.pointerEvents = 'none';
    link.labelGroup.appendChild(textEl);

    pill.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      
      // Seleccionar el ramal y mostrar en el inspector
      selectLink(link);
      
      // Editar la longitud
      editLinkLength(link, e.clientX, e.clientY);
    });
    
    // También intentar con click simple para depuración
    pill.addEventListener('click', (e) => {
    });
  }
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 21: EDICIÓN INLINE (longitud, backshell, etiqueta)
 * Campos de texto flotantes que aparecen al hacer doble clic sobre
 * un enlace o un badge, para edición rápida sin usar el inspector.
 * ══════════════════════════════════════════════════════════════════════════ */
function editLinkLength(link, clientX, clientY) {
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = link.lengthMm || '';
  input.className = 'badge-edit-input';
  input.placeholder = 'mm';
  
  const canvasRect = canvas.getBoundingClientRect();
  const left = (clientX - canvasRect.left + canvas.scrollLeft - 40);
  const top = (clientY - canvasRect.top + canvas.scrollTop - 20);
  
  
  input.style.left = left + 'px';
  input.style.top = top + 'px';
  input.style.position = 'absolute';
  input.style.zIndex = '10000';
  
  document.body.appendChild(input);
  
  input.focus();
  input.select();
  
  function saveAndClose() {
    const value = input.value.trim();
    const cleaned = value.replace(/\s+/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    link.lengthMm = !isNaN(num) ? Math.round(num) : '';
    positionLink(link);
    markCurrentDirty();
    
    if(AppState.selection.link === link) {
      const lengthInput = inspectorContent.querySelector('input[data-length]');
      if(lengthInput) {
        lengthInput.value = link.lengthMm || '';
      }
    }
    
    document.body.removeChild(input);
  }
  
  function cancel() {
    document.body.removeChild(input);
  }
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  
  input.addEventListener('blur', saveAndClose);
}

function editBackshellBadge(node, clientX, clientY) {
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = node.backshell || '';
  input.className = 'badge-edit-input';
  input.placeholder = 'P/N Backshell';
  
  const canvasRect = canvas.getBoundingClientRect();
  const left = (clientX - canvasRect.left + canvas.scrollLeft - 40);
  const top = (clientY - canvasRect.top + canvas.scrollTop - 20);
  
  input.style.left = left + 'px';
  input.style.top = top + 'px';
  input.style.position = 'absolute';
  input.style.zIndex = '10000';
  
  document.body.appendChild(input);
  input.focus();
  input.select();
  
  let isClosing = false;
  
  function saveAndClose() {
    if (isClosing) return;
    isClosing = true;
    
    const value = input.value.trim();
    node.backshell = value;
    updateBadges(node.id);
    markCurrentDirty();
    
    if(AppState.selection.node === node.el) {
      const backshellInput = inspectorContent.querySelector('input[data-backshell]');
      if(backshellInput) {
        backshellInput.value = value;
      }
    }
    
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  }
  
  function cancel() {
    if (isClosing) return;
    isClosing = true;
    
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  }
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  
  input.addEventListener('blur', saveAndClose);
}

function editLabelBadge(node, clientX, clientY) {
  
  const input = document.createElement('input');
  input.type = 'text';
  input.value = node.label || '';
  input.className = 'badge-edit-input';
  input.placeholder = 'Etiqueta';
  
  const canvasRect = canvas.getBoundingClientRect();
  const left = (clientX - canvasRect.left + canvas.scrollLeft - 40);
  const top = (clientY - canvasRect.top + canvas.scrollTop - 20);
  
  input.style.left = left + 'px';
  input.style.top = top + 'px';
  input.style.position = 'absolute';
  input.style.zIndex = '10000';
  
  document.body.appendChild(input);
  input.focus();
  input.select();
  
  let isClosing = false;
  
  function saveAndClose() {
    if (isClosing) return;
    isClosing = true;
    
    const value = input.value.trim();
    node.label = value;
    updateBadges(node.id);
    markCurrentDirty();
    
    if(AppState.selection.node === node.el) {
      const labelInput = inspectorContent.querySelector('input[data-label]');
      if(labelInput) {
        labelInput.value = value;
      }
    }
    
    if(connectionLabelsTableManager){
      const hId='harness_'+(AppState.harness.current+1);
      connectionLabelsTableManager.updateNodeLabel(hId, node.id, value);
    }
    
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  }
  
  function cancel() {
    if (isClosing) return;
    isClosing = true;
    
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  }
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAndClose();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  });
  
  input.addEventListener('blur', saveAndClose);
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 22: RENDERIZADO Y REDIBUJADO GENERAL
 * Actualización de enlaces de un nodo y redibujado completo del canvas.
 * ══════════════════════════════════════════════════════════════════════════ */
function updateLinksForNode(nodeId){
  AppState.links.forEach(l=>{ if(l.fromNodeId===nodeId||l.toNodeId===nodeId) positionLink(l); });
}
function redrawAll(){ AppState.links.forEach(positionLink); updateAllBadges(); }
