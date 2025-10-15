import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { isDevelopment } from '../config/env';

// Classe customizada de erro
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// Middleware de tratamento de erros
export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let isOperational = false;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // Log do erro no console (em desenvolvimento mostra stack trace)
  if (isDevelopment) {
    console.error('Error:', {
      statusCode,
      message,
      stack: error.stack,
      path: req.path,
      method: req.method,
    });
  } else {
    console.error('Error:', { statusCode, message, path: req.path });
  }

  // Resposta ao cliente
  const response: ApiResponse = {
    success: false,
    error: message,
    ...(isDevelopment && !isOperational && { stack: error.stack }),
  };

  res.status(statusCode).json(response);
};

// Middleware para rotas não encontradas
export const notFoundHandler = (req: Request, res: Response<ApiResponse>) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
};

// Async handler para evitar try-catch em todos os controllers
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
