const ejs = require('ejs');
const path = require('path');
const db = require('../lib/db');

async function run() {
  // Ambil data penugasan id=6
  const [[tugas]] = await db.query(`
    SELECT or2.*, 
           e.name AS pegawai_name,
           e.employee_number AS pegawai_nip,
           ou.name AS unit_name,
           pimpinan.name AS pembuat_nama
    FROM overtime_requests or2
    LEFT JOIN employees e ON or2.submitted_by = e.id
    LEFT JOIN organization_units ou ON e.organization_unit_id = ou.id
    LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
    WHERE or2.id = 6
  `);

  const templatePath = path.join(__dirname, '../views/pimpinan/detail_penugasan.ejs');
  
  try {
    const html = await ejs.renderFile(templatePath, {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas,
      user: 'Test User',
      role: 'pimpinan',
    });
    console.log('✓ Template berhasil di-render, panjang:', html.length, 'chars');
  } catch (e) {
    console.error('✗ ERROR saat render template:');
    console.error(e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 10).join('\n'));
  }
  
  process.exit();
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
