-- ============================================================================
-- SAJI FLOW — INITIAL DATABASE SCHEMA v1.1
-- Target       : PostgreSQL 16+ / Supabase
-- Generated    : 2026-08-26
-- Source       : SajiFlow Data Dictionary v1.0
-- Scope        : 69 physical tables + 1 materialized reporting view
-- IMPORTANT    : Run once on a clean database as an initial migration.
--                All timestamps are stored in UTC; application displays outlet timezone.
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS public;

-- ---------------------------------------------------------------------------
-- ENUM TYPES
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  CREATE TYPE public."tenant_status" AS ENUM ('active', 'trial', 'suspended', 'terminated');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."user_status" AS ENUM ('invited', 'active', 'suspended', 'disabled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."unit_dimension" AS ENUM ('mass', 'volume', 'count', 'length');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."valuation_method" AS ENUM ('weighted_average', 'fifo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."menu_item_type" AS ENUM ('recipe', 'retail', 'service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."recipe_status" AS ENUM ('draft', 'approved', 'retired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."modifier_selection" AS ENUM ('single', 'multiple');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."budget_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."budget_category" AS ENUM ('purchase', 'operational', 'maintenance', 'marketing', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."purchase_request_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'converted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."purchase_order_status" AS ENUM ('draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."goods_receipt_status" AS ENUM ('draft', 'posted', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."storage_location_type" AS ENUM ('storage', 'kitchen', 'bar', 'chiller', 'freezer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."stock_movement_type" AS ENUM ('receipt', 'sale_consumption', 'transfer_out', 'transfer_in', 'waste', 'opname_adjustment', 'reversal');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."stock_movement_status" AS ENUM ('posted', 'reversed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."stock_opname_status" AS ENUM ('draft', 'counting', 'submitted', 'approved', 'rejected', 'posted', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."stock_transfer_status" AS ENUM ('draft', 'requested', 'approved', 'in_transit', 'received', 'rejected', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."waste_status" AS ENUM ('draft', 'submitted', 'approved', 'rejected', 'posted', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."table_status" AS ENUM ('available', 'reserved', 'occupied', 'cleaning', 'out_of_service');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."reservation_status" AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."reservation_source" AS ENUM ('walk_in', 'phone', 'whatsapp', 'web', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."deposit_status" AS ENUM ('pending', 'paid', 'applied', 'refunded', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."payment_method_type" AS ENUM ('cash', 'card', 'qris', 'transfer', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."service_base" AS ENUM ('subtotal_after_discount', 'subtotal_before_discount');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."discount_type" AS ENUM ('percentage', 'fixed', 'open');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."cash_session_status" AS ENUM ('open', 'closing_review', 'closed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."cash_movement_type" AS ENUM ('cash_in', 'cash_out');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."order_type" AS ENUM ('dine_in', 'takeaway', 'delivery');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."order_status" AS ENUM ('draft', 'submitted', 'in_preparation', 'ready', 'served', 'awaiting_payment', 'paid', 'completed', 'cancelled', 'void');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."order_item_status" AS ENUM ('pending', 'sent', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."payment_type" AS ENUM ('payment', 'refund');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."payment_status" AS ENUM ('pending', 'authorized', 'captured', 'failed', 'voided', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."kitchen_ticket_status" AS ENUM ('queued', 'preparing', 'ready', 'served', 'held', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."kitchen_item_status" AS ENUM ('queued', 'preparing', 'ready', 'served', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public."ticket_priority" AS ENUM ('normal', 'rush', 'vip');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- TABLES
-- Foreign keys are added later so cyclic references remain valid.
-- ---------------------------------------------------------------------------

-- Core: Organisasi pelanggan Saji Flow.
CREATE TABLE IF NOT EXISTS public."tenants" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar(30) NOT NULL UNIQUE,
  "name" varchar(150) NOT NULL,
  "timezone" varchar(50) NOT NULL DEFAULT 'Asia/Jakarta',
  "currency_code" char(3) NOT NULL DEFAULT 'IDR',
  "status" public."tenant_status" NOT NULL DEFAULT 'active',
  "subscription_start_at" timestamptz,
  "subscription_end_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_tenants" PRIMARY KEY ("id"),
  CONSTRAINT "ck_tenants_code" CHECK ("code" = upper("code") AND "code" ~ '^[A-Z0-9_-]+$'),
  CONSTRAINT "ck_tenants_currency_code" CHECK ("currency_code" = upper("currency_code") AND "currency_code" ~ '^[A-Z]{3}$'),
  CONSTRAINT "ck_tenants_subscription_period" CHECK ("subscription_end_at" IS NULL OR "subscription_start_at" IS NULL OR "subscription_end_at" > "subscription_start_at")
);
COMMENT ON TABLE public."tenants" IS 'Core — Organisasi pelanggan Saji Flow.';
COMMENT ON COLUMN public."tenants"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."tenants"."code" IS 'Kode tenant untuk identifikasi internal.';
COMMENT ON COLUMN public."tenants"."name" IS 'Nama legal atau nama usaha.';
COMMENT ON COLUMN public."tenants"."timezone" IS 'Zona waktu operasional IANA.';
COMMENT ON COLUMN public."tenants"."currency_code" IS 'Mata uang dasar tenant.';
COMMENT ON COLUMN public."tenants"."status" IS 'Status akses tenant. Business rule: CORE-BR-003.';
COMMENT ON COLUMN public."tenants"."subscription_start_at" IS 'Awal masa langganan.';
COMMENT ON COLUMN public."tenants"."subscription_end_at" IS 'Akhir masa langganan.';
COMMENT ON COLUMN public."tenants"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."tenants"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."tenants"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."tenants"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."tenants"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."tenants"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Core: Cabang atau unit operasi milik tenant.
CREATE TABLE IF NOT EXISTS public."outlets" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(30) NOT NULL,
  "name" varchar(150) NOT NULL,
  "address" text,
  "phone" varchar(30),
  "timezone" varchar(50) NOT NULL DEFAULT 'Asia/Jakarta',
  "business_day_cutoff" time NOT NULL DEFAULT '04:00',
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_outlets" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."outlets" IS 'Core — Cabang atau unit operasi milik tenant.';
COMMENT ON COLUMN public."outlets"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."outlets"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."outlets"."code" IS 'Kode outlet. Validation: Unik per tenant.';
COMMENT ON COLUMN public."outlets"."name" IS 'Nama outlet.';
COMMENT ON COLUMN public."outlets"."address" IS 'Alamat lengkap outlet.';
COMMENT ON COLUMN public."outlets"."phone" IS 'Nomor kontak outlet.';
COMMENT ON COLUMN public."outlets"."timezone" IS 'Zona waktu outlet.';
COMMENT ON COLUMN public."outlets"."business_day_cutoff" IS 'Batas pergantian business date. Business rule: CORE-BR-004.';
COMMENT ON COLUMN public."outlets"."is_active" IS 'Status penggunaan outlet.';
COMMENT ON COLUMN public."outlets"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."outlets"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."outlets"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."outlets"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."outlets"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."outlets"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Core: Akun pengguna aplikasi.
CREATE TABLE IF NOT EXISTS public."users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "auth_user_id" uuid NOT NULL UNIQUE,
  "employee_code" varchar(40),
  "full_name" varchar(150) NOT NULL,
  "email" citext NOT NULL UNIQUE,
  "phone" varchar(30),
  "status" public."user_status" NOT NULL DEFAULT 'invited',
  "last_login_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_users" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."users" IS 'Core — Akun pengguna aplikasi.';
COMMENT ON COLUMN public."users"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."users"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."users"."auth_user_id" IS 'Referensi ke penyedia autentikasi.';
COMMENT ON COLUMN public."users"."employee_code" IS 'Kode karyawan tenant.';
COMMENT ON COLUMN public."users"."full_name" IS 'Nama lengkap pengguna.';
COMMENT ON COLUMN public."users"."email" IS 'Email login/notifikasi.';
COMMENT ON COLUMN public."users"."phone" IS 'Nomor telepon.';
COMMENT ON COLUMN public."users"."status" IS 'Status siklus akun.';
COMMENT ON COLUMN public."users"."last_login_at" IS 'Login terakhir.';
COMMENT ON COLUMN public."users"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."users"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."users"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."users"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."users"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."users"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Core: Peran RBAC per tenant.
CREATE TABLE IF NOT EXISTS public."roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(50) NOT NULL,
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_system" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_roles" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."roles" IS 'Core — Peran RBAC per tenant.';
COMMENT ON COLUMN public."roles"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."roles"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."roles"."code" IS 'Kode peran. Validation: Unik per tenant.';
COMMENT ON COLUMN public."roles"."name" IS 'Nama peran.';
COMMENT ON COLUMN public."roles"."description" IS 'Lingkup tanggung jawab.';
COMMENT ON COLUMN public."roles"."is_system" IS 'Peran bawaan tidak dapat dihapus.';
COMMENT ON COLUMN public."roles"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."roles"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."roles"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."roles"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."roles"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."roles"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Core: Daftar izin aksi sistem.
CREATE TABLE IF NOT EXISTS public."permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" varchar(100) NOT NULL UNIQUE,
  "module" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_permissions" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."permissions" IS 'Core — Daftar izin aksi sistem.';
COMMENT ON COLUMN public."permissions"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."permissions"."code" IS 'Kode izin berbentuk resource.action.';
COMMENT ON COLUMN public."permissions"."module" IS 'Modul pemilik izin.';
COMMENT ON COLUMN public."permissions"."description" IS 'Penjelasan izin.';
COMMENT ON COLUMN public."permissions"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."permissions"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."permissions"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."permissions"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Core: Penugasan peran pengguna per outlet.
CREATE TABLE IF NOT EXISTS public."user_roles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "outlet_id" uuid,
  "valid_from" timestamptz NOT NULL DEFAULT now(),
  "valid_until" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_user_roles" PRIMARY KEY ("id"),
  CONSTRAINT "ck_user_roles_valid_period" CHECK ("valid_until" IS NULL OR "valid_until" > "valid_from")
);
COMMENT ON TABLE public."user_roles" IS 'Core — Penugasan peran pengguna per outlet.';
COMMENT ON COLUMN public."user_roles"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."user_roles"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."user_roles"."user_id" IS 'Pengguna penerima peran.';
COMMENT ON COLUMN public."user_roles"."role_id" IS 'Peran yang diberikan.';
COMMENT ON COLUMN public."user_roles"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."user_roles"."valid_from" IS 'Mulai berlaku.';
COMMENT ON COLUMN public."user_roles"."valid_until" IS 'Akhir berlaku; NULL tanpa batas.';
COMMENT ON COLUMN public."user_roles"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."user_roles"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."user_roles"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."user_roles"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Core: Pemetaan izin ke peran.
CREATE TABLE IF NOT EXISTS public."role_permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "role_id" uuid NOT NULL,
  "permission_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_role_permissions" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."role_permissions" IS 'Core — Pemetaan izin ke peran.';
COMMENT ON COLUMN public."role_permissions"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."role_permissions"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."role_permissions"."role_id" IS 'Peran.';
COMMENT ON COLUMN public."role_permissions"."permission_id" IS 'Izin.';
COMMENT ON COLUMN public."role_permissions"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."role_permissions"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."role_permissions"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."role_permissions"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Core: Jejak perubahan dan aksi berisiko.
CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid,
  "actor_user_id" uuid,
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(80) NOT NULL,
  "entity_id" uuid,
  "before_data" jsonb,
  "after_data" jsonb,
  "reason" text,
  "ip_address" inet,
  "user_agent" text,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."audit_logs" IS 'Core — Jejak perubahan dan aksi berisiko.';
COMMENT ON COLUMN public."audit_logs"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."audit_logs"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."audit_logs"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."audit_logs"."actor_user_id" IS 'Pelaku; NULL untuk proses sistem.';
COMMENT ON COLUMN public."audit_logs"."action" IS 'Aksi yang dilakukan.';
COMMENT ON COLUMN public."audit_logs"."entity_type" IS 'Nama entitas.';
COMMENT ON COLUMN public."audit_logs"."entity_id" IS 'ID entitas terdampak.';
COMMENT ON COLUMN public."audit_logs"."before_data" IS 'Snapshot sebelum perubahan.';
COMMENT ON COLUMN public."audit_logs"."after_data" IS 'Snapshot sesudah perubahan.';
COMMENT ON COLUMN public."audit_logs"."reason" IS 'Alasan aksi bila diwajibkan.';
COMMENT ON COLUMN public."audit_logs"."ip_address" IS 'Alamat IP pelaku.';
COMMENT ON COLUMN public."audit_logs"."user_agent" IS 'Informasi perangkat/browser.';
COMMENT ON COLUMN public."audit_logs"."occurred_at" IS 'Waktu kejadian (UTC).';

-- Core: Nomor dokumen berurutan per outlet dan business date.
CREATE TABLE IF NOT EXISTS public."document_sequences" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "document_type" varchar(40) NOT NULL,
  "business_date" date NOT NULL,
  "last_number" bigint NOT NULL DEFAULT 0,
  "prefix_pattern" varchar(80) NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_document_sequences" PRIMARY KEY ("id"),
  CONSTRAINT "ck_document_sequences_last_number" CHECK ("last_number" >= 0)
);
COMMENT ON TABLE public."document_sequences" IS 'Core — Nomor dokumen berurutan per outlet dan business date.';
COMMENT ON COLUMN public."document_sequences"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."document_sequences"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."document_sequences"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."document_sequences"."document_type" IS 'Jenis nomor dokumen.';
COMMENT ON COLUMN public."document_sequences"."business_date" IS 'Tanggal bisnis sequence.';
COMMENT ON COLUMN public."document_sequences"."last_number" IS 'Nomor terakhir terpakai.';
COMMENT ON COLUMN public."document_sequences"."prefix_pattern" IS 'Pola prefix nomor.';
COMMENT ON COLUMN public."document_sequences"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."document_sequences"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."document_sequences"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."document_sequences"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Master Bahan: Satuan ukuran dan klasifikasinya.
CREATE TABLE IF NOT EXISTS public."units" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(20) NOT NULL,
  "name" varchar(80) NOT NULL,
  "dimension" public."unit_dimension" NOT NULL,
  "is_base" boolean NOT NULL DEFAULT false,
  "decimal_scale" smallint NOT NULL DEFAULT 3,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_units" PRIMARY KEY ("id"),
  CONSTRAINT "ck_units_decimal_scale" CHECK ("decimal_scale" BETWEEN 0 AND 6)
);
COMMENT ON TABLE public."units" IS 'Master Bahan — Satuan ukuran dan klasifikasinya.';
COMMENT ON COLUMN public."units"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."units"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."units"."code" IS 'Kode satuan. Validation: Unik per tenant.';
COMMENT ON COLUMN public."units"."name" IS 'Nama satuan.';
COMMENT ON COLUMN public."units"."dimension" IS 'Dimensi pengukuran.';
COMMENT ON COLUMN public."units"."is_base" IS 'Satuan dasar dalam dimensi.';
COMMENT ON COLUMN public."units"."decimal_scale" IS 'Jumlah angka desimal yang diizinkan.';
COMMENT ON COLUMN public."units"."is_active" IS 'Status satuan.';
COMMENT ON COLUMN public."units"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."units"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."units"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."units"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."units"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."units"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Bahan: Faktor konversi antar satuan dalam dimensi sama.
CREATE TABLE IF NOT EXISTS public."unit_conversions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "from_unit_id" uuid NOT NULL,
  "to_unit_id" uuid NOT NULL,
  "factor" numeric(18,6) NOT NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_unit_conversions" PRIMARY KEY ("id"),
  CONSTRAINT "ck_unit_conversions_factor" CHECK ("factor" > 0)
);
COMMENT ON TABLE public."unit_conversions" IS 'Master Bahan — Faktor konversi antar satuan dalam dimensi sama.';
COMMENT ON COLUMN public."unit_conversions"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."unit_conversions"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."unit_conversions"."from_unit_id" IS 'Satuan asal.';
COMMENT ON COLUMN public."unit_conversions"."to_unit_id" IS 'Satuan tujuan.';
COMMENT ON COLUMN public."unit_conversions"."factor" IS 'Nilai target = nilai asal × faktor. Business rule: INV-BR-002.';
COMMENT ON COLUMN public."unit_conversions"."is_active" IS 'Status konversi.';
COMMENT ON COLUMN public."unit_conversions"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."unit_conversions"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."unit_conversions"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."unit_conversions"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Master Bahan: Kategori bahan baku.
CREATE TABLE IF NOT EXISTS public."ingredient_categories" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "parent_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_ingredient_categories" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."ingredient_categories" IS 'Master Bahan — Kategori bahan baku.';
COMMENT ON COLUMN public."ingredient_categories"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."ingredient_categories"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."ingredient_categories"."name" IS 'Nama kategori.';
COMMENT ON COLUMN public."ingredient_categories"."parent_id" IS 'Kategori induk opsional.';
COMMENT ON COLUMN public."ingredient_categories"."is_active" IS 'Status kategori.';
COMMENT ON COLUMN public."ingredient_categories"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."ingredient_categories"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."ingredient_categories"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."ingredient_categories"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."ingredient_categories"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."ingredient_categories"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Bahan: Master bahan baku yang dinilai dan dikelola stoknya.
CREATE TABLE IF NOT EXISTS public."ingredients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "sku" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "category_id" uuid,
  "base_unit_id" uuid NOT NULL,
  "valuation_method" public."valuation_method" NOT NULL DEFAULT 'weighted_average',
  "is_perishable" boolean NOT NULL DEFAULT false,
  "shelf_life_days" integer,
  "barcode" varchar(100),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_ingredients" PRIMARY KEY ("id"),
  CONSTRAINT "ck_ingredients_shelf_life_days" CHECK ("shelf_life_days" > 0)
);
COMMENT ON TABLE public."ingredients" IS 'Master Bahan — Master bahan baku yang dinilai dan dikelola stoknya.';
COMMENT ON COLUMN public."ingredients"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."ingredients"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."ingredients"."sku" IS 'Kode bahan. Validation: Unik per tenant.';
COMMENT ON COLUMN public."ingredients"."name" IS 'Nama bahan.';
COMMENT ON COLUMN public."ingredients"."category_id" IS 'Kategori bahan.';
COMMENT ON COLUMN public."ingredients"."base_unit_id" IS 'Satuan dasar stok dan costing.';
COMMENT ON COLUMN public."ingredients"."valuation_method" IS 'Metode penilaian persediaan. Business rule: INV-BR-003.';
COMMENT ON COLUMN public."ingredients"."is_perishable" IS 'Menandai bahan mudah rusak.';
COMMENT ON COLUMN public."ingredients"."shelf_life_days" IS 'Umur simpan standar.';
COMMENT ON COLUMN public."ingredients"."barcode" IS 'Barcode bahan/kemasan.';
COMMENT ON COLUMN public."ingredients"."is_active" IS 'Status bahan.';
COMMENT ON COLUMN public."ingredients"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."ingredients"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."ingredients"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."ingredients"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."ingredients"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."ingredients"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Bahan: Parameter stok bahan per outlet.
CREATE TABLE IF NOT EXISTS public."ingredient_outlet_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "minimum_stock" numeric(18,3) NOT NULL DEFAULT 0,
  "reorder_point" numeric(18,3) NOT NULL DEFAULT 0,
  "par_stock" numeric(18,3),
  "default_storage_location_id" uuid,
  "is_available" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_ingredient_outlet_settings" PRIMARY KEY ("id"),
  CONSTRAINT "ck_ingredient_outlet_settings_minimum_stock" CHECK ("minimum_stock" >= 0),
  CONSTRAINT "ck_ingredient_outlet_settings_reorder_point" CHECK ("reorder_point" >= 0),
  CONSTRAINT "ck_ingredient_outlet_settings_par_stock" CHECK ("par_stock" >= 0)
);
COMMENT ON TABLE public."ingredient_outlet_settings" IS 'Master Bahan — Parameter stok bahan per outlet.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."ingredient_id" IS 'Bahan yang dikonfigurasi.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."minimum_stock" IS 'Batas stok minimum.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."reorder_point" IS 'Titik rekomendasi pembelian.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."par_stock" IS 'Target stok ideal.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."default_storage_location_id" IS 'Lokasi penyimpanan default.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."is_available" IS 'Bahan digunakan di outlet.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."ingredient_outlet_settings"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."ingredient_outlet_settings"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."ingredient_outlet_settings"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Master pemasok bahan.
CREATE TABLE IF NOT EXISTS public."suppliers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(150) NOT NULL,
  "tax_id" varchar(40),
  "contact_name" varchar(120),
  "phone" varchar(30),
  "email" citext,
  "address" text,
  "payment_term_days" integer NOT NULL DEFAULT 0,
  "lead_time_days" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_suppliers" PRIMARY KEY ("id"),
  CONSTRAINT "ck_suppliers_payment_term_days" CHECK ("payment_term_days" >= 0),
  CONSTRAINT "ck_suppliers_lead_time_days" CHECK ("lead_time_days" >= 0)
);
COMMENT ON TABLE public."suppliers" IS 'Pembelian — Master pemasok bahan.';
COMMENT ON COLUMN public."suppliers"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."suppliers"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."suppliers"."code" IS 'Kode pemasok. Validation: Unik per tenant.';
COMMENT ON COLUMN public."suppliers"."name" IS 'Nama pemasok.';
COMMENT ON COLUMN public."suppliers"."tax_id" IS 'NPWP/ID pajak.';
COMMENT ON COLUMN public."suppliers"."contact_name" IS 'Nama PIC.';
COMMENT ON COLUMN public."suppliers"."phone" IS 'Nomor PIC.';
COMMENT ON COLUMN public."suppliers"."email" IS 'Email PIC.';
COMMENT ON COLUMN public."suppliers"."address" IS 'Alamat pemasok.';
COMMENT ON COLUMN public."suppliers"."payment_term_days" IS 'Termin pembayaran standar.';
COMMENT ON COLUMN public."suppliers"."lead_time_days" IS 'Lead time standar.';
COMMENT ON COLUMN public."suppliers"."is_active" IS 'Status pemasok.';
COMMENT ON COLUMN public."suppliers"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."suppliers"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."suppliers"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."suppliers"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."suppliers"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."suppliers"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Pembelian: Katalog bahan, harga, dan kemasan per pemasok.
CREATE TABLE IF NOT EXISTS public."supplier_ingredients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "supplier_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "supplier_sku" varchar(80),
  "purchase_unit_id" uuid NOT NULL,
  "conversion_to_base" numeric(18,6) NOT NULL,
  "last_price" numeric(18,2),
  "minimum_order_qty" numeric(18,3) NOT NULL DEFAULT 1,
  "is_preferred" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_supplier_ingredients" PRIMARY KEY ("id"),
  CONSTRAINT "ck_supplier_ingredients_conversion_to_base" CHECK ("conversion_to_base" > 0),
  CONSTRAINT "ck_supplier_ingredients_last_price" CHECK ("last_price" >= 0),
  CONSTRAINT "ck_supplier_ingredients_minimum_order_qty" CHECK ("minimum_order_qty" > 0)
);
COMMENT ON TABLE public."supplier_ingredients" IS 'Pembelian — Katalog bahan, harga, dan kemasan per pemasok.';
COMMENT ON COLUMN public."supplier_ingredients"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."supplier_ingredients"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."supplier_ingredients"."supplier_id" IS 'Pemasok.';
COMMENT ON COLUMN public."supplier_ingredients"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."supplier_ingredients"."supplier_sku" IS 'SKU versi pemasok.';
COMMENT ON COLUMN public."supplier_ingredients"."purchase_unit_id" IS 'Satuan pembelian.';
COMMENT ON COLUMN public."supplier_ingredients"."conversion_to_base" IS 'Isi satu purchase unit dalam base unit.';
COMMENT ON COLUMN public."supplier_ingredients"."last_price" IS 'Harga terakhir sebelum pajak.';
COMMENT ON COLUMN public."supplier_ingredients"."minimum_order_qty" IS 'MOQ pemasok.';
COMMENT ON COLUMN public."supplier_ingredients"."is_preferred" IS 'Pemasok utama bahan.';
COMMENT ON COLUMN public."supplier_ingredients"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."supplier_ingredients"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."supplier_ingredients"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."supplier_ingredients"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Master Menu & Resep: Kategori menu penjualan.
CREATE TABLE IF NOT EXISTS public."menu_categories" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_menu_categories" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."menu_categories" IS 'Master Menu & Resep — Kategori menu penjualan.';
COMMENT ON COLUMN public."menu_categories"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."menu_categories"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."menu_categories"."name" IS 'Nama kategori menu.';
COMMENT ON COLUMN public."menu_categories"."display_order" IS 'Urutan tampilan.';
COMMENT ON COLUMN public."menu_categories"."is_active" IS 'Status kategori.';
COMMENT ON COLUMN public."menu_categories"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."menu_categories"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."menu_categories"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."menu_categories"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."menu_categories"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."menu_categories"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Menu & Resep: Produk/menu yang dapat dijual.
CREATE TABLE IF NOT EXISTS public."menus" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "sku" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "category_id" uuid NOT NULL,
  "description" text,
  "item_type" public."menu_item_type" NOT NULL DEFAULT 'recipe',
  "tax_profile_id" uuid,
  "service_charge_profile_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_menus" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."menus" IS 'Master Menu & Resep — Produk/menu yang dapat dijual.';
COMMENT ON COLUMN public."menus"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."menus"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."menus"."sku" IS 'Kode menu. Validation: Unik per tenant.';
COMMENT ON COLUMN public."menus"."name" IS 'Nama menu.';
COMMENT ON COLUMN public."menus"."category_id" IS 'Kategori menu.';
COMMENT ON COLUMN public."menus"."description" IS 'Deskripsi pelanggan.';
COMMENT ON COLUMN public."menus"."item_type" IS 'Recipe, retail, atau service.';
COMMENT ON COLUMN public."menus"."tax_profile_id" IS 'Profil pajak default.';
COMMENT ON COLUMN public."menus"."service_charge_profile_id" IS 'Profil service charge default.';
COMMENT ON COLUMN public."menus"."is_active" IS 'Status master menu.';
COMMENT ON COLUMN public."menus"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."menus"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."menus"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."menus"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."menus"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."menus"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Menu & Resep: Varian, ukuran, dan harga jual menu per outlet.
CREATE TABLE IF NOT EXISTS public."menu_variants" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "menu_id" uuid NOT NULL,
  "outlet_id" uuid,
  "code" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "selling_price" numeric(18,2) NOT NULL,
  "barcode" varchar(100),
  "is_default" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_menu_variants" PRIMARY KEY ("id"),
  CONSTRAINT "ck_menu_variants_selling_price" CHECK ("selling_price" >= 0)
);
COMMENT ON TABLE public."menu_variants" IS 'Master Menu & Resep — Varian, ukuran, dan harga jual menu per outlet.';
COMMENT ON COLUMN public."menu_variants"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."menu_variants"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."menu_variants"."menu_id" IS 'Menu induk.';
COMMENT ON COLUMN public."menu_variants"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."menu_variants"."code" IS 'Kode varian.';
COMMENT ON COLUMN public."menu_variants"."name" IS 'Nama varian.';
COMMENT ON COLUMN public."menu_variants"."selling_price" IS 'Harga jual sebelum pajak/service.';
COMMENT ON COLUMN public."menu_variants"."barcode" IS 'Barcode varian.';
COMMENT ON COLUMN public."menu_variants"."is_default" IS 'Varian default menu.';
COMMENT ON COLUMN public."menu_variants"."is_active" IS 'Status varian.';
COMMENT ON COLUMN public."menu_variants"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."menu_variants"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."menu_variants"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."menu_variants"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."menu_variants"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."menu_variants"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Menu & Resep: Header resep aktif untuk menu/varian.
CREATE TABLE IF NOT EXISTS public."recipes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "menu_variant_id" uuid NOT NULL,
  "version_no" integer NOT NULL,
  "yield_qty" numeric(18,3) NOT NULL DEFAULT 1,
  "yield_unit_id" uuid,
  "effective_from" timestamptz NOT NULL DEFAULT now(),
  "effective_until" timestamptz,
  "status" public."recipe_status" NOT NULL DEFAULT 'draft',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_recipes" PRIMARY KEY ("id"),
  CONSTRAINT "ck_recipes_version_no" CHECK ("version_no" > 0),
  CONSTRAINT "ck_recipes_yield_qty" CHECK ("yield_qty" > 0),
  CONSTRAINT "ck_recipes_effective_period" CHECK ("effective_until" IS NULL OR "effective_until" > "effective_from")
);
COMMENT ON TABLE public."recipes" IS 'Master Menu & Resep — Header resep aktif untuk menu/varian.';
COMMENT ON COLUMN public."recipes"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."recipes"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."recipes"."menu_variant_id" IS 'Varian yang diproduksi.';
COMMENT ON COLUMN public."recipes"."version_no" IS 'Nomor versi resep.';
COMMENT ON COLUMN public."recipes"."yield_qty" IS 'Jumlah hasil resep.';
COMMENT ON COLUMN public."recipes"."yield_unit_id" IS 'Satuan hasil bila relevan.';
COMMENT ON COLUMN public."recipes"."effective_from" IS 'Mulai berlaku.';
COMMENT ON COLUMN public."recipes"."effective_until" IS 'Akhir berlaku.';
COMMENT ON COLUMN public."recipes"."status" IS 'Status versi resep. Business rule: RCP-BR-001.';
COMMENT ON COLUMN public."recipes"."notes" IS 'Catatan produksi.';
COMMENT ON COLUMN public."recipes"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."recipes"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."recipes"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."recipes"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Master Menu & Resep: Komposisi bahan pada satu versi resep.
CREATE TABLE IF NOT EXISTS public."recipe_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "recipe_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity" numeric(18,3) NOT NULL,
  "unit_id" uuid NOT NULL,
  "waste_percentage" numeric(5,2) NOT NULL DEFAULT 0,
  "is_optional" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_recipe_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_recipe_items_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "ck_recipe_items_waste_percentage" CHECK ("waste_percentage" BETWEEN 0 AND 100)
);
COMMENT ON TABLE public."recipe_items" IS 'Master Menu & Resep — Komposisi bahan pada satu versi resep.';
COMMENT ON COLUMN public."recipe_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."recipe_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."recipe_items"."recipe_id" IS 'Resep induk.';
COMMENT ON COLUMN public."recipe_items"."ingredient_id" IS 'Bahan yang dikonsumsi.';
COMMENT ON COLUMN public."recipe_items"."quantity" IS 'Kuantitas dalam unit resep.';
COMMENT ON COLUMN public."recipe_items"."unit_id" IS 'Satuan kuantitas.';
COMMENT ON COLUMN public."recipe_items"."waste_percentage" IS 'Allowance susut preparasi (%) .';
COMMENT ON COLUMN public."recipe_items"."is_optional" IS 'Bahan boleh ditiadakan berdasarkan modifier.';
COMMENT ON COLUMN public."recipe_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."recipe_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."recipe_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."recipe_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Master Menu & Resep: Kelompok opsi tambahan/customization.
CREATE TABLE IF NOT EXISTS public."modifier_groups" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "selection_type" public."modifier_selection" NOT NULL DEFAULT 'single',
  "min_select" smallint NOT NULL DEFAULT 0,
  "max_select" smallint,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_modifier_groups" PRIMARY KEY ("id"),
  CONSTRAINT "ck_modifier_groups_min_select" CHECK ("min_select" >= 0),
  CONSTRAINT "ck_modifier_groups_max_select" CHECK ("max_select" >= "min_select")
);
COMMENT ON TABLE public."modifier_groups" IS 'Master Menu & Resep — Kelompok opsi tambahan/customization.';
COMMENT ON COLUMN public."modifier_groups"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."modifier_groups"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."modifier_groups"."name" IS 'Nama grup modifier.';
COMMENT ON COLUMN public."modifier_groups"."selection_type" IS 'Single atau multiple.';
COMMENT ON COLUMN public."modifier_groups"."min_select" IS 'Minimum pilihan.';
COMMENT ON COLUMN public."modifier_groups"."max_select" IS 'Maksimum pilihan.';
COMMENT ON COLUMN public."modifier_groups"."is_active" IS 'Status grup.';
COMMENT ON COLUMN public."modifier_groups"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."modifier_groups"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."modifier_groups"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."modifier_groups"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."modifier_groups"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."modifier_groups"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Menu & Resep: Opsi dalam grup modifier.
CREATE TABLE IF NOT EXISTS public."modifier_options" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "modifier_group_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "price_delta" numeric(18,2) NOT NULL DEFAULT 0,
  "ingredient_id" uuid,
  "ingredient_qty" numeric(18,3),
  "unit_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_modifier_options" PRIMARY KEY ("id"),
  CONSTRAINT "ck_modifier_options_ingredient_qty" CHECK ("ingredient_qty" > 0),
  CONSTRAINT "ck_modifier_options_ingredient_triplet" CHECK (("ingredient_id" IS NULL AND "ingredient_qty" IS NULL AND "unit_id" IS NULL) OR ("ingredient_id" IS NOT NULL AND "ingredient_qty" IS NOT NULL AND "unit_id" IS NOT NULL))
);
COMMENT ON TABLE public."modifier_options" IS 'Master Menu & Resep — Opsi dalam grup modifier.';
COMMENT ON COLUMN public."modifier_options"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."modifier_options"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."modifier_options"."modifier_group_id" IS 'Grup induk.';
COMMENT ON COLUMN public."modifier_options"."name" IS 'Nama opsi.';
COMMENT ON COLUMN public."modifier_options"."price_delta" IS 'Penambah/pengurang harga.';
COMMENT ON COLUMN public."modifier_options"."ingredient_id" IS 'Bahan tambahan/terkait stok.';
COMMENT ON COLUMN public."modifier_options"."ingredient_qty" IS 'Kuantitas konsumsi bahan.';
COMMENT ON COLUMN public."modifier_options"."unit_id" IS 'Satuan konsumsi bahan.';
COMMENT ON COLUMN public."modifier_options"."is_active" IS 'Status opsi.';
COMMENT ON COLUMN public."modifier_options"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."modifier_options"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."modifier_options"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."modifier_options"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."modifier_options"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."modifier_options"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Master Menu & Resep: Grup modifier yang berlaku pada menu/varian.
CREATE TABLE IF NOT EXISTS public."menu_modifier_groups" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "menu_id" uuid NOT NULL,
  "menu_variant_id" uuid,
  "modifier_group_id" uuid NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_menu_modifier_groups" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."menu_modifier_groups" IS 'Master Menu & Resep — Grup modifier yang berlaku pada menu/varian.';
