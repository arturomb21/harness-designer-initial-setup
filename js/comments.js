/* ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  HARNESS DESIGNER — comments.js                                            ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Sistema de comentarios por nodo: agregar, editar, eliminar, historial.    
 * ║  Secciones: 39 + listeners de comentarios                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

/* ══════════════════════════════════════════════════════════════════════════
 * SECCIÓN 39: SISTEMA DE COMENTARIOS
 * Agregar, editar y eliminar comentarios por nodo, con historial,
 * indicadores visuales y modal de confirmación de borrado.
 * ══════════════════════════════════════════════════════════════════════════ */
function openCommentModal(nodeId, type = 'add', commentIndex = null) {
  AppState.comments.editing.nodeId = nodeId;
  AppState.comments.editing.type = type;
  AppState.comments.editing.index = commentIndex;
  
  const node = AppState.nodes[nodeId];
  if (!node) return;
  
  // Reset form
  commentText.value = '';
  
  if (type === 'edit' && commentIndex !== null) {
    const nodeComments = AppState.comments.data[nodeId] || [];
    const comment = nodeComments[commentIndex];
    if (comment) {
      commentModalTitle.textContent = 'Editar Comentario';
      commentAuthor.value = comment.author || AppState.config.currentUser || '';
      commentText.value = comment.text || '';
    }
  } else {
    commentModalTitle.textContent = 'Añadir Comentario';
    commentAuthor.value = AppState.config.currentUser || '';
  }
  
  commentModalBackdrop.style.display = 'flex';
  commentAuthor.focus();
}

function showCommentsInInspector(nodeId) {
  const commentsList = document.getElementById('commentsList');
  if (!commentsList) return;
  
  const nodeComments = AppState.comments.data[nodeId] || [];
  
  if (nodeComments.length === 0) {
    commentsList.innerHTML = '<div class="no-comments">No hay comentarios</div>';
    return;
  }
  
  commentsList.innerHTML = '';
  
  // Show only last 3 comments in inspector
  const recentComments = nodeComments.slice(-3).reverse();
  
  recentComments.forEach((comment, index) => {
    const originalIndex = nodeComments.length - 1 - index;
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    
    const commentMeta = document.createElement('div');
    commentMeta.className = 'comment-meta';
    commentMeta.innerHTML = `
      <span class="comment-author">${comment.author || 'Anónimo'}</span>
      <span class="comment-time">${formatDate(comment.timestamp)}</span>
    `;
    
    const commentText = document.createElement('div');
    commentText.className = 'comment-text';
    commentText.textContent = comment.text;
    
    const commentActions = document.createElement('div');
    commentActions.className = 'comment-actions';
    
    const editBtn = document.createElement('button');
    editBtn.className = 'comment-action-btn';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      openCommentModal(nodeId, 'edit', originalIndex);
    });
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'comment-action-btn';
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.addEventListener('click', () => {
      deleteComment(nodeId, originalIndex);
    });
    
    commentActions.appendChild(editBtn);
    commentActions.appendChild(deleteBtn);
    
    commentItem.appendChild(commentMeta);
    commentItem.appendChild(commentText);
    commentItem.appendChild(commentActions);
    
    commentsList.appendChild(commentItem);
  });
  
  if (nodeComments.length > 3) {
    const moreIndicator = document.createElement('div');
    moreIndicator.className = 'no-comments';
    moreIndicator.textContent = `... y ${nodeComments.length - 3} comentarios más (ver historial)`;
    moreIndicator.style.cursor = 'pointer';
    moreIndicator.addEventListener('click', () => {
      openHistoryModal();
    });
    commentsList.appendChild(moreIndicator);
  }
}

function openHistoryModal() {
  // Update filter dropdown
  historyFilter.innerHTML = '<option value="">Todos los comentarios</option>';
  
  const allNodes = [];
  Object.keys(AppState.comments.data).forEach(nodeId => {
    const node = AppState.nodes[nodeId];
    if (node) {
      allNodes.push({
        id: nodeId,
        name: node.label || node.name || nodeId
      });
    }
  });
  
  // Sort nodes alphabetically
  allNodes.sort((a, b) => a.name.localeCompare(b.name));
  
  allNodes.forEach(node => {
    const option = document.createElement('option');
    option.value = node.id;
    option.textContent = node.name;
    historyFilter.appendChild(option);
  });
  
  // Show all comments initially
  updateHistoryDisplay();
  
  historyModalBackdrop.style.display = 'flex';
}

