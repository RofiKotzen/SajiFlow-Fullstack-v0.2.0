-- Recipe & Food Cost Phase 1.
-- Creates stable recipe identities, immutable version costing snapshots, and
-- preserves every existing recipe id referenced by POS/KDS.
ALTER TYPE public.recipe_status ADD VALUE IF NOT EXISTS 'archived';

-- migrate:next-batch

-- PostgreSQL requires a newly added enum value to be committed before use.
-- All data backfill below remains one validated transaction.
BEGIN;

CREATE TABLE public.recipe_headers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  code varchar(50) NOT NULL,
  name varchar(150) NOT NULL,
  menu_variant_id uuid NOT NULL REFERENCES public.menu_variants(id) ON DELETE RESTRICT,
  current_approved_version_id uuid,
  is_archived boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  archived_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  archive_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ck_recipe_headers_archive CHECK (
    (is_archived = false AND archived_at IS NULL) OR
    (is_archived = true AND archived_at IS NOT NULL)
  )
);
CREATE UNIQUE INDEX uq_recipe_headers_tenant_code ON public.recipe_headers(tenant_id, code);
CREATE UNIQUE INDEX uq_recipe_headers_tenant_variant ON public.recipe_headers(tenant_id, menu_variant_id);
CREATE INDEX ix_recipe_headers_tenant_status ON public.recipe_headers(tenant_id, is_archived, updated_at DESC);

ALTER TABLE public.recipes
  ADD COLUMN recipe_header_id uuid,
  ADD COLUMN serving_count numeric(18,3),
  ADD COLUMN serving_size numeric(18,3),
  ADD COLUMN serving_unit_id uuid REFERENCES public.units(id) ON DELETE RESTRICT,
  ADD COLUMN production_instructions text,
  ADD COLUMN revision_of_id uuid REFERENCES public.recipes(id) ON DELETE RESTRICT,
  ADD COLUMN revision_reason text,
  ADD COLUMN approved_at timestamptz,
  ADD COLUMN approved_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN approved_outlet_id uuid REFERENCES public.outlets(id) ON DELETE RESTRICT,
  ADD COLUMN approved_costing_run_id uuid,
  ADD COLUMN costing_complete boolean NOT NULL DEFAULT false,
  ADD COLUMN costing_calculated_at timestamptz,
  ADD COLUMN is_legacy boolean NOT NULL DEFAULT false,
  ADD COLUMN lock_version integer NOT NULL DEFAULT 1;

-- Backfill one stable identity per tenant/menu variant. No cost or price is invented.
INSERT INTO public.recipe_headers (tenant_id, code, name, menu_variant_id, created_at, created_by, updated_at, updated_by)
SELECT r.tenant_id,
       left('RCP-' || regexp_replace(upper(m.sku || '-' || mv.code), '[^A-Z0-9_-]+', '-', 'g'), 41) || '-' || left(md5(r.menu_variant_id::text), 8),
       left(m.name || CASE WHEN mv.name <> '' THEN ' - ' || mv.name ELSE '' END, 150),
       r.menu_variant_id,
       min(r.created_at),
       (array_agg(r.created_by ORDER BY r.created_at ASC, r.id ASC)
         FILTER (WHERE r.created_by IS NOT NULL))[1],
       max(r.updated_at),
       (array_agg(r.updated_by ORDER BY r.updated_at DESC, r.id DESC)
         FILTER (WHERE r.updated_by IS NOT NULL))[1]
FROM public.recipes r
JOIN public.menu_variants mv ON mv.id = r.menu_variant_id AND mv.tenant_id = r.tenant_id
JOIN public.menus m ON m.id = mv.menu_id AND m.tenant_id = r.tenant_id
GROUP BY r.tenant_id, r.menu_variant_id, m.sku, m.name, mv.code, mv.name;

UPDATE public.recipes r
SET recipe_header_id = h.id,
    serving_count = COALESCE(r.serving_count, 1),
    serving_size = COALESCE(r.serving_size, r.yield_qty),
    serving_unit_id = COALESCE(r.serving_unit_id, r.yield_unit_id),
    is_legacy = true,
    costing_complete = false
FROM public.recipe_headers h
WHERE h.tenant_id = r.tenant_id AND h.menu_variant_id = r.menu_variant_id;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.recipes WHERE recipe_header_id IS NULL OR serving_count IS NULL OR serving_size IS NULL) THEN
    RAISE EXCEPTION 'Recipe legacy backfill incomplete';
  END IF;
END $$;

ALTER TABLE public.recipes
  ALTER COLUMN recipe_header_id SET NOT NULL,
  ALTER COLUMN serving_count SET NOT NULL,
  ALTER COLUMN serving_size SET NOT NULL,
  ADD CONSTRAINT fk_recipes_header FOREIGN KEY (recipe_header_id) REFERENCES public.recipe_headers(id) ON DELETE RESTRICT,
  ADD CONSTRAINT ck_recipes_serving_count CHECK (serving_count > 0),
  ADD CONSTRAINT ck_recipes_serving_size CHECK (serving_size > 0),
  ADD CONSTRAINT ck_recipes_lock_version CHECK (lock_version > 0);
