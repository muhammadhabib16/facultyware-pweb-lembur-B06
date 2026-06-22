const db = require("../lib/db");
const PDFDocument = require("pdfkit");

// Helper ambil employee_id dari user login
const getEmployeeId = (req) => {
  return req.user?.employee_id || req.session?.employeeId || req.session?.userId;
};

// Helper ubah input tanggal/waktu jadi format MySQL DATETIME
const toMySQLDateTime = (dateValue, timeValue) => {
  if (!dateValue && !timeValue) return null;

  // Kalau input waktu sudah datetime-local: 2026-06-24T18:00
  if (timeValue && String(timeValue).includes("T")) {
    return String(timeValue).replace("T", " ") + ":00";
  }

  // Kalau planned_start_time/planned_end_time sudah lengkap
  if (timeValue && String(timeValue).includes("-")) {
    return String(timeValue).replace("T", " ");
  }

  // Kalau input dipisah: request_date = 2026-06-24, time = 18:00
  if (dateValue && timeValue) {
    const time = String(timeValue).length === 5 ? `${timeValue}:00` : timeValue;
    return `${dateValue} ${time}`;
  }

  return null;
};

const calculateHours = (startValue, endValue) => {
  const start = new Date(String(startValue).replace(" ", "T"));
  const end = new Date(String(endValue).replace(" ", "T"));

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end - start;
  return Number((diffMs / (1000 * 60 * 60)).toFixed(2));
};