COMMENT ON COLUMN public."menu_modifier_groups"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."menu_modifier_groups"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."menu_modifier_groups"."menu_id" IS 'Menu.';
COMMENT ON COLUMN public."menu_modifier_groups"."menu_variant_id" IS 'Jika diisi, hanya berlaku untuk varian ini.';
COMMENT ON COLUMN public."menu_modifier_groups"."modifier_group_id" IS 'Grup modifier.';
COMMENT ON COLUMN public."menu_modifier_groups"."display_order" IS 'Urutan di POS.';
COMMENT ON COLUMN public."menu_modifier_groups"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."menu_modifier_groups"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."menu_modifier_groups"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."menu_modifier_groups"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Budget Planning: Rencana anggaran per outlet dan periode.
CREATE TABLE IF NOT EXISTS public."budgets" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "budget_code" varchar(50) NOT NULL,
  "name" varchar(150) NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" public."budget_status" NOT NULL DEFAULT 'draft',
  "total_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "submitted_at" timestamptz,
  "approved_at" timestamptz,
  "approved_by" uuid,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_budgets" PRIMARY KEY ("id"),
  CONSTRAINT "ck_budgets_total_amount" CHECK ("total_amount" >= 0),
  CONSTRAINT "ck_budgets_budget_period" CHECK ("period_end" >= "period_start")
);
COMMENT ON TABLE public."budgets" IS 'Budget Planning — Rencana anggaran per outlet dan periode.';
COMMENT ON COLUMN public."budgets"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."budgets"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."budgets"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."budgets"."budget_code" IS 'Nomor anggaran unik per tenant.';
COMMENT ON COLUMN public."budgets"."name" IS 'Nama anggaran.';
COMMENT ON COLUMN public."budgets"."period_start" IS 'Awal periode.';
COMMENT ON COLUMN public."budgets"."period_end" IS 'Akhir periode; >= awal.';
COMMENT ON COLUMN public."budgets"."status" IS 'Status approval anggaran.';
COMMENT ON COLUMN public."budgets"."total_amount" IS 'Total dari budget_lines; dikelola server.';
COMMENT ON COLUMN public."budgets"."submitted_at" IS 'Waktu submit.';
COMMENT ON COLUMN public."budgets"."approved_at" IS 'Waktu approval.';
COMMENT ON COLUMN public."budgets"."approved_by" IS 'Approver.';
COMMENT ON COLUMN public."budgets"."notes" IS 'Catatan.';
COMMENT ON COLUMN public."budgets"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."budgets"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."budgets"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."budgets"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Budget Planning: Rincian anggaran per kategori dan periode.
CREATE TABLE IF NOT EXISTS public."budget_lines" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "budget_id" uuid NOT NULL,
  "category" public."budget_category" NOT NULL,
  "description" varchar(200) NOT NULL,
  "planned_amount" numeric(18,2) NOT NULL,
  "actual_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "variance_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "warning_threshold_pct" numeric(5,2) NOT NULL DEFAULT 80,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_budget_lines" PRIMARY KEY ("id"),
  CONSTRAINT "ck_budget_lines_planned_amount" CHECK ("planned_amount" >= 0),
  CONSTRAINT "ck_budget_lines_actual_amount" CHECK ("actual_amount" >= 0),
  CONSTRAINT "ck_budget_lines_warning_threshold_pct" CHECK ("warning_threshold_pct" BETWEEN 0 AND 100)
);
COMMENT ON TABLE public."budget_lines" IS 'Budget Planning — Rincian anggaran per kategori dan periode.';
COMMENT ON COLUMN public."budget_lines"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."budget_lines"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."budget_lines"."budget_id" IS 'Header anggaran.';
COMMENT ON COLUMN public."budget_lines"."category" IS 'Kategori anggaran.';
COMMENT ON COLUMN public."budget_lines"."description" IS 'Uraian baris.';
COMMENT ON COLUMN public."budget_lines"."planned_amount" IS 'Nilai rencana.';
COMMENT ON COLUMN public."budget_lines"."actual_amount" IS 'Realisasi terhitung; read model.';
COMMENT ON COLUMN public."budget_lines"."variance_amount" IS 'planned - actual; read model.';
COMMENT ON COLUMN public."budget_lines"."warning_threshold_pct" IS 'Ambang peringatan pemakaian.';
COMMENT ON COLUMN public."budget_lines"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."budget_lines"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."budget_lines"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."budget_lines"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Budget Planning: Riwayat status/approval anggaran.
CREATE TABLE IF NOT EXISTS public."budget_status_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "budget_id" uuid NOT NULL,
  "from_status" public."budget_status",
  "to_status" public."budget_status" NOT NULL,
  "changed_by" uuid NOT NULL,
  "reason" text,
  "changed_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_budget_status_history" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."budget_status_history" IS 'Budget Planning — Riwayat status/approval anggaran.';
COMMENT ON COLUMN public."budget_status_history"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."budget_status_history"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."budget_status_history"."budget_id" IS 'Anggaran.';
COMMENT ON COLUMN public."budget_status_history"."from_status" IS 'Status sebelumnya.';
COMMENT ON COLUMN public."budget_status_history"."to_status" IS 'Status baru.';
COMMENT ON COLUMN public."budget_status_history"."changed_by" IS 'Pelaku perubahan.';
COMMENT ON COLUMN public."budget_status_history"."reason" IS 'Alasan reject/reopen.';
COMMENT ON COLUMN public."budget_status_history"."changed_at" IS 'Waktu perubahan.';

-- Pembelian: Permintaan pembelian internal.
CREATE TABLE IF NOT EXISTS public."purchase_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "request_no" varchar(50) NOT NULL,
  "request_date" date NOT NULL,
  "required_date" date,
  "status" public."purchase_request_status" NOT NULL DEFAULT 'draft',
  "requested_by" uuid NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_purchase_requests" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."purchase_requests" IS 'Pembelian — Permintaan pembelian internal.';
COMMENT ON COLUMN public."purchase_requests"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."purchase_requests"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."purchase_requests"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."purchase_requests"."request_no" IS 'Nomor PR unik per outlet.';
COMMENT ON COLUMN public."purchase_requests"."request_date" IS 'Tanggal permintaan.';
COMMENT ON COLUMN public."purchase_requests"."required_date" IS 'Tanggal kebutuhan.';
COMMENT ON COLUMN public."purchase_requests"."status" IS 'Status PR.';
COMMENT ON COLUMN public."purchase_requests"."requested_by" IS 'Pemohon.';
COMMENT ON COLUMN public."purchase_requests"."approved_by" IS 'Approver.';
COMMENT ON COLUMN public."purchase_requests"."approved_at" IS 'Waktu approval.';
COMMENT ON COLUMN public."purchase_requests"."notes" IS 'Catatan.';
COMMENT ON COLUMN public."purchase_requests"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."purchase_requests"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."purchase_requests"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."purchase_requests"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Rincian bahan yang diminta.
CREATE TABLE IF NOT EXISTS public."purchase_request_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "purchase_request_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity" numeric(18,3) NOT NULL,
  "unit_id" uuid NOT NULL,
  "estimated_unit_price" numeric(18,2),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_purchase_request_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_purchase_request_items_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "ck_purchase_request_items_estimated_unit_price" CHECK ("estimated_unit_price" >= 0)
);
COMMENT ON TABLE public."purchase_request_items" IS 'Pembelian — Rincian bahan yang diminta.';
COMMENT ON COLUMN public."purchase_request_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."purchase_request_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."purchase_request_items"."purchase_request_id" IS 'Header PR.';
COMMENT ON COLUMN public."purchase_request_items"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."purchase_request_items"."quantity" IS 'Kuantitas permintaan.';
COMMENT ON COLUMN public."purchase_request_items"."unit_id" IS 'Satuan permintaan.';
COMMENT ON COLUMN public."purchase_request_items"."estimated_unit_price" IS 'Estimasi harga.';
COMMENT ON COLUMN public."purchase_request_items"."notes" IS 'Catatan item.';
COMMENT ON COLUMN public."purchase_request_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."purchase_request_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."purchase_request_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."purchase_request_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Pesanan pembelian resmi ke pemasok.
CREATE TABLE IF NOT EXISTS public."purchase_orders" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "po_no" varchar(50) NOT NULL,
  "supplier_id" uuid NOT NULL,
  "purchase_request_id" uuid,
  "order_date" date NOT NULL,
  "expected_date" date,
  "status" public."purchase_order_status" NOT NULL DEFAULT 'draft',
  "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
  "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "shipping_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
  "currency_code" char(3) NOT NULL DEFAULT 'IDR',
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_purchase_orders" PRIMARY KEY ("id"),
  CONSTRAINT "ck_purchase_orders_discount_amount" CHECK ("discount_amount" >= 0),
  CONSTRAINT "ck_purchase_orders_tax_amount" CHECK ("tax_amount" >= 0),
  CONSTRAINT "ck_purchase_orders_shipping_amount" CHECK ("shipping_amount" >= 0)
);
COMMENT ON TABLE public."purchase_orders" IS 'Pembelian — Pesanan pembelian resmi ke pemasok.';
COMMENT ON COLUMN public."purchase_orders"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."purchase_orders"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."purchase_orders"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."purchase_orders"."po_no" IS 'Nomor PO unik per outlet.';
COMMENT ON COLUMN public."purchase_orders"."supplier_id" IS 'Pemasok.';
COMMENT ON COLUMN public."purchase_orders"."purchase_request_id" IS 'PR sumber.';
COMMENT ON COLUMN public."purchase_orders"."order_date" IS 'Tanggal PO.';
COMMENT ON COLUMN public."purchase_orders"."expected_date" IS 'Estimasi kedatangan.';
COMMENT ON COLUMN public."purchase_orders"."status" IS 'Status PO.';
COMMENT ON COLUMN public."purchase_orders"."subtotal" IS 'Subtotal item.';
COMMENT ON COLUMN public."purchase_orders"."discount_amount" IS 'Diskon PO.';
COMMENT ON COLUMN public."purchase_orders"."tax_amount" IS 'Pajak PO.';
COMMENT ON COLUMN public."purchase_orders"."shipping_amount" IS 'Biaya kirim.';
COMMENT ON COLUMN public."purchase_orders"."grand_total" IS 'Nilai final PO.';
COMMENT ON COLUMN public."purchase_orders"."currency_code" IS 'Mata uang.';
COMMENT ON COLUMN public."purchase_orders"."notes" IS 'Catatan pemasok.';
COMMENT ON COLUMN public."purchase_orders"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."purchase_orders"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."purchase_orders"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."purchase_orders"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Rincian PO dan snapshot harga.
CREATE TABLE IF NOT EXISTS public."purchase_order_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity_ordered" numeric(18,3) NOT NULL,
  "purchase_unit_id" uuid NOT NULL,
  "conversion_to_base" numeric(18,6) NOT NULL,
  "unit_price" numeric(18,2) NOT NULL,
  "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "line_total" numeric(18,2) NOT NULL,
  "quantity_received" numeric(18,3) NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_purchase_order_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_purchase_order_items_quantity_ordered" CHECK ("quantity_ordered" > 0),
  CONSTRAINT "ck_purchase_order_items_conversion_to_base" CHECK ("conversion_to_base" > 0),
  CONSTRAINT "ck_purchase_order_items_unit_price" CHECK ("unit_price" >= 0),
  CONSTRAINT "ck_purchase_order_items_discount_amount" CHECK ("discount_amount" >= 0),
  CONSTRAINT "ck_purchase_order_items_tax_amount" CHECK ("tax_amount" >= 0),
  CONSTRAINT "ck_purchase_order_items_po_line_total" CHECK ("line_total" >= 0),
  CONSTRAINT "ck_purchase_order_items_po_received_qty" CHECK ("quantity_received" >= 0)
);
COMMENT ON TABLE public."purchase_order_items" IS 'Pembelian — Rincian PO dan snapshot harga.';
COMMENT ON COLUMN public."purchase_order_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."purchase_order_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."purchase_order_items"."purchase_order_id" IS 'Header PO.';
COMMENT ON COLUMN public."purchase_order_items"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."purchase_order_items"."quantity_ordered" IS 'Jumlah dipesan.';
COMMENT ON COLUMN public."purchase_order_items"."purchase_unit_id" IS 'Satuan pembelian.';
COMMENT ON COLUMN public."purchase_order_items"."conversion_to_base" IS 'Konversi snapshot ke base unit.';
COMMENT ON COLUMN public."purchase_order_items"."unit_price" IS 'Harga per purchase unit.';
COMMENT ON COLUMN public."purchase_order_items"."discount_amount" IS 'Diskon item.';
COMMENT ON COLUMN public."purchase_order_items"."tax_amount" IS 'Pajak item.';
COMMENT ON COLUMN public."purchase_order_items"."line_total" IS 'Nilai final baris.';
COMMENT ON COLUMN public."purchase_order_items"."quantity_received" IS 'Akumulasi penerimaan. Validation: 0..quantity_ordered + tolerance.';
COMMENT ON COLUMN public."purchase_order_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."purchase_order_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."purchase_order_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."purchase_order_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Dokumen penerimaan barang terhadap PO.
CREATE TABLE IF NOT EXISTS public."goods_receipts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "receipt_no" varchar(50) NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "received_at" timestamptz NOT NULL,
  "received_by" uuid NOT NULL,
  "status" public."goods_receipt_status" NOT NULL DEFAULT 'draft',
  "supplier_delivery_no" varchar(80),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_goods_receipts" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."goods_receipts" IS 'Pembelian — Dokumen penerimaan barang terhadap PO.';
