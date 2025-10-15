import { Router } from 'express';
import { cartController } from '../controllers';
import { authenticate, validate } from '../middlewares';
import { addToCartValidation, updateCartItemValidation } from '../validators';

const router = Router();

/**
 * Rotas de Carrinho
 * Base: /api/cart
 * Todas as rotas requerem autenticação
 */

router.get('/', authenticate, cartController.getCart);

router.get('/summary', authenticate, cartController.getCartSummary);

router.post('/', authenticate, addToCartValidation, validate, cartController.addToCart);

router.put(
  '/:itemId',
  authenticate,
  updateCartItemValidation,
  validate,
  cartController.updateCartItem
);

router.delete('/:itemId', authenticate, cartController.removeFromCart);

router.delete('/', authenticate, cartController.clearCart);

export default router;