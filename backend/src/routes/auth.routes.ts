import { Router } from 'express';
import { authController } from '../controllers';
import { authenticate, authorize, validate } from '../middlewares';
import { registerValidation, loginValidation } from '../validators';
import { UserRole } from '../types';
import { body } from 'express-validator';

const router = Router();

/**
 * Rotas de Autenticação
 * Base: /api/auth
 */

// Rotas públicas
router.post('/register', registerValidation, validate, authController.register);

router.post('/login', loginValidation, validate, authController.login);

// Rotas autenticadas
router.get('/me', authenticate, authController.getMe);

router.put(
  '/me',
  authenticate,
  [body('full_name').optional().trim().isLength({ min: 2, max: 100 })],
  validate,
  authController.updateMe
);

// Rotas apenas para admin
router.get('/users', authenticate, authorize(UserRole.ADMIN), authController.getAllUsers);

router.patch(
  '/users/:id/promote',
  authenticate,
  authorize(UserRole.ADMIN),
  authController.promoteToAdmin
);

export default router;