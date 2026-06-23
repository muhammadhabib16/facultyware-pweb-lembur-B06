# Facultyware — Sistem Informasi Kepegawaian (Modul Lembur & Penugasan)

## Deskripsi Aplikasi
**Facultyware** adalah sebuah web portal kepegawaian modern yang dirancang khusus untuk mengelola aktivitas lembur pegawai dan penugasan lembur oleh pimpinan di lingkungan fakultas/instansi. Aplikasi ini membagi alur kerja ke dalam tiga peran utama (*Pegawai*, *Pimpinan*, dan *Admin Kepegawaian*). 

Aplikasi ini menggunakan teknologi modern dengan konsep **SPA-like** (Single Page Application) yang cepat dan interaktif tanpa memicu penyegaran halaman penuh (*full-page reload*) di browser, berkat integrasi **HTMX** di sisi client serta rendering partial templates **EJS** di sisi server Express.js.

### Fitur Utama
*   **Modul Pegawai**: Pegawai dapat mengajukan permohonan lembur mandiri, mengisi laporan jam kerja aktual (realisasi lembur), membatalkan pengajuan, mencari riwayat lembur pribadi, mengekspor laporan ke format PDF, serta melakukan revisi laporan jika ditolak oleh pimpinan.
*   **Modul Pimpinan**: Pimpinan dapat menerbitkan Surat Perintah Tugas Lembur kepada pegawai secara langsung, menyetujui (*approve*) laporan realisasi, menolak/meminta revisi laporan disertai dengan catatan revisi, serta mengekspor detail penugasan ke format PDF/Word (DOCX).
*   **Modul Admin Kepegawaian**: Admin dapat memantau dan membuat rekapitulasi data lembur bulanan, memfilter data laporan berdasarkan tanggal/divisi unit kerja, mengunduh laporan rekapitulasi dalam format Excel (XLSX), serta mendaftarkan akun pegawai baru ke dalam sistem.

### Tech Stack
*   **Backend**: Node.js & Express.js
*   **Template Engine**: EJS (Embedded JavaScript)
*   **Styling & UI**: Tailwind CSS & Basecoat (Vanilla CSS & JS UI Components)
*   **Interaktivitas**: HTMX (Ajax & partial page update)
*   **Database**: MySQL (`mysql2` dengan pool koneksi & transaksi ACID)
*   **Ekspor Dokumen**: PDFKit (PDF), ExcelJS (Excel/XLSX), & DOCX (Word/DOCX)

---

## Cara Instalasi dan Menjalankan Aplikasi

