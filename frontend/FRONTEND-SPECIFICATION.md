# Spesifikasi Frontend Saji Flow

Dokumen ini menggambarkan frontend yang tersedia pada source code saat ini. Cakupan meliputi navigasi, fitur, field, alur penggunaan, validasi, permission, dan aturan perilaku frontend. Dokumen tidak mendeskripsikan tipografi.

## 1. Struktur navigasi

| Group | Menu | ID view | Syarat tampil di navigasi |
|---|---|---|---|
| Utama | Dashboard | `dashboard` | Selalu tampil |
| Operasional | POS | `pos` | Selalu tampil |
| Operasional | Kitchen Display | `kds` | Selalu tampil |
| Persediaan | Ringkasan Stok | `inventory` | Permission `inventory.read` |
| Pembelian | Budget Planning | `budgets` | Permission `budgets.read` |
| Pembelian | Purchase Order | `orders` | Permission `purchase_orders.read` |
| Pembelian | Goods Receipt | `receipts` | Permission `goods_receipts.read` |
| Master Data | Bahan & Satuan | `masters` | Permission `ingredients.read` atau `units.read` |
| Master Data | Supplier | `suppliers` | Permission `suppliers.read` |
| Master Data | Menu & Produk | `menu-products` | Permission `menus.read` |
| Master Data | Resep & Food Cost | `recipes` | Permission `recipes.read` |
| Sistem | Pengaturan | `settings` | Salah satu dari `tenant.read`, `outlets.read`, `users.read`, `roles.read`, atau `permissions.read` |

Navigasi memakai state view pada halaman utama, bukan URL terpisah untuk setiap menu. Sidebar dapat diciutkan pada desktop dan menjadi drawer pada layar kecil. Perubahan outlet aktif disimpan pada `localStorage` dengan key `sajiflow.activeOutlet`.

## 2. Dashboard

### Fitur

- Ringkasan purchasing dan aktivitas operasional.
- Empat indikator utama pembelian.
- Daftar purchase order terbaru dan akses ke detail order.
- Ringkasan penggunaan anggaran.
- Daftar item yang membutuhkan perhatian.
- Ringkasan performa supplier.
- Navigasi cepat menuju Purchase Order.

### Field dan data tampilan

Dashboard tidak memiliki form input. Field tampilan meliputi:

| Field | Tipe UI/data | Keterangan |
|---|---|---|
| Nilai pembelian | Currency/display | Nilai pembelian bulan berjalan |
| Purchase order aktif | Integer/display | Jumlah PO yang masih aktif |
| Penerimaan tertunda | Integer/display | Jumlah penerimaan yang perlu ditindaklanjuti |
| Supplier aktif | Integer/display | Jumlah pemasok aktif |
| Nomor PO | Text/link-like action | Membuka drawer detail PO |
| Supplier | Text | Nama pemasok |
| Tanggal dan nominal | Date/currency | Ringkasan PO |
| Status | Badge | Status proses PO |
| Persentase anggaran | Percentage/chart | Perbandingan realisasi terhadap anggaran |

### Alur

1. Pengguna membuka Dashboard setelah autentikasi.
2. Pengguna membaca ringkasan dan item perhatian.
3. Pengguna dapat membuka detail purchase order dari daftar.
4. Pengguna dapat berpindah ke menu Purchase Order melalui aksi ringkasan.

### Business rules frontend

- Dashboard saat ini menggunakan data seed lokal di `page.tsx`, bukan endpoint dashboard.
- Nilai dashboard hanya bersifat ringkasan presentasional dan tidak dapat diedit.
- Detail PO ditampilkan melalui drawer tanpa perpindahan route.

## 3. POS

### Fitur

- Mode Kasir, Pesanan Aktif, Riwayat Transaksi, dan Shift.
- Pencarian serta filter kategori menu.
- Pemilihan tipe pesanan, meja, dan pelanggan.
- Keranjang belanja dengan tambah, kurang, dan hapus kuantitas.
- Penerapan promo/diskon.
- Kalkulasi subtotal, pajak, service charge, diskon, dan grand total.
- Proses pembayaran tunai, QRIS, kartu debit/kredit, serta split payment.
- Daftar pesanan aktif dengan filter status.
- Riwayat transaksi dan drawer detail transaksi.
- Ringkasan serta penutupan shift.

### Field

