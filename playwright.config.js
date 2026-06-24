// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests',
  /* Timeout global per-test: 2 menit (cukup untuk alur multi-langkah) */
  timeout: 120000,
  /* Jalankan test secara sequential (1 worker) untuk menghindari konflik session/DB */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // 1 retry agar test transient tidak langsung gagal
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    /* Tangkap trace untuk setiap retry — berguna saat debugging */
    trace: 'on-first-retry',
    /* Action timeout: 15 detik per klik/fill (standar Playwright) */
    actionTimeout: 15000,
    /* Navigation timeout: 30 detik per navigasi halaman */
    navigationTimeout: 30000,
  },

  /* Hanya jalankan di Chromium untuk kecepatan; aktifkan Firefox/WebKit jika diperlukan */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],
});
