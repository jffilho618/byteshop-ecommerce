import { supabase, supabaseAdmin, TABLES, VIEWS } from '../config/supabase';
import { AppError } from '../middlewares';
import {
  Product,
  CreateProductDTO,
  UpdateProductDTO,
  ProductFilters,
  PaginatedResponse,
} from '../types';
import { calculatePagination, buildSearchQuery } from '../utils';

/**
 * Service de Produtos
 * Gerencia CRUD e buscas de produtos
 */

/**
 * Lista produtos com filtros e paginação
 */
export const getProducts = async (
  filters: ProductFilters
): Promise<PaginatedResponse<Product>> => {
  const { page, limit, offset } = calculatePagination(filters);

  // Query base
  let query = supabase
    .from(TABLES.PRODUCTS)
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  // Aplicar filtros
  if (filters.category) {
    query = query.eq('category', filters.category);
  }

  if (filters.min_price) {
    query = query.gte('price', filters.min_price);
  }

  if (filters.max_price) {
    query = query.lte('price', filters.max_price);
  }

  if (filters.search) {
    const searchTerm = buildSearchQuery(filters.search);
    query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
  }

  if (filters.in_stock) {
    query = query.gt('stock_quantity', 0);
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
 * Busca um produto por ID
 */
export const getProductById = async (id: string): Promise<Product> => {
  const { data, error } = await supabase
    .from(TABLES.PRODUCTS)
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    throw new AppError(404, 'Product not found');
  }

  return data;
};

/**
 * Cria um novo produto (admin only)
 */
export const createProduct = async (productData: CreateProductDTO): Promise<Product> => {
  const { data, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .insert(productData)
    .select()
    .single();

  if (error) {
    throw new AppError(400, error.message);
  }

  return data;
};

/**
 * Atualiza um produto (admin only)
 */
export const updateProduct = async (
  id: string,
  updates: UpdateProductDTO
): Promise<Product> => {
  // Verificar se produto existe
  await getProductById(id);

  const { data, error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new AppError(400, error.message);
  }

  return data;
};

/**
 * Deleta um produto (admin only)
 * Soft delete: apenas marca como inativo
 */
export const deleteProduct = async (id: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from(TABLES.PRODUCTS)
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw new AppError(400, error.message);
  }
};

/**
 * Busca produtos com estatísticas de inventário (admin)
 */
export const getProductInventory = async () => {
  const { data, error } = await supabaseAdmin
    .from(VIEWS.PRODUCT_INVENTORY)
    .select('*')
    .order('total_sold', { ascending: false });

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};

/**
 * Busca produtos com estoque baixo (admin)
 */
export const getLowStockProducts = async () => {
  const { data, error } = await supabaseAdmin
    .from(VIEWS.LOW_STOCK_PRODUCTS)
    .select('*');

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};

/**
 * Verifica disponibilidade de produto
 */
export const checkAvailability = async (
  productId: string,
  quantity: number
): Promise<boolean> => {
  const { data, error } = await supabase.rpc(
    'check_product_availability',
    {
      product_uuid: productId,
      required_quantity: quantity,
    }
  );

  if (error) {
    throw new AppError(500, error.message);
  }

  return data as boolean;
};

/**
 * Busca resumo por categoria (admin)
 */
export const getCategorySummary = async () => {
  const { data, error } = await supabaseAdmin
    .from(VIEWS.CATEGORY_SUMMARY)
    .select('*');

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};