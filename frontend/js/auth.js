const Auth = {
  async sendCode(phone) {
    try {
      await api.sendCode(phone);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async verifyCode(phone, code, fullName, role) {
    try {
      const data = await api.verifyCode(phone, code, fullName, role);
      api.setToken(data.token);
      return { success: true, user: data.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  logout() {
    api.setToken(null);
    window.app.navigateTo('role');
  },

  isAuthenticated() {
    return !!api.token;
  }
};