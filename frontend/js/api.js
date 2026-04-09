const API_BASE_URL = 'http://localhost:3000/api';

class API {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: this.getHeaders()
      });
      if (response.status === 401) {
        this.setToken(null);
        window.app.navigateTo('role');
        throw new Error('Сессия истекла');
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка запроса');
      }
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  parseDate(utcString) {
    if (!utcString) return null;
    let dateStr = utcString;
    if (!dateStr.includes('Z') && !dateStr.includes('+')) {
      dateStr = dateStr.replace(' ', 'T') + 'Z';
    }
    return new Date(dateStr);
  }

  formatDateTime(utcString) {
    if (!utcString) return 'Дата неизвестна';
    const date = this.parseDate(utcString);
    return date.toLocaleString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(utcString) {
    if (!utcString) return 'Дата неизвестна';
    const date = this.parseDate(utcString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatTime(utcString) {
    if (!utcString) return '';
    const date = this.parseDate(utcString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async sendCode(phone) {
    return this.request('/auth/send-code', {
      method: 'POST',
      body: JSON.stringify({ phone })
    });
  }

  async verifyCode(phone, code, fullName, role) {
    return this.request('/auth/verify-code', {
      method: 'POST',
      body: JSON.stringify({ phone, code, fullName, role })
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async getOpenTasks() {
    return this.request('/tasks/open');
  }

  async getMyRequests() {
    return this.request('/tasks/my-requests');
  }

  async getMyTasks() {
    return this.request('/tasks/my-tasks');
  }

  async createTask(title, description, datetime) {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title, description, datetime })
    });
  }

  async respondToTask(taskId) {
    return this.request(`/tasks/${taskId}/respond`, {
      method: 'POST'
    });
  }

  // НОВЫЙ МЕТОД: удаление заявки
  async deleteTask(taskId) {
    return this.request(`/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  async getMessages(taskId) {
    return this.request(`/chat/task/${taskId}`);
  }

  async sendMessage(taskId, message) {
    return this.request(`/chat/task/${taskId}`, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  }
}

const api = new API();