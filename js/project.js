/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — project.js                                             ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Historial global, validación de nombre de proyecto, datos de proyecto,    
 * ║  Secciones: 37, 38 + listeners de proyecto                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 37: HISTORIAL GLOBAL
 * Modal con el historial de comentarios de todos los arneses,
 * con filtro por tipo de componente.
 * ══════════════════════════════════════════════════════════════════════════ */
function openGlobalHistoryModal() {
  // Update modal title to show current harness name
  const harnessName = getCurrentHarnessName();
  const modalTitle = historyModalBackdrop.querySelector('h3');
  modalTitle.textContent = `Historial de Comentarios - ${harnessName}`;
  
  // Clear and populate filter with current harness nodes
  historyFilter.innerHTML = '<option value="">Todos los comentarios</option>';
  Object.keys(AppState.nodes).forEach(nodeId => {
    const node = AppState.nodes[nodeId];
    const nodeName = node.label || node.name || nodeId;
    const option = document.createElement('option');
    option.value = nodeId;
    option.textContent = nodeName;
    option.style.background = 'var(--panel2)';
    option.style.color = 'var(--text-bright)';
    historyFilter.appendChild(option);
  });
  
  // Update history display
  updateHistoryDisplay();
  
  // Show modal
  historyModalBackdrop.style.display = 'flex';
}


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 38: VALIDACIÓN Y DATOS DE PROYECTO
 * Validación del nombre de proyecto y gestión de los datos generales
 * del proyecto (unidad de negocio, responsable, estándares, etc.).
 * ══════════════════════════════════════════════════════════════════════════ */
function validateAndSaveProjectName() {
  const value = projectNameInput.value.trim();
  if (value !== getProjectName()) {
    setProjectName(value);
    persistToLocalStorage();
    showNotification(`Nombre del proyecto actualizado: ${value || '(sin nombre)'}`, 'info');
  }
}

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', function() {
  
  // Iniciar siempre sin cargar datos previos - aplicación limpia
  createNewHarness('Arnés 1');
  
  // Añadir event listeners después de que el DOM esté listo
  const clearBtnElement = document.getElementById('clearBtn');
  if(clearBtnElement) {
    clearBtnElement.addEventListener('click',()=>{ clearConfirmBackdrop.style.display='flex'; clearAccept.focus(); });
  }
  
  // Verificar si clearCanvasBtn existe antes de añadir el event listener
  const clearCanvasElement = document.getElementById('clearCanvasBtn');
  if(clearCanvasElement) {
    clearCanvasElement.addEventListener('click',()=>{ 
      clearConfirmBackdrop.style.display='flex'; 
      clearAccept.focus();
    });
  } else {
    console.error('clearCanvasBtn element not found!');
  }
});
clearCancel.addEventListener('click',()=>{ clearConfirmBackdrop.style.display='none'; });
clearAccept.addEventListener('click',()=>{
  clearConfirmBackdrop.style.display='none';
  Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
  AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
  AppState.comments.data={}; // Clear all AppState.comments.data when clearing canvas
  inspectorContent.innerHTML='<div class="hint">Selecciona un nodo o un ramal para editar sus propiedades.</div>';
  AppState.counters.connector=0; AppState.counters.terminal=0; AppState.counters.node=0; AppState.counters.link=0;
  if(AppState.harness.current>=0&&AppState.harness.list[AppState.harness.current]){ AppState.harness.list[AppState.harness.current].nodes=[]; AppState.harness.list[AppState.harness.current].links=[]; AppState.harness.list[AppState.harness.current].meta.dirty=true; }
  
  // Clear connection labels table
  if(connectionLabelsTableManager) {
    connectionLabelsTableManager.clearAllTables();
  }
  
  renderTabs(); persistToLocalStorage();
  showNotification('Lienzo limpiado: todos los comentarios han sido eliminados', 'info');
});

