const db = require("../lib/db");

// Middleware untuk mengecek apakah user sudah login secara umum
async function isAuthenticated(req, res, next) {
  if (!req.session || !req.session.userId) {
    if (req.headers["hx-request"]) {
      res.setHeader("HX-Redirect", "/login");
      return res.end();
    }
    return res.redirect("/login");
  }

  try {
    // Cari employee yang terhubung dengan user yang sedang login via user_id
    // Fallback ke pencocokan nama jika kolom user_id belum ter-link
    const [employees] = await db.query(
      "SELECT id FROM employees WHERE user_id = ? LIMIT 1",
      [req.session.userId],
    );

    if (employees.length > 0) {
      req.user = {
        employee_id: employees[0].id,
      };
    } else {
      // Fallback: cari berdasarkan nama (untuk data lama yang belum punya user_id)
      const [byName] = await db.query(
        "SELECT id FROM employees WHERE name = ? LIMIT 1",
        [req.session.name],
      );
      req.user = {
        employee_id: byName.length > 0 ? byName[0].id : null,
      };
    }

    next();
  } catch (error) {
    console.error("Error pada middleware isAuthenticated:", error);
    next(error);
  }
}

module.exports = {
  isAuthenticated,
};
