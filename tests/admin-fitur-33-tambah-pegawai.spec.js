const { test, expect } = require('@playwright/test');
const ADMIN_EMAIL = 'darrel@facultyware.com';
const ADMIN_PASS = 'password123';

async function loginUser(page, email, password, roleLabel) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForSelector('input[name="email"]', { state: 'visible' });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  try {
    await page.waitForURL(/.*\/home/, { timeout: 60000 });
  } catch (e) {
    const errorText = await page.locator('.bg-rose-50\\/80, .bg-destructive\\/15, [class*="error"], [class*="destructive"]')
      .first()
      .innerText()
      .catch(() => 'Tidak ada pesan error yang terdeteksi di UI');
    throw new Error(`Login ${roleLabel} Gagal. Detail error dari UI: "${errorText.trim()}"`);
  }
}

test('Admin Fitur 33: Menambahkan Akun Pegawai Baru', async ({ page }) => {
  await loginUser(page, ADMIN_EMAIL, ADMIN_PASS, 'Admin');
  await page.click('text=Kelola Pegawai', { force: true });
  await page.click('text=Tambah Pegawai Baru', { force: true });
  await expect(page).toHaveURL(/.*\/admin\/pegawai\/tambah/);
  
  const testNip = `NIP-TEST-${Date.now()}`;
  await page.fill('input[name="name"]', 'Pegawai Uji Playwright');
  await page.fill('input[name="employee_number"]', testNip);
  await page.fill('input[name="birth_place"]', 'Padang');
  await page.fill('input[name="birth_date"]', '1996-08-20');
  await page.selectOption('select[name="gender"]', 'male');
  await page.selectOption('select[name="marital_status"]', 'single');
  await page.fill('textarea[name="address"]', 'Jl. Kampus UNAND Limau Manis, Padang');
  await page.selectOption('select[name="organization_unit_id"]', { index: 1 });
  await page.selectOption('select[name="employment_status_id"]', { index: 1 });
  await page.fill('input[name="hire_date"]', '2022-01-01');
  await page.selectOption('select[name="status"]', 'active');
  await page.fill('input[name="email"]', `pegawai_test_${Date.now()}@facultyware.com`);
  await page.fill('input[name="password"]', 'password123');
  await page.selectOption('select[name="role_id"]', '3'); // ID role pegawai
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/.*\/admin\/pegawai/);
  await expect(page.locator(`text=${testNip}`)).toBeVisible();
});
