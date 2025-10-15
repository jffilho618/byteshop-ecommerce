/**
 * Navbar Component
 * Gerencia autenticação visual e badge do carrinho
 */

import { getCurrentUser, logout } from '../utils/auth.js';
import { getCartSummary } from '../utils/api.js';

class Navbar {
  constructor() {
    this.init();
  }

  async init() {
    await this.updateAuthUI();
    await this.updateCartBadge();
    this.attachEventListeners();

    // Atualizar cart badge a cada 5 segundos
    setInterval(() => this.updateCartBadge(), 5000);
  }

  async updateAuthUI() {
    const user = await getCurrentUser();

    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const userMenu = document.getElementById('userMenu');
    const userName = document.getElementById('userName');
    const adminLink = document.getElementById('adminLink');

    if (user) {
      // Usuário autenticado
      if (loginBtn) loginBtn.style.display = 'none';
      if (registerBtn) registerBtn.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'block';
        if (userName) userName.textContent = user.full_name || user.email;

        // Mostrar link admin se for admin
        if (adminLink && user.role === 'admin') {
          adminLink.style.display = 'block';
        }
      }
    } else {
      // Não autenticado
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (registerBtn) registerBtn.style.display = 'inline-flex';
      if (userMenu) userMenu.style.display = 'none';
    }
  }

  async updateCartBadge() {
    try {
      const user = await getCurrentUser();
      if (!user) {
        this.setCartBadge(0);
        return;
      }

      const summary = await getCartSummary();
      this.setCartBadge(summary.total_items || 0);
    } catch (error) {
      console.error('Error updating cart badge:', error);
      this.setCartBadge(0);
    }
  }

  setCartBadge(count) {
    const badge = document.getElementById('cartBadge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
  }

  attachEventListeners() {
    // User menu dropdown
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');

    if (userMenuBtn && userDropdown) {
      userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('active');
      });

      // Fechar dropdown ao clicar fora
      document.addEventListener('click', () => {
        userDropdown.classList.remove('active');
      });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
      });
    }
  }
}

// Inicializar navbar quando o DOM carregar
let navbarInstance;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    navbarInstance = new Navbar();
  });
} else {
  navbarInstance = new Navbar();
}

// Export função para atualizar badge do carrinho
export async function updateCartBadge() {
  if (navbarInstance) {
    await navbarInstance.updateCartBadge();
  } else {
    // Se navbar não inicializada ainda, atualizar diretamente
    const badge = document.getElementById('cartBadge');
    if (badge) {
      try {
        const user = await getCurrentUser();
        if (!user) {
          badge.textContent = '0';
          badge.style.display = 'none';
          return;
        }

        const summary = await getCartSummary();
        const count = summary.total_items || 0;
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
      } catch (error) {
        console.error('Error updating cart badge:', error);
        badge.textContent = '0';
        badge.style.display = 'none';
      }
    }
  }
}

console.log('✅ Navbar component loaded');