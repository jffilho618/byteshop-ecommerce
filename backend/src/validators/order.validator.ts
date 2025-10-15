import { body, query } from 'express-validator';
import { OrderStatus } from '../types';

export const createOrderValidation = [
  body('shipping_address')
    .trim()
    .notEmpty()
    .withMessage('Shipping address is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Shipping address must be between 10 and 500 characters'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.product_id')
    .notEmpty()
    .withMessage('Product ID is required')
    .isUUID()
    .withMessage('Invalid product ID format'),

  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100'),
];

export const updateOrderStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid order status'),
];

export const orderFiltersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid order status'),

  query('user_id')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID format'),

  query('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),

  query('end_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format'),
];
