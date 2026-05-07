/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — modal-mapping.js                                       ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Modal de mapeo de conexiones, sincronización bidireccional y validación.  
 * ║  Secciones: 30, 31, 32                                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — modals.js                                              ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Modal de mapeo de conexiones, sincronización bidireccional,
 * validación, modal de resumen y exportación Excel/CSV.
 * ║  Secciones: 30, 31, 32, 33, 34                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 30: MODAL DE MAPEO DE CONEXIONES
 * Ventana modal para editar la tabla de mapeo pin-a-pin de un conector,
 * con validación en tiempo real y auto-generación de filas.
 * ══════════════════════════════════════════════════════════════════════════ */
AppState.modals.editingNodeId=null;

function openMappingModal(nodeId){
  const node=AppState.nodes[nodeId]; if(!node) return;
  AppState.modals.editingNodeId=nodeId;
  // Helper function to get display name (label if exists, otherwise name)
  function getDisplayName(nodeObj, nodeId) {
    if(nodeObj.label && nodeObj.label.trim()) {
      return nodeObj.label.trim();
    }
    return nodeObj.name || nodeId;
  }
  modalOwnerNote.textContent=`Editando conexionado de: ${node.name} (${getDisplayName(node, nodeId)})`;

  Object.keys(AppState.nodes).forEach(k=>{ if(!Array.isArray(AppState.nodes[k].mapping)) AppState.nodes[k].mapping=[]; });

  const connections=[];

  Object.keys(AppState.nodes).forEach(ownerId=>{
    const owner=AppState.nodes[ownerId];
    if(!owner||!Array.isArray(owner.mapping)) return;
    owner.mapping.forEach((m,idx)=>{
      // Para conectores: mostrar solo conexiones salientes
      if(AppState.nodes[nodeId].type === 'connector' && ownerId === nodeId) {
        connections.push({
          ownerId,
          ownerIndex: idx,
          pin: m.pin || '',
          targetConnectorId: m.targetConnectorId || '',
          targetPin: m.targetPin || '',
          signal: m.signal || '',
          cableType: m.cableType || '',
          awg: m.awg || '',
          iecColor: m.iecColor || '',
          isOutgoing: true
        });
      }
      // Para terminales: mostrar conexiones entrantes desde otros nodos (herencia bidireccional)
      else if(AppState.nodes[nodeId].type === 'terminal' && m.targetConnectorId === nodeId) {
        connections.push({
          ownerId,
          ownerIndex: idx,
          pin: m.pin || '',
          targetConnectorId: m.targetConnectorId || '',
          targetPin: m.targetPin || '',
          signal: m.signal || '',
          cableType: m.cableType || '',
          awg: m.awg || '',
          iecColor: m.iecColor || '',
          isOutgoing: false
        });
      }
    });
  });

  modalConnectionTable.innerHTML='';
  const connOpts=Object.keys(AppState.nodes).filter(id=>AppState.nodes[id].type==='connector'||AppState.nodes[id].type==='terminal');

  connections.forEach(r=>{
    const tr=document.createElement('tr');
    tr.className='mapping-row';
    tr.dataset.ownerId=r.ownerId; tr.dataset.ownerIndex=r.ownerIndex;
    
    const tdPO=document.createElement('td'); 
    const iPO=document.createElement('input'); iPO.type='text'; iPO.value=r.pin||'';
    iPO.style.cssText='';
    tdPO.appendChild(iPO); 
    tr.appendChild(tdPO);
    
    const tdConn=document.createElement('td');
    const sel=document.createElement('select'); 
    sel.style.cssText='';
    const eo=document.createElement('option'); eo.value=''; eo.textContent='—'; sel.appendChild(eo);
    connOpts.forEach(cid=>{ 
      const o=document.createElement('option'); 
      o.value=cid; 
      // Helper function to get display name (label if exists, otherwise name)
      function getDisplayName(nodeObj, nodeId) {
        if(nodeObj.label && nodeObj.label.trim()) {
          return nodeObj.label.trim();
        }
        return nodeObj.name || nodeId;
      }
      o.textContent=getDisplayName(AppState.nodes[cid], cid); 
      o.style.background='var(--panel2)';
      o.style.color='var(--text-bright)';
      if(r.targetConnectorId===cid) o.selected=true; 
      sel.appendChild(o); 
    });
    tdConn.appendChild(sel); tr.appendChild(tdConn);
    
    const tdPD=document.createElement('td'); 
    const iPD=document.createElement('input'); iPD.type='text'; iPD.value=r.targetPin||'';
    iPD.style.cssText='';
    tdPD.appendChild(iPD); 
    tr.appendChild(tdPD);
    
    const tdSig=document.createElement('td'); 
    const iSig=document.createElement('input'); iSig.type='text'; iSig.value=r.signal||'';
    iSig.style.cssText='';
    tdSig.appendChild(iSig); 
    tr.appendChild(tdSig);
    
    const tdCableType=document.createElement('td');
    const selCableType = createCableTypeSelect(r.cableType || '');
    tdCableType.appendChild(selCableType);
    tr.appendChild(tdCableType);
    
    const tdAWG=document.createElement('td');
    // Parse existing awg value to determine type and value
    let wireType = 'awg';
    let wireValue = r.awg || '';
    
    // Check if the value looks like mm2 (contains decimal point or is in mm2Values)
    const mm2Values = ['0.5', '0.75', '1.0', '1.5', '2.5', '4.0', '6.0', '10.0', '16.0', '25.0', '35.0', '50.0', '70.0', '95.0', '120.0', '150.0'];
    if (wireValue && (wireValue.includes('.') || mm2Values.includes(wireValue))) {
      wireType = 'mm2';
    }
    
    const selAWG = createAWGMM2Select(wireType, wireValue);
    tdAWG.appendChild(selAWG);
    tr.appendChild(tdAWG);
    
    const tdColor=document.createElement('td');
    const selColor = createDynamicColorSelect(r.iecColor || '', r.cableType || '');
    tdColor.appendChild(selColor);
    tr.appendChild(tdColor);
    
    [iPO,sel,iPD,iSig,selColor].forEach(i=>i.addEventListener('input',()=>{
      validateModal();
      validateRealTimeConflicts(tr);
      
      // Guardar cambios localmente cuando se modifica cualquier campo
      persistToLocalStorage();
      
      // Herencia de señales: si se cambia la señal en una conexión, actualizar la conexión inversa
      if(i === iSig && i.value.trim() && sel.value) {
        updateSignalInReverseConnection(sel.value, iPO.value.trim(), i.value.trim());
      }
    }));
    
    // Event listener para actualizar colores cuando cambia el tipo de cable
    selCableType.addEventListener('change',()=>{
      const newCableType = selCableType.value;
      const currentColor = selColor.value;
      
      // Crear nuevo selector de colores con el tipo de cable actualizado
      const newColorSelect = createDynamicColorSelect(currentColor, newCableType);
      
      // Reemplazar el selector actual
      tdColor.innerHTML = '';
      tdColor.appendChild(newColorSelect);
      
      // Añadir event listeners al nuevo selector
      newColorSelect.addEventListener('input',()=>{
        validateModal();
        validateRealTimeConflicts(tr);
        
        // Guardar cambios localmente cuando se modifica el color
        persistToLocalStorage();
      });
      
      // Automatización para mangueras de corriente
      if (newCableType === 'manguera_corriente') {
        // Cambiar automáticamente a mm2
        selAWG.typeSelect.value = 'mm2';
        selAWG.typeSelect.dispatchEvent(new Event('change'));
        
        // Opcional: establecer un valor por defecto común para mangueras
        if (!selAWG.valueSelect.value) {
          selAWG.valueSelect.value = '2.5'; // 2.5 mm² es común para mangueras
        }
      } else if (newCableType === 'unifilar_mm2') {
        // Cambiar automáticamente a mm2 para cables unifilares métricos
        selAWG.typeSelect.value = 'mm2';
        selAWG.typeSelect.dispatchEvent(new Event('change'));
        
        // Opcional: establecer un valor por defecto común para cables unifilares mm2
        if (!selAWG.valueSelect.value) {
          selAWG.valueSelect.value = '1.5'; // 1.5 mm² es común para unifilares
        }
      } else if (newCableType === 'unifilar') {
        // Cambiar automáticamente a AWG para cables unifilares americanos
        selAWG.typeSelect.value = 'awg';
        selAWG.typeSelect.dispatchEvent(new Event('change'));
        
        // Opcional: establecer un valor por defecto común para cables unifilares AWG
        if (!selAWG.valueSelect.value) {
          selAWG.valueSelect.value = '16'; // 16 AWG es común para unifilares
        }
      } else {
        // Si no es unifilar y estaba en mm2, volver a AWG
        if (selAWG.typeSelect.value === 'mm2') {
          selAWG.typeSelect.value = 'awg';
          selAWG.typeSelect.dispatchEvent(new Event('change'));
          
          // Opcional: establecer un valor por defecto común para AWG
          if (!selAWG.valueSelect.value) {
            selAWG.valueSelect.value = '16'; // 16 AWG es común
          }
        }
      }
      
      validateModal();
      validateRealTimeConflicts(tr);
    });
    
    // Event listeners para los selectores AWG/mm2
    selAWG.typeSelect.addEventListener('change',()=>{
      validateModal();
      validateRealTimeConflicts(tr);
      // Update last selected AWG when changed
      if(selAWG.typeSelect.value === 'awg' && selAWG.valueSelect.value) {
        AppState.config.lastSelectedAWG = selAWG.valueSelect.value;
        persistToLocalStorage();
      }
    });
    
    selAWG.valueSelect.addEventListener('change',()=>{
      validateModal();
      validateRealTimeConflicts(tr);
      // Update last selected AWG when changed
      if(selAWG.typeSelect.value === 'awg' && selAWG.valueSelect.value) {
        AppState.config.lastSelectedAWG = selAWG.valueSelect.value;
        persistToLocalStorage();
      }
    });
    
    // Función para mover al campo de abajo en la misma columna
    function moveToNextField(currentInput, row) {
      const inputs = row.querySelectorAll('input, select');
      const currentIndex = Array.from(inputs).indexOf(currentInput);
      
      // Buscar la siguiente fila
      const nextRow = row.nextElementSibling;
      if (nextRow) {
        const nextRowInputs = nextRow.querySelectorAll('input, select');
        if (currentIndex < nextRowInputs.length) {
          const nextInput = nextRowInputs[currentIndex];
          nextInput.focus();
          if (nextInput.tagName === 'INPUT') {
            nextInput.select();
          }
        }
      } else {
        // Si no hay siguiente fila, quitar el foco del campo actual
        currentInput.blur();
      }
    }
    
    // Añadir validación con Enter y navegación
    [iPO,iPD,iSig].forEach(input=>{
      input.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          validateModal();
          validateRealTimeConflicts(tr);
          moveToNextField(input, tr);
        }
      });
      
      // Validación al perder el foco
      input.addEventListener('blur', ()=>{
        validateModal();
        validateRealTimeConflicts(tr);
      });
    });
    
    // Añadir navegación con Enter para los select también
    [sel, selAWG].forEach(select=>{
      select.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){
          e.preventDefault();
          validateModal();
          validateRealTimeConflicts(tr);
          moveToNextField(select, tr);
        }
      });
    });
    selAWG.addEventListener('focus', ()=>{
      if(!selAWG.value && AppState.config.lastSelectedAWG) {
        // Store current empty value to restore if no selection is made
        selAWG.dataset.wasEmpty = 'true';
      }
    });
    
    selAWG.addEventListener('mousedown', ()=>{
      if(!selAWG.value && AppState.config.lastSelectedAWG) {
        // Pre-select last selected AWG when opening dropdown
        selAWG.value = AppState.config.lastSelectedAWG;
        selAWG.dataset.preSelected = 'true';
      }
    });
    
    selAWG.addEventListener('change', ()=>{
      if(selAWG.dataset.preSelected === 'true' && selAWG.value === AppState.config.lastSelectedAWG) {
        // User selected the pre-selected value, keep it
        delete selAWG.dataset.preSelected;
        AppState.config.lastSelectedAWG = selAWG.value;
        persistToLocalStorage();
      } else if(selAWG.dataset.wasEmpty === 'true' && !selAWG.value) {
        // User closed dropdown without selecting, restore empty
        delete selAWG.dataset.wasEmpty;
      }
      validateModal();
      validateRealTimeConflicts(tr);
    });
    sel.addEventListener('change',()=>{
      validateModal();
      validateRealTimeConflicts(tr);
      const targetConnectorId = sel.value;
      if(targetConnectorId && AppState.nodes[targetConnectorId]) {
        const targetNode = AppState.nodes[targetConnectorId];
        const currentPin = iPO.value.trim();
        
        // Auto-rellenar pin destino si es terminal
        if(targetNode.type === 'terminal') {
          iPD.value = '1';
          iPD.disabled = true;
        } else {
          iPD.disabled = false;
        }
        
        if(currentPin && targetNode.type !== 'terminal') {
          autoGenerateBidirectionalConnection(nodeId, targetConnectorId, currentPin, iPD.value.trim(), iSig.value.trim());
        }
      } else {
        iPD.disabled = false;
      }
    });
    modalConnectionTable.appendChild(tr);
  });

  validateModal();
  modalBackdrop.style.display='flex';
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 31: SINCRONIZACIÓN BIDIRECCIONAL DE SEÑALES
 * Actualización de señales en el conector opuesto cuando se edita
 * un mapeo, y auto-generación de conexiones bidireccionales.
 * ══════════════════════════════════════════════════════════════════════════ */
