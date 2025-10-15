import { Response } from 'express';
import { ApiResponse, PaginatedResponse } from '../types';

/**
 * Helpers para padronizar respostas da API
 */

export const successResponse = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response<ApiResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message && { message }),
  });
};

export const errorResponse = (
  res: Response,
  error: string,
  statusCode = 400
): Response<ApiResponse> => {
  return res.status(statusCode).json({
    success: false,
    error,
  });
};

export const paginatedResponse = <T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  }
): Response<PaginatedResponse<T>> => {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return res.status(200).json({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages,
    },
  });
};

export const createdResponse = <T>(
  res: Response,
  data: T,
  message = 'Resource created successfully'
): Response<ApiResponse<T>> => {
  return successResponse(res, data, message, 201);
};

export const noContentResponse = (res: Response): Response => {
  return res.status(204).send();
};
