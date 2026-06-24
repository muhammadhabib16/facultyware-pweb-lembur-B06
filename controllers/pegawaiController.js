const db = require("../lib/db");
const PDFDocument = require("pdfkit");

// Helper ambil employee_id dari user/session
const getEmployeeId = async (req) => {
  const userId = req.session?.userId;
  if (!userId) return null;
  // Cari berdasarkan user_id (relasi langsung users → employees)
  const [rows] = await db.query("SELECT id FROM employees WHERE user_id = ?", [
    userId,
  ]);
  if (rows.length > 0) return rows[0].id;
  // Fallback: cari berdasarkan nama (untuk data lama yang belum punya user_id)
  if (req.session?.name) {
    const [byName] = await db.query("SELECT id FROM employees WHERE name = ? LIMIT 1", [req.session.name]);
    if (byName.length > 0) return byName[0].id;
  }
  return null;
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

// =====================================================
// PERMOHONAN LEMBUR MANDIRI
// =====================================================

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

    // Jangan menggunakan nilai fallback 0. Jika pimpinan tidak ditemukan, rollback dan gagalkan.
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

// Batal permohonan
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

// =====================================================
// DAFTAR TUGAS LEMBUR
// =====================================================

// GET /pegawai/tugas
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
    // Query mengambil tugas dari dua sumber:
    // 1. Penugasan dari pimpinan (request_number LIKE 'REQ-ASSIGN-%')
    //    → diidentifikasi via overtime_request_members.employee_id = employeeId
    // 2. Permohonan mandiri pegawai (request_number LIKE 'REQ-LEMBUR-%')
    //    → diidentifikasi via overtime_requests.submitted_by = employeeId
    let query = `
      SELECT DISTINCT
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

// GET /pegawai/tugas (alternative/duplicate)
exports.listTugasAktif = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { search } = req.query;

    let whereClause = `WHERE orm.employee_id = ? AND or2.status IN('assigned', 'pending')`;
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

// Detail tugas lembur
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

// GET /pegawai/tugas/:id/export/pdf
exports.exportDetailPdf = async (req, res, next) => {
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
      [id, employeeId],
    );

    if (tugasRows.length === 0) {
      return res.status(403).render("error", {
        message: "Forbidden: Anda tidak memiliki akses ke detail tugas ini.",
      });
    }

    const tugas = tugasRows[0];

    // 2. Ambil data members/anggota tim pelaksana tugas
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
      JOIN employees e ON orm.employee_id = e.id
      WHERE orm.overtime_request_id = ?
      `,
      [id],
    );

    // 3. Generate PDF
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filename = `Detail_Penugasan_Lembur_${tugas.request_number}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header Instansi ──
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("DETAIL PENUGASAN LEMBUR PEGAWAI", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#475569")
      .text("FACULTYWARE — SISTEM INFORMASI KEPEGAWAIAN", { align: "center" });
    doc.moveDown(0.4);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(`Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, { align: "center" });
    doc.moveDown(0.8);

    // Garis pembatas kop surat formal (double line)
    doc
      .lineWidth(1.5)
      .strokeColor("#0f172a")
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(0.12);
    doc
      .lineWidth(0.5)
      .strokeColor("#94a3b8")
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(1.2);

    // ── Info Penugasan ──
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text("I. Informasi Penugasan");
    doc.moveDown(0.5);

    const formatStatusValue = (status) => {
      const map = {
        assigned: "Assigned — Belum Dilaporkan",
        waiting_approval: "Menunggu Persetujuan",
        approved: "Disetujui",
        rejected: "Ditolak / Perlu Revisi",
        pending: "Pending",
      };
      return map[status] || status;
    };

    const infoItems = [
      ["No. Referensi", tugas.request_number],
      ["Judul Agenda", tugas.title || "-"],
      ["Tanggal Pelaksanaan", new Date(tugas.request_date).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })],
      ["Rencana Jam Kerja", `${new Date(tugas.planned_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${new Date(tugas.planned_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`],
      ["Instruksi / Deskripsi", tugas.description || "Tidak ada deskripsi/instruksi"],
      ["Diterbitkan Oleh", tugas.pimpinan_name || "-"],
      ["Status Penugasan", formatStatusValue(tugas.status)],
    ];

    let infoY = doc.y;
    infoItems.forEach(([label, value]) => {
      const valueHeight = doc.heightOfString(value, { width: 340 });
      const rowHeight = Math.max(14, valueHeight) + 6;

      if (infoY + rowHeight > doc.page.height - 60) {
        doc.addPage();
        infoY = doc.y;
      }

      // Draw label
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(label, 45, infoY, { width: 120 });
      // Draw colon
      doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(":", 165, infoY);
      // Draw value
      doc.font("Helvetica").fontSize(9).fillColor("#1e293b").text(value, 175, infoY, { width: 340 });

      infoY += rowHeight;
    });

    doc.y = infoY;

    // ── Detail Realisasi Kerja Pegawai (jika sudah mengisi laporan) ──
    const loggedInMember = members.find(m => m.employee_number === req.session.nip || m.employee_name === req.session.name);
    if (loggedInMember && (tugas.status === 'waiting_approval' || tugas.status === 'approved' || tugas.status === 'rejected')) {
      doc.moveDown(1.5);
      doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text("II. Laporan Realisasi Anda");
      doc.moveDown(0.5);

      let startStr = "-";
      let endStr = "-";
      if (loggedInMember.actual_start_time) {
        startStr = new Date(loggedInMember.actual_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      }
      if (loggedInMember.actual_end_time) {
        endStr = new Date(loggedInMember.actual_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      }

      const realisasiItems = [
        ["Waktu Mulai Aktual", startStr],
        ["Waktu Selesai Aktual", endStr],
        ["Total Jam Kerja Aktual", `${loggedInMember.actual_hours || "0"} Jam`],
        ["Catatan Hasil Kerja", loggedInMember.notes || "-"],
      ];

      let realisasiY = doc.y;
      realisasiItems.forEach(([label, value]) => {
        const valueHeight = doc.heightOfString(value, { width: 340 });
        const rowHeight = Math.max(14, valueHeight) + 6;

        if (realisasiY + rowHeight > doc.page.height - 60) {
          doc.addPage();
          realisasiY = doc.y;
        }

        // Draw label
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(label, 45, realisasiY, { width: 120 });
        // Draw colon
        doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(":", 165, realisasiY);
        // Draw value
        doc.font("Helvetica").fontSize(9).fillColor("#1e293b").text(value, 175, realisasiY, { width: 340 });

        realisasiY += rowHeight;
      });

      doc.y = realisasiY;
    }

    doc.moveDown(1.5);

    // ── Daftar Anggota Tim ──
    const sectionNum = (loggedInMember && (tugas.status === 'waiting_approval' || tugas.status === 'approved' || tugas.status === 'rejected')) ? "III" : "II";
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text(`${sectionNum}. Anggota Tim Pelaksana`);
    doc.moveDown(0.5);

    if (members.length === 0) {
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text("-");
    } else {
      const colWidths = [25, 195, 165, 130];
      const headers = ["No", "Nama Pegawai", "NIP / Nomor Pegawai", "Rencana Jam"];

      // Hitung tinggi maksimum baris header
      doc.font("Helvetica-Bold").fontSize(9);
      let maxHeaderHeight = 0;
      headers.forEach((header, i) => {
        const h = doc.heightOfString(header, { width: colWidths[i] - 4 });
        if (h > maxHeaderHeight) maxHeaderHeight = h;
      });
      const headerRowHeight = maxHeaderHeight + 12;

      let yPos = doc.y;

      // Draw background header tabel (slate-800)
      doc.fillColor("#1e293b").rect(40, yPos, 515, headerRowHeight).fill();

      // Write text header tabel
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      let xPos = 40;
      headers.forEach((header, i) => {
        const textHeight = doc.heightOfString(header, { width: colWidths[i] - 4 });
        const yOffset = (headerRowHeight - textHeight) / 2;
        doc.text(header, xPos + 2, yPos + yOffset, { width: colWidths[i] - 4, align: "left" });
        xPos += colWidths[i];
      });

      yPos += headerRowHeight;
      doc.fillColor("#000000"); // Reset

      // Render Baris Data
      members.forEach((member, index) => {
        const rowData = [
          String(index + 1),
          member.employee_name,
          member.employee_number || "-",
          `${member.planned_hours || "0"} Jam`,
        ];

        // Hitung tinggi maksimum baris ini
        doc.font("Helvetica").fontSize(8);
        let maxRowHeight = 0;
        rowData.forEach((cell, i) => {
          const h = doc.heightOfString(cell, { width: colWidths[i] - 4 });
          if (h > maxRowHeight) maxRowHeight = h;
        });
        const rowHeight = maxRowHeight + 12;

        // Auto page break
        if (yPos + rowHeight > doc.page.height - 60) {
          doc.addPage();
          yPos = doc.y;
        }

        // Zebra striping
        if (index % 2 === 1) {
          doc.fillColor("#f8fafc").rect(40, yPos, 515, rowHeight).fill();
        }

        // Garis batas bawah baris
        doc
          .lineWidth(0.5)
          .strokeColor("#cbd5e1")
          .moveTo(40, yPos + rowHeight)
          .lineTo(doc.page.width - 40, yPos + rowHeight)
          .stroke();

        // Tulis teks data baris
        doc.fillColor("#334155").font("Helvetica").fontSize(8);
        xPos = 40;
        rowData.forEach((cell, i) => {
          const textHeight = doc.heightOfString(cell, { width: colWidths[i] - 4 });
          const yOffset = (rowHeight - textHeight) / 2;
          doc.text(cell, xPos + 2, yPos + yOffset, { width: colWidths[i] - 4, align: "left" });
          xPos += colWidths[i];
        });

        yPos += rowHeight;
      });

      doc.y = yPos;
    }

    doc.end();
  } catch (err) {
    console.error("exportDetailPdf error:", err);
    res.status(500).send("Gagal membuat PDF.");
  }
};

