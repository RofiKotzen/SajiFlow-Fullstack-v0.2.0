# Saji Flow Backend v0.1.0

Fondasi backend Saji Flow untuk PostgreSQL: koneksi database, autentikasi JWT, tenant, outlet, user, role, dan permission.

## Cakupan

- NestJS 11 + TypeScript.
- PostgreSQL melalui Drizzle ORM dan driver `postgres`.
- Access token 15 menit dan refresh token 7 hari.
- Refresh-token rotation dan pencabutan sesi.
- Password di-hash menggunakan bcrypt cost 12.
- Lock akun 15 menit setelah 5 kali password salah.
- Tenant isolation pada seluruh query core dan RLS database.
- RBAC menggunakan role dan permission.
- Audit log untuk perubahan tenant, outlet, user, role, serta assignment.
- Swagger/OpenAPI di `/docs`.
- Migration runner yang mengenali schema v1.1 yang sudah pernah dijalankan.
- Seed tenant, outlet, permission, role Super Admin, dan admin pertama.

## Persyaratan

- Node.js 22 atau lebih baru.
- PostgreSQL 16 atau lebih baru.
- Database `sajiflow` sudah tersedia.

## Menjalankan di Windows PowerShell

Ekstrak project ke folder baru lalu buka PowerShell pada folder `SajiFlow-Backend`.

1. Salin konfigurasi:

   ```powershell
   Copy-Item .env.example .env
   ```

2. Buka `.env`, lalu isi minimal:

   ```dotenv
   DATABASE_URL=postgresql://postgres:PASSWORD_POSTGRES@localhost:5432/sajiflow
   JWT_ACCESS_SECRET=teks-acak-yang-panjang-minimal-32-karakter
   JWT_REFRESH_SECRET=teks-acak-lain-yang-panjang-minimal-32-karakter
   SEED_ADMIN_PASSWORD=PasswordAdminYangKuat123!
   ```

   Jika password PostgreSQL mengandung `@`, `:`, `/`, `#`, atau karakter khusus lain, URL-encode password tersebut. Contoh `P@ss#123` menjadi `P%40ss%23123`.

3. Instal dependency:

   ```powershell
   npm.cmd install
   ```

4. Jalankan migration:

   ```powershell
   npm.cmd run db:migrate
   ```

   Karena schema v1.1 sudah kamu buat, runner akan menampilkan kira-kira:

   ```text
   BASE  0001_initial_schema.sql (schema awal sudah tersedia)
   APPLY 0002_core_auth.sql
   ```

5. Buat data awal:

   ```powershell
   npm.cmd run db:seed
   ```

6. Jalankan API:

   ```powershell
   npm.cmd run start:dev
   ```

7. Buka:

   - Swagger: <http://localhost:3000/docs>
   - Health check: <http://localhost:3000/api/v1/health>

## Login pertama

Nilai default mengikuti `.env.example`:

```json
{
  "email": "admin@sajiflow.local",
  "password": "nilai-SEED_ADMIN_PASSWORD",
  "tenantCode": "SAJIFLOW"
}
```

Kirim melalui Swagger atau endpoint:

```http
POST /api/v1/auth/login
Content-Type: application/json
```

Salin `accessToken`, klik **Authorize** pada Swagger, lalu masukkan:

```text
Bearer ACCESS_TOKEN
```

## Endpoint inti

| Method | Endpoint | Permission | Fungsi |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Login |
| POST | `/api/v1/auth/refresh` | Public | Rotasi refresh token |
| POST | `/api/v1/auth/logout` | Public | Cabut refresh token |
| GET | `/api/v1/auth/me` | Login | Profil dan hak akses aktif |
| GET | `/api/v1/tenant` | `tenant.read` | Profil tenant aktif |
| PATCH | `/api/v1/tenant` | `tenant.update` | Ubah tenant |
| GET/POST | `/api/v1/outlets` | `outlets.read/create` | Daftar/buat outlet |
| GET/PATCH | `/api/v1/outlets/:id` | `outlets.read/update` | Detail/ubah outlet |
| GET/POST | `/api/v1/users` | `users.read/create` | Daftar/buat user |
| GET/PATCH | `/api/v1/users/:id` | `users.read/update` | Detail/ubah user |
| PUT | `/api/v1/users/:id/roles` | `users.assign_roles` | Ganti assignment role user |
| PUT | `/api/v1/users/:id/password` | `users.reset_password` | Reset password dan cabut seluruh refresh token user |
| GET/POST | `/api/v1/roles` | `roles.read/create` | Daftar/buat role |
| GET/PATCH | `/api/v1/roles/:id` | `roles.read/update` | Detail/ubah role |
| PUT | `/api/v1/roles/:id/permissions` | `roles.assign_permissions` | Ganti permission role |
| GET | `/api/v1/permissions` | `permissions.read` | Katalog permission |

## Aturan penting

- Jalankan `db:migrate` sebelum `db:seed`.
- Jangan commit file `.env`.
- Ganti seluruh secret dan password contoh.
- `PUT .../roles` dan `PUT .../permissions` bersifat **replace**, bukan menambah sebagian.
- Assignment user dengan `outletId: null` berlaku pada seluruh outlet tenant.
- Perubahan role/permission berlaku pada access token berikutnya. Lakukan login ulang atau refresh token untuk mengambil klaim terbaru.
- Seluruh ID dari request tetap diverifikasi terhadap `tenantId` pengguna; ID tenant lain akan ditolak/tidak ditemukan.
- Untuk lokal, koneksi dapat memakai user `postgres`. Sebelum production, gunakan database role khusus aplikasi dan secret manager.

## Struktur migration

- `drizzle/0001_initial_schema.sql`: schema database Saji Flow v1.1 (69 tabel).
- `drizzle/0002_core_auth.sql`: `user_credentials`, `refresh_tokens`, indeks, trigger, dan RLS.
- `schema_migrations`: catatan migration yang sudah diterapkan.

Migration runner tidak mengulang `0001` bila tabel `public.tenants` sudah ada. Ini dibuat khusus agar aman melanjutkan database lokal yang sudah kamu siapkan.

## Build production

```powershell
npm.cmd run build
npm.cmd run start
```

Sebelum deployment production, tambahkan rate limiter eksternal/API gateway, HTTPS, secret manager, backup otomatis, serta pengujian integrasi menggunakan database terpisah.
