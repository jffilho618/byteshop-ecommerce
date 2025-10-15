# Storage Guide - ByteShop

## 📦 Supabase Storage - Imagens de Produtos

Este guia explica como funciona o armazenamento de imagens de produtos no ByteShop usando Supabase Storage.

---

## 🗂️ Estrutura do Bucket

### Bucket: `product-images`

**Configuração:**
- 🌍 **Público** - Imagens acessíveis via URL
- 📏 **Limite:** 5MB por arquivo
- 🎨 **Formatos:** JPG, JPEG, PNG, WebP, GIF

**Estrutura de pastas:**
```
product-images/
├── laptops/
│   ├── macbook-pro-m3.jpg
│   └── dell-xps-15.png
├── smartphones/
│   ├── iphone-15-pro.jpg
│   └── samsung-s24.png
├── tablets/
├── accessories/
├── components/
└── peripherals/
```

---

## 🔐 Políticas de Segurança (RLS)

### ✅ Leitura (SELECT) - Público
- **Quem:** Todos (authenticated + anon)
- **O que:** Ver/baixar imagens

### ✅ Upload (INSERT) - Admin Only
- **Quem:** Apenas administradores
- **O que:** Fazer upload de novas imagens

### ✅ Atualização (UPDATE) - Admin Only
- **Quem:** Apenas administradores
- **O que:** Substituir imagens existentes

### ✅ Exclusão (DELETE) - Admin Only
- **Quem:** Apenas administradores
- **O que:** Deletar imagens

---

## 🚀 Como Usar

### 1️⃣ Executar Migration

No Supabase SQL Editor:

```sql
-- Execute o arquivo:
supabase/migrations/004_storage_bucket.sql
```

Isso criará:
- ✅ Bucket `product-images`
- ✅ 4 Políticas RLS
- ✅ Functions helper
- ✅ Trigger de validação
- ✅ View `products_with_images_view`

---

### 2️⃣ Upload de Imagem (Frontend/Backend)

#### Via JavaScript/TypeScript (Frontend)

```typescript
import { supabase } from './supabaseClient';

// Upload de arquivo
const uploadProductImage = async (file: File, category: string) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${category}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  // Retorna o path para salvar no produto
  return data.path; // Ex: "laptops/1234567890.jpg"
};
```

#### Via Node.js (Backend)

```typescript
import { supabaseAdmin } from './config/supabase';
import fs from 'fs';

const uploadProductImage = async (
  filePath: string,
  category: string,
  originalName: string
) => {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `${category}/${Date.now()}_${originalName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('product-images')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      cacheControl: '3600'
    });

  if (error) throw error;
  return data.path;
};
```

---

### 3️⃣ Salvar URL no Produto

```typescript
// Após upload, salvar path no produto
const { data, error } = await supabase
  .from('products')
  .update({
    image_url: 'laptops/1234567890.jpg' // Path do storage
  })
  .eq('id', productId);
```

---

### 4️⃣ Buscar Produtos com URLs Completas

#### Opção 1: Usar a View

```typescript
// A view converte automaticamente para URL completa
const { data: products } = await supabase
  .from('products_with_images_view')
  .select('*')
  .eq('category', 'laptops');

// products[0].full_image_url =
// "https://xxx.supabase.co/storage/v1/object/public/product-images/laptops/1234567890.jpg"
```

#### Opção 2: Gerar URL Manualmente

```typescript
const getPublicUrl = (path: string) => {
  const { data } = supabase.storage
    .from('product-images')
    .getPublicUrl(path);

  return data.publicUrl;
};

// Uso:
const imageUrl = getPublicUrl('laptops/1234567890.jpg');
```

---

### 5️⃣ Deletar Imagem (Admin)

```typescript
const deleteProductImage = async (imagePath: string) => {
  const { error } = await supabaseAdmin.storage
    .from('product-images')
    .remove([imagePath]);

  if (error) throw error;
};

// Uso:
await deleteProductImage('laptops/1234567890.jpg');
```

---

## 🎯 Fluxo Completo - Criar Produto com Imagem

### Backend Service

```typescript
// backend/src/services/product.service.ts