| Area | Field | Tipe field | Aturan/keterangan |
|---|---|---|---|
| Filter menu | Pencarian menu | Search/text | Memfilter nama dan kategori menu lokal |
| Filter menu | Kategori | Button/tab | Nilai kategori menu |
| Konteks order | Tipe pesanan | Segmented button/select-like | `Dine-in`, takeaway, atau delivery sesuai opsi UI |
| Konteks order | Meja | Select | Dipakai untuk dine-in |
| Konteks order | Pelanggan | Text/select-like | Identitas pelanggan pada order |
| Keranjang | Menu dan variant | Item selection | Menambahkan item ke keranjang |
| Keranjang | Quantity | Integer stepper | Minimum efektif nol; nol menghapus item |
| Promo | Terapkan promo | Toggle/action | Mengaktifkan diskon simulasi |
| Pembayaran | Metode pembayaran | Radio/card selection | Tunai, QRIS, kartu, split |
| Pembayaran | Uang diterima | Number/currency | Dipakai pada pembayaran tunai |
| Pembayaran | Catatan | Textarea/text | Catatan transaksi jika tersedia |
| Riwayat | Filter transaksi | Select/search | Memfilter daftar transaksi lokal |

### Alur

1. Kasir memilih tipe order, meja, dan pelanggan.
2. Kasir mencari menu dan menambahkan item ke keranjang.
3. Kasir mengubah kuantitas atau menerapkan promo.
4. Frontend menghitung total transaksi.
5. Kasir membuka payment sheet dan memilih metode pembayaran.
6. Setelah konfirmasi, frontend menampilkan notifikasi hasil.
7. Pesanan dapat dipantau melalui Pesanan Aktif dan transaksi dapat dilihat pada Riwayat.
8. Pada akhir operasional, kasir meninjau ringkasan lalu menjalankan Tutup Shift.

### Business rules frontend

- POS saat ini menggunakan data menu, transaksi, dan pesanan lokal di `page.tsx`; belum menggunakan API POS.
- Item dengan quantity nol dikeluarkan dari keranjang.
- Diskon hanya dihitung ketika flag promo aktif.
- Pajak, service charge, dan total dihitung di state frontend untuk tampilan simulasi.
- Pembayaran tidak boleh dilanjutkan secara bermakna ketika keranjang kosong.
- Detail transaksi dibuka dalam drawer.
- Menu POS saat ini belum memiliki permission khusus pada navigasi.

## 4. Kitchen Display

### Fitur

- Board antrean berdasarkan status Baru, Diproses, dan Siap.
- Filter station dapur.
- Indikator live, jam operasional, suara, dan shift.
- Ticket order berisi item, modifier/catatan, waktu tunggu, dan prioritas.
- Perubahan status ticket ke tahap berikutnya.
- Detail ticket dalam drawer.
- Ringkasan beban station dan alert pelayanan.

### Field

| Field | Tipe UI/data | Keterangan |
|---|---|---|
| Station | Filter button | Menyaring ticket berdasarkan station |
| Sound | Toggle button | Status suara notifikasi |
| Nomor order | Text | Identitas ticket |
| Tipe order/meja | Text/meta | Konteks pelayanan |
| Waktu tunggu | Timer | Normal, warning, overdue, atau rush |
| Quantity item | Integer/display | Jumlah item yang dibuat |
| Catatan/modifier | Text | Instruksi produksi |
| Status ticket | Workflow action | Baru, Diproses, Siap |

### Alur

1. Tim dapur membuka KDS dan memilih station bila diperlukan.
2. Ticket baru masuk ke kolom Baru.
3. Pengguna membuka detail atau mulai memproses ticket.
4. Ticket berpindah ke Diproses.
5. Setelah selesai, ticket ditandai Siap.
6. Alert dan beban station digunakan untuk menentukan prioritas produksi.

### Business rules frontend

- KDS saat ini memakai seed order lokal, bukan stream atau API order real-time.
- Urgensi ticket ditentukan oleh kategori timer seperti warning, overdue, dan rush.
- Aksi utama ticket mengikuti urutan status; ticket tidak melompati tahap melalui UI normal.
- Menu KDS saat ini belum memiliki permission khusus pada navigasi.

## 5. Ringkasan Stok

### Fitur

- Ringkasan nilai stok, jumlah bahan, stok kritis, dan pergerakan.
- Tab Ringkasan Stok dan Pergerakan.
- Pencarian bahan atau transaksi.
- Filter outlet, lokasi penyimpanan, kategori, status stok, dan tipe pergerakan.
- Ringkasan stok berdasarkan kategori.
- Daftar prioritas bahan yang perlu perhatian.
- Tabel saldo bahan.
- Ledger pergerakan stok.
- Detail bahan: posisi stok, batch, expiry, supplier, dan ledger.

### Field