COMMENT ON COLUMN public."goods_receipts"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."goods_receipts"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."goods_receipts"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."goods_receipts"."receipt_no" IS 'Nomor GR unik per outlet.';
COMMENT ON COLUMN public."goods_receipts"."purchase_order_id" IS 'PO sumber.';
COMMENT ON COLUMN public."goods_receipts"."received_at" IS 'Waktu penerimaan.';
COMMENT ON COLUMN public."goods_receipts"."received_by" IS 'Petugas penerima.';
COMMENT ON COLUMN public."goods_receipts"."status" IS 'Status GR.';
COMMENT ON COLUMN public."goods_receipts"."supplier_delivery_no" IS 'Nomor surat jalan.';
COMMENT ON COLUMN public."goods_receipts"."notes" IS 'Catatan penerimaan.';
COMMENT ON COLUMN public."goods_receipts"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."goods_receipts"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."goods_receipts"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."goods_receipts"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Pembelian: Rincian kuantitas, batch, dan biaya penerimaan.
CREATE TABLE IF NOT EXISTS public."goods_receipt_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "goods_receipt_id" uuid NOT NULL,
  "purchase_order_item_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "quantity_received" numeric(18,3) NOT NULL,
  "purchase_unit_id" uuid NOT NULL,
  "base_quantity" numeric(18,3) NOT NULL,
  "unit_cost_base" numeric(18,6) NOT NULL,
  "batch_no" varchar(80),
  "expiry_date" date,
  "storage_location_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_goods_receipt_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_goods_receipt_items_quantity_received" CHECK ("quantity_received" > 0),
  CONSTRAINT "ck_goods_receipt_items_base_quantity" CHECK ("base_quantity" > 0),
  CONSTRAINT "ck_goods_receipt_items_unit_cost_base" CHECK ("unit_cost_base" >= 0),
  CONSTRAINT "ck_goods_receipt_items_expiry_after_receipt" CHECK ("expiry_date" IS NULL OR "expiry_date" >= "created_at"::date)
);
COMMENT ON TABLE public."goods_receipt_items" IS 'Pembelian — Rincian kuantitas, batch, dan biaya penerimaan.';
COMMENT ON COLUMN public."goods_receipt_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."goods_receipt_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."goods_receipt_items"."goods_receipt_id" IS 'Header GR.';
COMMENT ON COLUMN public."goods_receipt_items"."purchase_order_item_id" IS 'Baris PO.';
COMMENT ON COLUMN public."goods_receipt_items"."ingredient_id" IS 'Bahan snapshot.';
COMMENT ON COLUMN public."goods_receipt_items"."quantity_received" IS 'Jumlah diterima dalam purchase unit.';
COMMENT ON COLUMN public."goods_receipt_items"."purchase_unit_id" IS 'Satuan penerimaan.';
COMMENT ON COLUMN public."goods_receipt_items"."base_quantity" IS 'Jumlah setelah konversi ke base unit.';
COMMENT ON COLUMN public."goods_receipt_items"."unit_cost_base" IS 'Biaya per base unit.';
COMMENT ON COLUMN public."goods_receipt_items"."batch_no" IS 'Nomor batch pemasok.';
COMMENT ON COLUMN public."goods_receipt_items"."expiry_date" IS 'Tanggal kedaluwarsa.';
COMMENT ON COLUMN public."goods_receipt_items"."storage_location_id" IS 'Lokasi stok tujuan.';
COMMENT ON COLUMN public."goods_receipt_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."goods_receipt_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."goods_receipt_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."goods_receipt_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Inventory: Gudang, chiller, bar, dan lokasi stok per outlet.
CREATE TABLE IF NOT EXISTS public."storage_locations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(120) NOT NULL,
  "location_type" public."storage_location_type" NOT NULL DEFAULT 'storage',
  "allow_negative_stock" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_storage_locations" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."storage_locations" IS 'Inventory — Gudang, chiller, bar, dan lokasi stok per outlet.';
COMMENT ON COLUMN public."storage_locations"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."storage_locations"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."storage_locations"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."storage_locations"."code" IS 'Kode lokasi unik per outlet.';
COMMENT ON COLUMN public."storage_locations"."name" IS 'Nama lokasi.';
COMMENT ON COLUMN public."storage_locations"."location_type" IS 'Jenis lokasi.';
COMMENT ON COLUMN public."storage_locations"."allow_negative_stock" IS 'Izin stok negatif; sebaiknya false. Business rule: INV-BR-005.';
COMMENT ON COLUMN public."storage_locations"."is_active" IS 'Status lokasi.';
COMMENT ON COLUMN public."storage_locations"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."storage_locations"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."storage_locations"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."storage_locations"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."storage_locations"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."storage_locations"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Inventory: Lot stok untuk expiry dan valuasi.
CREATE TABLE IF NOT EXISTS public."stock_batches" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "storage_location_id" uuid NOT NULL,
  "batch_no" varchar(80),
  "received_date" date NOT NULL,
  "expiry_date" date,
  "unit_cost" numeric(18,6) NOT NULL,
  "quantity_on_hand" numeric(18,3) NOT NULL DEFAULT 0,
  "source_receipt_item_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_batches" PRIMARY KEY ("id"),
  CONSTRAINT "ck_stock_batches_unit_cost" CHECK ("unit_cost" >= 0)
);
COMMENT ON TABLE public."stock_batches" IS 'Inventory — Lot stok untuk expiry dan valuasi.';
COMMENT ON COLUMN public."stock_batches"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_batches"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_batches"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."stock_batches"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."stock_batches"."storage_location_id" IS 'Lokasi batch.';
COMMENT ON COLUMN public."stock_batches"."batch_no" IS 'Nomor batch.';
COMMENT ON COLUMN public."stock_batches"."received_date" IS 'Tanggal masuk.';
COMMENT ON COLUMN public."stock_batches"."expiry_date" IS 'Tanggal kedaluwarsa.';
COMMENT ON COLUMN public."stock_batches"."unit_cost" IS 'Biaya per base unit.';
COMMENT ON COLUMN public."stock_batches"."quantity_on_hand" IS 'Saldo batch; hasil ledger.';
COMMENT ON COLUMN public."stock_batches"."source_receipt_item_id" IS 'Sumber penerimaan.';
COMMENT ON COLUMN public."stock_batches"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_batches"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_batches"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_batches"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Inventory: Header ledger perubahan stok.
CREATE TABLE IF NOT EXISTS public."stock_movements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "movement_no" varchar(50) NOT NULL,
  "movement_type" public."stock_movement_type" NOT NULL,
  "movement_at" timestamptz NOT NULL DEFAULT now(),
  "business_date" date NOT NULL,
  "reference_type" varchar(60),
  "reference_id" uuid,
  "status" public."stock_movement_status" NOT NULL DEFAULT 'posted',
  "reversal_of_id" uuid,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_movements" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."stock_movements" IS 'Inventory — Header ledger perubahan stok.';
COMMENT ON COLUMN public."stock_movements"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_movements"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_movements"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."stock_movements"."movement_no" IS 'Nomor ledger unik per outlet.';
COMMENT ON COLUMN public."stock_movements"."movement_type" IS 'Tipe perubahan stok.';
COMMENT ON COLUMN public."stock_movements"."movement_at" IS 'Waktu efektif.';
COMMENT ON COLUMN public."stock_movements"."business_date" IS 'Tanggal bisnis outlet.';
COMMENT ON COLUMN public."stock_movements"."reference_type" IS 'Jenis dokumen sumber.';
COMMENT ON COLUMN public."stock_movements"."reference_id" IS 'ID dokumen sumber.';
COMMENT ON COLUMN public."stock_movements"."status" IS 'Posted atau reversed.';
COMMENT ON COLUMN public."stock_movements"."reversal_of_id" IS 'Ledger asli jika reversal.';
COMMENT ON COLUMN public."stock_movements"."reason" IS 'Alasan adjustment/reversal.';
COMMENT ON COLUMN public."stock_movements"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_movements"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_movements"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_movements"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Inventory: Baris debit/kredit kuantitas dan nilai stok.
CREATE TABLE IF NOT EXISTS public."stock_movement_lines" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "stock_movement_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "storage_location_id" uuid NOT NULL,
  "stock_batch_id" uuid,
  "quantity_delta" numeric(18,3) NOT NULL,
  "unit_cost" numeric(18,6) NOT NULL,
  "value_delta" numeric(18,2) NOT NULL,
  "balance_after" numeric(18,3),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_movement_lines" PRIMARY KEY ("id"),
  CONSTRAINT "ck_stock_movement_lines_quantity_delta" CHECK ("quantity_delta" <> 0),
  CONSTRAINT "ck_stock_movement_lines_unit_cost" CHECK ("unit_cost" >= 0)
);
COMMENT ON TABLE public."stock_movement_lines" IS 'Inventory — Baris debit/kredit kuantitas dan nilai stok.';
COMMENT ON COLUMN public."stock_movement_lines"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_movement_lines"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_movement_lines"."stock_movement_id" IS 'Header ledger.';
COMMENT ON COLUMN public."stock_movement_lines"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."stock_movement_lines"."storage_location_id" IS 'Lokasi stok.';
COMMENT ON COLUMN public."stock_movement_lines"."stock_batch_id" IS 'Batch terkait.';
COMMENT ON COLUMN public."stock_movement_lines"."quantity_delta" IS 'Perubahan base quantity; masuk +, keluar -.';
COMMENT ON COLUMN public."stock_movement_lines"."unit_cost" IS 'Biaya per base unit saat posting.';
COMMENT ON COLUMN public."stock_movement_lines"."value_delta" IS 'quantity_delta × unit_cost.';
COMMENT ON COLUMN public."stock_movement_lines"."balance_after" IS 'Snapshot saldo lokasi setelah posting.';
COMMENT ON COLUMN public."stock_movement_lines"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_movement_lines"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_movement_lines"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_movement_lines"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Stok Opname: Header penghitungan stok fisik.
CREATE TABLE IF NOT EXISTS public."stock_opnames" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "opname_no" varchar(50) NOT NULL,
  "storage_location_id" uuid NOT NULL,
  "scheduled_at" timestamptz,
  "started_at" timestamptz,
  "completed_at" timestamptz,
  "status" public."stock_opname_status" NOT NULL DEFAULT 'draft',
  "counted_by" uuid,
  "approved_by" uuid,
  "freeze_stock" boolean NOT NULL DEFAULT true,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_opnames" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."stock_opnames" IS 'Stok Opname — Header penghitungan stok fisik.';
COMMENT ON COLUMN public."stock_opnames"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_opnames"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_opnames"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."stock_opnames"."opname_no" IS 'Nomor opname unik.';
COMMENT ON COLUMN public."stock_opnames"."storage_location_id" IS 'Lokasi yang dihitung.';
COMMENT ON COLUMN public."stock_opnames"."scheduled_at" IS 'Jadwal penghitungan.';
COMMENT ON COLUMN public."stock_opnames"."started_at" IS 'Mulai hitung.';
COMMENT ON COLUMN public."stock_opnames"."completed_at" IS 'Selesai hitung.';
COMMENT ON COLUMN public."stock_opnames"."status" IS 'Status opname.';
COMMENT ON COLUMN public."stock_opnames"."counted_by" IS 'Petugas hitung.';
COMMENT ON COLUMN public."stock_opnames"."approved_by" IS 'Approver selisih.';
COMMENT ON COLUMN public."stock_opnames"."freeze_stock" IS 'Blok transaksi stok saat count aktif. Business rule: OPN-BR-002.';
COMMENT ON COLUMN public."stock_opnames"."notes" IS 'Catatan.';
COMMENT ON COLUMN public."stock_opnames"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_opnames"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_opnames"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_opnames"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Stok Opname: Hasil hitung dan selisih per bahan/batch.
CREATE TABLE IF NOT EXISTS public."stock_opname_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "stock_opname_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "stock_batch_id" uuid,
  "system_quantity" numeric(18,3) NOT NULL,
  "counted_quantity" numeric(18,3),
  "variance_quantity" numeric(18,3),
  "unit_cost" numeric(18,6) NOT NULL,
  "variance_value" numeric(18,2),
  "reason_code" varchar(40),
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_opname_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_stock_opname_items_counted_quantity" CHECK ("counted_quantity" >= 0)
);
COMMENT ON TABLE public."stock_opname_items" IS 'Stok Opname — Hasil hitung dan selisih per bahan/batch.';
COMMENT ON COLUMN public."stock_opname_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_opname_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_opname_items"."stock_opname_id" IS 'Header opname.';
COMMENT ON COLUMN public."stock_opname_items"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."stock_opname_items"."stock_batch_id" IS 'Batch jika count per batch.';
COMMENT ON COLUMN public."stock_opname_items"."system_quantity" IS 'Saldo snapshot saat count dimulai.';
COMMENT ON COLUMN public."stock_opname_items"."counted_quantity" IS 'Kuantitas fisik.';
COMMENT ON COLUMN public."stock_opname_items"."variance_quantity" IS 'counted - system.';
COMMENT ON COLUMN public."stock_opname_items"."unit_cost" IS 'Biaya snapshot.';
COMMENT ON COLUMN public."stock_opname_items"."variance_value" IS 'variance × unit cost.';
COMMENT ON COLUMN public."stock_opname_items"."reason_code" IS 'Kode penyebab selisih.';
COMMENT ON COLUMN public."stock_opname_items"."notes" IS 'Catatan item.';
COMMENT ON COLUMN public."stock_opname_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_opname_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_opname_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_opname_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Mutasi Stok: Transfer stok antar lokasi atau outlet.
CREATE TABLE IF NOT EXISTS public."stock_transfers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "transfer_no" varchar(50) NOT NULL,
  "from_outlet_id" uuid NOT NULL,
  "from_location_id" uuid NOT NULL,
  "to_outlet_id" uuid NOT NULL,
  "to_location_id" uuid NOT NULL,
  "status" public."stock_transfer_status" NOT NULL DEFAULT 'draft',
  "requested_at" timestamptz NOT NULL DEFAULT now(),
  "sent_at" timestamptz,
  "received_at" timestamptz,
  "requested_by" uuid NOT NULL,
  "approved_by" uuid,
  "sent_by" uuid,
  "received_by" uuid,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_transfers" PRIMARY KEY ("id"),
  CONSTRAINT "ck_stock_transfers_different_location" CHECK ("from_outlet_id" <> "to_outlet_id" OR "from_location_id" <> "to_location_id")
);
COMMENT ON TABLE public."stock_transfers" IS 'Mutasi Stok — Transfer stok antar lokasi atau outlet.';
COMMENT ON COLUMN public."stock_transfers"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_transfers"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_transfers"."transfer_no" IS 'Nomor transfer unik.';
COMMENT ON COLUMN public."stock_transfers"."from_outlet_id" IS 'Outlet asal.';
COMMENT ON COLUMN public."stock_transfers"."from_location_id" IS 'Lokasi asal.';
COMMENT ON COLUMN public."stock_transfers"."to_outlet_id" IS 'Outlet tujuan.';
COMMENT ON COLUMN public."stock_transfers"."to_location_id" IS 'Lokasi tujuan.';
COMMENT ON COLUMN public."stock_transfers"."status" IS 'Status transfer.';
COMMENT ON COLUMN public."stock_transfers"."requested_at" IS 'Waktu permintaan.';
COMMENT ON COLUMN public."stock_transfers"."sent_at" IS 'Waktu keluar.';
COMMENT ON COLUMN public."stock_transfers"."received_at" IS 'Waktu diterima.';
COMMENT ON COLUMN public."stock_transfers"."requested_by" IS 'Pemohon.';
COMMENT ON COLUMN public."stock_transfers"."approved_by" IS 'Approver.';
COMMENT ON COLUMN public."stock_transfers"."sent_by" IS 'Pengirim.';
COMMENT ON COLUMN public."stock_transfers"."received_by" IS 'Penerima.';
COMMENT ON COLUMN public."stock_transfers"."notes" IS 'Catatan.';
COMMENT ON COLUMN public."stock_transfers"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_transfers"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_transfers"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_transfers"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Mutasi Stok: Rincian transfer stok dan selisih penerimaan.
CREATE TABLE IF NOT EXISTS public."stock_transfer_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "stock_transfer_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "source_batch_id" uuid,
  "quantity_requested" numeric(18,3) NOT NULL,
  "quantity_sent" numeric(18,3),
  "quantity_received" numeric(18,3),
  "unit_cost" numeric(18,6) NOT NULL,
  "variance_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_stock_transfer_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_stock_transfer_items_quantity_requested" CHECK ("quantity_requested" > 0),
  CONSTRAINT "ck_stock_transfer_items_quantity_sent" CHECK ("quantity_sent" >= 0),
  CONSTRAINT "ck_stock_transfer_items_quantity_received" CHECK ("quantity_received" >= 0),
  CONSTRAINT "ck_stock_transfer_items_transfer_quantities" CHECK (("quantity_sent" IS NULL OR "quantity_sent" >= 0) AND ("quantity_received" IS NULL OR "quantity_received" >= 0))
);
COMMENT ON TABLE public."stock_transfer_items" IS 'Mutasi Stok — Rincian transfer stok dan selisih penerimaan.';
COMMENT ON COLUMN public."stock_transfer_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."stock_transfer_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."stock_transfer_items"."stock_transfer_id" IS 'Header transfer.';
COMMENT ON COLUMN public."stock_transfer_items"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."stock_transfer_items"."source_batch_id" IS 'Batch asal.';
COMMENT ON COLUMN public."stock_transfer_items"."quantity_requested" IS 'Jumlah diminta.';
COMMENT ON COLUMN public."stock_transfer_items"."quantity_sent" IS 'Jumlah dikirim.';
COMMENT ON COLUMN public."stock_transfer_items"."quantity_received" IS 'Jumlah diterima.';
COMMENT ON COLUMN public."stock_transfer_items"."unit_cost" IS 'Biaya snapshot.';
COMMENT ON COLUMN public."stock_transfer_items"."variance_reason" IS 'Wajib jika received berbeda dari sent.';
COMMENT ON COLUMN public."stock_transfer_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."stock_transfer_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."stock_transfer_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."stock_transfer_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Waste & Kerusakan: Master alasan waste, rusak, expired, dan spoilage.
CREATE TABLE IF NOT EXISTS public."waste_reason_codes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "requires_photo" boolean NOT NULL DEFAULT false,
  "requires_approval" boolean NOT NULL DEFAULT true,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_waste_reason_codes" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."waste_reason_codes" IS 'Waste & Kerusakan — Master alasan waste, rusak, expired, dan spoilage.';
