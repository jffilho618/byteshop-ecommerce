/**
 * Storage utilities for product images
 */

import { supabase } from '../config/supabase.js';

// Configurações do storage
const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Valida arquivo de imagem
 */
export function validateImageFile(file) {
  const errors = [];

  // Verificar se é um arquivo
  if (!file) {
    errors.push('Nenhum arquivo selecionado');
    return errors;
  }

  // Verificar tipo
  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push('Formato não suportado. Use: JPG, PNG ou WebP');
  }

  // Verificar tamanho
  if (file.size > MAX_FILE_SIZE) {
    errors.push('Arquivo muito grande. Máximo: 5MB');
  }

  return errors;
}

/**
 * Upload de imagem de produto
 */
export async function uploadProductImage(file, category, productName) {
  try {
    // Validar arquivo
    const validationErrors = validateImageFile(file);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const sanitizedProductName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 30);

    const fileName = `${sanitizedProductName}-${timestamp}-${randomString}.${fileExtension}`;
    const filePath = `${category}/${fileName}`;

    console.log('📤 [UPLOAD] Iniciando upload:', { fileName, filePath, size: file.size });

    // Upload do arquivo
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Não sobrescrever se já existir
    });

    if (error) {
      console.error('❌ [UPLOAD] Erro:', error);
      throw error;
    }

    console.log('✅ [UPLOAD] Sucesso:', data);

    // Gerar URL pública
    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);

    return {
      path: filePath,
      url: urlData.publicUrl,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw new Error(`Erro no upload: ${error.message}`);
  }
}

/**
 * Deletar imagem de produto
 */
export async function deleteProductImage(imagePath) {
  try {
    if (!imagePath) return true;

    // Extrair path da URL se necessário
    const path = imagePath.includes('product-images/')
      ? imagePath.split('product-images/')[1]
      : imagePath;

    console.log('🗑️ [DELETE] Deletando imagem:', path);

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

    if (error) {
      console.error('❌ [DELETE] Erro:', error);
      // Não lançar erro - a imagem pode já ter sido deletada
      return false;
    }

    console.log('✅ [DELETE] Imagem deletada');
    return true;
  } catch (error) {
    console.error('Delete image error:', error);
    return false;
  }
}

/**
 * Atualizar imagem de produto (deletar antiga e enviar nova)
 */
export async function updateProductImage(file, category, productName, oldImagePath = null) {
  try {
    // Upload da nova imagem
    const uploadResult = await uploadProductImage(file, category, productName);

    // Deletar imagem antiga se existir
    if (oldImagePath) {
      await deleteProductImage(oldImagePath);
    }

    return uploadResult;
  } catch (error) {
    console.error('Update product image error:', error);
    throw error;
  }
}

/**
 * Gerar URL de visualização (para preview)
 */
export function getProductImageUrl(imagePath) {
  if (!imagePath) return '/assets/images/product-placeholder.jpg';

  // Se já é uma URL completa, retornar
  if (imagePath.startsWith('http')) return imagePath;

  // Se é apenas o path, gerar URL pública
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(imagePath);

  return data.publicUrl;
}

/**
 * Preview de imagem antes do upload
 */
export function createImagePreview(file, previewElementId) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const previewElement = document.getElementById(previewElementId);
      if (previewElement) {
        previewElement.src = e.target.result;
        previewElement.style.display = 'block';
      }
      resolve(e.target.result);
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsDataURL(file);
  });
}
