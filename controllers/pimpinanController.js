const db = require("../lib/db");

// ─────────────────────────────────────────────────────────────────────────────
// MENAMPILKAN FORM BUAT PENUGASAN (GET /pimpinan/penugasan/buat)
// ─────────────────────────────────────────────────────────────────────────────
exports.formBuatPenugasan = async (req, res, next) => {
  try {
    // ALASAN: Ambil daftar karyawan aktif dari tabel employees untuk dimasukkan ke dropdown select
    const [employees] = await db.query(
      "SELECT id, name, employee_number FROM employees WHERE status = 'active' ORDER BY name ASC",
    );

    res.render("pimpinan/buat_penugasan", {
      title: "Buat Penugasan Lembur",
      employees,
      error: null,
      success: null,
    });
  } catch (err) {
    console.error("formBuatPenugasan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMPROSES PENYIMPANAN DATA PENUGASAN (POST /pimpinan/penugasan/buat)
// ─────────────────────────────────────────────────────────────────────────────
exports.simpanPenugasan = async (req, res, next) => {
  try {
    const {
      employee_id,
      title,
      description,
      request_date,
      planned_start_time,
      planned_end_time,
    } = req.body;
    const approverId = req.user.employee_id; // Diambil dari jembatan middleware auth kita sebelumnya

    // Validasi data input wajib
    if (
      !employee_id ||
      !title ||
      !request_date ||
      !planned_start_time ||
      !planned_end_time
    ) {
      const [employees] = await db.query(
        "SELECT id, name FROM employees WHERE status = 'active' ORDER BY name ASC",
      );
      return res.render("pimpinan/buat_penugasan", {
        title: "Buat Penugasan Lembur",
        employees,
        error: "Waduh Bos, semua kolom wajib diisi kecuali deskripsi!",
        success: null,
      });
    }

    // Buat nomor request unik otomatis secara dinamis, contoh: REQ-ASSIGN-1783940294
    const requestNumber = `REQ-ASSIGN-${Date.now()}`;

    // Jalankan query simpan ke tabel utama overtime_requests
    // ALASAN: Kolom submitted_by_id dan approved_by_id bertipe NOT NULL sesuai batasan skema database
    const [result] = await db.query(
      `INSERT INTO overtime_requests (
        request_number, title, description, request_date, 
        planned_start_time, planned_end_time, submitted_by, status,
        submitted_by_id, approved_by, approved_by_id, approved_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?, ?, ?, NOW(), NOW(), NOW())`,
      [
        requestNumber,
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        employee_id,
        employee_id,
        approverId,
        approverId,
      ],
    );

    const newRequestId = result.insertId;

    // Masukkan data anggota pelaksana tugas ke tabel pivot overtime_request_members
    // Catatan: Karena pimpinan menugaskan secara terencana, nilai hours awal diset berdasarkan perhitungan kasar sementara
    await db.query(
      `INSERT INTO overtime_request_members (
        overtime_request_id, employee_id, planned_hours, actual_start_time, actual_end_time, actual_hours, created_at, updated_at
      ) VALUES (?, ?, 0.00, ?, ?, 0.00, NOW(), NOW())`,
      [newRequestId, employee_id, planned_start_time, planned_end_time],
    );

    // KONSEKUENSI HTMX: Mengirimkan respon balik berupa komponen parsial
    // Tujuannya: Mengubah isi wadah halaman utama tanpa memicu penyegaran penuh (SPA-like)
    if (req.headers["hx-request"]) {
      // Kita kirimkan HTML penanda sukses yang nanti ditangkap oleh HTMX
      return res.send(`
        <div class="bg-emerald-500/15 text-emerald-500 text-sm p-4 rounded-md border border-emerald-500/20 text-center mb-6">
            Penugasan "${title}" dengan nomor ${requestNumber} berhasil diterbitkan untuk pegawai.
        </div>
        <div class="flex justify-center">
          <a hx-get="/pimpinan/laporan" hx-target="body" hx-swap="outerHTML" class="btn btn-primary cursor-pointer">Lihat Semua Laporan</a>
        </div>
      `);
    }

    // Fallback jika diakses tanpa HTMX
    res.redirect("/pimpinan/laporan?toast=penugasan_sukses");
  } catch (err) {
    console.error("simpanPenugasan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 10 (PART 1): MENAMPILKAN DAFTAR PENUGASAN LEMBUR (GET /pimpinan/penugasan)
// ─────────────────────────────────────────────────────────────────────────────
exports.listPenugasan = async (req, res, next) => {
  try {
    const { search } = req.query;
    const pimpinanId = req.user.employee_id;
    let whereClause = `WHERE or2.approved_by_id = ?`;
    const params = [pimpinanId];

    if (search) {
      whereClause += ` AND (or2.title LIKE ? OR or2.request_number LIKE ? OR e.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Query menarik data penugasan beserta nama pegawai pelaksana tugas
    const query = `
      SELECT 
        or2.id,
        or2.request_number,
        or2.title,
        or2.request_date,
        or2.status,
        or2.created_at,
        e.name AS pegawai_name,
        ou.name AS unit_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      ${whereClause}
      ORDER BY or2.created_at DESC
    `;

    const [penugasan] = await db.query(query, params);

    res.render("pimpinan/list_penugasan", {
      title: "Daftar Tugas Lembur",
      penugasan,
      filters: { search: search || "" }, // ALASAN: Mencegah error jika filters.search bernilai null
    });
  } catch (err) {
    console.error("listPenugasan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 10 (PART 2): MENAMPILKAN DETAIL PENUGASAN LEMBUR (GET /pimpinan/penugasan/:id)
// ─────────────────────────────────────────────────────────────────────────────
exports.detailPenugasan = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Ambil data utama dari tabel overtime_requests
    const [[tugas]] = await db.query(
      `
      SELECT 
        or2.*,
        e.name AS pegawai_name,
        e.employee_number AS pegawai_nip,
        ou.name AS unit_name,
        pimpinan.name AS pembuat_nama
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
      WHERE or2.id = ?
    `,
      [id],
    );

    if (!tugas) {
      return res
        .status(404)
        .render("error", { message: "Data penugasan tidak ditemukan, Bos!" });
    }

    res.render("pimpinan/detail_penugasan", {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas,
    });
  } catch (err) {
    console.error("detailPenugasan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MENAMPILKAN FORM EDIT PENUGASAN (GET /pimpinan/penugasan/:id/edit)
// ─────────────────────────────────────────────────────────────────────────────
exports.formEditPenugasan = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Ambil data penugasan yang spesifik berdasarkan ID
    const [[tugas]] = await db.query(
      "SELECT * FROM overtime_requests WHERE id = ? AND request_number LIKE 'REQ-ASSIGN-%'",
      [id],
    );

    if (!tugas) {
      return res.status(404).render("error", {
        message: "Data penugasan tidak ditemukan untuk diedit, Bos!",
      });
    }

    // 2. Ambil daftar karyawan aktif untuk dropdown pengubahan personil pelaksana
    const [employees] = await db.query(
      "SELECT id, name, employee_number FROM employees WHERE status = 'active' ORDER BY name ASC",
    );

    res.render("pimpinan/edit_penugasan", {
      title: "Ubah Penugasan Lembur",
      tugas,
      employees,
      error: null,
    });
  } catch (err) {
    console.error("formEditPenugasan error:", err);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMPROSES UPDATE DATA PENUGASAN (POST /pimpinan/penugasan/:id/edit)
// ─────────────────────────────────────────────────────────────────────────────
exports.updatePenugasan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const {
      employee_id,
      title,
      description,
      request_date,
      planned_start_time,
      planned_end_time,
    } = req.body;

    // Validasi input data wajib
    if (
      !employee_id ||
      !title ||
      !request_date ||
      !planned_start_time ||
      !planned_end_time
    ) {
      const [employees] = await db.query(
        "SELECT id, name FROM employees WHERE status = 'active' ORDER BY name ASC",
      );
      const [[tugas]] = await db.query(
        "SELECT * FROM overtime_requests WHERE id = ?",
        [id],
      );
      return res.render("pimpinan/edit_penugasan", {
        title: "Ubah Penugasan Lembur",
        tugas,
        employees,
        error: "Waduh Bos, semua kolom wajib diisi kecuali deskripsi!",
      });
    }

    // ALASAN KEAMANAN DATA: Menggunakan ACID Transaction karena kita memperbarui dua tabel sekaligus (tabel induk & pivot)
    await connection.beginTransaction();

    // 1. Update tabel induk 'overtime_requests'
    await connection.query(
      `UPDATE overtime_requests 
       SET title = ?, description = ?, request_date = ?, 
           planned_start_time = ?, planned_end_time = ?, 
           submitted_by = ?, submitted_by_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        title,
        description,
        request_date,
        planned_start_time,
        planned_end_time,
        employee_id,
        employee_id,
        id,
      ],
    );

    // 2. Update tabel pivot 'overtime_request_members' untuk menyelaraskan personil dan jam kerja baru
    await connection.query(
      `UPDATE overtime_request_members 
       SET employee_id = ?, actual_start_time = ?, actual_end_time = ?, updated_at = NOW()
       WHERE overtime_request_id = ?`,
      [employee_id, planned_start_time, planned_end_time, id],
    );

    await connection.commit();

    // KONSEKUENSI HTMX: Jika request disubmit via HTMX, langsung alihkan halaman ke daftar penugasan secara SPA-like
    if (req.headers["hx-request"]) {
      res.set("HX-Redirect", "/pimpinan/penugasan");
      return res.sendStatus(204);
    }

    res.redirect("/pimpinan/penugasan?toast=update_berhasil");
  } catch (err) {
    await connection.rollback();
    console.error("updatePenugasan error:", err);
    next(err);
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FITUR 17: MENGHAPUS PENUGASAN LEMBUR (DELETE /pimpinan/penugasan/:id)
// ─────────────────────────────────────────────────────────────────────────────
exports.hapusPenugasan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;

    // Memulai transaksi agar penghapusan aman
    await connection.beginTransaction();

    // 1. Validasi Keamanan (Logika Bos)
    const [[tugas]] = await connection.query(
      "SELECT id, status FROM overtime_requests WHERE id = ? AND request_number LIKE 'REQ-ASSIGN-%'",
      [id],
    );

    // Jika data tidak ada
    if (!tugas) {
      await connection.rollback();
      return res
        .status(404)
        .send(
          '<tr><td colspan="6" class="p-4 text-center text-red-500 font-medium bg-red-50">Data penugasan tidak ditemukan.</td></tr>',
        );
    }

    // Jika status sudah berjalan
    if (tugas.status !== "assigned" && tugas.status !== "pending") {
      await connection.rollback();
      return res
        .status(400)
        .send(
          '<tr><td colspan="6" class="p-4 text-center text-yellow-600 font-medium bg-yellow-50">Penugasan gagal dihapus karena sudah diproses oleh pegawai.</td></tr>',
        );
    }

    // 2. Eksekusi Penghapusan
    await connection.query(
      "DELETE FROM overtime_request_members WHERE overtime_request_id = ?",
      [id],
    );
    await connection.query("DELETE FROM overtime_requests WHERE id = ?", [id]);

    await connection.commit();

    // 3. Respons HTMX (Logika Darrel)
    // Mengembalikan string kosong agar elemen (baris tabel) langsung terhapus dari DOM
    res.status(200).send("");
  } catch (err) {
    await connection.rollback();
    console.error("hapusPenugasan error:", err);
    // Fallback error di UI
    res
      .status(500)
      .send(
        '<tr><td colspan="6" class="p-4 text-center text-red-500 font-medium bg-red-50">Gagal menghapus data penugasan. Server error.</td></tr>',
      );
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REST API (GET /api/pimpinan/penugasan/status) (Habib)
// ─────────────────────────────────────────────────────────────────────────────
exports.apiStatusPenugasan = async (req, res) => {
  try {
    const pimpinanId = req.user.employee_id;
    const [penugasan] = await db.query(
      `SELECT or2.request_number, or2.title, or2.status, e.name as ditugaskan_kepada
       FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       JOIN employees e ON orm.employee_id = e.id
       WHERE or2.approved_by_id = ? AND or2.request_number LIKE 'REQ-ASSIGN-%'`,
      [pimpinanId]
    );

    res.json({
      status: "success",
      pimpinan_id: pimpinanId,
      data: penugasan
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPROVE PENUGASAN: Pimpinan menyetujui laporan realisasi kerja pegawai
// POST /pimpinan/penugasan/:id/approve
// ─────────────────────────────────────────────────────────────────────────────
exports.approvePenugasan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const approverId = req.user.employee_id;

    // Ambil data penugasan untuk validasi
    const [[tugas]] = await connection.query(
      "SELECT id, status, title FROM overtime_requests WHERE id = ?",
      [id]
    );

    if (!tugas) {
      return res.status(404).send(
        '<div class="text-destructive text-sm p-4">Data penugasan tidak ditemukan.</div>'
      );
    }

    // Bisa approve jika status waiting_approval atau pending
    if (tugas.status !== 'waiting_approval' && tugas.status !== 'pending') {
      return res.status(400).send(
        '<div class="text-amber-600 text-sm p-4">Penugasan ini tidak dalam status menunggu persetujuan atau izin.</div>'
      );
    }

    await connection.beginTransaction();

    const targetStatus = tugas.status === 'pending' ? 'assigned' : 'approved';

    // Update status penugasan
    await connection.query(
      `UPDATE overtime_requests 
       SET status = ?, approved_by = ?, approved_by_id = ?, approved_at = NOW(), updated_at = NOW() 
       WHERE id = ?`,
      [targetStatus, approverId, approverId, id]
    );

    // Catat log persetujuan ke tabel overtime_approval_logs jika ada
    try {
      await connection.query(
        `INSERT INTO overtime_approval_logs (overtime_request_id, approver_id, status, notes, action_date, created_at) 
         VALUES (?, ?, ?, NULL, NOW(), NOW())`,
        [id, approverId, targetStatus]
      );
    } catch (logErr) {
      // Jika tabel log tidak ada, lanjutkan tanpa error
      console.warn('overtime_approval_logs insert skipped:', logErr.message);
    }

    await connection.commit();

    // Redirect kembali ke detail penugasan dengan flash
    if (req.headers['hx-request']) {
      res.set('HX-Redirect', `/pimpinan/penugasan/${id}`);
      return res.sendStatus(204);
    }

    res.redirect(`/pimpinan/penugasan/${id}`);
  } catch (err) {
    await connection.rollback();
    console.error('approvePenugasan error:', err);
    next(err);
  } finally {
    connection.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// REJECT PENUGASAN: Pimpinan menolak / meminta revisi laporan realisasi kerja
// POST /pimpinan/penugasan/:id/reject
// ─────────────────────────────────────────────────────────────────────────────
exports.rejectPenugasan = async (req, res, next) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { catatan_revisi } = req.body;
    const approverId = req.user.employee_id;

    if (!catatan_revisi || catatan_revisi.trim() === '') {
      return res.status(400).send(
        '<div class="text-destructive text-sm p-4">Catatan alasan penolakan wajib diisi.</div>'
      );
    }

    // Ambil data penugasan untuk validasi
    const [[tugas]] = await connection.query(
      "SELECT id, status FROM overtime_requests WHERE id = ?",
      [id]
    );

    if (!tugas) {
      return res.status(404).send(
        '<div class="text-destructive text-sm p-4">Data penugasan tidak ditemukan.</div>'
      );
    }

    if (tugas.status !== 'waiting_approval' && tugas.status !== 'pending') {
      return res.status(400).send(
        '<div class="text-amber-600 text-sm p-4">Penugasan ini tidak dalam status menunggu persetujuan atau izin.</div>'
      );
    }

    await connection.beginTransaction();

    // Update status penugasan menjadi rejected, kembalikan ke assigned agar pegawai bisa revisi
    await connection.query(
      `UPDATE overtime_requests 
       SET status = 'rejected', approved_by = ?, approved_by_id = ?, updated_at = NOW() 
       WHERE id = ?`,
      [approverId, approverId, id]
    );

    // Catat log penolakan
    try {
      await connection.query(
        `INSERT INTO overtime_approval_logs (overtime_request_id, approver_id, status, notes, action_date, created_at) 
         VALUES (?, ?, 'rejected', ?, NOW(), NOW())`,
        [id, approverId, catatan_revisi.trim()]
      );
    } catch (logErr) {
      console.warn('overtime_approval_logs insert skipped:', logErr.message);
    }

    await connection.commit();

    if (req.headers['hx-request']) {
      res.set('HX-Redirect', `/pimpinan/penugasan/${id}`);
      return res.sendStatus(204);
    }

    res.redirect(`/pimpinan/penugasan/${id}`);
  } catch (err) {
    await connection.rollback();
    console.error('rejectPenugasan error:', err);
    next(err);
  } finally {
    connection.release();
  }
};
