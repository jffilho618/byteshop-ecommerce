import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Validação de variáveis de ambiente
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Cliente Supabase com chave anônima (para operações normais)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Cliente Supabase com Service Role Key (para operações administrativas)
// Bypass RLS - usar com cuidado!
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Tipos de tabelas do banco de dados
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CART_ITEMS: 'cart_items',
} as const;

// Views do banco de dados
export const VIEWS = {
  PRODUCT_INVENTORY: 'product_inventory_view',
  ORDER_DETAILS: 'order_details_view',
  USER_ORDER_HISTORY: 'user_order_history_view',
  CART_WITH_PRODUCTS: 'cart_with_products_view',
  SALES_DASHBOARD: 'sales_dashboard_view',
  CATEGORY_SUMMARY: 'category_summary_view',
  LOW_STOCK_PRODUCTS: 'low_stock_products_view',
  PRODUCTS_WITH_IMAGES: 'products_with_images_view',
} as const;

// Functions do banco de dados
export const FUNCTIONS = {
  CALCULATE_ORDER_TOTAL: 'calculate_order_total',
  UPDATE_ORDER_STATUS: 'update_order_status',
  CHECK_PRODUCT_AVAILABILITY: 'check_product_availability',
} as const;
