const db = require("../lib/db");
const ExcelJS = require("exceljs");
const bcrypt = require("bcryptjs");

// 1. Menampilkan Halaman Rekap & Filter
exports.halamanRekap = async (req, res, next) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    let whereClause = "WHERE or2.request_number LIKE 'REQ-ASSIGN-%'"; // Ambil data penugasan
    let params = [];

    // Logika Filter Tanggal
    if (start_date && end_date) {
      whereClause += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }
    // Logika Filter Divisi
    if (unit_id) {
      whereClause += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    // Ambil data divisi untuk pilihan dropdown
    const [divisi] = await db.query("SELECT id, name FROM organization_units ORDER BY name ASC");
    
    // Ambil data laporan
    const query = `
      SELECT 
        or2.request_number, or2.title, or2.request_date, or2.status,
        e.name AS pegawai_name, ou.name AS unit_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      ${whereClause}
      ORDER BY or2.request_date DESC
    `;
    const [laporan] = await db.query(query, params);

    res.render("admin/rekap", {
      title: "Rekap Laporan Lembur",
      laporan,
      divisi,
      filters: { start_date: start_date || '', end_date: end_date || '', unit_id: unit_id || '' }
    });
  } catch (err) {
    console.error("halamanRekap error:", err);
    next(err);
  }
};

