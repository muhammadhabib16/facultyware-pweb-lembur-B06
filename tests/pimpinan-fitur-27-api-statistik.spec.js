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

test('Pimpinan Fitur 27: REST API Statistik Kinerja Persetujuan Pimpinan', async ({ page }) => {
  await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS, 'Pimpinan');
  const apiStatistikRes = await page.evaluate(async () => {
    const res = await fetch('/api/pimpinan/laporan/statistik');
    return { status: res.status, data: await res.json() };
  });
  expect(apiStatistikRes.status).toBe(200);
  expect(apiStatistikRes.data.status).toBe('success');
});
