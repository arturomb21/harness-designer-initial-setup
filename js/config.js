/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║                      HARNESS DESIGNER — script.js                       ║
 * ║              Aplicación de diseño de arneses eléctricos                 ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * ÍNDICE DE SECCIONES:
 * ────────────────────────────────────────────────────────────────────────────
 *  1. REFERENCIAS AL DOM
 *  2. CONFIGURACIÓN Y CONSTANTES
 *  3. VARIABLES DE ESTADO GLOBAL
 *  4. FUNCIONES DE UTILIDAD
 *  5. GRID, LAYOUT Y EVENTOS DE VENTANA
 *  6. SISTEMA DE NOTIFICACIONES
 *  7. PERSISTENCIA DE DATOS (localStorage)
 *  8. GESTIÓN DE USUARIOS
 *  9. CARGA Y GUARDADO DE DATOS
 * 10. GESTIÓN DE ESTADO DIRTY / CLEAN
 * 11. GESTIÓN DE NOMBRES DE COMPONENTES
 * 12. DRAG & DROP DESDE LA PALETA
 * 13. SELECCIÓN POR ARRASTRE EN EL CANVAS
 * 14. SNAP TO GRID Y CREACIÓN DE NODOS
 * 15. BADGES (backshell y etiqueta)
 * 16. SELECCIÓN MÚLTIPLE DE NODOS
 * 17. MOVIMIENTO DE NODOS (drag)
 * 18. PUERTOS Y DIBUJO DE CONEXIONES TEMPORALES
 * 19. CREACIÓN Y GESTIÓN DE ENLACES (links)
 * 20. POSICIONAMIENTO Y GEOMETRÍA DE ENLACES
 * 21. EDICIÓN INLINE (longitud, backshell, etiqueta)
 * 22. RENDERIZADO Y REDIBUJADO GENERAL
 * 23. ELIMINACIÓN DE NODOS Y ENLACES
 * 24. SELECCIÓN, INSPECTOR Y BOX-SELECT
 * 25. ATAJOS DE TECLADO
 * 26. CONTROLES DE FORMULARIO (inputs, selects)
 * 27. INSPECTOR DE NODOS
 * 28. SELECTORES DE COLOR (IEC 60757)
 * 29. INSPECTOR DE ENLACES
 * 30. MODAL DE MAPEO DE CONEXIONES
 * 31. SINCRONIZACIÓN BIDIRECCIONAL DE SEÑALES
 * 32. VALIDACIÓN DE CONEXIONES
 * 33. MODAL DE RESUMEN
 * 34. EXPORTACIÓN (Excel / CSV)
 * 35. SERIALIZACIÓN Y ESTADO DE ARNESES
 * 36. GESTIÓN DE PESTAÑAS (tabs)
 * 37. HISTORIAL GLOBAL
 * 38. VALIDACIÓN Y DATOS DE PROYECTO
 * 39. SISTEMA DE COMENTARIOS
 * 40. CALENDARIO PERSONALIZADO
 * 41. TABLA DE ETIQUETAS DE CONEXIONES (ConnectionLabelsTableManager)
 * 42. INICIALIZACIÓN Y ESTILOS DINÁMICOS
 * ────────────────────────────────────────────────────────────────────────────
 */


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 1: REFERENCIAS AL DOM
 * Elementos del canvas, botones, modales y paneles de la interfaz.
 * ══════════════════════════════════════════════════════════════════════════ */
// Canvas y área principal
const canvas         = document.getElementById('canvas');
const svg            = document.getElementById('svg');
const palette        = document.getElementById('palette');
const snapToggle     = document.getElementById('snapToggle');
const clearBtn       = document.getElementById('clearBtn');
const globalHistoryBtn = document.getElementById('globalHistoryBtn');
const inspectorContent = document.getElementById('inspectorContent');
const badgesContainer  = document.getElementById('badgesContainer');
const notificationContainer = document.getElementById('notificationContainer');

// Botones de acción
const exportCsvBtn   = document.getElementById('exportCsvBtn');
const saveAllBtn     = document.getElementById('saveAllBtn');
const openAllFile    = document.getElementById('openAllFile');
const fabNewHarness  = document.getElementById('fabNewHarness');

