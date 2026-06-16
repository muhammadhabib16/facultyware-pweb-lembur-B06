const db = require("../lib/db");

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