| Area | Field | Tipe field | Nilai/aturan |
|---|---|---|---|
| Toolbar | Pencarian | Search/text | Nama bahan, SKU, kategori, nomor movement, atau referensi |
| Toolbar | Outlet | Select | Semua outlet atau outlet tertentu |
| Toolbar | Lokasi | Select | Semua lokasi atau lokasi yang sesuai outlet |
| Toolbar | Kategori | Select | Semua kategori atau kategori bahan |
| Toolbar | Status stok | Select | `all`, `out`, `critical`, `low`, `safe` |
| Toolbar | Tipe movement | Select | Semua atau tipe movement tertentu |
| Detail | Saldo tersedia | Decimal/display | Berdasarkan base unit |
| Detail | Minimum stock | Decimal/display | Ambang konfigurasi outlet |
| Detail | Reorder point | Decimal/display | Titik pemesanan ulang |
| Detail | Batch/expiry | Table/date | Batch aktif dan tanggal kedaluwarsa |

### Alur

1. Frontend memeriksa permission `inventory.read`.
2. Frontend memuat overview dan lookup.
3. Pengguna memfilter saldo atau membuka tab Pergerakan.
4. Klik bahan memuat detail inventory dari API.
5. Pengguna meninjau saldo per lokasi, batch, expiry, dan ledger.

### Business rules frontend

- Tanpa `inventory.read`, frontend menampilkan state akses ditolak dan tidak memuat data inventory.
- Status stok berasal dari API dan ditampilkan sebagai `out`, `critical`, `low`, atau `safe`.
- Filter dilakukan pada data yang sudah dimuat di frontend.
- Lokasi, kategori, dan outlet berfungsi sebagai filter gabungan.
- Modul bersifat read-only; frontend tidak menyediakan form adjustment stok.
- Movement menampilkan status posted atau reversed dan kuantitas positif/negatif sesuai arah transaksi.

## 6. Budget Planning

### Fitur

- Daftar/ringkasan rencana anggaran per outlet dan periode.
- Membuat serta mengubah anggaran.
- Mengelola baris alokasi per kategori.
- Menampilkan realisasi, sisa, persentase pemakaian, dan threshold.
- Workflow submit, approve, reject, dan close.
- Riwayat revisi/status.

### Field

| Form | Field | Tipe field | Aturan |
|---|---|---|---|
| Header | Rencana anggaran | Select | Memilih budget existing |
| Budget | Nama rencana | Text | Wajib, maksimal 150 karakter |
| Budget | Outlet | Select | Wajib, hanya outlet aktif |
| Budget | Periode | Month | Diubah menjadi tanggal awal dan akhir bulan |
| Budget | Catatan | Textarea | Opsional, maksimal 500 karakter |
| Alokasi | Kategori | Select | `purchase`, `operational`, `maintenance`, `marketing`, `other` |
| Alokasi | Deskripsi | Text | Maksimal 200 karakter |
| Alokasi | Rencana | Number/currency | Minimum 0, step 1.000 pada UI |
| Alokasi | Realisasi | Currency/display | Read-only dari API |
| Alokasi | Ambang warning | Number/percentage | 0–100 |
| Workflow | Alasan reject | Textarea | Diperlukan saat reject sesuai aksi UI |

### Alur

1. Pengguna memilih anggaran atau menekan Buat Anggaran.
2. Pengguna mengisi identitas budget dan menambah/mengubah alokasi.
3. Draft disimpan melalui API.
4. Draft dapat diajukan untuk approval.
5. Pengguna berizin dapat approve atau reject.
6. Budget approved dapat ditutup.
7. Riwayat menampilkan perubahan status dan aktor.

### Business rules frontend

- Create memerlukan `budgets.create`; edit memerlukan `budgets.update`.
- Submit, approve, reject, dan close masing-masing memerlukan permission yang sesuai.
- Form hanya editable untuk budget baru atau status yang diizinkan frontend, terutama draft/rejected.
- Minimal satu baris alokasi dipertahankan; tombol hapus nonaktif bila hanya tersisa satu baris.
- Planned amount tidak boleh negatif.
- Threshold dibatasi pada 0–100.
- Sisa dihitung sebagai rencana dikurangi realisasi.
- Penggunaan melewati threshold diberi state warning.

## 7. Purchase Order

### Fitur

- Daftar PO dengan pencarian, filter status, dan outlet.
- Ringkasan draft, menunggu proses, dikirim, dan penerimaan.
- Membuat dan mengubah PO draft.
- Pemilihan supplier dan katalog bahan.
- Kalkulasi subtotal, pajak, biaya lain, dan total.
- Detail PO, item, catatan, dan histori.
- Workflow approve, send, cancel, dan close.
- Link proses lanjutan menuju penerimaan barang.

### Field

