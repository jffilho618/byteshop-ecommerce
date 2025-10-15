-- ============================================
-- BYTESHOP SAMPLE DATA
-- Seed 001: Dados iniciais para testes
-- ============================================

-- IMPORTANTE: Este seed assume que já existe um usuário criado via Supabase Auth
-- Os IDs abaixo são exemplos. Você precisará substituir pelos IDs reais após criar usuários.

-- ============================================
-- PRODUTOS DE EXEMPLO
-- ============================================

INSERT INTO products (name, description, price, stock_quantity, category, image_url, specifications) VALUES

-- LAPTOPS
(
  'MacBook Pro 14" M3',
  'Laptop profissional com chip M3, ideal para desenvolvimento e design. Tela Liquid Retina XDR de 14 polegadas com ProMotion.',
  12999.00,
  15,
  'laptops',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
  '{
    "processor": "Apple M3 Pro",
    "ram": "18GB",
    "storage": "512GB SSD",
    "screen": "14.2 Liquid Retina XDR",
    "gpu": "GPU 14-core",
    "battery": "Até 18 horas",
    "weight": "1.6 kg"
  }'::jsonb
),
(
  'Dell XPS 15',
  'Laptop premium com tela InfinityEdge 4K e desempenho excepcional para criadores de conteúdo e desenvolvedores.',
  9499.00,
  20,
  'laptops',
  'https://images.unsplash.com/photo-1593642632823-8f785ba67e45',
  '{
    "processor": "Intel Core i7-13700H",
    "ram": "16GB DDR5",
    "storage": "1TB NVMe SSD",
    "screen": "15.6 4K OLED",
    "gpu": "NVIDIA RTX 4050",
    "battery": "Até 13 horas",
    "weight": "1.86 kg"
  }'::jsonb
),
(
  'Lenovo ThinkPad X1 Carbon',
  'Ultrabook empresarial leve e durável, perfeito para profissionais que precisam de mobilidade.',
  8799.00,
  12,
  'laptops',
  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed',
  '{
    "processor": "Intel Core i7-1355U",
    "ram": "16GB LPDDR5",
    "storage": "512GB SSD",
    "screen": "14 FHD+ IPS",
    "battery": "Até 16 horas",
    "weight": "1.12 kg"
  }'::jsonb
),

-- SMARTPHONES
(
  'iPhone 15 Pro Max 256GB',
  'O mais avançado iPhone com chip A17 Pro, câmera de 48MP e design em titânio.',
  8999.00,
  30,
  'smartphones',
  'https://images.unsplash.com/photo-1592286927505-2fd3c0d3e40e',
  '{
    "processor": "A17 Pro",
    "ram": "8GB",
    "storage": "256GB",
    "screen": "6.7 Super Retina XDR",
    "camera": "48MP principal + 12MP ultra-wide + 12MP telephoto",
    "battery": "4422 mAh",
    "5g": true
  }'::jsonb
),
(
  'Samsung Galaxy S24 Ultra',
  'Flagship Android com S Pen integrada, tela Dynamic AMOLED 2X e câmera de 200MP.',
  7499.00,
  25,
  'smartphones',
  'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c',
  '{
    "processor": "Snapdragon 8 Gen 3",
    "ram": "12GB",
    "storage": "512GB",
    "screen": "6.8 Dynamic AMOLED 2X 120Hz",
    "camera": "200MP principal + 50MP telephoto + 12MP ultra-wide",
    "battery": "5000 mAh",
    "5g": true
  }'::jsonb
),
(
  'Google Pixel 8 Pro',
  'Smartphone Google com a melhor câmera computacional e Android puro.',
  5999.00,
  18,
  'smartphones',
  'https://images.unsplash.com/photo-1598327105666-5b89351aff97',
  '{
    "processor": "Google Tensor G3",
    "ram": "12GB",
    "storage": "256GB",
    "screen": "6.7 LTPO OLED 120Hz",
    "camera": "50MP principal + 48MP telephoto + 48MP ultra-wide",
    "battery": "5050 mAh",
    "5g": true
  }'::jsonb
),