function updateSignalInReverseConnection(targetConnectorId, originPin, signal) {
  const targetNode = AppState.nodes[targetConnectorId];
  if (!targetNode) return;
  
  // Si el destino es un terminal, buscar en todos los nodos la conexión hacia este terminal
  if (targetNode.type === 'terminal') {
    Object.keys(AppState.nodes).forEach(nodeId => {
      const node = AppState.nodes[nodeId];
      if (node && Array.isArray(node.mapping)) {
        const terminalConnection = node.mapping.find(m => 
          m.targetConnectorId === targetConnectorId && m.pin === originPin
        );
        if (terminalConnection) {
          terminalConnection.signal = signal;
          showNotification(`Señal actualizada en terminal desde ${getNodeDisplayName(nodeId)}`, 'info');
        }
      }
    });
  } else {
    // Para conectores: buscar la conexión inversa en el nodo destino
    if (!Array.isArray(targetNode.mapping)) return;
    const reverseConnection = targetNode.mapping.find(m => 
      m.targetConnectorId === AppState.modals.editingNodeId && m.targetPin === originPin
    );
    
    if (reverseConnection) {
      reverseConnection.signal = signal;
      showNotification(`Señal actualizada en conexión inversa de ${getNodeDisplayName(targetConnectorId)}`, 'info');
    }
  }
}