| Form | Field | Tipe field | Aturan |
|---|---|---|---|
| Filter | Pencarian | Search/text | Nomor PO, supplier, referensi |
| Filter | Status | Select | Semua atau status PO |
| Filter | Outlet | Select | Semua atau outlet tertentu |
| PO | Outlet | Select | Wajib, outlet aktif |
| PO | Supplier | Select | Wajib, supplier aktif |
| PO | Tanggal PO | Date | Wajib |
| PO | Expected delivery | Date | Wajib; default tanggal mendatang |
| PO | Referensi | Text | Opsional |
| PO | Tax rate | Number/percentage | Minimum 0 |
| PO | Other cost | Number/currency | Minimum 0 |
| PO | Catatan | Textarea | Opsional |
| Item | Bahan katalog | Select | Sesuai supplier yang dipilih |
| Item | Quantity | Number | Harus positif |
| Item | Unit price | Number/currency | Minimum 0 |
| Workflow | Alasan | Textarea | Dipakai pada reject/cancel bila tersedia |

### Alur

1. Pengguna memfilter daftar atau memilih PO.
2. Untuk PO baru, pengguna memilih outlet dan supplier.
3. Frontend memfilter katalog berdasarkan supplier.
4. Pengguna menambahkan bahan, quantity, dan harga.
5. Draft disimpan.
6. PO dapat di-approve lalu ditandai sent.
7. Goods Receipt dibuat terhadap PO yang masih dapat diterima.
8. PO dapat ditutup setelah proses penerimaan atau dibatalkan sesuai status.

### Business rules frontend

- Read/create/update/approve/send/cancel/close mengikuti permission `purchase_orders.*`.
- PO hanya editable pada status draft.
- Perubahan supplier memperbarui pilihan katalog dan item yang relevan.
- Item berasal dari katalog supplier; unit dan conversion mengikuti snapshot katalog.
- Quantity harus lebih besar dari nol dan harga tidak boleh negatif.
- Total dihitung dari subtotal item, pajak, dan biaya lainnya.
- Status yang ditampilkan mencakup draft, approved, sent, partially received, received, closed, dan cancelled.
- Tombol workflow hanya tampil/aktif jika status dan permission memenuhi syarat.

## 8. Goods Receipt

### Fitur

- Daftar Goods Receipt dengan search serta filter status dan outlet.
- Membuat penerimaan dari PO yang receivable.
- Mencatat kuantitas diterima dan ditolak.
- Mencatat batch, expiry, lokasi penyimpanan, serta alasan reject.
- Menyimpan draft, posting ke inventory, dan void melalui reversal.
- Detail receipt, stock movement, dan histori.
- Dialog konfirmasi untuk aksi berisiko.

### Field

| Form | Field | Tipe field | Aturan |
|---|---|---|---|
| Filter | Pencarian | Search/text | Nomor GR, PO, supplier |
| Filter | Status | Select | Draft, posted, void, atau semua |
| Filter | Outlet | Select | Semua atau outlet tertentu |
| Header | Purchase Order | Select | Hanya PO yang masih receivable |
| Header | Waktu diterima | Datetime-local | Default waktu lokal saat ini |
| Header | Supplier delivery note | Text | Opsional |
| Header | Catatan | Textarea | Opsional |
| Item | Quantity diterima | Number | Minimum 0, dibatasi sisa PO |
| Item | Quantity ditolak | Number | Minimum 0 |
| Item | Unit | Select/display | Berdasarkan unit PO |
| Item | Lokasi penyimpanan | Select | Wajib untuk quantity diterima |
| Item | Batch number | Text | Data batch penerimaan |
| Item | Expiry date | Date | Dapat dihitung dari shelf life |
| Item | Alasan reject | Text | Diperlukan bila ada quantity ditolak |
| Void | Alasan void | Textarea | Wajib sebelum konfirmasi void |

### Alur

1. Pengguna membuka daftar receipt atau membuat receipt baru.
2. Pengguna memilih PO yang masih memiliki quantity tersisa.
3. Frontend mengisi item receivable dan lokasi outlet.
4. Pengguna memasukkan quantity diterima/ditolak serta data batch.
5. Receipt disimpan sebagai draft.
6. Draft dapat diedit lalu diposting.
7. Posting menghasilkan movement inventory dan mengunci data penerimaan.
8. Receipt posted dapat di-void dengan alasan dan konfirmasi; sistem membuat reversal.

### Business rules frontend

- Permission mengikuti `goods_receipts.read/create/update/post/void`.
- Hanya draft yang dapat diedit.
- Hanya posted receipt yang dapat di-void.
- Sedikitnya satu item harus memiliki quantity diterima atau ditolak.
- Total diterima tidak boleh melebihi outstanding quantity PO.
- Lokasi penyimpanan wajib untuk stok yang diterima.
- Alasan reject diperlukan untuk quantity rejected.
- Void merupakan aksi berisiko dan memakai confirmation dialog.
- Receipt posted menampilkan movement dan tidak dapat diedit langsung.