saveAllBtn.addEventListener('click',()=>{
  if(AppState.harness.current>=0) saveCurrentHarnessSnapshot();
  markAllClean();
  const data=serializeAllHarnesses();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url;
  a.download=`harnesses_${new Date().toISOString().replace(/[:.]/g,'-')}.harnesses.json`;
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },500);
});

openAllFile.addEventListener('change',ev=>{
  const file=ev.target.files&&ev.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      const obj=JSON.parse(e.target.result);
      if(obj.project) setProjectObject(obj.project);
      if(obj.lastAWG) setConfigValue('lastSelectedAWG', obj.lastAWG);
      
      const loaded=Array.isArray(obj.harnesses)?obj.harnesses:(Array.isArray(obj)?obj:null);
      if(!loaded) throw new Error('Formato inválido');
      AppState.harness.list=loaded.map((h,i)=>{ const c=deepClone(h||{nodes:[],links:[],meta:{}}); if(!c.meta) c.meta={}; c.meta.name=c.meta.name||`Arnés ${i+1}`; c.meta.dirty=false; return c; });
      AppState.harness.current=0;
      Object.keys(AppState.nodes).forEach(id=>{ const n=AppState.nodes[id]; if(n.el?.parentNode) n.el.parentNode.removeChild(n.el); if(n.backshellBadgeEl?.parentNode) n.backshellBadgeEl.parentNode.removeChild(n.backshellBadgeEl); if(n.labelBadgeEl?.parentNode) n.labelBadgeEl.parentNode.removeChild(n.labelBadgeEl); });
      AppState.nodes={}; while(svg.firstChild) svg.removeChild(svg.firstChild); AppState.links=[];
      AppState.counters.node=0; AppState.counters.link=0; AppState.counters.connector=0; AppState.counters.terminal=0;
      applyHarnessObject(deepClone(AppState.harness.list[0]));
      renderTabs(); persistToLocalStorage();
      
      // Update project name display after loading project
      updateProjectNameDisplay();
      
      showNotification('Proyecto cargado correctamente.', 'success');
    }catch(err){ 
      showNotification('Error al leer el fichero: formato inválido.', 'error');
      console.error(err); 
    }
    finally{ openAllFile.value=''; }
  };
  reader.readAsText(file);
});

// Comment system functions

/* --- Listeners de eventos de datos de proyecto --- */
// Project data modal event listeners
projectDataBtn.addEventListener('click', () => {
  // Load current project data into modal
  businessUnitInput.value = getProjectMeta('businessUnit') || '';
  projectNameInput.value = getProjectName() || '';
  projectPasswordInput.value = getProjectMeta('password') || '';
  designResponsibleInput.value = getProjectMeta('designResponsible') || '';
  projectHeaderInput.value = getProjectMeta('projectHeader') || '';
  applicableStandardInput.value = getProjectMeta('applicableStandard') || '';
  specificRequirementsInput.value = getProjectMeta('specificRequirements') || '';
  icmProjectNameInput.value = getProjectMeta('icmProjectName') || '';
  workCenterInput.value = getProjectMeta('workCenter') || '';
  icmAreaInput.value = getProjectMeta('icmArea') || '';
  
  // Handle date formatting
  const requiredDateValue = getProjectMeta('requiredDate');
  if (requiredDateValue) {
    const date = new Date(requiredDateValue);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      requiredDateInput.value = `${day}/${month}/${year}`;
      requiredDateInput.dataset.isoDate = requiredDateValue;
    } else {
      requiredDateInput.value = '';
      requiredDateInput.dataset.isoDate = '';
    }
  } else {
    requiredDateInput.value = '';
    requiredDateInput.dataset.isoDate = '';
  }
  
  // Update project name display
  updateProjectNameDisplay();
  
  projectDataModal.style.display = 'flex';
  businessUnitInput.focus();
});

projectDataCancel.addEventListener('click', () => {
  projectDataModal.style.display = 'none';
});