COMMENT ON COLUMN public."waste_reason_codes"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."waste_reason_codes"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."waste_reason_codes"."code" IS 'Kode alasan unik.';
COMMENT ON COLUMN public."waste_reason_codes"."name" IS 'Nama alasan.';
COMMENT ON COLUMN public."waste_reason_codes"."requires_photo" IS 'Bukti foto wajib.';
COMMENT ON COLUMN public."waste_reason_codes"."requires_approval" IS 'Approval wajib sebelum posting.';
COMMENT ON COLUMN public."waste_reason_codes"."is_active" IS 'Status alasan.';
COMMENT ON COLUMN public."waste_reason_codes"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."waste_reason_codes"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."waste_reason_codes"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."waste_reason_codes"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."waste_reason_codes"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."waste_reason_codes"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Waste & Kerusakan: Header pencatatan bahan terbuang/rusak.
CREATE TABLE IF NOT EXISTS public."waste_records" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "waste_no" varchar(50) NOT NULL,
  "storage_location_id" uuid NOT NULL,
  "occurred_at" timestamptz NOT NULL,
  "status" public."waste_status" NOT NULL DEFAULT 'draft',
  "reported_by" uuid NOT NULL,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_waste_records" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."waste_records" IS 'Waste & Kerusakan — Header pencatatan bahan terbuang/rusak.';
COMMENT ON COLUMN public."waste_records"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."waste_records"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."waste_records"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."waste_records"."waste_no" IS 'Nomor waste unik.';
COMMENT ON COLUMN public."waste_records"."storage_location_id" IS 'Lokasi stok.';
COMMENT ON COLUMN public."waste_records"."occurred_at" IS 'Waktu kejadian.';
COMMENT ON COLUMN public."waste_records"."status" IS 'Status approval dan posting.';
COMMENT ON COLUMN public."waste_records"."reported_by" IS 'Pelapor.';
COMMENT ON COLUMN public."waste_records"."approved_by" IS 'Approver.';
COMMENT ON COLUMN public."waste_records"."approved_at" IS 'Waktu approval.';
COMMENT ON COLUMN public."waste_records"."notes" IS 'Catatan umum.';
COMMENT ON COLUMN public."waste_records"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."waste_records"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."waste_records"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."waste_records"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Waste & Kerusakan: Rincian bahan, nilai waste, dan bukti.
CREATE TABLE IF NOT EXISTS public."waste_record_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "waste_record_id" uuid NOT NULL,
  "ingredient_id" uuid NOT NULL,
  "stock_batch_id" uuid,
  "reason_code_id" uuid NOT NULL,
  "quantity" numeric(18,3) NOT NULL,
  "unit_cost" numeric(18,6) NOT NULL,
  "total_cost" numeric(18,2) NOT NULL,
  "photo_url" text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_waste_record_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_waste_record_items_quantity" CHECK ("quantity" > 0)
);
COMMENT ON TABLE public."waste_record_items" IS 'Waste & Kerusakan — Rincian bahan, nilai waste, dan bukti.';
COMMENT ON COLUMN public."waste_record_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."waste_record_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."waste_record_items"."waste_record_id" IS 'Header waste.';
COMMENT ON COLUMN public."waste_record_items"."ingredient_id" IS 'Bahan.';
COMMENT ON COLUMN public."waste_record_items"."stock_batch_id" IS 'Batch.';
COMMENT ON COLUMN public."waste_record_items"."reason_code_id" IS 'Alasan waste.';
COMMENT ON COLUMN public."waste_record_items"."quantity" IS 'Jumlah dalam base unit.';
COMMENT ON COLUMN public."waste_record_items"."unit_cost" IS 'Biaya per base unit saat kejadian.';
COMMENT ON COLUMN public."waste_record_items"."total_cost" IS 'quantity × unit_cost.';
COMMENT ON COLUMN public."waste_record_items"."photo_url" IS 'Path bukti foto; private signed access.';
COMMENT ON COLUMN public."waste_record_items"."notes" IS 'Catatan item.';
COMMENT ON COLUMN public."waste_record_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."waste_record_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."waste_record_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."waste_record_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Meja & Reservasi: Area tempat duduk per outlet.
CREATE TABLE IF NOT EXISTS public."dining_areas" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_dining_areas" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."dining_areas" IS 'Meja & Reservasi — Area tempat duduk per outlet.';
COMMENT ON COLUMN public."dining_areas"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."dining_areas"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."dining_areas"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."dining_areas"."name" IS 'Nama area.';
COMMENT ON COLUMN public."dining_areas"."display_order" IS 'Urutan denah.';
COMMENT ON COLUMN public."dining_areas"."is_active" IS 'Status area.';
COMMENT ON COLUMN public."dining_areas"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."dining_areas"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."dining_areas"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."dining_areas"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."dining_areas"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."dining_areas"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Meja & Reservasi: Meja fisik dan kapasitas.
CREATE TABLE IF NOT EXISTS public."dining_tables" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "dining_area_id" uuid NOT NULL,
  "table_code" varchar(30) NOT NULL,
  "name" varchar(80) NOT NULL,
  "capacity" smallint NOT NULL,
  "max_capacity" smallint,
  "status" public."table_status" NOT NULL DEFAULT 'available',
  "pos_x" numeric(8,2),
  "pos_y" numeric(8,2),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_dining_tables" PRIMARY KEY ("id"),
  CONSTRAINT "ck_dining_tables_capacity" CHECK ("capacity" > 0),
  CONSTRAINT "ck_dining_tables_max_capacity" CHECK ("max_capacity" >= "capacity")
);
COMMENT ON TABLE public."dining_tables" IS 'Meja & Reservasi — Meja fisik dan kapasitas.';
COMMENT ON COLUMN public."dining_tables"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."dining_tables"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."dining_tables"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."dining_tables"."dining_area_id" IS 'Area meja.';
COMMENT ON COLUMN public."dining_tables"."table_code" IS 'Kode unik per outlet.';
COMMENT ON COLUMN public."dining_tables"."name" IS 'Label meja.';
COMMENT ON COLUMN public."dining_tables"."capacity" IS 'Kapasitas normal.';
COMMENT ON COLUMN public."dining_tables"."max_capacity" IS 'Kapasitas maksimum.';
COMMENT ON COLUMN public."dining_tables"."status" IS 'Status operasional meja.';
COMMENT ON COLUMN public."dining_tables"."pos_x" IS 'Koordinat X pada denah.';
COMMENT ON COLUMN public."dining_tables"."pos_y" IS 'Koordinat Y pada denah.';
COMMENT ON COLUMN public."dining_tables"."is_active" IS 'Status master.';
COMMENT ON COLUMN public."dining_tables"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."dining_tables"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."dining_tables"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."dining_tables"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."dining_tables"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."dining_tables"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Meja & Reservasi: Profil pelanggan untuk reservasi dan penjualan.
CREATE TABLE IF NOT EXISTS public."customers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "full_name" varchar(150) NOT NULL,
  "phone" varchar(30),
  "email" citext,
  "birth_date" date,
  "notes" text,
  "marketing_consent" boolean NOT NULL DEFAULT false,
  "consent_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_customers" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."customers" IS 'Meja & Reservasi — Profil pelanggan untuk reservasi dan penjualan.';
COMMENT ON COLUMN public."customers"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."customers"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."customers"."full_name" IS 'Nama pelanggan.';
COMMENT ON COLUMN public."customers"."phone" IS 'Nomor telepon ternormalisasi.';
COMMENT ON COLUMN public."customers"."email" IS 'Email.';
COMMENT ON COLUMN public."customers"."birth_date" IS 'Tanggal lahir bila ada consent.';
COMMENT ON COLUMN public."customers"."notes" IS 'Preferensi/alergi; batasi akses.';
COMMENT ON COLUMN public."customers"."marketing_consent" IS 'Persetujuan pemasaran.';
COMMENT ON COLUMN public."customers"."consent_at" IS 'Waktu consent.';
COMMENT ON COLUMN public."customers"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."customers"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."customers"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."customers"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."customers"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."customers"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Meja & Reservasi: Booking meja pelanggan.
CREATE TABLE IF NOT EXISTS public."reservations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "reservation_no" varchar(50) NOT NULL,
  "customer_id" uuid,
  "guest_name" varchar(150) NOT NULL,
  "guest_phone" varchar(30),
  "reservation_start" timestamptz NOT NULL,
  "reservation_end" timestamptz NOT NULL,
  "party_size" smallint NOT NULL,
  "status" public."reservation_status" NOT NULL DEFAULT 'pending',
  "source" public."reservation_source" NOT NULL DEFAULT 'walk_in',
  "special_request" text,
  "checked_in_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancel_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_reservations" PRIMARY KEY ("id"),
  CONSTRAINT "ck_reservations_party_size" CHECK ("party_size" > 0),
  CONSTRAINT "ck_reservations_reservation_period" CHECK ("reservation_end" > "reservation_start")
);
COMMENT ON TABLE public."reservations" IS 'Meja & Reservasi — Booking meja pelanggan.';
COMMENT ON COLUMN public."reservations"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."reservations"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."reservations"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."reservations"."reservation_no" IS 'Nomor reservasi unik.';
COMMENT ON COLUMN public."reservations"."customer_id" IS 'Pelanggan terdaftar.';
COMMENT ON COLUMN public."reservations"."guest_name" IS 'Snapshot nama tamu.';
COMMENT ON COLUMN public."reservations"."guest_phone" IS 'Snapshot kontak.';
COMMENT ON COLUMN public."reservations"."reservation_start" IS 'Waktu mulai.';
COMMENT ON COLUMN public."reservations"."reservation_end" IS 'Waktu selesai; > mulai.';
COMMENT ON COLUMN public."reservations"."party_size" IS 'Jumlah tamu.';
COMMENT ON COLUMN public."reservations"."status" IS 'Status reservasi.';
COMMENT ON COLUMN public."reservations"."source" IS 'Sumber reservasi.';
COMMENT ON COLUMN public."reservations"."special_request" IS 'Permintaan khusus.';
COMMENT ON COLUMN public."reservations"."checked_in_at" IS 'Waktu check-in.';
COMMENT ON COLUMN public."reservations"."cancelled_at" IS 'Waktu batal.';
COMMENT ON COLUMN public."reservations"."cancel_reason" IS 'Wajib ketika cancel.';
COMMENT ON COLUMN public."reservations"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."reservations"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."reservations"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."reservations"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Meja & Reservasi: Alokasi satu atau beberapa meja pada reservasi.
CREATE TABLE IF NOT EXISTS public."reservation_tables" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "reservation_id" uuid NOT NULL,
  "table_id" uuid NOT NULL,
  "assigned_from" timestamptz NOT NULL,
  "assigned_until" timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_reservation_tables" PRIMARY KEY ("id"),
  CONSTRAINT "ck_reservation_tables_table_assignment_period" CHECK ("assigned_until" > "assigned_from")
);
COMMENT ON TABLE public."reservation_tables" IS 'Meja & Reservasi — Alokasi satu atau beberapa meja pada reservasi.';
COMMENT ON COLUMN public."reservation_tables"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."reservation_tables"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."reservation_tables"."reservation_id" IS 'Reservasi.';
COMMENT ON COLUMN public."reservation_tables"."table_id" IS 'Meja.';
COMMENT ON COLUMN public."reservation_tables"."assigned_from" IS 'Mulai blok meja.';
COMMENT ON COLUMN public."reservation_tables"."assigned_until" IS 'Akhir blok meja.';
COMMENT ON COLUMN public."reservation_tables"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."reservation_tables"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."reservation_tables"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."reservation_tables"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Meja & Reservasi: Riwayat status reservasi.
CREATE TABLE IF NOT EXISTS public."reservation_status_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "reservation_id" uuid NOT NULL,
  "from_status" public."reservation_status",
  "to_status" public."reservation_status" NOT NULL,
  "changed_by" uuid,
  "reason" text,
  "changed_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_reservation_status_history" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."reservation_status_history" IS 'Meja & Reservasi — Riwayat status reservasi.';
COMMENT ON COLUMN public."reservation_status_history"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."reservation_status_history"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."reservation_status_history"."reservation_id" IS 'Reservasi.';
COMMENT ON COLUMN public."reservation_status_history"."from_status" IS 'Status lama.';
COMMENT ON COLUMN public."reservation_status_history"."to_status" IS 'Status baru.';
COMMENT ON COLUMN public."reservation_status_history"."changed_by" IS 'Pelaku/sistem.';
COMMENT ON COLUMN public."reservation_status_history"."reason" IS 'Alasan perubahan.';
COMMENT ON COLUMN public."reservation_status_history"."changed_at" IS 'Waktu perubahan.';

-- Meja & Reservasi: Deposit reservasi dan pengembaliannya.
CREATE TABLE IF NOT EXISTS public."reservation_deposits" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "reservation_id" uuid NOT NULL,
  "payment_method_id" uuid NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "status" public."deposit_status" NOT NULL DEFAULT 'pending',
  "external_reference" varchar(150),
  "paid_at" timestamptz,
  "refunded_at" timestamptz,
  "applied_order_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_reservation_deposits" PRIMARY KEY ("id"),
  CONSTRAINT "ck_reservation_deposits_amount" CHECK ("amount" > 0)
);
COMMENT ON TABLE public."reservation_deposits" IS 'Meja & Reservasi — Deposit reservasi dan pengembaliannya.';
COMMENT ON COLUMN public."reservation_deposits"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."reservation_deposits"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."reservation_deposits"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."reservation_deposits"."reservation_id" IS 'Reservasi.';
COMMENT ON COLUMN public."reservation_deposits"."payment_method_id" IS 'Metode pembayaran.';
COMMENT ON COLUMN public."reservation_deposits"."amount" IS 'Nilai deposit.';
COMMENT ON COLUMN public."reservation_deposits"."status" IS 'Status deposit.';
COMMENT ON COLUMN public."reservation_deposits"."external_reference" IS 'Referensi gateway/bank.';
COMMENT ON COLUMN public."reservation_deposits"."paid_at" IS 'Waktu bayar.';
COMMENT ON COLUMN public."reservation_deposits"."refunded_at" IS 'Waktu refund.';
COMMENT ON COLUMN public."reservation_deposits"."applied_order_id" IS 'Order tempat deposit dipakai.';
COMMENT ON COLUMN public."reservation_deposits"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."reservation_deposits"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."reservation_deposits"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."reservation_deposits"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Metode pembayaran per tenant/outlet.
CREATE TABLE IF NOT EXISTS public."payment_methods" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid,
  "code" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "method_type" public."payment_method_type" NOT NULL,
  "requires_reference" boolean NOT NULL DEFAULT false,
  "allow_change" boolean NOT NULL DEFAULT false,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_payment_methods" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."payment_methods" IS 'Kasir & POS — Metode pembayaran per tenant/outlet.';
