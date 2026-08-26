-- Saji Flow backend authentication tables.
-- Run after 0001_initial_schema.sql.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_credentials (
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  password_hash text NOT NULL,
  failed_attempts smallint NOT NULL DEFAULT 0,
  locked_until timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT pk_user_credentials PRIMARY KEY (user_id),
  CONSTRAINT fk_user_credentials_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_credentials_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT ck_user_credentials_failed_attempts CHECK (failed_attempts BETWEEN 0 AND 100)
);

CREATE INDEX IF NOT EXISTS ix_user_credentials_tenant ON public.user_credentials (tenant_id);

CREATE TABLE IF NOT EXISTS public.refresh_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_id uuid NOT NULL,
  token_hash char(64) NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  replaced_by_token_id uuid,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pk_refresh_tokens PRIMARY KEY (id),
  CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
  CONSTRAINT fk_refresh_tokens_tenant FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_refresh_tokens_replacement FOREIGN KEY (replaced_by_token_id) REFERENCES public.refresh_tokens(id),
  CONSTRAINT ck_refresh_tokens_expiry CHECK (expires_at > created_at),
  CONSTRAINT ck_refresh_tokens_revocation CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX IF NOT EXISTS ix_refresh_tokens_user_active
  ON public.refresh_tokens (tenant_id, user_id, expires_at)
  WHERE revoked_at IS NULL;

DROP TRIGGER IF EXISTS trg_user_credentials_updated_at ON public.user_credentials;
CREATE TRIGGER trg_user_credentials_updated_at
  BEFORE UPDATE ON public.user_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON public.user_credentials;
CREATE POLICY tenant_isolation ON public.user_credentials
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON public.refresh_tokens;
CREATE POLICY tenant_isolation ON public.refresh_tokens
  FOR ALL
  USING (tenant_id = public.current_tenant_id())
  WITH CHECK (tenant_id = public.current_tenant_id());

COMMENT ON TABLE public.user_credentials IS
  'Hash kredensial login lokal. Tidak pernah dikirim melalui API atau audit log.';
COMMENT ON TABLE public.refresh_tokens IS
  'Refresh token yang sudah di-hash untuk rotasi dan pencabutan sesi.';

COMMIT;
