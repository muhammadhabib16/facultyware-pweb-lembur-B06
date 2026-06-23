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
    console.error("LOGIN ERROR:");
    console.error(err);
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
  const { email, password } = req.body;

  try {
    console.log("--- DEBUG LOGIN ---");
    console.log("Email yang diterima server:", email);
    console.log("Password yang diterima server:", password);

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.render("login", {
        title: "Login",
        error: "Email tidak terdaftar!",
      });
    }

    const user = rows[0];

  
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        title: "Login",
        error: "Password salah!",
      });
    }



    const [roles] = await db.query(
      `SELECT r.name
       FROM roles r
       JOIN model_has_roles mhr ON r.id = mhr.role_id
       WHERE mhr.model_id = ?
       AND mhr.model_type = 'User'`,
      [user.id]
    );

    const userRole = roles.length > 0 ? roles[0].name : null;

    
    // Cari employee yang terhubung dengan user ini
    const [employees] = await db.query(
      "SELECT id, employee_number FROM employees WHERE user_id = ? LIMIT 1",
      [user.id]
    );
    const employeeId = employees.length > 0 ? employees[0].id : null;
    const employeeNumber = employees.length > 0 ? employees[0].employee_number : null;

    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.role = userRole;
    req.session.employeeId = employeeId; 
    req.session.employee_number = employeeNumber;

    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/home");
      return res.end();
    }

    return res.redirect("/home");
  } catch (err) {
    console.error("LOGIN ERROR:");
    console.error(err);
    console.error(err.stack);
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