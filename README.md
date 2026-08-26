# Saji Flow Full-stack v0.3.0

Versi ini menambahkan **Budget Planning Phase 1** yang terhubung penuh ke PostgreSQL dan mempertahankan seluruh fondasi autentikasi, tenant, outlet, user, role, permission, serta fitur reset password dari versi sebelumnya.

## Fitur Budget Planning

- Daftar rencana anggaran per tenant dan outlet.
- Membuat serta mengubah draft anggaran bulanan.
- Alokasi multi-baris dengan kategori pembelian, operasional, pemeliharaan, pemasaran, dan lainnya.
- Total anggaran dihitung otomatis oleh server dari seluruh alokasi.
- Workflow `draft → submitted → approved/rejected → closed`.
- Alasan wajib ketika anggaran ditolak.
- Permission terpisah untuk melihat, membuat, mengubah, mengajukan, menyetujui, menolak, dan menutup.
- Riwayat status dan audit trail.
- Pencegahan baseline approved ganda pada outlet, nama, dan periode yang beririsan.
- Tenant isolation dan pembatasan outlet pada seluruh operasi.

`actual_amount` hanya dapat diperbarui oleh sistem. Pada Phase 1 nilainya masih nol dan akan mulai terisi ketika integrasi Purchase Order/Realisasi dikerjakan.

## Update dari v0.2.0

1. Hentikan terminal backend dan frontend.
2. Commit atau backup folder project lama.
3. Salin folder `backend` dan `frontend` dari paket ini ke project lama, lalu pilih **Replace/Overwrite**.
4. Jangan hapus file konfigurasi lokal berikut:

   ```text
   backend\.env
   frontend\.env.local
   ```

   Kedua file tersebut sengaja tidak disertakan dalam ZIP agar password dan secret Rofi tidak tertimpa.

5. Jalankan pada terminal backend:

   ```powershell
   cd backend
   npm.cmd install
   npm.cmd run db:migrate
   npm.cmd run db:seed
   npm.cmd run build
   npm.cmd run start:dev
   ```

   `db:seed` wajib dijalankan ulang agar permission Budget Planning ditambahkan ke role Super Administrator. Proses seed aman dijalankan berulang dan tidak mengganti password admin yang sudah ada.

6. Buka terminal baru untuk frontend:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

7. Logout lalu login kembali agar access token memuat permission baru.
8. Buka menu **Budget Planning**.

## Instalasi baru

Di PowerShell, jalankan secara berurutan:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\1-setup.ps1
```

Isi `backend\.env`, kemudian lanjutkan:

```powershell
.\2-init-database.ps1
.\3-start.ps1
```

Alamat lokal:

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Health: <http://localhost:3000/api/v1/health>

## Verifikasi cepat

- Buat rencana anggaran dan minimal satu alokasi bernilai lebih dari nol.
- Simpan draft, lalu ajukan persetujuan.
- Dengan Super Administrator, setujui atau tolak anggaran.
- Jika ditolak, ubah dan simpan; status otomatis kembali menjadi draft.
- Anggaran approved tidak dapat diedit dan dapat ditutup.

## Catatan keamanan

- Jangan commit `backend\.env` atau `frontend\.env.local`.
- Jangan mengubah realisasi langsung melalui SQL; nilai tersebut akan berasal dari transaksi sistem.
- Sebelum production, pisahkan permission maker dan approver ke role yang berbeda sesuai kebijakan tenant.
