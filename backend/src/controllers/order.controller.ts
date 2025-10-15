import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares';
import { orderService } from '../services';
import { successResponse, createdResponse } from '../utils';
import { OrderFilters, OrderStatus } from '../types';

/**
 * Controller de Pedidos
 */

/**
 * POST /api/orders
 * Cria um novo pedido
 */
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { shipping_address, items } = req.body;

  const order = await orderService.createOrder(userId, {
    shipping_address,
    items,
  });

  return createdResponse(res, order, 'Order created successfully');
});

/**
 * GET /api/orders
 * Lista pedidos do usuário autenticado
 */
export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const filters: OrderFilters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    status: req.query.status as OrderStatus,
    start_date: req.query.start_date as string,
    end_date: req.query.end_date as string,
  };

  const result = await orderService.getUserOrders(userId, filters);

  return res.status(200).json(result);
});

/**
 * GET /api/orders/all (Admin only)
 * Lista todos os pedidos
 */
export const getAllOrders = asyncHandler(async (req: Request, res: Response) => {
  const filters: OrderFilters = {
    page: req.query.page ? parseInt(req.query.page as string) : undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    user_id: req.query.user_id as string,
    status: req.query.status as OrderStatus,
    start_date: req.query.start_date as string,
    end_date: req.query.end_date as string,
  };

  const result = await orderService.getAllOrders(filters);

  return res.status(200).json(result);
});

/**
 * GET /api/orders/:id
 * Busca um pedido por ID
 */
export const getOrderById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.role === 'admin' ? undefined : req.user!.userId;

  const order = await orderService.getOrderById(id, userId);

  return successResponse(res, order);
});

/**
 * PATCH /api/orders/:id/status (Admin only)
 * Atualiza status de um pedido
 */
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  const order = await orderService.updateOrderStatus(id, status as OrderStatus);

  return successResponse(res, order, 'Order status updated successfully');
});

/**
 * GET /api/orders/dashboard/sales (Admin only)
 * Busca dashboard de vendas
 */
export const getSalesDashboard = asyncHandler(async (req: Request, res: Response) => {
  const startDate = req.query.start_date as string;
  const endDate = req.query.end_date as string;

  const data = await orderService.getSalesDashboard(startDate, endDate);

  return successResponse(res, data);
});

/**
 * GET /api/orders/dashboard/customers (Admin only)
 * Busca histórico de clientes
 */
export const getCustomerHistory = asyncHandler(async (req: Request, res: Response) => {
  const data = await orderService.getUserOrderHistory();

  return successResponse(res, data);
});