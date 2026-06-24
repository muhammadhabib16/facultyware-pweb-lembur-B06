const { test, expect } = require('@playwright/test');
const PIMPINAN_EMAIL = 'alex@facultyware.com';
const PIMPINAN_PASS = 'password123';

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

test('Pimpinan Fitur 22: Melihat List Laporan Lembur', async ({ page }) => {
  await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS, 'Pimpinan');
  await page.click('text=Daftar Laporan', { force: true });
  await expect(page).toHaveURL(/.*\/pimpinan\/laporan/);
  await expect(page.locator('table')).toBeVisible();
});
