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

    // Generate nomor permohonan lembur unik, contoh: REQ-LEMBUR-1783940294
    const requestNumber = `REQ-LEMBUR-${Date.now()}`;

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
        employeeId,    // submitted_by (int FK ke employees)
        employeeId,    // submitted_by_id (int FK ke employees)
        approvedById,  // approved_by (int FK ke employees — pimpinan)
        approvedById,  // approved_by_id
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

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 5 & 7: MELIHAT DAFTAR TUGAS AKTIF (GET /pegawai/tugas)
// ─────────────────────────────────────────────────────────────────────────────
exports.listTugasAktif = async (req, res, next) => {
  try {
    const employeeId = req.user.employee_id;
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
// FITUR 6: DETAIL TUGAS AKTIF (GET /pegawai/tugas/:id)
// ─────────────────────────────────────────────────────────────────────────────
exports.detailTugas = async (req, res, next) => {
  try {
    const employeeId = req.user.employee_id;
    const { id } = req.params;

    const [[tugas]] = await db.query(
      `
      SELECT 
        or2.*,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
      LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
      WHERE or2.id = ? AND orm.employee_id = ?
    `,
      [id, employeeId]
    );

    if (!tugas) {
      return res.status(404).render("error", { message: "Data tugas tidak ditemukan atau Anda tidak memiliki akses." });
    }

    res.render("pegawai/detail_tugas", {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas,
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
    const employeeId = req.user.employee_id;
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
    const employeeId = req.user.employee_id;
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
    const employeeId = req.user.employee_id;
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
    // Note: jika ada banyak anggota, logika sesungguhnya menunggu semua lapor. Di sini asumsi satu lembar laporan 1 status (karena ini prototype).
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
    const employeeId = req.user.employee_id;
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
