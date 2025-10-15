import { supabase, supabaseAdmin, TABLES, VIEWS } from '../config/supabase';
import { AppError } from '../middlewares';
import {
  Order,
  OrderItem,
  CreateOrderDTO,
  OrderStatus,
  OrderFilters,
  PaginatedResponse,
} from '../types';
import { calculatePagination } from '../utils';
import { getUserCart, clearCart } from './cart.service';
import { checkAvailability } from './product.service';

/**
 * Service de Pedidos
 * Gerencia criação e gerenciamento de pedidos
 */

interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * Cria um novo pedido a partir do carrinho ou itens fornecidos
 */
export const createOrder = async (
  userId: string,
  data: CreateOrderDTO
): Promise<OrderWithItems> => {
  // 1. Validar e preparar itens do pedido
  const orderItems = data.items;

  if (!orderItems || orderItems.length === 0) {
    throw new AppError(400, 'Order must have at least one item');
  }

  // 2. Verificar disponibilidade de todos os produtos
  for (const item of orderItems) {
    const isAvailable = await checkAvailability(item.product_id, item.quantity);
    if (!isAvailable) {
      const { data: product } = await supabase
        .from(TABLES.PRODUCTS)
        .select('name')
        .eq('id', item.product_id)
        .single();

      throw new AppError(
        400,
        `Product "${product?.name || item.product_id}" is not available in requested quantity`
      );
    }
  }

  // 3. Buscar preços atuais dos produtos
  const productIds = orderItems.map((item) => item.product_id);
  const { data: products, error: productsError } = await supabase
    .from(TABLES.PRODUCTS)
    .select('id, price')
    .in('id', productIds);

  if (productsError || !products) {
    throw new AppError(500, 'Failed to fetch product prices');
  }

  // 4. Criar pedido (inicialmente com total = 0, será calculado por trigger)
  const { data: order, error: orderError } = await supabase
    .from(TABLES.ORDERS)
    .insert({
      user_id: userId,
      shipping_address: data.shipping_address,
      total_amount: 0, // Será calculado pelo trigger
      status: OrderStatus.PENDING,
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new AppError(500, 'Failed to create order');
  }

  // 5. Criar itens do pedido
  const orderItemsData = orderItems.map((item) => {
    const product = products.find((p) => p.id === item.product_id);
    if (!product) {
      throw new AppError(400, `Product ${item.product_id} not found`);
    }

    return {
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: product.price,
      // subtotal será calculado pelo trigger
    };
  });

  const { data: createdItems, error: itemsError } = await supabase
    .from(TABLES.ORDER_ITEMS)
    .insert(orderItemsData)
    .select();

  if (itemsError) {
    // Rollback: deletar pedido se itens falharem
    await supabase.from(TABLES.ORDERS).delete().eq('id', order.id);
    throw new AppError(500, 'Failed to create order items');
  }

  // 6. Diminuir estoque dos produtos
  for (const item of orderItems) {
    const { error: stockError } = await supabase.rpc('decrease_product_stock', {
      product_uuid: item.product_id,
      quantity_to_decrease: item.quantity,
    });

    if (stockError) {
      console.error('Failed to decrease stock:', stockError);
      // Continuar mesmo se falhar (estoque pode ser ajustado manualmente)
    }
  }

  // 7. Buscar pedido atualizado com total calculado
  const { data: finalOrder } = await supabase
    .from(TABLES.ORDERS)
    .select('*')
    .eq('id', order.id)
    .single();

  return {
    ...(finalOrder || order),
    items: createdItems || [],
  };
};

/**
 * Busca pedidos do usuário com filtros e paginação
 */
export const getUserOrders = async (
  userId: string,
  filters: OrderFilters
): Promise<PaginatedResponse<Order>> => {
  const { page, limit, offset } = calculatePagination(filters);

  let query = supabase
    .from(TABLES.ORDERS)
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  // Aplicar filtros
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.start_date) {
    query = query.gte('created_at', filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  // Paginação e ordenação
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, error.message);
  }

  return {
    success: true,
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Busca todos os pedidos (admin only)
 */
export const getAllOrders = async (
  filters: OrderFilters
): Promise<PaginatedResponse<Order>> => {
  const { page, limit, offset } = calculatePagination(filters);

  let query = supabaseAdmin
    .from(TABLES.ORDERS)
    .select('*', { count: 'exact' });

  // Aplicar filtros
  if (filters.user_id) {
    query = query.eq('user_id', filters.user_id);
  }

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.start_date) {
    query = query.gte('created_at', filters.start_date);
  }

  if (filters.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  // Paginação e ordenação
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    throw new AppError(500, error.message);
  }

  return {
    success: true,
    data: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
};

/**
 * Busca um pedido por ID com detalhes completos
 */
export const getOrderById = async (orderId: string, userId?: string): Promise<any> => {
  let query = supabase
    .from(VIEWS.ORDER_DETAILS)
    .select('*')
    .eq('order_id', orderId);

  // Se não for admin, filtrar por user_id
  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    throw new AppError(404, 'Order not found');
  }

  return data;
};

/**
 * Atualiza status de um pedido (admin only)
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: OrderStatus
): Promise<Order> => {
  // Usar function com validação
  const { data, error } = await supabaseAdmin.rpc('update_order_status', {
    order_uuid: orderId,
    new_status: newStatus,
  });

  if (error) {
    throw new AppError(400, error.message);
  }

  // Buscar pedido atualizado
  const { data: order, error: fetchError } = await supabaseAdmin
    .from(TABLES.ORDERS)
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    throw new AppError(404, 'Order not found after update');
  }

  return order;
};

/**
 * Busca dashboard de vendas (admin only)
 */
export const getSalesDashboard = async (startDate?: string, endDate?: string) => {
  let query = supabaseAdmin
    .from(VIEWS.SALES_DASHBOARD)
    .select('*');

  if (startDate) {
    query = query.gte('sale_date', startDate);
  }

  if (endDate) {
    query = query.lte('sale_date', endDate);
  }

  query = query.order('sale_date', { ascending: false }).limit(30);

  const { data, error } = await query;

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};

/**
 * Busca histórico de pedidos de usuários (admin only)
 */
export const getUserOrderHistory = async () => {
  const { data, error } = await supabaseAdmin
    .from(VIEWS.USER_ORDER_HISTORY)
    .select('*')
    .order('total_spent', { ascending: false });

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};