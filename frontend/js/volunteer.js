const Volunteer = {
  async renderAvailableTasks() {
    const app = document.getElementById('app');
    app.className = 'volunteer-view';
    app.innerHTML = `
      <div class="flex-between" style="margin-bottom: 20px;">
        <h2 style="margin: 0;">Доступные задания</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="myTasksBtn" class="btn-small btn-secondary">Мои задания</button>
          <button id="logoutBtn" class="btn-small">Выйти</button>
        </div>
      </div>
      <div id="tasksList"><div class="loading">Загрузка...</div></div>
    `;
    document.getElementById('myTasksBtn').onclick = () => this.renderMyTasks();
    document.getElementById('logoutBtn').onclick = () => {
      Auth.logout();
      window.app.navigateTo('role');
    };
    try {
      const tasks = await api.getOpenTasks();
      this.renderTasksList(tasks);
    } catch (error) {
      document.getElementById('tasksList').innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    }
  },

  renderTasksList(tasks) {
    const container = document.getElementById('tasksList');
    if (tasks.length === 0) {
      container.innerHTML = '<div class="card">Нет доступных заданий</div>';
      return;
    }
    container.innerHTML = tasks.map(task => `
      <div class="card">
        <div class="flex-between">
          <strong class="task-elder-name">${this.escapeHtml(task.elder_name)}</strong>
          <span class="task-time">${api.formatDate(task.created_at)}</span>
        </div>
        <div class="task-title-volunteer">${this.escapeHtml(task.title)}</div>
        <div class="task-desc-preview">${this.escapeHtml(task.description?.substring(0, 80) || 'Нет описания')}${task.description?.length > 80 ? '...' : ''}</div>
        ${task.datetime ? `<div class="task-datetime-small">Время: ${api.formatDateTime(task.datetime)}</div>` : ''}
        <div class="volunteer-task-buttons">
          <button class="btn-detail" data-id="${task.id}">Подробнее</button>
          <button class="btn-respond" data-id="${task.id}">Откликнуться</button>
        </div>
      </div>
    `).join('');

    document.querySelectorAll('.btn-detail').forEach(btn => {
      btn.onclick = () => {
        const taskId = parseInt(btn.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        this.showTaskDetail(task);
      };
    });
    document.querySelectorAll('.btn-respond').forEach(btn => {
      btn.onclick = async (e) => {
        const taskId = parseInt(btn.dataset.id);
        const task = tasks.find(t => t.id === taskId);
        if (confirm(`Откликнуться на заявку "${task.title}"?`)) {
          try {
            await api.respondToTask(taskId);
            alert('Вы откликнулись! Перейдите в "Мои задания" для чата.');
            this.renderAvailableTasks();
          } catch (error) {
            alert('Ошибка: ' + error.message);
          }
        }
      };
    });
  },

  showTaskDetail(task) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Детали заявки</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="detail-row"><span class="detail-label">Заявитель:</span><span class="detail-value">${this.escapeHtml(task.elder_name)}</span></div>
          <div class="detail-row"><span class="detail-label">Что нужно:</span><span class="detail-value task-title-detail">${this.escapeHtml(task.title)}</span></div>
          ${task.datetime ? `<div class="detail-row"><span class="detail-label">Время:</span><span class="detail-value">${api.formatDateTime(task.datetime)}</span></div>` : ''}
          <div class="detail-row"><span class="detail-label">Описание:</span><span class="detail-value">${this.escapeHtml(task.description || 'Нет описания')}</span></div>
          <div class="detail-row"><span class="detail-label">Создана:</span><span class="detail-value">${api.formatDateTime(task.created_at)}</span></div>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel-modal">Закрыть</button>
          <button class="btn-respond-modal" data-id="${task.id}">Откликнуться</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.modal-close').onclick = () => modal.remove();
    modal.querySelector('.btn-cancel-modal').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    modal.querySelector('.btn-respond-modal').onclick = async () => {
      modal.remove();
      if (confirm(`Откликнуться на заявку "${task.title}"?`)) {
        try {
          await api.respondToTask(task.id);
          alert('Вы откликнулись! Перейдите в "Мои задания" для чата.');
          this.renderAvailableTasks();
        } catch (error) {
          alert('Ошибка: ' + error.message);
        }
      }
    };
  },

  async renderMyTasks() {
    const app = document.getElementById('app');
    app.className = 'volunteer-view';
    app.innerHTML = `
      <div class="flex-between" style="margin-bottom: 20px;">
        <h2 style="margin: 0;">Мои задания</h2>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button id="backBtn" class="btn-small btn-secondary">Назад</button>
          <button id="logoutBtn" class="btn-small">Выйти</button>
        </div>
      </div>
      <div id="tasksList"><div class="loading">Загрузка...</div></div>
    `;
    document.getElementById('backBtn').onclick = () => this.renderAvailableTasks();
    document.getElementById('logoutBtn').onclick = () => {
      Auth.logout();
      window.app.navigateTo('role');
    };
    try {
      const tasks = await api.getMyTasks();
      const container = document.getElementById('tasksList');
      if (tasks.length === 0) {
        container.innerHTML = '<div class="card">Нет принятых заданий</div>';
        return;
      }
      container.innerHTML = tasks.map(task => `
        <div class="card">
          <div class="flex-between">
            <strong>${this.escapeHtml(task.elder_name)}</strong>
            <span class="task-time">${task.status === 'taken' ? 'В работе' : 'Выполнено'}</span>
          </div>
          <div class="task-title-volunteer">${this.escapeHtml(task.title)}</div>
          <div class="task-desc-preview">${this.escapeHtml(task.description?.substring(0, 100) || '')}</div>
          ${task.datetime ? `<div class="task-datetime-small">Время: ${api.formatDateTime(task.datetime)}</div>` : ''}
          <div class="volunteer-actions">
            <button class="btn-chat-small" data-id="${task.id}" data-name="${this.escapeHtml(task.elder_name)}">Написать</button>
            ${task.status === 'taken' ? `<button class="btn-cancel" data-id="${task.id}">Отменить задание</button>` : ''}
          </div>
        </div>
      `).join('');
      document.querySelectorAll('.btn-chat-small').forEach(btn => {
        btn.onclick = () => this.openChat(parseInt(btn.dataset.id), btn.dataset.name);
      });
      document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.onclick = async () => {
          const taskId = parseInt(btn.dataset.id);
          if (confirm('Вы уверены, что хотите отменить задание? Заявка снова станет доступна другим волонтёрам.')) {
            await this.cancelTask(taskId);
          }
        };
      });
    } catch (error) {
      document.getElementById('tasksList').innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    }
  },

  async cancelTask(taskId) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/cancel`, {
        method: 'PUT',
        headers: api.getHeaders()
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка');
      }
      alert('Задание отменено. Заявка снова доступна другим волонтёрам.');
      this.renderMyTasks();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  },

  openChat(taskId, userName) {
    window.app.navigateTo('chat', { taskId, userName, role: 'volunteer' });
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};