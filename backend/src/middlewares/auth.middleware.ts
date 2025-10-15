import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AppError } from './error.middleware';
import { UserRole, AuthPayload } from '../types';

// Estende o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Middleware de autenticação
 * Verifica o token JWT no header Authorization
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Verifica o token com Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new AppError(401, 'Invalid or expired token');
    }

    // Busca informações adicionais do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      throw new AppError(401, 'User not found');
    }

    // Adiciona informações do usuário no request
    req.user = {
      userId: user.id,
      email: user.email!,
      role: userData.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de autorização baseado em role
 * Uso: authorize(UserRole.ADMIN)
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, 'You do not have permission to perform this action')
      );
    }

    next();
  };
};

/**
 * Middleware opcional de autenticação
 * Não retorna erro se não houver token, apenas não adiciona user ao request
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);

    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData) {
        req.user = {
          userId: user.id,
          email: user.email!,
          role: userData.role as UserRole,
        };
      }
    }

    next();
  } catch (error) {
    // Em caso de erro, continua sem autenticação
    next();
  }
};
