/**
 * Admin Dashboard Logic
 */

import { supabase, TABLES } from '../config/supabase.js';
import { getCurrentUser, logout } from '../utils/auth.js';
import {
  ORDER_STATUS_LABELS,
  renderStatusBadge,
  updateStatusBadge,
} from '../utils/order-status.js';
import {
  uploadProductImage,
  updateProductImage,
  deleteProductImage,
  createImagePreview,
  getProductImageUrl,
} from '../utils/storage.js';

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
    navItems.forEach((item) => {
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

    // Image upload handlers
    this.attachImageUploadListeners();

    // Modal backdrop
    const modalBackdrops = document.querySelectorAll('.modal-backdrop');
    modalBackdrops.forEach((backdrop) => {
      backdrop.addEventListener('click', () => this.closeProductModal());
    });

    // Export CSV handlers
    this.attachExportCsvListeners();
  }

  attachImageUploadListeners() {
    const selectImageBtn = document.getElementById('selectImageBtn');
    const productImageFile = document.getElementById('productImageFile');
    const removeImageBtn = document.getElementById('removeImageBtn');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');

    if (selectImageBtn && productImageFile) {
      selectImageBtn.addEventListener('click', () => {
        productImageFile.click();
      });

      productImageFile.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await createImagePreview(file, 'imagePreview');

            const imageFileName = document.getElementById('imageFileName');
            if (imageFileName) {
              imageFileName.textContent = file.name;
            }

            if (imagePreviewContainer) {
              imagePreviewContainer.style.display = 'block';
            }
          } catch (error) {
            console.error('Preview error:', error);
            this.showNotification('Erro ao carregar preview da imagem', 'error');
          }
        }
      });
    }

    if (removeImageBtn && imagePreviewContainer) {
      removeImageBtn.addEventListener('click', () => {
        if (productImageFile) productImageFile.value = '';
        imagePreviewContainer.style.display = 'none';
      });
    }
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update nav
    document.querySelectorAll('.admin-nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    // Update tabs
    document.querySelectorAll('.admin-tab').forEach((tabEl) => {
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

    tbody.innerHTML = this.products.map((product) => this.renderProductRow(product)).join('');

    // Attach action listeners
    this.products.forEach((product) => {
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
      peripherals: 'Periféricos',
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

      // Usar view admin_all_orders para ver TODOS os pedidos com info do cliente
      const { data, error } = await supabase.from('admin_all_orders').select('*');

      if (error) throw error;

      this.orders = data || [];
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

    if (this.orders.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center; padding: var(--spacing-xl); color: var(--text-secondary);">Nenhum pedido encontrado</td></tr>';
      return;
    }

    tbody.innerHTML = this.orders.map((order) => this.renderOrderRow(order)).join('');

    // Attach action listeners for status updates
    this.orders.forEach((order) => {
      const select = document.getElementById(`status-${order.order_id}`);
      if (select) {
        select.addEventListener('change', (e) =>
          this.updateOrderStatus(order.order_id, e.target.value)
        );
      }
    });
  }

  renderOrderRow(order) {
    const date = new Date(order.order_date);
    const formattedDate = date.toLocaleDateString('pt-BR');

    return `
      <tr id="order-row-${order.order_id}">
        <td>#${order.order_id.substring(0, 8).toUpperCase()}</td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <strong>${order.customer_name}</strong>
            <small style="color: var(--text-secondary);">${order.customer_email}</small>
          </div>
        </td>
        <td>${formattedDate}</td>
        <td>R$ ${parseFloat(order.total_amount).toFixed(2)}</td>
        <td>${renderStatusBadge(order.status, order.order_id)}</td>
        <td>
          <select id="status-${order.order_id}" class="status-select">
            ${Object.entries(ORDER_STATUS_LABELS)
              .map(
                ([value, label]) =>
                  `<option value="${value}" ${order.status === value ? 'selected' : ''}>${label}</option>`
              )
              .join('')}
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

      const totalRevenue =
        revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

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
      container.innerHTML =
        '<p style="color: var(--text-secondary);">Nenhum produto com estoque baixo.</p>';
      return;
    }

    container.innerHTML = products
      .map(
        (product) => `
      <div class="low-stock-item">
        <span class="low-stock-item-name">${product.name}</span>
        <span class="low-stock-item-stock">${product.stock_quantity} unidades</span>
      </div>
    `
      )
      .join('');
  }

  openProductModal(product = null) {
    this.editingProductId = product?.id || null;

    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const imagePreview = document.getElementById('imagePreview');
    const imageFileName = document.getElementById('imageFileName');
    const productImageFile = document.getElementById('productImageFile');

    if (product) {
      title.textContent = 'Editar Produto';
      document.getElementById('productId').value = product.id;
      document.getElementById('productName').value = product.name;
      document.getElementById('productCategory').value = product.category;
      document.getElementById('productPrice').value = product.price;
      document.getElementById('productStock').value = product.stock_quantity;
      document.getElementById('productDescription').value = product.description;

      // Mostrar imagem atual se existir
      if (product.image_url) {
        imagePreview.src = getProductImageUrl(product.image_url);
        imageFileName.textContent = 'Imagem atual';
        imagePreviewContainer.style.display = 'block';
      } else {
        imagePreviewContainer.style.display = 'none';
      }
    } else {
      title.textContent = 'Adicionar Produto';
      form.reset();
      imagePreviewContainer.style.display = 'none';
      if (productImageFile) productImageFile.value = '';
    }

    modal.style.display = 'flex';
  }

  closeProductModal() {
    const modal = document.getElementById('productModal');
    const form = document.getElementById('productForm');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const productImageFile = document.getElementById('productImageFile');

    modal.style.display = 'none';
    form.reset();

    if (imagePreviewContainer) {
      imagePreviewContainer.style.display = 'none';
    }

    if (productImageFile) {
      productImageFile.value = '';
    }

    this.editingProductId = null;
  }

  async handleProductSubmit(e) {
    e.preventDefault();

    const productImageFile = document.getElementById('productImageFile');
    const saveBtn = document.getElementById('saveProductBtn');

    // Dados básicos do produto
    const productData = {
      name: document.getElementById('productName').value.trim(),
      category: document.getElementById('productCategory').value,
      price: parseFloat(document.getElementById('productPrice').value),
      stock_quantity: parseInt(document.getElementById('productStock').value),
      description: document.getElementById('productDescription').value.trim(),
    };

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Salvando...';

      let imageUrl = null;
      const selectedFile = productImageFile.files[0];

      // Upload de imagem se arquivo foi selecionado
      if (selectedFile) {
        console.log('📤 Fazendo upload da imagem...');

        if (this.editingProductId) {
          // Editando: buscar imagem antiga para deletar
          const existingProduct = this.products.find((p) => p.id === this.editingProductId);
          const oldImagePath = existingProduct?.image_url;

          const uploadResult = await updateProductImage(
            selectedFile,
            productData.category,
            productData.name,
            oldImagePath
          );
          imageUrl = uploadResult.url;
        } else {
          // Novo produto: upload simples
          const uploadResult = await uploadProductImage(
            selectedFile,
            productData.category,
            productData.name
          );
          imageUrl = uploadResult.url;
        }

        console.log('✅ Upload concluído:', imageUrl);
      } else if (this.editingProductId) {
        // Editando sem nova imagem: manter a atual
        const existingProduct = this.products.find((p) => p.id === this.editingProductId);
        imageUrl = existingProduct?.image_url || null;
      }

      // Adicionar URL da imagem aos dados
      productData.image_url = imageUrl;

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
        if (!imageUrl) {
          throw new Error('Imagem é obrigatória para novos produtos');
        }

        const { error } = await supabase.from(TABLES.PRODUCTS).insert([productData]);

        if (error) throw error;

        this.showNotification('Produto criado com sucesso!', 'success');
      }

      this.closeProductModal();
      await this.loadProducts();
    } catch (error) {
      console.error('Product submit error:', error);

      let errorMessage = 'Erro ao salvar produto';
      if (error.message.includes('upload')) {
        errorMessage = 'Erro no upload da imagem';
      } else if (error.message.includes('Imagem é obrigatória')) {
        errorMessage = 'Selecione uma imagem para o produto';
      }

      this.showNotification(errorMessage, 'error');
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
      // Deletar imagem do storage se existir
      if (product.image_url) {
        console.log('🗑️ Deletando imagem do produto...');
        await deleteProductImage(product.image_url);
      }

      // Soft delete do produto
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
    console.log('🔄 [UPDATE STATUS] Iniciando:', { orderId, newStatus });

    // Verificar sessão e admin
    const {
      data: { session },
    } = await supabase.auth.getSession();
    console.log('👤 [UPDATE STATUS] Usuário:', {
      userId: session?.user?.id,
      email: session?.user?.email,
      role: this.user?.role,
    });

    // Testar is_admin()
    const { data: isAdminResult, error: adminCheckError } = await supabase.rpc('is_admin');
    console.log('🔑 [UPDATE STATUS] is_admin():', isAdminResult, adminCheckError);

    // Verificar role diretamente na tabela users
    const { data: userRole, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', session?.user?.id)
      .single();
    console.log('🎭 [UPDATE STATUS] Role direto da tabela:', userRole, roleError);

    // Testar a query exata do RLS
    const { data: rlsTest, error: rlsError } = await supabase.rpc('test_can_update_order', {
      order_uuid: orderId,
    });
    console.log('🔬 [UPDATE STATUS] RLS Test:', rlsTest, rlsError);
    console.log('🔬 [UPDATE STATUS] RLS Test DETALHADO:', JSON.stringify(rlsTest, null, 2));

    const orderIndex = this.orders.findIndex((o) => o.order_id === orderId);
    const previousStatus = orderIndex !== -1 ? this.orders[orderIndex].status : null;

    console.log('📊 [UPDATE STATUS] Pedido:', {
      orderIndex,
      previousStatus,
      orderUserId: orderIndex !== -1 ? this.orders[orderIndex].user_id : null,
    });

    try {
      console.log('💾 [UPDATE STATUS] Salvando no banco...');

      // DEBUG: Verificar contexto de autenticação completo
      const { data: session } = await supabase.auth.getSession();
      console.log('🔐 [UPDATE STATUS] Sessão:', {
        user: session?.session?.user?.id,
        email: session?.session?.user?.email,
        role: session?.session?.user?.user_metadata?.role,
        aud: session?.session?.user?.aud,
        jwt_exists: !!session?.session?.access_token,
      });

      // DEBUG: Testar função SQL no contexto do cliente
      const { data: authTest } = await supabase.rpc('test_auth_context');
      console.log('🧪 [UPDATE STATUS] Contexto SQL:', authTest);

      const { data, error, count } = await supabase
        .from(TABLES.ORDERS)
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select();

      console.log('📦 [UPDATE STATUS] Resposta:', { data, error, count, dataLength: data?.length });

      if (error) {
        console.error('❌ [UPDATE STATUS] Erro Supabase:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('⚠️ [UPDATE STATUS] NENHUMA LINHA ATUALIZADA - RLS BLOQUEOU!');

        // Diagnóstico: tentar SELECT
        const { data: canRead } = await supabase.from(TABLES.ORDERS).select('*').eq('id', orderId);
        console.warn('🔍 [UPDATE STATUS] Consegue ler?', { canRead: !!canRead });

        throw new Error('RLS bloqueou UPDATE - nenhuma linha atualizada');
      }

      console.log('✅ [UPDATE STATUS] Banco atualizado:', data);

      updateStatusBadge(`badge-${orderId}`, newStatus);
      console.log('🎨 [UPDATE STATUS] Badge atualizado');

      if (orderIndex !== -1) {
        this.orders[orderIndex].status = newStatus;
      }

      this.showNotification('Status atualizado!', 'success');
      console.log('✅ [UPDATE STATUS] Concluído!');
    } catch (error) {
      console.error('❌ [UPDATE STATUS] Erro:', error);
      this.showNotification('Erro ao atualizar status', 'error');

      const select = document.getElementById(`status-${orderId}`);
      if (select && previousStatus) {
        select.value = previousStatus;
        updateStatusBadge(`badge-${orderId}`, previousStatus);
        console.log('⏪ [UPDATE STATUS] Revertido');
      }
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

  /**
   * Anexa event listeners para exportação CSV
   */
  attachExportCsvListeners() {
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const exportOptions = document.getElementById('exportOptions');
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const cancelExportBtn = document.getElementById('cancelExportBtn');

    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => {
        if (exportOptions) {
          const isVisible = exportOptions.style.display !== 'none';
          exportOptions.style.display = isVisible ? 'none' : 'block';
        }
      });
    }

    if (cancelExportBtn && exportOptions) {
      cancelExportBtn.addEventListener('click', () => {
        exportOptions.style.display = 'none';
      });
    }

    if (confirmExportBtn) {
      confirmExportBtn.addEventListener('click', () => this.handleExportCsv());
    }
  }

  /**
   * Exporta pedidos para CSV via Edge Function
   */
  async handleExportCsv() {
    const confirmExportBtn = document.getElementById('confirmExportBtn');
    const originalText = confirmExportBtn.textContent;

    try {
      confirmExportBtn.disabled = true;
      confirmExportBtn.textContent = 'Exportando...';

      // Obter filtros
      const status = document.getElementById('exportStatus').value;
      const startDate = document.getElementById('exportStartDate').value;
      const endDate = document.getElementById('exportEndDate').value;

      // Construir URL com filtros
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      // Obter token de sessão
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Sessão não encontrada');
      }

      // Construir URL da Edge Function manualmente
      const SUPABASE_URL = 'https://cliihgjajttoulpsrxzh.supabase.co';
      const queryString = params.toString();
      const functionUrl = `${SUPABASE_URL}/functions/v1/export-order-csv${queryString ? '?' + queryString : ''}`;

      const response = await fetch(functionUrl, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao exportar pedidos');
      }

      // Download do arquivo CSV
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      this.showNotification('✅ Pedidos exportados com sucesso!', 'success');

      // Fechar painel de exportação
      const exportOptions = document.getElementById('exportOptions');
      if (exportOptions) {
        exportOptions.style.display = 'none';
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      this.showNotification(`Erro ao exportar: ${error.message}`, 'error');
    } finally {
      confirmExportBtn.disabled = false;
      confirmExportBtn.textContent = originalText;
    }
  }
}

// Initialize admin dashboard
new AdminDashboard();
