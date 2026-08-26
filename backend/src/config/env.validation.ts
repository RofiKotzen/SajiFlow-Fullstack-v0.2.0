type Env = Record<string, unknown>;

export function validateEnv(config: Env): Env {
  const required = ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];
  for (const key of required) {
    if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
      throw new Error(`Environment variable ${key} wajib diisi`);
    }
  }

  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
    if ((config[key] as string).length < 32) {
      throw new Error(`${key} minimal 32 karakter`);
    }
  }

  const port = Number(config.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT harus berupa angka 1-65535');
  }

  return { ...config, PORT: port };
}
