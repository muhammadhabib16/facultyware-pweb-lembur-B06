const { test, expect } = require('@playwright/test');
const PEGAWAI_EMAIL = 'Isan@facultyware.com';
const PEGAWAI_PASS = 'password123';
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

test('Pimpinan Fitur 28: Mengekspor Detail Laporan Kerja ke Microsoft Word (DOCX)', async ({ page }, testInfo) => {
  const browserName = testInfo.project.name || 'browser';
  const uniqueTitle = `Docx Lap - ${browserName} - ${Date.now()}`;

  // Prasyarat: PIMPINAN buat penugasan (status langsung = 'assigned')
  await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS, 'Pimpinan');
  await page.click('text=Buat Tugas Lembur', { force: true });
  const empOptionValue = await page.locator('select[name="employee_id"] option', { hasText: PEGAWAI_NAME }).getAttribute('value');
  await page.selectOption('select[name="employee_id"]', empOptionValue);
  await page.fill('input[name="title"]', uniqueTitle);
  await page.fill('input[name="request_date"]', formattedDate);
  await page.fill('input[name="planned_start_time"]', `${formattedDate}T17:00`);
  await page.fill('input[name="planned_end_time"]', `${formattedDate}T20:00`);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=berhasil diterbitkan')).toBeVisible();
  await page.click('button:has-text("Keluar Aplikasi")', { force: true });
  await page.waitForURL(/.*\/login/);

  // Pegawai isi laporan realisasi
  await loginUser(page, PEGAWAI_EMAIL, PEGAWAI_PASS, 'Pegawai');
  await page.click('text=Daftar Tugas Aktif', { force: true });
  await page.locator('tr').filter({ hasText: uniqueTitle }).getByRole('link', { name: 'Detail', exact: true }).click();
  await page.click('text=Isi Laporan Realisasi');
  await page.fill('input[name="actual_start_time"]', `${formattedDate}T17:00`);
  await page.fill('input[name="actual_end_time"]', `${formattedDate}T19:30`);
  await page.fill('textarea[name="notes"]', 'Laporan DOCX.');
  await page.click('button:has-text("Submit & Kirim ke Pimpinan")');
  await page.waitForURL(/.*\/pegawai\/riwayat/, { timeout: 15000 }).catch(() => page.waitForTimeout(1500));
  await page.click('button:has-text("Keluar Aplikasi")', { force: true });
  await page.waitForURL(/.*\/login/);

  // Pimpinan export DOCX
  await loginUser(page, PIMPINAN_EMAIL, PIMPINAN_PASS, 'Pimpinan');
  await page.click('text=Daftar Laporan', { force: true });
  await page.locator('tr').filter({ hasText: uniqueTitle }).locator('text=Detail & Review').click();
  // Pimpinan approve first so DOCX download button becomes visible
  page.once('dialog', async dialog => {
    await dialog.accept();
  });
  await page.click('text=Konfirmasi Setuju');
  await expect(page.locator('text=Disetujui').first()).toBeVisible();

  const [downloadDocx] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Unduh DOCX')
  ]);
  expect(downloadDocx.suggestedFilename()).toContain('.docx');
});