COMMENT ON COLUMN public."payment_methods"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."payment_methods"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."payment_methods"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."payment_methods"."code" IS 'Kode metode.';
COMMENT ON COLUMN public."payment_methods"."name" IS 'Nama tampil.';
COMMENT ON COLUMN public."payment_methods"."method_type" IS 'Cash/card/QRIS/transfer/other.';
COMMENT ON COLUMN public."payment_methods"."requires_reference" IS 'Nomor referensi wajib.';
COMMENT ON COLUMN public."payment_methods"."allow_change" IS 'Boleh menghasilkan uang kembali; hanya cash.';
COMMENT ON COLUMN public."payment_methods"."is_active" IS 'Status metode.';
COMMENT ON COLUMN public."payment_methods"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."payment_methods"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."payment_methods"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."payment_methods"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."payment_methods"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."payment_methods"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Kasir & POS: Konfigurasi pajak penjualan.
CREATE TABLE IF NOT EXISTS public."tax_profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "rate" numeric(7,4) NOT NULL,
  "is_inclusive" boolean NOT NULL DEFAULT false,
  "effective_from" date NOT NULL,
  "effective_until" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_tax_profiles" PRIMARY KEY ("id"),
  CONSTRAINT "ck_tax_profiles_rate" CHECK ("rate" BETWEEN 0 AND 100),
  CONSTRAINT "ck_tax_profiles_tax_effective_period" CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from")
);
COMMENT ON TABLE public."tax_profiles" IS 'Kasir & POS — Konfigurasi pajak penjualan.';
COMMENT ON COLUMN public."tax_profiles"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."tax_profiles"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."tax_profiles"."name" IS 'Nama profil.';
COMMENT ON COLUMN public."tax_profiles"."rate" IS 'Persentase pajak.';
COMMENT ON COLUMN public."tax_profiles"."is_inclusive" IS 'Harga sudah termasuk pajak.';
COMMENT ON COLUMN public."tax_profiles"."effective_from" IS 'Mulai berlaku.';
COMMENT ON COLUMN public."tax_profiles"."effective_until" IS 'Akhir berlaku.';
COMMENT ON COLUMN public."tax_profiles"."is_active" IS 'Status profil.';
COMMENT ON COLUMN public."tax_profiles"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."tax_profiles"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."tax_profiles"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."tax_profiles"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Konfigurasi service charge.
CREATE TABLE IF NOT EXISTS public."service_charge_profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "name" varchar(100) NOT NULL,
  "rate" numeric(7,4) NOT NULL,
  "calculation_base" public."service_base" NOT NULL DEFAULT 'subtotal_after_discount',
  "effective_from" date NOT NULL,
  "effective_until" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_service_charge_profiles" PRIMARY KEY ("id"),
  CONSTRAINT "ck_service_charge_profiles_rate" CHECK ("rate" BETWEEN 0 AND 100),
  CONSTRAINT "ck_service_charge_profiles_service_effective_period" CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from")
);
COMMENT ON TABLE public."service_charge_profiles" IS 'Kasir & POS — Konfigurasi service charge.';
COMMENT ON COLUMN public."service_charge_profiles"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."service_charge_profiles"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."service_charge_profiles"."name" IS 'Nama profil.';
COMMENT ON COLUMN public."service_charge_profiles"."rate" IS 'Persentase service.';
COMMENT ON COLUMN public."service_charge_profiles"."calculation_base" IS 'Dasar perhitungan.';
COMMENT ON COLUMN public."service_charge_profiles"."effective_from" IS 'Mulai berlaku.';
COMMENT ON COLUMN public."service_charge_profiles"."effective_until" IS 'Akhir berlaku.';
COMMENT ON COLUMN public."service_charge_profiles"."is_active" IS 'Status.';
COMMENT ON COLUMN public."service_charge_profiles"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."service_charge_profiles"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."service_charge_profiles"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."service_charge_profiles"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Master promosi/diskon terkontrol.
CREATE TABLE IF NOT EXISTS public."discounts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(120) NOT NULL,
  "discount_type" public."discount_type" NOT NULL,
  "value" numeric(18,2) NOT NULL,
  "max_amount" numeric(18,2),
  "requires_manager" boolean NOT NULL DEFAULT false,
  "valid_from" timestamptz,
  "valid_until" timestamptz,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_discounts" PRIMARY KEY ("id"),
  CONSTRAINT "ck_discounts_value" CHECK ("value" >= 0),
  CONSTRAINT "ck_discounts_max_amount" CHECK ("max_amount" >= 0),
  CONSTRAINT "ck_discounts_discount_period" CHECK ("valid_until" IS NULL OR "valid_from" IS NULL OR "valid_until" > "valid_from")
);
COMMENT ON TABLE public."discounts" IS 'Kasir & POS — Master promosi/diskon terkontrol.';
COMMENT ON COLUMN public."discounts"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."discounts"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."discounts"."code" IS 'Kode diskon unik.';
COMMENT ON COLUMN public."discounts"."name" IS 'Nama diskon.';
COMMENT ON COLUMN public."discounts"."discount_type" IS 'Percent/fixed/open.';
COMMENT ON COLUMN public."discounts"."value" IS 'Persentase atau nominal.';
COMMENT ON COLUMN public."discounts"."max_amount" IS 'Batas maksimum diskon.';
COMMENT ON COLUMN public."discounts"."requires_manager" IS 'Approval manager wajib.';
COMMENT ON COLUMN public."discounts"."valid_from" IS 'Awal berlaku.';
COMMENT ON COLUMN public."discounts"."valid_until" IS 'Akhir berlaku.';
COMMENT ON COLUMN public."discounts"."is_active" IS 'Status diskon.';
COMMENT ON COLUMN public."discounts"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."discounts"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."discounts"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."discounts"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."discounts"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."discounts"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Kasir & POS: Perangkat/laci kas per outlet.
CREATE TABLE IF NOT EXISTS public."cash_registers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "device_identifier" varchar(150),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_cash_registers" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."cash_registers" IS 'Kasir & POS — Perangkat/laci kas per outlet.';
COMMENT ON COLUMN public."cash_registers"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."cash_registers"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."cash_registers"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."cash_registers"."code" IS 'Kode register unik per outlet.';
COMMENT ON COLUMN public."cash_registers"."name" IS 'Nama register.';
COMMENT ON COLUMN public."cash_registers"."device_identifier" IS 'ID perangkat opsional.';
COMMENT ON COLUMN public."cash_registers"."is_active" IS 'Status register.';
COMMENT ON COLUMN public."cash_registers"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."cash_registers"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."cash_registers"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."cash_registers"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."cash_registers"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."cash_registers"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Kasir & POS: Shift kasir dan rekonsiliasi kas.
CREATE TABLE IF NOT EXISTS public."cash_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "cash_register_id" uuid NOT NULL,
  "session_no" varchar(50) NOT NULL,
  "cashier_id" uuid NOT NULL,
  "status" public."cash_session_status" NOT NULL DEFAULT 'open',
  "opened_at" timestamptz NOT NULL DEFAULT now(),
  "opening_cash" numeric(18,2) NOT NULL,
  "closed_at" timestamptz,
  "closing_cash_actual" numeric(18,2),
  "closing_cash_expected" numeric(18,2),
  "variance_amount" numeric(18,2),
  "closed_by" uuid,
  "close_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_cash_sessions" PRIMARY KEY ("id"),
  CONSTRAINT "ck_cash_sessions_opening_cash" CHECK ("opening_cash" >= 0),
  CONSTRAINT "ck_cash_sessions_closing_cash_actual" CHECK ("closing_cash_actual" >= 0),
  CONSTRAINT "ck_cash_sessions_cash_session_time" CHECK ("closed_at" IS NULL OR "closed_at" >= "opened_at")
);
COMMENT ON TABLE public."cash_sessions" IS 'Kasir & POS — Shift kasir dan rekonsiliasi kas.';
COMMENT ON COLUMN public."cash_sessions"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."cash_sessions"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."cash_sessions"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."cash_sessions"."cash_register_id" IS 'Register.';
COMMENT ON COLUMN public."cash_sessions"."session_no" IS 'Nomor shift.';
COMMENT ON COLUMN public."cash_sessions"."cashier_id" IS 'Kasir pembuka.';
COMMENT ON COLUMN public."cash_sessions"."status" IS 'Status shift.';
COMMENT ON COLUMN public."cash_sessions"."opened_at" IS 'Waktu buka.';
COMMENT ON COLUMN public."cash_sessions"."opening_cash" IS 'Modal awal.';
COMMENT ON COLUMN public."cash_sessions"."closed_at" IS 'Waktu tutup.';
COMMENT ON COLUMN public."cash_sessions"."closing_cash_actual" IS 'Kas fisik akhir.';
COMMENT ON COLUMN public."cash_sessions"."closing_cash_expected" IS 'Kas sistem.';
COMMENT ON COLUMN public."cash_sessions"."variance_amount" IS 'actual - expected.';
COMMENT ON COLUMN public."cash_sessions"."closed_by" IS 'Penutup shift.';
COMMENT ON COLUMN public."cash_sessions"."close_reason" IS 'Catatan selisih.';
COMMENT ON COLUMN public."cash_sessions"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."cash_sessions"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."cash_sessions"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."cash_sessions"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Cash in/out non-penjualan dalam shift.
CREATE TABLE IF NOT EXISTS public."cash_movements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "cash_session_id" uuid NOT NULL,
  "movement_type" public."cash_movement_type" NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "reason" text NOT NULL,
  "approved_by" uuid,
  "occurred_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_cash_movements" PRIMARY KEY ("id"),
  CONSTRAINT "ck_cash_movements_amount" CHECK ("amount" > 0)
);
COMMENT ON TABLE public."cash_movements" IS 'Kasir & POS — Cash in/out non-penjualan dalam shift.';
COMMENT ON COLUMN public."cash_movements"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."cash_movements"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."cash_movements"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."cash_movements"."cash_session_id" IS 'Shift kasir.';
COMMENT ON COLUMN public."cash_movements"."movement_type" IS 'Cash in atau cash out.';
COMMENT ON COLUMN public."cash_movements"."amount" IS 'Nilai transaksi.';
COMMENT ON COLUMN public."cash_movements"."reason" IS 'Alasan wajib.';
COMMENT ON COLUMN public."cash_movements"."approved_by" IS 'Approver bila melewati ambang.';
COMMENT ON COLUMN public."cash_movements"."occurred_at" IS 'Waktu transaksi.';
COMMENT ON COLUMN public."cash_movements"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."cash_movements"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."cash_movements"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."cash_movements"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Header transaksi penjualan dine-in/takeaway/delivery.
CREATE TABLE IF NOT EXISTS public."orders" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "order_no" varchar(50) NOT NULL,
  "business_date" date NOT NULL,
  "order_type" public."order_type" NOT NULL,
  "table_id" uuid,
  "reservation_id" uuid,
  "customer_id" uuid,
  "cash_session_id" uuid NOT NULL,
  "status" public."order_status" NOT NULL DEFAULT 'draft',
  "guest_count" smallint,
  "subtotal" numeric(18,2) NOT NULL DEFAULT 0,
  "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "service_charge_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "rounding_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "grand_total" numeric(18,2) NOT NULL DEFAULT 0,
  "paid_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "change_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "opened_at" timestamptz NOT NULL DEFAULT now(),
  "submitted_at" timestamptz,
  "completed_at" timestamptz,
  "voided_at" timestamptz,
  "voided_by" uuid,
  "void_reason" text,
  "notes" text,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_orders" PRIMARY KEY ("id"),
  CONSTRAINT "ck_orders_guest_count" CHECK ("guest_count" > 0),
  CONSTRAINT "ck_orders_discount_amount" CHECK ("discount_amount" >= 0),
  CONSTRAINT "ck_orders_service_charge_amount" CHECK ("service_charge_amount" >= 0),
  CONSTRAINT "ck_orders_tax_amount" CHECK ("tax_amount" >= 0),
  CONSTRAINT "ck_orders_paid_amount" CHECK ("paid_amount" >= 0),
  CONSTRAINT "ck_orders_change_amount" CHECK ("change_amount" >= 0),
  CONSTRAINT "ck_orders_version" CHECK ("version" > 0),
  CONSTRAINT "ck_orders_order_money_nonnegative" CHECK ("subtotal" >= 0 AND "discount_amount" >= 0 AND "service_charge_amount" >= 0 AND "tax_amount" >= 0 AND "grand_total" >= 0 AND "paid_amount" >= 0 AND "change_amount" >= 0)
);
COMMENT ON TABLE public."orders" IS 'Kasir & POS — Header transaksi penjualan dine-in/takeaway/delivery.';
COMMENT ON COLUMN public."orders"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."orders"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."orders"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."orders"."order_no" IS 'Nomor order unik per outlet/business date.';
COMMENT ON COLUMN public."orders"."business_date" IS 'Tanggal bisnis.';
COMMENT ON COLUMN public."orders"."order_type" IS 'Dine-in/takeaway/delivery.';
COMMENT ON COLUMN public."orders"."table_id" IS 'Meja untuk dine-in.';
COMMENT ON COLUMN public."orders"."reservation_id" IS 'Reservasi sumber.';
COMMENT ON COLUMN public."orders"."customer_id" IS 'Pelanggan.';
COMMENT ON COLUMN public."orders"."cash_session_id" IS 'Shift kasir pembuat.';
COMMENT ON COLUMN public."orders"."status" IS 'Status order end-to-end. Business rule: POS-BR-001.';
COMMENT ON COLUMN public."orders"."guest_count" IS 'Jumlah tamu dine-in.';
COMMENT ON COLUMN public."orders"."subtotal" IS 'Total item sebelum diskon.';
COMMENT ON COLUMN public."orders"."discount_amount" IS 'Total diskon.';
COMMENT ON COLUMN public."orders"."service_charge_amount" IS 'Total service.';
COMMENT ON COLUMN public."orders"."tax_amount" IS 'Total pajak.';
COMMENT ON COLUMN public."orders"."rounding_amount" IS 'Pembulatan.';
COMMENT ON COLUMN public."orders"."grand_total" IS 'Nilai tagihan.';
COMMENT ON COLUMN public."orders"."paid_amount" IS 'Akumulasi pembayaran valid.';
COMMENT ON COLUMN public."orders"."change_amount" IS 'Uang kembali.';
COMMENT ON COLUMN public."orders"."opened_at" IS 'Waktu order dibuka.';
COMMENT ON COLUMN public."orders"."submitted_at" IS 'Waktu dikirim ke dapur.';
COMMENT ON COLUMN public."orders"."completed_at" IS 'Waktu selesai.';
COMMENT ON COLUMN public."orders"."voided_at" IS 'Waktu void.';
COMMENT ON COLUMN public."orders"."voided_by" IS 'Pelaku void.';
COMMENT ON COLUMN public."orders"."void_reason" IS 'Wajib untuk void.';
COMMENT ON COLUMN public."orders"."notes" IS 'Catatan order.';
COMMENT ON COLUMN public."orders"."version" IS 'Optimistic locking version.';
COMMENT ON COLUMN public."orders"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."orders"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."orders"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."orders"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Snapshot item, harga, resep, dan status produksi.
CREATE TABLE IF NOT EXISTS public."order_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "line_no" integer NOT NULL,
  "menu_id" uuid NOT NULL,
  "menu_variant_id" uuid NOT NULL,
  "recipe_id" uuid,
  "item_name" varchar(180) NOT NULL,
  "variant_name" varchar(120),
  "quantity" numeric(12,3) NOT NULL,
  "unit_price" numeric(18,2) NOT NULL,
  "modifier_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "gross_amount" numeric(18,2) NOT NULL,
  "discount_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "tax_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "service_charge_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "net_amount" numeric(18,2) NOT NULL,
  "status" public."order_item_status" NOT NULL DEFAULT 'pending',
  "course_no" smallint NOT NULL DEFAULT 1,
  "notes" text,
  "cancelled_quantity" numeric(12,3) NOT NULL DEFAULT 0,
  "cancel_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_order_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_order_items_line_no" CHECK ("line_no" > 0),
  CONSTRAINT "ck_order_items_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "ck_order_items_unit_price" CHECK ("unit_price" >= 0),
  CONSTRAINT "ck_order_items_course_no" CHECK ("course_no" > 0),
  CONSTRAINT "ck_order_items_cancelled_quantity" CHECK ("cancelled_quantity" BETWEEN 0 AND "quantity"),
  CONSTRAINT "ck_order_items_order_item_money" CHECK ("unit_price" >= 0 AND "gross_amount" >= 0 AND "discount_amount" >= 0 AND "tax_amount" >= 0 AND "service_charge_amount" >= 0 AND "net_amount" >= 0)
);
COMMENT ON TABLE public."order_items" IS 'Kasir & POS — Snapshot item, harga, resep, dan status produksi.';
COMMENT ON COLUMN public."order_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."order_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."order_items"."order_id" IS 'Header order.';
COMMENT ON COLUMN public."order_items"."line_no" IS 'Urutan baris unik per order.';
COMMENT ON COLUMN public."order_items"."menu_id" IS 'Menu snapshot source.';
COMMENT ON COLUMN public."order_items"."menu_variant_id" IS 'Varian.';
COMMENT ON COLUMN public."order_items"."recipe_id" IS 'Versi resep yang dikunci saat submit.';
COMMENT ON COLUMN public."order_items"."item_name" IS 'Snapshot nama.';
COMMENT ON COLUMN public."order_items"."variant_name" IS 'Snapshot varian.';
COMMENT ON COLUMN public."order_items"."quantity" IS 'Jumlah item.';
COMMENT ON COLUMN public."order_items"."unit_price" IS 'Harga per unit snapshot.';
COMMENT ON COLUMN public."order_items"."modifier_amount" IS 'Total modifier per unit.';
COMMENT ON COLUMN public."order_items"."gross_amount" IS 'quantity × (unit price + modifier).';
COMMENT ON COLUMN public."order_items"."discount_amount" IS 'Diskon item.';
COMMENT ON COLUMN public."order_items"."tax_amount" IS 'Pajak item.';
COMMENT ON COLUMN public."order_items"."service_charge_amount" IS 'Service item.';
COMMENT ON COLUMN public."order_items"."net_amount" IS 'Nilai akhir item.';
COMMENT ON COLUMN public."order_items"."status" IS 'Status produksi item.';
COMMENT ON COLUMN public."order_items"."course_no" IS 'Urutan course.';
COMMENT ON COLUMN public."order_items"."notes" IS 'Catatan dapur.';
COMMENT ON COLUMN public."order_items"."cancelled_quantity" IS 'Jumlah dibatalkan.';
COMMENT ON COLUMN public."order_items"."cancel_reason" IS 'Alasan pembatalan sebagian/penuh.';
COMMENT ON COLUMN public."order_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."order_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."order_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."order_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Snapshot pilihan modifier pada item order.
CREATE TABLE IF NOT EXISTS public."order_item_modifiers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "modifier_option_id" uuid NOT NULL,
  "modifier_name" varchar(150) NOT NULL,
  "quantity" numeric(12,3) NOT NULL DEFAULT 1,
  "price_delta" numeric(18,2) NOT NULL DEFAULT 0,
  "ingredient_id" uuid,
  "ingredient_qty" numeric(18,3),
  "unit_id" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_order_item_modifiers" PRIMARY KEY ("id"),
  CONSTRAINT "ck_order_item_modifiers_quantity" CHECK ("quantity" > 0)
);
COMMENT ON TABLE public."order_item_modifiers" IS 'Kasir & POS — Snapshot pilihan modifier pada item order.';
COMMENT ON COLUMN public."order_item_modifiers"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."order_item_modifiers"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."order_item_modifiers"."order_item_id" IS 'Item order.';
COMMENT ON COLUMN public."order_item_modifiers"."modifier_option_id" IS 'Opsi sumber.';
COMMENT ON COLUMN public."order_item_modifiers"."modifier_name" IS 'Snapshot nama opsi.';
COMMENT ON COLUMN public."order_item_modifiers"."quantity" IS 'Jumlah modifier.';
COMMENT ON COLUMN public."order_item_modifiers"."price_delta" IS 'Perubahan harga per unit.';
COMMENT ON COLUMN public."order_item_modifiers"."ingredient_id" IS 'Bahan modifier.';
COMMENT ON COLUMN public."order_item_modifiers"."ingredient_qty" IS 'Konsumsi bahan per unit item.';
COMMENT ON COLUMN public."order_item_modifiers"."unit_id" IS 'Satuan konsumsi.';
COMMENT ON COLUMN public."order_item_modifiers"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."order_item_modifiers"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."order_item_modifiers"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."order_item_modifiers"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Diskon yang diterapkan pada order/item.
CREATE TABLE IF NOT EXISTS public."order_discounts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "order_item_id" uuid,
  "discount_id" uuid,
  "discount_name" varchar(120) NOT NULL,
  "discount_type" public."discount_type" NOT NULL,
  "value" numeric(18,2) NOT NULL,
  "amount" numeric(18,2) NOT NULL,
  "approved_by" uuid,
  "reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_order_discounts" PRIMARY KEY ("id"),
  CONSTRAINT "ck_order_discounts_amount" CHECK ("amount" >= 0)
);
COMMENT ON TABLE public."order_discounts" IS 'Kasir & POS — Diskon yang diterapkan pada order/item.';
COMMENT ON COLUMN public."order_discounts"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."order_discounts"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."order_discounts"."order_id" IS 'Order.';
COMMENT ON COLUMN public."order_discounts"."order_item_id" IS 'Jika diisi, diskon item.';
COMMENT ON COLUMN public."order_discounts"."discount_id" IS 'Master diskon; NULL untuk open discount.';
COMMENT ON COLUMN public."order_discounts"."discount_name" IS 'Snapshot nama.';
COMMENT ON COLUMN public."order_discounts"."discount_type" IS 'Tipe diskon snapshot.';
COMMENT ON COLUMN public."order_discounts"."value" IS 'Nilai input.';
COMMENT ON COLUMN public."order_discounts"."amount" IS 'Nominal diskon final.';
COMMENT ON COLUMN public."order_discounts"."approved_by" IS 'Manager approver.';
COMMENT ON COLUMN public."order_discounts"."reason" IS 'Alasan open discount.';
COMMENT ON COLUMN public."order_discounts"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."order_discounts"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."order_discounts"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."order_discounts"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Pembayaran, split tender, refund, dan void pembayaran.
CREATE TABLE IF NOT EXISTS public."order_payments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "payment_no" varchar(50) NOT NULL,
  "order_id" uuid NOT NULL,
  "cash_session_id" uuid NOT NULL,
  "payment_method_id" uuid NOT NULL,
  "payment_type" public."payment_type" NOT NULL DEFAULT 'payment',
  "amount" numeric(18,2) NOT NULL,
  "tendered_amount" numeric(18,2),
  "change_amount" numeric(18,2) NOT NULL DEFAULT 0,
  "status" public."payment_status" NOT NULL DEFAULT 'pending',
  "external_reference" varchar(150),
  "idempotency_key" varchar(100) NOT NULL,
  "paid_at" timestamptz,
  "voided_at" timestamptz,
  "voided_by" uuid,
  "void_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_order_payments" PRIMARY KEY ("id"),
  CONSTRAINT "ck_order_payments_amount" CHECK ("amount" > 0),
  CONSTRAINT "ck_order_payments_tendered_amount" CHECK ("tendered_amount" >= "amount"),
  CONSTRAINT "ck_order_payments_change_amount" CHECK ("change_amount" >= 0)
);
COMMENT ON TABLE public."order_payments" IS 'Kasir & POS — Pembayaran, split tender, refund, dan void pembayaran.';
COMMENT ON COLUMN public."order_payments"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."order_payments"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."order_payments"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."order_payments"."payment_no" IS 'Nomor pembayaran unik.';
COMMENT ON COLUMN public."order_payments"."order_id" IS 'Order.';
COMMENT ON COLUMN public."order_payments"."cash_session_id" IS 'Shift kasir.';
COMMENT ON COLUMN public."order_payments"."payment_method_id" IS 'Metode bayar.';
COMMENT ON COLUMN public."order_payments"."payment_type" IS 'Payment/refund.';
COMMENT ON COLUMN public."order_payments"."amount" IS 'Nilai transaksi.';
COMMENT ON COLUMN public."order_payments"."tendered_amount" IS 'Uang diterima.';
COMMENT ON COLUMN public."order_payments"."change_amount" IS 'Uang kembali.';
COMMENT ON COLUMN public."order_payments"."status" IS 'Status otorisasi.';
COMMENT ON COLUMN public."order_payments"."external_reference" IS 'Reference gateway/acquirer.';
COMMENT ON COLUMN public."order_payments"."idempotency_key" IS 'Mencegah pembayaran ganda. Business rule: CORE-BR-006.';
COMMENT ON COLUMN public."order_payments"."paid_at" IS 'Waktu sukses.';
COMMENT ON COLUMN public."order_payments"."voided_at" IS 'Waktu void.';
COMMENT ON COLUMN public."order_payments"."voided_by" IS 'Pelaku void.';
COMMENT ON COLUMN public."order_payments"."void_reason" IS 'Alasan void.';
COMMENT ON COLUMN public."order_payments"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."order_payments"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."order_payments"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."order_payments"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Kasir & POS: Riwayat status order dengan pelaku dan alasan.
CREATE TABLE IF NOT EXISTS public."order_status_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "order_id" uuid NOT NULL,
  "from_status" public."order_status",
  "to_status" public."order_status" NOT NULL,
  "changed_by" uuid,
  "reason" text,
  "changed_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_order_status_history" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."order_status_history" IS 'Kasir & POS — Riwayat status order dengan pelaku dan alasan.';
COMMENT ON COLUMN public."order_status_history"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."order_status_history"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."order_status_history"."order_id" IS 'Order.';
COMMENT ON COLUMN public."order_status_history"."from_status" IS 'Status lama.';
COMMENT ON COLUMN public."order_status_history"."to_status" IS 'Status baru.';
COMMENT ON COLUMN public."order_status_history"."changed_by" IS 'Pelaku/sistem.';
COMMENT ON COLUMN public."order_status_history"."reason" IS 'Alasan perubahan/cancel.';
COMMENT ON COLUMN public."order_status_history"."changed_at" IS 'Waktu perubahan.';

-- Dapur & KDS: Stasiun produksi per outlet.
CREATE TABLE IF NOT EXISTS public."kitchen_stations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "code" varchar(40) NOT NULL,
  "name" varchar(100) NOT NULL,
  "sla_minutes" smallint NOT NULL DEFAULT 15,
  "display_order" integer NOT NULL DEFAULT 0,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  "deleted_at" timestamptz,
  "deleted_by" uuid,
  CONSTRAINT "pk_kitchen_stations" PRIMARY KEY ("id"),
  CONSTRAINT "ck_kitchen_stations_sla_minutes" CHECK ("sla_minutes" > 0)
);
COMMENT ON TABLE public."kitchen_stations" IS 'Dapur & KDS — Stasiun produksi per outlet.';
COMMENT ON COLUMN public."kitchen_stations"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."kitchen_stations"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."kitchen_stations"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."kitchen_stations"."code" IS 'Kode station unik per outlet.';
COMMENT ON COLUMN public."kitchen_stations"."name" IS 'Nama station.';
COMMENT ON COLUMN public."kitchen_stations"."sla_minutes" IS 'Target waktu produksi.';
COMMENT ON COLUMN public."kitchen_stations"."display_order" IS 'Urutan tampilan.';
COMMENT ON COLUMN public."kitchen_stations"."is_active" IS 'Status station.';
COMMENT ON COLUMN public."kitchen_stations"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."kitchen_stations"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."kitchen_stations"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."kitchen_stations"."updated_by" IS 'Pengguna terakhir yang mengubah record.';
COMMENT ON COLUMN public."kitchen_stations"."deleted_at" IS 'Penanda soft delete; NULL berarti aktif.';
COMMENT ON COLUMN public."kitchen_stations"."deleted_by" IS 'Pengguna yang melakukan soft delete.';

-- Dapur & KDS: Routing menu/varian ke stasiun produksi.
CREATE TABLE IF NOT EXISTS public."menu_station_routes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "menu_id" uuid NOT NULL,
  "menu_variant_id" uuid,
  "kitchen_station_id" uuid NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT true,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_menu_station_routes" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."menu_station_routes" IS 'Dapur & KDS — Routing menu/varian ke stasiun produksi.';
COMMENT ON COLUMN public."menu_station_routes"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."menu_station_routes"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."menu_station_routes"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."menu_station_routes"."menu_id" IS 'Menu.';
COMMENT ON COLUMN public."menu_station_routes"."menu_variant_id" IS 'Override varian.';
COMMENT ON COLUMN public."menu_station_routes"."kitchen_station_id" IS 'Station tujuan.';
COMMENT ON COLUMN public."menu_station_routes"."is_primary" IS 'Station utama.';
COMMENT ON COLUMN public."menu_station_routes"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."menu_station_routes"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."menu_station_routes"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."menu_station_routes"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Dapur & KDS: Ticket KDS hasil submit order per station/course.
CREATE TABLE IF NOT EXISTS public."kitchen_tickets" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "outlet_id" uuid NOT NULL,
  "ticket_no" varchar(50) NOT NULL,
  "order_id" uuid NOT NULL,
  "kitchen_station_id" uuid NOT NULL,
  "course_no" smallint NOT NULL DEFAULT 1,
  "status" public."kitchen_ticket_status" NOT NULL DEFAULT 'queued',
  "priority" public."ticket_priority" NOT NULL DEFAULT 'normal',
  "queued_at" timestamptz NOT NULL DEFAULT now(),
  "started_at" timestamptz,
  "ready_at" timestamptz,
  "served_at" timestamptz,
  "recalled_at" timestamptz,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_kitchen_tickets" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."kitchen_tickets" IS 'Dapur & KDS — Ticket KDS hasil submit order per station/course.';
