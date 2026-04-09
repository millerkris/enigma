const Elder = {
  async renderMyRequests() {
    const app = document.getElementById('app');
    app.className = 'elder-view';
    app.innerHTML = `
      <div style="margin-bottom: 20px;">
        <h2 style="margin-bottom: 20px;">Мои заявки</h2>
        <div style="display: flex; gap: 15px; flex-wrap: wrap; justify-content: space-between; align-items: center;">
          <button id="createBtn" class="btn-new">+ Новая заявка</button>
          <button id="logoutBtn" class="btn-logout">Выйти</button>
        </div>
      </div>
      <div id="requestsList"><div class="loading">Загрузка...</div></div>
    `;
    document.getElementById('createBtn').onclick = () => this.renderCreateForm();
    document.getElementById('logoutBtn').onclick = () => {
      Auth.logout();
      window.app.navigateTo('role');
    };
    try {
      const requests = await api.getMyRequests();
      this.renderRequestsList(requests);
    } catch (error) {
      document.getElementById('requestsList').innerHTML = `<div class="error">Ошибка: ${error.message}</div>`;
    }
  },

  renderRequestsList(requests) {
    const container = document.getElementById('requestsList');
    if (requests.length === 0) {
      container.innerHTML = '<div class="card">У вас пока нет заявок</div>';
      return;
    }
    
    container.innerHTML = requests.map(req => {
      let statusText = '', statusColor = '', statusBg = '';
      if (req.status === 'open') {
        statusText = 'Ожидает волонтёра';
        statusColor = '#B45309';
        statusBg = '#FFFBEB';
      } else if (req.status === 'taken') {
        statusText = 'Волонтёр принял';
        statusColor = '#065F46';
        statusBg = '#ECFDF5';
      } else if (req.status === 'completed') {
        statusText = 'Выполнено';
        statusColor = '#065F46';
        statusBg = '#ECFDF5';
      } else if (req.status === 'cancelled') {
        statusText = 'Отменено';
        statusColor = '#991B1B';
        statusBg = '#FEF2F2';
      }
      
      let chatButton = '';
      let completeButton = '';
      
      if (req.volunteer_id) {
        chatButton = `<button class="btn-chat" data-id="${req.id}">Написать волонтёру</button>`;
      }
      
      if (req.status === 'taken') {
        completeButton = `<button class="btn-complete" data-id="${req.id}">Отметить выполненным</button>`;
      }
      
      // Кнопка удаления — для ЛЮБОГО статуса
      const deleteButton = `<button class="btn-delete" data-id="${req.id}">Удалить заявку</button>`;
      
      return `
        <div class="card">
          <div class="card-header">
            <strong class="task-title">${this.escapeHtml(req.title)}</strong>
            <span class="status-badge" style="background: ${statusBg}; color: ${statusColor};">${statusText}</span>
          </div>
          <div class="task-desc">${this.escapeHtml(req.description || 'Нет описания')}</div>
          ${req.datetime ? `<div class="task-datetime">Время: ${api.formatDateTime(req.datetime)}</div>` : ''}
          <div class="action-buttons">
            ${chatButton}
            ${completeButton}
            ${deleteButton}
          </div>
        </div>
      `;
    }).join('');
    
    document.querySelectorAll('.btn-chat').forEach(btn => {
      btn.onclick = () => this.openChat(parseInt(btn.dataset.id));
    });
    
    document.querySelectorAll('.btn-complete').forEach(btn => {
      btn.onclick = async () => {
        const taskId = parseInt(btn.dataset.id);
        if (confirm('Задача выполнена? Волонтёр помог?')) {
          await this.completeTask(taskId);
        }
      };
    });
    
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.onclick = async () => {
        const taskId = parseInt(btn.dataset.id);
        const task = requests.find(r => r.id === taskId);
        let warning = '';
        if (task.status === 'taken') {
          warning = '\n\nВнимание! На эту заявку уже откликнулся волонтёр. Удаление прервёт общение.';
        } else if (task.status === 'completed') {
          warning = '\n\nВнимание! Задача уже выполнена. Удалить историю?';
        }
        if (confirm(`Вы уверены, что хотите удалить заявку "${task.title}"?${warning} Отменить будет нельзя.`)) {
          await this.deleteTask(taskId);
        }
      };
    });
  },

  async completeTask(taskId) {
    try {
      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/complete`, {
        method: 'PUT',
        headers: api.getHeaders()
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка');
      }
      alert('Задача отмечена как выполненная! Спасибо волонтёру.');
      this.renderMyRequests();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  },

  // НОВЫЙ МЕТОД: удаление заявки
  async deleteTask(taskId) {
    try {
      await api.deleteTask(taskId);
      alert('Заявка удалена');
      this.renderMyRequests();
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  },

  renderCreateForm() {
    const app = document.getElementById('app');
    app.className = 'elder-view';
    app.innerHTML = `
      <span class="back-link" id="backBtn">← Назад</span>
      <h3>Создание заявки</h3>
      <label>Что нужно сделать?</label>
      <input type="text" id="title" placeholder="Например: Купить продукты">
      <label>Когда?</label>
      <input type="datetime-local" id="datetime">
      <label>Подробности</label>
      <textarea id="description" rows="3" placeholder="Опишите, что нужно сделать..."></textarea>
      <button class="btn" id="submitBtn">Опубликовать заявку</button>
    `;
    document.getElementById('backBtn').onclick = () => this.renderMyRequests();
    document.getElementById('submitBtn').onclick = async () => {
      const title = document.getElementById('title').value;
      const datetime = document.getElementById('datetime').value;
      const description = document.getElementById('description').value;
      if (!title) {
        alert('Введите название задачи');
        return;
      }
      try {
        await api.createTask(title, description, datetime);
        app.innerHTML = `
          <div class="card" style="text-align: center;">
            <h3>Заявка создана!</h3>
            <p style="margin: 20px 0;">Теперь ждите, когда волонтёр откликнется.</p>
            <button class="btn" id="continueBtn">К моим заявкам</button>
          </div>
        `;
        document.getElementById('continueBtn').onclick = () => this.renderMyRequests();
      } catch (error) {
        alert('Ошибка: ' + error.message);
      }
    };
  },

  async openChat(taskId) {
    const requests = await api.getMyRequests();
    const task = requests.find(r => r.id === taskId);
    if (task) {
      const userName = task.volunteer_name || 'Волонтёр';
      window.app.navigateTo('chat', { taskId, userName, role: 'elder' });
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};