// 2. Mengekspor Data ke Excel
exports.exportExcel = async (req, res, next) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    let whereClause = "WHERE or2.request_number LIKE 'REQ-ASSIGN-%'"; 
    let params = [];

    if (start_date && end_date) {
      whereClause += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }
    if (unit_id) {
      whereClause += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    const query = `
      SELECT 
        or2.request_number, or2.title, or2.request_date, or2.status,
        e.name AS pegawai_name, ou.name AS unit_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      ${whereClause}
      ORDER BY or2.request_date DESC
    `;
    const [laporan] = await db.query(query, params);

    // Proses Pembuatan File Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Lembur');

    // Desain Header Kolom Excel
    worksheet.columns = [
      { header: 'No. Penugasan', key: 'request_number', width: 25 },
      { header: 'Nama Pegawai', key: 'pegawai_name', width: 25 },
      { header: 'Divisi/Unit', key: 'unit_name', width: 25 },
      { header: 'Agenda Kerja', key: 'title', width: 35 },
      { header: 'Tanggal', key: 'request_date', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Masukkan data ke baris Excel
    laporan.forEach(item => {
      worksheet.addRow({
        request_number: item.request_number,
        pegawai_name: item.pegawai_name,
        unit_name: item.unit_name || '-',
        title: item.title,
        request_date: new Date(item.request_date).toLocaleDateString('id-ID'),
        status: item.status
      });
    });

    // Kirim file langsung terdownload ke browser pengguna
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Rekap_Lembur_Facultyware.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("exportExcel error:", err);
    next(err);
  }
};

// 3. Endpoint REST API Rekap Lembur (Tugas Darrel)
exports.apiRekapLembur = async (req, res) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    
    // Query dasar
    let query = `
      SELECT or2.request_number, or2.title, e.name as pegawai, ou.name as unit_name, or2.status
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      WHERE or2.request_number LIKE 'REQ-ASSIGN-%'
    `;
    let params = [];

    // Jika parameter filter tanggal diberikan di URL
    if (start_date && end_date) {
      query += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    // Jika parameter filter divisi diberikan di URL
    if (unit_id) {
      query += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    const [dataRekap] = await db.query(query, params);

    // KUNCI REST API: Kita menggunakan res.json(), bukan res.render()
    res.json({
      status: "success",
      total_data: dataRekap.length,
      data: dataRekap
    });
    
  } catch (err) {
    console.error("apiRekapLembur error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};

// 4. Menampilkan Halaman Daftar Pegawai (Kelola Pegawai)
exports.halamanPegawai = async (req, res, next) => {
  try {
    const query = `
      SELECT 
        e.*, 
        ou.name AS unit_name, 
        es.name AS employment_status_name
      FROM employees e
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      LEFT JOIN employment_statuses es ON e.employment_status_id = es.id
      ORDER BY e.name ASC
    `;
    const [employees] = await db.query(query);

    res.render("admin/list_pegawai", {
      title: "Kelola Pegawai",
      employees,
      toast: req.query.toast || null,
    });
  } catch (err) {
    console.error("halamanPegawai error:", err);
    next(err);
  }
};

// 5. Menampilkan Form Tambah Pegawai Baru
exports.halamanTambahPegawai = async (req, res, next) => {
  try {
    const [divisi] = await db.query("SELECT id, name FROM organization_units ORDER BY name ASC");
    const [statusKerja] = await db.query("SELECT id, name FROM employment_statuses ORDER BY name ASC");
    const [roles] = await db.query("SELECT id, name FROM roles ORDER BY id ASC");

    res.render("admin/tambah_pegawai", {
      title: "Tambah Pegawai Baru",
      divisi,
      statusKerja,
      roles,
      error: null,
    });
  } catch (err) {
    console.error("halamanTambahPegawai error:", err);
    next(err);
  }
};

// 6. Menyimpan Data Pegawai & User Login Baru (Database Transaction)
exports.simpanPegawai = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const {
      employee_number,
      national_id_number,
      tax_id_number,
      name,
      birth_place,
      birth_date,
      gender,
      religion,
      marital_status,
      address,
      phone_number,
      organization_unit_id,
      hire_date,
      employment_status_id,
      status,
      email,
      password,
      role_id,
    } = req.body;

    // Ambil data dropdown untuk fallback jika validasi gagal
    const getDropdowns = async () => {
      const [divisi] = await db.query("SELECT id, name FROM organization_units ORDER BY name ASC");
      const [statusKerja] = await db.query("SELECT id, name FROM employment_statuses ORDER BY name ASC");
      const [roles] = await db.query("SELECT id, name FROM roles ORDER BY id ASC");
      return { divisi, statusKerja, roles };
    };

    // Validasi data wajib
    if (
      !employee_number ||
      !name ||
      !birth_place ||
      !birth_date ||
      !gender ||
      !marital_status ||
      !address ||
      !organization_unit_id ||
      !hire_date ||
      !employment_status_id ||
      !status ||
      !email ||
      !password ||
      !role_id
    ) {
      const dropdowns = await getDropdowns();
      return res.render("admin/tambah_pegawai", {
        title: "Tambah Pegawai Baru",
        ...dropdowns,
        error: "Mohon isi semua kolom yang bertanda wajib (*), Bos!",
      });
    }

    // Cek duplikasi NIP (employee_number)
    const [existingNip] = await db.query("SELECT id FROM employees WHERE employee_number = ?", [employee_number]);
    if (existingNip.length > 0) {
      const dropdowns = await getDropdowns();
      return res.render("admin/tambah_pegawai", {
        title: "Tambah Pegawai Baru",
        ...dropdowns,
        error: `Nomor Induk Pegawai (NIP) "${employee_number}" sudah terdaftar di sistem!`,
      });
    }

    // Cek duplikasi email
    const [existingEmail] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existingEmail.length > 0) {
      const dropdowns = await getDropdowns();
      return res.render("admin/tambah_pegawai", {
        title: "Tambah Pegawai Baru",
        ...dropdowns,
        error: `Email "${email}" sudah terdaftar untuk akun login lain!`,
      });
    }

    // Mulai Transaksi
    await connection.beginTransaction();

    // 1. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Simpan ke tabel 'users'
    const [userResult] = await connection.query(
      "INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
      [name, email, hashedPassword]
    );
    const userId = userResult.insertId;

    // 3. Hubungkan role di pivot 'model_has_roles'
    await connection.query(
      "INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, 'User', ?)",
      [role_id, userId]
    );

    // 4. Simpan ke tabel 'employees'
    await connection.query(
      `INSERT INTO employees (
        employee_number, national_id_number, tax_id_number, name, 
        birth_place, birth_date, gender, religion, marital_status, 
        address, phone_number, organization_unit_id, hire_date, 
        employment_status_id, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        employee_number,
        national_id_number || null,
        tax_id_number || null,
        name,
        birth_place,
        birth_date,
        gender,
        religion || null,
        marital_status,
        address,
        phone_number || null,
        organization_unit_id,
        hire_date,
        employment_status_id,
        status,
      ]
    );

    // Commit Transaksi
    await connection.commit();

    // Penanganan respon HTMX
    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/admin/pegawai?toast=tambah_sukses");
      return res.sendStatus(204);
    }

    res.redirect("/admin/pegawai?toast=tambah_sukses");
  } catch (err) {
    await connection.rollback();
    console.error("simpanPegawai error:", err);
    const getDropdowns = async () => {
      const [divisi] = await db.query("SELECT id, name FROM organization_units ORDER BY name ASC");
      const [statusKerja] = await db.query("SELECT id, name FROM employment_statuses ORDER BY name ASC");
      const [roles] = await db.query("SELECT id, name FROM roles ORDER BY id ASC");
      return { divisi, statusKerja, roles };
    };
    const dropdowns = await getDropdowns().catch(() => ({ divisi: [], statusKerja: [], roles: [] }));
    res.render("admin/tambah_pegawai", {
      title: "Tambah Pegawai Baru",
      ...dropdowns,
      error: "Terjadi kesalahan internal pada server saat menyimpan data pegawai.",
    });
  } finally {
    connection.release();
  }
};