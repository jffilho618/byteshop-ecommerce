/**
 * Admin Dashboard Logic
 */

import { supabase, TABLES } from '../config/supabase.js';
import { getCurrentUser, logout } from '../utils/auth.js';
import { showNotification } from '../utils/helpers.js';

class AdminDashboard {
  constructor() {
    this.user = null;
    this.currentTab = 'products';
    this.products = [];
    this.orders = [];
    this.editingProductId = null;
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.attachEventListeners();
    await this.loadProducts();
  }

  async checkAuth() {
    this.user = await getCurrentUser();

    if (!this.user || this.user.role !== 'admin') {
      alert('Acesso negado. Apenas administradores podem acessar esta página.');
      window.location.href = '/';
      return;
    }
  }

  attachEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        logout();
        window.location.href = '/';
      });
    }

    // Tab navigation
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = e.target.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Add product button
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
      addProductBtn.addEventListener('click', () => this.openProductModal());
    }

    // Product modal
    const closeProductModal = document.getElementById('closeProductModal');
    const cancelProductBtn = document.getElementById('cancelProductBtn');
    const productForm = document.getElementById('productForm');

    if (closeProductModal) {
      closeProductModal.addEventListener('click', () => this.closeProductModal());
    }

    if (cancelProductBtn) {
      cancelProductBtn.addEventListener('click', () => this.closeProductModal());
    }

    if (productForm) {
      productForm.addEventListener('submit', (e) => this.handleProductSubmit(e));
    }

    // Modal backdrop
    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
    modalBackdrops.forEach(backdrop => {
      backdrop.addEventListener('click', () => this.closeProductModal());
    });
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update nav
    document.querySelectorAll('.admin-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Update tabs
    document.querySelectorAll('.admin-tab').forEach(tabEl => {
      tabEl.classList.remove('active');
    });
    document.getElementById(`${tab}Tab`).classList.add('active');

    // Load data
    if (tab === 'products') {
      this.loadProducts();
    } else if (tab === 'orders') {
      this.loadOrders();
    } else if (tab === 'stats') {
      this.loadStats();
    }
  }

  async loadProducts() {
    try {
      document.getElementById('productsLoading').style.display = 'block';
      document.getElementById('productsTable').style.display = 'none';

      const { data, error } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.products = data;
      this.renderProducts();

      document.getElementById('productsLoading').style.display = 'none';
      document.getElementById('productsTable').style.display = 'block';
    } catch (error) {
      console.error('Error loading products:', error);
      this.showNotification('Erro ao carregar produtos', 'error');
    }
  }

  renderProducts() {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.products.map(product => this.renderProductRow(product)).join('');

    // Attach action listeners
    this.products.forEach(product => {
      const editBtn = document.getElementById(`edit-${product.id}`);
      const deleteBtn = document.getElementById(`delete-${product.id}`);
      const toggleBtn = document.getElementById(`toggle-${product.id}`);

      if (editBtn) {
        editBtn.addEventListener('click', () => this.editProduct(product));
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => this.deleteProduct(product));
      }

      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleProductStatus(product));
      }
    });
  }

  renderProductRow(product) {
    const categoryLabels = {
      laptops: 'Laptops',
      smartphones: 'Smartphones',
      tablets: 'Tablets',
      accessories: 'Acessórios',
      components: 'Componentes',
      peripherals: 'Periféricos'
    };

    const stockStatus = product.stock_quantity < 10 ? 'low' : '';

    return `
      <tr>
        <td>
          <img
            src="${product.image_url || ''}"
            alt="${product.name}"
            class="product-image-thumb"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"50\" height=\"50\" viewBox=\"0 0 50 50\"%3E%3Crect fill=\"%23f3f4f6\" width=\"50\" height=\"50\"/%3E%3C/svg%3E'"
          />
        </td>
        <td>${product.name}</td>
        <td>${categoryLabels[product.category]}</td>
        <td>R$ ${parseFloat(product.price).toFixed(2)}</td>
        <td>
          <span class="status-badge ${stockStatus}">
            ${product.stock_quantity}
          </span>
        </td>
        <td>
          <span class="status-badge ${product.is_active ? 'active' : 'inactive'}">
            ${product.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" id="edit-${product.id}" title="Editar">
              ✏️
            </button>
            <button class="btn-icon" id="toggle-${product.id}" title="${product.is_active ? 'Desativar' : 'Ativar'}">
              ${product.is_active ? '🔒' : '🔓'}
            </button>
            <button class="btn-icon danger" id="delete-${product.id}" title="Deletar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  async loadOrders() {
    try {
      document.getElementById('ordersLoading').style.display = 'block';
      document.getElementById('ordersTable').style.display = 'none';

      const { data, error } = await supabase
        .from(TABLES.ORDERS)
        .select(`
          *,
          user:users(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.orders = data;
      this.renderOrders();

      document.getElementById('ordersLoading').style.display = 'none';
      document.getElementById('ordersTable').style.display = 'block';
    } catch (error) {
      console.error('Error loading orders:', error);
      this.showNotification('Erro ao carregar pedidos', 'error');
    }
  }

  renderOrders() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    tbody.innerHTML = this.orders.map(order => this.renderOrderRow(order)).join('');

    // Attach action listeners for status updates
    this.orders.forEach(order => {
      const select = document.getElementById(`status-${order.id}`);
      if (select) {
        select.addEventListener('change', (e) => this.updateOrderStatus(order.id, e.target.value));
      }
    });
  }

  renderOrderRow(order) {
    const statusLabels = {
      pending: 'Pendente',
      processing: 'Processando',
      shipped: 'Enviado',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };

    const date = new Date(order.created_at);
    const formattedDate = date.toLocaleDateString('pt-BR');

    return `
      <tr>
        <td>#${order.id.substring(0, 8).toUpperCase()}</td>
        <td>${order.user?.full_name || order.user?.email || 'N/A'}</td>
        <td>${formattedDate}</td>
        <td>R$ ${parseFloat(order.total_amount).toFixed(2)}</td>
        <td>
          <span class="status-badge ${order.status}">
            ${statusLabels[order.status]}
          </span>
        </td>
        <td>
          <select id="status-${order.id}" class="status-select">
            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pendente</option>
            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processando</option>
            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Enviado</option>
            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Entregue</option>
            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelado</option>
          </select>
        </td>
      </tr>
    `;
  }

  async loadStats() {
    try {
      document.getElementById('statsLoading').style.display = 'block';
      document.getElementById('statsContent').style.display = 'none';

      // Total products
      const { count: productsCount } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*', { count: 'exact', head: true });

      // Total orders
      const { count: ordersCount } = await supabase
        .from(TABLES.ORDERS)
        .select('*', { count: 'exact', head: true });

      // Total revenue
      const { data: revenueData } = await supabase
        .from(TABLES.ORDERS)
        .select('total_amount')
        .not('status', 'eq', 'cancelled');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

      // Low stock products
      const { data: lowStockData } = await supabase
        .from(TABLES.PRODUCTS)
        .select('*')
        .lte('stock_quantity', 10)
        .eq('is_active', true);

      // Update stats
      document.getElementById('totalProducts').textContent = productsCount || 0;
      document.getElementById('totalOrders').textContent = ordersCount || 0;
      document.getElementById('totalRevenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
      document.getElementById('lowStockCount').textContent = lowStockData?.length || 0;

      // Render low stock products
      this.renderLowStockProducts(lowStockData || []);

      document.getElementById('statsLoading').style.display = 'none';
      document.getElementById('statsContent').style.display = 'block';
    } catch (error) {
      console.error('Error loading stats:', error);
      this.showNotification('Erro ao carregar estatísticas', 'error');
    }
  }

  renderLowStockProducts(products) {
    const container = document.getElementById('lowStockProducts');
    if (!container) return;

    if (products.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">Nenhum produto com estoque baixo.</p>';
      return;
    }

    container.innerHTML = products.map(product => `
      <div class="low-stock-item">
        <span class="low-stock-item-name">${product.name}</span>
        <span class="low-stock-item-stock">${product.stock_quantity} unidades</span>
      </div>
    `).join('');
  }

  openProductModal(product = null) {
    this.editingProductId = product?.id || null;

    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (product) {
      title.textContent = 'Editar Produto';
      document.getElementById('productId').value = product.id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStock').value = product.stock_quantity;
      document.getElementById('productImage').value = product.image_url || '';
      document.getElementById('productDescription').value = product.description;
    } else {
      title.textContent = 'Adicionar Produto';
      form.reset();
    }

    modal.style.display = 'flex';
  }

  closeProductModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');

    modal.style.display = 'none';
    form.reset();
    this.editingProductId = null;
  }

  async handleProductSubmit(e) {
    e.preventDefault();

    const productData = {
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value,
      price: parseFloat(document.getElementById('productPrice').value),
      stock_quantity: parseInt(document.getElementById('productStock').value),
      image_url: document.getElementById('productImage').value.trim() || null,
      description: document.getElementById('productDescription').value.trim(),
    };

    const saveBtn = document.getElementById('saveProductBtn');

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';

      if (this.editingProductId) {
        // Update
        const { error } = await supabase
          .from(TABLES.PRODUCTS)
          .update(productData)
          .eq('id', this.editingProductId);

        if (error) throw error;

        this.showNotification('Produto atualizado com sucesso!', 'success');
      } else {
        // Create
        const { error } = await supabase
          .from(TABLES.PRODUCTS)
          .insert([productData]);

        if (error) throw error;

        this.showNotification('Produto criado com sucesso!', 'success');
      }

      this.closeProductModal();
      await this.loadProducts();
    } catch (error) {
      console.error('Error saving product:', error);
      this.showNotification('Erro ao salvar produto', 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = 'Salvar';
    }
  }

  editProduct(product) {
    this.openProductModal(product);
  }

  async deleteProduct(product) {
    if (!confirm(`Tem certeza que deseja deletar "${product.name}"?`)) {
      return;
    }

    try {
      // Soft delete
      const { error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({ is_active: false })
        .eq('id', product.id);

      if (error) throw error;

      this.showNotification('Produto deletado com sucesso!', 'success');
      await this.loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      this.showNotification('Erro ao deletar produto', 'error');
    }
  }

  async toggleProductStatus(product) {
    try {
      const { error } = await supabase
        .from(TABLES.PRODUCTS)
        .update({ is_active: !product.is_active })
        .eq('id', product.id);

      if (error) throw error;

      this.showNotification(
        `Produto ${!product.is_active ? 'ativado' : 'desativado'} com sucesso!`,
        'success'
      );
      await this.loadProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
      this.showNotification('Erro ao atualizar status', 'error');
    }
  }

  async updateOrderStatus(orderId, newStatus) {
    try {
      const { error } = await supabase
        .from(TABLES.ORDERS)
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      this.showNotification('Status do pedido atualizado!', 'success');
      await this.loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
      this.showNotification('Erro ao atualizar status do pedido', 'error');
    }
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

// Initialize admin dashboard
new AdminDashboard();