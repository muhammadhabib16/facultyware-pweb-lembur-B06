const db = require("../lib/db");
const ExcelJS = require("exceljs");

// 1. Menampilkan Halaman Rekap & Filter
exports.halamanRekap = async (req, res, next) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    let whereClause = "WHERE or2.request_number LIKE 'REQ-ASSIGN-%'"; // Ambil data penugasan
    let params = [];

    // Logika Filter Tanggal
    if (start_date && end_date) {
      whereClause += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }
    // Logika Filter Divisi
    if (unit_id) {
      whereClause += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    // Ambil data divisi untuk pilihan dropdown
    const [divisi] = await db.query("SELECT id, name FROM organization_units ORDER BY name ASC");
    
    // Ambil data laporan
    const query = `
      SELECT 
        or2.request_number, or2.title, or2.request_date, or2.status,
        e.name AS pegawai_name, ou.name AS unit_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      ${whereClause}
      ORDER BY or2.request_date DESC
    `;
    const [laporan] = await db.query(query, params);

    res.render("admin/rekap", {
      title: "Rekap Laporan Lembur",
      laporan,
      divisi,
      filters: { start_date: start_date || '', end_date: end_date || '', unit_id: unit_id || '' }
    });
  } catch (err) {
    console.error("halamanRekap error:", err);
    next(err);
  }
};

// 2. Mengekspor Data ke Excel
exports.exportExcel = async (req, res, next) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    let whereClause = "WHERE or2.request_number LIKE 'REQ-ASSIGN-%'"; 
    let params = [];

    if (start_date && end_date) {
      whereClause += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }
    if (unit_id) {
      whereClause += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    const query = `
      SELECT 
        or2.request_number, or2.title, or2.request_date, or2.status,
        e.name AS pegawai_name, ou.name AS unit_name
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      ${whereClause}
      ORDER BY or2.request_date DESC
    `;
    const [laporan] = await db.query(query, params);

    // Proses Pembuatan File Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rekap Lembur');

    // Desain Header Kolom Excel
    worksheet.columns = [
      { header: 'No. Penugasan', key: 'request_number', width: 25 },
      { header: 'Nama Pegawai', key: 'pegawai_name', width: 25 },
      { header: 'Divisi/Unit', key: 'unit_name', width: 25 },
      { header: 'Agenda Kerja', key: 'title', width: 35 },
      { header: 'Tanggal', key: 'request_date', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Masukkan data ke baris Excel
    laporan.forEach(item => {
      worksheet.addRow({
        request_number: item.request_number,
        pegawai_name: item.pegawai_name,
        unit_name: item.unit_name || '-',
        title: item.title,
        request_date: new Date(item.request_date).toLocaleDateString('id-ID'),
        status: item.status
      });
    });

    // Kirim file langsung terdownload ke browser pengguna
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Rekap_Lembur_Facultyware.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("exportExcel error:", err);
    next(err);
  }
};

// 3. Endpoint REST API Rekap Lembur (Tugas Darrel)
exports.apiRekapLembur = async (req, res) => {
  try {
    const { start_date, end_date, unit_id } = req.query;
    
    // Query dasar
    let query = `
      SELECT or2.request_number, or2.title, e.name as pegawai, ou.name as unit_name, or2.status
      FROM overtime_requests or2
      LEFT JOIN employees e ON or2.submitted_by = e.id
      LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
      WHERE or2.request_number LIKE 'REQ-ASSIGN-%'
    `;
    let params = [];

    // Jika parameter filter tanggal diberikan di URL
    if (start_date && end_date) {
      query += " AND DATE(or2.request_date) BETWEEN ? AND ?";
      params.push(start_date, end_date);
    }

    // Jika parameter filter divisi diberikan di URL
    if (unit_id) {
      query += " AND e.organization_unit_id = ?";
      params.push(unit_id);
    }

    const [dataRekap] = await db.query(query, params);

    // KUNCI REST API: Kita menggunakan res.json(), bukan res.render()
    res.json({
      status: "success",
      total_data: dataRekap.length,
      data: dataRekap
    });
    
  } catch (err) {
    console.error("apiRekapLembur error:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
};