function autoGenerateBidirectionalConnection(fromNodeId, toNodeId, fromPin, toPin, signal) {
  const fromNode = AppState.nodes[fromNodeId];
  const toNode = AppState.nodes[toNodeId];
  
  if (!fromNode || !toNode || toNode.type === 'terminal') return;
  
  if (!Array.isArray(toNode.mapping)) toNode.mapping = [];
  
  const existingIndex = toNode.mapping.findIndex(m => 
    m.targetConnectorId === fromNodeId && m.targetPin === fromPin
  );
  
  if (existingIndex === -1) {
    let targetIndex = toNode.mapping.findIndex(m => !m.pin || m.pin === '');
    if (targetIndex === -1) {
      targetIndex = toNode.mapping.length;
      toNode.mapping.push({pin:'',targetConnectorId:'',targetPin:'',signal:'',awg:AppState.config.lastSelectedAWG});
      toNode.connectionsCount = toNode.mapping.length;
    }
    
    toNode.mapping[targetIndex] = {
      pin: toPin || String(targetIndex + 1),
      targetConnectorId: fromNodeId,
      targetPin: fromPin,
      signal: signal || '',
      cableType: '',
      awg: AppState.config.lastSelectedAWG,
      isAutoGenerated: true
    };
    
    toNode.connectionsCount = toNode.mapping.length;
    
    showNotification(`Conexión bidireccional generada: ${getNodeDisplayName(toNodeId)} ← ${getNodeDisplayName(fromNodeId)}`, 'success');
  }
}



