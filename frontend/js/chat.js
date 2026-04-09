const Chat = {
  currentTaskId: null,
  pollingInterval: null,

  async loadMessages(taskId) {
    try {
      const messages = await api.getMessages(taskId);
      this.renderMessages(messages);
      return messages;
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      return [];
    }
  },

  renderMessages(messages) {
    const container = document.getElementById('chatMessages');
    if (!container) return;
    container.innerHTML = '';
    const currentUserId = window.app.currentUser?.id;
    messages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.from_user_id === currentUserId ? 'chat-mine' : ''}`;
      bubble.innerHTML = `
        <div style="font-size: 12px; opacity: 0.7; margin-bottom: 4px;">${this.escapeHtml(msg.from_name)}</div>
        <div>${this.escapeHtml(msg.message)}</div>
        <div style="font-size: 10px; opacity: 0.5; margin-top: 4px;">${api.formatTime(msg.created_at)}</div>
      `;
      container.appendChild(bubble);
    });
    container.scrollTop = container.scrollHeight;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  async sendMessage(taskId, message) {
    if (!message.trim()) return false;
    try {
      await api.sendMessage(taskId, message);
      await this.loadMessages(taskId);
      return true;
    } catch (error) {
      console.error('Ошибка отправки:', error);
      return false;
    }
  },

  startPolling(taskId) {
    this.stopPolling();
    this.currentTaskId = taskId;
    this.pollingInterval = setInterval(() => {
      if (this.currentTaskId) {
        this.loadMessages(this.currentTaskId);
      }
    }, 3000);
  },

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.currentTaskId = null;
  }
};