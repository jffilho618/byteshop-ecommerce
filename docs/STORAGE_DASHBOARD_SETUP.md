# Storage Setup via Dashboard - ByteShop

## 🎯 Guia Passo a Passo

O Supabase Storage não permite criação de buckets via SQL. Siga este guia visual para configurar via Dashboard.

---

## 📦 Passo 1: Criar o Bucket

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto ByteShop
3. No menu lateral, clique em **"Storage"**
4. Clique no botão **"Create a new bucket"**

### Configurações do Bucket:

```
Name: product-images
Public bucket: ✓ ON (checkbox marcado)
File size limit: 5242880 (5MB em bytes)
Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif
```

**Clique em "Create bucket"**

---

## 🔐 Passo 2: Configurar Políticas RLS

Após criar o bucket, você verá ele listado. Agora vamos adicionar as políticas de segurança.

### 2.1 - Acessar Políticas

1. Na lista de buckets, clique em **"product-images"**
2. Clique na aba **"Policies"**
3. Você verá a mensagem: "No policies yet"

---

### 2.2 - Política 1: SELECT (Público)

**Clique em "New Policy"**

```
Policy name: Public Access - Anyone can view product images
Allowed operation: SELECT ✓
Policy definition:
  - Selecione "Custom" no dropdown
  - Cole no campo "USING expression":
    bucket_id = 'product-images'
```

**Target roles:** Deixe vazio (significa todos)

**Clique em "Save policy"**

---

### 2.3 - Política 2: INSERT (Apenas Admin)

**Clique em "New Policy"**

```
Policy name: Admin Only - Upload product images
Allowed operation: INSERT ✓
Policy definition:
  - Selecione "Custom"
  - Cole no campo "WITH CHECK expression":
    (bucket_id = 'product-images') AND
    (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
```

**Target roles:** authenticated

**Clique em "Save policy"**

---

### 2.4 - Política 3: UPDATE (Apenas Admin)

**Clique em "New Policy"**

```
Policy name: Admin Only - Update product images
Allowed operation: UPDATE ✓
Policy definition:
  - Selecione "Custom"
  - Cole no campo "USING expression":
    (bucket_id = 'product-images') AND
    (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
```

**Target roles:** authenticated

**Clique em "Save policy"**

---

### 2.5 - Política 4: DELETE (Apenas Admin)

**Clique em "New Policy"**

```
Policy name: Admin Only - Delete product images
Allowed operation: DELETE ✓
Policy definition:
  - Selecione "Custom"
  - Cole no campo "USING expression":
    (bucket_id = 'product-images') AND
    (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
```

**Target roles:** authenticated

**Clique em "Save policy"**

---

## ✅ Passo 3: Executar Migration SQL

Agora execute a migration que cria as functions helper:

1. Vá em **SQL Editor**
2. Copie e cole o conteúdo de: `supabase/migrations/004_storage_setup.sql`
3. **Execute**

Isso criará:
- ✅ Function `get_product_image_url()`
- ✅ View `products_with_images_view`

---

## 🧪 Passo 4: Testar o Bucket

### Teste via Dashboard:

1. No Storage, clique em **"product-images"**
2. Clique em **"Upload file"**
3. Faça upload de uma imagem de teste
4. Organize em pasta: crie pasta "laptops" e coloque a imagem lá

### Testar URL pública:

A URL pública terá este formato:
```
https://seu-projeto.supabase.co/storage/v1/object/public/product-images/laptops/teste.jpg
```

Copie a URL e cole no navegador - deve exibir a imagem.

---

## 📊 Verificação Final

Execute estas queries no SQL Editor para confirmar:

### 1. Ver produtos com URLs processadas
```sql
SELECT id, name, image_url, full_image_url
FROM products_with_images_view
LIMIT 5;
```

### 2. Testar function
```sql
SELECT get_product_image_url('laptops/teste.jpg');
-- Deve retornar: /storage/v1/object/public/product-images/laptops/teste.jpg
```

### 3. Verificar políticas
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

Deve mostrar as 4 políticas criadas.

---

## ✅ Checklist Completo

- [ ] Bucket "product-images" criado
- [ ] Bucket configurado como público
- [ ] Limite de 5MB configurado
- [ ] MIME types configurados
- [ ] Política SELECT (público) criada
- [ ] Política INSERT (admin) criada
- [ ] Política UPDATE (admin) criada
- [ ] Política DELETE (admin) criada
- [ ] Migration 004_storage_setup.sql executada
- [ ] Function `get_product_image_url` funcionando
- [ ] View `products_with_images_view` criada
- [ ] Teste de upload feito com sucesso

---

## 💡 Dica: Criar Pastas

Para organização, crie as pastas das categorias:

1. No bucket, clique em **"Create folder"**
2. Crie uma pasta para cada categoria:
   - laptops
   - smartphones
   - tablets
   - accessories
   - components
   - peripherals

Agora o Storage está 100% configurado! 🎉

---

## 🔗 Próximos Passos

Depois de configurar o Storage:
1. ✅ Atualizar produtos de exemplo com imagens reais
2. ✅ Implementar upload no backend
3. ✅ Integrar upload no frontend admin
4. ✅ Adicionar placeholders para produtos sem imagem

---

**Para mais detalhes técnicos, consulte:** [STORAGE_GUIDE.md](./STORAGE_GUIDE.md)
