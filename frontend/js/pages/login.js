/**
 * Login/Register Page Logic
 */

import { login, register, getCurrentUser } from '../utils/auth.js';

class AuthPage {
  constructor() {
    this.isLoginMode = true;
    this.redirectUrl = '/';
    this.init();
  }

  async init() {
    // Check if already logged in
    const user = await getCurrentUser();
    if (user) {
      this.redirect();
      return;
    }

    // Get redirect URL from query params
    const urlParams = new URLSearchParams(window.location.search);
    this.redirectUrl = urlParams.get('redirect') || '/';

    // Check if should show register form
    const mode = urlParams.get('mode');
    if (mode === 'register') {
      this.isLoginMode = false;
    }

    this.attachEventListeners();

    // Show register form if needed
    if (!this.isLoginMode) {
      this.toggleMode();
    }
  }

  attachEventListeners() {
    // Toggle between login and register
    const toggleBtn = document.getElementById('toggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleMode());
    }

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => this.handleRegister(e));
    }
  }

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const toggleText = document.getElementById('toggleText');
    const toggleBtn = document.getElementById('toggleBtn');

    if (this.isLoginMode) {
      // Show login form
      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      authTitle.textContent = 'Entrar';
      authSubtitle.textContent = 'Acesse sua conta ByteShop';
      toggleText.innerHTML = `
        Não tem uma conta?
        <button type="button" id="toggleBtn" class="btn-text-inline">Criar conta</button>
      `;
    } else {
      // Show register form
      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      authTitle.textContent = 'Criar Conta';
      authSubtitle.textContent = 'Junte-se à ByteShop';
      toggleText.innerHTML = `
        Já tem uma conta?
        <button type="button" id="toggleBtn" class="btn-text-inline">Entrar</button>
      `;
    }

    // Re-attach toggle button listener
    const newToggleBtn = document.getElementById('toggleBtn');
    if (newToggleBtn) {
      newToggleBtn.addEventListener('click', () => this.toggleMode());
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginBtn');

    if (!email || !password) {
      this.showNotification('Preencha todos os campos', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Entrando...';

      const result = await login(email, password);

      if (result.success) {
        this.showNotification('Login realizado com sucesso!', 'success');
        setTimeout(() => this.redirect(), 1000);
      } else {
        throw new Error(result.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error('Login error:', error);
      this.showNotification(
        error.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos'
          : 'Erro ao fazer login. Tente novamente.',
        'error'
      );
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Entrar';
    }
  }

  async handleRegister(e) {
    e.preventDefault();

    const fullName = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
    const submitBtn = document.getElementById('registerBtn');

    // Validations
    if (!fullName || !email || !password || !passwordConfirm) {
      this.showNotification('Preencha todos os campos', 'error');
      return;
    }

    if (password.length < 6) {
      this.showNotification('A senha deve ter no mínimo 6 caracteres', 'error');
      return;
    }

    if (password !== passwordConfirm) {
      this.showNotification('As senhas não coincidem', 'error');
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Criando conta...';

      const result = await register({
        full_name: fullName,
        email,
        password,
      });

      if (result.success) {
        this.showNotification('Conta criada com sucesso!', 'success');
        setTimeout(() => this.redirect(), 1000);
      } else {
        throw new Error(result.error || 'Erro ao criar conta');
      }
    } catch (error) {
      console.error('Register error:', error);

      let errorMessage = 'Erro ao criar conta. Tente novamente.';

      if (error.message.includes('already registered')) {
        errorMessage = 'Este e-mail já está cadastrado';
      } else if (error.message.includes('Invalid email')) {
        errorMessage = 'E-mail inválido';
      } else if (error.message.includes('Password')) {
        errorMessage = 'Senha muito fraca. Use no mínimo 6 caracteres';
      }

      this.showNotification(errorMessage, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Criar Conta';
    }
  }

  redirect() {
    window.location.href = this.redirectUrl;
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
}

// Initialize auth page
new AuthPage();