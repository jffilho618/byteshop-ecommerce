/**
 * Auth Utilities
 */

import { supabase, TABLES } from '../config/supabase.js';

// Chave do localStorage
const AUTH_KEY = 'byteshop_auth';

/**
 * Registra um novo usuário
 */
export async function register(data) {
  try {
    const { email, password, full_name } = data;

    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name,
        },
      },
    });

    if (authError) throw authError;

    // 2. Criar perfil do usuário usando RPC (bypassa RLS)
    const { error: profileError } = await supabase.rpc('create_user_profile', {
      user_id: authData.user.id,
      user_email: email,
      user_full_name: full_name,
      user_role: 'customer',
    });

    if (profileError) throw profileError;

    // 3. Buscar dados completos do usuário
    const { data: userData } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // 4. Salvar no localStorage
    if (userData && authData.session) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        user: userData,
        session: authData.session,
      }));
    }

    return { success: true, user: userData, session: authData.session };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Faz login
 */
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Buscar dados completos do usuário
    const { data: userData } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', data.user.id)
      .single();

    // Salvar no localStorage
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      user: userData,
      session: data.session,
    }));

    return { success: true, user: userData, session: data.session };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Faz logout
 */
export async function logout() {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem(AUTH_KEY);
    window.location.href = '/';
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Retorna o usuário autenticado
 */
export async function getCurrentUser() {
  try {
    // Verificar sessão do Supabase
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    // Buscar dados completos
    const { data: userData, error: userError } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if (userError) {
      console.error('Error fetching user data:', userError);
      // Se houver erro, logout
      await supabase.auth.signOut();
      localStorage.removeItem(AUTH_KEY);
      return null;
    }

    if (userData) {
      // Atualizar localStorage
      localStorage.setItem(AUTH_KEY, JSON.stringify({
        user: userData,
        session,
      }));
    }

    return userData;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Verifica se está autenticado
 */
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Verifica se é admin
 */
export async function isAdmin() {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Require auth - redireciona se não autenticado
 */
export async function requireAuth() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  return true;
}

/**
 * Require admin - redireciona se não for admin
 */
export async function requireAdmin() {
  const admin = await isAdmin();
  if (!admin) {
    window.location.href = '/';
    return false;
  }
  return true;
}

/**
 * Escutar mudanças na autenticação
 */
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChanged(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      const { data: userData } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', session.user.id)
        .single();

      callback({ user: userData, session });
    } else if (event === 'SIGNED_OUT') {
      localStorage.removeItem(AUTH_KEY);
      callback({ user: null, session: null });
    }
  });
}

console.log('✅ Auth utilities loaded');