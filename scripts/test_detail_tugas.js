const ejs = require('ejs');
const path = require('path');
const db = require('../lib/db');

async function run() {
  const [[tugas]] = await db.query(`
    SELECT or2.*, pimpinan.name AS pimpinan_name
    FROM overtime_requests or2
    LEFT JOIN employees pimpinan ON or2.approved_by_id = pimpinan.id
    WHERE or2.id = 6
  `);
  const [members] = await db.query(`
    SELECT e.name AS employee_name, e.employee_number, orm.role, orm.job_desc, orm.planned_hours
    FROM overtime_request_members orm
    JOIN employees e ON orm.employee_id = e.id
    WHERE orm.overtime_request_id = 6
  `);

  const templatePath = path.join(__dirname, '../views/pegawai/detail_tugas.ejs');
  try {
    const html = await ejs.renderFile(templatePath, {
      title: `Detail Tugas — ${tugas.request_number}`,
      tugas, members,
      user: 'haland', role: 'pegawai',
    });
    console.log('✓ Template berhasil di-render, panjang:', html.length, 'chars');
  } catch (e) {
    console.error('✗ ERROR:', e.message);
  }
  process.exit();
}
run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