COMMENT ON COLUMN public."kitchen_tickets"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."kitchen_tickets"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."kitchen_tickets"."outlet_id" IS 'Outlet pemilik atau lokasi transaksi. Business rule: CORE-BR-002.';
COMMENT ON COLUMN public."kitchen_tickets"."ticket_no" IS 'Nomor ticket unik.';
COMMENT ON COLUMN public."kitchen_tickets"."order_id" IS 'Order sumber.';
COMMENT ON COLUMN public."kitchen_tickets"."kitchen_station_id" IS 'Station tujuan.';
COMMENT ON COLUMN public."kitchen_tickets"."course_no" IS 'Course.';
COMMENT ON COLUMN public."kitchen_tickets"."status" IS 'Status ticket.';
COMMENT ON COLUMN public."kitchen_tickets"."priority" IS 'Prioritas antrian.';
COMMENT ON COLUMN public."kitchen_tickets"."queued_at" IS 'Masuk antrian.';
COMMENT ON COLUMN public."kitchen_tickets"."started_at" IS 'Mulai produksi.';
COMMENT ON COLUMN public."kitchen_tickets"."ready_at" IS 'Selesai produksi.';
COMMENT ON COLUMN public."kitchen_tickets"."served_at" IS 'Disajikan.';
COMMENT ON COLUMN public."kitchen_tickets"."recalled_at" IS 'Recall terakhir.';
COMMENT ON COLUMN public."kitchen_tickets"."version" IS 'Optimistic locking.';
COMMENT ON COLUMN public."kitchen_tickets"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."kitchen_tickets"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."kitchen_tickets"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."kitchen_tickets"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Dapur & KDS: Item yang ditampilkan dan diproses pada ticket KDS.
CREATE TABLE IF NOT EXISTS public."kitchen_ticket_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "kitchen_ticket_id" uuid NOT NULL,
  "order_item_id" uuid NOT NULL,
  "quantity" numeric(12,3) NOT NULL,
  "status" public."kitchen_item_status" NOT NULL DEFAULT 'queued',
  "started_at" timestamptz,
  "ready_at" timestamptz,
  "cancelled_at" timestamptz,
  "cancel_reason" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "updated_by" uuid,
  CONSTRAINT "pk_kitchen_ticket_items" PRIMARY KEY ("id"),
  CONSTRAINT "ck_kitchen_ticket_items_quantity" CHECK ("quantity" > 0)
);
COMMENT ON TABLE public."kitchen_ticket_items" IS 'Dapur & KDS — Item yang ditampilkan dan diproses pada ticket KDS.';
COMMENT ON COLUMN public."kitchen_ticket_items"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."kitchen_ticket_items"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."kitchen_ticket_items"."kitchen_ticket_id" IS 'Ticket.';
COMMENT ON COLUMN public."kitchen_ticket_items"."order_item_id" IS 'Item order sumber.';
COMMENT ON COLUMN public."kitchen_ticket_items"."quantity" IS 'Jumlah yang diproduksi di station.';
COMMENT ON COLUMN public."kitchen_ticket_items"."status" IS 'Status item station.';
COMMENT ON COLUMN public."kitchen_ticket_items"."started_at" IS 'Mulai.';
COMMENT ON COLUMN public."kitchen_ticket_items"."ready_at" IS 'Ready.';
COMMENT ON COLUMN public."kitchen_ticket_items"."cancelled_at" IS 'Dibatalkan.';
COMMENT ON COLUMN public."kitchen_ticket_items"."cancel_reason" IS 'Alasan cancel.';
COMMENT ON COLUMN public."kitchen_ticket_items"."created_at" IS 'Waktu record dibuat (UTC).';
COMMENT ON COLUMN public."kitchen_ticket_items"."created_by" IS 'Pengguna pembuat record.';
COMMENT ON COLUMN public."kitchen_ticket_items"."updated_at" IS 'Waktu perubahan terakhir (UTC).';
COMMENT ON COLUMN public."kitchen_ticket_items"."updated_by" IS 'Pengguna terakhir yang mengubah record.';

-- Dapur & KDS: Riwayat perubahan status ticket KDS.
CREATE TABLE IF NOT EXISTS public."kitchen_ticket_status_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL,
  "kitchen_ticket_id" uuid NOT NULL,
  "from_status" public."kitchen_ticket_status",
  "to_status" public."kitchen_ticket_status" NOT NULL,
  "changed_by" uuid,
  "reason" text,
  "changed_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "pk_kitchen_ticket_status_history" PRIMARY KEY ("id")
);
COMMENT ON TABLE public."kitchen_ticket_status_history" IS 'Dapur & KDS — Riwayat perubahan status ticket KDS.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."id" IS 'Primary key opaque dan immutable.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."tenant_id" IS 'Pemisah data organisasi; wajib menjadi filter RLS. Business rule: CORE-BR-001.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."kitchen_ticket_id" IS 'Ticket.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."from_status" IS 'Status lama.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."to_status" IS 'Status baru.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."changed_by" IS 'Kitchen/system.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."reason" IS 'Alasan hold/cancel/recall.';
COMMENT ON COLUMN public."kitchen_ticket_status_history"."changed_at" IS 'Waktu perubahan.';

