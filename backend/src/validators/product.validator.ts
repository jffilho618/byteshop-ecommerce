import { body, query } from 'express-validator';
import { ProductCategory } from '../types';

export const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),

  body('stock_quantity')
    .notEmpty()
    .withMessage('Stock quantity is required')
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),

  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(Object.values(ProductCategory))
    .withMessage('Invalid product category'),

  body('image_url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be an object'),
];

export const updateProductValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),

  body('stock_quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stock quantity must be a non-negative integer'),

  body('category')
    .optional()
    .isIn(Object.values(ProductCategory))
    .withMessage('Invalid product category'),

  body('image_url')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean'),

  body('specifications')
    .optional()
    .isObject()
    .withMessage('Specifications must be an object'),
];

export const productFiltersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('category')
    .optional()
    .isIn(Object.values(ProductCategory))
    .withMessage('Invalid product category'),

  query('min_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Min price must be a non-negative number'),

  query('max_price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Max price must be a non-negative number'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('in_stock')
    .optional()
    .isBoolean()
    .withMessage('in_stock must be a boolean'),
];
