# Saji Flow Full-stack v0.6.0

Versi ini menambahkan **Inventory Overview Phase 1** yang membaca saldo aktual dari batch dan immutable stock ledger. Seluruh fitur Goods Receipt v0.5.1 tetap dipertahankan.

## Fitur Inventory Overview

- Ringkasan nilai persediaan, jumlah posisi bahan, batch aktif, dan stok yang perlu perhatian.
- Saldo bahan per outlet dengan rincian lokasi penyimpanan.
- Nilai stok berdasarkan saldo batch dan biaya per base unit.
- Status `Aman`, `Menipis`, `Kritis`, atau `Stok Habis` dari parameter minimum dan reorder point.
- Daftar batch dengan urutan FEFO, tanggal diterima, expiry, biaya, nilai, dan sumber Goods Receipt.
- Kartu stok dari `stock_movements` dan `stock_movement_lines`, termasuk receipt serta reversal.
- Filter bahan, SKU, outlet, lokasi, kategori, status stok, dan tipe pergerakan.
- Detail/drill-down per bahan dan outlet.
- Permission baru `inventory.read`.
- Modul sepenuhnya **read-only**; saldo tidak dapat diubah langsung dari layar Inventory.

## Update dari v0.5.1

1. Tutup backend dan frontend lama.
2. Salin folder `backend` dan `frontend` dari paket ini ke project lama, lalu pilih **Replace/Overwrite**.
3. Pertahankan konfigurasi lokal berikut:

   ```text
   backend\.env
   frontend\.env.local
   ```

4. Jalankan backend:

   ```powershell
   cd backend
   npm.cmd install
   npm.cmd run db:seed
   npm.cmd run build
   npm.cmd run start:dev
   ```

5. Jalankan frontend di terminal baru:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

6. Logout lalu login kembali agar permission `inventory.read` masuk ke access token.

Tidak ada migration baru. `db:seed` hanya menambahkan permission Inventory dan parameter minimum/reorder/par stock untuk master bahan contoh; password admin tidak diubah.

## Aturan Saldo Inventory

`Goods Receipt Posted` menambah batch dan ledger. `Goods Receipt Void` membuat reversal dan mengurangi kembali saldo batch. Inventory hanya membaca hasil transaksi tersebut, sehingga tidak memiliki tombol adjustment manual pada fase ini.

---

## Catatan v0.5.1 — UX Goods Receipt

## Perbaikan UX v0.5.1

- Progres utama disederhanakan menjadi `Draft → Posted`.
- Setelah posting, tampil konfirmasi bahwa penerimaan selesai dan stok sudah bertambah.
- Void dipindahkan ke bagian tertutup **Tindakan Berisiko**.
- Void memerlukan alasan serta konfirmasi kedua yang menjelaskan nilai stok yang akan direversal.
- Goods Receipt yang sudah void menampilkan pemberitahuan pembatalan terpisah, bukan langkah progres normal.

## Update dari v0.5.0

Perubahan v0.5.1 hanya berada di frontend. Salin folder `frontend` dari paket ini ke project lama dan pilih **Replace/Overwrite**, tetapi pertahankan `frontend\.env.local`. Kemudian jalankan:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Tidak diperlukan migration, seed ulang, atau perubahan database.

## Fitur Goods Receipt

- Daftar, detail, pembuatan, dan perubahan Goods Receipt selama masih `draft`.
- Hanya PO `sent` atau `partially_received` yang dapat diterima.
- Penerimaan parsial, kuantitas ditolak beserta alasan, surat jalan, dan invoice supplier.
- Lokasi penyimpanan, nomor batch, serta tanggal kedaluwarsa per item.
- Bahan mudah rusak wajib memiliki batch dan tanggal kedaluwarsa.
- Alur normal `draft → posted`; `void` adalah pembatalan khusus dengan permission terpisah.
- Posting atomik membuat stock batch, ledger `receipt`, dan memperbarui kuantitas serta status PO.
- Void menggunakan ledger `reversal`; data asli tidak dihapus atau diedit.
- Void ditolak jika stok batch sudah terpakai atau PO sudah ditutup.
- Audit trail lengkap untuk create, update, post, dan void.

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

## Instalasi penuh dari v0.4.0

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

   Migration `0003_goods_receipt_extensions.sql` menambahkan nomor invoice supplier dan pencatatan barang ditolak. `db:seed` **wajib** dijalankan ulang untuk permission Goods Receipt serta contoh lokasi Gudang, Chiller, dan Freezer. Seed aman dijalankan berulang dan tidak mengganti password admin yang sudah ada.

6. Buka terminal baru dari root project, lalu jalankan frontend:

   ```powershell
   cd frontend
   npm.cmd install
   npm.cmd run dev
   ```

7. Logout lalu login kembali agar access token memuat permission Goods Receipt.
8. Buka menu **Penerimaan Barang**.

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

## Verifikasi cepat Goods Receipt

1. Jalankan `db:seed`, kemudian logout dan login ulang.
2. Buat PO, setujui, lalu pilih **Tandai Dikirim**.
3. Buka **Penerimaan Barang** dan pilih **Catat Penerimaan**.
4. Pilih PO, isi surat jalan, lokasi, batch, expiry, dan kuantitas diterima.
5. Simpan draft, buka detail, lalu pilih **Post ke Inventory**.
6. Pastikan status PO berubah menjadi `Diterima Sebagian` atau `Diterima Lengkap`.
7. Uji void dengan alasan. Reversal ledger harus muncul dan status PO dihitung ulang.

## Catatan keamanan dan scope

- Jangan commit `backend\.env` atau `frontend\.env.local`.
- Pisahkan role pembuat dan penyetuju sebelum dipakai dalam operasional nyata.
- Draft Goods Receipt tidak mengubah stok; hanya aksi **Post ke Inventory** yang membuat pergerakan.
- Void hanya diperbolehkan ketika kuantitas pada batch sumber masih utuh.
- Integrasi komitmen PO ke realisasi Budget Planning akan diaktifkan setelah hubungan kategori anggaran dan transaksi pembelian disepakati.