## 9. Bahan & Satuan

Menu memiliki tab Bahan dan Satuan; tab hanya tampil jika pengguna memiliki permission baca terkait.

### Fitur Bahan

- Daftar, pencarian, dan filter status bahan.
- Tambah dan ubah bahan.
- Arsipkan atau aktifkan kembali bahan.
- Konfigurasi stok per outlet.

### Field Bahan

| Field | Tipe field | Aturan |
|---|---|---|
| SKU | Text | Wajib, unik berdasarkan aturan API |
| Nama | Text | Wajib |
| Kategori | Select | Opsional/berdasarkan lookup kategori |
| Base unit | Select | Wajib |
| Valuation method | Select | `weighted_average` atau metode yang tersedia |
| Shelf life days | Number | Minimum 0; opsional |
| Perishable | Checkbox | Menandai bahan mudah rusak |
| Outlet | Read-only row/select context | Satu konfigurasi per outlet |
| Minimum stock | Number/decimal | Minimum 0 |
| Reorder point | Number/decimal | Minimum 0 |
| Par level | Number/decimal | Minimum 0 |
| Preferred supplier | Select | Opsional |
| Aktif di outlet | Checkbox | Status konfigurasi outlet |

### Fitur dan field Satuan

- Daftar, pencarian, tambah, ubah, arsipkan, dan aktifkan satuan.

| Field | Tipe field | Aturan |
|---|---|---|
| Code | Text | Wajib, dikonversi ke uppercase |
| Nama | Text | Wajib |
| Dimension | Select | `mass`, `volume`, `count`, `length` |
| Base unit | Checkbox | Menandai unit dasar dimension |
| Decimal scale | Number | Presisi desimal, minimum 0 |

### Alur

1. Frontend hanya memuat data sesuai permission read pengguna.
2. Pengguna memilih tab, mencari data, dan memfilter aktif/arsip.
3. Pengguna membuka modal tambah/ubah.
4. Data disimpan melalui endpoint unit atau ingredient.
5. Untuk bahan, setting outlet disimpan bersama perubahan yang relevan.
6. Arsip/aktif dilakukan dari aksi tabel.

### Business rules frontend

- Permission dipisahkan menjadi `ingredients.read/create/update` dan `units.read/create/update`.
- Aksi tambah hanya tampil dengan permission create; ubah/arsip hanya aktif dengan permission update.
- Unit dan bahan yang diarsipkan tetap dapat dilihat melalui filter status.
- Pilihan base unit bahan berasal dari unit aktif.
- Angka konfigurasi stok tidak boleh negatif.
- Perubahan disimpan ke API; frontend tidak membuat data dummy pengganti ketika API gagal.

## 10. Supplier

### Fitur

- Daftar supplier, pencarian, dan filter status.
- Tambah, ubah, arsipkan, dan aktifkan supplier.
- Katalog bahan per supplier.
- Pengelolaan purchase unit, conversion, harga terakhir, MOQ, dan preferred flag.

### Field Supplier

| Field | Tipe field | Aturan |
|---|---|---|
| Kode | Text | Wajib, maksimal 40, uppercase |
| Nama | Text | Wajib |
| NPWP/Tax ID | Text | Opsional |
| Nama kontak | Text | Opsional |
| Telepon | Text/tel-like | Opsional |
| Email | Email | Harus format email bila diisi |
| Termin pembayaran | Number | Hari, minimum 0 |
| Lead time | Number | Hari, minimum 0 |
| Alamat | Textarea | Opsional |

### Field Katalog Supplier

| Field | Tipe field | Aturan |
|---|---|---|
| Bahan | Select | Wajib |
| Purchase unit | Select | Wajib; dimension harus sama dengan bahan |
| Supplier SKU | Text | Opsional |
| Harga per purchase unit | Number/currency | Wajib, minimum 0, step 0,01 |
| Conversion to base | Number | Harus positif |
| Minimum order quantity | Number | Minimum 0 |
| Preferred | Checkbox | Menandai item supplier pilihan |

### Alur

1. Pengguna mencari atau memfilter supplier.
2. Pengguna membuat/mengubah supplier melalui modal.
3. Klik Katalog memuat katalog supplier dan lookup bahan/satuan.
4. Pengguna menambahkan atau mengubah item katalog.
5. Frontend membatasi purchase unit berdasarkan dimension bahan.
6. Item katalog dapat diarsipkan atau diaktifkan kembali.

