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
      `
      INSERT INTO overtime_requests (
        request_number,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
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

    res.redirect("/pegawai/riwayat");
  } catch (err) {
    try {
      await connection.rollback();
    } catch (rollbackErr) {
      console.error("rollback simpanPermohonan error:", rollbackErr);
    }

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

    if (!employeeId) {
      return res.status(400).send("Profil pegawai belum tersedia.");
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

// Alias supaya aman kalau route pakai nama exportPdf
exports.exportPdf = exports.exportPdfRiwayat;