-- Historical approvals have no trustworthy Phase-1 costing snapshot and cannot
-- become current for new transactions until revised and approved again.
UPDATE public.recipes SET status = 'archived' WHERE status = 'approved' AND is_legacy = true;
CREATE UNIQUE INDEX uq_recipe_header_version ON public.recipes(recipe_header_id, version_no);
CREATE UNIQUE INDEX uq_recipe_current_approved ON public.recipes(recipe_header_id) WHERE status = 'approved';
CREATE INDEX ix_recipes_tenant_header_status ON public.recipes(tenant_id, recipe_header_id, status);

ALTER TABLE public.recipe_items
  ADD COLUMN line_no integer,
  ADD COLUMN net_quantity numeric(18,6),
  ADD COLUMN gross_quantity numeric(18,6),
  ADD COLUMN conversion_to_base numeric(18,9),
  ADD COLUMN base_quantity numeric(18,6),
  ADD COLUMN ingredient_sku_snapshot varchar(50),
  ADD COLUMN ingredient_name_snapshot varchar(150),
  ADD COLUMN unit_code_snapshot varchar(20),
  ADD COLUMN unit_name_snapshot varchar(80),
  ADD COLUMN unit_dimension_snapshot public.unit_dimension,
  ADD COLUMN base_unit_code_snapshot varchar(20),
  ADD COLUMN base_unit_name_snapshot varchar(80);

WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY recipe_id ORDER BY created_at, id) line_no
  FROM public.recipe_items
)
UPDATE public.recipe_items ri
SET line_no = n.line_no,
    net_quantity = ri.quantity,
    gross_quantity = CASE WHEN ri.waste_percentage < 100 THEN ri.quantity / (1 - ri.waste_percentage / 100.0) END,
    conversion_to_base = CASE WHEN ri.unit_id = i.base_unit_id THEN 1 ELSE uc.factor END,
    base_quantity = CASE WHEN ri.waste_percentage < 100 AND (ri.unit_id = i.base_unit_id OR uc.factor IS NOT NULL)
      THEN (ri.quantity / (1 - ri.waste_percentage / 100.0)) * CASE WHEN ri.unit_id = i.base_unit_id THEN 1 ELSE uc.factor END END,
    ingredient_sku_snapshot = i.sku,
    ingredient_name_snapshot = i.name,
    unit_code_snapshot = u.code,
    unit_name_snapshot = u.name,
    unit_dimension_snapshot = u.dimension,
    base_unit_code_snapshot = bu.code,
    base_unit_name_snapshot = bu.name
FROM numbered n, public.ingredients i, public.units u, public.units bu
LEFT JOIN public.unit_conversions uc ON false
WHERE ri.id = n.id AND i.id = ri.ingredient_id AND u.id = ri.unit_id AND bu.id = i.base_unit_id;

-- Resolve non-base conversions separately to avoid guessing a conversion.
UPDATE public.recipe_items ri
SET conversion_to_base = uc.factor,
    gross_quantity = ri.net_quantity / (1 - ri.waste_percentage / 100.0),
    base_quantity = (ri.net_quantity / (1 - ri.waste_percentage / 100.0)) * uc.factor
FROM public.ingredients i, public.unit_conversions uc
WHERE i.id = ri.ingredient_id AND ri.unit_id <> i.base_unit_id
  AND uc.tenant_id = ri.tenant_id AND uc.from_unit_id = ri.unit_id
  AND uc.to_unit_id = i.base_unit_id AND uc.is_active = true;

-- Legacy lines with unavailable conversions stay readable and explicitly incomplete.
UPDATE public.recipes r SET costing_complete = false, is_legacy = true
WHERE EXISTS (SELECT 1 FROM public.recipe_items ri WHERE ri.recipe_id = r.id AND ri.base_quantity IS NULL);

ALTER TABLE public.recipe_items
  ALTER COLUMN line_no SET NOT NULL,
  ALTER COLUMN net_quantity SET NOT NULL,
  ALTER COLUMN gross_quantity SET NOT NULL,
  ADD CONSTRAINT ck_recipe_items_waste_phase1 CHECK (waste_percentage >= 0 AND waste_percentage < 100),
  ADD CONSTRAINT ck_recipe_items_net_quantity CHECK (net_quantity > 0),
  ADD CONSTRAINT ck_recipe_items_gross_quantity CHECK (gross_quantity > 0),
  ADD CONSTRAINT ck_recipe_items_base_quantity CHECK (base_quantity IS NULL OR base_quantity > 0),
  ADD CONSTRAINT ck_recipe_items_conversion CHECK (conversion_to_base IS NULL OR conversion_to_base > 0);
CREATE UNIQUE INDEX uq_recipe_item_line ON public.recipe_items(recipe_id, line_no);