### Prasyarat
Sebelum menginstal aplikasi ini, pastikan komputer Anda telah terinstal:
*   [Node.js](https://nodejs.org/) (Versi 16 atau lebih baru)
*   [MySQL Server](https://dev.mysql.com/downloads/mysql/)

### Langkah Instalasi
1.  **Clone / Unduh Repository**
    Unduh source code aplikasi ini ke komputer Anda.

2.  **Instal Dependensi NPM**
    Buka terminal/command prompt di direktori root project, lalu jalankan perintah berikut untuk mengunduh seluruh library yang dibutuhkan:
    ```bash
    npm install
    ```

3.  **Konfigurasi Environment Variable (`.env`)**
    Buat file bernama `.env` di direktori root project dan sesuaikan konfigurasinya dengan lingkungan MySQL Anda:
    ```env
    # Konfigurasi Database MySQL
    DB_HOST=localhost
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=facultyware

    # Konfigurasi Keamanan Session
    SESSION_SECRET=kunci_rahasia_super_aman_dan_panjang_123!
    ```

4.  **Siapkan Database**
    *   Buka MySQL client Anda (seperti phpMyAdmin atau MySQL Workbench).
    *   Buat database baru dengan nama `facultyware` (sesuai dengan nilai `DB_NAME` di `.env`).
    *   Impor struktur tabel dan data awal (skema basis data yang dibutuhkan meliputi tabel `users`, `employees`, `roles`, `permissions`, `overtime_requests`, `overtime_request_members`, serta tabel pendukung ACL lainnya).

### Menjalankan Aplikasi
Di dalam folder root project, jalankan salah satu perintah berikut:

*   **Mode Pengembangan (dengan Nodemon)**:
    ```bash
    npm run dev
    ```
    *Server akan restart secara otomatis jika terdapat perubahan pada berkas kode.*

*   **Mode Produksi**:
    ```bash
    npm start
    ```

Aplikasi default akan berjalan di port `3000` (atau port lain sesuai konfigurasi). Buka web browser Anda dan akses:
```
http://localhost:3000
```

---

## Pembagian Tugas Anggota

Berdasarkan rancangan pengerjaan modul dan fitur aplikasi, berikut adalah pembagian tugas dan penanggung jawab dari masing-masing anggota tim yang telah disesuaikan:

### 1. Alya Salsa Nabila (NIM: 2411523006)
*   **Modul**: Modul Pegawai
*   **Fitur Penanggung Jawab**:
    1.  Pegawai dapat mengajukan permohonan lembur (C)
    2.  Pegawai mengajukan laporan pelaksanaan lembur (U)
    3.  Pegawai dapat membatalkan pengajuan lembur sebelum disetujui (D)
    4.  Pegawai dapat melihat riwayat pengajuan lembur pribadi (R)
    5.  Pegawai dapat mengekspor riwayat pengajuan lembur dalam bentuk pdf
    6.  Pegawai dapat menyediakan REST API untuk melihat riwayat pengajuan lembur pribadi
    7.  Pegawai Membatalkan Pengajuan Lembur Mandiri

### 2. M. Ananda Akbar (NIM: 2411523007)
*   **Modul**: Modul Pegawai
*   **Fitur Penanggung Jawab**:
    8.  Pegawai dapat melihat list penugasan lembur (R)
    9.  Pegawai dapat melihat detail list penugasan lembur (R)
    10. Pegawai dapat melakukan pencarian penugasan lembur (S)
    11. Pegawai dapat melihat status persetujuan lembur (R)
    12. Pegawai dapat mengekspor detail penugasan lembur dalam bentuk pdf
    13. Pegawai dapat menyediakan REST API untuk pencarian penugasan lembur berdasarkan kata kunci

### 3. Muhammad Habib (NIM: 2411522024)
*   **Modul**: Modul Pegawai & Modul Pimpinan
*   **Fitur Penanggung Jawab**:
    14. Pegawai dapat merevisi laporan penugasan lembur pegawai
    15. Pimpinan dapat membuat penugasan lembur pegawai (C)
    16. Pimpinan dapat melihat daftar & detail penugasan lembur pegawai (R)
    17. Pimpinan dapat mengubah data penugasan lembur pegawai (U)
    18. Pimpinan dapat mengekspor penugasan dalam bentuk pdf
    19. Pimpinan dapat menghapus / membatalkan penugasan lembur pegawai(D)
    20. Implementasi REST API untuk Status Penugasan
    21. Persetujuan & Penolakan khusus Penugasan Lembur Langsung

### 4. Hasyfi Zharfan Caniago (NIM: 2411522037)
*   **Modul**: Modul Pimpinan
*   **Fitur Penanggung Jawab**:
    22. Pimpinan dapat melihat list laporan lembur (L)
    23. Pimpinan dapat melihat detail laporan lembur (R)
    24. Pimpinan dapat mengkonfirmasi laporan lembur pegawai (U)
    25. Pimpinan dapat menolak laporan lembur dengan catatan revisi (U)
    26. Pimpinan dapat mengekspor laporan lembur dalam bentuk pdf/docx
    27. Implementasi REST API untuk mengembalikan rekap/statistik (angka) kinerja persetujuan pimpinan (jumlah laporan menunggu, disetujui, dan ditolak)
    28. Pimpinan dapat Ekspor Detail Laporan Kerja Pegawai ke Microsoft Word (DOCX)
    29. Ekspor Rekap Bulanan Semua Pegawai ke PDF

### 5. Darrel Rajendra Kurnia (NIM: 2211523035)
*   **Modul**: Modul Admin Kepegawaian
*   **Fitur Penanggung Jawab**:
    30. Admin Pegawai dapat merekap laporan lembur bulanan
    31. Admin Pegawai dapat membuat laporan rekapan dan dapat diunduh dalam format xlsx
    32. Admin Pegawai dapat memfilter laporan berdasarkan tanggal/divisi
    33. Admin Pegawai dapat menambahkan akun pegawai baru
    34. Implementasi REST API untuk rekap data lembur
    35. Melihat Daftar Pegawai (List Pegawai)