-- TABLETS
(
  'iPad Pro 12.9" M2',
  'Tablet profissional com chip M2, suporte para Apple Pencil 2 e Magic Keyboard.',
  9499.00,
  10,
  'tablets',
  'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0',
  '{
    "processor": "Apple M2",
    "ram": "8GB",
    "storage": "256GB",
    "screen": "12.9 Liquid Retina XDR",
    "camera": "12MP wide + 10MP ultra-wide",
    "battery": "Até 10 horas",
    "weight": "682g"
  }'::jsonb
),
(
  'Samsung Galaxy Tab S9+',
  'Tablet Android premium com S Pen incluída e tela Dynamic AMOLED 2X.',
  5499.00,
  15,
  'tablets',
  'https://images.unsplash.com/photo-1561154464-82e9adf32764',
  '{
    "processor": "Snapdragon 8 Gen 2",
    "ram": "12GB",
    "storage": "256GB",
    "screen": "12.4 Dynamic AMOLED 2X 120Hz",
    "battery": "10090 mAh",
    "waterproof": "IP68"
  }'::jsonb
),

-- ACCESSORIES
(
  'AirPods Pro 2',
  'Fones de ouvido sem fio com cancelamento ativo de ruído adaptativo e áudio espacial.',
  2199.00,
  40,
  'accessories',
  'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7',
  '{
    "type": "In-ear",
    "noise_cancellation": true,
    "battery": "Até 6h (30h com estojo)",
    "water_resistance": "IPX4",
    "connectivity": "Bluetooth 5.3"
  }'::jsonb
),
(
  'Sony WH-1000XM5',
  'Headphone over-ear com melhor cancelamento de ruído do mercado e qualidade de áudio excepcional.',
  2499.00,
  22,
  'accessories',
  'https://images.unsplash.com/photo-1545127398-14699f92334b',
  '{
    "type": "Over-ear",
    "noise_cancellation": true,
    "battery": "Até 30 horas",
    "connectivity": "Bluetooth 5.2 + cabo",
    "weight": "250g"
  }'::jsonb
),
(
  'Logitech MX Master 3S',
  'Mouse ergonômico sem fio para produtividade profissional com sensor de 8K DPI.',
  649.00,
  35,
  'accessories',
  'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46',
  '{
    "type": "Wireless mouse",
    "dpi": "8000",
    "battery": "Até 70 dias",
    "connectivity": "Bluetooth + USB receiver",
    "buttons": 7
  }'::jsonb
),

-- COMPONENTS
(
  'RTX 4080 Super 16GB',
  'Placa de vídeo NVIDIA top de linha para gaming e criação de conteúdo em 4K.',
  6499.00,
  8,
  'components',
  'https://images.unsplash.com/photo-1591488320449-011701bb6704',
  '{
    "gpu": "NVIDIA GeForce RTX 4080 Super",
    "vram": "16GB GDDR6X",
    "cuda_cores": 10240,
    "tdp": "320W",
    "ports": "3x DisplayPort 1.4a, 1x HDMI 2.1"
  }'::jsonb
),
(
  'AMD Ryzen 9 7950X',
  'Processador de 16 cores e 32 threads para desempenho extremo em multitarefa.',
  3499.00,
  12,
  'components',
  'https://images.unsplash.com/photo-1555617981-dac3880eac6e',
  '{
    "cores": 16,
    "threads": 32,
    "base_clock": "4.5 GHz",
    "boost_clock": "5.7 GHz",
    "tdp": "170W",
    "socket": "AM5"
  }'::jsonb
),

-- PERIPHERALS
(
  'Keychron Q1 Pro',
  'Teclado mecânico customizável 75% com conexão wireless e RGB programável.',
  1299.00,
  18,
  'peripherals',
  'https://images.unsplash.com/photo-1587829741301-dc798b83add3',
  '{
    "layout": "75% ANSI",
    "switches": "Gateron G Pro Brown",
    "connectivity": "Bluetooth 5.1 + USB-C",
    "battery": "Até 100 horas",
    "hot_swappable": true
  }'::jsonb
),
(
  'LG UltraGear 27" 4K 144Hz',
  'Monitor gamer IPS 4K com taxa de atualização de 144Hz e suporte a HDR10.',
  3299.00,
  10,
  'peripherals',
  'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf',
  '{
    "size": "27 inches",
    "resolution": "3840x2160 (4K)",
    "refresh_rate": "144Hz",
    "panel": "IPS",
    "response_time": "1ms",
    "hdr": "HDR10"
  }'::jsonb
);

-- ============================================
-- NOTA: USUÁRIOS E PEDIDOS
-- ============================================

-- Usuários devem ser criados via Supabase Auth UI ou API
-- Depois de criar usuários, você pode adicionar pedidos de exemplo

-- Exemplo de como criar um admin (execute após criar o usuário no Auth):
-- UPDATE users SET role = 'admin' WHERE email = 'admin@byteshop.com';

COMMENT ON TABLE products IS 'Tabela populada com 16 produtos de exemplo cobrindo todas as categorias';