### Business rules frontend

- Read/create/update mengikuti `suppliers.read/create/update`.
- Pengelolaan katalog memerlukan `suppliers.catalog.manage`.
- Katalog tidak dapat ditambah pada supplier nonaktif.
- Purchase unit harus memiliki dimension yang sama dengan base unit bahan.
- Unit cost base dihitung server dari harga purchase unit dan conversion.
- Supplier dan item katalog menggunakan arsip/status aktif, bukan penghapusan permanen.

## 11. Menu & Produk

### Fitur

- Ringkasan jumlah menu, variant, dan status konfigurasi.
- Pencarian serta filter aktif/archived.
- Pengelolaan kategori menu.
- Tambah, edit, archive, dan activate menu.
- Tambah, archive, dan activate variant.
- Pengaturan availability variant per outlet.
- Price override per outlet bagi pengguna berizin.
- Read-only mode ketika pengguna hanya memiliki permission baca.
- Penanganan optimistic locking/conflict.

### Field Menu

| Field | Tipe field | Aturan |
|---|---|---|
| Kode menu | Text | Wajib; pola huruf, angka, underscore, atau hyphen |
| Nama menu | Text | Wajib |
| Kategori | Select | Wajib; kategori archived tidak dapat dipilih untuk menu baru |
| Deskripsi | Textarea | Opsional |

### Field Variant

| Field | Tipe field | Aturan |
|---|---|---|
| SKU | Text | Wajib; pola huruf, angka, underscore, atau hyphen |
| Nama variant | Text | Wajib |
| Base selling price | Number/currency | Wajib, minimum 0, step 0,01 |
| Currency code | Hidden/derived | Mengikuti currency tenant |
| Display order | Number | Minimum 0, default 0 |
| Variant default | Checkbox | Menandai variant utama |
| Requires recipe | Checkbox | Default aktif; membutuhkan approved recipe untuk POS |

### Field Kategori dan Outlet

| Area | Field | Tipe field | Aturan |
|---|---|---|---|
| Kategori | Kode | Text | Wajib |
| Kategori | Nama | Text | Wajib |
| Kategori | Urutan | Number | Minimum 0 |
| Outlet | Availability | Toggle/action | Tersedia atau tidak tersedia |
| Outlet | Price override | Number/currency prompt | Opsional; kosong kembali ke base price |
| Concurrency | Lock version | Hidden integer | Dikirim pada update status/harga |

### Alur

1. Frontend memeriksa `menus.read` dan memuat summary, kategori, menu, serta lookup.
2. Pengguna mencari/filter menu lalu membuka detail.
3. Pengguna berizin dapat mengubah menu dan variant.
4. Pengguna membuka pengaturan outlet pada variant.
5. Availability dan price override disimpan per outlet.
6. Setelah mutasi, data dimuat ulang.
7. Conflict dari lock version ditampilkan sebagai pemberitahuan bahwa data telah berubah.

### Business rules frontend

- Permission utama: `menus.read`, `menus.create`, `menus.update`, permission kategori, variant, outlet availability, dan price sesuai pengecekan komponen.
- Harga disembunyikan bila pengguna tidak memiliki permission baca harga.
- Price override hanya dapat dikelola dengan permission harga.
- Kategori aktif yang masih memiliki menu aktif tidak dapat diarsipkan.
- Menu/variant memakai archive dan activate, bukan hard delete.
- `lockVersion` dikirim pada mutasi sensitif untuk mencegah overwrite perubahan pengguna lain.
- Variant dengan `requiresRecipe` memerlukan approved recipe sebelum layak untuk POS menurut kontrak UI.

## 12. Resep & Food Cost

### Fitur

- Daftar resep dengan search, filter status, dan outlet.
- Membuat draft resep untuk menu product/variant yang eligible; UI saat ini belum menyediakan form edit draft.
- Mengelola ingredient, quantity, unit, yield, waste, dan harga jual.
- Kalkulasi food cost, cost per serving, margin, dan profitabilitas.
- Approve, archive, dan activate recipe sesuai permission/status.
- Lookup menu bersifat outlet-aware dan menjelaskan alasan kandidat tidak eligible.

### Field

