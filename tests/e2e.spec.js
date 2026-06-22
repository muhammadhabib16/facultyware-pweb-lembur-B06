const { test, expect } = require('@playwright/test');

// =====================================================================
// KONFIGURASI PENGGUNA UJI (SILAKAN SESUAIKAN DENGAN DATA DI DATABASE)
// =====================================================================
const PIMPINAN_EMAIL = 'habib@facultyware.com';
const PIMPINAN_PASS = 'password123';

const PEGAWAI_EMAIL = 'alya@facultyware.com'; // Ganti jika email pegawai berbeda di DB
const PEGAWAI_PASS = 'password123';


test.describe('Alur Autentikasi', () => {

  test('Login berhasil dengan kredensial yang benar', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Welcome back');

    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');

    // Pastikan diarahkan ke dashboard atau laporan pimpinan
    await expect(page).toHaveURL(/.*\/pimpinan\/laporan|.*\/home/);
  });

  test('Login gagal dengan kredensial salah', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', 'salah123');
    await page.click('button[type="submit"]');

    // Pesan error biasanya muncul, pastikan masih di halaman login
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Logout berhasil', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*\/pimpinan\/laporan|.*\/home/);

    // Cari tombol logout di sidebar dengan teks "Keluar Aplikasi"
    await page.click('button:has-text("Keluar Aplikasi"), a:has-text("Keluar Aplikasi")');
    await expect(page).toHaveURL(/.*\/login/);
  });

});

test.describe('Alur Pegawai: Permohonan & Pelaporan Lembur', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai pegawai sebelum setiap test di blok ini
    await page.goto('/login');
    await page.fill('input[name="email"]', PEGAWAI_EMAIL);
    await page.fill('input[name="password"]', PEGAWAI_PASS);
    await page.click('button[type="submit"]');
  });

  test('Pegawai dapat mengakses form permohonan lembur mandiri', async ({ page }) => {
    await page.goto('/pegawai/permohonan');
    await expect(page.locator('h1')).toContainText('Ajukan Permohonan');
    
    // Pastikan form field tersedia
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
  });

  test('Pegawai dapat melihat daftar tugas aktif', async ({ page }) => {
    await page.goto('/pegawai/tugas');
    await expect(page.locator('h1')).toContainText('Daftar Tugas');
  });

  test('Pegawai dapat melihat riwayat lembur', async ({ page }) => {
    await page.goto('/pegawai/riwayat');
    await expect(page.locator('h1')).toContainText('Riwayat & Status Lembur');
    
    // Memastikan tabel riwayat termuat
    await expect(page.locator('table')).toBeVisible();
  });

  // Catatan: Test E2E untuk *submit* form (insert data) dipisah atau tidak dilakukan berulang 
  // agar tidak menumpuk data sampah di database development, 
  // namun Anda dapat menghidupkan baris di bawah ini jika ingin mengetes insert:
  /*
  test('Pegawai dapat submit permohonan lembur', async ({ page }) => {
    await page.goto('/pegawai/permohonan');
    await page.fill('input[name="title"]', 'Lembur Testing E2E');
    await page.fill('textarea[name="description"]', 'Menguji fungsionalitas permohonan lembur otomatis.');
    await page.fill('input[name="request_date"]', '2026-10-10');
    await page.fill('input[name="planned_start_time"]', '2026-10-10T17:00');
    await page.fill('input[name="planned_end_time"]', '2026-10-10T20:00');
    await page.click('button[type="submit"]');

    // Tunggu sampai diarahkan ke daftar tugas aktif
    await expect(page).toHaveURL(/.*\/pegawai\/tugas/);
  });
  */
});

test.describe('Alur Pimpinan: Validasi & Penugasan', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai pimpinan sebelum setiap test di blok ini
    await page.goto('/login');
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');
  });

  test('Pimpinan dapat melihat dashboard / laporan', async ({ page }) => {
    await page.goto('/pimpinan/laporan');
    // Memastikan halaman laporan bisa diakses dan tabel muncul
    await expect(page.locator('table')).toBeVisible();
  });

  test('Pimpinan dapat mengakses halaman penugasan lembur', async ({ page }) => {
    await page.goto('/pimpinan/penugasan');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Pimpinan dapat melihat form buat penugasan lembur (Assign)', async ({ page }) => {
    await page.goto('/pimpinan/penugasan/buat');
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

});

test.describe('Alur Admin: Kelola Pegawai', () => {

  test.beforeEach(async ({ page }) => {
    // Login sebagai admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'darrel@facultyware.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
  });

  test('Admin dapat mengakses halaman kelola pegawai', async ({ page }) => {
    await page.goto('/admin/pegawai');
    await expect(page.locator('h1')).toContainText('Kelola Pegawai');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Admin dapat mengakses form tambah pegawai', async ({ page }) => {
    await page.goto('/admin/pegawai/tambah');
    await expect(page.locator('h1')).toContainText('Tambah Pegawai Baru');
    await expect(page.locator('input[name="name"]')).toBeVisible();
    await expect(page.locator('input[name="employee_number"]')).toBeVisible();
  });

});

