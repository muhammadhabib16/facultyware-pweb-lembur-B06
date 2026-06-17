const db = require("../lib/db");
const PDFDocument = require("pdfkit");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  HeadingLevel,
} = require("docx");

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 13: Pimpinan dapat melihat list laporan lembur
// GET /pimpinan/laporan
// ─────────────────────────────────────────────────────────────────────────────
exports.listLaporan = async (req, res) => {
  try {
    const { status, search, page = 1 } = req.query;
    const limit = 10;
    const offset = (page - 1) * limit;

    // Hanya tampilkan overtime_requests yang sudah 'waiting_approval' (laporan sudah diisi)
    let whereClause = `WHERE or2.status IN ('waiting_approval', 'approved', 'rejected')`;
    const params = [];

    if (status && ["waiting_approval", "approved", "rejected"].includes(status)) {
      whereClause += ` AND or2.status = ?`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (or2.title LIKE ? OR or2.request_number LIKE ? OR submitter.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const query = `
      SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.submitted_at,
        or2.approved_at,
        submitter.name   AS submitted_by_name,
        ou.name          AS unit_name,
        approver.name    AS approved_by_name,
        COUNT(orm.id)    AS total_anggota
      FROM overtime_requests or2
      LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
      LEFT JOIN organization_units ou ON ou.id = submitter.organization_unit_id
      LEFT JOIN employees approver ON approver.id = or2.approved_by
      LEFT JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      ${whereClause}
      GROUP BY or2.id
      ORDER BY or2.submitted_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(DISTINCT or2.id) AS total
      FROM overtime_requests or2
      LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
      ${whereClause}
    `;

    const [rows] = await db.query(query, [...params, limit, offset]);
    const [[{ total }]] = await db.query(countQuery, params);

    const totalPages = Math.ceil(total / limit);

    res.render("pimpinan/laporan", {
      title: "List Laporan Lembur",
      laporan: rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit,
      },
      filters: { status, search },
    });
  } catch (err) {
    console.error("listLaporan error:", err);
    res
      .status(500)
      .render("error", { message: "Gagal memuat daftar laporan lembur." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 14: Pimpinan dapat melihat detail laporan lembur
// GET /pimpinan/laporan/:id
// ─────────────────────────────────────────────────────────────────────────────
exports.detailLaporan = async (req, res) => {
  try {
    const { id } = req.params;

    // Data utama overtime request
    const [[laporan]] = await db.query(
      `SELECT
        or2.*,
        submitter.name        AS submitted_by_name,
        submitter.employee_number AS submitted_by_nip,
        ou.name               AS unit_name,
        approver.name         AS approved_by_name
       FROM overtime_requests or2
       LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
       LEFT JOIN organization_units ou ON ou.id = submitter.organization_unit_id
       LEFT JOIN employees approver ON approver.id = or2.approved_by
       WHERE or2.id = ?
         AND or2.status IN ('waiting_approval', 'approved', 'rejected')`,
      [id],
    );

    if (!laporan) {
      return res
        .status(404)
        .render("error", { message: "Laporan tidak ditemukan." });
    }

    // Daftar anggota lembur beserta data aktual
    const [anggota] = await db.query(
      `SELECT
        orm.*,
        e.name            AS employee_name,
        e.employee_number AS employee_nip,
        ou.name           AS unit_name
       FROM overtime_request_members orm
       JOIN employees e ON e.id = orm.employee_id
       LEFT JOIN organization_units ou ON ou.id = e.organization_unit_id
       WHERE orm.overtime_request_id = ?
       ORDER BY e.name ASC`,
      [id],
    );

    // Riwayat approval log
    const [approvalLogs] = await db.query(
      `SELECT
        oal.*,
        e.name AS approver_name
       FROM overtime_approval_logs oal
       JOIN employees e ON e.id = oal.approver_id
       WHERE oal.overtime_request_id = ?
       ORDER BY oal.action_date DESC`,
      [id],
    );

    res.render("pimpinan/detail_laporan", {
      title: `Detail Laporan Lembur — ${laporan.request_number}`,
      laporan,
      anggota,
      approvalLogs,
    });
  } catch (err) {
    console.error("detailLaporan error:", err);
    res
      .status(500)
      .render("error", { message: "Gagal memuat detail laporan lembur." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 15: Pimpinan dapat mengkonfirmasi laporan lembur pegawai
// POST /pimpinan/laporan/:id/konfirmasi
// ─────────────────────────────────────────────────────────────────────────────
exports.konfirmasiLaporan = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    // req.user diisi oleh middleware auth (employee id pimpinan yang login)
    const approverId = req.user.employee_id;

    await connection.beginTransaction();

    // Validasi: laporan harus dalam status 'waiting_approval' agar bisa dikonfirmasi
    const [[laporan]] = await connection.query(
      `SELECT id, status, submitted_by FROM overtime_requests WHERE id = ? AND status = 'waiting_approval'`,
      [id],
    );

    if (!laporan) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Laporan tidak ditemukan atau statusnya bukan "waiting_approval".',
      });
    }

    // Update status overtime_request menjadi 'approved'
    await connection.query(
      `UPDATE overtime_requests
       SET status = 'approved', approved_by = ?, approved_by_id = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [approverId, approverId, id],
    );

    // Catat ke overtime_approval_logs
    await connection.query(
      `INSERT INTO overtime_approval_logs
         (overtime_request_id, approver_id, employee_id, status, notes, action_date, created_at, updated_at)
       VALUES (?, ?, ?, 'approved', NULL, NOW(), NOW(), NOW())`,
      [id, approverId, laporan.submitted_by],
    );

    await connection.commit();

    // Kalau request HTMX, redirect dengan HX-Redirect header
    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", `/pimpinan/laporan/${id}`);
      return res.sendStatus(204);
    }
    res.redirect(`/pimpinan/laporan/${id}?toast=konfirmasi_berhasil`);
  } catch (err) {
    await connection.rollback();
    console.error("konfirmasiLaporan error:", err);
    res
      .status(500)
      .json({ success: false, message: "Gagal mengkonfirmasi laporan." });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 16: Pimpinan dapat menolak laporan lembur dengan catatan revisi
// POST /pimpinan/laporan/:id/tolak
// ─────────────────────────────────────────────────────────────────────────────
exports.tolakLaporan = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { catatan_revisi } = req.body;
    const approverId = req.user.employee_id;

    if (!catatan_revisi || catatan_revisi.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Catatan revisi wajib diisi saat menolak laporan.",
      });
    }

    await connection.beginTransaction();

    // Validasi status
    const [[laporan]] = await connection.query(
      `SELECT id, status, submitted_by FROM overtime_requests WHERE id = ? AND status = 'waiting_approval'`,
      [id],
    );

    if (!laporan) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Laporan tidak ditemukan atau statusnya bukan "waiting_approval".',
      });
    }

    // Update status menjadi 'rejected'
    await connection.query(
      `UPDATE overtime_requests
       SET status = 'rejected', approved_by = ?, approved_by_id = ?, approved_at = NOW(), updated_at = NOW()
       WHERE id = ?`,
      [approverId, approverId, id],
    );

    // Catat ke overtime_approval_logs dengan catatan revisi
    await connection.query(
      `INSERT INTO overtime_approval_logs
         (overtime_request_id, approver_id, employee_id, status, notes, action_date, created_at, updated_at)
       VALUES (?, ?, ?, 'rejected', ?, NOW(), NOW(), NOW())`,
      [id, approverId, laporan.submitted_by, catatan_revisi.trim()],
    );

    await connection.commit();

    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", `/pimpinan/laporan/${id}`);
      return res.sendStatus(204);
    }
    res.redirect(`/pimpinan/laporan/${id}?toast=tolak_berhasil`);
  } catch (err) {
    await connection.rollback();
    console.error("tolakLaporan error:", err);
    res.status(500).json({ success: false, message: "Gagal menolak laporan." });
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR BARU: REST API Statistik Laporan Lembur
// GET /api/pimpinan/laporan/statistik
// ─────────────────────────────────────────────────────────────────────────────
exports.apiStatistikLaporan = async (req, res) => {
  try {
    const pimpinanId = req.user.employee_id;

    const [rows] = await db.query(
      `SELECT
        status,
        COUNT(*) AS total
       FROM overtime_requests
       WHERE status IN ('waiting_approval', 'approved', 'rejected')
         AND request_number NOT LIKE 'REQ-ASSIGN-%'
       GROUP BY status`,
    );

    // Bangun objek statistik dari hasil query
    const statistik = {
      waiting_approval: 0,
      approved: 0,
      rejected: 0,
    };

    rows.forEach((row) => {
      if (statistik.hasOwnProperty(row.status)) {
        statistik[row.status] = row.total;
      }
    });

    res.json({
      status: "success",
      statistik,
    });
  } catch (err) {
    console.error("apiStatistikLaporan error:", err);
    res.status(500).json({ status: "error", message: "Gagal mengambil statistik laporan." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR BARU: Ekspor Rekap Semua Laporan (Approved) ke PDF
// GET /pimpinan/laporan/ekspor/pdf?bulan=YYYY-MM
// ─────────────────────────────────────────────────────────────────────────────
exports.eksporPDF = async (req, res) => {
  try {
    const { bulan } = req.query;

    let whereClause = `WHERE or2.status = 'approved'`;
    const params = [];

    if (bulan) {
      // Filter berdasarkan bulan (YYYY-MM)
      whereClause += ` AND DATE_FORMAT(or2.request_date, '%Y-%m') = ?`;
      params.push(bulan);
    }

    const [laporan] = await db.query(
      `SELECT
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.planned_start_time,
        or2.planned_end_time,
        or2.status,
        or2.description,
        submitter.name AS submitted_by_name,
        submitter.employee_number AS submitted_by_nip,
        ou.name AS unit_name,
        approver.name AS approved_by_name,
        or2.approved_at
       FROM overtime_requests or2
       LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
       LEFT JOIN organization_units ou ON ou.id = submitter.organization_unit_id
       LEFT JOIN employees approver ON approver.id = or2.approved_by
       ${whereClause}
       ORDER BY or2.request_date DESC`,
      params,
    );

    // Setup PDF document
    const doc = new PDFDocument({ margin: 40, size: "A4" });

    const periodeLabel = bulan
      ? new Date(bulan + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      : "Semua Periode";
    const tanggalCetak = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const filename = `Rekap_Laporan_Lembur_${bulan || "Semua"}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header Dokumen ──
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Facultyware — Sistem Informasi Kepegawaian", { align: "center" });
    doc.fontSize(12).text("Rekap Laporan Lembur (Approved)", { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Periode: ${periodeLabel}  |  Dicetak: ${tanggalCetak}`, { align: "center" });
    doc.moveDown(0.5);

    // Garis horizontal
    doc
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(0.5);

    if (laporan.length === 0) {
      doc.fontSize(11).font("Helvetica").text("Tidak ada data laporan lembur untuk periode ini.", {
        align: "center",
      });
    } else {
      // ── Tabel Rekap ──
      const tableTop = doc.y;
      const colWidths = [30, 95, 120, 80, 80, 110];
      const headers = ["No", "No. Permohonan", "Judul", "Pegawai", "Tgl Lembur", "Disetujui Oleh"];

      // Header row
      doc.fontSize(8).font("Helvetica-Bold");
      let xPos = 40;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, tableTop, { width: colWidths[i] - 4, align: "left" });
        xPos += colWidths[i];
      });

      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();
      doc.moveDown(0.3);

      // Data rows
      doc.font("Helvetica").fontSize(7);
      laporan.forEach((item, index) => {
        const y = doc.y;

        // Auto page break
        if (y > doc.page.height - 60) {
          doc.addPage();
        }

        const rowY = doc.y;
        xPos = 40;
        const tglLembur = new Date(item.request_date).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        const rowData = [
          String(index + 1),
          item.request_number,
          item.title || "-",
          item.submitted_by_name || "-",
          tglLembur,
          item.approved_by_name || "-",
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, xPos + 2, rowY, { width: colWidths[i] - 4, align: "left" });
          xPos += colWidths[i];
        });

        doc.moveDown(0.6);
      });

      // Footer total
      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();
      doc.moveDown(0.3);
      doc.fontSize(9).font("Helvetica-Bold").text(`Total Laporan: ${laporan.length}`, 40);
    }

    doc.end();
  } catch (err) {
    console.error("eksporPDF error:", err);
    res.status(500).render("error", { message: "Gagal mengekspor rekap laporan ke PDF." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR BARU: Ekspor Detail 1 Laporan Lembur ke PDF
// GET /pimpinan/laporan/:id/ekspor/pdf
// ─────────────────────────────────────────────────────────────────────────────
exports.eksporDetailPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Ambil data laporan utama
    const [[laporan]] = await db.query(
      `SELECT
        or2.*,
        submitter.name        AS submitted_by_name,
        submitter.employee_number AS submitted_by_nip,
        ou.name               AS unit_name,
        approver.name         AS approved_by_name
       FROM overtime_requests or2
       LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
       LEFT JOIN organization_units ou ON ou.id = submitter.organization_unit_id
       LEFT JOIN employees approver ON approver.id = or2.approved_by
       WHERE or2.id = ?`,
      [id],
    );

    if (!laporan) {
      return res.status(404).render("error", { message: "Laporan tidak ditemukan." });
    }

    // Ambil anggota lembur
    const [anggota] = await db.query(
      `SELECT
        orm.*,
        e.name            AS employee_name,
        e.employee_number AS employee_nip,
        ou.name           AS unit_name
       FROM overtime_request_members orm
       JOIN employees e ON e.id = orm.employee_id
       LEFT JOIN organization_units ou ON ou.id = e.organization_unit_id
       WHERE orm.overtime_request_id = ?
       ORDER BY e.name ASC`,
      [id],
    );

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const tanggalCetak = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    const filename = `Laporan_Lembur_${laporan.request_number}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);

    // ── Header Instansi ──
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .text("Facultyware — Sistem Informasi Kepegawaian", { align: "center" });
    doc.fontSize(12).text("Laporan Pelaksanaan Lembur", { align: "center" });
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica").text(`Dicetak: ${tanggalCetak}`, { align: "center" });
    doc.moveDown(0.5);
    doc
      .moveTo(40, doc.y)
      .lineTo(doc.page.width - 40, doc.y)
      .stroke();
    doc.moveDown(0.8);

    // ── Info Laporan ──
    doc.fontSize(10).font("Helvetica-Bold").text("Informasi Laporan");
    doc.moveDown(0.3);
    doc.fontSize(9).font("Helvetica");

    const infoItems = [
      ["No. Permohonan", laporan.request_number],
      ["Judul/Agenda", laporan.title || "-"],
      ["Tanggal Lembur", new Date(laporan.request_date).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })],
      ["Diajukan Oleh", `${laporan.submitted_by_name || "-"} (NIP: ${laporan.submitted_by_nip || "-"})`],
      ["Unit/Divisi", laporan.unit_name || "-"],
      ["Rencana Jam Kerja", `${new Date(laporan.planned_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${new Date(laporan.planned_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`],
      ["Deskripsi", laporan.description || "Tidak ada deskripsi"],
      ["Status", laporan.status === "approved" ? "Disetujui" : laporan.status === "rejected" ? "Ditolak" : "Menunggu Persetujuan"],
      ["Disetujui Oleh", laporan.approved_by_name || "-"],
    ];

    infoItems.forEach(([label, value]) => {
      doc.font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value);
    });

    doc.moveDown(0.8);

    // ── Tabel Anggota & Aktivitas ──
    doc.fontSize(10).font("Helvetica-Bold").text("Rincian Anggota & Realisasi Lembur");
    doc.moveDown(0.3);

    if (anggota.length === 0) {
      doc.fontSize(9).font("Helvetica").text("Tidak ada data anggota lembur.");
    } else {
      const colWidths = [25, 130, 80, 130, 150];
      const headers = ["No", "Nama / NIP", "Jam Realisasi", "Unit", "Keterangan"];

      // Header row
      doc.fontSize(8).font("Helvetica-Bold");
      let xPos = 40;
      const headerY = doc.y;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 2, headerY, { width: colWidths[i] - 4, align: "left" });
        xPos += colWidths[i];
      });

      doc.moveDown(0.5);
      doc
        .moveTo(40, doc.y)
        .lineTo(doc.page.width - 40, doc.y)
        .stroke();
      doc.moveDown(0.3);

      // Data rows
      doc.font("Helvetica").fontSize(7);
      anggota.forEach((member, index) => {
        if (doc.y > doc.page.height - 60) doc.addPage();

        const rowY = doc.y;
        xPos = 40;

        let jamRealisasi = "Belum diisi";
        if (member.actual_start_time && member.actual_end_time) {
          const mulai = new Date(member.actual_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const selesai = new Date(member.actual_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          jamRealisasi = `${mulai} - ${selesai}`;
        }

        const rowData = [
          String(index + 1),
          `${member.employee_name}\n(NIP: ${member.employee_nip || "-"})`,
          jamRealisasi,
          member.unit_name || "-",
          member.notes || "-",
        ];

        rowData.forEach((cell, i) => {
          doc.text(cell, xPos + 2, rowY, { width: colWidths[i] - 4, align: "left" });
          xPos += colWidths[i];
        });

        doc.moveDown(0.8);
      });
    }

    // ── Footer Tanda Tangan ──
    doc.moveDown(1.5);
    if (laporan.approved_by_name) {
      doc.fontSize(9).font("Helvetica").text("Menyetujui,", doc.page.width - 200, doc.y, { width: 160, align: "center" });
      doc.moveDown(2.5);
      doc.font("Helvetica-Bold").text(laporan.approved_by_name, doc.page.width - 200, doc.y, { width: 160, align: "center" });
      doc.font("Helvetica").fontSize(8).text("Pimpinan / Atasan", doc.page.width - 200, doc.y, { width: 160, align: "center" });
    }

    doc.end();
  } catch (err) {
    console.error("eksporDetailPDF error:", err);
    res.status(500).render("error", { message: "Gagal mengekspor laporan ke PDF." });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR BARU: Ekspor Detail 1 Laporan Lembur ke DOCX
// GET /pimpinan/laporan/:id/ekspor/docx
// ─────────────────────────────────────────────────────────────────────────────
exports.eksporDetailDOCX = async (req, res) => {
  try {
    const { id } = req.params;

    const [[laporan]] = await db.query(
      `SELECT
        or2.*,
        submitter.name        AS submitted_by_name,
        submitter.employee_number AS submitted_by_nip,
        ou.name               AS unit_name,
        approver.name         AS approved_by_name
       FROM overtime_requests or2
       LEFT JOIN employees submitter ON submitter.id = or2.submitted_by
       LEFT JOIN organization_units ou ON ou.id = submitter.organization_unit_id
       LEFT JOIN employees approver ON approver.id = or2.approved_by
       WHERE or2.id = ?`,
      [id],
    );

    if (!laporan) {
      return res.status(404).render("error", { message: "Laporan tidak ditemukan." });
    }

    const [anggota] = await db.query(
      `SELECT
        orm.*,
        e.name            AS employee_name,
        e.employee_number AS employee_nip,
        ou.name           AS unit_name
       FROM overtime_request_members orm
       JOIN employees e ON e.id = orm.employee_id
       LEFT JOIN organization_units ou ON ou.id = e.organization_unit_id
       WHERE orm.overtime_request_id = ?
       ORDER BY e.name ASC`,
      [id],
    );

    const tanggalCetak = new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const statusLabel =
      laporan.status === "approved"
        ? "Disetujui"
        : laporan.status === "rejected"
          ? "Ditolak"
          : "Menunggu Persetujuan";

    // Konfigurasi border untuk tabel
    const tableBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "999999" },
    };

    // ── Build DOCX ──
    const docSections = [];

    // Header
    docSections.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Facultyware — Sistem Informasi Kepegawaian", bold: true, size: 28 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Laporan Pelaksanaan Lembur", bold: true, size: 24 }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `Dicetak: ${tanggalCetak}`, size: 18, italics: true }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 100 } }),
    );

    // Info Laporan
    docSections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Informasi Laporan", bold: true })],
        spacing: { after: 100 },
      }),
    );

    const infoItems = [
      ["No. Permohonan", laporan.request_number],
      ["Judul/Agenda", laporan.title || "-"],
      ["Tanggal Lembur", new Date(laporan.request_date).toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })],
      ["Diajukan Oleh", `${laporan.submitted_by_name || "-"} (NIP: ${laporan.submitted_by_nip || "-"})`],
      ["Unit/Divisi", laporan.unit_name || "-"],
      ["Rencana Jam Kerja", `${new Date(laporan.planned_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} - ${new Date(laporan.planned_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`],
      ["Deskripsi", laporan.description || "Tidak ada deskripsi"],
      ["Status", statusLabel],
      ["Disetujui Oleh", laporan.approved_by_name || "-"],
    ];

    infoItems.forEach(([label, value]) => {
      docSections.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${label}: `, bold: true, size: 20 }),
            new TextRun({ text: value, size: 20 }),
          ],
        }),
      );
    });

    docSections.push(new Paragraph({ text: "", spacing: { after: 200 } }));

    // Tabel Anggota
    docSections.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: "Rincian Anggota & Realisasi Lembur", bold: true })],
        spacing: { after: 100 },
      }),
    );

    if (anggota.length > 0) {
      // Header row
      const headerRow = new TableRow({
        tableHeader: true,
        children: ["No", "Nama / NIP", "Jam Realisasi", "Unit", "Keterangan"].map(
          (header) =>
            new TableCell({
              borders: tableBorders,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: header, bold: true, size: 18 })],
                }),
              ],
            }),
        ),
      });

      // Data rows
      const dataRows = anggota.map((member, index) => {
        let jamRealisasi = "Belum diisi";
        if (member.actual_start_time && member.actual_end_time) {
          const mulai = new Date(member.actual_start_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          const selesai = new Date(member.actual_end_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
          jamRealisasi = `${mulai} - ${selesai}`;
        }

        return new TableRow({
          children: [
            String(index + 1),
            `${member.employee_name}\n(NIP: ${member.employee_nip || "-"})`,
            jamRealisasi,
            member.unit_name || "-",
            member.notes || "-",
          ].map(
            (cell) =>
              new TableCell({
                borders: tableBorders,
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: cell, size: 18 })],
                  }),
                ],
              }),
          ),
        });
      });

      docSections.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows],
        }),
      );
    } else {
      docSections.push(
        new Paragraph({
          children: [new TextRun({ text: "Tidak ada data anggota lembur.", italics: true, size: 20 })],
        }),
      );
    }

    // Tanda tangan
    docSections.push(
      new Paragraph({ text: "", spacing: { after: 400 } }),
    );

    if (laporan.approved_by_name) {
      docSections.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Menyetujui,", size: 20 })],
        }),
        new Paragraph({ text: "", spacing: { after: 600 } }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: laporan.approved_by_name, bold: true, size: 20, underline: {} })],
        }),
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Pimpinan / Atasan", size: 18, italics: true })],
        }),
      );
    }

    const docx = new Document({
      sections: [
        {
          children: docSections,
        },
      ],
    });

    const buffer = await Packer.toBuffer(docx);
    const filename = `Laporan_Lembur_${laporan.request_number}_${Date.now()}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error("eksporDetailDOCX error:", err);
    res.status(500).render("error", { message: "Gagal mengekspor laporan ke DOCX." });
  }
};