projectDataSave.addEventListener('click', () => {
  // Save project data
  setProjectName(projectNameInput.value.trim());
  setProjectMeta('businessUnit', businessUnitInput.value.trim());
  setProjectMeta('password', projectPasswordInput.value.trim());
  setProjectMeta('designResponsible', designResponsibleInput.value.trim());
  setProjectMeta('projectHeader', projectHeaderInput.value.trim());
  setProjectMeta('applicableStandard', applicableStandardInput.value.trim());
  setProjectMeta('specificRequirements', specificRequirementsInput.value.trim());
  setProjectMeta('icmProjectName', icmProjectNameInput.value.trim());
  setProjectMeta('workCenter', workCenterInput.value.trim());
  setProjectMeta('icmArea', icmAreaInput.value.trim());
  setProjectMeta('requiredDate', requiredDateInput.value);
  
  projectDataModal.style.display = 'none';
  persistToLocalStorage();
  showNotification('Datos de proyecto guardados', 'success');
});

// Close project modal on backdrop click
projectDataModal.addEventListener('click', (e) => {
  if (e.target === projectDataModal) {
    projectDataModal.style.display = 'none';
  }
});

// Project data field validation and navigation

/* --- Validación de campos y navegación con Enter --- */
const projectDataFields = [
  businessUnitInput,
  projectNameInput,
  projectPasswordInput,
  designResponsibleInput,
  projectHeaderInput,
  applicableStandardInput,
  specificRequirementsInput,
  icmProjectNameInput,
  workCenterInput,
  icmAreaInput,
  requiredDateInput
];

// Function to setup field validation and navigation
function setupProjectDataFieldValidation(field, nextField) {
  if (!field) return;
  
  // Validate on Enter key and move to next field
  field.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Save current field value to projectData
      saveFieldValueToProjectData(field);
      
      // Move to next field or save if last field
      if (nextField) {
        nextField.focus();
        nextField.select();
      } else {
        // Last field, trigger save
        projectDataSave.click();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      projectDataCancel.click();
    }
  });
  
  // Validate on blur (loss of focus)
  field.addEventListener('blur', () => {
    saveFieldValueToProjectData(field);
  });
}

// Function to save field value to projectData
function saveFieldValueToProjectData(field) {
  if (!field) return;
  
  if (!AppState.project.meta) AppState.project.meta = {};
  
  switch(field.id) {
    case 'businessUnitInput':
      AppState.project.meta.businessUnit = field.value.trim();
      break;
    case 'projectNameInput':
      AppState.project.name = field.value.trim();
      updateProjectNameDisplay();
      break;
    case 'projectPasswordInput':
      AppState.project.meta.password = field.value.trim();
      break;
    case 'designResponsibleInput':
      AppState.project.meta.designResponsible = field.value.trim();
      break;
    case 'projectHeaderInput':
      AppState.project.meta.projectHeader = field.value.trim();
      break;
    case 'applicableStandardInput':
      AppState.project.meta.applicableStandard = field.value.trim();
      break;
    case 'specificRequirementsInput':
      AppState.project.meta.specificRequirements = field.value.trim();
      break;
    case 'icmProjectNameInput':
      AppState.project.meta.icmProjectName = field.value.trim();
      break;
    case 'workCenterInput':
      AppState.project.meta.workCenter = field.value.trim();
      break;
    case 'icmAreaInput':
      AppState.project.meta.icmArea = field.value.trim();
      break;
    case 'requiredDateInput':
      AppState.project.meta.requiredDate = field.dataset.isoDate || '';
      break;
  }
  
  // Persist to localStorage
  persistToLocalStorage();
}

// Function to update project name display in toolbar
function updateProjectNameDisplay() {
  const currentProjectName = getProjectName().trim();
  if (currentProjectName) {
    projectNameDisplay.textContent = 'Proyecto: ' + currentProjectName;
    projectNameDisplay.style.display = 'inline';
  } else {
    projectNameDisplay.style.display = 'none';
  }
}

// Setup validation for all fields
projectDataFields.forEach((field, index) => {
  const nextField = index < projectDataFields.length - 1 ? projectDataFields[index + 1] : null;
  setupProjectDataFieldValidation(field, nextField);
});

// Custom Calendar Functionality
