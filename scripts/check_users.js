const db = require('../lib/db');
async function run() {
  const [rows] = await db.query(`
    SELECT u.id, u.name, u.email, r.name AS role, e.id AS emp_id
    FROM users u
    LEFT JOIN model_has_roles mhr ON mhr.model_id = u.id AND mhr.model_type = 'User'
    LEFT JOIN roles r ON r.id = mhr.role_id
    LEFT JOIN employees e ON e.user_id = u.id
    ORDER BY u.id
  `);
  console.log(JSON.stringify(rows, null, 2));
  process.exit();
}
run().catch(e => { console.error(e.message); process.exit(1); });
