import { Router } from 'express';
import { productController } from '../controllers';
import { authenticate, authorize, validate, optionalAuth } from '../middlewares';
import {
  createProductValidation,
  updateProductValidation,
  productFiltersValidation,
} from '../validators';
import { UserRole } from '../types';

const router = Router();

/**
 * Rotas de Produtos
 * Base: /api/products
 */

// Rotas públicas (ou com auth opcional)
router.get('/', productFiltersValidation, validate, optionalAuth, productController.getProducts);

router.get('/:id', productController.getProductById);

// Rotas apenas para admin
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN),
  createProductValidation,
  validate,
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  updateProductValidation,
  validate,
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN),
  productController.deleteProduct
);

// Rotas de estatísticas (admin only)
router.get(
  '/inventory/stats',
  authenticate,
  authorize(UserRole.ADMIN),
  productController.getInventoryStats
);

router.get(
  '/inventory/low-stock',
  authenticate,
  authorize(UserRole.ADMIN),
  productController.getLowStock
);

router.get(
  '/categories/summary',
  authenticate,
  authorize(UserRole.ADMIN),
  productController.getCategorySummary
);

export default router;