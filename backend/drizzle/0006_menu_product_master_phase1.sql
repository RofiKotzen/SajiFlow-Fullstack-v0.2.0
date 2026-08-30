-- Menu & Product Master Phase 1.
-- Preserves every menu_variant id and all historical foreign keys.
BEGIN;

DO $$
DECLARE conflicts text;
BEGIN
  SELECT string_agg(format('tenant=%s sku=%s ids=%s', tenant_id, normalized, ids), E'\n')
  INTO conflicts
  FROM (
    SELECT tenant_id, upper(btrim(code)) normalized,
           string_agg(id::text, ',' ORDER BY id) ids
    FROM public.menu_variants
    GROUP BY tenant_id, upper(btrim(code))
    HAVING count(*) > 1
  ) duplicate_variants;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = '0006 aborted: duplicate legacy menu variant SKU values require manual review; no IDs were changed.',
      DETAIL = conflicts;
  END IF;

  SELECT string_agg(format('tenant=%s code=%s ids=%s', tenant_id, normalized, ids), E'\n')
  INTO conflicts
  FROM (
    SELECT tenant_id, upper(btrim(sku)) normalized,
           string_agg(id::text, ',' ORDER BY id) ids
    FROM public.menus
    GROUP BY tenant_id, upper(btrim(sku))
    HAVING count(*) > 1
  ) duplicate_menus;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = '0006 aborted: duplicate legacy menu codes require manual review.',
      DETAIL = conflicts;
  END IF;

  SELECT string_agg(format('tenant=%s name=%s ids=%s', tenant_id, normalized, ids), E'\n')
  INTO conflicts
  FROM (
    SELECT tenant_id, lower(btrim(name)) normalized,
           string_agg(id::text, ',' ORDER BY id) ids
    FROM public.menu_categories
    GROUP BY tenant_id, lower(btrim(name))
    HAVING count(*) > 1
  ) duplicate_categories;
  IF conflicts IS NOT NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = '0006 aborted: duplicate legacy menu category names require manual review.',
      DETAIL = conflicts;
  END IF;
END $$;

ALTER TABLE public.menu_categories
  ADD COLUMN IF NOT EXISTS code varchar(40),
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;

UPDATE public.menu_categories
SET code = 'CAT-' || upper(substr(replace(id::text, '-', ''), 1, 12))
WHERE code IS NULL;

ALTER TABLE public.menu_categories ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.menu_categories
  DROP CONSTRAINT IF EXISTS ck_menu_categories_display_order,
  DROP CONSTRAINT IF EXISTS ck_menu_categories_lock_version,
  ADD CONSTRAINT ck_menu_categories_display_order CHECK (display_order >= 0),
  ADD CONSTRAINT ck_menu_categories_lock_version CHECK (lock_version > 0);

ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;
ALTER TABLE public.menus
  DROP CONSTRAINT IF EXISTS ck_menus_lock_version,
  ADD CONSTRAINT ck_menus_lock_version CHECK (lock_version > 0);

ALTER TABLE public.menu_variants
  ADD COLUMN IF NOT EXISTS currency_code char(3),
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_recipe boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;

UPDATE public.menu_variants mv
SET currency_code = t.currency_code,
    requires_recipe = (m.item_type = 'recipe')
FROM public.tenants t, public.menus m
WHERE mv.tenant_id = t.id AND mv.menu_id = m.id
  AND (mv.currency_code IS NULL OR mv.requires_recipe IS NULL);

ALTER TABLE public.menu_variants ALTER COLUMN currency_code SET NOT NULL;
ALTER TABLE public.menu_variants
  DROP CONSTRAINT IF EXISTS ck_menu_variants_currency_code,
  DROP CONSTRAINT IF EXISTS ck_menu_variants_display_order,
  DROP CONSTRAINT IF EXISTS ck_menu_variants_lock_version,
  ADD CONSTRAINT ck_menu_variants_currency_code CHECK (currency_code = upper(currency_code)),
  ADD CONSTRAINT ck_menu_variants_display_order CHECK (display_order >= 0),
  ADD CONSTRAINT ck_menu_variants_lock_version CHECK (lock_version > 0);

CREATE TABLE IF NOT EXISTS public.menu_variant_outlet_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE RESTRICT,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  menu_variant_id uuid NOT NULL REFERENCES public.menu_variants(id) ON DELETE RESTRICT,
  is_available boolean NOT NULL DEFAULT true,
  price_override numeric(18,2),
  is_active boolean NOT NULL DEFAULT true,
  lock_version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT ck_menu_variant_outlet_price CHECK (price_override IS NULL OR price_override >= 0),
  CONSTRAINT ck_menu_variant_outlet_lock_version CHECK (lock_version > 0),
  CONSTRAINT uq_menu_variant_outlet_setting UNIQUE (tenant_id, outlet_id, menu_variant_id)
);

-- Idempotent compatibility backfill. No variant is merged, renamed, or re-keyed.
INSERT INTO public.menu_variant_outlet_settings
  (tenant_id, outlet_id, menu_variant_id, is_available, is_active, created_at, updated_at, created_by, updated_by)
SELECT mv.tenant_id, mv.outlet_id, mv.id, mv.is_active, true,
       coalesce(mv.created_at, now()), coalesce(mv.updated_at, now()), mv.created_by, mv.updated_by
FROM public.menu_variants mv
WHERE mv.outlet_id IS NOT NULL
ON CONFLICT (tenant_id, outlet_id, menu_variant_id) DO NOTHING;

DROP INDEX IF EXISTS public.uq_menus_tenant_sku;
CREATE UNIQUE INDEX uq_menus_tenant_code_ci
  ON public.menus (tenant_id, upper(btrim(sku)));
CREATE UNIQUE INDEX uq_menu_categories_tenant_code_ci
  ON public.menu_categories (tenant_id, upper(btrim(code)));
CREATE UNIQUE INDEX uq_menu_categories_tenant_name_ci
  ON public.menu_categories (tenant_id, lower(btrim(name)));
CREATE UNIQUE INDEX uq_menu_variants_tenant_sku_ci
  ON public.menu_variants (tenant_id, upper(btrim(code)));
CREATE UNIQUE INDEX uq_menu_variants_default_active
  ON public.menu_variants (tenant_id, menu_id)
  WHERE is_default = true AND is_active = true;
CREATE INDEX ix_menu_categories_tenant_active_order
  ON public.menu_categories (tenant_id, is_active, display_order);
CREATE INDEX ix_menu_variants_tenant_menu_active_order
  ON public.menu_variants (tenant_id, menu_id, is_active, display_order);
CREATE INDEX ix_menu_variant_outlet_lookup
  ON public.menu_variant_outlet_settings (tenant_id, outlet_id, is_active, is_available);

ALTER TABLE public.menu_categories
  ADD CONSTRAINT fk_menu_categories_archived_by FOREIGN KEY (archived_by)
  REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.menus
  ADD CONSTRAINT fk_menus_archived_by FOREIGN KEY (archived_by)
  REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.menu_variants
  ADD CONSTRAINT fk_menu_variants_archived_by FOREIGN KEY (archived_by)
  REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.menu_variant_outlet_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.menu_variant_outlet_settings;
CREATE POLICY tenant_isolation ON public.menu_variant_outlet_settings
  FOR ALL USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

COMMENT ON COLUMN public.menu_variants.outlet_id IS
  'Deprecated in Phase 1. Compatibility only; new reads use menu_variant_outlet_settings.';

COMMIT;
