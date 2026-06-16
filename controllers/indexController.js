const bcrypt = require("bcryptjs");
const db = require("../lib/db"); // Menggunakan utilitas lib/db terpusat sesuai konvensi proyek

const index = (req, res) => {
  res.render("index", { title: "Express" });
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE FUNGSI HOME / DASHBOARD UTAMA (Kini Dinamis & Fungsional)
// ─────────────────────────────────────────────────────────────────────────────
const home = async (req, res, next) => {
  // Pengaman jika sesi hilang tiba-tiba sebelum masuk dashboard
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    // 1. QUERY AGREGASI STATISTIK (Dinamis dari DB)
    // Alasan: Menghitung metrik riil operasional kerja untuk dipajang di kartu dashboard

    // Hitung seluruh total karyawan aktif kelompok Bos di tabel employees
    const [[{ totalTim }]] = await db.query(
      "SELECT COUNT(*) AS totalTim FROM employees WHERE status = 'active'",
    );

    // Hitung berapa banyak tugas lembur yang berstatus menunggu verifikasi pimpinan ('completed')
    const [[{ pendingReview }]] = await db.query(
      "SELECT COUNT(*) AS pendingReview FROM overtime_requests WHERE status = 'waiting_approval'",
    );

    // Hitung berapa banyak total pengajuan lembur yang sudah sukses disetujui pimpinan ('approved')
    const [[{ totalDisetujui }]] = await db.query(
      "SELECT COUNT(*) AS totalDisetujui FROM overtime_requests WHERE status = 'approved'",
    );

    // 2. QUERY RINGKASAN AKTIVITAS TERBARU
    // Alasan: Menarik 5 data penugasan lembur teranyar untuk mengisi tabel riwayat di dashboard
    const [recentRequests] = await db.query(`
      SELECT 
        or2.id,
        or2.request_number, 
        or2.title, 
        or2.status, 
        or2.request_date,
        e.name AS pegawai_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      ORDER BY or2.created_at DESC
      LIMIT 5
    `);

    // 3. Render ke views/home.ejs dengan suplai data agregasi baru
    // Dampak: Tampilan dashboard Bos sekarang terisi otomatis dan fungsionalitasnya jalan semua
    res.render("home", {
      title: "Dashboard Central Panel",
      user: req.session.name,
      role: req.session.role,
      stats: {
        totalTim,
        pendingReview,
        totalDisetujui,
      },
      recentRequests,
    });
  } catch (err) {
    console.error("Gagal memuat data statistik dashboard, Bos:", err);
    next(err);
  }
};

const loginPage = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/home");
  }
  res.render("login", { title: "Login", error: null });
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI LOGIN (Fungsionalitas Penting Dipertahankan 100%)
// ─────────────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  // 1. Ambil input email (dari input field form login Bos) dan password
  const { email, password } = req.body;

  try {
    // DEBUG LOG: Untuk melihat isi data input fisik yang ditangkap terminal Bos
    console.log("--- DEBUG LOGIN ---");
    console.log("Email yang diterima server:", email);
    console.log("Password yang diterima server:", password);

    // 2. Cari user berdasarkan email di tabel users riil Bos
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    console.log("Jumlah user ditemukan di DB:", rows.length);
    console.log("───────────────────");

    if (rows.length === 0) {
      return res.render("login", {
        title: "Login",
        error: "Email tidak terdaftar di database, Bos!",
      });
    }

    const user = rows[0];

    // 3. Verifikasi kata sandi terenkripsi menggunakan bcryptjs (Cukup Sekali Saja)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        title: "Login",
        error: "Password yang Bos masukkan salah!",
      });
    }

    // 4. Ambil data ROLE dari tabel pivot 'model_has_roles' sesuai isi skema SQL Bos
    const [roles] = await db.query(
      `SELECT r.name FROM roles r 
       JOIN model_has_roles mhr ON r.id = mhr.role_id 
       WHERE mhr.model_id = ? AND mhr.model_type = 'User'`,
      [user.id],
    );

    const userRole = roles.length > 0 ? roles[0].name : null;

    // 5. Ambil daftar PERMISSIONS yang terhubung dengan Role tersebut
    let userPermissions = [];
    if (userRole) {
      const [perms] = await db.query(
        `SELECT p.name FROM permissions p
         JOIN role_has_permissions rhp ON p.id = rhp.permission_id
         JOIN roles r ON rhp.role_id = r.id
         WHERE r.name = ?`,
        [userRole],
      );
      userPermissions = perms.map((p) => p.name); // Transformasi array of object menjadi array of string
    }

    // 6. Set Express Session secara lengkap
    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.role = userRole;
    req.session.permissions = userPermissions; // Berisi array penanda izin route ACL

    // 7. KONSEKUENSI HTMX: Cek apakah request datang dari HTMX
    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/home");
      return res.end();
    }

    // Fallback jika login diakses secara tradisional tanpa HTMX
    res.redirect("/home");
  } catch (err) {
    next(err);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }

    // Penanganan redirect logout untuk HTMX maupun request biasa
    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/login");
      return res.end();
    }
    res.redirect("/login");
  });
};

module.exports = {
  index,
  home,
  loginPage,
  login,
  logout,
};
