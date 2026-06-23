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

Berdasarkan rancangan pengerjaan modul dan fitur aplikasi, berikut adalah pembagian tugas dan penanggung jawab dari masing-masing anggota tim:

### 1. Alya Salsa Nabila (NIM: 2411523006)
*   **Modul**: Modul Pegawai
*   **Fitur Penanggung Jawab**:
    *   Pegawai dapat mengajukan permohonan lembur (C)
    *   Pegawai mengajukan laporan pelaksanaan lembur (U)
    *   Pegawai dapat membatalkan pengajuan lembur sebelum disetujui (D)
    *   Pegawai dapat melihat riwayat pengajuan lembur pribadi (R)
    *   Pegawai dapat mengekspor riwayat pengajuan lembur dalam bentuk PDF
    *   Pegawai dapat menyediakan REST API untuk melihat riwayat pengajuan lembur pribadi

### 2. M. Ananda Akbar (NIM: 2411523007)
*   **Modul**: Modul Pegawai
*   **Fitur Penanggung Jawab**:
    *   Pegawai dapat melihat list penugasan lembur (R)
    *   Pegawai dapat melihat detail list penugasan lembur (R)
    *   Pegawai dapat melakukan pencarian penugasan lembur (S)
    *   Pegawai dapat melihat status persetujuan lembur (R)
    *   Pegawai dapat mengekspor detail penugasan lembur dalam bentuk PDF
    *   Pegawai dapat menyediakan REST API untuk pencarian penugasan lembur berdasarkan kata kunci

### 3. Muhammad Habib (NIM: 2411522024)
*   **Modul**: Modul Pegawai & Modul Pimpinan
*   **Fitur Penanggung Jawab**:
    *   Pegawai dapat merevisian laporan penugasan lembur pegawai
    *   Pimpinan dapat membuat penugasan lembur pegawai (C)
    *   Pimpinan dapat melihat daftar & detail penugasan lembur pegawai (R)
    *   Pimpinan dapat mengubah data penugasan lembur pegawai (U)
    *   Pimpinan dapat mengekspor penugasan dalam bentuk PDF
    *   Pimpinan dapat menghapus / membatalkan penugasan lembur pegawai (D)
    *   Implementasi REST API untuk Status Penugasan

### 4. Hasyfi Zharfan Caniago (NIM: 2411522037)
*   **Modul**: Modul Pimpinan
*   **Fitur Penanggung Jawab**:
    *   Pimpinan dapat melihat list laporan lembur (L)
    *   Pimpinan dapat melihat detail laporan lembur (R)
    *   Pimpinan dapat mengkonfirmasi laporan lembur pegawai (U)
    *   Pimpinan dapat menolak laporan lembur dengan catatan revisi (U)
    *   Pimpinan dapat mengekspor laporan lembur dalam bentuk PDF/DOCX
    *   Implementasi REST API untuk mengembalikan rekap/statistik (angka) kinerja persetujuan pimpinan (jumlah)

### 5. Darrel Rajendra Kurnia (NIM: 2211523035)
*   **Modul**: Modul Admin Kepegawaian
*   **Fitur Penanggung Jawab**:
    *   Admin Pegawai dapat merekap laporan lembur bulanan
    *   Admin Pegawai dapat membuat laporan rekapan dan dapat diunduh dalam format XLSX
    *   Admin Pegawai dapat memfilter laporan berdasarkan tanggal/divisi
    *   Admin Pegawai dapat menambahkan akun pegawai baru
    *   Implementasi REST API untuk rekap data lembur