// Export PDF daftar tugas
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
        doc
          .moveTo(50, y + 17)
          .lineTo(550, y + 17)
          .strokeColor("#e5e7eb")
          .stroke();
        y += 25;
        doc.font("Helvetica").fillColor("#374151");
      }

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

// Export Excel daftar tugas
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
    rows.forEach((row) => {
      worksheet.addRow({
        request_number: row.request_number,
        title: row.title,
        request_date: new Date(row.request_date).toLocaleDateString("id-ID"),
        status: formatStatus(row.status)
      });
    });

    res.writeHead(200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Daftar_Tugas_Lembur_${Date.now()}.xlsx"`
    });

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("exportExcel error:", err);
    next(err);
  }
};

// =====================================================
// LAPORAN LEMBUR
// =====================================================

// GET /pegawai/tugas/:id/lapor
exports.formLaporan = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { id } = req.params;

    const [[tugas]] = await db.query(
      `SELECT or2.* FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       WHERE or2.id = ? AND orm.employee_id = ? AND or2.status IN('assigned', 'rejected')`,
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

// POST /pegawai/tugas/:id/lapor
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
       WHERE or2.id = ? AND orm.employee_id = ? AND or2.status IN('assigned', 'rejected')`,
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
       WHERE overtime_request_id = ? AND employee_id = ? `,
      [actual_start_time, actual_end_time, actualHours, notes, id, employeeId],
    );

    // 2. Update status overtime_request ke waiting_approval dan simpan waktu kirim (submitted_at)
    await connection.query(
      `UPDATE overtime_requests SET status = 'waiting_approval', submitted_at = NOW(), updated_at = NOW() WHERE id = ? `,
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

// =====================================================
// RIWAYAT LEMBUR
// =====================================================

// GET /pegawai/riwayat
exports.riwayatLembur = async (req, res, next) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { search } = req.query;

    let whereClause = `WHERE orm.employee_id = ? AND or2.status IN('waiting_approval', 'approved', 'rejected')`;
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

// REST API Riwayat Lembur (GET /pegawai/api/riwayat)
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
      [employeeId]
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

// GET /api/pegawai/tugas/search
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

// GET /pegawai/riwayat/export/pdf
exports.exportPdfRiwayat = async (req, res) => {
  try {
    const employeeId = await getEmployeeId(req);
    const { search } = req.query;

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

    const namaPegawai = pegawai.length > 0 ? pegawai[0].name : "Tidak Diketahui";
    const nipPegawai = pegawai.length > 0 ? pegawai[0].employee_number : "-";

    let whereClause = `WHERE orm.employee_id = ? AND or2.status IN ('waiting_approval', 'approved', 'rejected')`;
    const params = [employeeId];

    if (search) {
      whereClause += ` AND (or2.title LIKE ? OR or2.request_number LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    const [riwayat] = await db.query(
      `
      SELECT DISTINCT
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      ${whereClause}
      ORDER BY or2.created_at DESC, or2.id DESC
      `,
      params
    );

    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
    });

    const filename = `riwayat-lembur-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    doc.pipe(res);

    // ── Header Instansi ──
    doc
      .fontSize(14)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text("LAPORAN RIWAYAT LEMBUR PEGAWAI", { align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor("#475569")
      .text("FACULTYWARE — SISTEM INFORMASI KEPEGAWAIAN", { align: "center" });
    doc.moveDown(0.4);
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#64748b")
      .text(`Dicetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, { align: "center" });
    doc.moveDown(0.8);

    // Garis pembatas kop surat formal (double line)
    doc
      .lineWidth(1.5)
      .strokeColor("#0f172a")
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(0.12);
    doc
      .lineWidth(0.5)
      .strokeColor("#94a3b8")
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(1.2);

    // ── Profil Pegawai ──
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text("I. Profil Pegawai");
    doc.moveDown(0.5);

    const profileItems = [
      ["Nama Pegawai", namaPegawai],
      ["NIP / Nomor Pegawai", nipPegawai],
      ["Tanggal Cetak", new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })]
    ];

    let infoY = doc.y;
    profileItems.forEach(([label, value]) => {
      const valueHeight = doc.heightOfString(value, { width: 340 });
      const rowHeight = Math.max(14, valueHeight) + 6;

      // Draw label
      doc.font("Helvetica-Bold").fontSize(9).fillColor("#475569").text(label, 45, infoY, { width: 120 });
      // Draw colon
      doc.font("Helvetica").fontSize(9).fillColor("#64748b").text(":", 165, infoY);
      // Draw value
      doc.font("Helvetica").fontSize(9).fillColor("#1e293b").text(value, 175, infoY, { width: 340 });

      infoY += rowHeight;
    });

    doc.y = infoY;
    doc.moveDown(1.5);

    // ── Tabel Riwayat Lembur ──
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#0f172a").text("II. Riwayat Pengajuan Lembur");
    doc.moveDown(0.5);

    if (riwayat.length === 0) {
      doc.fontSize(9).font("Helvetica").fillColor("#64748b").text("Belum ada data riwayat lembur.", 40);
    } else {
      const colWidths = [25, 140, 240, 110];
      const headers = ["No", "Nomor Request", "Agenda Lembur", "Status"];

      // Hitung tinggi maksimum baris header
      doc.font("Helvetica-Bold").fontSize(9);
      let maxHeaderHeight = 0;
      headers.forEach((header, i) => {
        const h = doc.heightOfString(header, { width: colWidths[i] - 4 });
        if (h > maxHeaderHeight) maxHeaderHeight = h;
      });
      const headerRowHeight = maxHeaderHeight + 12; // 6pt padding atas & bawah

      let yPos = doc.y;

      // Draw background header tabel (slate-800)
      doc.fillColor("#1e293b").rect(40, yPos, 515, headerRowHeight).fill();

      // Write text header tabel
      doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9);
      let xPos = 40;
      headers.forEach((header, i) => {
        const textHeight = doc.heightOfString(header, { width: colWidths[i] - 4 });
        const yOffset = (headerRowHeight - textHeight) / 2;
        doc.text(header, xPos + 2, yPos + yOffset, { width: colWidths[i] - 4, align: "left" });
        xPos += colWidths[i];
      });

      yPos += headerRowHeight;
      doc.fillColor("#000000"); // Reset

      // Render Baris Data
      riwayat.forEach((item, index) => {
        const rowData = [
          String(index + 1),
          item.request_number || "-",
          item.title || "-",
          formatStatus(item.status)
        ];

        // Hitung tinggi maksimum baris ini
        doc.font("Helvetica").fontSize(8);
        let maxRowHeight = 0;
        rowData.forEach((cell, i) => {
          const h = doc.heightOfString(cell, { width: colWidths[i] - 4 });
          if (h > maxRowHeight) maxRowHeight = h;
        });
        const rowHeight = maxRowHeight + 12; // 6pt padding atas & bawah

        // Auto page break
        if (yPos + rowHeight > doc.page.height - 60) {
          doc.addPage();
          yPos = doc.y;
        }

        // Zebra striping
        if (index % 2 === 1) {
          doc.fillColor("#f8fafc").rect(40, yPos, 515, rowHeight).fill();
        }

        // Garis batas bawah baris
        doc
          .lineWidth(0.5)
          .strokeColor("#cbd5e1")
          .moveTo(40, yPos + rowHeight)
          .lineTo(doc.page.width - 40, yPos + rowHeight)
          .stroke();

        // Tulis teks data baris
        doc.fillColor("#334155").font("Helvetica").fontSize(8);
        xPos = 40;
        rowData.forEach((cell, i) => {
          const textHeight = doc.heightOfString(cell, { width: colWidths[i] - 4 });
          const yOffset = (rowHeight - textHeight) / 2;
          doc.text(cell, xPos + 2, yPos + yOffset, { width: colWidths[i] - 4, align: "left" });
          xPos += colWidths[i];
        });

        yPos += rowHeight;
      });

      doc.y = yPos;
    }

    doc.end();
  } catch (err) {
    console.error("exportPdfRiwayat error:", err);
    res.status(500).send("Gagal membuat PDF.");
  }
};
