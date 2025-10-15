/**
 * Configuração do Supabase Client
 */

// Importar Supabase do CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Configurações do Supabase
const SUPABASE_URL = 'https://cliihgjajttoulpsrxzh.supabase.co'; // Substituir pela URL do projeto
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsaWloZ2phanR0b3VscHNyeHpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NzkxNTYsImV4cCI6MjA3NjA1NTE1Nn0.Gvftggy8YB82pQeA9dOmWR7-45R7Zscw4Ef5b42Q9_c'; // Substituir pela chave anônima

// Criar cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Tabelas
export const TABLES = {
  USERS: 'users',
  PRODUCTS: 'products',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  CART_ITEMS: 'cart_items',
};

// Views
export const VIEWS = {
  PRODUCT_INVENTORY: 'product_inventory_view',
  ORDER_DETAILS: 'order_details_view',
  CART_WITH_PRODUCTS: 'cart_with_products_view',
};

// Storage
export const STORAGE = {
  PRODUCT_IMAGES: 'product-images',
};

// Helper para gerar URL pública de imagem
export function getProductImageUrl(path) {
  if (!path) return '/assets/placeholder-product.png';
  if (path.startsWith('http')) return path;

  const { data } = supabase.storage.from(STORAGE.PRODUCT_IMAGES).getPublicUrl(path);

  return data.publicUrl || '/assets/placeholder-product.png';
}

console.log('✅ Supabase client initialized');