export const createProductWithImage = async (
  productData: CreateProductDTO,
  imageFile?: Express.Multer.File
) => {
  let imagePath: string | undefined;

  // 1. Upload da imagem (se fornecida)
  if (imageFile) {
    const fileName = `${productData.category}/${Date.now()}_${imageFile.originalname}`;

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(fileName, imageFile.buffer, {
        contentType: imageFile.mimetype,
        cacheControl: '3600'
      });

    if (uploadError) throw new AppError(500, 'Failed to upload image');
    imagePath = uploadData.path;
  }

  // 2. Criar produto no banco
  const { data: product, error } = await supabase
    .from('products')
    .insert({
      ...productData,
      image_url: imagePath
    })
    .select()
    .single();

  if (error) {
    // Rollback: deletar imagem se produto falhar
    if (imagePath) {
      await supabaseAdmin.storage
        .from('product-images')
        .remove([imagePath]);
    }
    throw new AppError(500, 'Failed to create product');
  }

  return product;
};
```

---

## 📏 Validações Automáticas

O bucket tem **validação automática** via trigger:

✅ **Extensão:** Apenas .jpg, .jpeg, .png, .webp, .gif
✅ **Tamanho:** Máximo 5MB
✅ **Tipo MIME:** Apenas images/*

Se o upload violar essas regras, será rejeitado automaticamente.

---

## 🖼️ Placeholders

Para produtos sem imagem, use placeholders:

```typescript
const getProductImageUrl = (product: Product) => {
  if (product.image_url) {
    return product.full_image_url;
  }

  // Placeholder baseado na categoria
  const placeholders = {
    laptops: '/assets/placeholder-laptop.png',
    smartphones: '/assets/placeholder-phone.png',
    tablets: '/assets/placeholder-tablet.png',
    // ...
  };

  return placeholders[product.category] || '/assets/placeholder-default.png';
};
```

---

## 🔄 Atualizar Imagem de Produto

```typescript
const updateProductImage = async (
  productId: string,
  newImageFile: File,
  oldImagePath?: string
) => {
  // 1. Upload nova imagem
  const newPath = await uploadProductImage(newImageFile, 'laptops');

  // 2. Atualizar produto
  await supabase
    .from('products')
    .update({ image_url: newPath })
    .eq('id', productId);

  // 3. Deletar imagem antiga (se existir)
  if (oldImagePath) {
    await deleteProductImage(oldImagePath);
  }
};
```

---

## 📊 Monitoramento

### Ver todas as imagens no bucket

```sql
SELECT
  name,
  metadata->>'size' as size_bytes,
  created_at,
  updated_at
FROM storage.objects
WHERE bucket_id = 'product-images'
ORDER BY created_at DESC;
```

### Ver produtos sem imagem

```sql
SELECT id, name, category
FROM products
WHERE image_url IS NULL OR image_url = '';
```

### Ver imagens órfãs (sem produto associado)

```sql
SELECT o.name
FROM storage.objects o
WHERE o.bucket_id = 'product-images'
AND NOT EXISTS (
  SELECT 1 FROM products p
  WHERE p.image_url = o.name
);
```

---

## 🎨 Otimização de Imagens

### Recomendações:

1. **Comprimir antes do upload** (TinyPNG, ImageOptim)
2. **Usar WebP quando possível** (melhor compressão)
3. **Dimensões recomendadas:**
   - Thumbnail: 300x300px
   - Detalhes: 800x800px
   - Banner: 1200x600px
4. **Lazy loading no frontend**

---

## 🔒 Segurança

✅ **RLS ativo** - Apenas admins podem modificar
✅ **Validação de tipo** - Apenas imagens permitidas
✅ **Limite de tamanho** - Previne uploads enormes
✅ **Bucket público** - Sem autenticação para leitura
✅ **Path organizado** - Fácil de gerenciar

---

## 📝 Checklist de Setup

- [ ] Executar migration `004_storage_bucket.sql`
- [ ] Verificar bucket criado no Supabase Dashboard → Storage
- [ ] Testar upload via Supabase Dashboard
- [ ] Verificar políticas RLS no Dashboard → Storage → Policies
- [ ] Testar URL pública de uma imagem
- [ ] Integrar upload no backend/frontend
- [ ] Adicionar placeholders para produtos sem imagem

---

## 🚀 URLs de Exemplo

```
# Bucket URL base
https://seu-projeto.supabase.co/storage/v1/object/public/product-images/

# Imagem específica
https://seu-projeto.supabase.co/storage/v1/object/public/product-images/laptops/macbook-pro.jpg

# Via function helper (no SQL)
SELECT get_product_image_url('laptops/macbook-pro.jpg');
```

---

**Storage configurado e pronto para uso!** 🎉
