/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — app.js                                                 ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Inicialización final y estilos dinámicos inyectados al <head>.            
 * ║  Secciones: 42                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 42: INICIALIZACIÓN Y ESTILOS DINÁMICOS
 * Instancia del manager de etiquetas y animaciones CSS inyectadas
 * dinámicamente al <head>.
 * ══════════════════════════════════════════════════════════════════════════ */
const connectionLabelsTableManager = new ConnectionLabelsTableManager();

const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);
