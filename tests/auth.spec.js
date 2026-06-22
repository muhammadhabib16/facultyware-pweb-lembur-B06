const { test, expect } = require('@playwright/test');

test('Skenario: Pimpinan berhasil login dan masuk ke dashboard', async ({ page }) => {
  // 1. Robot diarahkan ke halaman login
  await page.goto('/login');

  // 2. Memastikan halaman termuat sempurna dengan mengecek judul (H1)
  await expect(page.locator('h1')).toContainText('Welcome back');

  // 3. Robot mengisi kolom form secara otomatis
  // ALASAN: Playwright menggunakan CSS Selector untuk menemukan elemen yang tepat
  await page.fill('input[name="email"]', 'habib@facultyware.com'); // Sesuaikan dengan data dummy di DB Bos
  await page.fill('input[name="password"]', 'password123'); // Sesuaikan dengan sandi di DB Bos

  // 4. Robot menekan tombol masuk
  await page.click('button[type="submit"]');

  // 5. Validasi Hasil (Assertion)
  // ALASAN: Ini adalah inti dari testing. Playwright akan memverifikasi apakah setelah diklik, browser berpindah ke URL laporan.
  await expect(page).toHaveURL(/.*\/home/);
});