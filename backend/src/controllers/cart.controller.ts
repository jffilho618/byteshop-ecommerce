import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { cartService } from '../services';
import { successResponse, createdResponse, noContentResponse } from '../utils';

/**
 * Controller de Carrinho
 */

/**
 * GET /api/cart
 * Busca carrinho do usuário autenticado
 */
export const getCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const cart = await cartService.getUserCart(userId);

  return successResponse(res, cart);
});

/**
 * GET /api/cart/summary
 * Busca resumo do carrinho (total, quantidade, validade)
 */
export const getCartSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const summary = await cartService.getCartSummary(userId);

  return successResponse(res, summary);
});

/**
 * POST /api/cart
 * Adiciona produto ao carrinho
 */
export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { product_id, quantity } = req.body;

  const cartItem = await cartService.addToCart(userId, { product_id, quantity });

  return createdResponse(res, cartItem, 'Product added to cart');
});

/**
 * PUT /api/cart/:itemId
 * Atualiza quantidade de um item do carrinho
 */
export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cartItem = await cartService.updateCartItem(userId, itemId, quantity);

  return successResponse(res, cartItem, 'Cart item updated');
});

/**
 * DELETE /api/cart/:itemId
 * Remove item do carrinho
 */
export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { itemId } = req.params;

  await cartService.removeFromCart(userId, itemId);

  return noContentResponse(res);
});

/**
 * DELETE /api/cart
 * Limpa todo o carrinho
 */
export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  await cartService.clearCart(userId);

  return noContentResponse(res);
});