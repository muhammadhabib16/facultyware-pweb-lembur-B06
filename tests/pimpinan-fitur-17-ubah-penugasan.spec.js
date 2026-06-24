const { test, expect } = require('@playwright/test');
const PIMPINAN_EMAIL = 'alex@facultyware.com';
const PIMPINAN_PASS = 'password123';
const PEGAWAI_NAME = 'Isan';

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const formattedDate = `${yyyy}-${mm}-${dd}`;

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

test('Pimpinan Fitur 17: Mengubah Data Penugasan Lembur Pegawai', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name || 'browser';
  const uniqueTitle = `Ubah Tugas - ${browserName} - ${Date.now()}`;
  
  await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS, 'Pimpinan');
  
  // Prasyarat: Buat tugas
  await page.click('text=Buat Tugas Lembur', { force: true });
  const empOptionValue = await page.locator('select[name="employee_id"] option', { hasText: PEGAWAI_NAME }).getAttribute('value');
  await page.selectOption('select[name="employee_id"]', empOptionValue);
  await page.fill('input[name="title"]', uniqueTitle);
  await page.fill('input[name="request_date"]', formattedDate);
  await page.fill('input[name="planned_start_time"]', `${formattedDate}T17:00`);
  await page.fill('input[name="planned_end_time"]', `${formattedDate}T20:00`);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=berhasil diterbitkan')).toBeVisible();

  // Buka detail & Ubah
  await page.click('text=Daftar Tugas Anda', { force: true });
  const taskRow = page.locator('tr').filter({ hasText: uniqueTitle });
  await taskRow.getByRole('link', { name: 'Lihat Detail', exact: true }).click();
  await page.click('text=Ubah Penugasan');
  await expect(page).toHaveURL(/.*\/edit/);
  await page.fill('input[name="title"]', `${uniqueTitle} - Edited`);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*\/pimpinan\/penugasan/);
  await expect(page.locator(`text=${uniqueTitle} - Edited`)).toBeVisible();
});
