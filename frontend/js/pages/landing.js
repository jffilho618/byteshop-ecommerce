/**
 * Landing Page
 * Funcionalidades da página inicial
 */

import { getProducts, addToCart, formatPrice } from '../utils/api.js';
import { getCurrentUser } from '../utils/auth.js';
import { getCartSummary } from '../utils/api.js';

class LandingPage {
  constructor() {
    this.products = [];
    this.filters = {
      category: '',
      search: '',
      sortBy: 'newest',
      minPrice: null,
      maxPrice: null,
      inStock: false,
    };

    this.init();
  }

  async init() {
    this.attachEventListeners();
    await this.loadProducts();
  }

  attachEventListeners() {
    // Category filter
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
      card.addEventListener('click', () => {
        // Remove active class from all
        categoryCards.forEach(c => c.classList.remove('active'));
        // Add active to clicked
        card.classList.add('active');

        // Update filter
        this.filters.category = card.dataset.category || '';
        this.loadProducts();
      });
    });

    // Search
    const searchBtn = document.getElementById('searchBtn');
    const searchInput = document.getElementById('searchInput');

    if (searchBtn && searchInput) {
      searchBtn.addEventListener('click', () => {
        this.filters.search = searchInput.value.trim();
        this.loadProducts();
      });

      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.filters.search = searchInput.value.trim();
          this.loadProducts();
        }
      });
    }

    // Sort
    const sortBy = document.getElementById('sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', (e) => {
        this.filters.sortBy = e.target.value;
        this.loadProducts();
      });
    }

    // Price filters
    const minPrice = document.getElementById('minPrice');
    const maxPrice = document.getElementById('maxPrice');

    if (minPrice) {
      minPrice.addEventListener('change', (e) => {
        this.filters.minPrice = e.target.value ? parseFloat(e.target.value) : null;
        this.loadProducts();
      });
    }

    if (maxPrice) {
      maxPrice.addEventListener('change', (e) => {
        this.filters.maxPrice = e.target.value ? parseFloat(e.target.value) : null;
        this.loadProducts();
      });
    }

    // In stock only
    const inStockOnly = document.getElementById('inStockOnly');
    if (inStockOnly) {
      inStockOnly.addEventListener('change', (e) => {
        this.filters.inStock = e.target.checked;
        this.loadProducts();
      });
    }

    // Clear filters
    const clearFilters = document.getElementById('clearFilters');
    if (clearFilters) {
      clearFilters.addEventListener('click', () => {
        this.resetFilters();
      });
    }

    // Reset search
    const resetSearch = document.getElementById('resetSearch');
    if (resetSearch) {
      resetSearch.addEventListener('click', () => {
        this.resetFilters();
      });
    }
  }

  resetFilters() {
    this.filters = {
      category: '',
      search: '',
      sortBy: 'newest',
      minPrice: null,
      maxPrice: null,
      inStock: false,
    };

    // Reset UI
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const sortBy = document.getElementById('sortBy');
    if (sortBy) sortBy.value = 'newest';

    const minPrice = document.getElementById('minPrice');
    if (minPrice) minPrice.value = '';

    const maxPrice = document.getElementById('maxPrice');
    if (maxPrice) maxPrice.value = '';

    const inStockOnly = document.getElementById('inStockOnly');
    if (inStockOnly) inStockOnly.checked = false;

    // Reset category active
    const categoryCards = document.querySelectorAll('.category-card');
    categoryCards.forEach(card => {
      if (card.dataset.category === '') {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });

    this.loadProducts();
  }

  async loadProducts() {
    const loading = document.getElementById('productsLoading');
    const grid = document.getElementById('productsGrid');
    const empty = document.getElementById('productsEmpty');

    try {
      // Show loading
      if (loading) loading.style.display = 'flex';
      if (grid) grid.innerHTML = '';
      if (empty) empty.style.display = 'none';

      // Load products
      this.products = await getProducts(this.filters);

      // Hide loading
      if (loading) loading.style.display = 'none';

      // Show products or empty state
      if (this.products.length === 0) {
        if (empty) empty.style.display = 'block';
      } else {
        this.renderProducts();
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (loading) loading.style.display = 'none';
      if (empty) {
        empty.style.display = 'block';
        empty.innerHTML = '<p>Erro ao carregar produtos. Tente novamente.</p>';
      }
    }
  }

  renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;

    grid.innerHTML = this.products.map(product => this.createProductCard(product)).join('');

    // Attach event listeners to add to cart buttons
    this.products.forEach(product => {
      const btn = document.getElementById(`add-to-cart-${product.id}`);
      if (btn) {
        btn.addEventListener('click', () => this.handleAddToCart(product));
      }
    });
  }

  createProductCard(product) {
    const inStock = product.stock_quantity > 0;

    return `
      <div class="product-card">
        <img
          src="${product.image_url}"
          alt="${product.name}"
          class="product-image"
          onerror="this.src='/assets/placeholder-product.png'"
        />
        <div class="product-body">
          <div class="product-category">${product.category}</div>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-description">${product.description}</p>

          <div class="product-footer">
            <div>
              <div class="product-price">${formatPrice(product.price)}</div>
              <div class="product-stock">
                ${inStock
                  ? `${product.stock_quantity} em estoque`
                  : 'Fora de estoque'
                }
              </div>
            </div>
          </div>

          <div class="product-actions">
            <button
              class="btn btn-primary"
              id="add-to-cart-${product.id}"
              ${!inStock ? 'disabled' : ''}
            >
              🛒 Adicionar ao Carrinho
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async handleAddToCart(product) {
    try {
      const user = await getCurrentUser();

      if (!user) {
        // Redirecionar para login
        window.location.href = `/pages/login.html?redirect=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      // Add to cart
      await addToCart(product.id, 1);

      // Show success message
      this.showNotification('Produto adicionado ao carrinho!', 'success');

      // Update cart badge (será atualizado automaticamente pelo intervalo da navbar)
      // Mas podemos forçar uma atualização imediata
      const event = new CustomEvent('cart-updated');
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error adding to cart:', error);
      this.showNotification('Erro ao adicionar ao carrinho. Tente novamente.', 'error');
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Initialize landing page
new LandingPage();

console.log('✅ Landing page loaded');