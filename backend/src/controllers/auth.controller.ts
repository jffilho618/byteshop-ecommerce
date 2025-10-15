import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { authService } from '../services';
import { successResponse, createdResponse } from '../utils';

/**
 * Controller de Autenticação
 */

/**
 * POST /api/auth/register
 * Registra um novo usuário
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  const result = await authService.register({
    email,
    password,
    full_name,
  });

  return createdResponse(res, result, 'User registered successfully');
});

/**
 * POST /api/auth/login
 * Faz login de um usuário
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const result = await authService.login({ email, password });

  return successResponse(res, result, 'Login successful');
});

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const user = await authService.getUserById(userId);

  return successResponse(res, user);
});

/**
 * PUT /api/auth/me
 * Atualiza dados do usuário autenticado
 */
export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { full_name } = req.body;

  const user = await authService.updateUser(userId, { full_name });

  return successResponse(res, user, 'Profile updated successfully');
});

/**
 * GET /api/auth/users (Admin only)
 * Lista todos os usuários
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await authService.getAllUsers();

  return successResponse(res, users);
});

/**
 * PATCH /api/auth/users/:id/promote (Admin only)
 * Promove usuário para admin
 */
export const promoteToAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await authService.promoteToAdmin(id);

  return successResponse(res, user, 'User promoted to admin');
});