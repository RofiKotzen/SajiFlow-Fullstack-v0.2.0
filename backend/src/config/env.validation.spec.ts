import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const valid = {
    DATABASE_URL: 'postgresql://postgres:password@localhost:5432/sajiflow',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('uses port 3000 by default', () => {
    expect(validateEnv(valid).PORT).toBe(3000);
  });

  it('rejects short JWT secrets', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(
      'JWT_ACCESS_SECRET minimal 32 karakter',
    );
  });

  it('rejects an invalid port', () => {
    expect(() => validateEnv({ ...valid, PORT: '99999' })).toThrow(
      'PORT harus berupa angka 1-65535',
    );
  });
});
