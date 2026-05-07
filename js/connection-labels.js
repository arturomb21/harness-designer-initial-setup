/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — connection-labels.js                                   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Clase ConnectionLabelsTableManager para la tabla de etiquetas.            
 * ║  Secciones: 41                                                             ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 41: TABLA DE ETIQUETAS DE CONEXIONES (ConnectionLabelsTableManager)
 * Clase que gestiona la tabla lateral de etiquetas de conexiones,
 * permitiendo asignar etiquetas a nodos y una etiqueta central al arnés.
 * ══════════════════════════════════════════════════════════════════════════ */
class ConnectionLabelsTableManager {
  constructor() {
    this.harnessTables = new Map(); // harnessId -> tableData
    this.currentHarnessId = null;
    this.activeTable = null;
    this.isUpdating = false; // Prevent infinite loops
    this.init();
  }

  init() {
    // Load projectData from localStorage first
    this.loadProjectDataFromStorage();
    
    // Initialize with current harness
    this.currentHarnessId = this.getCurrentHarnessId();
    
    // Only show if there are enough nodes (this will create the table if needed)
    this.showHarnessTable(this.currentHarnessId);
    
    // Listen for tab changes
    this.initTabListeners();
  }

  loadProjectDataFromStorage() {
    try {
      const storedData = localStorage.getItem('projectData');
      
      if (storedData) {
        AppState.project = JSON.parse(storedData);
      } else {
      }
    } catch (error) {
    }
  }

  getCurrentHarnessId() {
    // Get current harness ID from tabs system
    const activeTab = document.querySelector('.tab.active');
    if (activeTab && activeTab.dataset.harnessId) {
      return activeTab.dataset.harnessId;
    }
    
    // Fallback: use current harness index
    if (typeof AppState.harness.current !== 'undefined') {
      return `harness_${AppState.harness.current + 1}`;
    }
    
    // Default fallback
    return 'harness_1';
  }

  createHarnessTable(harnessId) {
    if (this.harnessTables.has(harnessId)) {
      return this.harnessTables.get(harnessId);
    }

    const tableData = {
      harnessId: harnessId,
      harnessName: this.getHarnessDisplayName(harnessId),
      tableState: {
        isMinimized: false,
        position: { x: 100, y: 100 },
        dimensions: { width: 'auto', height: 'auto' }
      },
      connectionLabels: {
        central: '',
        nodes: new Map() // nodeId -> label
      },
      columnStructure: {
        headers: [],
        nodeOrder: []
      }
    };

    // Load saved data if exists
    this.loadHarnessData(harnessId, tableData);
    
    // Create table element
    const tableElement = this.createTableElement(harnessId, tableData);
    
    this.harnessTables.set(harnessId, {
      data: tableData,
      element: tableElement
    });


    return { data: tableData, element: tableElement };
  }

  createTableElement(harnessId, tableData) {
    
    const tableElement = document.createElement('div');
    tableElement.className = `connection-table ${tableData.tableState.isMinimized ? 'minimized' : 'maximized'}`;
    tableElement.id = `connectionLabelsTable_${harnessId}`;
    tableElement.dataset.harnessId = harnessId;
    
    // Calculate centered position with 100px margin from footbar
    const canvasRect = canvas.getBoundingClientRect();
    const tableWidth = 260; // Approximate width for 2 columns (130px each)
    const centeredX = (canvasRect.width - tableWidth) / 2;
    const footbarMargin = 100; // 100px margin from footbar
    
    // Set position - use saved position if exists, otherwise center
    const savedX = tableData.tableState.position.x;
    const savedY = tableData.tableState.position.y;
    
    if (savedX === 100 && savedY === 100) {
      // Default position - center horizontally, offset if minimized
      const posOffset = tableData.tableState.isMinimized ? 200 : 0;
      tableElement.style.left = `${centeredX + posOffset}px`;
      tableElement.style.top = `${canvasRect.height - footbarMargin - 48}px`;
    } else {
      // Use saved position
      tableElement.style.left = `${savedX}px`;
      tableElement.style.top = `${savedY}px`;
    }
    
    // Start hidden by default (will be shown by showHarnessTable if conditions are met)
    tableElement.style.display = 'none';
    
    // Generate table HTML
    const html = this.generateTableHTML(harnessId, tableData);
    tableElement.innerHTML = html;
    
    // Add to container
    const container = document.getElementById('connectionLabelsTableContainer');
    
    if (container) {
      container.appendChild(tableElement);
    } else {
      // Create container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'connectionLabelsTableContainer';
      document.body.appendChild(newContainer);
      newContainer.appendChild(tableElement);
    }
    
    // Initialize event listeners
    this.initTableEventListeners(tableElement, harnessId);
    
    return tableElement;
  }

