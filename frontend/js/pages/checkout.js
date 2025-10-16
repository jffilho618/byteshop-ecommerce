/**
 * Checkout Page Logic
 */

import { getCurrentUser } from '../utils/auth.js';
import {
  getCart,
  createOrder,
  getAddresses,
  createAddress
} from '../utils/api.js';

class CheckoutPage {
  constructor() {
    this.cart = [];
    this.user = null;
    this.addresses = [];
    this.selectedAddressId = null;
    this.addressMode = 'select'; // 'select' ou 'new'
    this.init();
  }

  async init() {
    await this.checkAuth();
    this.attachEventListeners();
    await this.loadAddresses();
    await this.loadCart();
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

    // Address mode toggle
    const addressModeRadios = document.querySelectorAll('input[name="addressMode"]');
    addressModeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => this.handleAddressModeChange(e.target.value));
    });

    // Address selection
    const addressSelect = document.getElementById('savedAddressSelect');
    if (addressSelect) {
      addressSelect.addEventListener('change', (e) => {
        this.selectedAddressId = e.target.value;
      });
    }

    // CEP auto-fill (usando ViaCEP API)
    const cepInput = document.getElementById('cep');
    if (cepInput) {
      cepInput.addEventListener('blur', () => this.handleCepLookup());
      cepInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
          value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        e.target.value = value;
      });
    }

    // Confirm order
    const confirmOrderBtn = document.getElementById('confirmOrderBtn');
    if (confirmOrderBtn) {
      confirmOrderBtn.addEventListener('click', () => this.handleConfirmOrder());
    }

    // Success modal buttons
    const viewOrderBtn = document.getElementById('viewOrderBtn');
    if (viewOrderBtn) {
      viewOrderBtn.addEventListener('click', () => {
        window.location.href = '/pages/orders.html';
      });
    }

    const continueShoppingBtn = document.getElementById('continueShoppingBtn');
    if (continueShoppingBtn) {
      continueShoppingBtn.addEventListener('click', () => {
        window.location.href = '/';
      });
    }
  }

  async loadAddresses() {
    try {
      this.addresses = await getAddresses();
      this.renderAddressSelector();
    } catch (error) {
      console.error('Error loading addresses:', error);
      // Se falhar, continua com modo manual
      this.addresses = [];
    }
  }

  renderAddressSelector() {
    const savedAddressSection = document.getElementById('savedAddressSection');
    const savedAddressSelect = document.getElementById('savedAddressSelect');

    if (!savedAddressSection || !savedAddressSelect) return;

    if (this.addresses.length === 0) {
      // Sem endereços salvos - forçar modo novo endereço
      savedAddressSection.style.display = 'none';
      const selectRadio = document.getElementById('addressModeSelect');
      const newRadio = document.getElementById('addressModeNew');
      if (selectRadio) selectRadio.disabled = true;
      if (newRadio) newRadio.checked = true;
      this.addressMode = 'new';
      this.handleAddressModeChange('new');
      return;
    }

    // Renderizar opções
    savedAddressSelect.innerHTML = '<option value="">Selecione um endereço</option>';

    this.addresses.forEach(address => {
      const option = document.createElement('option');
      option.value = address.id;
      option.textContent = `${address.label} - ${address.street}, ${address.number}, ${address.city}/${address.state}`;
      if (address.is_default) {
        option.selected = true;
        this.selectedAddressId = address.id;
      }
      savedAddressSelect.appendChild(option);
    });

    savedAddressSection.style.display = 'block';
  }

  handleAddressModeChange(mode) {
    this.addressMode = mode;

    const savedAddressSection = document.getElementById('savedAddressSection');
    const newAddressSection = document.getElementById('newAddressSection');

    if (mode === 'select') {
      if (savedAddressSection) savedAddressSection.style.display = 'block';
      if (newAddressSection) newAddressSection.style.display = 'none';
    } else {
      if (savedAddressSection) savedAddressSection.style.display = 'none';
      if (newAddressSection) newAddressSection.style.display = 'block';
    }
  }

  async loadCart() {
    try {
      this.showLoading();

      this.cart = await getCart();

      if (this.cart.length === 0) {
        this.showNotification('Carrinho vazio', 'error');
        setTimeout(() => {
          window.location.href = '/pages/cart.html';
        }, 2000);
        return;
      }

      this.renderOrderSummary();
      this.showCheckoutContent();
    } catch (error) {
      console.error('Error loading cart:', error);
      this.showNotification('Erro ao carregar carrinho', 'error');
    }
  }

  renderOrderSummary() {
    const orderItems = document.getElementById('orderItems');
    if (!orderItems) return;

    orderItems.innerHTML = this.cart.map(item => this.renderOrderItem(item)).join('');

    this.updateSummary();
  }

  renderOrderItem(item) {
    const product = item.product;
    const itemTotal = (parseFloat(product.price) * item.quantity).toFixed(2);

    return `
      <div class="order-item">
        <img
          src="${product.image_url || ''}"
          alt="${product.name}"
          class="order-item-image"
          onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"60\" height=\"60\" viewBox=\"0 0 60 60\"%3E%3Crect fill=\"%23f3f4f6\" width=\"60\" height=\"60\"/%3E%3Ctext x=\"50%25\" y=\"50%25\" dominant-baseline=\"middle\" text-anchor=\"middle\" font-family=\"sans-serif\" font-size=\"10\" fill=\"%239ca3af\"%3ESem imagem%3C/text%3E%3C/svg%3E'"
        />
        <div class="order-item-details">
          <h4>${product.name}</h4>
          <p>Quantidade: ${item.quantity}</p>
        </div>
        <div class="order-item-price">
          R$ ${itemTotal}
        </div>
      </div>
    `;
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

  async handleCepLookup() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput.value.replace(/\D/g, '');

    if (cep.length !== 8) return;

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        this.showNotification('CEP não encontrado', 'error');
        return;
      }

      // Preencher campos automaticamente
      document.getElementById('street').value = data.logradouro || '';
      document.getElementById('neighborhood').value = data.bairro || '';
      document.getElementById('city').value = data.localidade || '';
      document.getElementById('state').value = data.uf || '';

      // Focus no campo número
      document.getElementById('number').focus();
    } catch (error) {
      console.error('CEP lookup error:', error);
      // Não mostrar erro, apenas não preencher automaticamente
    }
  }

  async handleConfirmOrder() {
    const confirmBtn = document.getElementById('confirmOrderBtn');

    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Processando...';

      let addressId = null;

      if (this.addressMode === 'select') {
        // Usar endereço salvo
        if (!this.selectedAddressId) {
          this.showNotification('Selecione um endereço', 'error');
          return;
        }

        addressId = this.selectedAddressId;
      } else {
        // Novo endereço - SEMPRE salvar
        const form = document.getElementById('shippingForm');

        if (!form.checkValidity()) {
          form.reportValidity();
          return;
        }

        const formData = new FormData(form);

        // Salvar endereço (obrigatório agora)
        const newAddress = await createAddress({
          label: formData.get('addressLabel') || 'Endereço Principal',
          street: formData.get('street'),
          number: formData.get('number'),
          complement: formData.get('complement') || null,
          neighborhood: formData.get('neighborhood'),
          city: formData.get('city'),
          state: formData.get('state'),
          zipcode: formData.get('cep'),
          is_default: this.addresses.length === 0, // Primeiro endereço é padrão
        });

        addressId = newAddress.id;
      }

      // Preparar items do pedido
      const items = this.cart.map(item => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.product.price
      }));

      // Criar pedido (addressId é obrigatório)
      const order = await createOrder(items, addressId);

      this.showSuccessModal(order.id);
    } catch (error) {
      console.error('Error creating order:', error);

      let errorMessage = 'Erro ao criar pedido';

      if (error.message.includes('stock')) {
        errorMessage = 'Produto sem estoque suficiente';
      } else if (error.message.includes('availability')) {
        errorMessage = 'Produto não disponível';
      } else if (error.message.includes('Address')) {
        errorMessage = 'Endereço é obrigatório';
      }

      this.showNotification(errorMessage, 'error');
    } finally {
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar Pedido';
    }
  }

  showSuccessModal(orderId) {
    const modal = document.getElementById('successModal');
    const orderNumber = document.getElementById('orderNumber');

    if (modal && orderNumber) {
      orderNumber.textContent = orderId.substring(0, 8).toUpperCase();
      modal.style.display = 'flex';
    }
  }

  handleUserMenu() {
    const options = [
      'Ver Pedidos',
      'Voltar à Loja'
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
      window.location.href = '/';
    }
  }

  showLoading() {
    document.getElementById('loadingState').style.display = 'block';
    document.getElementById('checkoutContent').style.display = 'none';
  }

  showCheckoutContent() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('checkoutContent').style.display = 'block';
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

// Initialize checkout page
new CheckoutPage();