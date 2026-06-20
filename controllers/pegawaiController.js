const db = require("../lib/db");

// Helper lokal untuk mengambil employee_id dari database berdasarkan req.session.userId
async function getEmployeeId(req) {
  const userId = req.session.userId;
  if (!userId) return null;
  const [rows] = await db.query("SELECT id FROM employees WHERE id = ?", [
    userId,
  ]);
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
  let transactionStarted = false;
  try {
    const {
      title,
      description,
      request_date,
      planned_start_time,
      planned_end_time,
    } = req.body;

    const employeeId = await getEmployeeId(req);

    // Proteksi jika profile pegawai belum disiapkan
    if (!employeeId) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error:
          "Profil pegawai Anda belum disiapkan di database. Silakan hubungi admin.",
        success: null,
      });
    }

    // Validasi data input wajib
    if (!title || !request_date || !planned_start_time || !planned_end_time) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Semua kolom wajib harus diisi.",
        success: null,
      });
    }

    // Validasi tanggal/waktu
    const start = new Date(planned_start_time);
    const end = new Date(planned_end_time);
    if (end <= start) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Waktu selesai harus setelah waktu mulai lembur!",
        success: null,
      });
    }

    // Hitung planned_hours
    const diffMs = end - start;
    const plannedHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    // Mulai Transaksi Database
    await connection.beginTransaction();
    transactionStarted = true;

    // Cari pimpinan pertama dari database
    const [pimpinans] = await connection.query(
      `SELECT e.id FROM employees e
       JOIN model_has_roles mhr ON e.id = mhr.model_id
       JOIN roles r ON mhr.role_id = r.id
       WHERE r.name = 'pimpinan' AND mhr.model_type = 'User'
       LIMIT 1`,
    );

    // Aturan 5 & 6: Jangan menggunakan nilai fallback 0. Jika pimpinan tidak ditemukan, rollback dan gagalkan.
    if (pimpinans.length === 0) {
      throw new Error("PIMPINAN_NOT_FOUND");
    }

    const approvedById = pimpinans[0].id;

    // Generate nomor permohonan lembur unik
    const [lastRequest] = await db.query(`
      SELECT request_number
      FROM overtime_requests
      ORDER BY id DESC
      LIMIT 1
    `);

    let nextNumber = 1;

    if (lastRequest.length > 0 && lastRequest[0].request_number) {
      const lastNum = parseInt(lastRequest[0].request_number.split("-").pop());

      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    const requestNumber = `REQ-LEMBUR-${String(nextNumber).padStart(3, "0")}`;

    // 1. Simpan ke tabel induk 'overtime_requests'
    const [result] = await connection.query(
      `INSERT INTO overtime_requests (
        request_number, title, description, request_date, 
        planned_start_time, planned_end_time, submitted_by, status,
        submitted_by_id, approved_by, approved_by_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, NOW(), NOW())`,
      [
        requestNumber,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        employeeId, // submitted_by (int FK ke employees)
        employeeId, // submitted_by_id (int FK ke employees)
        approvedById, // approved_by (int FK ke employees — pimpinan)
        approvedById, // approved_by_id
      ],
    );

    const newRequestId = result.insertId;

    // 2. Simpan ke tabel pivot 'overtime_request_members'
    await connection.query(
      `INSERT INTO overtime_request_members (
        overtime_request_id, employee_id, planned_hours, actual_start_time, actual_end_time, actual_hours, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 0.00, NOW(), NOW())`,
      [
        newRequestId,
        employeeId,
        plannedHours,
        planned_start_time,
        planned_end_time,
      ],
    );

    // Commit transaksi setelah semua operasi database sukses
    await connection.commit();

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
    if (err.message === "PIMPINAN_NOT_FOUND") {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error:
          "Pengajuan gagal: Tidak ada data Pimpinan aktif yang terdaftar di sistem untuk memverifikasi permohonan Anda.",
        success: null,
      });
    }
    console.error("simpanPermohonan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

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
    console.log("DETAIL TUGAS ID:", req.params.id);
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
      [id, employeeId],
    );

    // Proteksi akses: jika tugas tidak ditemukan atau pegawai bukan anggota dari tugas tersebut
    if (tugasRows.length === 0) {
      return res.status(403).render("error", {
        message: "Forbidden: Anda tidak memiliki akses ke detail tugas ini.",
        error: { status: 403, stack: "" },
      });
    }

    const tugas = tugasRows[0];

    console.log("=== DATA TUGAS ===");
    console.log(tugas);

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
      [id],
    );

    console.log("=== DATA MEMBERS ===");
    console.log(members);

    res.render("pegawai/detail_tugas", {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas,
      members,
    });
  } catch (err) {
    console.error("DETAIL TUGAS ERROR:");
    console.error(err);
    console.error(err.stack);
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
      [id, employeeId],
    );

    if (!tugas) {
      await connection.rollback();
      return res.status(400).render("error", {
        message:
          "Permohonan tidak dapat dibatalkan (mungkin sudah diproses atau bukan milik Anda).",
      });
    }

    await connection.query(
      "DELETE FROM overtime_request_members WHERE overtime_request_id = ?",
      [id],
    );
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
      [id, employeeId],
    );

    if (!tugas) {
      return res.status(404).render("error", {
        message: "Tugas tidak ditemukan atau tidak valid untuk dilaporkan.",
      });
    }

    res.render("pegawai/form_laporan", {
      title: "Isi Laporan Pelaksanaan",
      tugas,
      error: null,
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
      const [[tugas]] = await db.query(
        "SELECT * FROM overtime_requests WHERE id = ?",
        [id],
      );
      return res.render("pegawai/form_laporan", {
        title: "Isi Laporan Pelaksanaan",
        tugas,
        error: "Semua isian waktu dan hasil pekerjaan wajib diisi.",
      });
    }

    await connection.beginTransaction();

    const [[tugas]] = await connection.query(
      `SELECT or2.id FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       WHERE or2.id = ? AND orm.employee_id = ? AND or2.status IN ('assigned', 'pending')`,
      [id, employeeId],
    );

    if (!tugas) {
      await connection.rollback();
      return res
        .status(400)
        .render("error", { message: "Tugas tidak valid untuk dilaporkan." });
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
      [actual_start_time, actual_end_time, actualHours, notes, id, employeeId],
    );

    // 2. Update status overtime_request ke waiting_approval
    await connection.query(
      `UPDATE overtime_requests SET status = 'waiting_approval', updated_at = NOW() WHERE id = ?`,
      [id],
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
        error:
          "Profil pegawai Anda belum disiapkan di database. Silakan hubungi admin.",
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
      error: null,
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

    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Daftar_Tugas_Lembur_${Date.now()}.pdf"`,
    });

    doc.pipe(res);

    // Title
    doc
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("DAFTAR PENUGASAN LEMBUR PEGAWAI", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Tanggal Cetak: ${new Date().toLocaleString("id-ID")}`, {
        align: "center",
      });
    doc.moveDown(1.5);

    // Table Columns Setup
    const tableTop = 130;
    const colPositions = [60, 300];

    // Table Header Background
    doc
      .fillColor("#f3f4f6")
      .rect(50, tableTop - 5, 520, 22)
      .fill();

    // Table Header Text
    doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold");
    doc.text("Nomor Permintaan", colPositions[0], tableTop);
    doc.text("Agenda Lembur", colPositions[1], tableTop);

    // Header Line
    doc
      .moveTo(50, tableTop + 17)
      .lineTo(550, tableTop + 17)
      .strokeColor("#e5e7eb")
      .stroke();

    let y = tableTop + 25;
    doc.font("Helvetica").fillColor("#374151");

    for (const row of rows) {
      if (y > 700) {
        doc.addPage();
        y = 50;
        // Header on new page
        doc
          .fillColor("#f3f4f6")
          .rect(50, y - 5, 500, 22)
          .fill();
        doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold");
        doc.text("No. Permintaan", colPositions[0], y);
        doc.text("Judul Agenda", colPositions[1], y);
        doc.text("Tanggal", colPositions[2], y);
        doc.text("Status", colPositions[3], y);
        doc
          .moveTo(50, y + 17)
          .lineTo(550, y + 17)
          .strokeColor("#e5e7eb")
          .stroke();
        y += 25;
        doc.font("Helvetica").fillColor("#374151");
      }

      const formattedDate = new Date(row.request_date).toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      );

      doc.text(row.request_number, colPositions[0], y, {
        width: 220,
      });

      doc.text(row.title, colPositions[1], y, {
        width: 220,
      });

      // Row separator
      doc
        .moveTo(50, y + 18)
        .lineTo(550, y + 18)
        .strokeColor("#f3f4f6")
        .stroke();
      y += 25;
    }

    doc.end();
  } catch (err) {
    console.error("exportPdf error:", err);
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
        message: "Profil pegawai belum disiapkan.",
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
      data: rows,
    });
  } catch (err) {
    console.error("apiCariTugas error:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// GET /pegawai/api/riwayat
exports.apiRiwayatLembur = async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req);

    if (!employeeId) {
      return res.status(400).json({
        status: "error",
        message: "Profil pegawai belum terhubung dengan akun.",
      });
    }

    const [riwayat] = await db.query(
      `
      SELECT
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.created_at
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      WHERE orm.employee_id = ? AND or2.status IN ('waiting_approval', 'approved', 'rejected')
      ORDER BY or2.updated_at DESC
      `,
      [employeeId],
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

const PDFDocument = require("pdfkit");

exports.exportPdfRiwayat = async (req, res) => {
  try {
    console.log("USER PDF:", req.user);
    console.log("SESSION USER:", req.user);

    const employeeId = await getEmployeeId(req);

    const [pegawai] = await db.query(
      "SELECT name FROM employees WHERE id = ?",
      [employeeId],
    );

    const namaPegawai =
      pegawai.length > 0 ? pegawai[0].name : "Tidak Diketahui";

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
    }

    const [riwayat] = await db.query(
      `
      SELECT
        request_number,
        title,
        request_date,
        status,
        created_at
      FROM overtime_requests
      WHERE submitted_by_id = ?
      ORDER BY created_at DESC
      `,
      [employeeId],
    );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const filename = `riwayat-lembur-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Judul
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("LAPORAN RIWAYAT LEMBUR PEGAWAI", {
        align: "center",
      });

    doc.moveDown(1.5);

    doc.fontSize(11).font("Helvetica").text(`Nama Pegawai : ${namaPegawai}`);

    doc.text(`Tanggal Cetak : ${new Date().toLocaleDateString("id-ID")}`);

    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

    let y = doc.y + 20;

    // Header tabel
    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("No", 50, y);
    doc.text("Nomor Request", 80, y);
    doc.text("Agenda Lembur", 220, y);
    doc.text("Status", 470, y);

    y += 15;

    doc.moveTo(50, y).lineTo(550, y).stroke();

    y += 10;

    doc.moveDown();

    doc.fontSize(10).font("Helvetica");

    riwayat.forEach((item, index) => {
      doc.text(String(index + 1), 50, y);

      doc.text(item.request_number || "-", 80, y, {
        width: 120,
      });

      doc.text(item.title || "-", 220, y, {
        width: 220,
      });

      doc.text((item.status || "-").toUpperCase(), 470, y, {
        width: 70,
      });

      y += 25;
    });

    doc.end();
  } catch (err) {
    console.error("exportPdfRiwayat error:", err);

    res.status(500).send("Gagal membuat PDF");
  }
};
