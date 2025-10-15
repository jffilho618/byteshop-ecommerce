/**
 * API Utilities - Funções para chamar a API backend
 */

import { supabase, TABLES, VIEWS, getProductImageUrl } from '../config/supabase.js';

/**
 * PRODUCTS
 */

export async function getProducts(filters = {}) {
  try {
    let query = supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('is_active', true);

    // Aplicar filtros
    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    if (filters.minPrice) {
      query = query.gte('price', filters.minPrice);
    }

    if (filters.maxPrice) {
      query = query.lte('price', filters.maxPrice);
    }

    if (filters.inStock) {
      query = query.gt('stock_quantity', 0);
    }

    // Ordenação
    const sortMap = {
      'newest': { column: 'created_at', ascending: false },
      'price-asc': { column: 'price', ascending: true },
      'price-desc': { column: 'price', ascending: false },
      'name': { column: 'name', ascending: true },
    };

    const sort = sortMap[filters.sortBy] || sortMap['newest'];
    query = query.order(sort.column, { ascending: sort.ascending });

    const { data, error } = await query;

    if (error) throw error;

    // Processar URLs das imagens
    return data.map(product => ({
      ...product,
      image_url: getProductImageUrl(product.image_url),
    }));
  } catch (error) {
    console.error('Get products error:', error);
    throw error;
  }
}

export async function getProductById(id) {
  try {
    const { data, error } = await supabase
      .from(TABLES.PRODUCTS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    return {
      ...data,
      image_url: getProductImageUrl(data.image_url),
    };
  } catch (error) {
    console.error('Get product error:', error);
    throw error;
  }
}

/**
 * CART
 */

export async function getCart() {
  try {
    // Buscar itens do carrinho com produtos relacionados
    const { data, error } = await supabase
      .from(TABLES.CART_ITEMS)
      .select(`
        *,
        product:products(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Processar para incluir image URLs
    return data.map(item => ({
      ...item,
      product: {
        ...item.product,
        image_url: getProductImageUrl(item.product.image_url),
      },
    }));
  } catch (error) {
    console.error('Get cart error:', error);
    throw error;
  }
}

export async function getCartSummary() {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) return { total_items: 0, total_price: 0, is_valid: true };

    const { data, error } = await supabase.rpc('get_cart_summary', {
      user_uuid: session.session.user.id,
    });

    if (error) throw error;

    return data && data.length > 0 ? data[0] : { total_items: 0, total_price: 0, is_valid: true };
  } catch (error) {
    console.error('Get cart summary error:', error);
    return { total_items: 0, total_price: 0, is_valid: true };
  }
}

export async function addToCart(productId, quantity = 1) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    // Verificar se já existe no carrinho
    const { data: existing } = await supabase
      .from(TABLES.CART_ITEMS)
      .select('*')
      .eq('product_id', productId)
      .single();

    if (existing) {
      // Atualizar quantidade
      const { data, error } = await supabase
        .from(TABLES.CART_ITEMS)
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Criar novo item
      const { data, error } = await supabase
        .from(TABLES.CART_ITEMS)
        .insert({
          user_id: session.session.user.id,
          product_id: productId,
          quantity,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Add to cart error:', error);
    throw error;
  }
}

export async function updateCartItem(itemId, quantity) {
  try {
    const { data, error } = await supabase
      .from(TABLES.CART_ITEMS)
      .update({ quantity })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Update cart error:', error);
    throw error;
  }
}

export async function removeFromCart(itemId) {
  try {
    const { error } = await supabase
      .from(TABLES.CART_ITEMS)
      .delete()
      .eq('id', itemId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Remove from cart error:', error);
    throw error;
  }
}

export async function clearCart() {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    const { error } = await supabase
      .from(TABLES.CART_ITEMS)
      .delete()
      .eq('user_id', session.session.user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
}

/**
 * ORDERS
 */

export async function createOrder(shippingAddress, items) {
  try {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw new Error('Not authenticated');

    // Calcular total do pedido
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.unit_price) * item.quantity);
    }, 0);

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .insert({
        user_id: session.session.user.id,
        shipping_address: shippingAddress,
        total_amount: totalAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Criar itens do pedido
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }));

    const { error: itemsError } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .insert(orderItems);

    if (itemsError) {
      // Rollback: deletar pedido se itens falharem
      await supabase.from(TABLES.ORDERS).delete().eq('id', order.id);
      throw itemsError;
    }

    // Diminuir estoque
    for (const item of items) {
      await supabase.rpc('decrease_product_stock', {
        product_uuid: item.product_id,
        quantity_to_decrease: item.quantity,
      });
    }

    return order;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
}

export async function getUserOrders() {
  try {
    const { data, error } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get orders error:', error);
    throw error;
  }
}

export async function getOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from(VIEWS.ORDER_DETAILS)
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Get order error:', error);
    throw error;
  }
}

export async function getOrderDetails(orderId) {
  try {
    // Buscar pedido com itens
    const { data: order, error: orderError } = await supabase
      .from(TABLES.ORDERS)
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError) throw orderError;

    // Buscar itens do pedido com produtos
    const { data: items, error: itemsError } = await supabase
      .from(TABLES.ORDER_ITEMS)
      .select(`
        *,
        product:products(*)
      `)
      .eq('order_id', orderId);

    if (itemsError) throw itemsError;

    // Processar URLs das imagens
    const processedItems = items.map(item => ({
      ...item,
      product: {
        ...item.product,
        image_url: getProductImageUrl(item.product.image_url),
      },
    }));

    return {
      ...order,
      items: processedItems,
    };
  } catch (error) {
    console.error('Get order details error:', error);
    throw error;
  }
}

/**
 * Formatação
 */

export function formatPrice(price) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

console.log('✅ API utilities loaded');