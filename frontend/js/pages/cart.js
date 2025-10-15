/**
 * Cart Page Logic
 */

import { supabase } from '../config/supabase.js';
import { getCurrentUser, logout } from '../utils/auth.js';
import {
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../utils/api.js';
import { updateCartBadge } from '../components/navbar.js';

class CartPage {
  constructor() {
    this.cart = [];
    this.user = null;
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.attachEventListeners();
    await this.loadCart();
  }

  async checkAuth() {
    this.user = await getCurrentUser();

    if (!this.user) {
      // Redirecionar para login se não estiver autenticado
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Atualizar UI do usuário
    const userName = document.getElementById('userName');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (userName && userMenuBtn && loginBtn) {
      userName.textContent = this.user.full_name || this.user.email;
      userMenuBtn.style.display = 'block';
      loginBtn.style.display = 'none';
    }
  }

  attachEventListeners() {
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
      userMenuBtn.addEventListener('click', () => this.handleUserMenu());
    }

    // Checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => this.handleCheckout());
    }

    // Clear cart
    const clearCartBtn = document.getElementById('clearCartBtn');
    if (clearCartBtn) {
      clearCartBtn.addEventListener('click', () => this.handleClearCart());
    }
  }

  async loadCart() {
    try {
      this.showLoading();

      this.cart = await getCart();

      if (this.cart.length === 0) {
        this.showEmptyState();
      } else {
        this.renderCart();
        this.showCartContent();
      }

      await updateCartBadge();
    } catch (error) {
      console.error('Error loading cart:', error);
      this.showNotification('Erro ao carregar carrinho', 'error');
      this.showEmptyState();
    }
  }

  renderCart() {
    const cartItemsList = document.getElementById('cartItemsList');
    if (!cartItemsList) return;

    cartItemsList.innerHTML = this.cart.map(item => this.renderCartItem(item)).join('');

    // Attach event listeners para cada item
    this.cart.forEach(item => {
      const itemElement = document.getElementById(`item-${item.id}`);
      if (!itemElement) return;

      // Quantity buttons
      const decreaseBtn = itemElement.querySelector('.quantity-decrease');
      const increaseBtn = itemElement.querySelector('.quantity-increase');
      const quantityInput = itemElement.querySelector('.quantity-input');
      const removeBtn = itemElement.querySelector('.remove-btn');

      if (decreaseBtn) {
        decreaseBtn.addEventListener('click', () => this.handleQuantityChange(item, item.quantity - 1));
      }

      if (increaseBtn) {
        increaseBtn.addEventListener('click', () => this.handleQuantityChange(item, item.quantity + 1));
      }

      if (quantityInput) {
        quantityInput.addEventListener('change', (e) => {
          const newQuantity = parseInt(e.target.value) || 1;
          this.handleQuantityChange(item, newQuantity);
        });
      }

      if (removeBtn) {
        removeBtn.addEventListener('click', () => this.handleRemoveItem(item));
      }
    });

    this.updateSummary();
  }

  renderCartItem(item) {
    const product = item.product;
    const subtotal = (parseFloat(product.price) * item.quantity).toFixed(2);
    const isLowStock = product.stock_quantity < 5;

    return `
      <div class="cart-item" id="item-${item.id}">
        <img
          src="${product.image_url || ''}"
          alt="${product.name}"
          class="cart-item-image"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"100\" height=\"100\" viewBox=\"0 0 100 100\"%3E%3Crect fill=\"%23f3f4f6\" width=\"100\" height=\"100\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"12\" fill=\"%239ca3af\"%3ESem imagem%3C/text%3E%3C/svg%3E'"
        />

        <div class="cart-item-details">
          <h3 class="cart-item-name">${product.name}</h3>
          <p class="cart-item-price">R$ ${parseFloat(product.price).toFixed(2)}</p>
          <p class="cart-item-stock ${isLowStock ? 'low-stock' : ''}">
            ${isLowStock ? '⚠️ ' : ''}${product.stock_quantity} em estoque
          </p>
        </div>

        <div class="cart-item-actions">
          <div class="quantity-controls">
            <button class="quantity-btn quantity-decrease" ${item.quantity <= 1 ? 'disabled' : ''}>
              −
            </button>
            <input
              type="number"
              class="quantity-input"
              value="${item.quantity}"
              min="1"
              max="${product.stock_quantity}"
            />
            <button class="quantity-btn quantity-increase" ${item.quantity >= product.stock_quantity ? 'disabled' : ''}>
              +
            </button>
          </div>

          <button class="remove-btn" data-item-id="${item.id}">
            Remover
          </button>
        </div>
      </div>
    `;
  }

  async handleQuantityChange(item, newQuantity) {
    try {
      if (newQuantity < 1 || newQuantity > item.product.stock_quantity) {
        this.showNotification('Quantidade inválida', 'error');
        return;
      }

      await updateCartItem(item.id, newQuantity);
      this.showNotification('Quantidade atualizada', 'success');
      await this.loadCart();
    } catch (error) {
      console.error('Error updating quantity:', error);
      this.showNotification('Erro ao atualizar quantidade', 'error');
    }
  }

  async handleRemoveItem(item) {
    try {
      if (!confirm(`Remover ${item.product.name} do carrinho?`)) {
        return;
      }

      await removeFromCart(item.id);
      this.showNotification('Item removido', 'success');
      await this.loadCart();
    } catch (error) {
      console.error('Error removing item:', error);
      this.showNotification('Erro ao remover item', 'error');
    }
  }

  async handleClearCart() {
    try {
      if (!confirm('Tem certeza que deseja limpar o carrinho?')) {
        return;
      }

      await clearCart();
      this.showNotification('Carrinho limpo', 'success');
      await this.loadCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
      this.showNotification('Erro ao limpar carrinho', 'error');
    }
  }

  handleCheckout() {
    if (this.cart.length === 0) {
      this.showNotification('Carrinho vazio', 'error');
      return;
    }

    window.location.href = '/pages/checkout.html';
  }

  handleUserMenu() {
    const options = [
      'Ver Pedidos',
      'Sair'
    ];

    if (this.user.role === 'admin') {
      options.unshift('Dashboard Admin');
    }

    const choice = prompt('Opções:\n' + options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'));

    if (choice === '1' && this.user.role === 'admin') {
      window.location.href = '/pages/admin.html';
    } else if (choice === (this.user.role === 'admin' ? '2' : '1')) {
      window.location.href = '/pages/orders.html';
    } else if (choice === (this.user.role === 'admin' ? '3' : '2')) {
      logout();
      window.location.href = '/';
    }
  }

  updateSummary() {
    const subtotal = this.cart.reduce((sum, item) => {
      return sum + (parseFloat(item.product.price) * item.quantity);
    }, 0);

    const shipping = 0; // Frete grátis
    const total = subtotal + shipping;

    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shipping');
    const totalEl = document.getElementById('total');

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2)}`;
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Grátis' : `R$ ${shipping.toFixed(2)}`;
    if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2)}`;
  }

  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('cartContent').style.display = 'none';
  }

  showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('cartContent').style.display = 'none';
  }

  showCartContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('cartContent').style.display = 'block';
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

// Initialize cart page
new CartPage();