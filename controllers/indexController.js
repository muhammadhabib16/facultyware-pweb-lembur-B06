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

  const role = req.session.role;
  const employeeId = req.session.employeeId;

  try {
    let totalTim = 0;
    let pendingReview = 0;
    let totalDisetujui = 0;
    let recentRequests = [];

    // Percabangan logika kueri berdasarkan Peran (Role) pengguna
    if (role === "pegawai") {
      // 1. PERAN: 'pegawai'
      
      // stats.totalTim: Akumulasi Jam Kerja Lembur Saya (Bulan Ini)
      // approved, submitted_by = employeeId, request_date bulan ini
      const [[{ totalHours }]] = await db.query(
        `SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, planned_start_time, planned_end_time) / 3600.0), 0) AS totalHours
         FROM overtime_requests
         WHERE status = 'approved'
           AND submitted_by = ?
           AND MONTH(request_date) = MONTH(NOW())
           AND YEAR(request_date) = YEAR(NOW())`,
        [employeeId]
      );
      totalTim = Math.round(totalHours * 10) / 10;

      // stats.pendingReview: total pengajuan lembur pribadi berstatus 'waiting_approval'
      const [[{ pendingCount }]] = await db.query(
        `SELECT COUNT(*) AS pendingCount
         FROM overtime_requests
         WHERE status = 'waiting_approval'
           AND submitted_by = ?`,
        [employeeId]
      );
      pendingReview = pendingCount;

      // stats.totalDisetujui: tugas aktif pribadi hari ini yang berstatus 'assigned'
      const [[{ assignedCount }]] = await db.query(
        `SELECT COUNT(*) AS assignedCount
         FROM overtime_requests
         WHERE status = 'assigned'
           AND submitted_by = ?
           AND request_date = CURDATE()`,
        [employeeId]
      );
      totalDisetujui = assignedCount;

      // recentRequests: maksimal 5 data penugasan lembur terbaru khusus milik pribadi pegawai tersebut
      const [requests] = await db.query(
        `SELECT 
          or2.id,
          or2.request_number, 
          or2.title, 
          or2.status, 
          or2.request_date,
          e.name AS pegawai_name
         FROM overtime_requests or2
         LEFT JOIN employees e ON or2.submitted_by = e.id
         WHERE or2.submitted_by = ?
         ORDER BY or2.created_at DESC
         LIMIT 5`,
        [employeeId]
      );
      recentRequests = requests;

    } else if (role === "pimpinan") {
      // 2. PERAN: 'pimpinan'
      
      // stats.totalTim: total karyawan aktif
      const [[{ totalTimCount }]] = await db.query(
        "SELECT COUNT(*) AS totalTimCount FROM employees WHERE status = 'active'"
      );
      totalTim = totalTimCount;

      // stats.pendingReview: total pengajuan 'waiting_approval' dari semua karyawan
      const [[{ pendingCount }]] = await db.query(
        "SELECT COUNT(*) AS pendingCount FROM overtime_requests WHERE status = 'waiting_approval'"
      );
      pendingReview = pendingCount;

      // stats.totalDisetujui: total pengajuan 'approved' dari semua karyawan
      const [[{ approvedCount }]] = await db.query(
        "SELECT COUNT(*) AS approvedCount FROM overtime_requests WHERE status = 'approved'"
      );
      totalDisetujui = approvedCount;

      // recentRequests: 5 antrean pengajuan lembur terbaru dari semua karyawan
      const [requests] = await db.query(
        `SELECT 
          or2.id,
          or2.request_number, 
          or2.title, 
          or2.status, 
          or2.request_date,
          e.name AS pegawai_name
         FROM overtime_requests or2
         LEFT JOIN employees e ON or2.submitted_by = e.id
         ORDER BY or2.created_at DESC
         LIMIT 5`
      );
      recentRequests = requests;

    } else if (role === "admin") {
      // 3. PERAN: 'admin'
      
      // stats.totalTim: total karyawan aktif di fakultas
      const [[{ totalTimCount }]] = await db.query(
        "SELECT COUNT(*) AS totalTimCount FROM employees WHERE status = 'active'"
      );
      totalTim = totalTimCount;

      // stats.pendingReview: akumulasi seluruh jam lembur fakultas yang sudah disetujui (bulan ini)
      const [[{ totalApprovedHours }]] = await db.query(
        `SELECT COALESCE(SUM(TIMESTAMPDIFF(SECOND, planned_start_time, planned_end_time) / 3600.0), 0) AS totalApprovedHours
         FROM overtime_requests
         WHERE status = 'approved'
           AND MONTH(request_date) = MONTH(NOW())
           AND YEAR(request_date) = YEAR(NOW())`
      );
      pendingReview = Math.round(totalApprovedHours * 10) / 10;

      // stats.totalDisetujui: total seluruh permohonan lembur yang sukses diselesaikan secara sistem (approved global)
      const [[{ approvedCount }]] = await db.query(
        "SELECT COUNT(*) AS approvedCount FROM overtime_requests WHERE status = 'approved'"
      );
      totalDisetujui = approvedCount;

      // recentRequests: log 5 transaksi data terbaru global
      const [requests] = await db.query(
        `SELECT 
          or2.id,
          or2.request_number, 
          or2.title, 
          or2.status, 
          or2.request_date,
          e.name AS pegawai_name
         FROM overtime_requests or2
         LEFT JOIN employees e ON or2.submitted_by = e.id
         ORDER BY or2.created_at DESC
         LIMIT 5`
      );
      recentRequests = requests;
    }

    // Render ke views/home.ejs dengan data yang telah disesuaikan dengan peran
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
    console.error("DASHBOARD ERROR:", err);
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

    req.session.save((err) => {
      if (err) {
        console.error("Gagal menyimpan session:", err);
        return next(err);
      }
      if (req.headers["hx-request"]) {
        res.setHeader("HX-Redirect", "/home");
        return res.end();
      }
      return res.redirect("/home");
    });
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