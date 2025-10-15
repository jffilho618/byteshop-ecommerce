-- ============================================
-- BYTESHOP STORAGE SETUP
-- Migration 004: Storage Helper Functions
-- ============================================

-- IMPORTANTE: O bucket 'product-images' e suas políticas RLS
-- devem ser criados via Supabase Dashboard.
-- Veja: docs/STORAGE_GUIDE.md para instruções detalhadas.

-- ============================================
-- FUNÇÕES HELPER PARA STORAGE
-- ============================================

-- Function para gerar URL pública de uma imagem
CREATE OR REPLACE FUNCTION get_product_image_url(image_path TEXT)
RETURNS TEXT AS $$
DECLARE
  bucket_name TEXT := 'product-images';
BEGIN
  -- Retorna path relativo que o Supabase SDK converte para URL completa
  IF image_path IS NULL OR image_path = '' THEN
    RETURN NULL;
  END IF;

  RETURN '/storage/v1/object/public/' || bucket_name || '/' || image_path;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION get_product_image_url IS 'Gera URL relativa para imagem de produto (será convertida para URL completa pelo Supabase SDK)';

-- ============================================
-- HELPER VIEW PARA PRODUTOS COM URLs COMPLETAS
-- ============================================

CREATE OR REPLACE VIEW products_with_images_view AS
SELECT
  p.*,
  CASE
    -- Se image_url já é uma URL completa (http/https)
    WHEN p.image_url LIKE 'http%' THEN p.image_url
    -- Se é um path do storage, gera URL relativa
    WHEN p.image_url IS NOT NULL AND p.image_url != '' THEN get_product_image_url(p.image_url)
    -- Se não tem imagem, retorna NULL
    ELSE NULL
  END as full_image_url
FROM products p;

COMMENT ON VIEW products_with_images_view IS 'Produtos com URLs de imagem processadas (paths convertidos para URLs)';

-- Grant de leitura para a view
GRANT SELECT ON products_with_images_view TO authenticated, anon;

-- ============================================
-- ATUALIZAR COMENTÁRIO DA COLUNA
-- ============================================

COMMENT ON COLUMN products.image_url IS
'Path ou URL da imagem do produto. Pode ser:
1. Path no bucket: "laptops/macbook-pro.jpg" (será convertido para URL completa)
2. URL completa do Supabase Storage: "https://..."
3. URL externa (CDN, etc): "https://..."';

-- ============================================
-- INSTRUÇÕES DE SETUP
-- ============================================

/*
ATENÇÃO: Esta migration cria apenas as funções SQL.
O bucket e as políticas RLS devem ser criados manualmente via Supabase Dashboard.

SIGA ESTES PASSOS:

1. Vá para: Supabase Dashboard → Storage
2. Clique em "Create a new bucket"
3. Configure:
   - Name: product-images
   - Public bucket: ON (✓)
   - File size limit: 5MB
   - Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp, image/gif

4. Depois de criar o bucket, vá para Policies
5. Crie 4 políticas:

   a) SELECT (Public):
      - Policy name: "Public Access - Anyone can view"
      - Allowed operation: SELECT
      - Target roles: public, authenticated
      - Policy definition: (bucket_id = 'product-images')

   b) INSERT (Admin only):
      - Policy name: "Admin Only - Upload"
      - Allowed operation: INSERT
      - Target roles: authenticated
      - WITH CHECK:
        (bucket_id = 'product-images') AND
        (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'))

   c) UPDATE (Admin only):
      - Policy name: "Admin Only - Update"
      - Allowed operation: UPDATE
      - Target roles: authenticated
      - USING: (mesma condição do INSERT)

   d) DELETE (Admin only):
      - Policy name: "Admin Only - Delete"
      - Allowed operation: DELETE
      - Target roles: authenticated
      - USING: (mesma condição do INSERT)

Para mais detalhes, consulte: docs/STORAGE_GUIDE.md
*/
