/**
 * Orders Page Logic
 */

import { getCurrentUser, logout } from '../utils/auth.js';
import { getUserOrders, getOrderDetails } from '../utils/api.js';
import { updateCartBadge } from '../components/navbar.js';

class OrdersPage {
  constructor() {
    this.orders = [];
    this.user = null;
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.attachEventListeners();
    await this.loadOrders();
    await updateCartBadge();
  }

  async checkAuth() {
    this.user = await getCurrentUser();

    if (!this.user) {
      window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    const userName = document.getElementById('userName');
    if (userName) {
      userName.textContent = this.user.full_name || this.user.email;
    }
  }

  attachEventListeners() {
    // User menu
    const userMenuBtn = document.getElementById('userMenuBtn');
    if (userMenuBtn) {
      userMenuBtn.addEventListener('click', () => this.handleUserMenu());
    }

    // Modal close
    const closeModal = document.getElementById('closeModal');
    const modalBackdrop = document.getElementById('modalBackdrop');

    if (closeModal) {
      closeModal.addEventListener('click', () => this.closeModal());
    }

    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', () => this.closeModal());
    }
  }

  async loadOrders() {
    try {
      this.showLoading();

      this.orders = await getUserOrders();

      if (this.orders.length === 0) {
        this.showEmptyState();
      } else {
        this.renderOrders();
        this.showOrdersList();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      this.showNotification('Erro ao carregar pedidos', 'error');
      this.showEmptyState();
    }
  }

  renderOrders() {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    ordersList.innerHTML = this.orders.map(order => this.renderOrderCard(order)).join('');

    // Attach event listeners
    this.orders.forEach(order => {
      const orderCard = document.getElementById(`order-${order.id}`);
      if (orderCard) {
        orderCard.addEventListener('click', () => this.showOrderDetails(order.id));
      }
    });
  }

  renderOrderCard(order) {
    const statusLabels = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    const statusIcons = {
      pending: '⏳',
      processing: '📦',
      shipped: '🚚',
      delivered: '✓',
      cancelled: '✗'
    };

    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Contar items (se disponível no order)
    const itemsCount = order.items ? order.items.length : 0;

    return `
      <div class="order-card" id="order-${order.id}">
        <div class="order-card-header">
          <div class="order-info">
            <h3>Pedido #${order.id.substring(0, 8).toUpperCase()}</h3>
            <p>${formattedDate} às ${formattedTime}</p>
          </div>
          <div class="order-status ${order.status}">
            ${statusIcons[order.status]} ${statusLabels[order.status]}
          </div>
        </div>

        <div class="order-card-body">
          <div class="order-items-preview">
            <span>${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'}</span>
          </div>
        </div>

        <div class="order-card-footer">
          <div class="order-total">
            R$ ${parseFloat(order.total_amount).toFixed(2)}
          </div>
          <div class="order-actions">
            <button class="btn-primary" onclick="event.stopPropagation()">
              Ver Detalhes
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async showOrderDetails(orderId) {
    try {
      const order = await getOrderDetails(orderId);

      const modal = document.getElementById('orderModal');
      const orderDetails = document.getElementById('orderDetails');

      if (!modal || !orderDetails) return;

      orderDetails.innerHTML = this.renderOrderDetails(order);
      modal.style.display = 'flex';
    } catch (error) {
      console.error('Error loading order details:', error);
      this.showNotification('Erro ao carregar detalhes do pedido', 'error');
    }
  }

  renderOrderDetails(order) {
    const statusLabels = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('pt-BR');
    const formattedTime = date.toLocaleTimeString('pt-BR');

    const items = order.items || [];

    return `
      <div class="order-detail-section">
        <h3>Informações do Pedido</h3>
        <div class="order-detail-row">
          <strong>Número do Pedido:</strong>
          <span>#${order.id.substring(0, 8).toUpperCase()}</span>
        </div>
        <div class="order-detail-row">
          <strong>Data:</strong>
          <span>${formattedDate} às ${formattedTime}</span>
        </div>
        <div class="order-detail-row">
          <strong>Status:</strong>
          <span class="order-status ${order.status}">
            ${statusLabels[order.status]}
          </span>
        </div>
      </div>

      <div class="order-detail-section">
        <h3>Endereço de Entrega</h3>
        <p style="color: var(--text-secondary); line-height: 1.6;">
          ${order.shipping_address}
        </p>
      </div>

      <div class="order-detail-section">
        <h3>Itens do Pedido</h3>
        <div class="order-items-list">
          ${items.map(item => this.renderOrderItem(item)).join('')}
        </div>

        <div class="order-summary">
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>R$ ${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
          <div class="summary-row">
            <span>Frete:</span>
            <span>Grátis</span>
          </div>
          <div class="summary-row total">
            <span>Total:</span>
            <span>R$ ${parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderOrderItem(item) {
    const product = item.product;
    const itemTotal = (parseFloat(item.unit_price) * item.quantity).toFixed(2);

    return `
      <div class="order-item">
        <img
          src="${product?.image_url || ''}"
          alt="${product?.name || 'Produto'}"
          class="order-item-image"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"80\" height=\"80\" viewBox=\"0 0 80 80\"%3E%3Crect fill=\"%23f3f4f6\" width=\"80\" height=\"80\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"12\" fill=\"%239ca3af\"%3ESem imagem%3C/text%3E%3C/svg%3E'"
        />
        <div class="order-item-details">
          <h4>${product?.name || 'Produto'}</h4>
          <p>Quantidade: ${item.quantity}</p>
          <p>Preço unitário: R$ ${parseFloat(item.unit_price).toFixed(2)}</p>
        </div>
        <div class="order-item-price">
          <span class="item-total">R$ ${itemTotal}</span>
        </div>
      </div>
    `;
  }

  closeModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  handleUserMenu() {
    const options = [
      'Voltar à Loja',
      'Sair'
    ];

    if (this.user.role === 'admin') {
      options.unshift('Dashboard Admin');
    }

    const choice = prompt('Opções:\n' + options.map((opt, i) => `${i + 1}. ${opt}`).join('\n'));

    if (choice === '1' && this.user.role === 'admin') {
      window.location.href = '/pages/admin.html';
    } else if (choice === (this.user.role === 'admin' ? '2' : '1')) {
      window.location.href = '/';
    } else if (choice === (this.user.role === 'admin' ? '3' : '2')) {
      logout();
      window.location.href = '/';
    }
  }

  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('ordersList').style.display = 'none';
  }

  showEmptyState() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('ordersList').style.display = 'none';
  }

  showOrdersList() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('ordersList').style.display = 'flex';
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

// Initialize orders page
new OrdersPage();