| Area | Field | Tipe field | Aturan |
|---|---|---|---|
| Filter | Search | Text | Nama recipe/menu |
| Filter | Status | Select | Aktif, draft, approved, archived |
| Filter | Outlet | Select | Semua atau outlet tertentu |
| Recipe | Nama resep | Text | Wajib |
| Recipe | Kode resep | Text | Wajib sesuai implementasi form |
| Recipe | Outlet | Select | Konteks eligibility menu |
| Recipe | Menu product/variant | Select | Kandidat dari lookup recipe outlet-aware |
| Recipe | Yield quantity | Number | Harus positif |
| Recipe | Effective selling price | Currency/display | Berasal dari base price atau outlet override Menu Product |
| Item | Bahan | Select | Wajib |
| Item | Unit | Select | Dimension harus kompatibel dengan bahan |
| Item | Quantity | Number | Harus positif |
| Item | Waste percentage | Number/percentage | Minimum 0 sesuai batas UI/API |
| Recipe | Catatan/instruksi | Textarea | Opsional bila tersedia |

### Alur

1. Pengguna memfilter daftar atau membuka detail resep.
2. Untuk resep baru, pengguna memilih outlet.
3. Frontend mengambil kandidat menu dari lookup recipe-context.
4. Kandidat yang belum dikonfigurasi, tidak tersedia, atau sudah memiliki resep ditandai tidak eligible.
5. Pengguna menambahkan bahan, unit, quantity, yield, dan harga jual.
6. Draft disimpan dan costing dihitung dari data bahan/supplier.
7. Pengguna berizin dapat approve resep.
8. Resep dapat diarsipkan atau diaktifkan kembali sesuai status.

### Business rules frontend

- Akses mengikuti `recipes.read`, `recipes.create`, `recipes.recalculate`, `recipes.approve`, `recipes.revise`, `recipes.archive`, `recipes.activate`, dan `recipes.cost.read` sesuai pengecekan komponen. Endpoint update draft tetap memakai `recipes.update_draft`, tetapi belum diekspos sebagai form edit pada UI saat ini.
- Menu candidate harus eligible untuk outlet dan belum memiliki recipe yang melanggar kontrak.
- Unit ingredient difilter berdasarkan dimension bahan.
- Quantity dan yield harus lebih besar dari nol.
- Costing dianggap belum lengkap bila harga ingredient yang dibutuhkan belum tersedia.
- Approval hanya tersedia ketika data dan costing memenuhi kondisi yang dikembalikan API.
- Perhitungan final dan validasi otoritatif tetap berasal dari backend.

## 13. Pengaturan

Pengaturan terdiri dari lima tab: Tenant, Outlet, User, Role, dan Permission.

### 13.1 Tenant

Fitur: melihat serta mengubah profil tenant.

| Field | Tipe field | Aturan |
|---|---|---|
| Nama usaha | Text | Wajib |
| Zona waktu | Text | Wajib |
| Mata uang | Text | Wajib, maksimal 3 karakter |
| Kode tenant | Display | Read-only |
| Status tenant | Badge | Read-only |

Business rules: edit memerlukan `tenant.update`; tanpa permission, field dinonaktifkan dan tombol simpan tidak ditampilkan.

### 13.2 Outlet

Fitur: daftar, tambah, aktifkan, dan nonaktifkan outlet.

| Field | Tipe field | Aturan |
|---|---|---|
| Kode | Text | Wajib, maksimal 30, uppercase |
| Nama outlet | Text | Wajib |
| Alamat | Textarea | Opsional |
| Zona waktu | Text | Wajib, default `Asia/Jakarta` |
| Status aktif | Action/status | Diubah melalui toggle action |

Business rules: create memerlukan `outlets.create`; perubahan status memerlukan `outlets.update`.

### 13.3 User

Fitur: daftar user, tambah user, suspend/activate, reset password, dan assignment role.

| Form | Field | Tipe field | Aturan |
|---|---|---|---|
| User | Nama lengkap | Text | Wajib |
| User | Email | Email | Wajib |
| User | Kode karyawan | Text | Opsional |
| User | Telepon | Text | Opsional |
| User | Password awal | Password | Wajib, minimum 12 karakter |
| Reset password | Password baru | Password | Wajib, 12–128 karakter |
| Reset password | Konfirmasi | Password | Harus sama dengan password baru |
| Reset password | Alasan | Textarea | Opsional, jika diisi 3–500 karakter |
| Assignment | Role | Select | Wajib |
| Assignment | Cakupan outlet | Select | Opsional; kosong berarti semua outlet |

Business rules:

- Permission: `users.read/create/update/reset_password/assign_roles`.
- Reset password mencabut kemampuan refresh sesi lama; access token lama berakhir mengikuti TTL.
- Assignment role dari dialog mengganti assignment aktif sebelumnya dengan satu assignment yang dipilih UI.
- Status user berganti antara active dan suspended.

### 13.4 Role

Fitur: daftar/tambah role dan assignment permission.

| Field | Tipe field | Aturan |
|---|---|---|
| Kode role | Text | Wajib, uppercase |
| Nama role | Text | Wajib |
| Deskripsi | Textarea | Opsional |
| Permission IDs | Checkbox group | Daftar permission yang diberikan |

