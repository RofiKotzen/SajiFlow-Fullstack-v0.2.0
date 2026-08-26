# Saji Flow Full-stack v0.2.0

Paket ini menyatukan frontend Kotzen Operation/Saji Flow dengan backend PostgreSQL yang sudah dibuat.

## Yang sudah terhubung ke database

- Login dan logout.
- Access token serta refresh-token rotation.
- Profil tenant.
- Daftar, tambah, aktifkan, dan nonaktifkan outlet.
- Daftar, tambah, aktifkan, suspend, dan assignment role user.
- Daftar dan tambah role.
- Assignment permission ke role.
- Katalog permission.
- Pemilihan outlet aktif pada header.

Menu POS, KDS, inventory, purchasing, budget, supplier, dan resep tetap mempertahankan mock data untuk sementara. Endpoint modul tersebut akan disambungkan pada fase berikutnya.

## Persyaratan

- PostgreSQL 16+ aktif pada port `5432`.
- Database `sajiflow` sudah tersedia.
- Node.js 22+.

## Cara paling mudah di Windows

Jalankan file berikut secara berurutan dari PowerShell:

```powershell
.\1-setup.ps1
```

Setelah dependency selesai, buka `backend\.env` lalu isi:

- Password PostgreSQL pada `DATABASE_URL`.
- `JWT_ACCESS_SECRET` minimal 32 karakter.
- `JWT_REFRESH_SECRET` minimal 32 karakter dan berbeda.
- `SEED_ADMIN_PASSWORD` untuk password login awal.

Kemudian jalankan:

```powershell
.\2-init-database.ps1
.\3-start.ps1
```

File `3-start.ps1` membuka dua terminal:

- Backend: `http://localhost:3000`
- Frontend: `http://localhost:5173`

Buka frontend pada <http://localhost:5173>.

## Login pertama

Gunakan nilai dari `backend\.env`:

```text
Tenant : SEED_TENANT_CODE
Email  : SEED_ADMIN_EMAIL
Password: SEED_ADMIN_PASSWORD
```

Nilai default tenant dan email adalah:

```text
SAJIFLOW
admin@sajiflow.local
```

## Menjalankan manual

Terminal pertama:

```powershell
cd backend
npm.cmd install
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run start:dev
```

Terminal kedua:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

## Dokumentasi API

Setelah backend aktif, buka <http://localhost:3000/docs>.

## Catatan

- Jangan mengirim atau mengunggah file `backend\.env`.
- Jangan menghapus migration `0001` dan `0002`.
- Migration runner otomatis mengenali schema v1.1 yang sudah pernah dijalankan.
- Perubahan role dan permission aktif setelah user login ulang atau melakukan refresh token.
- Untuk fase lokal/MVP, token disimpan pada penyimpanan browser. Sebelum production publik, refresh token akan dipindahkan ke cookie HttpOnly dan backend ditempatkan di HTTPS.
