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

test('Admin Fitur 31: Membuat Laporan Rekapan dan Unduh XLSX', async ({ page }) => {
  await loginUser(page, ADMIN_EMAIL, ADMIN_PASS, 'Admin');
  await page.click('text=Rekap Bulanan', { force: true });
  await expect(page).toHaveURL(/.*\/admin\/rekap/);
  const [downloadXlsx] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Unduh Data Excel', { force: true })
  ]);
  expect(downloadXlsx.suggestedFilename()).toContain('.xlsx');
});
