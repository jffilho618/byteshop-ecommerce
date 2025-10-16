/**
 * Order Status Utilities - Constantes e helpers para status de pedidos
 */

export const ORDER_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled'
};

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: 'Pendente',
  [ORDER_STATUS.PROCESSING]: 'Processando',
  [ORDER_STATUS.SHIPPED]: 'Enviado',
  [ORDER_STATUS.DELIVERED]: 'Entregue',
  [ORDER_STATUS.CANCELLED]: 'Cancelado'
};

/**
 * Renderiza badge de status com estilos
 * @param {string} status - Status do pedido
 * @param {string} orderId - ID do pedido (opcional, para atualização dinâmica)
 * @returns {string} HTML do badge
 */
export function renderStatusBadge(status, orderId = null) {
  const id = orderId ? `id="badge-${orderId}"` : '';
  return `
    <span ${id} class="status-badge ${status}">
      ${ORDER_STATUS_LABELS[status] || status}
    </span>
  `;
}

/**
 * Atualiza badge de status dinamicamente
 * @param {string} badgeId - ID do elemento badge
 * @param {string} newStatus - Novo status
 */
export function updateStatusBadge(badgeId, newStatus) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  // Remover todas as classes de status antigas
  Object.values(ORDER_STATUS).forEach(status => {
    badge.classList.remove(status);
  });

  // Adicionar nova classe e texto
  badge.classList.add(newStatus);
  badge.textContent = ORDER_STATUS_LABELS[newStatus];
}

console.log('✅ Order status utilities loaded');
