# Konteks Routing & Alur Sidebar (Facultyware)

Dokumen ini menjelaskan struktur routing aplikasi dan alur navigasi (sidebar) yang digunakan di Facultyware, yang dibangun dengan **Express.js** dan menggunakan **HTMX** untuk transisi navigasi (*Single Page Application-like*).

---

## 1. Konteks Routing Utama

Aplikasi menggunakan sistem modularisasi router dari Express (`express.Router()`). Router utama didaftarkan pada file `app.js`. Semua rute yang membutuhkan akses login dilindungi menggunakan middleware `isAuthenticated` (dari `middlewares/auth.js`). Fitur spesifik peran dilindungi menggunakan sistem ACL berbasis role (`middlewares/acl.js`).

### A. Rute Publik & Autentikasi (`routes/index.js`)
File ini menangani akses publik, autentikasi, serta beranda utama setelah login.
- `GET /` : Halaman awal/landing page (jika ada) atau redirect ke login.
- `GET /login` : Menampilkan form login.
- `POST /login` : Memproses autentikasi pengguna.
- `GET /home` : Dashboard utama pengguna setelah login. (Dilindungi `isAuthenticated`).
- `POST /logout` : Mengakhiri sesi pengguna.

### B. Modul Pimpinan (`routes/pimpinan.js`)
File ini memuat semua fungsionalitas untuk peran Pimpinan (dan Admin/role lain yang memiliki permission terkait). Semua *endpoint* di dalam rute ini sudah melewati `isAuthenticated`.

**Laporan Lembur:**
- `GET /pimpinan/laporan` : Menampilkan daftar seluruh laporan lembur yang masuk (Butuh permission `view_overtime_reports`).
- `GET /pimpinan/laporan/:id` : Menampilkan detail laporan beserta riwayat persetujuannya.
- `POST /pimpinan/laporan/:id/konfirmasi` : Pimpinan mengonfirmasi (menyetujui) laporan (`approve_overtime_reports`).
- `POST /pimpinan/laporan/:id/tolak` : Pimpinan menolak laporan dan memberikan catatan revisi.

**Penugasan Lembur:**
- `GET /pimpinan/penugasan` : Menampilkan daftar tugas lembur (Butuh permission `view_overtime_assignments`).
- `GET /pimpinan/penugasan/buat` : Menampilkan form pembuatan tugas lembur baru (`create_overtime_assignments`).
- `POST /pimpinan/penugasan/buat` : Memproses pengiriman data tugas lembur.
- `GET /pimpinan/penugasan/:id` : Melihat detail spesifik tugas lembur.
- `GET /pimpinan/penugasan/:id/edit` : Menampilkan form edit penugasan lembur (`edit_overtime_assignments`).
- `POST /pimpinan/penugasan/:id/edit` : Memproses pembaruan data penugasan lembur.

*(Catatan: Rute tambahan untuk `pegawai` atau `admin` akan mengikuti struktur pola yang sama pada `routes/pegawai.js` atau `routes/admin.js` jika tersedia).*

---

## 2. Alur Sidebar (Navigasi Kiri)

Komponen sidebar diatur secara terpusat pada file `views/partials/sidebar.ejs`. Navigasi pada sidebar dibuat dinamis, yang berarti tautan-tautan di dalamnya hanya akan muncul berdasarkan data peran (`role`) dari pengguna yang sedang login.

Semua tautan yang diklik pada sidebar memanfaatkan **HTMX** (melalui atribut `hx-boost="true"` pada tag `<nav>`). Ini mencegah halaman memuat ulang secara penuh (full page reload) dan hanya mengganti bagian `<main>` / `<body>` untuk menciptakan pengalaman aplikasi layaknya *Single Page Application* (SPA).

Berikut adalah alur kemunculan menu berdasarkan peran:

### Menu Global (Dilihat oleh Semua Role)
- **Dashboard** (`/home`) : Halaman ringkasan profil dan statistik umum.

### Menu Khusus: `pegawai`
- **Ajukan Lembur** (`/pegawai/permohonan`) : Menuju form pengajuan lembur mandiri.
- **Riwayat Lembur** (`/pegawai/riwayat`) : Melihat daftar permohonan yang telah diajukan dan statusnya.

### Menu Khusus: `pimpinan`
- **Buat Tugas Lembur** (`/pimpinan/penugasan/buat`) : Menuju form pendelegasian lembur kepada anggota/staf.
- **Daftar Tugas Anda** (`/pimpinan/penugasan`) : Melihat seluruh penugasan lembur yang diterbitkan.
- **Daftar Laporan** (`/pimpinan/laporan`) : Membuka halaman sentral untuk me-review (menyetujui/menolak) eksekusi laporan lembur dari para staf.

### Menu Khusus: `admin`
- **Daftar Tugas Anda** (`/pimpinan/penugasan`) : Akses untuk melihat tugas lembur.
- **Rekap Bulanan** (`/admin/rekap`) : Menu pelaporan administratif, rekapitulasi jam kerja, dsb.

### Tombol Aksi
- **Keluar Aplikasi** (`/logout`) : Tombol aksi memanggil `POST /logout` via HTMX (`hx-post="/logout"`) untuk menghapus session dan mengarahkan kembali ke halaman login.

---

## 3. Penting: Persyaratan Templating

Saat Anda membuat halaman EJS baru untuk di-*render* melalui Express, Anda **harus** selalu melakukan _include_ file `sidebar.ejs` dan membuat struktur HTML dengan tag `<main>` seperti berikut agar transisi HTMX sidebar tidak menghilang:

```html
<body class="bg-background flex min-h-screen text-foreground overflow-x-hidden">
  
  <!-- Wajib sertakan sidebar -->
  <%- include('../partials/sidebar') %>
  
  <!-- Gunakan atribut hx-boost="true" -->
  <main class="flex-1 p-8 md:p-10 space-y-6" hx-boost="true">
     ... Konten Utama ...
  </main>

</body>
```
