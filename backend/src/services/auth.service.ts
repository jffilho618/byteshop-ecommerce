import { supabase, supabaseAdmin, TABLES } from '../config/supabase';
import { AppError } from '../middlewares';
import { User, UserRole } from '../types';

/**
 * Service de Autenticação
 * Gerencia registro, login e operações de usuário
 */

export interface RegisterDTO {
  email: string;
  password: string;
  full_name: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

/**
 * Registra um novo usuário
 */
export const register = async (data: RegisterDTO): Promise<AuthResponse> => {
  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        full_name: data.full_name,
      },
    },
  });

  if (authError || !authData.user) {
    throw new AppError(400, authError?.message || 'Failed to create user');
  }

  // 2. Criar registro na tabela users (via trigger ou manual)
  // O Supabase Auth cria automaticamente, mas vamos garantir os dados extras
  const { data: userData, error: userError } = await supabaseAdmin
    .from(TABLES.USERS)
    .insert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      role: UserRole.CUSTOMER, // Novo usuário sempre é customer
    })
    .select()
    .single();

  if (userError) {
    // Se falhar, deletar usuário do Auth para manter consistência
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    throw new AppError(500, 'Failed to create user profile');
  }

  // 3. Retornar token e dados do usuário
  return {
    user: userData,
    token: authData.session?.access_token || '',
  };
};

/**
 * Faz login de um usuário
 */
export const login = async (data: LoginDTO): Promise<AuthResponse> => {
  // 1. Autenticar com Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (authError || !authData.user) {
    throw new AppError(401, 'Invalid credentials');
  }

  // 2. Buscar dados completos do usuário
  const { data: userData, error: userError } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (userError || !userData) {
    throw new AppError(404, 'User profile not found');
  }

  // 3. Retornar token e dados
  return {
    user: userData,
    token: authData.session?.access_token || '',
  };
};

/**
 * Busca dados de um usuário por ID
 */
export const getUserById = async (userId: string): Promise<User> => {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new AppError(404, 'User not found');
  }

  return data;
};

/**
 * Atualiza dados de um usuário (sem role)
 */
export const updateUser = async (
  userId: string,
  updates: { full_name?: string }
): Promise<User> => {
  const { data, error } = await supabase
    .from(TABLES.USERS)
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new AppError(400, error.message);
  }

  return data;
};

/**
 * Promove um usuário para admin (apenas admin pode fazer)
 */
export const promoteToAdmin = async (userId: string): Promise<User> => {
  const { data, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .update({ role: UserRole.ADMIN })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new AppError(400, error.message);
  }

  return data;
};

/**
 * Lista todos os usuários (apenas admin)
 */
export const getAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabaseAdmin.from(TABLES.USERS).select('*').order('created_at', { ascending: false });

  if (error) {
    throw new AppError(500, error.message);
  }

  return data || [];
};