const formatStatus = (status) => {
  const map = {
    pending: "Pending",
    assigned: "Assigned",
    waiting_approval: "Waiting Approval",
    approved: "Approved",
    rejected: "Rejected",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return map[status] || status || "-";
};

// Helper lokal untuk mengambil employee_id dari database berdasarkan req.session.userId
async function getEmployeeId(req) {
  const userId = req.session.userId;
  if (!userId) return null;
  const [rows] = await db.query("SELECT id FROM employees WHERE id = ?", [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

// GET /pegawai/permohonan
exports.formPermohonan = async (req, res, next) => {
  try {
    res.render("pegawai/permohonan", {
      title: "Ajukan Permohonan Lembur Mandiri",
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("formPermohonan error:", err);
    next(err);
  }
};

// POST /pegawai/permohonan
exports.simpanPermohonan = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const {
      title,
      description,
      request_date,
      planned_start_time,
      planned_end_time,
    } = req.body;
<<<<<<< HEAD
=======
    
    const employeeId = await getEmployeeId(req);
>>>>>>> dev

    const employeeId = getEmployeeId(req);

    if (!employeeId) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error:
          "Profil pegawai Anda belum disiapkan di database. Silakan hubungi admin.",
        success: null,
      });
    }

    if (!title || !request_date || !planned_start_time || !planned_end_time) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Semua kolom wajib harus diisi.",
        success: null,
      });
    }

    const startDateTime = toMySQLDateTime(request_date, planned_start_time);
    const endDateTime = toMySQLDateTime(request_date, planned_end_time);

    const plannedHours = calculateHours(startDateTime, endDateTime);

    if (plannedHours <= 0) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Waktu selesai harus setelah waktu mulai lembur.",
        success: null,
      });
    }

    await connection.beginTransaction();

    const [pimpinans] = await connection.query(
      `
      SELECT e.id
      FROM employees e
      JOIN model_has_roles mhr ON e.id = mhr.model_id
      JOIN roles r ON mhr.role_id = r.id
      WHERE r.name = 'pimpinan'
        AND mhr.model_type = 'User'
      LIMIT 1
      `
    );

    if (pimpinans.length === 0) {
      throw new Error("PIMPINAN_NOT_FOUND");
    }

    const approvedById = pimpinans[0].id;
    const requestNumber = `REQ-LEMBUR-${Date.now()}`;

    const [result] = await connection.query(
<<<<<<< HEAD
      `
      INSERT INTO overtime_requests (
        request_number,
=======
      `INSERT INTO overtime_requests (
        request_number, title, description, request_date, 
        planned_start_time, planned_end_time, submitted_by, status,
        submitted_by_id, approved_by, approved_by_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
      [
        requestNumber,
>>>>>>> dev
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
<<<<<<< HEAD
        submitted_by,
        status,
        submitted_by_id,
        approved_by_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())
      `,
      [
        requestNumber,
        title,
        description,
        request_date,
        startDateTime,
        endDateTime,
        employeeId,
        employeeId,
        approvedById,
=======
        employeeId,    // submitted_by (int FK ke employees)
        employeeId,    // submitted_by_id (int FK ke employees)
        approvedById,  // approved_by (int FK ke employees — pimpinan)
        approvedById,  // approved_by_id
>>>>>>> dev
      ]
    );

    const newRequestId = result.insertId;

    await connection.query(
      `
      INSERT INTO overtime_request_members (
        overtime_request_id,
        employee_id,
        role,
        job_desc,
        planned_hours,
        actual_start_time,
        actual_end_time,
        actual_hours,
        notes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, 0.00, NULL, NOW(), NOW())
      `,
      [
        newRequestId,
        employeeId,
        "Pemohon",
        description || title,
        plannedHours,
      ]
    );

    await connection.commit();

<<<<<<< HEAD
    res.redirect("/pegawai/riwayat");
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("rollback simpanPermohonan error:", rollbackErr);
    }

=======
    // Penanganan respon asinkron HTMX
    if (req.headers["hx-request"]) {
      return res.send(`
        <div class="bg-emerald-500/15 text-emerald-500 text-sm p-4 rounded-md border border-emerald-500/20 text-center mb-6">
            Permohonan lembur <strong>${title}</strong> (${requestNumber}) berhasil diajukan! Kini tampil di Daftar Tugas Aktif Anda.
        </div>
        <div class="flex justify-center">
          <a hx-get="/pegawai/tugas" hx-target="body" hx-swap="outerHTML" class="btn btn-primary cursor-pointer">Lihat Daftar Tugas Aktif</a>
        </div>
      `);
    }

    // Fallback jika disubmit secara tradisional
    res.redirect("/pegawai/tugas");
  } catch (err) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Gagal melakukan rollback:", rollbackErr);
      }
    }
>>>>>>> dev
    if (err.message === "PIMPINAN_NOT_FOUND") {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error:
          "Pengajuan gagal: Tidak ada data pimpinan aktif yang terdaftar di sistem.",
        success: null,
      });
    }

    console.error("simpanPermohonan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

<<<<<<< HEAD
// GET /pegawai/riwayat
exports.riwayatLembur = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
    }

    const [riwayat] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.created_at
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.submitted_by_id = ?
         OR orm.employee_id = ?
      ORDER BY or2.created_at DESC, or2.id DESC
      `,
      [employeeId, employeeId]
    );

    res.render("pegawai/riwayat", {
      title: "Riwayat Lembur",
      riwayat,
      formatStatus,
    });
  } catch (err) {
    console.error("riwayatLembur error:", err);
    res.status(500).send("Terjadi kesalahan saat membuka riwayat lembur.");
  }
};

// POST /pegawai/permohonan/:id/batal
exports.batalkanPermohonan = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const requestId = req.params.id;

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
    }

    await db.query(
      `
      UPDATE overtime_requests
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = ?
        AND submitted_by_id = ?
        AND status = 'pending'
      `,
      [requestId, employeeId]
    );

    res.redirect("/pegawai/riwayat");
  } catch (err) {
    console.error("batalkanPermohonan error:", err);
    res.status(500).send("Gagal membatalkan permohonan.");
  }
};

// Alias supaya aman kalau route lama pakai nama batalPermohonan
exports.batalPermohonan = exports.batalkanPermohonan;

