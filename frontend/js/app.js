class App {
  constructor() {
    this.currentUser = null;
    this.init();
  }

  async init() {
    if (api.token) {
      try {
        this.currentUser = await api.getMe();
        this.navigateTo(this.currentUser.role === 'volunteer' ? 'volunteerTasks' : 'elderRequests');
      } catch (error) {
        console.log('Токен недействителен');
        this.renderLoginScreen();
      }
    } else {
      this.renderLoginScreen();
    }
  }

  renderLoginScreen() {
    const app = document.getElementById('app');
    app.className = '';
    app.innerHTML = `
      <div style="text-align: center; margin-top: 40px;">
        <h1>👋 Энигма</h1>
        <p style="margin: 16px 0 32px;">Помощь пожилым людям</p>
        <button class="btn" id="loginBtn">Войти по номеру телефона</button>
        <button class="btn btn-outline" id="registerBtn" style="margin-top: 12px;">Зарегистрироваться</button>
      </div>
    `;
    document.getElementById('loginBtn').onclick = () => this.navigateTo('phone', { role: null, isLogin: true });
    document.getElementById('registerBtn').onclick = () => this.navigateTo('role');
  }

  navigateTo(screen, params = {}) {
    Chat.stopPolling();
    const appDiv = document.getElementById('app');
    appDiv.className = '';
    switch(screen) {
      case 'role':
        this.renderRoleScreen();
        break;
      case 'phone':
        this.renderPhoneScreen(params);
        break;
      case 'code':
        this.renderCodeScreen(params);
        break;
      case 'fio':
        this.renderFioScreen(params);
        break;
      case 'volunteerTasks':
        appDiv.className = 'volunteer-view';
        Volunteer.renderAvailableTasks();
        break;
      case 'volunteerMyTasks':
        appDiv.className = 'volunteer-view';
        Volunteer.renderMyTasks();
        break;
      case 'elderRequests':
        Elder.renderMyRequests();
        break;
      case 'chat':
        this.renderChatScreen(params);
        break;
    }
  }

  renderRoleScreen() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div style="margin-top: 20px;">
        <h1>Добро пожаловать!</h1>
        <p style="margin: 12px 0 24px;">Вы здесь для:</p>
        <button class="btn" id="volunteerBtn">Волонтёр</button>
        <button class="btn btn-outline" id="elderBtn" style="margin-top: 16px;">Нужна помощь</button>
      </div>
    `;
    document.getElementById('volunteerBtn').onclick = () => this.navigateTo('phone', { role: 'volunteer' });
    document.getElementById('elderBtn').onclick = () => this.navigateTo('phone', { role: 'elder' });
  }

  renderPhoneScreen(params) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h2>Создайте аккаунт</h2>
      <p style="margin: 8px 0 20px;">Введите номер телефона для регистрации</p>
      <input type="tel" id="phone" placeholder="+7 (___) ___-__-__" value="+79991234567">
      <button class="btn" id="continueBtn">Продолжить</button>
    `;
    document.getElementById('continueBtn').onclick = async () => {
      const phone = document.getElementById('phone').value;
      if (!phone) {
        alert('Введите номер телефона');
        return;
      }
      const result = await Auth.sendCode(phone);
      if (result.success) {
        this.navigateTo('code', { phone, role: params.role });
      } else {
        alert(result.error);
      }
    };
  }

  renderCodeScreen(params) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h2>Введите код подтверждения</h2>
      <input type="text" id="code" placeholder="Код" value="123456">
      <button class="btn" id="continueBtn">Продолжить</button>
      <button class="btn btn-outline" id="resendBtn" style="margin-top: 12px;">Отправить код повторно</button>
    `;
    document.getElementById('continueBtn').onclick = async () => {
      const code = document.getElementById('code').value;
      const result = await Auth.verifyCode(params.phone, code, null, null);
      if (result.success) {
        this.currentUser = result.user;
        this.navigateTo(result.user.role === 'volunteer' ? 'volunteerTasks' : 'elderRequests');
      } else if (result.error && result.error.includes('ФИО')) {
        this.navigateTo('fio', { ...params, existingUser: false });
      } else {
        alert(result.error);
      }
    };
    document.getElementById('resendBtn').onclick = async () => {
      await Auth.sendCode(params.phone);
      alert('Код отправлен повторно');
    };
  }

  renderFioScreen(params) {
    const app = document.getElementById('app');
    app.innerHTML = `
      <h2>Введите Ваше ФИО</h2>
      <input type="text" id="fio" placeholder="Меня зовут...">
      <button class="btn" id="continueBtn">Продолжить</button>
    `;
    document.getElementById('continueBtn').onclick = async () => {
      const fullName = document.getElementById('fio').value;
      if (!fullName) {
        alert('Введите ваше ФИО');
        return;
      }
      const result = await Auth.verifyCode(params.phone, '123456', fullName, params.role);
      if (result.success) {
        this.currentUser = result.user;
        this.navigateTo(result.user.role === 'volunteer' ? 'volunteerTasks' : 'elderRequests');
      } else {
        alert(result.error);
      }
    };
  }

  renderChatScreen(params) {
    const { taskId, userName, role } = params;
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="flex-between">
        <span class="back-link" id="backBtn">← Назад</span>
        <h3 id="chatUserName">${this.escapeHtml(userName)}</h3>
        <div style="width: 24px;"></div>
      </div>
      <div id="chatMessages" style="margin: 12px 0 20px; max-height: 500px; overflow-y: auto;"></div>
      <div style="display: flex; gap: 8px;">
        <input type="text" id="messageInput" placeholder="Сообщение..." style="flex:1;">
        <button id="sendBtn" style="background:#2D6A4F; border:none; border-radius:30px; padding:0 18px; color:white;">➤</button>
      </div>
    `;
    document.getElementById('backBtn').onclick = () => {
      this.navigateTo(role === 'volunteer' ? 'volunteerMyTasks' : 'elderRequests');
    };
    Chat.currentTaskId = taskId;
    Chat.loadMessages(taskId);
    Chat.startPolling(taskId);
    document.getElementById('sendBtn').onclick = async () => {
      const input = document.getElementById('messageInput');
      const success = await Chat.sendMessage(taskId, input.value);
      if (success) {
        input.value = '';
      }
    };
    document.getElementById('messageInput').onkeypress = (e) => {
      if (e.key === 'Enter') {
        document.getElementById('sendBtn').click();
      }
    };
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

window.app = new App();