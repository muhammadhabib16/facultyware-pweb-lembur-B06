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

test('Pegawai Fitur 03 & 07: Membatalkan Pengajuan Lembur Mandiri', async ({ page }) => {
  await loginUser(page, PEGAWAI_EMAIL, PEGAWAI_PASS, 'Pegawai');
  
  // Prasyarat: Buat Permohonan
  await page.click('text=Ajukan Lembur Mandiri', { force: true });
  const uniqueTitle = `Batal - ${Date.now()}`;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const formattedDate = `${yyyy}-${mm}-${dd}`;

  await page.fill('input[name="title"]', uniqueTitle);
  await page.fill('textarea[name="description"]', 'Tugas batal.');
  await page.fill('input[name="request_date"]', formattedDate);
  await page.fill('input[name="planned_start_time"]', `${formattedDate}T17:00`);
  await page.fill('input[name="planned_end_time"]', `${formattedDate}T20:00`);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=berhasil diajukan')).toBeVisible();

  // Batalkan
  await page.click('text=Daftar Tugas Aktif', { force: true });
  await page.locator('tr').filter({ hasText: uniqueTitle }).getByRole('link', { name: 'Detail', exact: true }).click();
  page.once('dialog', async dialog => {
    await dialog.accept();
  });
  await page.click('text=Batalkan Permohonan');
  await page.waitForURL(/.*\/pegawai\/tugas/);
  await expect(page.locator(`text=${uniqueTitle}`)).not.toBeVisible();
});
