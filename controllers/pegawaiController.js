const db = require("../lib/db");

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
    
    const employeeId = req.user.employee_id;

    // Proteksi jika profile pegawai belum disiapkan
    if (!employeeId) {
      return res.render("pegawai/permohonan", {
        title: "Ajukan Permohonan Lembur Mandiri",
        error: "Profil pegawai Anda belum disiapkan di database. Silakan hubungi admin.",
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
       LIMIT 1`
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

    if (
      lastRequest.length > 0 &&
      lastRequest[0].request_number
    ) {
      const lastNum = parseInt(
        lastRequest[0].request_number.split("-").pop()
      );

      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    const requestNumber =
      `REQ-LEMBUR-${String(nextNumber).padStart(3, "0")}`;

    // 1. Simpan ke tabel induk 'overtime_requests'
    const [result] = await connection.query(
      `INSERT INTO overtime_requests (
        request_number, title, description, request_date, 
        planned_start_time, planned_end_time, submitted_by, status,
        submitted_by_id, approved_by_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, NOW(), NOW())`,
      [
        requestNumber,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        employeeId,
        employeeId,
        approvedById,
      ]
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
      ]
    );

    // Commit transaksi setelah semua operasi database sukses
    await connection.commit();

    // Penanganan respon asinkron HTMX
    if (req.headers["hx-request"]) {
      return res.send(`
        <div class="bg-emerald-500/15 text-emerald-500 text-sm p-4 rounded-md border border-emerald-500/20 text-center mb-6">
            Permohonan lembur "${title}" dengan nomor <strong>${requestNumber}</strong> berhasil diajukan dengan status pending.
        </div>
        <div class="flex justify-center">
          <a hx-get="/home" hx-target="body" hx-swap="outerHTML" class="btn btn-primary cursor-pointer">Kembali ke Dashboard</a>
        </div>
      `);
    }

    // Fallback jika disubmit secara tradisional
    res.redirect("/home?toast=permohonan_sukses");
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
        error: "Pengajuan gagal: Tidak ada data Pimpinan aktif yang terdaftar di sistem untuk memverifikasi permohonan Anda.",
        success: null,
      });
    }
    console.error("simpanPermohonan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

  exports.riwayatLembur = async (req, res) => {
    try {
      const employeeId = req.user.employee_id;

      const [riwayat] = await db.query(
        `
        SELECT
          request_number,
          title,
          request_date,
          status
        FROM overtime_requests
        WHERE submitted_by_id = ?
        ORDER BY created_at DESC
        `,
        [employeeId]
      );

      res.render("pegawai/riwayat", {
        title: "Riwayat Lembur",
        riwayat
      });

    } catch (err) {
      console.error(err);
      res.status(500).send("Terjadi kesalahan");
    }
  };

  // GET /pegawai/api/riwayat
exports.apiRiwayatLembur = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({
        status: "error",
        message: "Profil pegawai belum terhubung dengan akun."
      });
    }

    const [riwayat] = await db.query(
      `
      SELECT
        request_number,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        status,
        created_at
      FROM overtime_requests
      WHERE submitted_by_id = ?
      ORDER BY created_at DESC
      `,
      [employeeId]
    );

    return res.status(200).json({
      status: "success",
      total_data: riwayat.length,
      data: riwayat
    });
  } catch (err) {
    console.error("apiRiwayatLembur error:", err);

    return res.status(500).json({
      status: "error",
      message: "Terjadi kesalahan saat mengambil data riwayat lembur.",
      detail: err.message
    });
  }
};

const PDFDocument = require("pdfkit");

exports.exportPdfRiwayat = async (req, res) => {
  
  try {

    console.log("USER PDF:", req.user);
    console.log("SESSION USER:", req.user);

    const employeeId = req.user.employee_id;

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
      [employeeId]
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

    // Judul
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text("LAPORAN RIWAYAT LEMBUR PEGAWAI", {
        align: "center",
      });

    doc.moveDown(1.5);

    doc
      .fontSize(11)
      .font("Helvetica")
      .text(`Nama Pegawai : ${namaPegawai}`);

    doc.text(
      `Tanggal Cetak : ${new Date().toLocaleDateString("id-ID")}`
    );

    doc.moveDown();

    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    let y = doc.y + 20;

    // Header tabel
    doc.fontSize(10).font("Helvetica-Bold");

    doc.text("No", 50, y);
    doc.text("Nomor Request", 80, y);
    doc.text("Agenda Lembur", 220, y);
    doc.text("Status", 470, y);

    y += 15;

    doc.moveTo(50, y)
      .lineTo(550, y)
      .stroke();

    y += 10;

    doc.moveDown();

doc.fontSize(10).font("Helvetica");

riwayat.forEach((item, index) => {
  doc.text(String(index + 1), 50, y);

  doc.text(
    item.request_number || "-",
    80,
    y,
    {
      width: 120
    }
  );

  doc.text(
    item.title || "-",
    220,
    y,
    {
      width: 220
    }
  );

  doc.text(
    (item.status || "-").toUpperCase(),
    470,
    y,
    {
      width: 70
    }
  );

  y += 25;
});

    doc.end();

  } catch (err) {
    console.error("exportPdfRiwayat error:", err);

    res.status(500).send("Gagal membuat PDF");
  }
};