// ============================================
// TYPES E INTERFACES DO BYTESHOP
// ============================================

// -------------------- USER TYPES --------------------
export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

// -------------------- PRODUCT TYPES --------------------
export enum ProductCategory {
  LAPTOPS = 'laptops',
  SMARTPHONES = 'smartphones',
  TABLETS = 'tablets',
  ACCESSORIES = 'accessories',
  COMPONENTS = 'components',
  PERIPHERALS = 'peripherals',
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: ProductCategory;
  image_url?: string;
  specifications?: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductDTO {
  name: string;
  description: string;
  price: number;
  stock_quantity: number;
  category: ProductCategory;
  image_url?: string;
  specifications?: Record<string, any>;
}

export interface UpdateProductDTO extends Partial<CreateProductDTO> {
  is_active?: boolean;
}

// -------------------- ORDER TYPES --------------------
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: OrderStatus;
  shipping_address: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface CreateOrderDTO {
  shipping_address: string;
  items: {
    product_id: string;
    quantity: number;
  }[];
}

// -------------------- CART TYPES --------------------
export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface AddToCartDTO {
  product_id: string;
  quantity: number;
}

// -------------------- API RESPONSE TYPES --------------------
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// -------------------- FILTER TYPES --------------------
export interface ProductFilters extends PaginationParams {
  category?: ProductCategory;
  min_price?: number;
  max_price?: number;
  search?: string;
  in_stock?: boolean;
}

export interface OrderFilters extends PaginationParams {
  status?: OrderStatus;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}
