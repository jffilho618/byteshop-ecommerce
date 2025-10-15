import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { productService } from '../services';
import { successResponse, createdResponse, noContentResponse } from '../utils';
import { ProductFilters } from '../types';

/**
 * Controller de Produtos
 */

/**
 * GET /api/products
 * Lista produtos com filtros e paginação
 */
export const getProducts = asyncHandler(async (req: Request, res: Response) => {
  const filters: ProductFilters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    category: req.query.category as any,
    min_price: req.query.min_price ? parseFloat(req.query.min_price as string) : undefined,
    max_price: req.query.max_price ? parseFloat(req.query.max_price as string) : undefined,
    search: req.query.search as string,
    in_stock: req.query.in_stock === 'true',
  };

  const result = await productService.getProducts(filters);

  return res.status(200).json(result);
});

/**
 * GET /api/products/:id
 * Busca um produto por ID
 */
export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await productService.getProductById(id);

  return successResponse(res, product);
});

/**
 * POST /api/products (Admin only)
 * Cria um novo produto
 */
export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const productData = req.body;

  const product = await productService.createProduct(productData);

  return createdResponse(res, product, 'Product created successfully');
});

/**
 * PUT /api/products/:id (Admin only)
 * Atualiza um produto
 */
export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  const product = await productService.updateProduct(id, updates);

  return successResponse(res, product, 'Product updated successfully');
});

/**
 * DELETE /api/products/:id (Admin only)
 * Deleta um produto (soft delete)
 */
export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await productService.deleteProduct(id);

  return noContentResponse(res);
});

/**
 * GET /api/products/inventory/stats (Admin only)
 * Busca estatísticas de inventário
 */
export const getInventoryStats = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.getProductInventory();

  return successResponse(res, data);
});

/**
 * GET /api/products/inventory/low-stock (Admin only)
 * Busca produtos com estoque baixo
 */
export const getLowStock = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.getLowStockProducts();

  return successResponse(res, data);
});

/**
 * GET /api/products/categories/summary (Admin only)
 * Busca resumo por categoria
 */
export const getCategorySummary = asyncHandler(async (req: Request, res: Response) => {
  const data = await productService.getCategorySummary();

  return successResponse(res, data);
});