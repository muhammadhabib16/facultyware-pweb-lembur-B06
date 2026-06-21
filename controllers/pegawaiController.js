const db = require("../lib/db");
const PDFDocument = require("pdfkit");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────────────────────────────────────

async function getEmployeeId(req) {
  const userId = req.session.userId;
  if (!userId) return null;

  const [rows] = await db.query(
    "SELECT id FROM employees WHERE id = ?",
    [userId]
  );

  return rows.length > 0 ? rows[0].id : null;
}

function toMySQLDateTime(value) {
  if (!value) return null;
  return String(value).replace("T", " ");
}

function calculateHours(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
  if (end <= start) return 0;

  return Number(((end - start) / (1000 * 60 * 60)).toFixed(2));
}

function formatStatus(status) {
  const labels = {
    assigned: "Assigned",
    pending: "Pending",
    waiting_approval: "Waiting Approval",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    completed: "Completed",
    draft: "Draft",
  };

  return labels[status] || status || "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(value) {
  if (!value) return "-";

  if (typeof value === "string") {
    if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
      return value.slice(0, 5);
    }

    if (/^\d{2}:\d{2}$/.test(value)) {
      return value;
    }
  }

  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sanitizeFileName(text) {
  return String(text || "detail-penugasan")
    .replace(/[^a-z0-9_\-]/gi, "_")
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 1: FORM PERMOHONAN LEMBUR MANDIRI
// GET /pegawai/permohonan
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 1: SIMPAN PERMOHONAN LEMBUR MANDIRI
// POST /pegawai/permohonan
// ─────────────────────────────────────────────────────────────────────────────

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

    const start = new Date(planned_start_time);
    const end = new Date(planned_end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Waktu selesai harus setelah waktu mulai lembur.",
        success: null,
      });
    }

    const plannedHours = calculateHours(planned_start_time, planned_end_time);
    const requestNumber = `REQ-LEMBUR-${Date.now()}`;

    await connection.beginTransaction();
    transactionStarted = true;

    const [pimpinans] = await connection.query(
      `
      SELECT e.id
      FROM employees e
      JOIN model_has_roles mhr ON e.id = mhr.model_id
      JOIN roles r ON r.id = mhr.role_id
      WHERE r.name = 'pimpinan'
        AND mhr.model_type = 'User'
      LIMIT 1
      `
    );

    if (pimpinans.length === 0) {
      throw new Error("PIMPINAN_NOT_FOUND");
    }

    const approvedById = pimpinans[0].id;

    const [result] = await connection.query(
      `
      INSERT INTO overtime_requests (
        request_number,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        submitted_by,
        submitted_by_id,
        approved_by,
        approved_by_id,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      `,
      [
        requestNumber,
        title,
        description || null,
        request_date,
        toMySQLDateTime(planned_start_time),
        toMySQLDateTime(planned_end_time),
        employeeId,
        employeeId,
        approvedById,
        approvedById,
      ]
    );

    const overtimeRequestId = result.insertId;

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
        overtimeRequestId,
        employeeId,
        "Pemohon",
        description || "Pengajuan lembur mandiri",
        plannedHours,
      ]
    );

    await connection.commit();

    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/pegawai/tugas");
      return res.sendStatus(204);
    }

    res.redirect("/pegawai/tugas");
  } catch (err) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Rollback error:", rollbackErr);
      }
    }

    if (err.message === "PIMPINAN_NOT_FOUND") {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error:
          "Pengajuan gagal: Tidak ada data Pimpinan aktif yang terdaftar di sistem.",
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
// FITUR 5 & 7: DAFTAR TUGAS AKTIF DAN SEARCH
// GET /pegawai/tugas
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
        or2.status,
        or2.created_at,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON pimpinan.id = COALESCE(or2.approved_by_id, or2.approved_by, or2.submitted_by)
      WHERE orm.employee_id = ?
        AND or2.status IN ('assigned', 'pending')
    `;

    const params = [employeeId];

    if (keyword) {
      query += `
        AND (
          or2.request_number LIKE ?
          OR or2.title LIKE ?
        )
      `;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += `
      ORDER BY or2.request_date DESC, or2.id DESC
    `;

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

// Alias lama supaya kalau route masih pakai listTugasAktif tetap aman
exports.listTugasAktif = exports.listTugas;

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 6: DETAIL TUGAS LEMBUR
// GET /pegawai/tugas/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.detailTugas = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    const [tugasRows] = await db.query(
      `
      SELECT
        or2.*,
        pemberi.name AS pimpinan_name,
        pemberi.name AS pemberi_tugas_name,
        orm.planned_hours,
        orm.actual_start_time,
        orm.actual_end_time,
        orm.actual_hours,
        orm.notes
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pemberi ON pemberi.id = COALESCE(or2.approved_by_id, or2.approved_by, or2.submitted_by)
      WHERE or2.id = ?
        AND orm.employee_id = ?
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (tugasRows.length === 0) {
      return res.status(403).render("error", {
        message: "Forbidden: Anda tidak memiliki akses ke detail tugas ini.",
        error: { status: 403, stack: "" },
      });
    }

    const tugas = tugasRows[0];

    const [members] = await db.query(
      `
      SELECT
        e.name AS employee_name,
        e.employee_number,
        orm.role,
        orm.job_desc,
        orm.planned_hours,
        orm.actual_start_time,
        orm.actual_end_time,
        orm.actual_hours,
        orm.notes
      FROM overtime_request_members orm
      JOIN employees e ON e.id = orm.employee_id
      WHERE orm.overtime_request_id = ?
      ORDER BY e.name ASC
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
// FITUR 3: BATALKAN PERMOHONAN MANDIRI
// POST /pegawai/permohonan/:id/batal
// ─────────────────────────────────────────────────────────────────────────────

exports.batalPermohonan = async (req, res, next) => {
  const connection = await db.getConnection();

  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    await connection.beginTransaction();

    const [[permohonan]] = await connection.query(
      `
      SELECT id, status, request_number
      FROM overtime_requests
      WHERE id = ?
        AND submitted_by = ?
        AND status = 'pending'
        AND request_number LIKE 'REQ-LEMBUR-%'
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (!permohonan) {
      await connection.rollback();

      return res.status(400).render("error", {
        message:
          "Permohonan tidak dapat dibatalkan. Kemungkinan sudah diproses atau bukan milik Anda.",
        error: { status: 400, stack: "" },
      });
    }

    await connection.query(
      `
      UPDATE overtime_requests
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/pegawai/riwayat");
      return res.sendStatus(204);
    }

    res.redirect("/pegawai/riwayat?toast=batal_berhasil");
  } catch (err) {
    await connection.rollback();
    console.error("batalPermohonan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 2: FORM LAPORAN PELAKSANAAN
// GET /pegawai/tugas/:id/lapor
// ─────────────────────────────────────────────────────────────────────────────

exports.formLaporan = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    const [[tugas]] = await db.query(
      `
      SELECT or2.*
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      WHERE or2.id = ?
        AND orm.employee_id = ?
        AND or2.status IN ('assigned', 'pending')
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (!tugas) {
      return res.status(404).render("error", {
        message: "Tugas tidak ditemukan atau tidak valid untuk dilaporkan.",
        error: { status: 404, stack: "" },
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
// FITUR 2: SUBMIT LAPORAN PELAKSANAAN
// POST /pegawai/tugas/:id/lapor
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
        [id]
      );

      return res.render("pegawai/form_laporan", {
        title: "Isi Laporan Pelaksanaan",
        tugas,
        error: "Semua isian waktu dan hasil pekerjaan wajib diisi.",
      });
    }

    const start = new Date(actual_start_time);
    const end = new Date(actual_end_time);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      const [[tugas]] = await db.query(
        "SELECT * FROM overtime_requests WHERE id = ?",
        [id]
      );

      return res.render("pegawai/form_laporan", {
        title: "Isi Laporan Pelaksanaan",
        tugas,
        error: "Waktu selesai aktual harus setelah waktu mulai aktual.",
      });
    }

    const actualHours = calculateHours(actual_start_time, actual_end_time);

    await connection.beginTransaction();

    const [[tugas]] = await connection.query(
      `
      SELECT or2.id
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      WHERE or2.id = ?
        AND orm.employee_id = ?
        AND or2.status IN ('assigned', 'pending')
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (!tugas) {
      await connection.rollback();

      return res.status(400).render("error", {
        message: "Tugas tidak valid untuk dilaporkan.",
        error: { status: 400, stack: "" },
      });
    }

    await connection.query(
      `
      UPDATE overtime_request_members
      SET actual_start_time = ?,
          actual_end_time = ?,
          actual_hours = ?,
          notes = ?,
          updated_at = NOW()
      WHERE overtime_request_id = ?
        AND employee_id = ?
      `,
      [
        toMySQLDateTime(actual_start_time),
        toMySQLDateTime(actual_end_time),
        actualHours,
        notes.trim(),
        id,
        employeeId,
      ]
    );

    await connection.query(
      `
      UPDATE overtime_requests
      SET status = 'waiting_approval',
          updated_at = NOW()
      WHERE id = ?
      `,
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
// FITUR 4 & 8: RIWAYAT DAN STATUS LEMBUR PEGAWAI
// GET /pegawai/riwayat
// ─────────────────────────────────────────────────────────────────────────────

exports.riwayatLembur = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const keyword = req.query.keyword || req.query.search || "";

    let query = `
      SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at,
        or2.updated_at,
        CASE
          WHEN or2.request_number LIKE 'REQ-ASSIGN-%' THEN 'Penugasan Pimpinan'
          WHEN or2.request_number LIKE 'REQ-LEMBUR-%' THEN 'Pengajuan Mandiri'
          ELSE 'Lembur'
        END AS jenis_lembur,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON pimpinan.id = COALESCE(or2.approved_by_id, or2.approved_by, or2.submitted_by)
      WHERE orm.employee_id = ?
        AND or2.status IN ('waiting_approval', 'approved', 'rejected', 'cancelled')
    `;

    const params = [employeeId];

    if (keyword) {
      query += `
        AND (
          or2.request_number LIKE ?
          OR or2.title LIKE ?
        )
      `;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += `
      ORDER BY or2.updated_at DESC, or2.id DESC
    `;

    const [riwayat] = await db.query(query, params);

    res.render("pegawai/riwayat", {
      title: "Riwayat & Status Lembur",
      riwayat,
      filters: { keyword, search: keyword },
    });
  } catch (err) {
    console.error("riwayatLembur error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LEGACY EXPORT LIST PDF
// GET /pegawai/tugas/export/pdf
// Catatan: tombol export daftar boleh dihapus dari UI, tapi function ini tetap aman.
// ─────────────────────────────────────────────────────────────────────────────

exports.exportDetailPdf = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    if (!employeeId) {
      return res.status(403).render("error", {
        message: "Profil pegawai tidak ditemukan.",
        error: { status: 403, stack: "" },
      });
    }

    const [[tugas]] = await db.query(
      `
      SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,

        e.name AS employee_name,
        e.employee_number,
        ou.name AS unit_name,

        pemberi.name AS pemberi_tugas_name,

        orm.role,
        orm.job_desc,
        orm.planned_hours,
        orm.actual_start_time,
        orm.actual_end_time,
        orm.actual_hours,
        orm.notes
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      JOIN employees e ON e.id = orm.employee_id
      LEFT JOIN organization_units ou ON ou.id = e.organization_unit_id
      LEFT JOIN employees pemberi 
        ON pemberi.id = COALESCE(or2.approved_by_id, or2.approved_by, or2.submitted_by)
      WHERE or2.id = ?
        AND orm.employee_id = ?
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (!tugas) {
      return res.status(404).render("error", {
        message: "Data penugasan tidak ditemukan.",
        error: { status: 404, stack: "" },
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 60,
        bottom: 60,
        left: 70,
        right: 60,
      },
    });

    const filename = `Detail_Penugasan_${sanitizeFileName(
      tugas.request_number
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const contentWidth = pageWidth - left - right;

    const labelWidth = 145;
    const colonWidth = 12;
    const valueX = left + labelWidth + colonWidth;
    const valueWidth = contentWidth - labelWidth - colonWidth;

    const ensureSpace = (height = 40) => {
      if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    };

    const writeHeader = () => {
      doc
        .font("Helvetica-Bold")
        .fontSize(16)
        .fillColor("black")
        .text("DETAIL PENUGASAN LEMBUR PEGAWAI", left, doc.y, {
          width: contentWidth,
          align: "center",
        });

      doc.moveDown(0.4);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(`Tanggal Cetak: ${formatDateTime(new Date())}`, left, doc.y, {
          width: contentWidth,
          align: "center",
        });

      doc.moveDown(1.5);

      doc
        .moveTo(left, doc.y)
        .lineTo(left + contentWidth, doc.y)
        .strokeColor("#d1d5db")
        .lineWidth(1)
        .stroke();

      doc.moveDown(1);
    };

    const writeSectionTitle = (title) => {
      ensureSpace(45);

      doc.moveDown(0.4);

      const y = doc.y;

      doc
        .roundedRect(left, y, contentWidth, 24, 3)
        .fillColor("#f3f4f6")
        .fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("black")
        .text(title, left + 10, y + 7, {
          width: contentWidth - 20,
        });

      doc.y = y + 34;
    };

    const writeRow = (label, value) => {
      ensureSpace(28);

      const textValue = value === null || value === undefined || value === ""
        ? "-"
        : String(value);

      const y = doc.y;

      const valueHeight = doc.heightOfString(textValue, {
        width: valueWidth,
      });

      const rowHeight = Math.max(valueHeight, 14);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(label, left, y, {
          width: labelWidth,
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(":", left + labelWidth, y, {
          width: colonWidth,
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(textValue, valueX, y, {
          width: valueWidth,
          align: "left",
        });

      doc.y = y + rowHeight + 8;
    };

    const writeParagraphBlock = (title, text) => {
      ensureSpace(70);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(title, left, doc.y, {
          width: contentWidth,
        });

      doc.moveDown(0.3);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(text || "-", left, doc.y, {
          width: contentWidth,
          align: "justify",
          lineGap: 2,
        });

      doc.moveDown(0.8);
    };

    writeHeader();

    writeSectionTitle("Data Pegawai");
    writeRow("Nama Pegawai", tugas.employee_name);
    writeRow("NIP", tugas.employee_number);
    writeRow("Unit/Divisi", tugas.unit_name);

    writeSectionTitle("Data Penugasan Lembur");
    writeRow("Nomor Penugasan", tugas.request_number);
    writeRow("Agenda Lembur", tugas.title);
    writeRow("Pemberi Tugas", tugas.pemberi_tugas_name);
    writeRow("Tanggal Lembur", formatDate(tugas.request_date));
    writeRow(
      "Waktu Rencana",
      `${formatTime(tugas.planned_start_time)} - ${formatTime(
        tugas.planned_end_time
      )}`
    );
    writeRow(
      "Durasi Rencana",
      `${Number(tugas.planned_hours || 0).toFixed(2)} jam`
    );
    writeRow("Status", formatStatus(tugas.status));

    writeParagraphBlock("Deskripsi Tugas", tugas.description);

    ensureSpace(70);

    doc.moveDown(1.5);

    doc
      .moveTo(left, doc.y)
      .lineTo(left + contentWidth, doc.y)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();

    doc.moveDown(0.6);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text(
        "Dokumen ini dicetak melalui sistem Facultyware sebagai arsip penugasan lembur pegawai.",
        left,
        doc.y,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc.end();
  } catch (err) {
    console.error("exportDetailPdf error:", err);
    next(err);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DETAIL PDF
// GET /pegawai/tugas/:id/export/pdf
// ─────────────────────────────────────────────────────────────────────────────

exports.exportDetailPdf = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    if (!employeeId) {
      return res.status(403).render("error", {
        message: "Profil pegawai tidak ditemukan.",
        error: { status: 403, stack: "" },
      });
    }

    const [[tugas]] = await db.query(
      `
      SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.description,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,

        e.name AS employee_name,
        e.employee_number,
        ou.name AS unit_name,

        pemberi.name AS pemberi_tugas_name,

        orm.role,
        orm.job_desc,
        orm.planned_hours,
        orm.actual_start_time,
        orm.actual_end_time,
        orm.actual_hours,
        orm.notes
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      JOIN employees e ON e.id = orm.employee_id
      LEFT JOIN organization_units ou ON ou.id = e.organization_unit_id
      LEFT JOIN employees pemberi 
        ON pemberi.id = COALESCE(or2.approved_by_id, or2.approved_by, or2.submitted_by)
      WHERE or2.id = ?
        AND orm.employee_id = ?
      LIMIT 1
      `,
      [id, employeeId]
    );

    if (!tugas) {
      return res.status(404).render("error", {
        message: "Data penugasan tidak ditemukan.",
        error: { status: 404, stack: "" },
      });
    }

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 60,
        bottom: 60,
        left: 70,
        right: 60,
      },
    });

    const filename = `Detail_Penugasan_${sanitizeFileName(
      tugas.request_number
    )}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    const left = doc.page.margins.left;
    const right = doc.page.margins.right;
    const contentWidth = doc.page.width - left - right;

    const labelWidth = 150;
    const colonWidth = 12;
    const colonX = left + labelWidth;
    const valueX = colonX + colonWidth;
    const valueWidth = contentWidth - labelWidth - colonWidth;

    const ensureSpace = (height = 40) => {
      if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        doc.x = left;
      }
    };

    const writeSectionTitle = (title) => {
      ensureSpace(45);

      doc.moveDown(0.4);

      const y = doc.y;

      doc
        .roundedRect(left, y, contentWidth, 24, 3)
        .fillColor("#f3f4f6")
        .fill();

      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("black")
        .text(title, left + 10, y + 7, {
          width: contentWidth - 20,
          align: "left",
        });

      doc.y = y + 34;
      doc.x = left;
    };

    const writeRow = (label, value) => {
      ensureSpace(30);

      const textValue =
        value === null || value === undefined || value === ""
          ? "-"
          : String(value);

      const y = doc.y;

      doc.font("Helvetica").fontSize(10);
      const valueHeight = doc.heightOfString(textValue, {
        width: valueWidth,
      });

      const rowHeight = Math.max(valueHeight, 14);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(label, left, y, {
          width: labelWidth,
          align: "left",
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(":", colonX, y, {
          width: colonWidth,
          align: "left",
        });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(textValue, valueX, y, {
          width: valueWidth,
          align: "left",
          lineGap: 2,
        });

      doc.y = y + rowHeight + 8;
      doc.x = left;
    };

    const writeParagraphBlock = (title, text) => {
      ensureSpace(75);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor("black")
        .text(title, left, doc.y, {
          width: contentWidth,
          align: "left",
        });

      doc.moveDown(0.35);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("black")
        .text(text || "-", left, doc.y, {
          width: contentWidth,
          align: "justify",
          lineGap: 2,
        });

      doc.moveDown(0.9);
      doc.x = left;
    };

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor("black")
      .text("DETAIL PENUGASAN LEMBUR PEGAWAI", left, doc.y, {
        width: contentWidth,
        align: "center",
      });

    doc.moveDown(0.4);

    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("black")
      .text(`Tanggal Cetak: ${formatDateTime(new Date())}`, left, doc.y, {
        width: contentWidth,
        align: "center",
      });

    doc.moveDown(1.5);

    doc
      .moveTo(left, doc.y)
      .lineTo(left + contentWidth, doc.y)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);

    writeSectionTitle("Data Pegawai");
    writeRow("Nama Pegawai", tugas.employee_name);
    writeRow("NIP", tugas.employee_number);
    writeRow("Unit/Divisi", tugas.unit_name);

    writeSectionTitle("Data Penugasan Lembur");
    writeRow("Nomor Penugasan", tugas.request_number);
    writeRow("Agenda Lembur", tugas.title);
    writeRow("Pemberi Tugas", tugas.pemberi_tugas_name);
    writeRow("Tanggal Lembur", formatDate(tugas.request_date));
    writeRow(
      "Waktu Rencana",
      `${formatTime(tugas.planned_start_time)} - ${formatTime(
        tugas.planned_end_time
      )}`
    );
    writeRow(
      "Durasi Rencana",
      `${Number(tugas.planned_hours || 0).toFixed(2)} jam`
    );
    writeRow("Status", formatStatus(tugas.status));

    writeParagraphBlock("Deskripsi Tugas", tugas.description);

    ensureSpace(70);

    doc.moveDown(1);

    doc
      .moveTo(left, doc.y)
      .lineTo(left + contentWidth, doc.y)
      .strokeColor("#d1d5db")
      .lineWidth(1)
      .stroke();

    doc.moveDown(0.6);

    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor("#6b7280")
      .text(
        "Dokumen ini dicetak melalui sistem Facultyware sebagai arsip penugasan lembur pegawai.",
        left,
        doc.y,
        {
          width: contentWidth,
          align: "center",
        }
      );

    doc.end();
  } catch (err) {
    console.error("exportDetailPdf error:", err);
    next(err);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// FITUR 7: REST API SEARCH TUGAS
// GET /api/pegawai/tugas/search
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

    const keyword = req.query.keyword || "";

    let query = `
      SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.status
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      WHERE orm.employee_id = ?
        AND or2.status IN ('assigned', 'pending')
    `;

    const params = [employeeId];

    if (keyword) {
      query += `
        AND (
          or2.request_number LIKE ?
          OR or2.title LIKE ?
        )
      `;
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    query += `
      ORDER BY or2.request_date DESC, or2.id DESC
    `;

    const [rows] = await db.query(query, params);

    res.json({
      status: "success",
      keyword_dicari: keyword,
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