ALTER TABLE public.supplier_ingredients ADD COLUMN currency_code char(3);
UPDATE public.supplier_ingredients si SET currency_code = t.currency_code
FROM public.tenants t WHERE t.id = si.tenant_id AND si.currency_code IS NULL;
ALTER TABLE public.supplier_ingredients ALTER COLUMN currency_code SET NOT NULL;
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public.supplier_ingredients
    WHERE is_preferred = true AND is_active = true AND deleted_at IS NULL
    GROUP BY tenant_id, ingredient_id HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Preferred catalog aktif ganda harus diselesaikan sebelum Recipe Phase 1';
  END IF;
END $$;
CREATE UNIQUE INDEX uq_supplier_catalog_single_preferred
  ON public.supplier_ingredients(tenant_id, ingredient_id)
  WHERE is_preferred = true AND is_active = true AND deleted_at IS NULL;

CREATE TABLE public.recipe_costing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  run_type varchar(24) NOT NULL,
  status varchar(16) NOT NULL,
  currency_code char(3) NOT NULL,
  selling_price_snapshot numeric(18,2),
  total_recipe_cost numeric(18,2),
  cost_per_yield numeric(18,6),
  cost_per_serving numeric(18,2),
  food_cost_percentage numeric(9,4),
  gross_profit numeric(18,2),
  gross_margin_percentage numeric(9,4),
  warning_codes jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  source_version_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ck_recipe_costing_run_type CHECK (run_type IN ('estimate','approval_snapshot')),
  CONSTRAINT ck_recipe_costing_status CHECK (status IN ('complete','incomplete'))
);
CREATE INDEX ix_recipe_costing_lookup ON public.recipe_costing_runs(tenant_id, recipe_id, outlet_id, calculated_at DESC);

CREATE TABLE public.recipe_costing_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  costing_run_id uuid NOT NULL REFERENCES public.recipe_costing_runs(id) ON DELETE RESTRICT,
  recipe_item_id uuid NOT NULL REFERENCES public.recipe_items(id) ON DELETE RESTRICT,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  line_no integer NOT NULL,
  ingredient_sku_snapshot varchar(50) NOT NULL,
  ingredient_name_snapshot varchar(150) NOT NULL,
  unit_code_snapshot varchar(20) NOT NULL,
  base_unit_code_snapshot varchar(20) NOT NULL,
  net_quantity numeric(18,6) NOT NULL,
  waste_percentage numeric(5,2) NOT NULL,
  gross_quantity numeric(18,6) NOT NULL,
  conversion_to_base numeric(18,9) NOT NULL,
  base_quantity numeric(18,6) NOT NULL,
  cost_source varchar(32) NOT NULL,
  cost_per_base_unit numeric(18,6),
  total_cost numeric(18,2),
  currency_code char(3) NOT NULL,
  inventory_source_at timestamptz,
  inventory_batch_ids jsonb,
  supplier_catalog_id uuid REFERENCES public.supplier_ingredients(id) ON DELETE RESTRICT,
  supplier_source_at timestamptz,
  warning_code varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_recipe_cost_source CHECK (cost_source IN ('inventory_weighted_average','preferred_supplier','missing'))
);
CREATE UNIQUE INDEX uq_recipe_costing_line ON public.recipe_costing_lines(costing_run_id, recipe_item_id);

ALTER TABLE public.recipes
  ADD CONSTRAINT fk_recipes_approved_costing FOREIGN KEY (approved_costing_run_id) REFERENCES public.recipe_costing_runs(id) ON DELETE RESTRICT;
ALTER TABLE public.recipe_headers
  ADD CONSTRAINT fk_recipe_headers_current_approved FOREIGN KEY (current_approved_version_id) REFERENCES public.recipes(id) ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION public.guard_recipe_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.status = 'approved' THEN RAISE EXCEPTION 'Approved recipe version is immutable'; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' THEN
    IF NEW.status = 'archived' AND
       (to_jsonb(NEW) - ARRAY['status','effective_until','updated_at','updated_by']) =
       (to_jsonb(OLD) - ARRAY['status','effective_until','updated_at','updated_by']) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Approved recipe version is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_recipe_immutable BEFORE UPDATE OR DELETE ON public.recipes
FOR EACH ROW EXECUTE FUNCTION public.guard_recipe_immutable();

CREATE OR REPLACE FUNCTION public.guard_approved_costing_run_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Approved costing snapshot is immutable';
END $$;
CREATE TRIGGER trg_costing_run_immutable BEFORE UPDATE OR DELETE ON public.recipe_costing_runs
FOR EACH ROW WHEN (OLD.run_type = 'approval_snapshot') EXECUTE FUNCTION public.guard_approved_costing_run_immutable();
CREATE OR REPLACE FUNCTION public.guard_approved_costing_line_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.recipe_costing_runs r WHERE r.id = OLD.costing_run_id AND r.run_type = 'approval_snapshot') THEN
    RAISE EXCEPTION 'Approved costing line is immutable';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER trg_costing_line_immutable BEFORE UPDATE OR DELETE ON public.recipe_costing_lines
FOR EACH ROW EXECUTE FUNCTION public.guard_approved_costing_line_immutable();

ALTER TABLE public.recipe_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_costing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_costing_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.recipe_headers FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.recipe_costing_runs FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());
CREATE POLICY tenant_isolation ON public.recipe_costing_lines FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id());

COMMIT;