/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 32: VALIDACIÓN DE CONEXIONES
 * Recolección de conexiones propuestas y validación de conflictos
 * de pines duplicados o asignaciones inválidas.
 * ══════════════════════════════════════════════════════════════════════════ */
function collectProposed(){
  const proposed={};
  Object.keys(AppState.nodes).forEach(id=>{ 
    proposed[id]=Array.isArray(AppState.nodes[id].mapping)?AppState.nodes[id].mapping.map(m=>Object.assign({},m)):[] 
  });

  Array.from(modalConnectionTable.querySelectorAll('tr')).forEach(tr=>{
    const ownerId=tr.dataset.ownerId, ownerIndex=Number(tr.dataset.ownerIndex);
    const inputs=tr.querySelectorAll('input'); 
    const selects=tr.querySelectorAll('select');
    const originPin=(inputs[0]?.value||'').trim();
    const targetConnectorId=selects[0]?selects[0].value:'';
    const targetPin=(inputs[1]?.value||'').trim(); 
    const signal=(inputs[2]?.value||'').trim();
    const cableType=(selects[1]?selects[1].value:'');
    
    // Handle AWG/mm2 stacked selectors
    let awg = '';
    const awgContainer = tr.querySelector('td:nth-child(6) > div');
    if (awgContainer && awgContainer.typeSelect && awgContainer.valueSelect) {
      const wireType = awgContainer.typeSelect.value;
      const wireValue = awgContainer.valueSelect.value;
      if (wireType === 'awg') {
        awg = wireValue;
      } else if (wireType === 'mm2') {
        awg = wireValue;
      }
    }
    
    // Obtener el selector de color específicamente de la celda de color
    const colorSelect = tr.querySelector('td:nth-child(7) select');
    const iecColor = colorSelect ? colorSelect.value : '';
    if(!proposed[ownerId]) proposed[ownerId]=[];
    proposed[ownerId][ownerIndex]=Object.assign({},proposed[ownerId][ownerIndex]||{},{pin:originPin,targetConnectorId,targetPin,signal,cableType,awg,iecColor});
  });
  return proposed;
}

