const { test, expect } = require('@playwright/test');
const PEGAWAI_EMAIL = 'Isan@facultyware.com';
const PEGAWAI_PASS = 'password123';

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

test('Pegawai Fitur 13: REST API Pencarian Penugasan Lembur Berdasarkan Kata Kunci', async ({ page }) => {
  await loginUser(page, PEGAWAI_EMAIL, PEGAWAI_PASS, 'Pegawai');
  const apiCariTugasRes = await page.evaluate(async () => {
    const res = await fetch('/api/pegawai/tugas/search?keyword=E2E');
    return { status: res.status, data: await res.json() };
  });
  expect(apiCariTugasRes.status).toBe(200);
  expect(apiCariTugasRes.data.status).toBe('success');
});
