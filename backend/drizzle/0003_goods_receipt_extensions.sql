-- Goods Receipt Phase 1 extensions.
-- The initial schema already contains GR and stock-ledger tables; these fields
-- preserve supplier document references and rejected quantities.

ALTER TABLE public.goods_receipts
  ADD COLUMN IF NOT EXISTS supplier_invoice_no varchar(80);

ALTER TABLE public.goods_receipt_items
  ADD COLUMN IF NOT EXISTS quantity_rejected numeric(18,3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejection_reason varchar(500);

DO $$
BEGIN
  ALTER TABLE public.goods_receipt_items
    ADD CONSTRAINT ck_goods_receipt_items_quantity_rejected
    CHECK (quantity_rejected >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.goods_receipt_items
    ADD CONSTRAINT ck_goods_receipt_items_rejection_reason
    CHECK (quantity_rejected = 0 OR length(trim(rejection_reason)) >= 3);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON COLUMN public.goods_receipts.supplier_invoice_no
  IS 'Nomor invoice supplier yang menyertai penerimaan.';
COMMENT ON COLUMN public.goods_receipt_items.quantity_rejected
  IS 'Jumlah ditolak dalam purchase unit; tidak menambah stok atau kuantitas diterima PO.';
COMMENT ON COLUMN public.goods_receipt_items.rejection_reason
  IS 'Alasan penolakan jika quantity_rejected lebih dari nol.';
