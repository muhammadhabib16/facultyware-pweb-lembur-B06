const { test, expect } = require('@playwright/test');

// =====================================================================
// KONFIGURASI KREDENSIAL UJI (SIPL FACULTYWARE)
// =====================================================================
const ADMIN_EMAIL = 'darrel@facultyware.com';
const ADMIN_PASS = 'password123';

const PIMPINAN_EMAIL = 'alex@facultyware.com';
const PIMPINAN_PASS = 'password123';

const PEGAWAI_EMAIL = 'Isan@facultyware.com';
const PEGAWAI_PASS = 'password123';

// Date format helpers
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const formattedDate = `${yyyy}-${mm}-${dd}`;

const plannedStart = `${formattedDate}T17:00`;
const plannedEnd = `${formattedDate}T20:00`;

const actualStart = `${formattedDate}T17:00`;
const actualEnd = `${formattedDate}T19:30`;

// Shared unique task title to identify it across multiple sessions
const uniqueTaskTitle = `Tugas Lembur Uji E2E - ${Date.now()}`;

test.describe('Alur Pengujian Keseluruhan Fungsionalitas SIPL', () => {

  test('Skenario Lengkap: Alur Integrasi Admin, Pimpinan, dan Pegawai', async ({ page }) => {
    
    // =========================================================================
    // RUTE 1: AKSI ADMIN (Mendaftarkan Pegawai Baru & Verifikasi Menu Admin)
    // =========================================================================
    console.log('--- Memulai Alur Admin ---');
    await page.goto('/login');
    await expect(page).toHaveTitle(/Basecoat|Facultyware/i);
    await expect(page.locator('h1')).toContainText('Selamat Datang');

    // Login sebagai Admin
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');

    // Menunggu sedikit jika terjadi delay redirect, jika tidak redirect maka tampilkan error alert
    try {
      await page.waitForURL(/.*\/home/, { timeout: 3000 });
    } catch (e) {
      const alertLocator = page.locator('.bg-rose-50\\/80, .bg-destructive\\/15, [class*="error"], [class*="destructive"]');
      const errorText = await alertLocator.first().innerText().catch(() => 'Tidak ada pesan error yang terdeteksi di UI');
      console.error(`--- LOGIN ADMIN GAGAL. Pesan Error di Web: "${errorText.trim()}"`);
      throw new Error(`Login Admin Gagal: ${errorText.trim()}`);
    }

    // Verifikasi masuk ke dashboard admin
    await expect(page).toHaveURL(/.*\/home/);
    await expect(page.locator('text=Kelola Pegawai')).toBeVisible();

    // Buka menu Kelola Pegawai
    await page.click('text=Kelola Pegawai', { force: true });
    await expect(page).toHaveURL(/.*\/admin\/pegawai/);
    await expect(page.locator('table')).toBeVisible();

    // Tambah Pegawai Baru
    await page.click('text=Tambah Pegawai Baru', { force: true });
    await expect(page).toHaveURL(/.*\/admin\/pegawai\/tambah/);

    const testNip = `NIP-TEST-${Date.now()}`;
    const testEmail = `pegawai_test_${Date.now()}@facultyware.com`;

    // Mengisi form pegawai baru
    await page.fill('input[name="name"]', 'Pegawai Uji Playwright');
    await page.fill('input[name="employee_number"]', testNip);
    await page.fill('input[name="birth_place"]', 'Padang');
    await page.fill('input[name="birth_date"]', '1996-08-20');
    await page.selectOption('select[name="gender"]', 'male');
    await page.selectOption('select[name="marital_status"]', 'single');
    await page.fill('textarea[name="address"]', 'Jl. Kampus UNAND Limau Manis, Padang');
    
    // Pilih unit/divisi & status kerja menggunakan index (agar fleksibel terhadap data dinamis di DB)
    await page.selectOption('select[name="organization_unit_id"]', { index: 1 });
    await page.selectOption('select[name="employment_status_id"]', { index: 1 });
    
    await page.fill('input[name="hire_date"]', '2022-01-01');
    await page.selectOption('select[name="status"]', 'active');
    
    // Kredensial Login
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'password123');
    await page.selectOption('select[name="role_id"]', '3'); // '3' adalah ID role untuk pegawai di database

    // Submit form pegawai baru
    await page.click('button[type="submit"]');

    // Tunggu redirect selesai (URL berubah ke /admin/pegawai)
    await expect(page).toHaveURL(/.*\/admin\/pegawai/);

    // Cek apakah NIP pegawai baru terdaftar
    await expect(page.locator(`text=${testNip}`)).toBeVisible();

    // Akses Rekap Bulanan Admin
    await page.click('text=Rekap Bulanan', { force: true });
    await expect(page).toHaveURL(/.*\/admin\/rekap/);
    await expect(page.locator('table')).toBeVisible();

    // Keluar dari akun Admin
    await page.waitForTimeout(500); // Beri jeda agar HTMX siap mengikat event listener
    await page.click('button:has-text("Keluar Aplikasi")', { force: true });
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Selamat Datang');


    // =========================================================================
    // RUTE 2: AKSI PIMPINAN (Pemberian Tugas Lembur Baru ke Pegawai)
    // =========================================================================
    console.log('--- Memulai Alur Pimpinan (Pemberian Tugas) ---');
    // Login sebagai Pimpinan
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');

    // Menunggu sedikit jika terjadi delay redirect, jika tidak redirect maka tampilkan error alert
    try {
      await page.waitForURL(/.*\/home/, { timeout: 3000 });
    } catch (e) {
      const alertLocator = page.locator('.bg-rose-50\\/80, .bg-destructive\\/15, [class*="error"], [class*="destructive"]');
      const errorText = await alertLocator.first().innerText().catch(() => 'Tidak ada pesan error yang terdeteksi di UI');
      console.error(`--- LOGIN PIMPINAN GAGAL. Pesan Error di Web: "${errorText.trim()}"`);
      throw new Error(`Login Pimpinan Gagal: ${errorText.trim()}`);
    }

    await expect(page).toHaveURL(/.*\/home/);

    // Buka Menu Buat Tugas Lembur
    await page.click('text=Buat Tugas Lembur', { force: true });
    await expect(page).toHaveURL(/.*\/pimpinan\/penugasan\/buat/);

    // Isi Formulir Penugasan Lembur
    // Target tugas ditujukan ke Alya Salsa Nabila (salah satu data pegawai default)
    // Mencari value option secara dinamis berdasarkan nama pegawai
    const empOptionValue = await page.locator('select[name="employee_id"] option', { hasText: 'Alya Salsa Nabila' }).getAttribute('value');
    await page.selectOption('select[name="employee_id"]', empOptionValue);
    
    await page.fill('input[name="title"]', uniqueTaskTitle);
    await page.fill('textarea[name="description"]', 'Menguji fungsionalitas penugasan dan pelaporan kerja lembur secara otomatis.');
    await page.fill('input[name="request_date"]', formattedDate);
    await page.fill('input[name="planned_start_time"]', plannedStart);
    await page.fill('input[name="planned_end_time"]', plannedEnd);

    // Kirim Tugas
    await page.click('button[type="submit"]');

    // Tunggu pesan sukses muncul
    await expect(page.locator('text=berhasil diterbitkan')).toBeVisible();

    // Verifikasi tugas terbuat dan terdaftar di list tugas pimpinan
    await page.click('text=Daftar Tugas Anda', { force: true });
    await expect(page).toHaveURL(/.*\/pimpinan\/penugasan/);
    await expect(page.locator(`text=${uniqueTaskTitle}`)).toBeVisible();

    // Keluar dari akun Pimpinan
    await page.waitForTimeout(500); // Jeda HTMX
    await page.click('button:has-text("Keluar Aplikasi")', { force: true });
    await page.waitForURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Selamat Datang');


    // =========================================================================
    // RUTE 3: AKSI PEGAWAI (Melakukan Laporan Realisasi Tugas Lembur)
    // =========================================================================
    console.log('--- Memulai Alur Pegawai (Pelaporan Realisasi) ---');
    // Login sebagai Pegawai (Alya Salsa Nabila)
    await page.fill('input[name="email"]', PEGAWAI_EMAIL);
    await page.fill('input[name="password"]', PEGAWAI_PASS);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/home/);

    // Akses Daftar Tugas Aktif Pegawai
    await page.click('text=Daftar Tugas Aktif', { force: true });
    await expect(page).toHaveURL(/.*\/pegawai\/tugas/);
    await expect(page.locator(`text=${uniqueTaskTitle}`)).toBeVisible();

    // Buka detail tugas yang baru dibuat
    // Kita cari baris tabel yang berisi judul tugas dan klik tombol Detail di dalamnya
    const row = page.locator('tr').filter({ hasText: uniqueTaskTitle });
    await row.locator('text=Detail').click();

    // Pastikan masuk ke halaman detail
    await expect(page.locator('h1')).toContainText('Detail Penugasan Lembur');
    await expect(page.locator('text=Isi Laporan Realisasi')).toBeVisible();

    // Klik tombol untuk mengisi laporan
    await page.click('text=Isi Laporan Realisasi');

    // Mengisi form laporan aktual
    await page.fill('input[name="actual_start_time"]', actualStart);
    await page.fill('input[name="actual_end_time"]', actualEnd);
    await page.fill('textarea[name="notes"]', 'Laporan E2E Test: Seluruh pekerjaan integrasi dan verifikasi sistem tuntas dilaksanakan.');

    // Kirim laporan ke Pimpinan
    await page.click('button:has-text("Submit & Kirim ke Pimpinan")');

    // Tunggu redirect selesai ke halaman riwayat
    await expect(page).toHaveURL(/.*\/pegawai\/riwayat/);

    // Verifikasi status berubah menjadi menunggu persetujuan (waiting_approval) di halaman riwayat
    const riwayatRow = page.locator('tr').filter({ hasText: uniqueTaskTitle });
    await expect(riwayatRow.locator('text=waiting_approval')).toBeVisible();

    // Keluar dari akun Pegawai
    await page.waitForTimeout(500); // Jeda HTMX
    await page.click('button:has-text("Keluar Aplikasi")', { force: true });
    await page.waitForURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Selamat Datang');


    // =========================================================================
    // RUTE 4: AKSI PIMPINAN (Melakukan Konfirmasi & Menyetujui Laporan)
    // =========================================================================
    console.log('--- Memulai Alur Pimpinan (Persetujuan Laporan) ---');
    // Login kembali sebagai Pimpinan
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/home/);

    // Buka Daftar Laporan Masuk
    await page.click('text=Daftar Laporan', { force: true });
    await expect(page).toHaveURL(/.*\/pimpinan\/laporan/);

    // Temukan baris laporan pegawai berdasarkan judul tugas, lalu klik Periksa
    const laporanRow = page.locator('tr').filter({ hasText: uniqueTaskTitle });
    await expect(laporanRow).toBeVisible();
    await laporanRow.locator('text=Periksa').click();

    // Verifikasi halaman detail laporan pimpinan termuat
    await expect(page.locator('h1')).toContainText('Detail Pelaksanaan Lembur');
    await expect(page.locator('text=Konfirmasi Setuju')).toBeVisible();

    // Handle dialog konfirmasi HTMX agar di-accept otomatis oleh Playwright
    page.once('dialog', async dialog => {
      console.log(`Menyetujui dialog konfirmasi pimpinan: ${dialog.message()}`);
      await dialog.accept();
    });

    // Klik tombol konfirmasi
    await page.click('text=Konfirmasi Setuju');

    // Tunggu status di-update menjadi disetujui (Approved)
    await expect(page.locator('text=Disetujui')).toBeVisible();

    // Keluar dari aplikasi, pengujian tuntas
    await page.waitForTimeout(500); // Jeda HTMX
    await page.click('button:has-text("Keluar Aplikasi")', { force: true });
    await page.waitForURL(/.*\/login/);

    console.log('--- Skenario Pengujian Selesai & Berhasil Penuh! ---');
  });

});
