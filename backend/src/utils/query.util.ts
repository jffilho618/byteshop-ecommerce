import { PaginationParams } from '../types';

/**
 * Helpers para queries e paginação
 */

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface PaginationResult {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Calcula valores de paginação
 */
export const calculatePagination = (params: PaginationParams): PaginationResult => {
  const page = Math.max(1, params.page || DEFAULT_PAGE);
  const limit = Math.min(params.limit || DEFAULT_LIMIT, MAX_LIMIT);
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Sanitiza string de busca para evitar SQL injection
 */
export const sanitizeSearchTerm = (term: string): string => {
  return term.trim().replace(/[%_]/g, '\\$&');
};

/**
 * Constrói query de busca com ILIKE para PostgreSQL
 */
export const buildSearchQuery = (term: string): string => {
  const sanitized = sanitizeSearchTerm(term);
  return `%${sanitized}%`;
};

/**
 * Valida e converte número positivo
 */
export const parsePositiveNumber = (value: any, defaultValue: number): number => {
  const parsed = parseFloat(value);
  return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
};

/**
 * Valida e converte booleano
 */
export const parseBoolean = (value: any): boolean | undefined => {
  if (value === 'true' || value === true) return true;
  if (value === 'false' || value === false) return false;
  return undefined;
};
