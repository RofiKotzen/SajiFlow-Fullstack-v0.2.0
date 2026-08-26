# Saji Flow Full-stack v0.4.0

Versi ini menambahkan **Purchase Order Phase 1** yang terhubung penuh ke PostgreSQL, sekaligus mempertahankan autentikasi, tenant, outlet, user, role, permission, reset password, dan Budget Planning dari versi sebelumnya.

## Fitur Purchase Order

- Daftar dan detail PO per tenant serta outlet.
- Pembuatan dan perubahan PO selama masih berstatus `draft`.
- Pemilihan bahan berdasarkan katalog supplier aktif.
- Validasi MOQ, supplier, satuan, tenant, dan akses outlet di server.
- Snapshot harga serta konversi satuan pada setiap item PO.
- Nomor PO otomatis per outlet dan tanggal dengan format `PO-YYMMDD-####`.
- Subtotal, diskon, pajak, ongkir, dan grand total dihitung ulang oleh server.
- Workflow `draft → approved → sent → partially_received/received → closed`.
- Pembatalan beralasan untuk PO yang belum menerima barang.
- Permission terpisah untuk read, create, update, approve, send, cancel, dan close.
- Audit trail untuk pembuatan, perubahan, dan seluruh perpindahan status.

Status `partially_received` dan `received` sengaja tidak memiliki tombol manual. Keduanya akan diperbarui oleh modul **Goods Receipt** agar penerimaan barang dan perubahan stok selalu konsisten.

## Update dari v0.3.0

1. Tutup semua terminal backend dan frontend yang masih berjalan.
2. Commit atau backup folder project lama.
3. Salin folder `backend` dan `frontend` dari paket ini ke project lama, lalu pilih **Replace/Overwrite**.
4. Pertahankan file konfigurasi lokal lama:

   ```text
   backend\.env
   frontend\.env.local
   ```

   Kedua file tersebut tidak ada di ZIP agar password dan secret lokal tidak ikut dibagikan atau tertimpa.

5. Jalankan pada terminal backend:

   ```powershell
   cd backend
   npm.cmd install
   npm.cmd run db:migrate
   npm.cmd run db:seed
   npm.cmd run build
   npm.cmd run start:dev
   ```

   Tidak ada migration tabel baru karena tabel Purchase Order sudah termasuk schema awal. Namun, `db:seed` **wajib** dijalankan ulang untuk menambahkan permission serta contoh master supplier, satuan, bahan, dan katalog. Seed aman dijalankan berulang dan tidak mengganti password admin yang sudah ada.

6. Buka terminal baru dari root project, lalu jalankan frontend:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

7. Logout lalu login kembali agar access token memuat permission Purchase Order.
8. Buka menu **Purchase Order**.

## Instalasi baru

Pada PowerShell di root project:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\1-setup.ps1
```

Isi `backend\.env`, lalu jalankan:

```powershell
.\2-init-database.ps1
.\3-start.ps1
```

Alamat lokal:

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:3000>
- Swagger: <http://localhost:3000/docs>
- Health: <http://localhost:3000/api/v1/health>

Jangan menjalankan `3-start.ps1` ketika backend atau frontend masih aktif pada terminal lain. Script akan berhenti dengan pesan yang jelas bila port 3000 atau 5173 sedang dipakai.

## Akun pengujian

- Kode tenant: `SAJIFLOW`
- Email: `admin@sajiflow.local`
- Password: nilai `SEED_ADMIN_PASSWORD` di `backend\.env`

## Verifikasi cepat Purchase Order

1. Jalankan `db:seed`, kemudian logout dan login ulang.
2. Buka **Purchase Order** dan klik **Buat Purchase Order**.
3. Pilih outlet dan supplier; katalog bahan contoh akan tersedia otomatis.
4. Simpan draft, buka kembali detailnya, lalu uji **Edit Draft**.
5. Setujui PO, kemudian pilih **Tandai Dikirim**.
6. Buat PO kedua dan uji pembatalan dengan alasan minimal tiga karakter.
7. Pastikan PO yang sudah disetujui tidak lagi dapat diedit dan seluruh aksi muncul di riwayat aktivitas.

## Catatan keamanan dan scope

- Jangan commit `backend\.env` atau `frontend\.env.local`.
- Pisahkan role pembuat dan penyetuju sebelum dipakai dalam operasional nyata.
- Purchase Order v0.4.0 belum membuat pergerakan stok. Stok baru berubah melalui modul Goods Receipt berikutnya.
- Integrasi komitmen PO ke realisasi Budget Planning akan diaktifkan setelah hubungan kategori anggaran dan transaksi pembelian disepakati.
