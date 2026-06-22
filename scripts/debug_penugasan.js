const db = require('../lib/db');
async function run() {
  // Cek data penugasan ID 5 dan 6
  const [rows] = await db.query(`
    SELECT or2.*, 
           e.name AS pegawai_name, e.employee_number AS pegawai_nip,
           ou.name AS unit_name, pimpinan.name AS pembuat_nama
    FROM overtime_requests or2
    LEFT JOIN employees e ON or2.submitted_by = e.id
    LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
    LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
    WHERE or2.id IN (5, 6)
  `);
  console.log(JSON.stringify(rows, null, 2));

  // Cek semua penugasan
  console.log('\n--- All REQ-ASSIGN ---');
  const [all] = await db.query(`SELECT id, request_number, title, status, submitted_by, submitted_by_id, approved_by, approved_by_id FROM overtime_requests WHERE request_number LIKE 'REQ-ASSIGN-%'`);
  console.log(JSON.stringify(all, null, 2));
  process.exit();
}
run().catch(e => { console.error(e.message); process.exit(1); });
