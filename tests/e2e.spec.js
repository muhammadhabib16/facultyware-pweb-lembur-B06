const { test, expect } = require('@playwright/test');

// =====================================================================
// KONFIGURASI PENGGUNA UJI (SESUAIKAN DENGAN DATA DI DATABASE)
// =====================================================================
const PIMPINAN_EMAIL = 'alex@facultyware.com';
const PIMPINAN_PASS = 'password123';

const PEGAWAI_EMAIL = 'Isan@facultyware.com';
const PEGAWAI_PASS = 'password123';

const ADMIN_EMAIL = 'darrel@facultyware.com';
const ADMIN_PASS = 'password123';

/**
 * Helper login yang robust: tunggu halaman selesai load dulu (networkidle)
 * sebelum mengisi form, sehingga input tidak terlewat.
 */
async function loginUser(page, email, password) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/home/, { timeout: 60000 });
}

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Alur Autentikasi', () => {

  test('Login berhasil dengan kredensial yang benar', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('input[name="email"]', { state: 'visible' });
    await expect(page.locator('h1')).toContainText('Selamat Datang');

    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', PIMPINAN_PASS);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/home/);
  });

  test('Login gagal dengan kredensial salah', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForSelector('input[name="email"]', { state: 'visible' });
    await page.fill('input[name="email"]', PIMPINAN_EMAIL);
    await page.fill('input[name="password"]', 'salahpassword');
    await page.click('button[type="submit"]');

    // Tetap di halaman login setelah login gagal
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('Logout berhasil', async ({ page }) => {
    await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS);
    // Cari tombol logout di sidebar
    await page.click('button:has-text("Keluar Aplikasi"), a:has-text("Keluar Aplikasi")');
    await expect(page).toHaveURL(/.*\/login/);
  });

});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Alur Pegawai: Permohonan & Pelaporan Lembur', () => {

  test.beforeEach(async ({ page }) => {
    await loginUser(page, PEGAWAI_EMAIL, PEGAWAI_PASS);
  });

  test('Pegawai dapat mengakses form permohonan lembur mandiri', async ({ page }) => {
    await page.goto('/pegawai/permohonan');
    await expect(page.locator('h1')).toContainText('Ajukan Permohonan');
    await expect(page.locator('input[name="title"]')).toBeVisible();
  });

  test('Pegawai dapat melihat daftar tugas aktif', async ({ page }) => {
    await page.goto('/pegawai/tugas');
    await expect(page.locator('h1')).toContainText('Daftar Tugas Lembur');
  });

  test('Pegawai dapat melihat riwayat lembur', async ({ page }) => {
    await page.goto('/pegawai/riwayat');
    await expect(page.locator('h1')).toContainText('Riwayat & Status Lembur');
    await expect(page.locator('table')).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Alur Pimpinan: Validasi & Penugasan', () => {

  test.beforeEach(async ({ page }) => {
    await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS);
  });

  test('Pimpinan dapat melihat dashboard', async ({ page }) => {
    await page.goto('/home');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Pimpinan dapat mengakses halaman penugasan lembur', async ({ page }) => {
    await page.goto('/pimpinan/penugasan');
    await expect(page.locator('table')).toBeVisible();
  });

  test('Pimpinan dapat melihat form buat penugasan lembur', async ({ page }) => {
    await page.goto('/pimpinan/penugasan/buat');
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

});

// ─────────────────────────────────────────────────────────────────────────────
test.describe('Alur Admin: Kelola Pegawai', () => {

  test.beforeEach(async ({ page }) => {
    await loginUser(page, ADMIN_EMAIL, ADMIN_PASS);
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
