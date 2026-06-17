const db = require("../lib/db"); // Menggunakan utilitas lib/db terpusat proyek Bos

// Middleware untuk mengecek apakah user sudah login secara umum
async function isAuthenticated(req, res, next) {
  // 1. Periksa apakah userId ada di dalam session Express Bos
  if (!req.session || !req.session.userId) {
    // KONSEKUENSI HTMX: Jika sesi habis saat akses via HTMX, kirim header HX-Redirect agar browser kembali ke halaman login
    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/login");
      return res.end();
    }
    return res.redirect("/login");
  }

  try {
    // 2. AMBIL DATA PHYSICAL EMPLOYEE (BRIDGE LOGIC)
    // ALASAN: Mengambil ID pegawai/pimpinan dari tabel 'employees' yang terhubung dengan users.id Bos
    const [employees] = await db.query(
      "SELECT id FROM employees WHERE id = ?",
      [req.session.userId]
    );

    if (employees.length > 0) {
      // DAMPAK: Objek req.user.employee_id sekarang terisi secara otomatis dan presisi!
      // Ini akan mencegah error 'undefined' saat menjalankan Fitur 15 & 16 di controller Hasyfi
      req.user = {
        employee_id: employees[0].id,
      };
    } else {
      // Jika user terdaftar di tabel users tapi profilnya belum di-seed di tabel employees
      req.user = {
        employee_id: null,
      };
    }

  // middlewares/auth.js
  req.user = {
    employee_id: 4
  };

    next(); // Lolos validasi, lanjutkan ke middleware/controller berikutnya
  } catch (error) {
    console.error("Error pada middleware isAuthenticated:", error);
    next(error);
  }
}

module.exports = {
  isAuthenticated,
};