# Panduan Implementasi REST API Anggota Kelompok

Dokumen ini berisi detail dan rancangan implementasi fitur REST API untuk masing-masing anggota kelompok agar dapat memenuhi syarat project: **"Menyelesaikan fitur yang menghasilkan output berupa RestAPI"**.

Karena aplikasi Facultyware menggunakan arsitektur **Express.js**, pembuatan REST API sangat mudah. Alih-alih me- *return* halaman HTML dengan `res.render('view', data)`, kita hanya perlu me- *return* data murni menggunakan `res.json(data)`.

---

## 1. Modul Pegawai - Alya Salsa Nabila
**Fokus:** Riwayat permohonan lembur pribadi.

*   **Endpoint:** `GET /api/pegawai/riwayat`
*   **Tujuan:** Mengembalikan data seluruh riwayat lembur yang pernah diajukan oleh pegawai tersebut beserta status terkini.
*   **Contoh Implementasi di Controller (`pegawaiController.js`):**

```javascript
exports.apiRiwayatLembur = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    // Query db untuk mengambil data riwayat (mirip dengan query riwayat biasa)
    const [riwayat] = await db.query(
      `SELECT or2.request_number, or2.title, or2.request_date, or2.status 
       FROM overtime_requests or2
       JOIN overtime_request_members orm ON orm.overtime_request_id = or2.id
       WHERE orm.employee_id = ?`,
      [employeeId]
    );

    res.json({
      status: "success",
      total_data: riwayat.length,
      data: riwayat
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
```
*   **Tambahan di `routes/pegawai.js`:**
```javascript
router.get("/api/riwayat", checkPermission('view_overtime_requests'), pegawaiController.apiRiwayatLembur);
```

---

## 2. Modul Pegawai - M. Ananda Akbar
**Fokus:** Penugasan lembur dari pimpinan (Pencarian/Status).

*   **Endpoint:** `GET /api/pegawai/tugas/search`
*   **Tujuan:** Mencari daftar tugas aktif pegawai berdasarkan kata kunci (keyword). Cocok jika ke depannya pencarian dibuat *live-search* menggunakan *javascript fetch*.
*   **Contoh Implementasi di Controller (`pegawaiController.js`):**

```javascript
exports.apiCariTugasAktif = async (req, res) => {
  try {
    const employeeId = req.user.employee_id;
    const { keyword } = req.query; // ?keyword=rapat
    
    let query = `SELECT id, request_number, title, status FROM overtime_requests 
                 WHERE id IN (SELECT overtime_request_id FROM overtime_request_members WHERE employee_id = ?) 
                 AND status IN ('assigned', 'pending')`;
    let params = [employeeId];

    if (keyword) {
      query += ` AND title LIKE ?`;
      params.push(`%${keyword}%`);
    }

    const [tugas] = await db.query(query, params);

    res.json({
      status: "success",
      keyword_dicari: keyword || "semua",
      data: tugas
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
```

---

## 3. Modul Pimpinan - Muhammad Habib
**Fokus:** (Sesuai Syarat Tabel 12) Data status persetujuan lembur pegawai.

*   **Endpoint:** `GET /api/pimpinan/penugasan/status`
*   **Tujuan:** Melihat penugasan apa saja yang diterbitkan pimpinan, dan melihat status pelaksanaannya (pegawai mana yang sudah lapor / masih *assigned*).
*   **Contoh Implementasi di Controller (`pimpinanController.js`):**

```javascript
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
```

---

## 4. Modul Pimpinan - Hasyfi Zharfan Caniago
**Fokus:** Laporan yang menunggu konfirmasi (Review Laporan).

*   **Endpoint:** `GET /api/pimpinan/laporan/statistik`
*   **Tujuan:** Mengembalikan rekap/statistik (angka) kinerja persetujuan pimpinan (jumlah laporan menunggu, disetujui, dan ditolak). Berguna untuk data pembuatan grafik (*chart*) *dashboard*.
*   **Contoh Implementasi di Controller (`laporanController.js`):**

```javascript
exports.apiStatistikLaporan = async (req, res) => {
  try {
    const pimpinanId = req.user.employee_id;
    
    // Ambil rekap status
    const [stats] = await db.query(
      `SELECT status, COUNT(*) as jumlah 
       FROM overtime_requests 
       WHERE approved_by_id = ? AND request_number NOT LIKE 'REQ-ASSIGN-%'
       GROUP BY status`,
      [pimpinanId]
    );

    // Format output
    let result = { waiting_approval: 0, approved: 0, rejected: 0 };
    stats.forEach(row => {
      if(result[row.status] !== undefined) result[row.status] = row.jumlah;
    });

    res.json({
      status: "success",
      statistik: result
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
```

---

## 5. Modul Admin Kepegawaian - Darrel Rajendra Kurnia
**Fokus:** Rekapitulasi Data Universal.

*   **Endpoint:** `GET /api/admin/rekap-lembur`
*   **Tujuan:** Mengembalikan rekap lembur seluruh pegawai format JSON dengan dukungan filter tanggal (parameter URL). Ini mereplikasi fitur Excel, tapi formatnya siap dipakai (di- *consume*) oleh aplikasi pihak ketiga.
*   **Contoh Implementasi di Controller (`adminController.js`):**

```javascript
exports.apiRekapLembur = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let query = `SELECT or2.request_number, or2.title, e.name as pegawai, or2.status 
                 FROM overtime_requests or2
                 LEFT JOIN employees e ON or2.submitted_by = e.id
                 WHERE 1=1`;
    let params = [];

    if (start_date && end_date) {
      query += ` AND DATE(or2.request_date) BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    const [dataRekap] = await db.query(query, params);

    res.json({
      status: "success",
      total_data: dataRekap.length,
      data: dataRekap
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
```

---

### Panduan Testing Endpoint
Setelah teman-teman mengimplementasikan kode di atas ke *controller* dan *routes* masing-masing, endpoint dapat diuji langsung dari browser atau menggunakan aplikasi **Postman**.

**Contoh URL di Browser (Pastikan sudah login sebelumnya):**
- `http://localhost:3000/api/pegawai/riwayat`
- `http://localhost:3000/api/pimpinan/penugasan/status`
