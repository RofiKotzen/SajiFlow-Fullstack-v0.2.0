# Saji Flow Backend v0.5.0

Backend Saji Flow untuk PostgreSQL: autentikasi dan organisasi, Budget Planning, Purchase Order, serta Goods Receipt.

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
- Budget Planning multi-outlet dengan alokasi, realisasi, approval workflow, audit, dan histori status.
- Purchase Order multi-outlet dengan katalog supplier, snapshot harga/konversi, kalkulasi server, workflow, dan audit trail.
- Goods Receipt dengan penerimaan parsial, batch/expiry, posting stok atomik, reversal, update status PO, RBAC, dan audit trail.

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

| Method    | Endpoint                        | Permission                 | Fungsi                                              |
| --------- | ------------------------------- | -------------------------- | --------------------------------------------------- |
| POST      | `/api/v1/auth/login`            | Public                     | Login                                               |
| POST      | `/api/v1/auth/refresh`          | Public                     | Rotasi refresh token                                |
| POST      | `/api/v1/auth/logout`           | Public                     | Cabut refresh token                                 |
| GET       | `/api/v1/auth/me`               | Login                      | Profil dan hak akses aktif                          |
| GET       | `/api/v1/tenant`                | `tenant.read`              | Profil tenant aktif                                 |
| PATCH     | `/api/v1/tenant`                | `tenant.update`            | Ubah tenant                                         |
| GET/POST  | `/api/v1/outlets`               | `outlets.read/create`      | Daftar/buat outlet                                  |
| GET/PATCH | `/api/v1/outlets/:id`           | `outlets.read/update`      | Detail/ubah outlet                                  |
| GET/POST  | `/api/v1/users`                 | `users.read/create`        | Daftar/buat user                                    |
| GET/PATCH | `/api/v1/users/:id`             | `users.read/update`        | Detail/ubah user                                    |
| PUT       | `/api/v1/users/:id/roles`       | `users.assign_roles`       | Ganti assignment role user                          |
| PUT       | `/api/v1/users/:id/password`    | `users.reset_password`     | Reset password dan cabut seluruh refresh token user |
| GET/POST  | `/api/v1/roles`                 | `roles.read/create`        | Daftar/buat role                                    |
| GET/PATCH | `/api/v1/roles/:id`             | `roles.read/update`        | Detail/ubah role                                    |
| PUT       | `/api/v1/roles/:id/permissions` | `roles.assign_permissions` | Ganti permission role                               |
| GET       | `/api/v1/permissions`           | `permissions.read`         | Katalog permission                                  |
| GET/POST  | `/api/v1/budgets`               | `budgets.read/create`      | Daftar/buat rencana anggaran                        |
| GET/PATCH | `/api/v1/budgets/:id`           | `budgets.read/update`      | Detail/ubah draft anggaran                          |
| POST      | `/api/v1/budgets/:id/submit`    | `budgets.submit`           | Ajukan anggaran                                     |
| POST      | `/api/v1/budgets/:id/approve`   | `budgets.approve`          | Setujui anggaran                                    |
| POST      | `/api/v1/budgets/:id/reject`    | `budgets.reject`           | Tolak anggaran dengan alasan                        |
| POST      | `/api/v1/budgets/:id/close`     | `budgets.close`            | Tutup periode anggaran                              |
| GET/POST  | `/api/v1/purchase-orders`       | `purchase_orders.read/create` | Daftar/buat draft PO                             |
| GET       | `/api/v1/purchase-orders/lookups` | `purchase_orders.read`   | Supplier dan katalog bahan aktif                    |
| GET/PATCH | `/api/v1/purchase-orders/:id`   | `purchase_orders.read/update` | Detail/ubah draft PO                            |
| POST      | `/api/v1/purchase-orders/:id/approve` | `purchase_orders.approve` | Setujui draft PO                              |
| POST      | `/api/v1/purchase-orders/:id/send` | `purchase_orders.send`  | Tandai PO telah dikirim ke supplier                 |
| POST      | `/api/v1/purchase-orders/:id/cancel` | `purchase_orders.cancel` | Batalkan PO dengan alasan wajib                 |
| POST      | `/api/v1/purchase-orders/:id/close` | `purchase_orders.close` | Tutup PO yang sudah diterima                      |
| GET/POST  | `/api/v1/goods-receipts` | `goods_receipts.read/create` | Daftar/buat draft penerimaan |
| GET       | `/api/v1/goods-receipts/lookups` | `goods_receipts.read` | PO siap diterima dan lokasi stok |
| GET/PATCH | `/api/v1/goods-receipts/:id` | `goods_receipts.read/update` | Detail/ubah draft penerimaan |
| POST      | `/api/v1/goods-receipts/:id/post` | `goods_receipts.post` | Posting batch dan ledger stok |
| POST      | `/api/v1/goods-receipts/:id/void` | `goods_receipts.void` | Void melalui reversal stok |

