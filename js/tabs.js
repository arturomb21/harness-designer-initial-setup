/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — tabs.js                                                ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Crear, renombrar, cerrar y cambiar entre arneses (pestañas).              
 * ║  Secciones: 36                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 36: GESTIÓN DE PESTAÑAS (tabs)
 * Crear, renombrar, cerrar y cambiar entre arneses.
 * Cada pestaña representa un arnés independiente.
 * ══════════════════════════════════════════════════════════════════════════ */
AppState.modals.pendingCloseTab=null;

function createNewHarness(initialName='Arnés nuevo'){
  if(AppState.harness.current>=0) saveCurrentHarnessSnapshot();
  AppState.harness.list.push({nodes:[],links:[],meta:{name:initialName,createdAt:new Date().toISOString(),dirty:true}});
  AppState.harness.current=AppState.harness.list.length-1;
  Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
  AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
  AppState.comments.data={}; // Clear AppState.comments.data for new project
  AppState.counters.node=0; AppState.counters.link=0; AppState.counters.connector=0; AppState.counters.terminal=0;
  clearSelection(); // Clear inspector selection when creating new harness
  renderTabs(); persistToLocalStorage();
  
  // Update connection labels table for the new harness
  if (connectionLabelsTableManager) {
    // The new harness will be the last one in the array
    const newHarnessId = `harness_${AppState.harness.list.length}`;
    connectionLabelsTableManager.showHarnessTable(newHarnessId);
  }
}

function renderTabs(){
  tabsEl.innerHTML='';
  AppState.harness.list.forEach((h,idx)=>{
    const t=document.createElement('div');
    t.className='tab'+(idx===AppState.harness.current?' active':'');
    t.dataset.harnessId = `harness_${idx + 1}`;
    const name=(h.meta&&h.meta.name)||`Arnés ${idx+1}`;
    const dirty=(h.meta&&h.meta.dirty)?'*':'';
    const nameSpan=document.createElement('span'); nameSpan.textContent=name+(dirty?' '+dirty:''); nameSpan.setAttribute('data-tooltip', 'Doble clic para renombrar');
    t.addEventListener('click',()=>{
      switchHarness(idx);
      // Dispatch tabChanged event for ConnectionLabelsTableManager
      document.dispatchEvent(new CustomEvent('tabChanged', {
        detail: { harnessId: `harness_${idx + 1}` }
      }));
    });
    nameSpan.addEventListener('dblclick',ev=>{
      ev.stopPropagation();
      const inp=document.createElement('input'); inp.type='text'; inp.value=name;
      inp.style.cssText='min-width:100px;max-width:180px;padding:4px 6px;border-radius:4px;border:1px solid var(--accent);background:rgba(59,130,246,0.1);color:#fff;font-weight:600;font-size:12px';
      t.replaceChild(inp,nameSpan); inp.focus(); inp.select();
      function commit(){ const v=(inp.value||'').trim()||`Arnés ${idx+1}`; if(!AppState.harness.list[idx]) AppState.harness.list[idx]={nodes:[],links:[],meta:{}}; if(!AppState.harness.list[idx].meta) AppState.harness.list[idx].meta={}; AppState.harness.list[idx].meta.name=v; AppState.harness.list[idx].meta.dirty=true; renderTabs(); persistToLocalStorage(); 
      // Update connection labels table title
      if(connectionLabelsTableManager) {
        connectionLabelsTableManager.updateTableTitle(`harness_${idx + 1}`, v);
      }
    }
      inp.addEventListener('keydown',ke=>{ if(ke.key==='Enter') commit(); else if(ke.key==='Escape') renderTabs(); });
      inp.addEventListener('blur',commit);
    });
    t.appendChild(nameSpan);
    const cl=document.createElement('span'); cl.className='close'; cl.textContent='✕';
    cl.addEventListener('click',ev=>{ ev.stopPropagation(); AppState.modals.pendingCloseTab=idx; closeTabConfirmBackdrop.style.display='flex'; closeTabAccept.focus(); });
    t.appendChild(cl); tabsEl.appendChild(t);
  });
  if(AppState.harness.list.length===0) createNewHarness('Arnés 1');
}

function switchHarness(idx){
  if(idx===AppState.harness.current) return;
  
  // Si el modal de edición está abierto, guardar los cambios automáticamente
  if(modalBackdrop.style.display === 'flex' && AppState.modals.editingNodeId) {
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
    });
    modalBackdrop.style.display='none'; AppState.modals.editingNodeId=null;
    redrawAll(); markCurrentDirty();
  }
  
  if(AppState.harness.current>=0) saveCurrentHarnessSnapshot();
  AppState.harness.current=idx;
  const target=AppState.harness.list[idx]?deepClone(AppState.harness.list[idx]):{nodes:[],links:[],meta:{name:`Arnés ${idx+1}`}};
  Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
  AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
  AppState.comments.data={}; // Clear AppState.comments.data before switching harness
  AppState.counters.node=0; AppState.counters.link=0; AppState.counters.connector=0; AppState.counters.terminal=0;
  clearSelection(); // Clear selection when switching AppState.harness.list
  
  applyHarnessObject(target);
  renderTabs();
}

closeTabAccept.addEventListener('click',()=>{
  const idx=AppState.modals.pendingCloseTab; AppState.modals.pendingCloseTab=null;
  closeTabConfirmBackdrop.style.display='none';
  if(idx===null||idx===undefined) return;
  
  // Delete connection labels table for this harness
  if (connectionLabelsTableManager) {
    const harnessIdToDelete = `harness_${idx + 1}`;
    connectionLabelsTableManager.deleteHarnessTable(harnessIdToDelete);
  }
  
  AppState.harness.list.splice(idx,1);
  if(AppState.harness.list.length===0){
    AppState.harness.current=-1;
    Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
    AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
    createNewHarness('Arnés 1');
  } else {
    AppState.harness.current=Math.min(idx,AppState.harness.list.length-1);
    const target=deepClone(AppState.harness.list[AppState.harness.current]);
    Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
    AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
    AppState.counters.node=0; AppState.counters.link=0; AppState.counters.connector=0; AppState.counters.terminal=0;
    applyHarnessObject(target);
    renderTabs();
  }
  persistToLocalStorage();
});
closeTabCancel.addEventListener('click',()=>{ AppState.modals.pendingCloseTab=null; closeTabConfirmBackdrop.style.display='none'; });
fabNewHarness.addEventListener('click',()=> createNewHarness(`Arnés ${AppState.harness.list.length+1}`));

// Project name management
projectNameInput.addEventListener('input', (e) => {
  // Solo actualizar visualmente, no guardar hasta validar
});

projectNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    validateAndSaveProjectName();
  }
});

projectNameInput.addEventListener('blur', () => {
  validateAndSaveProjectName();
});

// Global history button event listener
globalHistoryBtn.addEventListener('click', () => {
  openGlobalHistoryModal();
});