// GET /pegawai/api/riwayat
exports.apiRiwayatLembur = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
=======
// ─────────────────────────────────────────────────────────────────────────────
// FITUR 5 & 7: MELIHAT DAFTAR TUGAS AKTIF (GET /pegawai/tugas)
// ─────────────────────────────────────────────────────────────────────────────
exports.listTugasAktif = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { search } = req.query;

    let whereClause = `WHERE orm.employee_id = ? AND or2.status IN ('assigned', 'pending')`;
    const params = [employeeId];

    if (search) {
      whereClause += ` AND (or2.title LIKE ? OR or2.request_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT 
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
      ${whereClause}
      ORDER BY or2.created_at DESC
    `;

    const [tugas] = await db.query(query, params);

    res.render("pegawai/tugas", {
      title: "Daftar Tugas Aktif & Pengajuan",
      tugas,
      filters: { search: search || "" },
    });
  } catch (err) {
    console.error("listTugasAktif error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 2: DETAIL TUGAS & VALIDASI AKSES
// ─────────────────────────────────────────────────────────────────────────────
exports.detailTugas = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    // 1. Ambil data utama lembur dan validasi hak akses pegawai yang login
    const [tugasRows] = await db.query(
      `
      SELECT 
        or2.*,
        pimpinan.name AS pimpinan_name
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
      WHERE or2.id = ? AND orm.employee_id = ?
    `,
      [id, employeeId]
    );

    // Proteksi akses: jika tugas tidak ditemukan atau pegawai bukan anggota dari tugas tersebut
    if (tugasRows.length === 0) {
      return res.status(403).render("error", { 
        message: "Forbidden: Anda tidak memiliki akses ke detail tugas ini.",
        error: { status: 403, stack: "" }
      });
    }

    const tugas = tugasRows[0];

    // 2. Ambil daftar anggota lengkap yang tergabung dalam penugasan lembur tersebut
    const [members] = await db.query(
      `
      SELECT 
        e.name AS employee_name,
        e.employee_number,
        orm.role,
        orm.job_desc,
        orm.planned_hours
      FROM overtime_request_members orm
      JOIN employees e ON orm.employee_id = e.id
      WHERE orm.overtime_request_id = ?
    `,
      [id]
    );

    res.render("pegawai/detail_tugas", {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas,
      members,
    });
  } catch (err) {
    console.error("detailTugas error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 3: BATALKAN PERMOHONAN MANDIRI (POST /pegawai/permohonan/:id/batal)
// ─────────────────────────────────────────────────────────────────────────────
exports.batalPermohonan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    await connection.beginTransaction();

    // Pastikan pengajuan milik pegawai ini dan masih 'pending'
    const [[tugas]] = await connection.query(
      "SELECT id, status FROM overtime_requests WHERE id = ? AND submitted_by = ? AND status = 'pending'",
      [id, employeeId]
    );

    if (!tugas) {
      await connection.rollback();
      return res.status(400).render("error", { message: "Permohonan tidak dapat dibatalkan (mungkin sudah diproses atau bukan milik Anda)." });
    }

    await connection.query("DELETE FROM overtime_request_members WHERE overtime_request_id = ?", [id]);
    await connection.query("DELETE FROM overtime_requests WHERE id = ?", [id]);

    await connection.commit();

    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/pegawai/tugas");
      return res.sendStatus(204);
    }
    res.redirect("/pegawai/tugas?toast=batal_berhasil");
  } catch (err) {
    await connection.rollback();
    console.error("batalPermohonan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MENAMPILKAN FORM LAPORAN (GET /pegawai/tugas/:id/lapor)
// ─────────────────────────────────────────────────────────────────────────────
exports.formLaporan = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    const [[tugas]] = await db.query(
      `SELECT or2.* FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       WHERE or2.id = ? AND orm.employee_id = ? AND or2.status IN ('assigned', 'pending')`,
      [id, employeeId]
    );

    if (!tugas) {
      return res.status(404).render("error", { message: "Tugas tidak ditemukan atau tidak valid untuk dilaporkan." });
    }

    res.render("pegawai/form_laporan", {
      title: "Isi Laporan Pelaksanaan",
      tugas,
      error: null
    });
  } catch (err) {
    console.error("formLaporan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 2: SUBMIT LAPORAN PELAKSANAAN (POST /pegawai/tugas/:id/lapor)
// ─────────────────────────────────────────────────────────────────────────────
exports.submitLaporan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;
    const { actual_start_time, actual_end_time, notes } = req.body;

    if (!actual_start_time || !actual_end_time || !notes) {
      const [[tugas]] = await db.query("SELECT * FROM overtime_requests WHERE id = ?", [id]);
      return res.render("pegawai/form_laporan", {
        title: "Isi Laporan Pelaksanaan",
        tugas,
        error: "Semua isian waktu dan hasil pekerjaan wajib diisi."
      });
    }

    await connection.beginTransaction();

    const [[tugas]] = await connection.query(
      `SELECT or2.id FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       WHERE or2.id = ? AND orm.employee_id = ? AND or2.status IN ('assigned', 'pending')`,
      [id, employeeId]
    );

    if (!tugas) {
      await connection.rollback();
      return res.status(400).render("error", { message: "Tugas tidak valid untuk dilaporkan." });
    }

    // Hitung actual_hours
    const start = new Date(actual_start_time);
    const end = new Date(actual_end_time);
    const diffMs = end - start;
    const actualHours = diffMs > 0 ? (diffMs / (1000 * 60 * 60)).toFixed(2) : 0;

    // 1. Update tabel pivot (data laporan diri pegawai)
    await connection.query(
      `UPDATE overtime_request_members 
       SET actual_start_time = ?, actual_end_time = ?, actual_hours = ?, notes = ?, updated_at = NOW()
       WHERE overtime_request_id = ? AND employee_id = ?`,
      [actual_start_time, actual_end_time, actualHours, notes, id, employeeId]
    );

    // 2. Update status overtime_request ke waiting_approval
    await connection.query(
      `UPDATE overtime_requests SET status = 'waiting_approval', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    await connection.commit();

    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/pegawai/riwayat");
      return res.sendStatus(204);
    }
    res.redirect("/pegawai/riwayat?toast=lapor_sukses");
  } catch (err) {
    await connection.rollback();
    console.error("submitLaporan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 4 & 8: RIWAYAT LEMBUR PEGAWAI (GET /pegawai/riwayat)
// ─────────────────────────────────────────────────────────────────────────────
exports.riwayatLembur = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { search } = req.query;

    let whereClause = `WHERE orm.employee_id = ? AND or2.status IN ('waiting_approval', 'approved', 'rejected')`;
    const params = [employeeId];

    if (search) {
      whereClause += ` AND (or2.title LIKE ? OR or2.request_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT 
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
      ${whereClause}
      ORDER BY or2.updated_at DESC
    `;

    const [riwayat] = await db.query(query, params);

    res.render("pegawai/riwayat", {
      title: "Riwayat & Status Lembur",
      riwayat,
      filters: { search: search || "" },
    });
  } catch (err) {
    console.error("riwayatLembur error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 1 & 3 & 4: LIST & SEARCH PENUGASAN LEMBUR (GET /pegawai/tugas)
// ─────────────────────────────────────────────────────────────────────────────
exports.listTugas = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    if (!employeeId) {
      return res.render("pegawai/tugas", {
        title: "Daftar Tugas Lembur",
        tugas: [],
        filters: { keyword: "" },
        error: "Profil pegawai Anda belum disiapkan di database. Silakan hubungi admin.",
      });
    }

    const keyword = req.query.keyword || "";
    let query = `
      SELECT 
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON or2.id = orm.overtime_request_id
      WHERE orm.employee_id = ?
    `;
    const params = [employeeId];

    if (keyword) {
      query += ` AND (or2.request_number LIKE ? OR or2.title LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY or2.request_date DESC, or2.id DESC`;

    const [tugas] = await db.query(query, params);

    res.render("pegawai/tugas", {
      title: "Daftar Tugas Lembur",
      tugas,
      filters: { keyword },
      error: null
    });
  } catch (err) {
    console.error("listTugas error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 5: EXPORT PDF (GET /pegawai/tugas/export/pdf)
// ─────────────────────────────────────────────────────────────────────────────
exports.exportPdf = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum disiapkan.");
    }

    const keyword = req.query.keyword || "";
    let query = `
      SELECT 
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON or2.id = orm.overtime_request_id
      WHERE orm.employee_id = ?
    `;
    const params = [employeeId];

    if (keyword) {
      query += ` AND (or2.request_number LIKE ? OR or2.title LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY or2.request_date DESC, or2.id DESC`;

    const [rows] = await db.query(query, params);

    const PDFDocument = require("pdfkit");
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="Daftar_Tugas_Lembur_${Date.now()}.pdf"`);
    doc.pipe(res);

    // Title
    doc.fontSize(18).font("Helvetica-Bold").text("DAFTAR PENUGASAN LEMBUR PEGAWAI", { align: "center" });
    doc.fontSize(10).font("Helvetica").text(`Tanggal Cetak: ${new Date().toLocaleString("id-ID")}`, { align: "center" });
    doc.moveDown(1.5);

    // Table Columns Setup
    const tableTop = 130;
    const colPositions = [50, 180, 350, 470];

    // Table Header Background
    doc.fillColor("#f3f4f6").rect(50, tableTop - 5, 500, 22).fill();
    
    // Table Header Text
    doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold");
    doc.text("No. Permintaan", colPositions[0], tableTop);
    doc.text("Judul Agenda", colPositions[1], tableTop);
    doc.text("Tanggal", colPositions[2], tableTop);
    doc.text("Status", colPositions[3], tableTop);

    // Header Line
    doc.moveTo(50, tableTop + 17).lineTo(550, tableTop + 17).strokeColor("#e5e7eb").stroke();

    let y = tableTop + 25;
    doc.font("Helvetica").fillColor("#374151");

    for (const row of rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
        // Header on new page
        doc.fillColor("#f3f4f6").rect(50, y - 5, 500, 22).fill();
        doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold");
        doc.text("No. Permintaan", colPositions[0], y);
        doc.text("Judul Agenda", colPositions[1], y);
        doc.text("Tanggal", colPositions[2], y);
        doc.text("Status", colPositions[3], y);
        doc.moveTo(50, y + 17).lineTo(550, y + 17).strokeColor("#e5e7eb").stroke();
        y += 25;
        doc.font("Helvetica").fillColor("#374151");
      }

      const formattedDate = new Date(row.request_date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      doc.text(row.request_number, colPositions[0], y);
      doc.text(row.title, colPositions[1], y, { width: 160 });
      doc.text(formattedDate, colPositions[2], y);
      doc.text(row.status.toUpperCase(), colPositions[3], y);

      // Row separator
      doc.moveTo(50, y + 18).lineTo(550, y + 18).strokeColor("#f3f4f6").stroke();
      y += 25;
    }

    doc.end();
  } catch (err) {
    console.error("exportPdf error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 6: EXPORT EXCEL (GET /pegawai/tugas/export/excel)
// ─────────────────────────────────────────────────────────────────────────────
exports.exportExcel = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum disiapkan.");
    }

    const keyword = req.query.keyword || "";
    let query = `
      SELECT 
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON or2.id = orm.overtime_request_id
      WHERE orm.employee_id = ?
    `;
    const params = [employeeId];

    if (keyword) {
      query += ` AND (or2.request_number LIKE ? OR or2.title LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY or2.request_date DESC, or2.id DESC`;

    const [rows] = await db.query(query, params);

    const excel = require("exceljs");
    const workbook = new excel.Workbook();
    const worksheet = workbook.addWorksheet("Tugas Lembur");

    // Columns setup
    worksheet.columns = [
      { header: "Nomor Permintaan", key: "request_number", width: 25 },
      { header: "Judul Agenda", key: "title", width: 40 },
      { header: "Tanggal", key: "request_date", width: 15 },
      { header: "Status", key: "status", width: 15 }
    ];

    // Styling headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "4F46E5" } // Indigo background
    };

    // Add rows
    for (const row of rows) {
      const formattedDate = new Date(row.request_date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      worksheet.addRow({
        request_number: row.request_number,
        title: row.title,
        request_date: formattedDate,
        status: row.status
      });
    }

    // Set Response Headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="Daftar_Tugas_Lembur_${Date.now()}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("exportExcel error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 7: REST API (GET /api/pegawai/tugas/search)
// ─────────────────────────────────────────────────────────────────────────────
exports.apiCariTugas = async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req);
    if (!employeeId) {
      return res.status(400).json({
        status: "error",
        message: "Profil pegawai belum disiapkan."
      });
    }

    const { keyword } = req.query;
    let query = `
      SELECT 
        or2.id,
        or2.request_number,
        or2.title,
        or2.status
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON or2.id = orm.overtime_request_id
      WHERE orm.employee_id = ?
    `;
    const params = [employeeId];

    if (keyword) {
      query += ` AND (or2.request_number LIKE ? OR or2.title LIKE ?)`;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += ` ORDER BY or2.request_date DESC, or2.id DESC`;

    const [rows] = await db.query(query, params);

    res.json({
      status: "success",
      keyword_dicari: keyword || "",
      total_data: rows.length,
      data: rows
    });
  } catch (err) {
    console.error("apiCariTugas error:", err);
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};

// GET /pegawai/api/riwayat
exports.apiRiwayatLembur = async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req);
>>>>>>> dev

    if (!employeeId) {
      return res.status(400).json({
        status: "error",
        message: "Profil pegawai belum terhubung dengan akun.",
      });
    }

    const [riwayat] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.created_at
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.submitted_by_id = ?
         OR orm.employee_id = ?
      ORDER BY or2.created_at DESC, or2.id DESC
      `,
      [employeeId, employeeId]
    );

    return res.status(200).json({
      status: "success",
      total_data: riwayat.length,
      data: riwayat,
    });
  } catch (err) {
    console.error("apiRiwayatLembur error:", err);

    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil data riwayat lembur.",
      detail: err.message,
    });
  }
};

// GET /pegawai/laporan/:id
exports.formLaporan = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const requestId = req.params.id;

<<<<<<< HEAD
    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
=======
    console.log("USER PDF:", req.user);
    console.log("SESSION USER:", req.user);

    const employeeId = await getEmployeeId(req);

    const [pegawai] = await db.query(
      "SELECT name FROM employees WHERE id = ?",
      [employeeId]
    );

    const namaPegawai =
      pegawai.length > 0
        ? pegawai[0].name
        : "Tidak Diketahui";

        if (!employeeId) {
          return res.status(400).send("Profil pegawai belum tersedia.");
>>>>>>> dev
    }

    const [data] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.status
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.id = ?
        AND (
          or2.submitted_by_id = ?
          OR orm.employee_id = ?
        )
      LIMIT 1
      `,
      [requestId, employeeId, employeeId]
    );

    if (data.length === 0) {
      return res.status(404).send("Data lembur tidak ditemukan.");
    }

    if (data[0].status !== "completed") {
      return res.redirect("/pegawai/riwayat");
    }

    res.render("pegawai/laporan", {
      title: "Laporan Pelaksanaan Lembur",
      lembur: data[0],
    });
  } catch (err) {
    console.error("formLaporan error:", err);
    res.status(500).send("Gagal membuka form laporan.");
  }
};

// POST /pegawai/laporan/:id
exports.simpanLaporan = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const requestId = req.params.id;

    const laporan =
      req.body.laporan ||
      req.body.hasil_pelaksanaan ||
      req.body.notes ||
      "";

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
    }

    if (!laporan.trim()) {
      return res.status(400).send("Laporan pelaksanaan tidak boleh kosong.");
    }

    const [cek] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.status
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.id = ?
        AND (
          or2.submitted_by_id = ?
          OR orm.employee_id = ?
        )
      LIMIT 1
      `,
      [requestId, employeeId, employeeId]
    );

    if (cek.length === 0) {
      return res.status(404).send("Data lembur tidak ditemukan.");
    }

    await db.query(
      `
      UPDATE overtime_request_members
      SET notes = ?,
          updated_at = NOW()
      WHERE overtime_request_id = ?
        AND employee_id = ?
      `,
      [laporan, requestId, employeeId]
    );

    await db.query(
      `
      UPDATE overtime_requests
      SET realization_notes = ?,
          status = 'waiting_approval',
          updated_at = NOW()
      WHERE id = ?
      `,
      [laporan, requestId]
    );

    res.redirect("/pegawai/riwayat");
  } catch (err) {
    console.error("simpanLaporan error:", err);
    res.status(500).send("Gagal menyimpan laporan.");
  }
};

// GET /pegawai/riwayat/:id/detail
exports.detailRiwayat = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);
    const requestId = req.params.id;

    const [data] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.realization_notes,
        orm.notes,
        orm.planned_hours,
        orm.actual_hours
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.id = ?
        AND (
          or2.submitted_by_id = ?
          OR orm.employee_id = ?
        )
      LIMIT 1
      `,
      [requestId, employeeId, employeeId]
    );

    if (data.length === 0) {
      return res.status(404).send("Data riwayat tidak ditemukan.");
    }

    res.render("pegawai/detail_riwayat", {
      title: "Detail Riwayat Lembur",
      lembur: data[0],
      formatStatus,
    });
  } catch (err) {
    console.error("detailRiwayat error:", err);
    res.status(500).send("Gagal membuka detail riwayat.");
  }
};

