-- Supplier Management Phase 1 and immutable PO display snapshots.
-- This migration deliberately does not update historical unit_price or
-- conversion_to_base values.
BEGIN;

ALTER TABLE public.supplier_ingredients
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.suppliers
    GROUP BY tenant_id, code HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Kode supplier duplikat harus diselesaikan sebelum migration';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.supplier_ingredients
    WHERE is_preferred = true AND is_active = true AND deleted_at IS NULL
    GROUP BY tenant_id, ingredient_id, purchase_unit_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Preferred catalog aktif duplikat harus diselesaikan sebelum migration';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppliers_tenant_code_permanent
  ON public.suppliers (tenant_id, code);

CREATE INDEX IF NOT EXISTS ix_suppliers_tenant_active
  ON public.suppliers (tenant_id, is_active);

CREATE INDEX IF NOT EXISTS ix_supplier_ingredients_supplier_active
  ON public.supplier_ingredients (tenant_id, supplier_id, is_active);

CREATE INDEX IF NOT EXISTS ix_supplier_ingredients_ingredient
  ON public.supplier_ingredients (tenant_id, ingredient_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_supplier_catalog_preferred_active
  ON public.supplier_ingredients (tenant_id, ingredient_id, purchase_unit_id)
  WHERE is_preferred = true AND is_active = true AND deleted_at IS NULL;

ALTER TABLE public.purchase_orders
  ADD COLUMN IF NOT EXISTS supplier_code_snapshot varchar(40),
  ADD COLUMN IF NOT EXISTS supplier_name_snapshot varchar(150),
  ADD COLUMN IF NOT EXISTS supplier_contact_name_snapshot varchar(120),
  ADD COLUMN IF NOT EXISTS supplier_phone_snapshot varchar(30),
  ADD COLUMN IF NOT EXISTS supplier_email_snapshot text,
  ADD COLUMN IF NOT EXISTS supplier_address_snapshot text,
  ADD COLUMN IF NOT EXISTS payment_term_days_snapshot integer,
  ADD COLUMN IF NOT EXISTS lead_time_days_snapshot integer;

ALTER TABLE public.purchase_order_items
  ADD COLUMN IF NOT EXISTS ingredient_sku_snapshot varchar(50),
  ADD COLUMN IF NOT EXISTS ingredient_name_snapshot varchar(150),
  ADD COLUMN IF NOT EXISTS supplier_catalog_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_sku_snapshot varchar(80),
  ADD COLUMN IF NOT EXISTS purchase_unit_code_snapshot varchar(20),
  ADD COLUMN IF NOT EXISTS purchase_unit_name_snapshot varchar(80),
  ADD COLUMN IF NOT EXISTS minimum_order_qty_snapshot numeric(18,3);

-- Backfill labels only. Historical price and conversion columns are untouched.
UPDATE public.purchase_orders po
SET supplier_code_snapshot = COALESCE(po.supplier_code_snapshot, s.code),
    supplier_name_snapshot = COALESCE(po.supplier_name_snapshot, s.name),
    supplier_contact_name_snapshot = COALESCE(po.supplier_contact_name_snapshot, s.contact_name),
    supplier_phone_snapshot = COALESCE(po.supplier_phone_snapshot, s.phone),
    supplier_email_snapshot = COALESCE(po.supplier_email_snapshot, s.email::text),
    supplier_address_snapshot = COALESCE(po.supplier_address_snapshot, s.address),
    payment_term_days_snapshot = COALESCE(po.payment_term_days_snapshot, s.payment_term_days),
    lead_time_days_snapshot = COALESCE(po.lead_time_days_snapshot, s.lead_time_days)
FROM public.suppliers s
WHERE s.id = po.supplier_id
  AND s.tenant_id = po.tenant_id
  AND (po.supplier_code_snapshot IS NULL OR po.supplier_name_snapshot IS NULL);

UPDATE public.purchase_order_items poi
SET ingredient_sku_snapshot = COALESCE(poi.ingredient_sku_snapshot, i.sku),
    ingredient_name_snapshot = COALESCE(poi.ingredient_name_snapshot, i.name),
    supplier_catalog_id = COALESCE(poi.supplier_catalog_id, si.id),
    supplier_sku_snapshot = COALESCE(poi.supplier_sku_snapshot, si.supplier_sku),
    purchase_unit_code_snapshot = COALESCE(poi.purchase_unit_code_snapshot, u.code),
    purchase_unit_name_snapshot = COALESCE(poi.purchase_unit_name_snapshot, u.name),
    minimum_order_qty_snapshot = COALESCE(
      poi.minimum_order_qty_snapshot,
      si.minimum_order_qty,
      0.001
    )
FROM public.purchase_orders po
JOIN public.ingredients i ON i.tenant_id = po.tenant_id
JOIN public.units u ON u.tenant_id = po.tenant_id
LEFT JOIN public.supplier_ingredients si
  ON si.tenant_id = po.tenant_id
 AND si.supplier_id = po.supplier_id
 AND si.ingredient_id = i.id
 AND si.purchase_unit_id = u.id
WHERE poi.purchase_order_id = po.id
  AND poi.tenant_id = po.tenant_id
  AND i.id = poi.ingredient_id
  AND u.id = poi.purchase_unit_id
  AND (
    poi.ingredient_sku_snapshot IS NULL OR
    poi.ingredient_name_snapshot IS NULL OR
    poi.purchase_unit_code_snapshot IS NULL OR
    poi.purchase_unit_name_snapshot IS NULL OR
    poi.minimum_order_qty_snapshot IS NULL
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.purchase_orders
    WHERE supplier_code_snapshot IS NULL OR supplier_name_snapshot IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill snapshot supplier PO belum lengkap';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.purchase_order_items
    WHERE ingredient_sku_snapshot IS NULL
       OR ingredient_name_snapshot IS NULL
       OR purchase_unit_code_snapshot IS NULL
       OR purchase_unit_name_snapshot IS NULL
       OR minimum_order_qty_snapshot IS NULL
  ) THEN
    RAISE EXCEPTION 'Backfill snapshot item PO belum lengkap';
  END IF;
END $$;

ALTER TABLE public.purchase_orders
  ALTER COLUMN supplier_code_snapshot SET NOT NULL,
  ALTER COLUMN supplier_name_snapshot SET NOT NULL;

ALTER TABLE public.purchase_order_items
  ALTER COLUMN ingredient_sku_snapshot SET NOT NULL,
  ALTER COLUMN ingredient_name_snapshot SET NOT NULL,
  ALTER COLUMN purchase_unit_code_snapshot SET NOT NULL,
  ALTER COLUMN purchase_unit_name_snapshot SET NOT NULL,
  ALTER COLUMN minimum_order_qty_snapshot SET NOT NULL;

ALTER TABLE public.purchase_orders
  DROP CONSTRAINT IF EXISTS ck_po_payment_term_snapshot,
  ADD CONSTRAINT ck_po_payment_term_snapshot
    CHECK (payment_term_days_snapshot IS NULL OR payment_term_days_snapshot >= 0),
  DROP CONSTRAINT IF EXISTS ck_po_lead_time_snapshot,
  ADD CONSTRAINT ck_po_lead_time_snapshot
    CHECK (lead_time_days_snapshot IS NULL OR lead_time_days_snapshot >= 0);

COMMIT;
