-- ============================================
-- BYTESHOP - DATABASE BACKUP
-- Generated: 2025-10-16T17:39:13.389Z
-- Project: cliihgjajttoulpsrxzh
-- ============================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;


-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.product_category AS ENUM ('laptops', 'smartphones', 'tablets', 'accessories', 'components', 'peripherals');
CREATE TYPE public.user_role AS ENUM ('customer', 'admin');

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE public.addresses (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, label text NOT NULL DEFAULT 'Endereço Principal'::text, street text NOT NULL, number text NOT NULL, complement text, neighborhood text NOT NULL, city text NOT NULL, state text NOT NULL, zipcode text NOT NULL, is_default boolean NOT NULL DEFAULT false, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now(), is_active boolean DEFAULT true);

ALTER TABLE ONLY public.addresses ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.addresses ADD CONSTRAINT addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.audit_log (id uuid NOT NULL DEFAULT gen_random_uuid(), table_name text NOT NULL, record_id uuid NOT NULL, action text NOT NULL, old_data jsonb, new_data jsonb, changed_fields text[], user_id uuid, user_email text, ip_address text, user_agent text, created_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.audit_log ADD CONSTRAINT audit_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.audit_log ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

CREATE TABLE public.cart_items (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, product_id uuid NOT NULL, quantity integer NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.cart_items ADD CONSTRAINT cart_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.cart_items ADD CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

CREATE TABLE public.edge_function_logs (id uuid NOT NULL DEFAULT gen_random_uuid(), function_name text NOT NULL, execution_time_ms integer, status text NOT NULL, error_message text, metadata jsonb DEFAULT '{}'::jsonb, created_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.edge_function_logs ADD CONSTRAINT edge_function_logs_pkey PRIMARY KEY (id);

CREATE TABLE public.email_templates (id uuid NOT NULL DEFAULT gen_random_uuid(), template_name text NOT NULL, subject text NOT NULL, html_body text NOT NULL, variables jsonb DEFAULT '[]'::jsonb, is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.email_templates ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);

CREATE TABLE public.order_items (id uuid NOT NULL DEFAULT gen_random_uuid(), order_id uuid NOT NULL, product_id uuid NOT NULL, quantity integer NOT NULL, unit_price numeric(10,2) NOT NULL, subtotal numeric(10,2) NOT NULL, created_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.order_items ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.order_items ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.order_items ADD CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;

CREATE TABLE public.orders (id uuid NOT NULL DEFAULT gen_random_uuid(), user_id uuid NOT NULL, total_amount numeric(10,2) NOT NULL, status order_status NOT NULL DEFAULT 'pending'::order_status, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now(), address_id uuid NOT NULL);

ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_address_id_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;

CREATE TABLE public.products (id uuid NOT NULL DEFAULT gen_random_uuid(), name text NOT NULL, description text NOT NULL, price numeric(10,2) NOT NULL, stock_quantity integer NOT NULL DEFAULT 0, category product_category NOT NULL, image_url text, specifications jsonb DEFAULT '{}'::jsonb, is_active boolean NOT NULL DEFAULT true, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now(), search_vector tsvector);

ALTER TABLE ONLY public.products ADD CONSTRAINT products_pkey PRIMARY KEY (id);

CREATE TABLE public.search_log (id uuid NOT NULL DEFAULT gen_random_uuid(), search_query text NOT NULL, results_count integer NOT NULL, user_id uuid, created_at timestamp with time zone NOT NULL DEFAULT now());

ALTER TABLE ONLY public.search_log ADD CONSTRAINT search_log_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.search_log ADD CONSTRAINT search_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

CREATE TABLE public.users (id uuid NOT NULL, email text NOT NULL, full_name text NOT NULL, role user_role NOT NULL DEFAULT 'customer'::user_role, created_at timestamp with time zone NOT NULL DEFAULT now(), updated_at timestamp with time zone NOT NULL DEFAULT now(), is_active boolean DEFAULT true);

ALTER TABLE ONLY public.users ADD CONSTRAINT users_pkey PRIMARY KEY (id, id);


-- ============================================
-- VIEWS
-- ============================================

CREATE VIEW public.admin_all_orders AS
 SELECT o.id AS order_id,
    o.user_id,
    o.status,
    o.total_amount,
    o.address_id,
    o.created_at AS order_date,
    o.updated_at,
    u.full_name AS customer_name,
    u.email AS customer_email,
    u.role AS customer_role,
    a.label AS address_label,
    a.street,
    a.number,
    a.complement,
    a.neighborhood,
    a.city,
    a.state,
    a.zipcode,
    format_address(o.address_id) AS full_address,
    ( SELECT count(*) AS count
           FROM order_items
          WHERE (order_items.order_id = o.id)) AS items_count
   FROM ((orders o
     JOIN users u ON ((o.user_id = u.id)))
     LEFT JOIN addresses a ON ((o.address_id = a.id)))
  ORDER BY o.created_at DESC;

CREATE VIEW public.admin_order_details AS
 SELECT o.id AS order_id,
    o.user_id,
    o.status,
    o.total_amount,
    o.created_at AS order_date,
    u.full_name AS customer_name,
    u.email AS customer_email,
    format_address(o.address_id) AS delivery_address,
    oi.id AS item_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    ((oi.quantity)::numeric * oi.unit_price) AS subtotal,
    p.name AS product_name,
    p.image_url AS product_image,
    p.category AS product_category
   FROM (((orders o
     JOIN users u ON ((o.user_id = u.id)))
     JOIN order_items oi ON ((o.id = oi.order_id)))
     JOIN products p ON ((oi.product_id = p.id)))
  ORDER BY o.created_at DESC, oi.id;

CREATE VIEW public.cart_with_products_view AS
 SELECT c.id AS cart_item_id,
    c.user_id,
    c.product_id,
    c.quantity,
    c.created_at,
    c.updated_at,
    p.name AS product_name,
    p.description AS product_description,
    p.price AS unit_price,
    p.category AS product_category,
    p.image_url,
    p.stock_quantity,
    p.is_active,
    (((c.quantity)::numeric * p.price))::numeric(10,2) AS subtotal,
    (p.stock_quantity >= c.quantity) AS is_available
   FROM (cart_items c
     JOIN products p ON ((c.product_id = p.id)));

CREATE VIEW public.category_summary_view AS
 SELECT p.category,
    (count(p.id))::integer AS total_products,
    (count(
        CASE
            WHEN p.is_active THEN 1
            ELSE NULL::integer
        END))::integer AS active_products,
    (sum(p.stock_quantity))::integer AS total_stock,
    (avg(p.price))::numeric(10,2) AS average_price,
    (min(p.price))::numeric(10,2) AS min_price,
    (max(p.price))::numeric(10,2) AS max_price,
    (COALESCE(sum(oi.quantity), (0)::bigint))::integer AS total_sold,
    (COALESCE(sum(oi.subtotal), (0)::numeric))::numeric(10,2) AS total_revenue
   FROM (products p
     LEFT JOIN order_items oi ON ((p.id = oi.product_id)))
  GROUP BY p.category
  ORDER BY ((COALESCE(sum(oi.subtotal), (0)::numeric))::numeric(10,2)) DESC;

CREATE VIEW public.edge_function_metrics AS
 SELECT function_name,
    count(*) AS total_executions,
    count(*) FILTER (WHERE (status = 'success'::text)) AS successful_executions,
    count(*) FILTER (WHERE (status = 'error'::text)) AS failed_executions,
    count(*) FILTER (WHERE (status = 'timeout'::text)) AS timeout_executions,
    round(avg(execution_time_ms), 2) AS avg_execution_time_ms,
    max(execution_time_ms) AS max_execution_time_ms,
    min(execution_time_ms) AS min_execution_time_ms,
    round((((count(*) FILTER (WHERE (status = 'success'::text)))::numeric / (NULLIF(count(*), 0))::numeric) * (100)::numeric), 2) AS success_rate_pct,
    max(created_at) AS last_execution
   FROM edge_function_logs
  GROUP BY function_name;

CREATE VIEW public.low_stock_products_view AS
 SELECT p.id,
    p.name,
    p.category,
    p.price,
    p.stock_quantity,
    p.is_active,
    (COALESCE(avg(oi.quantity), (0)::numeric))::numeric(10,2) AS average_order_quantity,
    (count(DISTINCT oi.order_id))::integer AS times_ordered
   FROM (products p
     LEFT JOIN order_items oi ON ((p.id = oi.product_id)))
  WHERE ((p.is_active = true) AND (p.stock_quantity <= 10))
  GROUP BY p.id
  ORDER BY p.stock_quantity;

CREATE VIEW public.order_details_view AS
 SELECT o.id AS order_id,
    o.user_id,
    o.status,
    o.total_amount,
    o.created_at AS order_date,
    o.address_id,
    format_address(o.address_id) AS delivery_address,
    oi.id AS item_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    ((oi.quantity)::numeric * oi.unit_price) AS subtotal,
    p.name AS product_name,
    p.image_url AS product_image
   FROM ((orders o
     JOIN order_items oi ON ((o.id = oi.order_id)))
     JOIN products p ON ((oi.product_id = p.id)));

CREATE VIEW public.order_status_history AS
 SELECT a.id AS audit_id,
    a.record_id AS order_id,
    (a.old_data ->> 'status'::text) AS old_status,
    (a.new_data ->> 'status'::text) AS new_status,
    a.user_id AS changed_by_user_id,
    u.full_name AS changed_by_name,
    a.created_at AS changed_at,
    (EXTRACT(epoch FROM (a.created_at - lag(a.created_at) OVER (PARTITION BY a.record_id ORDER BY a.created_at))) / (3600)::numeric) AS hours_in_previous_status
   FROM (audit_log a
     LEFT JOIN users u ON ((u.id = a.user_id)))
  WHERE ((a.table_name = 'orders'::text) AND (a.action = 'UPDATE'::text) AND ('status'::text = ANY (a.changed_fields)))
  ORDER BY a.created_at DESC;

CREATE VIEW public.orders_with_addresses AS
 SELECT o.id,
    o.user_id,
    o.total_amount,
    o.status,
    o.created_at,
    o.updated_at,
    o.address_id,
    a.label AS address_label,
    a.street,
    a.number,
    a.complement,
    a.neighborhood,
    a.city,
    a.state,
    a.zipcode,
    format_address(o.address_id) AS full_address
   FROM (orders o
     JOIN addresses a ON ((o.address_id = a.id)));

CREATE VIEW public.popular_searches AS
 SELECT search_query,
    count(*) AS search_count,
    avg(results_count) AS avg_results,
    max(created_at) AS last_searched
   FROM search_log
  WHERE (created_at > (now() - '30 days'::interval))
  GROUP BY search_query
 HAVING (count(*) > 1)
  ORDER BY (count(*)) DESC
 LIMIT 10;

CREATE VIEW public.product_inventory_view AS
 SELECT p.id,
    p.name,
    p.category,
    p.price,
    p.stock_quantity,
    p.is_active,
    p.created_at,
    p.updated_at,
    (COALESCE(sum(oi.quantity), (0)::bigint))::integer AS total_sold,
    (count(DISTINCT oi.order_id))::integer AS order_count,
    (COALESCE(sum(oi.subtotal), (0)::numeric))::numeric(10,2) AS total_revenue
   FROM (products p
     LEFT JOIN order_items oi ON ((p.id = oi.product_id)))
  GROUP BY p.id;

CREATE VIEW public.product_price_history AS
 SELECT a.id AS audit_id,
    a.record_id AS product_id,
    p.name AS product_name,
    ((a.old_data ->> 'price'::text))::numeric AS old_price,
    ((a.new_data ->> 'price'::text))::numeric AS new_price,
    round((((((a.new_data ->> 'price'::text))::numeric - ((a.old_data ->> 'price'::text))::numeric) / NULLIF(((a.old_data ->> 'price'::text))::numeric, (0)::numeric)) * (100)::numeric), 2) AS price_change_pct,
    a.user_id AS changed_by_user_id,
    u.full_name AS changed_by_name,
    a.created_at AS changed_at
   FROM ((audit_log a
     LEFT JOIN products p ON ((p.id = a.record_id)))
     LEFT JOIN users u ON ((u.id = a.user_id)))
  WHERE ((a.table_name = 'products'::text) AND (a.action = 'UPDATE'::text) AND ('price'::text = ANY (a.changed_fields)))
  ORDER BY a.created_at DESC;

CREATE VIEW public.products_with_images_view AS
 SELECT id,
    name,
    description,
    price,
    stock_quantity,
    category,
    image_url,
    specifications,
    is_active,
    created_at,
    updated_at,
        CASE
            WHEN (image_url ~~ 'http%'::text) THEN image_url
            WHEN ((image_url IS NOT NULL) AND (image_url <> ''::text)) THEN get_product_image_url(image_url)
            ELSE NULL::text
        END AS full_image_url
   FROM products p;

CREATE VIEW public.sales_dashboard_view AS
 SELECT (o.created_at)::date AS sale_date,
    (count(DISTINCT o.id))::integer AS total_orders,
    (count(DISTINCT o.user_id))::integer AS unique_customers,
    (sum(o.total_amount))::numeric(10,2) AS total_revenue,
    (avg(o.total_amount))::numeric(10,2) AS average_order_value,
    (COALESCE(sum(oi.quantity), (0)::bigint))::integer AS total_items_sold,
    (count(
        CASE
            WHEN (o.status = 'pending'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS pending_orders,
    (count(
        CASE
            WHEN (o.status = 'processing'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS processing_orders,
    (count(
        CASE
            WHEN (o.status = 'shipped'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS shipped_orders,
    (count(
        CASE
            WHEN (o.status = 'delivered'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS delivered_orders,
    (count(
        CASE
            WHEN (o.status = 'cancelled'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS cancelled_orders
   FROM (orders o
     LEFT JOIN order_items oi ON ((o.id = oi.order_id)))
  GROUP BY ((o.created_at)::date)
  ORDER BY ((o.created_at)::date) DESC;

CREATE VIEW public.user_order_history_view AS
 SELECT u.id AS user_id,
    u.full_name,
    u.email,
    u.role,
    u.created_at AS member_since,
    (count(o.id))::integer AS total_orders,
    (COALESCE(sum(o.total_amount), (0)::numeric))::numeric(10,2) AS total_spent,
    (COALESCE(avg(o.total_amount), (0)::numeric))::numeric(10,2) AS average_order_value,
    max(o.created_at) AS last_order_date,
    (count(
        CASE
            WHEN (o.status = 'pending'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS pending_orders,
    (count(
        CASE
            WHEN (o.status = 'delivered'::order_status) THEN 1
            ELSE NULL::integer
        END))::integer AS delivered_orders
   FROM (users u
     LEFT JOIN orders o ON ((u.id = o.user_id)))
  WHERE (u.role = 'customer'::user_role)
  GROUP BY u.id;

CREATE VIEW public.user_role_changes AS
 SELECT a.id AS audit_id,
    a.record_id AS user_id,
    u.full_name AS user_name,
    u.email AS user_email,
    (a.old_data ->> 'role'::text) AS old_role,
    (a.new_data ->> 'role'::text) AS new_role,
    a.user_id AS changed_by_user_id,
    cu.full_name AS changed_by_name,
    a.created_at AS changed_at
   FROM ((audit_log a
     LEFT JOIN users u ON ((u.id = a.record_id)))
     LEFT JOIN users cu ON ((cu.id = a.user_id)))
  WHERE ((a.table_name = 'users'::text) AND (a.action = 'UPDATE'::text) AND ('role'::text = ANY (a.changed_fields)))
  ORDER BY a.created_at DESC;


-- ============================================
-- FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION public.audit_trigger_function()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  changed_fields TEXT[] := '{}';
  old_json JSONB;
  new_json JSONB;
  key TEXT;
BEGIN
  -- Converter OLD e NEW para JSONB
  IF TG_OP = 'DELETE' THEN
    old_json := to_jsonb(OLD);
    new_json := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_json := NULL;
    new_json := to_jsonb(NEW);
  ELSE -- UPDATE
    old_json := to_jsonb(OLD);
    new_json := to_jsonb(NEW);
    
    -- Detectar campos alterados
    FOR key IN SELECT jsonb_object_keys(new_json)
    LOOP
      IF old_json->key IS DISTINCT FROM new_json->key THEN
        changed_fields := array_append(changed_fields, key);
      END IF;
    END LOOP;
  END IF;

  -- Inserir log de auditoria
  INSERT INTO public.audit_log (
    table_name,
    record_id,
    action,
    old_data,
    new_data,
    changed_fields,
    user_id,
    user_email
  ) VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    old_json,
    new_json,
    CASE WHEN TG_OP = 'UPDATE' THEN changed_fields ELSE NULL END,
    auth.uid(),
    auth.email()
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_order_item_subtotal()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.subtotal = NEW.unit_price * NEW.quantity;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_order_total(order_uuid uuid)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
  total NUMERIC(10, 2);
BEGIN
  SELECT COALESCE(SUM(subtotal), 0) INTO total
  FROM order_items
  WHERE order_id = order_uuid;

  RETURN total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_product_availability(product_uuid uuid, required_quantity integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  available_stock INTEGER;
BEGIN
  SELECT stock_quantity INTO available_stock
  FROM products
  WHERE id = product_uuid AND is_active = true;

  RETURN available_stock >= required_quantity;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_user_profile(user_id uuid, user_email text, user_full_name text, user_role user_role DEFAULT 'customer'::user_role)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (user_id, user_email, user_full_name, user_role)
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.decrease_product_stock(product_uuid uuid, quantity_to_decrease integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_stock INTEGER;
  product_name_var TEXT;
BEGIN
  -- Validar parâmetros
  IF quantity_to_decrease <= 0 THEN
    RAISE EXCEPTION 'Quantity to decrease must be positive. Got: %', quantity_to_decrease;
  END IF;

  -- Buscar estoque atual e nome do produto
  SELECT stock_quantity, name 
  INTO current_stock, product_name_var
  FROM products
  WHERE id = product_uuid;
  
  -- Verificar se produto existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found with ID: %', product_uuid;
  END IF;
  
  -- Verificar se há estoque suficiente
  IF current_stock < quantity_to_decrease THEN
    RAISE EXCEPTION 'Insufficient stock for product "%". Available: %, Required: %', 
      product_name_var,
      current_stock, 
      quantity_to_decrease
    USING HINT = 'Please check product availability before creating order';
  END IF;
  
  -- Diminuir estoque
  UPDATE products
  SET 
    stock_quantity = stock_quantity - quantity_to_decrease,
    updated_at = NOW()
  WHERE id = product_uuid;
  
  -- Log de sucesso (aparece em logs do Supabase)
  RAISE NOTICE 'Stock decreased for product "%" (ID: %): % → %', 
    product_name_var,
    product_uuid,
    current_stock,
    current_stock - quantity_to_decrease;
    
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_single_default_address()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Se está marcando como padrão, desmarcar outros endereços do mesmo usuário
  IF NEW.is_default = true THEN
    UPDATE addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.format_address(address_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  addr addresses;
  formatted TEXT;
BEGIN
  SELECT * INTO addr FROM addresses WHERE id = address_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  formatted := addr.street || ', ' || addr.number;

  IF addr.complement IS NOT NULL AND addr.complement != '' THEN
    formatted := formatted || ', ' || addr.complement;
  END IF;

  formatted := formatted || ', ' || addr.neighborhood || ', ' ||
               addr.city || '/' || addr.state || ', ' || addr.zipcode;

  RETURN formatted;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_product_search_vector(p_name text, p_description text, p_category product_category)
 RETURNS tsvector
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
BEGIN
  RETURN 
    setweight(to_tsvector('portuguese', COALESCE(p_name, '')), 'A') ||
    setweight(to_tsvector('portuguese', COALESCE(p_description, '')), 'B') ||
    setweight(to_tsvector('portuguese', COALESCE(p_category::text, '')), 'C');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_summary(p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now())
 RETURNS TABLE(table_name text, inserts bigint, updates bigint, deletes bigint, total_changes bigint, unique_users bigint, last_change timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    table_name,
    COUNT(*) FILTER (WHERE action = 'INSERT') as inserts,
    COUNT(*) FILTER (WHERE action = 'UPDATE') as updates,
    COUNT(*) FILTER (WHERE action = 'DELETE') as deletes,
    COUNT(*) as total_changes,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(created_at) as last_change
  FROM audit_log
  WHERE created_at BETWEEN p_start_date AND p_end_date
  GROUP BY table_name
  ORDER BY total_changes DESC;
$function$
;

CREATE OR REPLACE FUNCTION public.get_cart_summary(user_uuid uuid)
 RETURNS TABLE(total_items integer, total_price numeric, is_valid boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_items,
    COALESCE(SUM(subtotal), 0)::NUMERIC(10,2) as total_price,
    BOOL_AND(is_available) as is_valid
  FROM cart_with_products_view
  WHERE user_id = user_uuid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_default_address(p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
  default_address_id UUID;
BEGIN
  SELECT id INTO default_address_id
  FROM addresses
  WHERE user_id = p_user_id AND is_default = true
  LIMIT 1;

  RETURN default_address_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role::TEXT
    FROM users
    WHERE id = auth.uid()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_product_image_url(image_path text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
  bucket_name TEXT := 'product-images';
BEGIN
  -- Retorna path relativo que o Supabase SDK converte para URL completa
  IF image_path IS NULL OR image_path = '' THEN
    RETURN NULL;
  END IF;

  RETURN '/storage/v1/object/public/' || bucket_name || '/' || image_path;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_top_selling_products(limit_count integer DEFAULT 10)
 RETURNS TABLE(product_id uuid, product_name text, category product_category, total_sold integer, total_revenue numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    id,
    name,
    category,
    total_sold,
    total_revenue
  FROM product_inventory_view
  WHERE total_sold > 0
  ORDER BY total_sold DESC
  LIMIT limit_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_role()
 RETURNS user_role
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT role
    FROM users
    WHERE id = auth.uid()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

CREATE OR REPLACE FUNCTION public.increase_product_stock(product_uuid uuid, quantity_to_increase integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_stock INTEGER;
  product_name_var TEXT;
  new_stock INTEGER;
BEGIN
  -- Validar parâmetros
  IF quantity_to_increase <= 0 THEN
    RAISE EXCEPTION 'Quantity to increase must be positive. Got: %', quantity_to_increase;
  END IF;

  -- Buscar estoque atual e nome do produto
  SELECT stock_quantity, name 
  INTO current_stock, product_name_var
  FROM products
  WHERE id = product_uuid;
  
  -- Verificar se produto existe
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found with ID: %', product_uuid;
  END IF;
  
  -- Calcular novo estoque
  new_stock := current_stock + quantity_to_increase;
  
  -- Aumentar estoque
  UPDATE products
  SET 
    stock_quantity = new_stock,
    updated_at = NOW()
  WHERE id = product_uuid;
  
  -- Log de sucesso
  RAISE NOTICE 'Stock increased for product "%" (ID: %): % → %', 
    product_name_var,
    product_uuid,
    current_stock,
    new_stock;
    
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'::user_role
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin_flexible()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;
BEGIN
  -- Método 1: Verificar via função is_admin() existente
  IF is_admin() = true THEN
    RETURN true;
  END IF;
  
  -- Método 2: Verificar JWT claim user_role
  IF auth.jwt() ->> 'user_role' = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Método 3: Verificar diretamente na tabela users (mais confiável)
  SELECT role INTO user_role
  FROM users 
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF OLD.role != NEW.role AND NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can change user roles';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_order_total()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  order_uuid UUID;
BEGIN
  -- Determina o order_id baseado na operação
  IF TG_OP = 'DELETE' THEN
    order_uuid := OLD.order_id;
  ELSE
    order_uuid := NEW.order_id;
  END IF;

  -- Atualiza o total da order
  UPDATE orders
  SET total_amount = (
    SELECT COALESCE(SUM(subtotal), 0)
    FROM order_items
    WHERE order_id = order_uuid
  )
  WHERE id = order_uuid;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.restore_stock_on_order_cancel(order_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  item_record RECORD;
  total_items INTEGER := 0;
BEGIN
  -- Verificar se pedido existe
  IF NOT EXISTS (SELECT 1 FROM orders WHERE id = order_uuid) THEN
    RAISE EXCEPTION 'Order not found with ID: %', order_uuid;
  END IF;
  
  -- Verificar se pedido está cancelado
  IF NOT EXISTS (
    SELECT 1 FROM orders 
    WHERE id = order_uuid AND status = 'cancelled'
  ) THEN
    RAISE WARNING 'Order % is not cancelled. Stock restoration skipped.', order_uuid;
    RETURN;
  END IF;
  
  -- Restaurar estoque de cada item do pedido
  FOR item_record IN 
    SELECT product_id, quantity
    FROM order_items
    WHERE order_id = order_uuid
  LOOP
    -- Usar função de aumentar estoque
    PERFORM increase_product_stock(item_record.product_id, item_record.quantity);
    total_items := total_items + 1;
  END LOOP;
  
  RAISE NOTICE 'Stock restored for % items from cancelled order %', total_items, order_uuid;
  
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_products(search_query text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0)
 RETURNS TABLE(id uuid, name text, description text, price numeric, stock_quantity integer, category product_category, image_url text, relevance_score real, match_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ts_query tsquery;
BEGIN
  -- Converter query para tsquery (português)
  ts_query := plainto_tsquery('portuguese', search_query);

  RETURN QUERY
  -- Full-text search com ranking
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock_quantity,
    p.category,
    p.image_url,
    ts_rank(p.search_vector, ts_query) as relevance_score,
    'fulltext'::TEXT as match_type
  FROM products p
  WHERE p.is_active = true
    AND p.search_vector @@ ts_query
  
  UNION ALL
  
  -- Similaridade por trigram (se não encontrou nada acima)
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.stock_quantity,
    p.category,
    p.image_url,
    similarity(p.name, search_query) as relevance_score,
    'similarity'::TEXT as match_type
  FROM products p
  WHERE p.is_active = true
    AND similarity(p.name, search_query) > 0.3
    AND NOT EXISTS (
      SELECT 1 FROM products p2 
      WHERE p2.is_active = true 
        AND p2.search_vector @@ ts_query
    )
  
  ORDER BY relevance_score DESC, name
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.search_suggestions(search_query text, p_limit integer DEFAULT 5)
 RETURNS TABLE(suggestion text, category product_category, product_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Sugestões baseadas em palavras do nome do produto
  WITH words AS (
    SELECT DISTINCT 
      word,
      category
    FROM products,
         LATERAL unnest(string_to_array(lower(name), ' ')) AS word
    WHERE is_active = true
      AND length(word) > 3
  )
  SELECT 
    w.word as suggestion,
    w.category,
    COUNT(DISTINCT p.id) as product_count
  FROM words w
  JOIN products p ON p.is_active = true 
    AND lower(p.name) LIKE '%' || w.word || '%'
    AND p.category = w.category
  WHERE similarity(w.word, search_query) > 0.3
     OR w.word ILIKE search_query || '%'
  GROUP BY w.word, w.category
  ORDER BY product_count DESC, similarity(w.word, search_query) DESC
  LIMIT p_limit;
$function$
;

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

CREATE OR REPLACE FUNCTION public.test_auth_context()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'jwt_role', auth.jwt() ->> 'role',
    'jwt_user_role', auth.jwt() ->> 'user_role',
    'request_role', current_setting('request.jwt.claim.role', true),
    'request_user_role', current_setting('request.jwt.claim.user_role', true),
    'is_admin_result', is_admin(),
    'current_timestamp', NOW()
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.test_can_update_order(order_uuid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSONB;
  my_uid UUID;
  my_role TEXT;
  order_owner UUID;
  can_update_using BOOLEAN;
  can_update_check BOOLEAN;
BEGIN
  my_uid := auth.uid();

  SELECT role::TEXT INTO my_role
  FROM users
  WHERE id = my_uid;

  SELECT user_id INTO order_owner
  FROM orders
  WHERE id = order_uuid;

  -- Testar USING clause
  can_update_using := (
    my_uid = order_owner OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = my_uid
      AND users.role = 'admin'
    )
  );

  -- Testar WITH CHECK clause
  can_update_check := (
    my_uid = order_owner OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = my_uid
      AND users.role = 'admin'
    )
  );

  result := jsonb_build_object(
    'my_uid', my_uid,
    'my_role', my_role,
    'order_uuid', order_uuid,
    'order_owner', order_owner,
    'is_owner', my_uid = order_owner,
    'can_update_using', can_update_using,
    'can_update_check', can_update_check
  );

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_order_status(order_uuid uuid, new_status order_status)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
  current_status order_status;
BEGIN
  -- Busca status atual
  SELECT status INTO current_status
  FROM orders
  WHERE id = order_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', order_uuid;
  END IF;

  -- Validações de transição de status
  IF current_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cannot update a cancelled order';
  END IF;

  IF current_status = 'delivered' AND new_status != 'delivered' THEN
    RAISE EXCEPTION 'Cannot change status of a delivered order';
  END IF;

  -- Atualiza status
  UPDATE orders
  SET status = new_status
  WHERE id = order_uuid;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Garantir que NEW existe e atualizar apenas updated_at
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_product_search_vector()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.search_vector := generate_product_search_vector(
    NEW.name,
    NEW.description,
    NEW.category
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;


-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE edge_function_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY Users can create own addresses
  ON public.addresses
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can delete own addresses
  ON public.addresses
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can update own addresses
  ON public.addresses
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can view own addresses
  ON public.addresses
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING (((auth.uid() = user_id) OR is_admin()))
;

CREATE POLICY Admin can view audit logs
  ON public.audit_log
  AS PERMISSIVE
  FOR SELECT
  TO {authenticated}
  USING (is_admin())
;

CREATE POLICY System can insert audit logs
  ON public.audit_log
  AS PERMISSIVE
  FOR INSERT
  TO {authenticated}
  WITH CHECK (true)
;

CREATE POLICY Users can add to own cart
  ON public.cart_items
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can delete from own cart
  ON public.cart_items
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING ((auth.uid() = user_id))
;

CREATE POLICY Users can update own cart
  ON public.cart_items
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING ((auth.uid() = user_id))
  WITH CHECK ((auth.uid() = user_id))
;

CREATE POLICY Users can view own cart
  ON public.cart_items
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING ((auth.uid() = user_id))
;

CREATE POLICY Admin can view edge function logs
  ON public.edge_function_logs
  AS PERMISSIVE
  FOR SELECT
  TO {authenticated}
  USING (is_admin())
;

CREATE POLICY System can insert edge function logs
  ON public.edge_function_logs
  AS PERMISSIVE
  FOR INSERT
  TO {authenticated}
  WITH CHECK (true)
;

CREATE POLICY Admin can manage email templates
  ON public.email_templates
  AS PERMISSIVE
  FOR ALL
  TO {authenticated}
  USING (is_admin())
  WITH CHECK (is_admin())
;

CREATE POLICY System can read active templates
  ON public.email_templates
  AS PERMISSIVE
  FOR SELECT
  TO {authenticated}
  USING ((is_active = true))
;

CREATE POLICY Only admins can delete order items
  ON public.order_items
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING (is_admin())
;

CREATE POLICY Only admins can update order items
  ON public.order_items
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING (is_admin())
  WITH CHECK (is_admin())
;

CREATE POLICY Users can create items for own orders
  ON public.order_items
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.user_id = auth.uid())))))
;

CREATE POLICY Users can view own order items
  ON public.order_items
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND ((orders.user_id = auth.uid()) OR is_admin())))))
;

CREATE POLICY orders_delete_policy
  ON public.orders
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING (((is_admin() = true) OR ((auth.jwt() ->> 'user_role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role))))))
;

CREATE POLICY orders_insert_policy
  ON public.orders
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK (((is_admin() = true) OR ((auth.jwt() ->> 'user_role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))) OR (auth.uid() = user_id)))
;

CREATE POLICY orders_select_policy
  ON public.orders
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING (((is_admin() = true) OR ((auth.jwt() ->> 'user_role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))) OR (auth.uid() = user_id)))
;

CREATE POLICY orders_update_policy
  ON public.orders
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING (((is_admin() = true) OR ((auth.jwt() ->> 'user_role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))) OR (auth.uid() = user_id)))
  WITH CHECK (((is_admin() = true) OR ((auth.jwt() ->> 'user_role'::text) = 'admin'::text) OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = 'admin'::user_role)))) OR (auth.uid() = user_id)))
;

CREATE POLICY Anyone can view active products
  ON public.products
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING (((is_active = true) OR is_admin()))
;

CREATE POLICY Only admins can create products
  ON public.products
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK (is_admin())
;

CREATE POLICY Only admins can delete products
  ON public.products
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING (is_admin())
;

CREATE POLICY Only admins can update products
  ON public.products
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING (is_admin())
  WITH CHECK (is_admin())
;

CREATE POLICY Admin can view search logs
  ON public.search_log
  AS PERMISSIVE
  FOR SELECT
  TO {authenticated}
  USING (is_admin())
;

CREATE POLICY Anyone can insert search log
  ON public.search_log
  AS PERMISSIVE
  FOR INSERT
  TO {authenticated}
  WITH CHECK (true)
;

CREATE POLICY Only admins can delete users
  ON public.users
  AS PERMISSIVE
  FOR DELETE
  TO {public}
  USING (is_admin())
;

CREATE POLICY Users can insert own data
  ON public.users
  AS PERMISSIVE
  FOR INSERT
  TO {public}
  WITH CHECK ((auth.uid() = id))
;

CREATE POLICY Users can update own data
  ON public.users
  AS PERMISSIVE
  FOR UPDATE
  TO {public}
  USING ((auth.uid() = id))
  WITH CHECK (((auth.uid() = id) AND ((role = ( SELECT users_1.role
   FROM users users_1
  WHERE (users_1.id = auth.uid()))) OR is_admin())))
;

CREATE POLICY Users can view own data
  ON public.users
  AS PERMISSIVE
  FOR SELECT
  TO {public}
  USING (((auth.uid() = id) OR is_admin()))
;


-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER ensure_single_default_address_trigger BEFORE INSERT OR UPDATE ON public.addresses FOR EACH ROW WHEN ((new.is_default = true)) EXECUTE FUNCTION ensure_single_default_address();

CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER calculate_subtotal_trigger BEFORE INSERT OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION calculate_order_item_subtotal();

CREATE TRIGGER update_order_total_trigger AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION recalculate_order_total();

CREATE TRIGGER audit_orders_changes AFTER INSERT OR DELETE OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_products_changes AFTER INSERT OR DELETE OR UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER update_product_search_vector_trigger BEFORE INSERT OR UPDATE OF name, description, category ON public.products FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_users_changes AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER prevent_unauthorized_role_change BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION prevent_role_change();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

