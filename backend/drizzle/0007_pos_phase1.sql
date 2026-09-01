-- POS Phase 1 foundations. Workflow, payment posting, and inventory consumption
-- are intentionally implemented in later batches.
BEGIN;

DO $$ BEGIN
  CREATE TYPE public.sales_order_type AS ENUM ('dine_in', 'takeaway');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.sales_order_status AS ENUM ('draft', 'submitted', 'preparing', 'ready', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.sales_order_item_status AS ENUM ('draft', 'queued', 'preparing', 'ready', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pos_payment_method AS ENUM ('cash', 'qris_manual', 'card_manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pos_payment_status AS ENUM ('unpaid', 'paid', 'voided');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pos_payment_entry_type AS ENUM ('payment', 'manual_refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.pos_operation_status AS ENUM ('processing', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.sales_consumption_status AS ENUM ('planned', 'posted', 'reversed', 'skipped_optional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.menu_variants
  ADD COLUMN IF NOT EXISTS requires_kitchen boolean NOT NULL DEFAULT true;
COMMENT ON COLUMN public.menu_variants.requires_kitchen IS
  'Explicit POS/KDS routing flag. Existing variants use safe fallback true and require manual review; this is independent from requires_recipe.';

CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  order_no varchar(50) NOT NULL,
  receipt_no varchar(50),
  business_date date NOT NULL,
  order_type public.sales_order_type NOT NULL,
  table_number varchar(30),
  customer_name varchar(150),
  notes text,
  currency_code char(3) NOT NULL,
  status public.sales_order_status NOT NULL DEFAULT 'draft',
  payment_status public.pos_payment_status NOT NULL DEFAULT 'unpaid',
  subtotal numeric(18,2) NOT NULL DEFAULT 0,
  total_amount numeric(18,2) NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  cashier_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  completed_at timestamptz,
  completed_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  cancellation_reason text,
  lock_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_sales_orders_number UNIQUE (tenant_id, outlet_id, order_no),
  CONSTRAINT uq_sales_orders_tenant_id UNIQUE (tenant_id, id),
  CONSTRAINT uq_sales_orders_scope_id UNIQUE (tenant_id, outlet_id, id),
  CONSTRAINT ck_sales_orders_currency CHECK (currency_code = upper(currency_code)),
  CONSTRAINT ck_sales_orders_amounts CHECK (subtotal >= 0 AND total_amount >= 0 AND total_amount = subtotal),
  CONSTRAINT ck_sales_orders_lock_version CHECK (lock_version > 0),
  CONSTRAINT ck_sales_orders_table CHECK (
    (order_type = 'dine_in' AND table_number IS NOT NULL AND length(btrim(table_number)) > 0)
    OR (order_type = 'takeaway' AND table_number IS NULL)
  ),
  CONSTRAINT ck_sales_orders_cancel CHECK (
    (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND length(btrim(cancellation_reason)) >= 3)
    OR (status <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL AND cancellation_reason IS NULL)
  ),
  CONSTRAINT ck_sales_orders_complete CHECK (
    status <> 'completed' OR (completed_at IS NOT NULL AND completed_by IS NOT NULL AND payment_status IN ('paid', 'voided'))
  )
);
CREATE UNIQUE INDEX uq_sales_orders_receipt
  ON public.sales_orders (tenant_id, outlet_id, receipt_no)
  WHERE receipt_no IS NOT NULL;
CREATE INDEX ix_sales_orders_scope_date ON public.sales_orders (tenant_id, outlet_id, business_date DESC);
CREATE INDEX ix_sales_orders_scope_status ON public.sales_orders (tenant_id, outlet_id, status, updated_at DESC);
CREATE INDEX ix_sales_orders_cashier ON public.sales_orders (tenant_id, cashier_id, business_date DESC);

CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  sales_order_id uuid NOT NULL,
  line_no integer NOT NULL,
  menu_id uuid NOT NULL REFERENCES public.menus(id) ON DELETE RESTRICT,
  menu_code_snapshot varchar(50) NOT NULL,
  menu_name_snapshot varchar(150) NOT NULL,
  menu_variant_id uuid NOT NULL REFERENCES public.menu_variants(id) ON DELETE RESTRICT,
  variant_code_snapshot varchar(40) NOT NULL,
  variant_name_snapshot varchar(100) NOT NULL,
  menu_category_id uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE RESTRICT,
  category_code_snapshot varchar(40) NOT NULL,
  category_name_snapshot varchar(100) NOT NULL,
  effective_price_source varchar(24) NOT NULL,
  price_source_version_at timestamptz NOT NULL,
  unit_price numeric(18,2) NOT NULL,
  quantity integer NOT NULL,
  line_subtotal numeric(18,2) NOT NULL,
  currency_code char(3) NOT NULL,
  notes text,
  requires_recipe boolean NOT NULL,
  requires_kitchen boolean NOT NULL,
  recipe_header_id uuid REFERENCES public.recipe_headers(id) ON DELETE RESTRICT,
  recipe_version_id uuid REFERENCES public.recipes(id) ON DELETE RESTRICT,
  recipe_version_no integer,
  status public.sales_order_item_status NOT NULL DEFAULT 'draft',
  queued_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  cancellation_reason text,
  lock_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_sales_order_item_line UNIQUE (sales_order_id, line_no),
  CONSTRAINT uq_sales_order_items_scope_id UNIQUE (tenant_id, sales_order_id, id),
  CONSTRAINT fk_sales_order_items_order FOREIGN KEY (tenant_id, sales_order_id)
    REFERENCES public.sales_orders(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_sales_order_item_line_no CHECK (line_no > 0),
  CONSTRAINT ck_sales_order_item_quantity CHECK (quantity > 0),
  CONSTRAINT ck_sales_order_item_amount CHECK (unit_price >= 0 AND line_subtotal = unit_price * quantity),
  CONSTRAINT ck_sales_order_item_currency CHECK (currency_code = upper(currency_code)),
  CONSTRAINT ck_sales_order_item_price_source CHECK (effective_price_source IN ('base', 'outlet_override')),
  CONSTRAINT ck_sales_order_item_recipe CHECK (
    (requires_recipe = false) OR
    (recipe_header_id IS NOT NULL AND recipe_version_id IS NOT NULL AND recipe_version_no IS NOT NULL AND recipe_version_no > 0)
  ),
  CONSTRAINT ck_sales_order_item_lock_version CHECK (lock_version > 0),
  CONSTRAINT ck_sales_order_item_cancel CHECK (
    status <> 'cancelled' OR
    (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL AND length(btrim(cancellation_reason)) >= 3)
  )
);
CREATE INDEX ix_sales_order_items_order ON public.sales_order_items (tenant_id, sales_order_id, line_no);
CREATE INDEX ix_sales_order_items_kitchen_queue ON public.sales_order_items (tenant_id, status, queued_at) WHERE requires_kitchen = true;
CREATE INDEX ix_sales_order_items_variant ON public.sales_order_items (tenant_id, menu_variant_id);

CREATE TABLE public.sales_order_item_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  sales_order_id uuid NOT NULL,
  sales_order_item_id uuid NOT NULL,
  from_status public.sales_order_item_status,
  to_status public.sales_order_item_status NOT NULL,
  changed_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reason text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_sales_item_history_order FOREIGN KEY (tenant_id, outlet_id, sales_order_id)
    REFERENCES public.sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_item_history_item FOREIGN KEY (tenant_id, sales_order_id, sales_order_item_id)
    REFERENCES public.sales_order_items(tenant_id, sales_order_id, id) ON DELETE RESTRICT
);
CREATE INDEX ix_sales_item_history_item_time ON public.sales_order_item_status_history (tenant_id, sales_order_item_id, changed_at DESC);
CREATE INDEX ix_sales_item_history_order_time ON public.sales_order_item_status_history (tenant_id, sales_order_id, changed_at DESC);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  sales_order_id uuid NOT NULL,
  original_payment_id uuid,
  entry_type public.pos_payment_entry_type NOT NULL DEFAULT 'payment',
  method public.pos_payment_method NOT NULL,
  status public.pos_payment_status NOT NULL,
  currency_code char(3) NOT NULL,
  amount_applied numeric(18,2) NOT NULL,
  amount_tendered numeric(18,2) NOT NULL,
  change_amount numeric(18,2) NOT NULL DEFAULT 0,
  external_reference varchar(150),
  reason text,
  paid_at timestamptz,
  voided_at timestamptz,
  cashier_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT uq_payments_scope_id UNIQUE (tenant_id, id),
  CONSTRAINT fk_payments_order FOREIGN KEY (tenant_id, outlet_id, sales_order_id)
    REFERENCES public.sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_payments_original FOREIGN KEY (tenant_id, original_payment_id)
    REFERENCES public.payments(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_payments_currency CHECK (currency_code = upper(currency_code)),
  CONSTRAINT ck_payments_amounts CHECK (amount_applied > 0 AND amount_tendered > 0 AND change_amount >= 0),
  CONSTRAINT ck_payments_external_reference CHECK (
    method = 'cash' OR (external_reference IS NOT NULL AND length(btrim(external_reference)) > 0)
  ),
  CONSTRAINT ck_payments_cash_change CHECK (
    method <> 'cash' OR (amount_tendered >= amount_applied AND change_amount = amount_tendered - amount_applied)
  ),
  CONSTRAINT ck_payments_external_amount CHECK (
    method = 'cash' OR (amount_tendered = amount_applied AND change_amount = 0)
  ),
  CONSTRAINT ck_payments_entry CHECK (
    (entry_type = 'payment' AND original_payment_id IS NULL AND status IN ('paid', 'voided')) OR
    (entry_type = 'manual_refund' AND original_payment_id IS NOT NULL AND status = 'voided' AND length(btrim(reason)) >= 3)
  ),
  CONSTRAINT ck_payments_timestamps CHECK (
    (status = 'paid' AND paid_at IS NOT NULL AND voided_at IS NULL) OR
    (status = 'voided' AND voided_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX uq_payments_order_entry ON public.payments (tenant_id, sales_order_id)
  WHERE entry_type = 'payment';
CREATE UNIQUE INDEX uq_payments_refund_original ON public.payments (tenant_id, original_payment_id)
  WHERE entry_type = 'manual_refund';
CREATE INDEX ix_payments_order ON public.payments (tenant_id, sales_order_id, created_at DESC);
CREATE INDEX ix_payments_reference ON public.payments (tenant_id, external_reference) WHERE external_reference IS NOT NULL;

CREATE TABLE public.sales_item_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  sales_order_id uuid NOT NULL,
  sales_order_item_id uuid NOT NULL,
  recipe_version_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  recipe_item_id uuid NOT NULL REFERENCES public.recipe_items(id) ON DELETE RESTRICT,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  ingredient_sku_snapshot varchar(50) NOT NULL,
  ingredient_name_snapshot varchar(150) NOT NULL,
  base_unit_code_snapshot varchar(20) NOT NULL,
  is_optional boolean NOT NULL DEFAULT false,
  required_base_quantity numeric(18,6) NOT NULL,
  consumed_base_quantity numeric(18,6) NOT NULL DEFAULT 0,
  status public.sales_consumption_status NOT NULL DEFAULT 'planned',
  skipped_reason varchar(80),
  stock_batch_id uuid REFERENCES public.stock_batches(id) ON DELETE RESTRICT,
  stock_movement_id uuid REFERENCES public.stock_movements(id) ON DELETE RESTRICT,
  stock_movement_line_id uuid REFERENCES public.stock_movement_lines(id) ON DELETE RESTRICT,
  reversal_stock_movement_line_id uuid REFERENCES public.stock_movement_lines(id) ON DELETE RESTRICT,
  unit_cost_snapshot numeric(18,6),
  value_snapshot numeric(18,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_consumptions_order FOREIGN KEY (tenant_id, outlet_id, sales_order_id)
    REFERENCES public.sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_sales_consumptions_item FOREIGN KEY (tenant_id, sales_order_id, sales_order_item_id)
    REFERENCES public.sales_order_items(tenant_id, sales_order_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_sales_consumption_required CHECK (required_base_quantity > 0),
  CONSTRAINT ck_sales_consumption_consumed CHECK (consumed_base_quantity >= 0),
  CONSTRAINT ck_sales_consumption_optional CHECK (
    (status = 'skipped_optional' AND is_optional = true AND consumed_base_quantity = 0 AND skipped_reason = 'OPTIONAL_ITEM_PHASE1') OR
    (status <> 'skipped_optional' AND is_optional = false)
  ),
  CONSTRAINT ck_sales_consumption_posted CHECK (
    status NOT IN ('posted', 'reversed') OR
    (stock_batch_id IS NOT NULL AND stock_movement_id IS NOT NULL AND stock_movement_line_id IS NOT NULL AND consumed_base_quantity > 0 AND unit_cost_snapshot IS NOT NULL AND value_snapshot IS NOT NULL)
  ),
  CONSTRAINT ck_sales_consumption_reversal CHECK (
    status <> 'reversed' OR reversal_stock_movement_line_id IS NOT NULL
  ),
  CONSTRAINT uq_sales_consumption_allocation UNIQUE (sales_order_item_id, recipe_item_id, stock_batch_id)
);
CREATE INDEX ix_sales_consumptions_order ON public.sales_item_consumptions (tenant_id, sales_order_id);
CREATE INDEX ix_sales_consumptions_item ON public.sales_item_consumptions (tenant_id, sales_order_item_id);
CREATE INDEX ix_sales_consumptions_movement ON public.sales_item_consumptions (tenant_id, stock_movement_id) WHERE stock_movement_id IS NOT NULL;
CREATE UNIQUE INDEX uq_sales_consumption_unallocated
  ON public.sales_item_consumptions (sales_order_item_id, recipe_item_id)
  WHERE stock_batch_id IS NULL;
CREATE UNIQUE INDEX uq_stock_movement_sales_order
  ON public.stock_movements (tenant_id, reference_id)
  WHERE reference_type = 'sales_order' AND movement_type = 'sale_consumption' AND status = 'posted';

CREATE TABLE public.pos_operation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  idempotency_key uuid NOT NULL,
  operation varchar(60) NOT NULL,
  request_hash char(64) NOT NULL,
  status public.pos_operation_status NOT NULL DEFAULT 'processing',
  sales_order_id uuid,
  payment_id uuid,
  response_status integer,
  response_body jsonb,
  error_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  lease_expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  completed_at timestamptz,
  CONSTRAINT uq_pos_operation_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT fk_pos_operations_order FOREIGN KEY (tenant_id, outlet_id, sales_order_id)
    REFERENCES public.sales_orders(tenant_id, outlet_id, id) ON DELETE RESTRICT,
  CONSTRAINT fk_pos_operations_payment FOREIGN KEY (tenant_id, payment_id)
    REFERENCES public.payments(tenant_id, id) ON DELETE RESTRICT,
  CONSTRAINT ck_pos_operation_name CHECK (length(btrim(operation)) > 0),
  CONSTRAINT ck_pos_operation_hash CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT ck_pos_operation_response CHECK (
    (status = 'processing' AND completed_at IS NULL) OR
    (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
  ),
  CONSTRAINT ck_pos_operation_lease CHECK (lease_expires_at > created_at)
);
CREATE INDEX ix_pos_operations_scope_time ON public.pos_operation_requests (tenant_id, outlet_id, created_at DESC);
CREATE INDEX ix_pos_operations_order ON public.pos_operation_requests (tenant_id, sales_order_id) WHERE sales_order_id IS NOT NULL;

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_item_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_item_consumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_operation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.sales_orders FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.sales_order_items FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.sales_order_item_status_history FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.payments FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.sales_item_consumptions FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.pos_operation_requests FOR ALL
  USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

COMMIT;
