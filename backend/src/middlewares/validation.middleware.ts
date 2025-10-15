import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './error.middleware';

/**
 * Middleware para validar os resultados do express-validator
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors
      .array()
      .map((error) => `${error.type === 'field' ? error.path : 'field'}: ${error.msg}`)
      .join(', ');

    throw new AppError(400, `Validation error: ${errorMessages}`);
  }

  next();
};

/**
 * Helper para executar validações em sequência
 */
export const runValidations = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      await validation.run(req);
    }
    next();
  };
};