## Aturan penting

- Jalankan `db:migrate` sebelum `db:seed`.
- Jangan commit file `.env`.
- Ganti seluruh secret dan password contoh.
- `PUT .../roles` dan `PUT .../permissions` bersifat **replace**, bukan menambah sebagian.
- Assignment user dengan `outletId: null` berlaku pada seluruh outlet tenant.
- Perubahan role/permission berlaku pada access token berikutnya. Lakukan login ulang atau refresh token untuk mengambil klaim terbaru.
- Seluruh ID dari request tetap diverifikasi terhadap `tenantId` pengguna; ID tenant lain akan ditolak/tidak ditemukan.
- Total anggaran dihitung server dari seluruh `budget_lines`; `actual_amount` tidak menerima input manual dari client.
- Hanya status `draft` atau `rejected` yang dapat diubah. Anggaran `approved` bersifat immutable dan hanya dapat ditutup.
- Anggaran approved dengan nama, outlet, dan periode yang beririsan akan ditolak untuk mencegah baseline ganda.
- Setelah permission Budget Planning ditambahkan, jalankan kembali `npm.cmd run db:seed`, lalu login ulang agar access token memuat permission terbaru.
- Setelah memasang v0.4.0, jalankan kembali `npm.cmd run db:seed` untuk menambahkan permission Purchase Order dan contoh master supplier, bahan, satuan, serta katalog. Seed aman dijalankan berulang.
- Nomor PO dibuat otomatis per outlet dan tanggal. Subtotal, diskon, pajak, biaya kirim, grand total, MOQ, dan konversi satuan diverifikasi kembali oleh server.
- Harga dan konversi satuan disimpan sebagai snapshot pada item PO. Draft dapat diubah; PO yang sudah disetujui tidak dapat diedit.
- Alur PO adalah `draft → approved → sent → partially_received/received → closed`. Status penerimaan hanya akan diubah oleh modul Goods Receipt, bukan secara manual dari Purchase Order.
- PO `draft`, `approved`, atau `sent` dapat dibatalkan bila belum menerima barang; alasan pembatalan wajib diisi.
- Goods Receipt hanya menerima PO `sent/partially_received`; total diterima dan ditolak tidak boleh melebihi sisa PO.
- Posting GR bersifat transaksional: batch, ledger, kuantitas PO, status PO, dan audit dicatat bersama.
- Stock ledger append-only. Koreksi GR posted dilakukan dengan reversal; void ditolak jika stok batch telah terpakai.
- Untuk lokal, koneksi dapat memakai user `postgres`. Sebelum production, gunakan database role khusus aplikasi dan secret manager.

## Struktur migration

- `drizzle/0001_initial_schema.sql`: schema database Saji Flow v1.1 (69 tabel).
- `drizzle/0002_core_auth.sql`: `user_credentials`, `refresh_tokens`, indeks, trigger, dan RLS.
- `drizzle/0003_goods_receipt_extensions.sql`: invoice supplier, kuantitas ditolak, dan validasinya.
- `schema_migrations`: catatan migration yang sudah diterapkan.

Migration runner tidak mengulang `0001` bila tabel `public.tenants` sudah ada. Ini dibuat khusus agar aman melanjutkan database lokal yang sudah kamu siapkan.

## Build production

```powershell
npm.cmd run build
npm.cmd run start
```

Sebelum deployment production, tambahkan rate limiter eksternal/API gateway, HTTPS, secret manager, backup otomatis, serta pengujian integrasi menggunakan database terpisah.
