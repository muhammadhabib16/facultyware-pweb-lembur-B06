const db = require('../lib/db');

async function run() {
  console.log('=== Fix FK constraint employees.user_id ===\n');

  // 1. Drop FK yang salah (menunjuk ke employees.id bukan employees.user_id)
  try {
    await db.query('ALTER TABLE employees DROP FOREIGN KEY employees_user_id_foreign');
    console.log('✓ FK lama (employees_user_id_foreign) berhasil dihapus');
  } catch (e) {
    console.log('→ Skip drop FK:', e.message);
  }

  // 2. Tambah FK yang benar: employees.user_id → users.id
  try {
    await db.query(`
      ALTER TABLE employees 
      ADD CONSTRAINT employees_user_id_fk 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
    `);
    console.log('✓ FK baru (employees.user_id → users.id) berhasil ditambahkan');
  } catch (e) {
    console.log('→ Skip add FK:', e.message);
  }

  // 3. Buat employee records untuk user yang masih belum punya
  const missing = [
    { userId: 4, name: 'Darrel Rajendra',  nip: `NIP-${Date.now()}-4` },
    { userId: 6, name: 'M. Ananda Akbar', nip: `NIP-${Date.now() + 1}-6` },
  ];

  for (const u of missing) {
    const [existing] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [u.userId]);
    if (existing.length > 0) {
      console.log(`→ ${u.name} sudah punya employee record, skip`);
      continue;
    }
    try {
      const [result] = await db.query(
        `INSERT INTO employees 
          (user_id, employee_number, name, birth_place, birth_date, gender, 
           marital_status, address, organization_unit_id, hire_date, 
           employment_status_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'Jakarta', '1990-01-01', 'male', 
                 'single', '-', 1, CURDATE(), 1, 'active', NOW(), NOW())`,
        [u.userId, u.nip, u.name]
      );
      console.log(`✓ Employee record dibuat untuk ${u.name} (emp_id=${result.insertId})`);
    } catch (e2) {
      console.log(`✗ Gagal buat employee untuk ${u.name}:`, e2.message);
    }
  }

  // 4. Verifikasi hasil akhir
  console.log('\n=== Status Relasi User ↔ Employee ===');
  const [rows] = await db.query(`
    SELECT u.id AS user_id, u.name AS user_name, r.name AS role, 
           e.id AS emp_id, e.employee_number
    FROM users u
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = 'User'
    LEFT JOIN roles r ON r.id = mhr.role_id
    LEFT JOIN employees e ON e.user_id = u.id
    ORDER BY u.id
  `);
  rows.forEach(row => {
    const status = row.emp_id ? `✓ emp_id=${row.emp_id} (${row.employee_number})` : '✗ TIDAK ADA';
    console.log(`  [${(row.role || '?').padEnd(8)}] ${row.user_name.padEnd(20)} → ${status}`);
  });

  process.exit();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
