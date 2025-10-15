import { Router } from 'express';
import { orderController } from '../controllers';
import { authenticate, authorize, validate } from '../middlewares';
import { createOrderValidation, updateOrderStatusValidation, orderFiltersValidation } from '../validators';
import { UserRole } from '../types';

const router = Router();

/**
 * Rotas de Pedidos
 * Base: /api/orders
 * Todas as rotas requerem autenticação
 */

router.post('/', authenticate, createOrderValidation, validate, orderController.createOrder);

router.get('/', authenticate, orderFiltersValidation, validate, orderController.getUserOrders);

router.get('/:id', authenticate, orderController.getOrderById);

// Rotas apenas para admin
router.get(
  '/all',
  authenticate,
  authorize(UserRole.ADMIN),
  orderFiltersValidation,
  validate,
  orderController.getAllOrders
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(UserRole.ADMIN),
  updateOrderStatusValidation,
  validate,
  orderController.updateOrderStatus
);

router.get(
  '/dashboard/sales',
  authenticate,
  authorize(UserRole.ADMIN),
  orderController.getSalesDashboard
);

router.get(
  '/dashboard/customers',
  authenticate,
  authorize(UserRole.ADMIN),
  orderController.getCustomerHistory
);

export default router;