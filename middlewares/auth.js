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
    // 2. AMBIL DATA PHYSICAL EMPLOYEE (BRIDGE LOGIC)
    const [employees] = await db.query(
      "SELECT id FROM employees WHERE name = ?",
      [req.session.name],
    );

    if (employees.length > 0) {
      req.user = {
        employee_id: employees[0].id,
      };
    } else {
      req.user = {
        employee_id: null,
      };
    }

    // middlewares/auth.js
    req.user = {
      employee_id: 4,
    };

    next();
  } catch (error) {
    console.error("Error pada middleware isAuthenticated:", error);
    next(error);
  }
}

module.exports = {
  isAuthenticated,
};
