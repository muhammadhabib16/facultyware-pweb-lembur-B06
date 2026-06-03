const bcrypt = require("bcryptjs");
const db = require("../lib/db"); // Menggunakan utilitas lib/db terpusat sesuai konvensi proyek

const index = (req, res) => {
  res.render("index", { title: "Express" });
};

const home = (req, res) => {
  // Menggunakan req.session.name atau email yang ditarik dari DB saat login
  res.render("home", {
    title: "Home",
    user: req.session.name,
    role: req.session.role,
  });
};

const loginPage = (req, res) => {
  if (req.session.userId) {
    return res.redirect("/home");
  }
  res.render("login", { title: "Login", error: null });
};

const login = async (req, res, next) => {
  // 1. Ambil input email (dari input field form login Bos) dan password
  const { email, password } = req.body;

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // DEBUG LOG: Untuk melihat isi data input fisik yang ditangkap terminal Bos
    console.log("--- DEBUG LOGIN ---");
    console.log("Email yang diterima server:", email);
    console.log("Password yang diterima server:", password);
    // ─────────────────────────────────────────────────────────────────────────

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
    // ALASAN PERBAIKAN: Menghapus deklarasi ganda variabel 'user' & 'isMatch' sebelumnya agar tidak crash
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.render("login", {
        title: "Login",
        error: "Password yang Bos masukkan salah!",
      });
    }

    // 4. Ambil data ROLE dari tabel pivot 'model_has_roles' sesuai isi skema SQL Bos
    // ALASAN: Mengetahui peran fisik pengguna (admin/pimpinan/pegawai)
    const [roles] = await db.query(
      `SELECT r.name FROM roles r 
       JOIN model_has_roles mhr ON r.id = mhr.role_id 
       WHERE mhr.model_id = ? AND mhr.model_type = 'User'`,
      [user.id],
    );

    const userRole = roles.length > 0 ? roles[0].name : null;

    // 5. Ambil daftar PERMISSIONS yang terhubung dengan Role tersebut
    // ALASAN: Untuk disuplai ke middleware acl (checkPermission) agar proteksi route bekerja
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
    // DAMPAK: Data penanda hak akses ini menetap di database session selama masa aktif cookie
    req.session.userId = user.id;
    req.session.name = user.name;
    req.session.email = user.email;
    req.session.role = userRole;
    req.session.permissions = userPermissions; // Berisi array seperti ['view_overtime_reports', 'approve_overtime_reports']

    // 7. KONSEKUENSI HTMX: Cek apakah request datang dari HTMX
    // Tujuannya: Jika disubmit lewat HTMX, gunakan header khusus agar browser berpindah halaman dengan lancar
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