  generateTableHTML(harnessId, tableData) {
    const headers = this.generateHeaders(tableData);
    const cells = this.generateCells(tableData);
    
    return `
      <div class="table-header">
        <div class="header-content">
          <span class="table-title">Etiquetas - ${tableData.harnessName}</span>
          <button class="toggle-btn ${tableData.tableState.isMinimized ? 'collapsed' : ''}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      </div>
      <div class="table-content" style="display: ${tableData.tableState.isMinimized ? 'none' : 'block'}">
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${cells.map(cell => `<td class="editable-cell" data-node="${cell.nodeId}" data-harness="${harnessId}">${cell.value}</td>`).join('')}
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }

  generateHeaders(tableData) {
    const headers = [];
    const nodeOrder = this.getConnectionNodes();
    
    
    // Always create basic structure even if no nodes
    if (nodeOrder.length >= 2) {
      // Nodo A
      headers.push(nodeOrder[0].name || 'Nodo A');
      
      // Etiqueta Central (siempre presente)
      headers.push('Etiqueta Central');
      
      // Nodos restantes (B, C, D, ...)
      for (let i = 1; i < nodeOrder.length; i++) {
        headers.push(nodeOrder[i].name || `Nodo ${String.fromCharCode(66 + i)}`);
      }
    } else {
      // Create default structure when no nodes or only one node
      headers.push('Nodo A');
      headers.push('Etiqueta Central');
      if (nodeOrder.length === 1) {
        headers.push(nodeOrder[0].name || 'Nodo B');
      } else {
        headers.push('Nodo B');
      }
    }
    
    tableData.columnStructure.headers = headers;
    tableData.columnStructure.nodeOrder = nodeOrder.map(n => n.id);
    
    return headers;
  }

  generateCells(tableData) {
    const cells = [];
    const nodeOrder = tableData.columnStructure.nodeOrder;
    
    
    if (nodeOrder.length >= 2) {
      // Nodo A
      cells.push({
        nodeId: nodeOrder[0],
        value: tableData.connectionLabels.nodes.get(nodeOrder[0]) || ''
      });
      
      // Etiqueta Central
      cells.push({
        nodeId: 'central',
        value: tableData.connectionLabels.central || ''
      });
      
      // Nodos restantes
      for (let i = 1; i < nodeOrder.length; i++) {
        cells.push({
          nodeId: nodeOrder[i],
          value: tableData.connectionLabels.nodes.get(nodeOrder[i]) || ''
        });
      }
    } else {
      // Create default cells for default structure
      cells.push({
        nodeId: nodeOrder[0] || 'nodeA',
        value: tableData.connectionLabels.nodes.get(nodeOrder[0] || 'nodeA') || ''
      });
      
      cells.push({
        nodeId: 'central',
        value: tableData.connectionLabels.central || ''
      });
      
      if (nodeOrder.length === 1) {
        cells.push({
          nodeId: nodeOrder[0],
          value: tableData.connectionLabels.nodes.get(nodeOrder[0]) || ''
        });
      } else {
        cells.push({
          nodeId: 'nodeB',
          value: tableData.connectionLabels.nodes.get('nodeB') || ''
        });
      }
    }
    
    return cells;
  }

  getConnectionNodes() {
    // Get connection nodes (connectors + terminals, exclude branches)
    // Only get nodes from current harness
    const currentHarnessNodes = [];
    
    Object.keys(AppState.nodes).forEach(nodeId => {
      const node = AppState.nodes[nodeId];
      
      // Only include nodes that belong to the current harness
      if (node && (node.type === 'connector' || node.type === 'terminal') && node.harnessIndex === AppState.harness.current) {
        currentHarnessNodes.push(node);
      } else if (node && (node.type === 'connector' || node.type === 'terminal')) {
      }
    });
    
    return currentHarnessNodes;
  }

  getHarnessDisplayName(harnessId) {
    // Extract harness number from ID
    const match = harnessId.match(/harness_(\d+)/);
    if (!match) return 'Arnés';
    
    const harnessIndex = parseInt(match[1]) - 1; // Convert to 0-based index
    
    // Check if harness exists and has a custom name
    if (AppState.harness.list[harnessIndex] && AppState.harness.list[harnessIndex].meta && AppState.harness.list[harnessIndex].meta.name) {
      return AppState.harness.list[harnessIndex].meta.name;
    }
    
    return `Arnés ${match[1]}`;
  }

  initTableEventListeners(tableElement, harnessId) {
    // Toggle button
    const toggleBtn = tableElement.querySelector('.toggle-btn');
    toggleBtn.addEventListener('click', () => {
      this.toggleTable(harnessId);
    });
    
    // Cell editing
    tableElement.addEventListener('dblclick', (e) => {
      if (e.target.classList.contains('editable-cell')) {
        this.handleCellEdit(e.target, harnessId);
      }
    });
    
    // Drag handling
    this.initDragHandling(tableElement, harnessId);
  }

  toggleTable(harnessId) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) return;
    
    const { data, element } = tableInfo;
    const content = element.querySelector('.table-content');
    const toggleBtn = element.querySelector('.toggle-btn');
    
    data.tableState.isMinimized = !data.tableState.isMinimized;
    
    if (data.tableState.isMinimized) {
      content.style.display = 'none';
      element.classList.add('minimized');
      element.classList.remove('maximized');
      toggleBtn.classList.add('collapsed');
      
      // Move table back to original position when minimizing
      const currentLeft = parseInt(element.style.left) || 0;
      element.style.left = `${currentLeft + 200}px`;
    } else {
      content.style.display = 'block';
      element.classList.add('maximized');
      element.classList.remove('minimized');
      toggleBtn.classList.remove('collapsed');
      
      // Move table to the left when maximizing
      const currentLeft = parseInt(element.style.left) || 0;
      element.style.left = `${currentLeft - 200}px`;
      this.refreshTableData(harnessId);
    }
    
    this.saveHarnessData(harnessId);
  }

  handleCellEdit(cell, harnessId) {
    const nodeId = cell.dataset.node;
    const currentValue = cell.textContent.trim();
    
    // Add editing class to cell
    cell.classList.add('editing');
    
    // Create inline input that fills the entire cell
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentValue;
    
    // Clear cell and add input
    cell.innerHTML = '';
    cell.appendChild(input);
    
    // Focus and select
    input.focus();
    input.select();
    
    const saveValue = () => {
      const newValue = input.value.trim();
      
      if (nodeId === 'central') {
        this.updateCentralLabel(harnessId, newValue);
      } else {
        this.updateNodeLabel(harnessId, nodeId, newValue);
      }
      
      // Remove editing class and restore cell content
      cell.classList.remove('editing');
      cell.textContent = newValue;
      cell.dataset.value = newValue;
    };
    
    const cancelEdit = () => {
      // Remove editing class and restore original content
      cell.classList.remove('editing');
      cell.textContent = currentValue;
    };
    
    input.addEventListener('blur', saveValue);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveValue();
      }
    });
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  updateCentralLabel(harnessId, label) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) return;
    
    tableInfo.data.connectionLabels.central = label;
    
    // Update inspector if current harness
    if (harnessId === this.currentHarnessId) {
      this.syncCentralLabelWithInspector(label);
    }
    
    // Update badges
    this.updateBadgesForHarness(harnessId);
    
    // Refresh table UI to reflect the change
    this.refreshTableData(harnessId);
    
    // Save data
    this.saveHarnessData(harnessId);
  }

  updateNodeLabel(harnessId, nodeId, label) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) return;
    
    tableInfo.data.connectionLabels.nodes.set(nodeId, label);
    
    // Update node data
    const node = AppState.nodes[nodeId];
    if (node) {
      node.label = label;
      
      // Update inspector if current harness and node is selected
      if (harnessId === this.currentHarnessId && AppState.selection.node === node.el) {
        this.syncNodeLabelWithInspector(nodeId, label);
      }
      
      // Update badge
      updateBadges(nodeId);
    }
    
    // Refresh table UI to reflect the change
    this.refreshTableData(harnessId);
    
    // Save data
    this.saveHarnessData(harnessId);
  }

  syncCentralLabelWithInspector(label) {
    // Find central label input in inspector
    const centralInput = inspectorContent.querySelector('input[data-central="1"]');
    if (centralInput) {
      centralInput.value = label;
    }
  }

  syncNodeLabelWithInspector(nodeId, label) {
    // Find label input in inspector
    const labelInput = inspectorContent.querySelector('input[data-label="1"]');
    if (labelInput) {
      labelInput.value = label;
    }
  }

  updateBadgesForHarness(harnessId) {
    // Update badges for all nodes in this harness
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) return;
    
    tableInfo.data.connectionLabels.nodes.forEach((label, nodeId) => {
      updateBadges(nodeId);
    });
  }

  initDragHandling(tableElement, harnessId) {
    const header = tableElement.querySelector('.table-header');
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    
    const startDrag = (e) => {
      if (!e.target.closest('button')) {
        isDragging = true;
        
        // Get current position from table element style
        currentX = parseInt(tableElement.style.left) || 0;
        currentY = parseInt(tableElement.style.top) || 0;
        
        startX = e.clientX;
        startY = e.clientY;
        
        tableElement.style.cursor = 'grabbing';
        tableElement.style.transition = 'none';
        
        e.preventDefault();
      }
    };
    
    const drag = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Calculate new position
      const newX = currentX + deltaX;
      const newY = currentY + deltaY;
      
      // Apply position directly without transform
      tableElement.style.left = `${newX}px`;
      tableElement.style.top = `${newY}px`;
    };
    
    const endDrag = () => {
      if (!isDragging) return;
      isDragging = false;
      tableElement.style.cursor = 'grab';
      
      // Update current position
      currentX = parseInt(tableElement.style.left) || 0;
      currentY = parseInt(tableElement.style.top) || 0;
      
      // Save position
      const tableInfo = this.harnessTables.get(harnessId);
      if (tableInfo) {
        tableInfo.data.tableState.position = { x: currentX, y: currentY };
        this.saveHarnessData(harnessId);
      }
    };
    
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDrag);
  }

  showHarnessTable(harnessId) {
    // Hide current table
    if (this.activeTable) {
      this.activeTable.style.display = 'none';
    }
    
    // Update current harness ID
    this.currentHarnessId = harnessId;
    
    // Clean up any existing table for this harness to ensure exclusivity
    const existingTableInfo = this.harnessTables.get(harnessId);
    if (existingTableInfo && existingTableInfo.element) {
      existingTableInfo.element.remove();
      this.harnessTables.delete(harnessId);
    }
    
    // Check if we should show table (only if there are at least 2 connection nodes)
    const connectionNodes = this.getConnectionNodes();
    
    if (connectionNodes.length < 2) {
      // Need at least 2 nodes (A and B) to show table
      this.activeTable = null;
      
      // Hide table for this harness if it exists
      const tableInfo = this.harnessTables.get(harnessId);
      if (tableInfo && tableInfo.element) {
        tableInfo.element.style.display = 'none';
      }
      
      return;
    }
    
    // Create fresh table for this harness
    const tableInfo = this.createHarnessTable(harnessId);
    
    if (tableInfo && tableInfo.element) {
      tableInfo.element.style.display = 'block';
      this.activeTable = tableInfo.element;
      
      // Update table HTML if data was loaded
      if (tableInfo.data._dataLoaded) {
        this.updateTableHTML(harnessId);
        tableInfo.data._dataLoaded = false; // Reset flag
      }
      
      // Force immediate refresh to ensure table shows with current data
      setTimeout(() => {
        this.refreshTableData(harnessId);
      }, 10);
    } else {
    }
  }

  refreshTableData(harnessId) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) return;
    
    // Regenerate headers and cells
    const headers = this.generateHeaders(tableInfo.data);
    const cells = this.generateCells(tableInfo.data);
    
    // Update table HTML
    const content = tableInfo.element.querySelector('.table-content');
    if (content && !tableInfo.data.tableState.isMinimized) {
      const table = content.querySelector('table');
      if (table) {
        table.innerHTML = `
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            <tr>
              ${cells.map(cell => `<td class="editable-cell" data-node="${cell.nodeId}" data-harness="${harnessId}">${cell.value}</td>`).join('')}
            </tr>
          </tbody>
        `;
      }
    }
  }

  initTabListeners() {
    // Listen for tab changes (you'll need to integrate this with your existing tab system)
    // This is a placeholder - you'll need to connect it to your actual tab change events
    document.addEventListener('tabChanged', (e) => {
      this.switchHarness(e.detail.harnessId);
    });
  }

  loadHarnessData(harnessId, tableData) {
    // Load saved data from projectData
    
    if (AppState.project.harnesses && AppState.project.harnesses[harnessId]) {
      const savedData = AppState.project.harnesses[harnessId].connectionLabelsTable;
      
      if (savedData) {
        
        tableData.harnessName = savedData.harnessName || tableData.harnessName;
        tableData.tableState = savedData.tableState || tableData.tableState;
        tableData.connectionLabels.central = savedData.connectionLabels?.central || '';
        
        if (savedData.connectionLabels?.nodes) {
          
          // Si es un array, convertirlo a objeto primero
          let nodesData = savedData.connectionLabels.nodes;
          if (Array.isArray(nodesData)) {
            const nodesObj = {};
            nodesData.forEach(([nodeId, value]) => {
              nodesObj[nodeId] = value;
            });
            nodesData = nodesObj;
          }
          
          tableData.connectionLabels.nodes = new Map(Object.entries(nodesData));
          
          // Verificar que los datos se cargaron correctamente
        }
        
        tableData.columnStructure = savedData.columnStructure || tableData.columnStructure;
        
        // Mark that data was loaded so we can update HTML after table creation
        tableData._dataLoaded = true;
      } else {
      }
    } else {
    }
  }

  saveHarnessData(harnessId) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) {
      return;
    }
    
    
    // Ensure projectData structure exists
    if (!AppState.project.harnesses) AppState.project.harnesses = {};
    if (!AppState.project.harnesses[harnessId]) AppState.project.harnesses[harnessId] = {};
    
    // Save table data
    AppState.project.harnesses[harnessId].connectionLabelsTable = {
      tableState: tableInfo.data.tableState,
      connectionLabels: {
        central: tableInfo.data.connectionLabels.central,
        nodes: Array.from(tableInfo.data.connectionLabels.nodes.entries())
      },
      columnStructure: tableInfo.data.columnStructure
    };
    
    const nodesEntries = Array.from(tableInfo.data.connectionLabels.nodes.entries());
    
    // Debug: Verificar el contenido del Map antes de convertir
    
    // Debug: Verificar el array después de convertir
    const convertedArray = Array.from(tableInfo.data.connectionLabels.nodes.entries());
    
    // Mark as dirty
    markCurrentDirty();
    
    // Also save to localStorage for persistence
    try {
      localStorage.setItem('projectData', JSON.stringify(AppState.project));
      
      // Also save to the main project storage to maintain compatibility
      const mainProjectData = {
        projectData: AppState.project,
        harnesses: AppState.harness.list,
        currentHarness: AppState.harness.current,
        lastSelectedAWG: AppState.config.lastSelectedAWG
      };
      localStorage.setItem('harnesses_project_v23', JSON.stringify(mainProjectData));
    } catch (error) {
    }
    
  }

  // Clear all tables and data
  clearAllTables() {
    
    // Remove all table elements from DOM
    const container = document.getElementById('connectionLabelsTableContainer');
    if (container) {
      container.innerHTML = '';
    }
    
    // Clear all stored table data
    this.harnessTables.clear();
    
    // Clear projectData for connection labels
    if (AppState.project.harnesses) {
      Object.keys(AppState.project.harnesses).forEach(harnessId => {
        if (AppState.project.harnesses[harnessId].connectionLabelsTable) {
          delete AppState.project.harnesses[harnessId].connectionLabelsTable;
        }
      });
    }
  }

  // Public method to update table when nodes change
  updateTableForCurrentHarness() {
    if (this.currentHarnessId) {
      this.showHarnessTable(this.currentHarnessId);
    }
  }

  // Update table title when harness name changes
  updateTableTitle(harnessId, harnessName) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo) {
      return;
    }
    
    tableInfo.data.harnessName = harnessName;
    
    if (!tableInfo.element) {
      return;
    }
    
    const titleElement = tableInfo.element.querySelector('.table-title');
    if (titleElement) {
      titleElement.textContent = `Etiquetas - ${harnessName}`;
    }
  }

  // Update table HTML with loaded data
  updateTableHTML(harnessId) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (!tableInfo || !tableInfo.element) return;

    const nodesEntries = Array.from(tableInfo.data.connectionLabels.nodes.entries());
    
    // Get all editable cells in the table
    const cells = tableInfo.element.querySelectorAll('.editable-cell');
    
    cells.forEach(cell => {
      const nodeId = cell.dataset.node;
      const nodeHarness = cell.dataset.harness;
      
      if (nodeHarness === harnessId) {
        let value = '';
        
        if (nodeId === 'central') {
          value = tableInfo.data.connectionLabels.central || '';
        } else if (tableInfo.data.connectionLabels.nodes.has(nodeId)) {
          value = tableInfo.data.connectionLabels.nodes.get(nodeId) || '';
        }
        
        // Update cell content
        cell.textContent = value;
        cell.dataset.value = value;
        
      }
    });
    
  }

  // Public method to switch harness and update table
  switchHarness(harnessId) {
    this.currentHarnessId = harnessId;
    
    // Hide all tables first
    this.harnessTables.forEach((tableInfo, id) => {
      if (tableInfo && tableInfo.element) {
        tableInfo.element.style.display = 'none';
      }
    });
    
    // Show table for current harness
    this.showHarnessTable(harnessId);
    
    // Update table title with current harness name
    const tableInfo = this.harnessTables.get(harnessId);
    const harnessName = tableInfo ? tableInfo.data.harnessName : this.getHarnessDisplayName(harnessId);
    this.updateTableTitle(harnessId, harnessName);
    
  }

  deleteHarnessTable(harnessId) {
    const tableInfo = this.harnessTables.get(harnessId);
    if (tableInfo && tableInfo.element) {
      tableInfo.element.remove();
    }
    this.harnessTables.delete(harnessId);
  }

  // Public method to sync from inspector to table
  syncFromInspector(nodeId, field, value) {
    if (!this.currentHarnessId) return;
    
    const tableInfo = this.harnessTables.get(this.currentHarnessId);
    if (!tableInfo) return;
    
    if (field === 'label') {
      this.updateNodeLabel(this.currentHarnessId, nodeId, value);
    } else if (field === 'central') {
      this.updateCentralLabel(this.currentHarnessId, value);
    }
  }
}

// Initialize the connection labels table manager