Business rules:

- Create memerlukan `roles.create`; assignment permission memerlukan `roles.assign_permissions`.
- Role sistem diberi indikator khusus.
- Penyimpanan permission mengirim seluruh daftar permission terpilih sebagai replacement set.

### 13.5 Permission

Fitur: katalog permission read-only yang dikelompokkan berdasarkan module.

| Field | Tipe UI/data | Keterangan |
|---|---|---|
| Code | Code/display | Identifier permission |
| Module | Group heading | Pengelompokan permission |
| Description | Text | Penjelasan izin |

Business rules: tab membutuhkan `permissions.read`; tidak tersedia form create/update permission pada frontend.

## 14. Aturan frontend lintas menu

### Autentikasi dan sesi

- Seluruh workspace berada di dalam `AuthGate`.
- Session access token disimpan oleh mekanisme auth frontend dan dipakai API client.
- API client mencoba refresh token ketika request mendapat unauthorized, kemudian mengulang request.
- Logout memanggil endpoint logout dan menghapus session frontend.
- Pengguna yang belum memiliki session melihat halaman login.
- Login memakai email dan password; tombol menunjukkan loading dan error ditampilkan dekat form.

### RBAC

- Navigasi back-office difilter berdasarkan permission session.
- Komponen kembali memeriksa permission untuk menampilkan atau mengaktifkan aksi create/update/workflow.
- Penyembunyian tombol bukan pengganti otorisasi backend; API tetap menjadi pengendali otoritatif.
- POS dan KDS belum memiliki permission navigasi khusus pada implementasi saat ini.

### Data dan API

- Modul connected menggunakan `ApiClient` dan data API; tidak mengganti kegagalan API dengan data dummy.
- Dashboard, POS, dan KDS masih menggunakan seed/state lokal dan harus dianggap prototype frontend sampai integrasi API tersedia.
- Setelah mutasi berhasil, komponen umumnya menutup modal, menampilkan toast, dan memuat ulang data.
- Error API ditampilkan sebagai banner/state dengan aksi retry atau dismiss sesuai modul.
- Loading dan empty state tersedia pada modul connected.

### Form dan validasi

- Submit mencegah native page reload.
- Tombol simpan dinonaktifkan selama proses penyimpanan pada form yang memiliki state saving.
- Field wajib memakai `required`; angka memakai `min`, `max`, dan `step` sesuai konteks.
- ID relasional dipilih dari lookup API, bukan input bebas.
- Arsip/aktif digunakan untuk master data; frontend tidak menyediakan hard delete untuk master utama.
- Aksi berisiko seperti void memakai alasan dan confirmation dialog.

### Filter dan daftar

- Search/filter pada banyak modul dijalankan terhadap data yang telah dimuat; Menu & Produk juga mengirim parameter pencarian/status ke endpoint.
- Tabel lebar memakai horizontal scroll.
- Status ditampilkan sebagai badge/chip konsisten.
- Detail kompleks dibuka sebagai mode detail, modal, atau drawer tanpa menghilangkan konteks daftar.

### Notifikasi dan concurrency

- Aksi sukses menampilkan toast sementara.
- Error tetap berada pada konteks form atau halaman sampai ditutup/diperbaiki.
- Menu & Produk menggunakan `lockVersion` pada mutasi tertentu dan menampilkan conflict ketika data telah berubah di server.
- Perhitungan frontend bersifat presentasional; backend tetap menjadi sumber validasi dan nilai final untuk modul API-connected.

## 15. Integrasi API frontend yang teridentifikasi

| Modul | Kelompok endpoint utama |
|---|---|
| Autentikasi | `/auth/login`, `/auth/refresh`, `/auth/logout` |
| Tenant/Outlet/User/Role | `/tenant`, `/outlets`, `/users`, `/roles`, `/permissions` |
| Inventory | `/inventory/...` dan lookup inventory |
| Budget | `/budgets/...` |
| Purchase Order | `/purchase-orders/...` dan lookup terkait |
| Goods Receipt | `/goods-receipts/...` dan receivable PO |
| Bahan & Satuan | `/ingredients`, `/units`, serta lookup/detail terkait |
| Supplier | `/suppliers/...` dan katalog supplier |
| Menu & Produk | `/menu-products/summary`, `/menu-categories`, `/menus`, `/menu-variants/...` |
| Resep | `/recipes/...` serta `/menu-products/lookups/recipe...` |

Dokumen ini mengikuti kondisi source frontend saat dibuat. Perubahan endpoint, permission, status workflow, atau integrasi POS/KDS berikutnya perlu diikuti pembaruan dokumen.
