import { supabaseAdmin } from '../config/supabase';
import { ProductCategory } from '../types';

/**
 * Helpers para gerenciamento de Storage (Supabase)
 */

const BUCKET_NAME = 'product-images';

export interface UploadResult {
  path: string;
  fullUrl: string;
}

/**
 * Faz upload de uma imagem para o bucket
 */
export const uploadProductImage = async (
  file: Buffer,
  fileName: string,
  category: ProductCategory,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> => {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${category}/${timestamp}_${sanitizedName}`;

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  const fullUrl = getPublicUrl(data.path);

  return {
    path: data.path,
    fullUrl,
  };
};

/**
 * Gera URL pública de uma imagem
 */
export const getPublicUrl = (path: string): string => {
  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(path);

  return publicUrl;
};

/**
 * Deleta uma imagem do bucket
 */
export const deleteProductImage = async (path: string): Promise<void> => {
  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
};

/**
 * Deleta múltiplas imagens
 */
export const deleteProductImages = async (paths: string[]): Promise<void> => {
  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove(paths);

  if (error) {
    throw new Error(`Failed to delete images: ${error.message}`);
  }
};

/**
 * Lista todas as imagens de uma categoria
 */
export const listCategoryImages = async (category: ProductCategory) => {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .list(category, {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    });

  if (error) {
    throw new Error(`Failed to list images: ${error.message}`);
  }

  return data.map((file) => ({
    name: file.name,
    path: `${category}/${file.name}`,
    fullUrl: getPublicUrl(`${category}/${file.name}`),
    size: file.metadata?.size,
    createdAt: file.created_at,
  }));
};

/**
 * Valida tipo de arquivo
 */
export const isValidImageType = (mimeType: string): boolean => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  return allowedTypes.includes(mimeType.toLowerCase());
};

/**
 * Valida tamanho do arquivo (5MB máximo)
 */
export const isValidImageSize = (sizeInBytes: number): boolean => {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  return sizeInBytes <= MAX_SIZE;
};

/**
 * Extrai path relativo de uma URL completa
 */
export const extractPathFromUrl = (url: string): string | null => {
  const match = url.match(/\/product-images\/(.+)$/);
  return match ? match[1] : null;
};
