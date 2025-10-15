import { supabase, TABLES, VIEWS } from '../config/supabase';
import { AppError } from '../middlewares';
import { CartItem, AddToCartDTO } from '../types';
import { checkAvailability } from './product.service';

/**
 * Service de Carrinho
 * Gerencia itens do carrinho de compras
 */

interface CartItemWithProduct extends CartItem {
  product: {
    name: string;
    price: number;
    image_url: string;
    stock_quantity: number;
  };
}

/**
 * Busca carrinho do usuário com detalhes dos produtos
 */
export const getUserCart = async (userId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from(VIEWS.CART_WITH_PRODUCTS)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};

/**
 * Busca resumo do carrinho (total de itens, preço total, validade)
 */
export const getCartSummary = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_cart_summary', {
    user_uuid: userId,
  });

  if (error) {
    throw new AppError(500, error.message);
  }

  // data retorna array com 1 objeto
  return data && data.length > 0 ? data[0] : {
    total_items: 0,
    total_price: 0,
    is_valid: true,
  };
};

/**
 * Adiciona produto ao carrinho
 */
export const addToCart = async (
  userId: string,
  data: AddToCartDTO
): Promise<CartItem> => {
  // 1. Verificar disponibilidade do produto
  const isAvailable = await checkAvailability(data.product_id, data.quantity);

  if (!isAvailable) {
    throw new AppError(400, 'Product not available in requested quantity');
  }

  // 2. Verificar se já existe no carrinho
  const { data: existing } = await supabase
    .from(TABLES.CART_ITEMS)
    .select('*')
    .eq('user_id', userId)
    .eq('product_id', data.product_id)
    .single();

  // 3. Se já existe, atualizar quantidade
  if (existing) {
    const newQuantity = existing.quantity + data.quantity;

    // Verificar disponibilidade da nova quantidade
    const isNewQuantityAvailable = await checkAvailability(data.product_id, newQuantity);

    if (!isNewQuantityAvailable) {
      throw new AppError(400, 'Product not available in requested total quantity');
    }

    const { data: updated, error: updateError } = await supabase
      .from(TABLES.CART_ITEMS)
      .update({ quantity: newQuantity })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      throw new AppError(400, updateError.message);
    }

    return updated;
  }

  // 4. Se não existe, criar novo item
  const { data: newItem, error: insertError } = await supabase
    .from(TABLES.CART_ITEMS)
    .insert({
      user_id: userId,
      product_id: data.product_id,
      quantity: data.quantity,
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError(400, insertError.message);
  }

  return newItem;
};

/**
 * Atualiza quantidade de um item do carrinho
 */
export const updateCartItem = async (
  userId: string,
  itemId: string,
  quantity: number
): Promise<CartItem> => {
  // 1. Buscar item e verificar se pertence ao usuário
  const { data: item, error: fetchError } = await supabase
    .from(TABLES.CART_ITEMS)
    .select('*')
    .eq('id', itemId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !item) {
    throw new AppError(404, 'Cart item not found');
  }

  // 2. Verificar disponibilidade
  const isAvailable = await checkAvailability(item.product_id, quantity);

  if (!isAvailable) {
    throw new AppError(400, 'Product not available in requested quantity');
  }

  // 3. Atualizar quantidade
  const { data: updated, error: updateError } = await supabase
    .from(TABLES.CART_ITEMS)
    .update({ quantity })
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(400, updateError.message);
  }

  return updated;
};

/**
 * Remove item do carrinho
 */
export const removeFromCart = async (userId: string, itemId: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.CART_ITEMS)
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    throw new AppError(400, error.message);
  }
};

/**
 * Limpa todo o carrinho do usuário
 */
export const clearCart = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from(TABLES.CART_ITEMS)
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new AppError(400, error.message);
  }
};