function updateHistoryDisplay() {
  const filterValue = historyFilter.value;
  historyCommentsList.innerHTML = '';
  
  const allComments = [];
  Object.keys(AppState.comments.data).forEach(nodeId => {
    // Skip if filter is set and doesn't match
    if (filterValue && nodeId !== filterValue) return;
    
    const node = AppState.nodes[nodeId];
    const nodeName = node ? (node.label || node.name || nodeId) : nodeId;
    
    (AppState.comments.data[nodeId] || []).forEach((comment, index) => {
      allComments.push({
        nodeId,
        nodeName,
        comment,
        index
      });
    });
  });
  
  // Sort by timestamp (newest first)
  allComments.sort((a, b) => b.comment.timestamp - a.comment.timestamp);
  
  if (allComments.length === 0) {
    historyCommentsList.innerHTML = '<div class="no-comments">No hay comentarios</div>';
  } else {
    allComments.forEach(item => {
      const commentItem = document.createElement('div');
      commentItem.className = 'comment-item';
      
      commentItem.innerHTML = `
      <div class="comment-meta">
        <span style="font-weight: 600; color: var(--text-bright); font-size: 13px;">${item.comment.author || 'Anónimo'}</span>
        <span style="font-size: 12px; color: var(--muted); margin-left: auto;">${new Date(item.comment.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
      <div class="comment-text">${item.comment.text}</div>
    `;
    
    historyCommentsList.appendChild(commentItem);
    });
  }
}

function saveComment() {
  const author = commentAuthor.value.trim();
  const text = commentText.value.trim();
  
  if (!author || !text) {
    alert('Por favor, completa todos los campos');
    return;
  }
  
  if (!AppState.comments.data[AppState.comments.editing.nodeId]) {
    AppState.comments.data[AppState.comments.editing.nodeId] = [];
  }
  
  const comment = {
    author,
    text,
    timestamp: Date.now()
  };
  
  if (AppState.comments.editing.type === 'edit' && AppState.comments.editing.index !== null) {
    AppState.comments.data[AppState.comments.editing.nodeId][AppState.comments.editing.index] = comment;
    showNotification('Comentario actualizado', 'success');
  } else {
    AppState.comments.data[AppState.comments.editing.nodeId].push(comment);
    showNotification('Comentario añadido', 'success');
  }
  
  // Update comment indicator
  updateCommentIndicator(AppState.nodes[AppState.comments.editing.nodeId]);
  
  markCurrentDirty();
  showCommentsInInspector(AppState.comments.editing.nodeId);
  commentModalBackdrop.style.display = 'none';
}

function deleteComment(nodeId, commentIndex) {
  if (!AppState.comments.data[nodeId]) return;
  
  AppState.comments.data[nodeId].splice(commentIndex, 1);
  
  if (AppState.comments.data[nodeId].length === 0) {
    delete AppState.comments.data[nodeId];
  }
  
  // Update comment indicator
  updateCommentIndicator(AppState.nodes[nodeId]);
  
  markCurrentDirty();
  showCommentsInInspector(nodeId);
  showNotification('Comentario eliminado', 'info');
}

function updateCommentIndicator(node) {
  if (!node) return;
  
  // Eliminar indicador existente
  const existingIndicator = document.getElementById(`indicator-${node.id}`);
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Añadir nuevo indicador si hay comentarios
  const nodeComments = AppState.comments.data[node.id] || [];
  if (nodeComments.length > 0) {
    const indicator = document.createElement('div');
    indicator.className = 'comment-indicator';
    indicator.id = `indicator-${node.id}`;
    indicator.textContent = nodeComments.length;
    indicator.title = `${nodeComments.length} comentario(s)`;
    
    const nodeEl = node.el;
    if (nodeEl) {
      nodeEl.appendChild(indicator);
    }
  }
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} h`;
  if (diffDays < 7) return `Hace ${diffDays} d`;
  
  return date.toLocaleDateString('es-ES');
}



/* --- Listeners de eventos del sistema de comentarios --- */
// Comment modal event listeners
commentModalCancel.addEventListener('click', () => {
  commentModalBackdrop.style.display = 'none';
});

commentModalSave.addEventListener('click', saveComment);

commentAuthor.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    commentText.focus();
  }
});

commentAuthor.addEventListener('blur', () => {
  const username = commentAuthor.value.trim();
  if (username && username !== AppState.config.currentUser) {
    saveCurrentUser(username);
  }
});

commentText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault();
    saveComment();
  }
});

historyModalClose.addEventListener('click', () => {
  historyModalBackdrop.style.display = 'none';
});

historyFilter.addEventListener('change', updateHistoryDisplay);

deleteConfirmCancel.addEventListener('click', () => {
  deleteConfirmModal.style.display = 'none';
  AppState.comments.deleting.nodeId = null;
  AppState.comments.deleting.index = null;
});

deleteConfirmAccept.addEventListener('click', () => {
  if (AppState.comments.deleting.nodeId && AppState.comments.deleting.index !== null) {
    deleteComment(AppState.comments.deleting.nodeId, AppState.comments.deleting.index);
    deleteConfirmModal.style.display = 'none';
    AppState.comments.deleting.nodeId = null;
    AppState.comments.deleting.index = null;
    updateHistoryDisplay(); // Refresh history display
  }
});

// Close modals on backdrop click
commentModalBackdrop.addEventListener('click', (e) => {
  if (e.target === commentModalBackdrop) {
    commentModalBackdrop.style.display = 'none';
  }
});

historyModalBackdrop.addEventListener('click', (e) => {
  if (e.target === historyModalBackdrop) {
    historyModalBackdrop.style.display = 'none';
  }
});

deleteConfirmModal.addEventListener('click', (e) => {
  if (e.target === deleteConfirmModal) {
    deleteConfirmModal.style.display = 'none';
  }
});
