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

test('Admin Fitur 32: Filter Laporan Berdasarkan Tanggal/Divisi', async ({ page }) => {
  await loginUser(page, ADMIN_EMAIL, ADMIN_PASS, 'Admin');
  await page.click('text=Rekap Bulanan', { force: true });
  await expect(page).toHaveURL(/.*\/admin\/rekap/);
  
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  await page.fill('input[name="start_date"]', formattedDate);
  await page.fill('input[name="end_date"]', formattedDate);
  await page.selectOption('select[name="unit_id"]', { index: 1 });
  await expect(page.locator('table')).toBeVisible();
});