function validateRealTimeConflicts(currentRow){
  const proposed=collectProposed();
  const mapTarget={}, mapOrigin={};
  
  // Verificar conflictos con TODOS los nodos del proyecto
  Object.keys(AppState.nodes).forEach(nodeId=>{
    const node = AppState.nodes[nodeId];
    if(!Array.isArray(node.mapping)) return;
    
    // Si el nodo actual está en el modal, usar los datos propuestos, si no, usar los actuales
    const mapping = proposed[nodeId] || node.mapping;
    
    mapping.forEach((m, idx)=>{
      if(m && m.targetConnectorId && m.targetPin) {
        const k = `${m.targetConnectorId}::${m.targetPin}`;
        (mapTarget[k] = mapTarget[k] || []).push({ownerId: nodeId, idx});
      }
      if(m && m.pin) {
        const k = `${nodeId}::${m.pin}`;
        (mapOrigin[k] = mapOrigin[k] || []).push({ownerId: nodeId, idx});
      }
    });
  });

  // Limpiar conflictos anteriores
  modalConnectionTable.querySelectorAll('tr').forEach(r=>r.classList.remove('conflict'));

  let hasConflict=false;
  function markConflict(entries){
    entries.forEach(({ownerId, idx})=>{
      // Marcar conflictos si la entrada está en el modal actual
      const tr = modalConnectionTable.querySelector(`tr[data-owner-id="${ownerId}"][data-owner-index="${idx}"]`)
                 || Array.from(modalConnectionTable.querySelectorAll('tr')).find(r=>r.dataset.ownerId===ownerId&&Number(r.dataset.ownerIndex)===idx);
      if(tr) tr.classList.add('conflict');
    });
  }
  
  // Validar conflictos de destino
  Object.values(mapTarget).forEach(arr=>{ 
    if(arr.length>1){ 
      // Obtener el targetConnectorId directamente de la clave del mapTarget
      const key = Object.keys(mapTarget).find(k => mapTarget[k] === arr);
      const [targetConnectorId] = key.split('::');
      
      const actualTargetNode = AppState.nodes[targetConnectorId];
      if(actualTargetNode && actualTargetNode.type !== 'terminal') {
        hasConflict=true; 
        markConflict(arr); 
      }
    } 
  });
  
  // Validar conflictos de origen
  Object.values(mapOrigin).forEach(arr=>{ 
    if(arr.length>1){ 
      const originId = arr[0].ownerId;
      const originNode = AppState.nodes[originId];
      if(originNode && originNode.type !== 'terminal') {
        hasConflict=true; 
        markConflict(arr); 
      }
    } 
  });
  
  // Mostrar notificación si hay conflicto
  if(hasConflict && currentRow.classList.contains('conflict')){
    showNotification('Conflicto detectado: pin duplicado en conector', 'error');
  }
}