// GET /pegawai/riwayat/export/pdf
exports.exportPdfRiwayat = async (req, res) => {
  try {
    const employeeId = getEmployeeId(req);

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
    }

    const [pegawai] = await db.query(
      `
      SELECT 
        e.name,
        e.employee_number
      FROM employees e
      WHERE e.id = ?
      LIMIT 1
      `,
      [employeeId]
    );

    const namaPegawai =
      pegawai.length > 0 ? pegawai[0].name : "Tidak Diketahui";

    const nipPegawai =
      pegawai.length > 0 ? pegawai[0].employee_number : "-";

    const [riwayat] = await db.query(
      `
      SELECT DISTINCT
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at
      FROM overtime_requests or2
      LEFT JOIN overtime_request_members orm
        ON orm.overtime_request_id = or2.id
      WHERE or2.submitted_by_id = ?
         OR orm.employee_id = ?
      ORDER BY or2.created_at DESC, or2.id DESC
      `,
      [employeeId, employeeId]
    );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const filename = `riwayat-lembur-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    doc.pipe(res);

    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("LAPORAN RIWAYAT LEMBUR PEGAWAI", {
        align: "center",
      });

    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica");
    doc.text(`Nama Pegawai : ${namaPegawai}`);
    doc.text(`NIP          : ${nipPegawai}`);
    doc.text(
      `Tanggal Cetak : ${new Date().toLocaleDateString("id-ID")}`
    );

    doc.moveDown();

    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .stroke();

    let y = doc.y + 20;

    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("No", 45, y);
    doc.text("Nomor Request", 75, y);
    doc.text("Agenda Lembur", 210, y);
    doc.text("Status", 465, y);

    y += 15;

    doc
      .moveTo(40, y)
      .lineTo(555, y)
      .stroke();

    y += 10;

    doc.fontSize(9).font("Helvetica");

    if (riwayat.length === 0) {
      doc.text("Belum ada data riwayat lembur.", 45, y);
    } else {
      riwayat.forEach((item, index) => {
        if (y > 760) {
          doc.addPage();
          y = 50;
        }

        doc.text(String(index + 1), 45, y);

        doc.text(item.request_number || "-", 75, y, {
          width: 125,
        });

        doc.text(item.title || "-", 210, y, {
          width: 235,
        });

        doc.text(formatStatus(item.status), 465, y, {
          width: 85,
        });

        y += 28;
      });
    }

    doc.end();
  } catch (err) {
    console.error("exportPdfRiwayat error:", err);
    res.status(500).send("Gagal membuat PDF.");
  }
};
<<<<<<< HEAD

// Alias supaya aman kalau route pakai nama exportPdf
exports.exportPdf = exports.exportPdfRiwayat;
=======
>>>>>>> dev
