/**
 * Helper functions
 */

export function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) return;

  notification.textContent = message;
  notification.className = `notification ${type} show`;

  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR');
}

export function formatDateTime(date) {
  return new Date(date).toLocaleString('pt-BR');
}

export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}