function validateModal(){
  const proposed=collectProposed();
  const mapTarget={}, mapOrigin={};
  
  // Verificar conflictos con TODOS los nodos del proyecto
  Object.keys(AppState.nodes).forEach(nodeId=>{
    const node = AppState.nodes[nodeId];
    if(!Array.isArray(node.mapping)) return;
    
    // Si el nodo actual está en el modal, usar los datos propuestos, si no, usar los actuales
    const mapping = proposed[nodeId] || node.mapping;
    
    mapping.forEach((m, idx)=>{
      if(m && m.targetConnectorId && m.targetPin) {
        const k = `${m.targetConnectorId}::${m.targetPin}`;
        (mapTarget[k] = mapTarget[k] || []).push({ownerId: nodeId, idx});
      }
      if(m && m.pin) {
        const k = `${nodeId}::${m.pin}`;
        (mapOrigin[k] = mapOrigin[k] || []).push({ownerId: nodeId, idx});
      }
    });
  });

  modalConnectionTable.querySelectorAll('tr').forEach(r=>r.classList.remove('conflict'));

  let hasConflict=false;
  function markConflict(entries){
    entries.forEach(({ownerId, idx})=>{
      // Solo marcar conflictos si la entrada está en el modal actual
      const tr = modalConnectionTable.querySelector(`tr[data-owner-id="${ownerId}"][data-owner-index="${idx}"]`)
                 || Array.from(modalConnectionTable.querySelectorAll('tr')).find(r=>r.dataset.ownerId===ownerId&&Number(r.dataset.ownerIndex)===idx);
      if(tr) tr.classList.add('conflict');
    });
  }
  Object.values(mapTarget).forEach(arr=>{ 
    // Permitir múltiples conexiones si el destino es un terminal
    if(arr.length>1){ 
      // Obtener el targetConnectorId correcto del primer elemento
      const firstEntry = arr[0];
      const targetNodeId = firstEntry.ownerId;
      const targetNode = AppState.nodes[targetNodeId];
      
      // Buscar el mapping para obtener el targetConnectorId real
      let actualTargetId = null;
      const mapping = AppState.nodes[targetNodeId]?.mapping || [];
      const mappingEntry = mapping[firstEntry.idx];
      if(mappingEntry && mappingEntry.targetConnectorId) {
        actualTargetId = mappingEntry.targetConnectorId;
      }
      
      const actualTargetNode = AppState.nodes[actualTargetId];
      if(actualTargetNode && actualTargetNode.type !== 'terminal') {
        hasConflict=true; 
        markConflict(arr); 
      }
    } 
  });
  Object.values(mapOrigin).forEach(arr=>{ 
    // Permitir múltiples conexiones desde el mismo pin si el origen es un terminal
    if(arr.length>1){ 
      const originId = arr[0].ownerId;
      const originNode = AppState.nodes[originId];
      if(originNode && originNode.type !== 'terminal') {
        hasConflict=true; 
        markConflict(arr); 
      }
    } 
  });
  modalSave.disabled=hasConflict;
  return !hasConflict;
}

modalCancel.addEventListener('click',()=>{ modalBackdrop.style.display='none'; AppState.modals.editingNodeId=null; });
modalSave.addEventListener('click',()=>{
  if(!AppState.modals.editingNodeId) return;
  if(!validateModal()){ alert('Hay conflictos (pines duplicados). Corrígelos antes de guardar.'); return; }
  const proposed=collectProposed();
  Object.keys(proposed).forEach(ownerId=>{
    if(!AppState.nodes[ownerId]) return;
    AppState.nodes[ownerId].mapping=proposed[ownerId].map(m=>({
      pin:m?String(m.pin||''):'',
      targetConnectorId:m?m.targetConnectorId||'':'',
      targetPin:m?m.targetPin||'':'',
      signal:m?m.signal||'':'',
      cableType:m?m.cableType||'':'',
      awg:m?m.awg||'':'',
      iecColor:m?m.iecColor||'':'',
      isAutoGenerated: m?.isAutoGenerated || false
    }));
    if(AppState.nodes[ownerId].type==='terminal'){
      AppState.nodes[ownerId].connectionsCount=1;
      AppState.nodes[ownerId].mapping=AppState.nodes[ownerId].mapping.length?[Object.assign({},AppState.nodes[ownerId].mapping[0],{pin:'1',awg:AppState.config.lastSelectedAWG})]:[{pin:'1',targetConnectorId:'',targetPin:'',signal:'',awg:AppState.config.lastSelectedAWG}];
    }
  });
  modalBackdrop.style.display='none'; AppState.modals.editingNodeId=null;
  redrawAll(); markCurrentDirty();
});
