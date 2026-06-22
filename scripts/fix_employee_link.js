const db = require('../lib/db');

async function run() {
  console.log('=== Migrasi: Fix approved_by_id dan buat employee records ===\n');

  // 1. Ubah kolom approved_by_id menjadi nullable
  // Alasan: pimpinan adalah atasan yang boleh tidak punya record sebagai employee pelaksana
  try {
    await db.query('ALTER TABLE overtime_requests MODIFY COLUMN approved_by_id BIGINT UNSIGNED NULL');
    console.log('✓ Kolom approved_by_id berhasil diubah menjadi NULLABLE');
  } catch (e) {
    console.log('→ Skip alter approved_by_id:', e.message);
  }

  // 2. Ubah kolom submitted_by_id menjadi nullable juga (konsistensi)
  try {
    await db.query('ALTER TABLE overtime_requests MODIFY COLUMN submitted_by_id BIGINT UNSIGNED NULL');
    console.log('✓ Kolom submitted_by_id berhasil diubah menjadi NULLABLE');
  } catch (e) {
    console.log('→ Skip alter submitted_by_id:', e.message);
  }

  // 3. Buat employee record untuk user yang belum punya
  const usersWithoutEmployee = [
    { userId: 1, name: 'Pegawai Lembur',   nip: 'NIP-00000000-001', role: 'pegawai' },
    { userId: 2, name: 'Muhammad Habib',   nip: 'NIP-00000000-002', role: 'pimpinan' },
    { userId: 4, name: 'Darrel Rajendra',  nip: 'NIP-00000000-004', role: 'admin' },
    { userId: 6, name: 'M. Ananda Akbar', nip: 'NIP-00000000-006', role: 'pegawai' },
  ];

  for (const u of usersWithoutEmployee) {
    // Cek apakah sudah ada employee dengan user_id ini
    const [existing] = await db.query('SELECT id FROM employees WHERE user_id = ? LIMIT 1', [u.userId]);
    if (existing.length > 0) {
      console.log(`→ ${u.name} sudah punya employee record (id=${existing[0].id}), skip`);
      continue;
    }

    try {
      const [result] = await db.query(
        `INSERT INTO employees 
          (user_id, employee_number, name, birth_place, birth_date, gender, 
           marital_status, address, organization_unit_id, hire_date, 
           employment_status_id, status, created_at, updated_at)
         VALUES (?, ?, ?, 'Jakarta', '1990-01-01', 'male', 
                 'single', '-', 1, NOW(), 1, 'active', NOW(), NOW())`,
        [u.userId, u.nip, u.name]
      );
      console.log(`✓ Employee record dibuat untuk ${u.name} (user_id=${u.userId}, emp_id=${result.insertId})`);
    } catch (e) {
      // Jika NIP duplikat, coba dengan suffix random
      try {
        const nip = `NIP-${Date.now()}-${u.userId}`;
        const [result] = await db.query(
          `INSERT INTO employees 
            (user_id, employee_number, name, birth_place, birth_date, gender, 
             marital_status, address, organization_unit_id, hire_date, 
             employment_status_id, status, created_at, updated_at)
           VALUES (?, ?, ?, 'Jakarta', '1990-01-01', 'male', 
                   'single', '-', 1, NOW(), 1, 'active', NOW(), NOW())`,
          [u.userId, nip, u.name]
        );
        console.log(`✓ Employee record dibuat untuk ${u.name} (NIP auto: ${nip}, emp_id=${result.insertId})`);
      } catch (e2) {
        console.log(`✗ Gagal buat employee untuk ${u.name}:`, e2.message);
      }
    }
  }

  // 4. Verifikasi hasil akhir
  console.log('\n=== Hasil Akhir Relasi User ↔ Employee ===');
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
    const status = row.emp_id ? `✓ emp_id=${row.emp_id}` : '✗ TIDAK ADA employee record';
    console.log(`  [${row.role || '?'}] ${row.user_name} → ${status}`);
  });

  process.exit();
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
