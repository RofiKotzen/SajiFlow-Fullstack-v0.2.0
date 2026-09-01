BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.unit_conversions
    GROUP BY tenant_id, from_unit_id, to_unit_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0008 aborted: duplicate unit conversion pairs require manual review';
  END IF;
END $$;

ALTER TABLE public.unit_conversions
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.unit_conversions
  ADD CONSTRAINT ck_unit_conversions_factor_positive CHECK (factor > 0),
  ADD CONSTRAINT ck_unit_conversions_distinct_units CHECK (from_unit_id <> to_unit_id),
  ADD CONSTRAINT ck_unit_conversions_lock_version CHECK (lock_version > 0);

CREATE UNIQUE INDEX uq_unit_conversions_tenant_pair
  ON public.unit_conversions (tenant_id, from_unit_id, to_unit_id);
CREATE INDEX ix_unit_conversions_resolver
  ON public.unit_conversions (tenant_id, from_unit_id, to_unit_id, is_active);

ALTER TABLE public.ingredient_categories
  ADD COLUMN IF NOT EXISTS code varchar(40),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lock_version integer NOT NULL DEFAULT 1;

WITH normalized AS (
  SELECT id, tenant_id,
    left(coalesce(nullif(trim(both '-' from regexp_replace(upper(name), '[^A-Z0-9]+', '-', 'g')), ''), 'CATEGORY'), 40) AS base_code,
    count(*) OVER (
      PARTITION BY tenant_id, left(coalesce(nullif(trim(both '-' from regexp_replace(upper(name), '[^A-Z0-9]+', '-', 'g')), ''), 'CATEGORY'), 40)
    ) AS collision_count
  FROM public.ingredient_categories
  WHERE code IS NULL
), generated AS (
  SELECT id,
    CASE WHEN collision_count = 1 THEN base_code
      ELSE left(base_code, 31) || '-' || left(replace(id::text, '-', ''), 8)
    END AS generated_code
  FROM normalized
)
UPDATE public.ingredient_categories c
SET code = g.generated_code
FROM generated g
WHERE c.id = g.id AND c.code IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.ingredient_categories WHERE code IS NULL) THEN
    RAISE EXCEPTION '0008 aborted: ingredient category code backfill incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.ingredient_categories WHERE deleted_at IS NULL
    GROUP BY tenant_id, code HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION '0008 aborted: generated ingredient category codes collide';
  END IF;
END $$;

ALTER TABLE public.ingredient_categories
  ALTER COLUMN code SET NOT NULL,
  ALTER COLUMN code SET DEFAULT ('CATEGORY-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  ADD CONSTRAINT ck_ingredient_categories_display_order CHECK (display_order >= 0),
  ADD CONSTRAINT ck_ingredient_categories_lock_version CHECK (lock_version > 0);

CREATE UNIQUE INDEX uq_ingredient_categories_tenant_code
  ON public.ingredient_categories (tenant_id, code)
  WHERE deleted_at IS NULL;
CREATE INDEX ix_ingredient_categories_tenant_order
  ON public.ingredient_categories (tenant_id, display_order, name);

COMMIT;