// Ventanas modales principales
const modalBackdrop    = document.getElementById('modalBackdrop');
const modalOwnerNote   = document.getElementById('modalOwnerNote');
const modalConnectionTable = document.querySelector('#modalConnectionTable tbody');
const modalCancel      = document.getElementById('modalCancel');
const modalSave        = document.getElementById('modalSave');

// Modal de resumen
const summaryBackdrop  = document.getElementById('summaryBackdrop');
const summaryTableBody = document.querySelector('#summaryTable tbody');
const summaryClose     = document.getElementById('summaryClose');

// Modal de confirmación
const clearConfirmBackdrop    = document.getElementById('clearConfirmBackdrop');
const clearCancel             = document.getElementById('clearCancel');
const clearAccept             = document.getElementById('clearAccept');

// Pestañas
const closeTabConfirmBackdrop = document.getElementById('closeTabConfirmBackdrop');
const closeTabCancel          = document.getElementById('closeTabCancel');
const closeTabAccept          = document.getElementById('closeTabAccept');
const tabsEl = document.getElementById('tabs');

// Sistema de comentarios
const commentModalBackdrop = document.getElementById('commentModalBackdrop');
const commentModalTitle    = document.getElementById('commentModalTitle');
const commentAuthor        = document.getElementById('commentAuthor');
const commentText          = document.getElementById('commentText');
const commentModalCancel   = document.getElementById('commentModalCancel');
const commentModalSave     = document.getElementById('commentModalSave');

const historyModalBackdrop = document.getElementById('historyModalBackdrop');
const historyFilter        = document.getElementById('historyFilter');
const historyCommentsList  = document.getElementById('historyCommentsList');
// Modal de eliminación
const deleteConfirmModal   = document.getElementById('deleteConfirmModal');
const deleteConfirmMessage = document.getElementById('deleteConfirmMessage');
const deleteConfirmCancel   = document.getElementById('deleteConfirmCancel');
const deleteConfirmAccept   = document.getElementById('deleteConfirmAccept');

// Modal de datos de proyecto
const projectDataModal     = document.getElementById('projectDataModal');
const businessUnitInput    = document.getElementById('businessUnitInput');
const projectNameInput      = document.getElementById('projectNameInput');
const projectPasswordInput = document.getElementById('projectPasswordInput');
const designResponsibleInput = document.getElementById('designResponsibleInput');
const projectHeaderInput    = document.getElementById('projectHeaderInput');
const applicableStandardInput = document.getElementById('applicableStandardInput');
const specificRequirementsInput = document.getElementById('specificRequirementsInput');
const icmProjectNameInput  = document.getElementById('icmProjectNameInput');
const workCenterInput       = document.getElementById('workCenterInput');
const icmAreaInput          = document.getElementById('icmAreaInput');
const requiredDateInput     = document.getElementById('requiredDateInput');
const projectDataCancel     = document.getElementById('projectDataCancel');
const projectDataSave       = document.getElementById('projectDataSave');
const projectNameDisplay    = document.getElementById('projectNameDisplay');

// Modal de calendario
const calendarModal         = document.getElementById('calendarModal');
const calendarPrevMonth     = document.getElementById('calendarPrevMonth');
const calendarNextMonth     = document.getElementById('calendarNextMonth');
const calendarMonthYear     = document.getElementById('calendarMonthYear');
const calendarDays          = document.getElementById('calendarDays');
const calendarCancel        = document.getElementById('calendarCancel');
const calendarToday         = document.getElementById('calendarToday');


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 2: CONFIGURACIÓN Y CONSTANTES
 * Dimensiones del grid, nodos y líneas de conexión.
 * ══════════════════════════════════════════════════════════════════════════ */
const GRID     = 24;
const NODE_W   = 96;  // 4 cuadrículas (4 × 24px)
const NODE_H   = 96;  // 4 cuadrículas (4 × 24px)
const LINE_W   = 4;


/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 3: ESTADO GLOBAL → state.js (AppState)
 * Todas las variables de estado se han movido a js/state.js
 * ══════════════════════════════════════════════════════════════════════════ */