-- ---------------------------------------------------------------------------
-- FOREIGN KEYS
-- ---------------------------------------------------------------------------
ALTER TABLE public."tenants"
  ADD CONSTRAINT "fk_tenants_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."tenants"
  ADD CONSTRAINT "fk_tenants_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."tenants"
  ADD CONSTRAINT "fk_tenants_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."outlets"
  ADD CONSTRAINT "fk_outlets_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."outlets"
  ADD CONSTRAINT "fk_outlets_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."outlets"
  ADD CONSTRAINT "fk_outlets_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."outlets"
  ADD CONSTRAINT "fk_outlets_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."users"
  ADD CONSTRAINT "fk_users_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."users"
  ADD CONSTRAINT "fk_users_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."users"
  ADD CONSTRAINT "fk_users_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."users"
  ADD CONSTRAINT "fk_users_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."roles"
  ADD CONSTRAINT "fk_roles_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."roles"
  ADD CONSTRAINT "fk_roles_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."roles"
  ADD CONSTRAINT "fk_roles_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."roles"
  ADD CONSTRAINT "fk_roles_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."permissions"
  ADD CONSTRAINT "fk_permissions_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."permissions"
  ADD CONSTRAINT "fk_permissions_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_user_id"
  FOREIGN KEY ("user_id")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_role_id"
  FOREIGN KEY ("role_id")
  REFERENCES public."roles" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."user_roles"
  ADD CONSTRAINT "fk_user_roles_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_role_id"
  FOREIGN KEY ("role_id")
  REFERENCES public."roles" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_permission_id"
  FOREIGN KEY ("permission_id")
  REFERENCES public."permissions" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."role_permissions"
  ADD CONSTRAINT "fk_role_permissions_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."audit_logs"
  ADD CONSTRAINT "fk_audit_logs_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."audit_logs"
  ADD CONSTRAINT "fk_audit_logs_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."audit_logs"
  ADD CONSTRAINT "fk_audit_logs_actor_user_id"
  FOREIGN KEY ("actor_user_id")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."document_sequences"
  ADD CONSTRAINT "fk_document_sequences_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."document_sequences"
  ADD CONSTRAINT "fk_document_sequences_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."document_sequences"
  ADD CONSTRAINT "fk_document_sequences_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."document_sequences"
  ADD CONSTRAINT "fk_document_sequences_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."units"
  ADD CONSTRAINT "fk_units_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."units"
  ADD CONSTRAINT "fk_units_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."units"
  ADD CONSTRAINT "fk_units_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."units"
  ADD CONSTRAINT "fk_units_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."unit_conversions"
  ADD CONSTRAINT "fk_unit_conversions_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."unit_conversions"
  ADD CONSTRAINT "fk_unit_conversions_from_unit_id"
  FOREIGN KEY ("from_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."unit_conversions"
  ADD CONSTRAINT "fk_unit_conversions_to_unit_id"
  FOREIGN KEY ("to_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."unit_conversions"
  ADD CONSTRAINT "fk_unit_conversions_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."unit_conversions"
  ADD CONSTRAINT "fk_unit_conversions_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_categories"
  ADD CONSTRAINT "fk_ingredient_categories_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredient_categories"
  ADD CONSTRAINT "fk_ingredient_categories_parent_id"
  FOREIGN KEY ("parent_id")
  REFERENCES public."ingredient_categories" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_categories"
  ADD CONSTRAINT "fk_ingredient_categories_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_categories"
  ADD CONSTRAINT "fk_ingredient_categories_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_categories"
  ADD CONSTRAINT "fk_ingredient_categories_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_category_id"
  FOREIGN KEY ("category_id")
  REFERENCES public."ingredient_categories" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_base_unit_id"
  FOREIGN KEY ("base_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredients"
  ADD CONSTRAINT "fk_ingredients_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_default_storage_location_id"
  FOREIGN KEY ("default_storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."ingredient_outlet_settings"
  ADD CONSTRAINT "fk_ingredient_outlet_settings_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."suppliers"
  ADD CONSTRAINT "fk_suppliers_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."suppliers"
  ADD CONSTRAINT "fk_suppliers_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."suppliers"
  ADD CONSTRAINT "fk_suppliers_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."suppliers"
  ADD CONSTRAINT "fk_suppliers_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_supplier_id"
  FOREIGN KEY ("supplier_id")
  REFERENCES public."suppliers" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_purchase_unit_id"
  FOREIGN KEY ("purchase_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."supplier_ingredients"
  ADD CONSTRAINT "fk_supplier_ingredients_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_categories"
  ADD CONSTRAINT "fk_menu_categories_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_categories"
  ADD CONSTRAINT "fk_menu_categories_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_categories"
  ADD CONSTRAINT "fk_menu_categories_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_categories"
  ADD CONSTRAINT "fk_menu_categories_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_category_id"
  FOREIGN KEY ("category_id")
  REFERENCES public."menu_categories" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_tax_profile_id"
  FOREIGN KEY ("tax_profile_id")
  REFERENCES public."tax_profiles" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_service_charge_profile_id"
  FOREIGN KEY ("service_charge_profile_id")
  REFERENCES public."service_charge_profiles" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menus"
  ADD CONSTRAINT "fk_menus_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_menu_id"
  FOREIGN KEY ("menu_id")
  REFERENCES public."menus" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_variants"
  ADD CONSTRAINT "fk_menu_variants_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."recipes"
  ADD CONSTRAINT "fk_recipes_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipes"
  ADD CONSTRAINT "fk_recipes_menu_variant_id"
  FOREIGN KEY ("menu_variant_id")
  REFERENCES public."menu_variants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipes"
  ADD CONSTRAINT "fk_recipes_yield_unit_id"
  FOREIGN KEY ("yield_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."recipes"
  ADD CONSTRAINT "fk_recipes_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."recipes"
  ADD CONSTRAINT "fk_recipes_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_recipe_id"
  FOREIGN KEY ("recipe_id")
  REFERENCES public."recipes" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_unit_id"
  FOREIGN KEY ("unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."recipe_items"
  ADD CONSTRAINT "fk_recipe_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_groups"
  ADD CONSTRAINT "fk_modifier_groups_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."modifier_groups"
  ADD CONSTRAINT "fk_modifier_groups_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_groups"
  ADD CONSTRAINT "fk_modifier_groups_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_groups"
  ADD CONSTRAINT "fk_modifier_groups_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_modifier_group_id"
  FOREIGN KEY ("modifier_group_id")
  REFERENCES public."modifier_groups" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_unit_id"
  FOREIGN KEY ("unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."modifier_options"
  ADD CONSTRAINT "fk_modifier_options_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_menu_id"
  FOREIGN KEY ("menu_id")
  REFERENCES public."menus" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_menu_variant_id"
  FOREIGN KEY ("menu_variant_id")
  REFERENCES public."menu_variants" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_modifier_group_id"
  FOREIGN KEY ("modifier_group_id")
  REFERENCES public."modifier_groups" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_modifier_groups"
  ADD CONSTRAINT "fk_menu_modifier_groups_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budgets"
  ADD CONSTRAINT "fk_budgets_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budgets"
  ADD CONSTRAINT "fk_budgets_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budgets"
  ADD CONSTRAINT "fk_budgets_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budgets"
  ADD CONSTRAINT "fk_budgets_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budgets"
  ADD CONSTRAINT "fk_budgets_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budget_lines"
  ADD CONSTRAINT "fk_budget_lines_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budget_lines"
  ADD CONSTRAINT "fk_budget_lines_budget_id"
  FOREIGN KEY ("budget_id")
  REFERENCES public."budgets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budget_lines"
  ADD CONSTRAINT "fk_budget_lines_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budget_lines"
  ADD CONSTRAINT "fk_budget_lines_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."budget_status_history"
  ADD CONSTRAINT "fk_budget_status_history_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budget_status_history"
  ADD CONSTRAINT "fk_budget_status_history_budget_id"
  FOREIGN KEY ("budget_id")
  REFERENCES public."budgets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."budget_status_history"
  ADD CONSTRAINT "fk_budget_status_history_changed_by"
  FOREIGN KEY ("changed_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_requested_by"
  FOREIGN KEY ("requested_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_requests"
  ADD CONSTRAINT "fk_purchase_requests_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_purchase_request_id"
  FOREIGN KEY ("purchase_request_id")
  REFERENCES public."purchase_requests" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_unit_id"
  FOREIGN KEY ("unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_request_items"
  ADD CONSTRAINT "fk_purchase_request_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_supplier_id"
  FOREIGN KEY ("supplier_id")
  REFERENCES public."suppliers" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_purchase_request_id"
  FOREIGN KEY ("purchase_request_id")
  REFERENCES public."purchase_requests" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_orders"
  ADD CONSTRAINT "fk_purchase_orders_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_purchase_order_id"
  FOREIGN KEY ("purchase_order_id")
  REFERENCES public."purchase_orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_purchase_unit_id"
  FOREIGN KEY ("purchase_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."purchase_order_items"
  ADD CONSTRAINT "fk_purchase_order_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_purchase_order_id"
  FOREIGN KEY ("purchase_order_id")
  REFERENCES public."purchase_orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_received_by"
  FOREIGN KEY ("received_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."goods_receipts"
  ADD CONSTRAINT "fk_goods_receipts_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_goods_receipt_id"
  FOREIGN KEY ("goods_receipt_id")
  REFERENCES public."goods_receipts" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_purchase_order_item_id"
  FOREIGN KEY ("purchase_order_item_id")
  REFERENCES public."purchase_order_items" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_purchase_unit_id"
  FOREIGN KEY ("purchase_unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_storage_location_id"
  FOREIGN KEY ("storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."goods_receipt_items"
  ADD CONSTRAINT "fk_goods_receipt_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."storage_locations"
  ADD CONSTRAINT "fk_storage_locations_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."storage_locations"
  ADD CONSTRAINT "fk_storage_locations_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."storage_locations"
  ADD CONSTRAINT "fk_storage_locations_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."storage_locations"
  ADD CONSTRAINT "fk_storage_locations_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."storage_locations"
  ADD CONSTRAINT "fk_storage_locations_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_storage_location_id"
  FOREIGN KEY ("storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_source_receipt_item_id"
  FOREIGN KEY ("source_receipt_item_id")
  REFERENCES public."goods_receipt_items" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_batches"
  ADD CONSTRAINT "fk_stock_batches_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_reversal_of_id"
  FOREIGN KEY ("reversal_of_id")
  REFERENCES public."stock_movements" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movements"
  ADD CONSTRAINT "fk_stock_movements_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_stock_movement_id"
  FOREIGN KEY ("stock_movement_id")
  REFERENCES public."stock_movements" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_storage_location_id"
  FOREIGN KEY ("storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_stock_batch_id"
  FOREIGN KEY ("stock_batch_id")
  REFERENCES public."stock_batches" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_movement_lines"
  ADD CONSTRAINT "fk_stock_movement_lines_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_storage_location_id"
  FOREIGN KEY ("storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_counted_by"
  FOREIGN KEY ("counted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opnames"
  ADD CONSTRAINT "fk_stock_opnames_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_stock_opname_id"
  FOREIGN KEY ("stock_opname_id")
  REFERENCES public."stock_opnames" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_stock_batch_id"
  FOREIGN KEY ("stock_batch_id")
  REFERENCES public."stock_batches" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_opname_items"
  ADD CONSTRAINT "fk_stock_opname_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_from_outlet_id"
  FOREIGN KEY ("from_outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_from_location_id"
  FOREIGN KEY ("from_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_to_outlet_id"
  FOREIGN KEY ("to_outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_to_location_id"
  FOREIGN KEY ("to_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_requested_by"
  FOREIGN KEY ("requested_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_sent_by"
  FOREIGN KEY ("sent_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_received_by"
  FOREIGN KEY ("received_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfers"
  ADD CONSTRAINT "fk_stock_transfers_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_stock_transfer_id"
  FOREIGN KEY ("stock_transfer_id")
  REFERENCES public."stock_transfers" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_source_batch_id"
  FOREIGN KEY ("source_batch_id")
  REFERENCES public."stock_batches" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."stock_transfer_items"
  ADD CONSTRAINT "fk_stock_transfer_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_reason_codes"
  ADD CONSTRAINT "fk_waste_reason_codes_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_reason_codes"
  ADD CONSTRAINT "fk_waste_reason_codes_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_reason_codes"
  ADD CONSTRAINT "fk_waste_reason_codes_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_reason_codes"
  ADD CONSTRAINT "fk_waste_reason_codes_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_storage_location_id"
  FOREIGN KEY ("storage_location_id")
  REFERENCES public."storage_locations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_reported_by"
  FOREIGN KEY ("reported_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_records"
  ADD CONSTRAINT "fk_waste_records_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_waste_record_id"
  FOREIGN KEY ("waste_record_id")
  REFERENCES public."waste_records" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_stock_batch_id"
  FOREIGN KEY ("stock_batch_id")
  REFERENCES public."stock_batches" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_reason_code_id"
  FOREIGN KEY ("reason_code_id")
  REFERENCES public."waste_reason_codes" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."waste_record_items"
  ADD CONSTRAINT "fk_waste_record_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_areas"
  ADD CONSTRAINT "fk_dining_areas_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."dining_areas"
  ADD CONSTRAINT "fk_dining_areas_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."dining_areas"
  ADD CONSTRAINT "fk_dining_areas_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_areas"
  ADD CONSTRAINT "fk_dining_areas_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_areas"
  ADD CONSTRAINT "fk_dining_areas_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_dining_area_id"
  FOREIGN KEY ("dining_area_id")
  REFERENCES public."dining_areas" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."dining_tables"
  ADD CONSTRAINT "fk_dining_tables_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."customers"
  ADD CONSTRAINT "fk_customers_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."customers"
  ADD CONSTRAINT "fk_customers_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."customers"
  ADD CONSTRAINT "fk_customers_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."customers"
  ADD CONSTRAINT "fk_customers_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservations"
  ADD CONSTRAINT "fk_reservations_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservations"
  ADD CONSTRAINT "fk_reservations_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservations"
  ADD CONSTRAINT "fk_reservations_customer_id"
  FOREIGN KEY ("customer_id")
  REFERENCES public."customers" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservations"
  ADD CONSTRAINT "fk_reservations_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservations"
  ADD CONSTRAINT "fk_reservations_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_tables"
  ADD CONSTRAINT "fk_reservation_tables_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_tables"
  ADD CONSTRAINT "fk_reservation_tables_reservation_id"
  FOREIGN KEY ("reservation_id")
  REFERENCES public."reservations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_tables"
  ADD CONSTRAINT "fk_reservation_tables_table_id"
  FOREIGN KEY ("table_id")
  REFERENCES public."dining_tables" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_tables"
  ADD CONSTRAINT "fk_reservation_tables_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_tables"
  ADD CONSTRAINT "fk_reservation_tables_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_status_history"
  ADD CONSTRAINT "fk_reservation_status_history_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_status_history"
  ADD CONSTRAINT "fk_reservation_status_history_reservation_id"
  FOREIGN KEY ("reservation_id")
  REFERENCES public."reservations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_status_history"
  ADD CONSTRAINT "fk_reservation_status_history_changed_by"
  FOREIGN KEY ("changed_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_reservation_id"
  FOREIGN KEY ("reservation_id")
  REFERENCES public."reservations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_payment_method_id"
  FOREIGN KEY ("payment_method_id")
  REFERENCES public."payment_methods" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_applied_order_id"
  FOREIGN KEY ("applied_order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."reservation_deposits"
  ADD CONSTRAINT "fk_reservation_deposits_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."payment_methods"
  ADD CONSTRAINT "fk_payment_methods_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."payment_methods"
  ADD CONSTRAINT "fk_payment_methods_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."payment_methods"
  ADD CONSTRAINT "fk_payment_methods_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."payment_methods"
  ADD CONSTRAINT "fk_payment_methods_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."payment_methods"
  ADD CONSTRAINT "fk_payment_methods_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."tax_profiles"
  ADD CONSTRAINT "fk_tax_profiles_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."tax_profiles"
  ADD CONSTRAINT "fk_tax_profiles_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."tax_profiles"
  ADD CONSTRAINT "fk_tax_profiles_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."service_charge_profiles"
  ADD CONSTRAINT "fk_service_charge_profiles_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."service_charge_profiles"
  ADD CONSTRAINT "fk_service_charge_profiles_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."service_charge_profiles"
  ADD CONSTRAINT "fk_service_charge_profiles_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."discounts"
  ADD CONSTRAINT "fk_discounts_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."discounts"
  ADD CONSTRAINT "fk_discounts_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."discounts"
  ADD CONSTRAINT "fk_discounts_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."discounts"
  ADD CONSTRAINT "fk_discounts_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_registers"
  ADD CONSTRAINT "fk_cash_registers_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_registers"
  ADD CONSTRAINT "fk_cash_registers_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_registers"
  ADD CONSTRAINT "fk_cash_registers_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_registers"
  ADD CONSTRAINT "fk_cash_registers_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_registers"
  ADD CONSTRAINT "fk_cash_registers_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_cash_register_id"
  FOREIGN KEY ("cash_register_id")
  REFERENCES public."cash_registers" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_cashier_id"
  FOREIGN KEY ("cashier_id")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_closed_by"
  FOREIGN KEY ("closed_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_sessions"
  ADD CONSTRAINT "fk_cash_sessions_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_cash_session_id"
  FOREIGN KEY ("cash_session_id")
  REFERENCES public."cash_sessions" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."cash_movements"
  ADD CONSTRAINT "fk_cash_movements_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_table_id"
  FOREIGN KEY ("table_id")
  REFERENCES public."dining_tables" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_reservation_id"
  FOREIGN KEY ("reservation_id")
  REFERENCES public."reservations" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_customer_id"
  FOREIGN KEY ("customer_id")
  REFERENCES public."customers" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_cash_session_id"
  FOREIGN KEY ("cash_session_id")
  REFERENCES public."cash_sessions" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_voided_by"
  FOREIGN KEY ("voided_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."orders"
  ADD CONSTRAINT "fk_orders_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_order_id"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_menu_id"
  FOREIGN KEY ("menu_id")
  REFERENCES public."menus" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_menu_variant_id"
  FOREIGN KEY ("menu_variant_id")
  REFERENCES public."menu_variants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_recipe_id"
  FOREIGN KEY ("recipe_id")
  REFERENCES public."recipes" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_items"
  ADD CONSTRAINT "fk_order_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_order_item_id"
  FOREIGN KEY ("order_item_id")
  REFERENCES public."order_items" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_modifier_option_id"
  FOREIGN KEY ("modifier_option_id")
  REFERENCES public."modifier_options" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_ingredient_id"
  FOREIGN KEY ("ingredient_id")
  REFERENCES public."ingredients" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_unit_id"
  FOREIGN KEY ("unit_id")
  REFERENCES public."units" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_item_modifiers"
  ADD CONSTRAINT "fk_order_item_modifiers_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_order_id"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_order_item_id"
  FOREIGN KEY ("order_item_id")
  REFERENCES public."order_items" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_discount_id"
  FOREIGN KEY ("discount_id")
  REFERENCES public."discounts" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_approved_by"
  FOREIGN KEY ("approved_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_discounts"
  ADD CONSTRAINT "fk_order_discounts_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_order_id"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_cash_session_id"
  FOREIGN KEY ("cash_session_id")
  REFERENCES public."cash_sessions" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_payment_method_id"
  FOREIGN KEY ("payment_method_id")
  REFERENCES public."payment_methods" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_voided_by"
  FOREIGN KEY ("voided_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_payments"
  ADD CONSTRAINT "fk_order_payments_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."order_status_history"
  ADD CONSTRAINT "fk_order_status_history_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_status_history"
  ADD CONSTRAINT "fk_order_status_history_order_id"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."order_status_history"
  ADD CONSTRAINT "fk_order_status_history_changed_by"
  FOREIGN KEY ("changed_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_stations"
  ADD CONSTRAINT "fk_kitchen_stations_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_stations"
  ADD CONSTRAINT "fk_kitchen_stations_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_stations"
  ADD CONSTRAINT "fk_kitchen_stations_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_stations"
  ADD CONSTRAINT "fk_kitchen_stations_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_stations"
  ADD CONSTRAINT "fk_kitchen_stations_deleted_by"
  FOREIGN KEY ("deleted_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_menu_id"
  FOREIGN KEY ("menu_id")
  REFERENCES public."menus" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_menu_variant_id"
  FOREIGN KEY ("menu_variant_id")
  REFERENCES public."menu_variants" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_kitchen_station_id"
  FOREIGN KEY ("kitchen_station_id")
  REFERENCES public."kitchen_stations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."menu_station_routes"
  ADD CONSTRAINT "fk_menu_station_routes_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_outlet_id"
  FOREIGN KEY ("outlet_id")
  REFERENCES public."outlets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_order_id"
  FOREIGN KEY ("order_id")
  REFERENCES public."orders" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_kitchen_station_id"
  FOREIGN KEY ("kitchen_station_id")
  REFERENCES public."kitchen_stations" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_tickets"
  ADD CONSTRAINT "fk_kitchen_tickets_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_ticket_items"
  ADD CONSTRAINT "fk_kitchen_ticket_items_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_ticket_items"
  ADD CONSTRAINT "fk_kitchen_ticket_items_kitchen_ticket_id"
  FOREIGN KEY ("kitchen_ticket_id")
  REFERENCES public."kitchen_tickets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_ticket_items"
  ADD CONSTRAINT "fk_kitchen_ticket_items_order_item_id"
  FOREIGN KEY ("order_item_id")
  REFERENCES public."order_items" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_ticket_items"
  ADD CONSTRAINT "fk_kitchen_ticket_items_created_by"
  FOREIGN KEY ("created_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_ticket_items"
  ADD CONSTRAINT "fk_kitchen_ticket_items_updated_by"
  FOREIGN KEY ("updated_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;
ALTER TABLE public."kitchen_ticket_status_history"
  ADD CONSTRAINT "fk_kitchen_ticket_status_history_tenant_id"
  FOREIGN KEY ("tenant_id")
  REFERENCES public."tenants" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_ticket_status_history"
  ADD CONSTRAINT "fk_kitchen_ticket_status_history_kitchen_ticket_id"
  FOREIGN KEY ("kitchen_ticket_id")
  REFERENCES public."kitchen_tickets" ("id")
  ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE public."kitchen_ticket_status_history"
  ADD CONSTRAINT "fk_kitchen_ticket_status_history_changed_by"
  FOREIGN KEY ("changed_by")
  REFERENCES public."users" ("id")
  ON UPDATE RESTRICT ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "uq_outlets_tenant_code" ON public."outlets" USING btree ("tenant_id", "code") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_users_tenant_email" ON public."users" USING btree ("tenant_id", "email") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_user_roles_scope" ON public."user_roles" USING btree ("tenant_id", "user_id", "role_id", "outlet_id") WHERE valid_until IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_role_permission" ON public."role_permissions" USING btree ("role_id", "permission_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_document_sequence" ON public."document_sequences" USING btree ("tenant_id", "outlet_id", "document_type", "business_date");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_units_tenant_code" ON public."units" USING btree ("tenant_id", "code") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_unit_conversion" ON public."unit_conversions" USING btree ("tenant_id", "from_unit_id", "to_unit_id") WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ingredients_tenant_sku" ON public."ingredients" USING btree ("tenant_id", "sku") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ing_outlet" ON public."ingredient_outlet_settings" USING btree ("outlet_id", "ingredient_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_supplier_catalog" ON public."supplier_ingredients" USING btree ("supplier_id", "ingredient_id", "purchase_unit_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_menus_tenant_sku" ON public."menus" USING btree ("tenant_id", "sku") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_recipe_version" ON public."recipes" USING btree ("menu_variant_id", "version_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_budget_code" ON public."budgets" USING btree ("tenant_id", "budget_code");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_pr_no" ON public."purchase_requests" USING btree ("outlet_id", "request_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_po_no" ON public."purchase_orders" USING btree ("outlet_id", "po_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_gr_no" ON public."goods_receipts" USING btree ("outlet_id", "receipt_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_movement_no" ON public."stock_movements" USING btree ("outlet_id", "movement_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_stock_source" ON public."stock_movements" USING btree ("tenant_id", "reference_type", "reference_id", "movement_type") WHERE reference_id IS NOT NULL AND status = 'posted';
CREATE INDEX IF NOT EXISTS "ix_stock_ledger_lookup" ON public."stock_movement_lines" USING btree ("tenant_id", "ingredient_id", "stock_movement_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batch_fefo" ON public."stock_batches" USING btree ("outlet_id", "storage_location_id", "ingredient_id", "expiry_date") WHERE quantity_on_hand > 0;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_opname_location" ON public."stock_opnames" USING btree ("outlet_id", "storage_location_id") WHERE status IN ('counting','submitted','approved');
CREATE UNIQUE INDEX IF NOT EXISTS "uq_transfer_no" ON public."stock_transfers" USING btree ("tenant_id", "transfer_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_waste_no" ON public."waste_records" USING btree ("outlet_id", "waste_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_table_code" ON public."dining_tables" USING btree ("outlet_id", "table_code") WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_reservation_no" ON public."reservations" USING btree ("outlet_id", "reservation_no");
CREATE INDEX IF NOT EXISTS "ix_reservation_overlap" ON public."reservation_tables" USING btree ("table_id", "assigned_from", "assigned_until");
CREATE INDEX IF NOT EXISTS "ix_customer_phone" ON public."customers" USING btree ("tenant_id", "phone") WHERE phone IS NOT NULL AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "uq_open_register_session" ON public."cash_sessions" USING btree ("cash_register_id") WHERE status = 'open';
CREATE UNIQUE INDEX IF NOT EXISTS "uq_order_no" ON public."orders" USING btree ("outlet_id", "business_date", "order_no");
CREATE INDEX IF NOT EXISTS "ix_orders_status_time" ON public."orders" USING btree ("outlet_id", "status", "opened_at");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_order_line" ON public."order_items" USING btree ("order_id", "line_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_no" ON public."order_payments" USING btree ("outlet_id", "payment_no");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_payment_idempotency" ON public."order_payments" USING btree ("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ticket_station_course" ON public."kitchen_tickets" USING btree ("order_id", "kitchen_station_id", "course_no") WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS "ix_kds_queue" ON public."kitchen_tickets" USING btree ("outlet_id", "kitchen_station_id", "status", "priority", "queued_at");
CREATE INDEX IF NOT EXISTS "ix_tenants_created_by" ON public."tenants" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_tenants_updated_by" ON public."tenants" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_tenants_deleted_by" ON public."tenants" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_outlets_tenant_id" ON public."outlets" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_outlets_created_by" ON public."outlets" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_outlets_updated_by" ON public."outlets" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_outlets_deleted_by" ON public."outlets" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_users_tenant_id" ON public."users" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_users_created_by" ON public."users" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_users_updated_by" ON public."users" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_users_deleted_by" ON public."users" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_roles_tenant_id" ON public."roles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_roles_created_by" ON public."roles" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_roles_updated_by" ON public."roles" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_roles_deleted_by" ON public."roles" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_permissions_created_by" ON public."permissions" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_permissions_updated_by" ON public."permissions" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_user_roles_tenant_id" ON public."user_roles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_user_roles_user_id" ON public."user_roles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "ix_user_roles_role_id" ON public."user_roles" USING btree ("role_id");
CREATE INDEX IF NOT EXISTS "ix_user_roles_outlet_id" ON public."user_roles" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_user_roles_created_by" ON public."user_roles" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_user_roles_updated_by" ON public."user_roles" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_role_permissions_tenant_id" ON public."role_permissions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_role_permissions_role_id" ON public."role_permissions" USING btree ("role_id");
CREATE INDEX IF NOT EXISTS "ix_role_permissions_permission_id" ON public."role_permissions" USING btree ("permission_id");
CREATE INDEX IF NOT EXISTS "ix_role_permissions_created_by" ON public."role_permissions" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_role_permissions_updated_by" ON public."role_permissions" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_audit_logs_tenant_id" ON public."audit_logs" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_audit_logs_outlet_id" ON public."audit_logs" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_audit_logs_actor_user_id" ON public."audit_logs" USING btree ("actor_user_id");
CREATE INDEX IF NOT EXISTS "ix_document_sequences_tenant_id" ON public."document_sequences" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_document_sequences_outlet_id" ON public."document_sequences" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_document_sequences_created_by" ON public."document_sequences" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_document_sequences_updated_by" ON public."document_sequences" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_units_tenant_id" ON public."units" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_units_created_by" ON public."units" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_units_updated_by" ON public."units" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_units_deleted_by" ON public."units" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_unit_conversions_tenant_id" ON public."unit_conversions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_unit_conversions_from_unit_id" ON public."unit_conversions" USING btree ("from_unit_id");
CREATE INDEX IF NOT EXISTS "ix_unit_conversions_to_unit_id" ON public."unit_conversions" USING btree ("to_unit_id");
CREATE INDEX IF NOT EXISTS "ix_unit_conversions_created_by" ON public."unit_conversions" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_unit_conversions_updated_by" ON public."unit_conversions" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_ingredient_categories_tenant_id" ON public."ingredient_categories" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_categories_parent_id" ON public."ingredient_categories" USING btree ("parent_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_categories_created_by" ON public."ingredient_categories" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_ingredient_categories_updated_by" ON public."ingredient_categories" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_ingredient_categories_deleted_by" ON public."ingredient_categories" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_ingredients_tenant_id" ON public."ingredients" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_ingredients_category_id" ON public."ingredients" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "ix_ingredients_base_unit_id" ON public."ingredients" USING btree ("base_unit_id");
CREATE INDEX IF NOT EXISTS "ix_ingredients_created_by" ON public."ingredients" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_ingredients_updated_by" ON public."ingredients" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_ingredients_deleted_by" ON public."ingredients" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_tenant_id" ON public."ingredient_outlet_settings" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_outlet_id" ON public."ingredient_outlet_settings" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_ingredient_id" ON public."ingredient_outlet_settings" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_default_storage_location_id" ON public."ingredient_outlet_settings" USING btree ("default_storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_created_by" ON public."ingredient_outlet_settings" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_ingredient_outlet_settings_updated_by" ON public."ingredient_outlet_settings" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_suppliers_tenant_id" ON public."suppliers" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_suppliers_created_by" ON public."suppliers" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_suppliers_updated_by" ON public."suppliers" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_suppliers_deleted_by" ON public."suppliers" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_tenant_id" ON public."supplier_ingredients" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_supplier_id" ON public."supplier_ingredients" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_ingredient_id" ON public."supplier_ingredients" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_purchase_unit_id" ON public."supplier_ingredients" USING btree ("purchase_unit_id");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_created_by" ON public."supplier_ingredients" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_supplier_ingredients_updated_by" ON public."supplier_ingredients" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_menu_categories_tenant_id" ON public."menu_categories" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_categories_created_by" ON public."menu_categories" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_menu_categories_updated_by" ON public."menu_categories" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_menu_categories_deleted_by" ON public."menu_categories" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_menus_tenant_id" ON public."menus" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_menus_category_id" ON public."menus" USING btree ("category_id");
CREATE INDEX IF NOT EXISTS "ix_menus_tax_profile_id" ON public."menus" USING btree ("tax_profile_id");
CREATE INDEX IF NOT EXISTS "ix_menus_service_charge_profile_id" ON public."menus" USING btree ("service_charge_profile_id");
CREATE INDEX IF NOT EXISTS "ix_menus_created_by" ON public."menus" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_menus_updated_by" ON public."menus" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_menus_deleted_by" ON public."menus" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_tenant_id" ON public."menu_variants" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_menu_id" ON public."menu_variants" USING btree ("menu_id");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_outlet_id" ON public."menu_variants" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_created_by" ON public."menu_variants" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_updated_by" ON public."menu_variants" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_menu_variants_deleted_by" ON public."menu_variants" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_recipes_tenant_id" ON public."recipes" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_recipes_menu_variant_id" ON public."recipes" USING btree ("menu_variant_id");
CREATE INDEX IF NOT EXISTS "ix_recipes_yield_unit_id" ON public."recipes" USING btree ("yield_unit_id");
CREATE INDEX IF NOT EXISTS "ix_recipes_created_by" ON public."recipes" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_recipes_updated_by" ON public."recipes" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_tenant_id" ON public."recipe_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_recipe_id" ON public."recipe_items" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_ingredient_id" ON public."recipe_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_unit_id" ON public."recipe_items" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_created_by" ON public."recipe_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_recipe_items_updated_by" ON public."recipe_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_groups_tenant_id" ON public."modifier_groups" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_modifier_groups_created_by" ON public."modifier_groups" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_groups_updated_by" ON public."modifier_groups" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_groups_deleted_by" ON public."modifier_groups" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_tenant_id" ON public."modifier_options" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_modifier_group_id" ON public."modifier_options" USING btree ("modifier_group_id");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_ingredient_id" ON public."modifier_options" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_unit_id" ON public."modifier_options" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_created_by" ON public."modifier_options" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_updated_by" ON public."modifier_options" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_modifier_options_deleted_by" ON public."modifier_options" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_tenant_id" ON public."menu_modifier_groups" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_menu_id" ON public."menu_modifier_groups" USING btree ("menu_id");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_menu_variant_id" ON public."menu_modifier_groups" USING btree ("menu_variant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_modifier_group_id" ON public."menu_modifier_groups" USING btree ("modifier_group_id");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_created_by" ON public."menu_modifier_groups" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_menu_modifier_groups_updated_by" ON public."menu_modifier_groups" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_budgets_tenant_id" ON public."budgets" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_budgets_outlet_id" ON public."budgets" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_budgets_approved_by" ON public."budgets" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_budgets_created_by" ON public."budgets" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_budgets_updated_by" ON public."budgets" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_budget_lines_tenant_id" ON public."budget_lines" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_budget_lines_budget_id" ON public."budget_lines" USING btree ("budget_id");
CREATE INDEX IF NOT EXISTS "ix_budget_lines_created_by" ON public."budget_lines" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_budget_lines_updated_by" ON public."budget_lines" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_budget_status_history_tenant_id" ON public."budget_status_history" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_budget_status_history_budget_id" ON public."budget_status_history" USING btree ("budget_id");
CREATE INDEX IF NOT EXISTS "ix_budget_status_history_changed_by" ON public."budget_status_history" USING btree ("changed_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_tenant_id" ON public."purchase_requests" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_outlet_id" ON public."purchase_requests" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_requested_by" ON public."purchase_requests" USING btree ("requested_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_approved_by" ON public."purchase_requests" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_created_by" ON public."purchase_requests" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_requests_updated_by" ON public."purchase_requests" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_tenant_id" ON public."purchase_request_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_purchase_request_id" ON public."purchase_request_items" USING btree ("purchase_request_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_ingredient_id" ON public."purchase_request_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_unit_id" ON public."purchase_request_items" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_created_by" ON public."purchase_request_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_request_items_updated_by" ON public."purchase_request_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_tenant_id" ON public."purchase_orders" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_outlet_id" ON public."purchase_orders" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_supplier_id" ON public."purchase_orders" USING btree ("supplier_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_purchase_request_id" ON public."purchase_orders" USING btree ("purchase_request_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_created_by" ON public."purchase_orders" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_orders_updated_by" ON public."purchase_orders" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_tenant_id" ON public."purchase_order_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_purchase_order_id" ON public."purchase_order_items" USING btree ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_ingredient_id" ON public."purchase_order_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_purchase_unit_id" ON public."purchase_order_items" USING btree ("purchase_unit_id");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_created_by" ON public."purchase_order_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_purchase_order_items_updated_by" ON public."purchase_order_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_tenant_id" ON public."goods_receipts" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_outlet_id" ON public."goods_receipts" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_purchase_order_id" ON public."goods_receipts" USING btree ("purchase_order_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_received_by" ON public."goods_receipts" USING btree ("received_by");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_created_by" ON public."goods_receipts" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_goods_receipts_updated_by" ON public."goods_receipts" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_tenant_id" ON public."goods_receipt_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_goods_receipt_id" ON public."goods_receipt_items" USING btree ("goods_receipt_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_purchase_order_item_id" ON public."goods_receipt_items" USING btree ("purchase_order_item_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_ingredient_id" ON public."goods_receipt_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_purchase_unit_id" ON public."goods_receipt_items" USING btree ("purchase_unit_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_storage_location_id" ON public."goods_receipt_items" USING btree ("storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_created_by" ON public."goods_receipt_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_goods_receipt_items_updated_by" ON public."goods_receipt_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_storage_locations_tenant_id" ON public."storage_locations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_storage_locations_outlet_id" ON public."storage_locations" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_storage_locations_created_by" ON public."storage_locations" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_storage_locations_updated_by" ON public."storage_locations" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_storage_locations_deleted_by" ON public."storage_locations" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_tenant_id" ON public."stock_batches" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_outlet_id" ON public."stock_batches" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_ingredient_id" ON public."stock_batches" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_storage_location_id" ON public."stock_batches" USING btree ("storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_source_receipt_item_id" ON public."stock_batches" USING btree ("source_receipt_item_id");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_created_by" ON public."stock_batches" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_batches_updated_by" ON public."stock_batches" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_movements_tenant_id" ON public."stock_movements" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movements_outlet_id" ON public."stock_movements" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movements_reversal_of_id" ON public."stock_movements" USING btree ("reversal_of_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movements_created_by" ON public."stock_movements" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_movements_updated_by" ON public."stock_movements" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_tenant_id" ON public."stock_movement_lines" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_stock_movement_id" ON public."stock_movement_lines" USING btree ("stock_movement_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_ingredient_id" ON public."stock_movement_lines" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_storage_location_id" ON public."stock_movement_lines" USING btree ("storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_stock_batch_id" ON public."stock_movement_lines" USING btree ("stock_batch_id");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_created_by" ON public."stock_movement_lines" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_movement_lines_updated_by" ON public."stock_movement_lines" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_tenant_id" ON public."stock_opnames" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_outlet_id" ON public."stock_opnames" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_storage_location_id" ON public."stock_opnames" USING btree ("storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_counted_by" ON public."stock_opnames" USING btree ("counted_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_approved_by" ON public."stock_opnames" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_created_by" ON public."stock_opnames" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opnames_updated_by" ON public."stock_opnames" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_tenant_id" ON public."stock_opname_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_stock_opname_id" ON public."stock_opname_items" USING btree ("stock_opname_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_ingredient_id" ON public."stock_opname_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_stock_batch_id" ON public."stock_opname_items" USING btree ("stock_batch_id");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_created_by" ON public."stock_opname_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_opname_items_updated_by" ON public."stock_opname_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_tenant_id" ON public."stock_transfers" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_from_outlet_id" ON public."stock_transfers" USING btree ("from_outlet_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_from_location_id" ON public."stock_transfers" USING btree ("from_location_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_to_outlet_id" ON public."stock_transfers" USING btree ("to_outlet_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_to_location_id" ON public."stock_transfers" USING btree ("to_location_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_requested_by" ON public."stock_transfers" USING btree ("requested_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_approved_by" ON public."stock_transfers" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_sent_by" ON public."stock_transfers" USING btree ("sent_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_received_by" ON public."stock_transfers" USING btree ("received_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_created_by" ON public."stock_transfers" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfers_updated_by" ON public."stock_transfers" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_tenant_id" ON public."stock_transfer_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_stock_transfer_id" ON public."stock_transfer_items" USING btree ("stock_transfer_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_ingredient_id" ON public."stock_transfer_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_source_batch_id" ON public."stock_transfer_items" USING btree ("source_batch_id");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_created_by" ON public."stock_transfer_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_stock_transfer_items_updated_by" ON public."stock_transfer_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_waste_reason_codes_tenant_id" ON public."waste_reason_codes" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_waste_reason_codes_created_by" ON public."waste_reason_codes" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_waste_reason_codes_updated_by" ON public."waste_reason_codes" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_waste_reason_codes_deleted_by" ON public."waste_reason_codes" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_waste_records_tenant_id" ON public."waste_records" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_waste_records_outlet_id" ON public."waste_records" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_waste_records_storage_location_id" ON public."waste_records" USING btree ("storage_location_id");
CREATE INDEX IF NOT EXISTS "ix_waste_records_reported_by" ON public."waste_records" USING btree ("reported_by");
CREATE INDEX IF NOT EXISTS "ix_waste_records_approved_by" ON public."waste_records" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_waste_records_created_by" ON public."waste_records" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_waste_records_updated_by" ON public."waste_records" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_tenant_id" ON public."waste_record_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_waste_record_id" ON public."waste_record_items" USING btree ("waste_record_id");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_ingredient_id" ON public."waste_record_items" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_stock_batch_id" ON public."waste_record_items" USING btree ("stock_batch_id");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_reason_code_id" ON public."waste_record_items" USING btree ("reason_code_id");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_created_by" ON public."waste_record_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_waste_record_items_updated_by" ON public."waste_record_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_dining_areas_tenant_id" ON public."dining_areas" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_dining_areas_outlet_id" ON public."dining_areas" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_dining_areas_created_by" ON public."dining_areas" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_dining_areas_updated_by" ON public."dining_areas" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_dining_areas_deleted_by" ON public."dining_areas" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_tenant_id" ON public."dining_tables" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_outlet_id" ON public."dining_tables" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_dining_area_id" ON public."dining_tables" USING btree ("dining_area_id");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_created_by" ON public."dining_tables" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_updated_by" ON public."dining_tables" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_dining_tables_deleted_by" ON public."dining_tables" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_customers_tenant_id" ON public."customers" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_customers_created_by" ON public."customers" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_customers_updated_by" ON public."customers" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_customers_deleted_by" ON public."customers" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_reservations_tenant_id" ON public."reservations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_reservations_outlet_id" ON public."reservations" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_reservations_customer_id" ON public."reservations" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "ix_reservations_created_by" ON public."reservations" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_reservations_updated_by" ON public."reservations" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_reservation_tables_tenant_id" ON public."reservation_tables" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_tables_reservation_id" ON public."reservation_tables" USING btree ("reservation_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_tables_table_id" ON public."reservation_tables" USING btree ("table_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_tables_created_by" ON public."reservation_tables" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_reservation_tables_updated_by" ON public."reservation_tables" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_reservation_status_history_tenant_id" ON public."reservation_status_history" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_status_history_reservation_id" ON public."reservation_status_history" USING btree ("reservation_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_status_history_changed_by" ON public."reservation_status_history" USING btree ("changed_by");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_tenant_id" ON public."reservation_deposits" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_outlet_id" ON public."reservation_deposits" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_reservation_id" ON public."reservation_deposits" USING btree ("reservation_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_payment_method_id" ON public."reservation_deposits" USING btree ("payment_method_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_applied_order_id" ON public."reservation_deposits" USING btree ("applied_order_id");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_created_by" ON public."reservation_deposits" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_reservation_deposits_updated_by" ON public."reservation_deposits" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_payment_methods_tenant_id" ON public."payment_methods" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_payment_methods_outlet_id" ON public."payment_methods" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_payment_methods_created_by" ON public."payment_methods" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_payment_methods_updated_by" ON public."payment_methods" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_payment_methods_deleted_by" ON public."payment_methods" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_tax_profiles_tenant_id" ON public."tax_profiles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_tax_profiles_created_by" ON public."tax_profiles" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_tax_profiles_updated_by" ON public."tax_profiles" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_service_charge_profiles_tenant_id" ON public."service_charge_profiles" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_service_charge_profiles_created_by" ON public."service_charge_profiles" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_service_charge_profiles_updated_by" ON public."service_charge_profiles" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_discounts_tenant_id" ON public."discounts" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_discounts_created_by" ON public."discounts" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_discounts_updated_by" ON public."discounts" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_discounts_deleted_by" ON public."discounts" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_cash_registers_tenant_id" ON public."cash_registers" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_cash_registers_outlet_id" ON public."cash_registers" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_cash_registers_created_by" ON public."cash_registers" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_cash_registers_updated_by" ON public."cash_registers" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_cash_registers_deleted_by" ON public."cash_registers" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_tenant_id" ON public."cash_sessions" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_outlet_id" ON public."cash_sessions" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_cash_register_id" ON public."cash_sessions" USING btree ("cash_register_id");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_cashier_id" ON public."cash_sessions" USING btree ("cashier_id");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_closed_by" ON public."cash_sessions" USING btree ("closed_by");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_created_by" ON public."cash_sessions" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_cash_sessions_updated_by" ON public."cash_sessions" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_tenant_id" ON public."cash_movements" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_outlet_id" ON public."cash_movements" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_cash_session_id" ON public."cash_movements" USING btree ("cash_session_id");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_approved_by" ON public."cash_movements" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_created_by" ON public."cash_movements" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_cash_movements_updated_by" ON public."cash_movements" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_orders_tenant_id" ON public."orders" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_orders_outlet_id" ON public."orders" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_orders_table_id" ON public."orders" USING btree ("table_id");
CREATE INDEX IF NOT EXISTS "ix_orders_reservation_id" ON public."orders" USING btree ("reservation_id");
CREATE INDEX IF NOT EXISTS "ix_orders_customer_id" ON public."orders" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "ix_orders_cash_session_id" ON public."orders" USING btree ("cash_session_id");
CREATE INDEX IF NOT EXISTS "ix_orders_voided_by" ON public."orders" USING btree ("voided_by");
CREATE INDEX IF NOT EXISTS "ix_orders_created_by" ON public."orders" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_orders_updated_by" ON public."orders" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_order_items_tenant_id" ON public."order_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_order_items_order_id" ON public."order_items" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "ix_order_items_menu_id" ON public."order_items" USING btree ("menu_id");
CREATE INDEX IF NOT EXISTS "ix_order_items_menu_variant_id" ON public."order_items" USING btree ("menu_variant_id");
CREATE INDEX IF NOT EXISTS "ix_order_items_recipe_id" ON public."order_items" USING btree ("recipe_id");
CREATE INDEX IF NOT EXISTS "ix_order_items_created_by" ON public."order_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_order_items_updated_by" ON public."order_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_tenant_id" ON public."order_item_modifiers" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_order_item_id" ON public."order_item_modifiers" USING btree ("order_item_id");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_modifier_option_id" ON public."order_item_modifiers" USING btree ("modifier_option_id");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_ingredient_id" ON public."order_item_modifiers" USING btree ("ingredient_id");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_unit_id" ON public."order_item_modifiers" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_created_by" ON public."order_item_modifiers" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_order_item_modifiers_updated_by" ON public."order_item_modifiers" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_tenant_id" ON public."order_discounts" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_order_id" ON public."order_discounts" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_order_item_id" ON public."order_discounts" USING btree ("order_item_id");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_discount_id" ON public."order_discounts" USING btree ("discount_id");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_approved_by" ON public."order_discounts" USING btree ("approved_by");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_created_by" ON public."order_discounts" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_order_discounts_updated_by" ON public."order_discounts" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_order_payments_tenant_id" ON public."order_payments" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_order_payments_outlet_id" ON public."order_payments" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_order_payments_order_id" ON public."order_payments" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "ix_order_payments_cash_session_id" ON public."order_payments" USING btree ("cash_session_id");
CREATE INDEX IF NOT EXISTS "ix_order_payments_payment_method_id" ON public."order_payments" USING btree ("payment_method_id");
CREATE INDEX IF NOT EXISTS "ix_order_payments_voided_by" ON public."order_payments" USING btree ("voided_by");
CREATE INDEX IF NOT EXISTS "ix_order_payments_created_by" ON public."order_payments" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_order_payments_updated_by" ON public."order_payments" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_order_status_history_tenant_id" ON public."order_status_history" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_order_status_history_order_id" ON public."order_status_history" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "ix_order_status_history_changed_by" ON public."order_status_history" USING btree ("changed_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_stations_tenant_id" ON public."kitchen_stations" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_stations_outlet_id" ON public."kitchen_stations" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_stations_created_by" ON public."kitchen_stations" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_stations_updated_by" ON public."kitchen_stations" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_stations_deleted_by" ON public."kitchen_stations" USING btree ("deleted_by");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_tenant_id" ON public."menu_station_routes" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_outlet_id" ON public."menu_station_routes" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_menu_id" ON public."menu_station_routes" USING btree ("menu_id");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_menu_variant_id" ON public."menu_station_routes" USING btree ("menu_variant_id");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_kitchen_station_id" ON public."menu_station_routes" USING btree ("kitchen_station_id");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_created_by" ON public."menu_station_routes" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_menu_station_routes_updated_by" ON public."menu_station_routes" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_tenant_id" ON public."kitchen_tickets" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_outlet_id" ON public."kitchen_tickets" USING btree ("outlet_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_order_id" ON public."kitchen_tickets" USING btree ("order_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_kitchen_station_id" ON public."kitchen_tickets" USING btree ("kitchen_station_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_created_by" ON public."kitchen_tickets" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_tickets_updated_by" ON public."kitchen_tickets" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_items_tenant_id" ON public."kitchen_ticket_items" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_items_kitchen_ticket_id" ON public."kitchen_ticket_items" USING btree ("kitchen_ticket_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_items_order_item_id" ON public."kitchen_ticket_items" USING btree ("order_item_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_items_created_by" ON public."kitchen_ticket_items" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_items_updated_by" ON public."kitchen_ticket_items" USING btree ("updated_by");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_status_history_tenant_id" ON public."kitchen_ticket_status_history" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_status_history_kitchen_ticket_id" ON public."kitchen_ticket_status_history" USING btree ("kitchen_ticket_id");
CREATE INDEX IF NOT EXISTS "ix_kitchen_ticket_status_history_changed_by" ON public."kitchen_ticket_status_history" USING btree ("changed_by");

-- ---------------------------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER "trg_tenants_updated_at"
BEFORE UPDATE ON public."tenants"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_outlets_updated_at"
BEFORE UPDATE ON public."outlets"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_users_updated_at"
BEFORE UPDATE ON public."users"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_roles_updated_at"
BEFORE UPDATE ON public."roles"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_permissions_updated_at"
BEFORE UPDATE ON public."permissions"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_user_roles_updated_at"
BEFORE UPDATE ON public."user_roles"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_role_permissions_updated_at"
BEFORE UPDATE ON public."role_permissions"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_document_sequences_updated_at"
BEFORE UPDATE ON public."document_sequences"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_units_updated_at"
BEFORE UPDATE ON public."units"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_unit_conversions_updated_at"
BEFORE UPDATE ON public."unit_conversions"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_ingredient_categories_updated_at"
BEFORE UPDATE ON public."ingredient_categories"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_ingredients_updated_at"
BEFORE UPDATE ON public."ingredients"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_ingredient_outlet_settings_updated_at"
BEFORE UPDATE ON public."ingredient_outlet_settings"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_suppliers_updated_at"
BEFORE UPDATE ON public."suppliers"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_supplier_ingredients_updated_at"
BEFORE UPDATE ON public."supplier_ingredients"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_menu_categories_updated_at"
BEFORE UPDATE ON public."menu_categories"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_menus_updated_at"
BEFORE UPDATE ON public."menus"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_menu_variants_updated_at"
BEFORE UPDATE ON public."menu_variants"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_recipes_updated_at"
BEFORE UPDATE ON public."recipes"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_recipe_items_updated_at"
BEFORE UPDATE ON public."recipe_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_modifier_groups_updated_at"
BEFORE UPDATE ON public."modifier_groups"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_modifier_options_updated_at"
BEFORE UPDATE ON public."modifier_options"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_menu_modifier_groups_updated_at"
BEFORE UPDATE ON public."menu_modifier_groups"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_budgets_updated_at"
BEFORE UPDATE ON public."budgets"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_budget_lines_updated_at"
BEFORE UPDATE ON public."budget_lines"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_purchase_requests_updated_at"
BEFORE UPDATE ON public."purchase_requests"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_purchase_request_items_updated_at"
BEFORE UPDATE ON public."purchase_request_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_purchase_orders_updated_at"
BEFORE UPDATE ON public."purchase_orders"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_purchase_order_items_updated_at"
BEFORE UPDATE ON public."purchase_order_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_goods_receipts_updated_at"
BEFORE UPDATE ON public."goods_receipts"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_goods_receipt_items_updated_at"
BEFORE UPDATE ON public."goods_receipt_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_storage_locations_updated_at"
BEFORE UPDATE ON public."storage_locations"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_batches_updated_at"
BEFORE UPDATE ON public."stock_batches"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_movements_updated_at"
BEFORE UPDATE ON public."stock_movements"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_movement_lines_updated_at"
BEFORE UPDATE ON public."stock_movement_lines"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_opnames_updated_at"
BEFORE UPDATE ON public."stock_opnames"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_opname_items_updated_at"
BEFORE UPDATE ON public."stock_opname_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_transfers_updated_at"
BEFORE UPDATE ON public."stock_transfers"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_stock_transfer_items_updated_at"
BEFORE UPDATE ON public."stock_transfer_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_waste_reason_codes_updated_at"
BEFORE UPDATE ON public."waste_reason_codes"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_waste_records_updated_at"
BEFORE UPDATE ON public."waste_records"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_waste_record_items_updated_at"
BEFORE UPDATE ON public."waste_record_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_dining_areas_updated_at"
BEFORE UPDATE ON public."dining_areas"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_dining_tables_updated_at"
BEFORE UPDATE ON public."dining_tables"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_customers_updated_at"
BEFORE UPDATE ON public."customers"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_reservations_updated_at"
BEFORE UPDATE ON public."reservations"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_reservation_tables_updated_at"
BEFORE UPDATE ON public."reservation_tables"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_reservation_deposits_updated_at"
BEFORE UPDATE ON public."reservation_deposits"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_payment_methods_updated_at"
BEFORE UPDATE ON public."payment_methods"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_tax_profiles_updated_at"
BEFORE UPDATE ON public."tax_profiles"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_service_charge_profiles_updated_at"
BEFORE UPDATE ON public."service_charge_profiles"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_discounts_updated_at"
BEFORE UPDATE ON public."discounts"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_cash_registers_updated_at"
BEFORE UPDATE ON public."cash_registers"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_cash_sessions_updated_at"
BEFORE UPDATE ON public."cash_sessions"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_cash_movements_updated_at"
BEFORE UPDATE ON public."cash_movements"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_orders_updated_at"
BEFORE UPDATE ON public."orders"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_order_items_updated_at"
BEFORE UPDATE ON public."order_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_order_item_modifiers_updated_at"
BEFORE UPDATE ON public."order_item_modifiers"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_order_discounts_updated_at"
BEFORE UPDATE ON public."order_discounts"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_order_payments_updated_at"
BEFORE UPDATE ON public."order_payments"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_kitchen_stations_updated_at"
BEFORE UPDATE ON public."kitchen_stations"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_menu_station_routes_updated_at"
BEFORE UPDATE ON public."menu_station_routes"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_kitchen_tickets_updated_at"
BEFORE UPDATE ON public."kitchen_tickets"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER "trg_kitchen_ticket_items_updated_at"
BEFORE UPDATE ON public."kitchen_ticket_items"
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- MULTI-TENANT ROW LEVEL SECURITY
-- JWT must contain a tenant_id claim. Service-role/database owners bypass RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.tenant_id', true), ''),
    NULLIF((NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'tenant_id'), '')
  )::uuid;
$$;

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['outlets', 'users', 'roles', 'user_roles', 'role_permissions', 'audit_logs', 'document_sequences', 'units', 'unit_conversions', 'ingredient_categories', 'ingredients', 'ingredient_outlet_settings', 'suppliers', 'supplier_ingredients', 'menu_categories', 'menus', 'menu_variants', 'recipes', 'recipe_items', 'modifier_groups', 'modifier_options', 'menu_modifier_groups', 'budgets', 'budget_lines', 'budget_status_history', 'purchase_requests', 'purchase_request_items', 'purchase_orders', 'purchase_order_items', 'goods_receipts', 'goods_receipt_items', 'storage_locations', 'stock_batches', 'stock_movements', 'stock_movement_lines', 'stock_opnames', 'stock_opname_items', 'stock_transfers', 'stock_transfer_items', 'waste_reason_codes', 'waste_records', 'waste_record_items', 'dining_areas', 'dining_tables', 'customers', 'reservations', 'reservation_tables', 'reservation_status_history', 'reservation_deposits', 'payment_methods', 'tax_profiles', 'service_charge_profiles', 'discounts', 'cash_registers', 'cash_sessions', 'cash_movements', 'orders', 'order_items', 'order_item_modifiers', 'order_discounts', 'order_payments', 'order_status_history', 'kitchen_stations', 'menu_station_routes', 'kitchen_tickets', 'kitchen_ticket_items', 'kitchen_ticket_status_history']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target_table);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = target_table AND policyname = 'tenant_isolation'
    ) THEN
      EXECUTE format(
        'CREATE POLICY tenant_isolation ON public.%I FOR ALL USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())',
        target_table
      );
    END IF;
  END LOOP;
END $$;

ALTER TABLE public."tenants" ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tenants' AND policyname='tenant_self') THEN
    CREATE POLICY tenant_self ON public."tenants"
      FOR ALL USING (id = public.current_tenant_id()) WITH CHECK (id = public.current_tenant_id());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- MATERIALIZED REPORTING VIEW
-- Source-of-truth remains orders, payments, and stock ledger.
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS public."daily_outlet_metrics" AS
WITH sales AS (
  SELECT
    tenant_id, outlet_id, business_date,
    sum(subtotal)::numeric(18,2) AS gross_sales,
    sum(discount_amount)::numeric(18,2) AS discount_amount,
    sum(subtotal - discount_amount)::numeric(18,2) AS net_sales,
    sum(tax_amount)::numeric(18,2) AS tax_amount,
    sum(service_charge_amount)::numeric(18,2) AS service_charge_amount,
    count(*)::integer AS transaction_count,
    sum(coalesce(guest_count, 0))::integer AS guest_count
  FROM public.orders
  WHERE status IN ('paid', 'completed')
  GROUP BY tenant_id, outlet_id, business_date
), stock_cost AS (
  SELECT
    sm.tenant_id, sm.outlet_id, sm.business_date,
    sum(CASE WHEN sm.movement_type = 'sale_consumption' THEN -sml.value_delta ELSE 0 END)::numeric(18,2) AS cogs_amount,
    sum(CASE WHEN sm.movement_type = 'waste' THEN -sml.value_delta ELSE 0 END)::numeric(18,2) AS waste_amount
  FROM public.stock_movements sm
  JOIN public.stock_movement_lines sml ON sml.stock_movement_id = sm.id
  WHERE sm.status = 'posted' AND sm.movement_type IN ('sale_consumption', 'waste')
  GROUP BY sm.tenant_id, sm.outlet_id, sm.business_date
), metric_dates AS (
  SELECT tenant_id, outlet_id, business_date FROM sales
  UNION
  SELECT tenant_id, outlet_id, business_date FROM stock_cost
)
SELECT
  d.tenant_id, d.outlet_id, d.business_date,
  coalesce(s.gross_sales, 0)::numeric(18,2) AS gross_sales,
  coalesce(s.discount_amount, 0)::numeric(18,2) AS discount_amount,
  coalesce(s.net_sales, 0)::numeric(18,2) AS net_sales,
  coalesce(s.tax_amount, 0)::numeric(18,2) AS tax_amount,
  coalesce(s.service_charge_amount, 0)::numeric(18,2) AS service_charge_amount,
  coalesce(sc.cogs_amount, 0)::numeric(18,2) AS cogs_amount,
  coalesce(sc.waste_amount, 0)::numeric(18,2) AS waste_amount,
  coalesce(s.transaction_count, 0)::integer AS transaction_count,
  coalesce(s.guest_count, 0)::integer AS guest_count,
  CASE WHEN coalesce(s.transaction_count, 0) = 0 THEN 0 ELSE (s.net_sales / s.transaction_count) END::numeric(18,2) AS average_transaction_value,
  (coalesce(s.net_sales, 0) - coalesce(sc.cogs_amount, 0))::numeric(18,2) AS gross_margin_amount,
  now() AS refreshed_at
FROM metric_dates d
LEFT JOIN sales s USING (tenant_id, outlet_id, business_date)
LEFT JOIN stock_cost sc USING (tenant_id, outlet_id, business_date)
WITH NO DATA;
COMMENT ON MATERIALIZED VIEW public."daily_outlet_metrics" IS 'Read model KPI harian; refresh setelah posting transaksi atau melalui scheduled job.';
CREATE UNIQUE INDEX IF NOT EXISTS "pk_daily_metrics" ON public."daily_outlet_metrics" USING btree ("tenant_id", "outlet_id", "business_date");
CREATE INDEX IF NOT EXISTS "ix_daily_outlet_metrics_tenant_id" ON public."daily_outlet_metrics" USING btree ("tenant_id");
CREATE INDEX IF NOT EXISTS "ix_daily_outlet_metrics_outlet_id" ON public."daily_outlet_metrics" USING btree ("outlet_id");
REVOKE ALL ON TABLE public."daily_outlet_metrics" FROM PUBLIC;

-- First refresh after seed/transaction data exists:
-- REFRESH MATERIALIZED VIEW public."daily_outlet_metrics";
-- Subsequent refreshes may use CONCURRENTLY after the first successful refresh:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY public."daily_outlet_metrics";

COMMIT;

-- END OF MIGRATION