const db = require("../lib/db"); // Menggunakan utilitas lib/db terpusat proyek Bos
const bcrypt = require("bcryptjs"); // Menggunakan bcryptjs sesuai package.json

async function seed() {
  try {
    console.log("==================================================");
    console.log("🚀 MEMULAI PROSES SEEDING DATA USER TIM, BOS...");
    console.log("==================================================");

    // 1. Definisikan data Master Roles berdasarkan ID yang telah kita tentukan di database
    // ALASAN: Memetakan nama role ke ID fisik tabel 'roles' riil Bos
    const ROLES = {
      ADMIN: 1,
      PIMPINAN: 2,
      PEGAWAI: 3,
    };

    // 2. Siapkan data seluruh anggota tim Bos
    // Catatan: Semua user baru akan diberikan password default "password123" demi kemudahan testing
    const defaultPassword = "password123";
    const hashPassword = await bcrypt.hash(defaultPassword, 10);

    const timProject = [
      {
        name: "Muhammad Habib",
        email: "habib@facultyware.com",
        password: hashPassword,
        roleId: ROLES.PIMPINAN, // Modul Pimpinan
      },
      {
        name: "Hasyfi Zharfan",
        email: "hasyfi@facultyware.com",
        password: hashPassword,
        roleId: ROLES.PIMPINAN, // Modul Pimpinan (Verifikasi Laporan)
      },
      {
        name: "Darrel Rajendra",
        email: "darrel@facultyware.com",
        password: hashPassword,
        roleId: ROLES.ADMIN, // Modul Admin Kepegawaian
      },
      {
        name: "Alya Salsa Nabila",
        email: "alya@facultyware.com",
        password: hashPassword,
        roleId: ROLES.PEGAWAI, // Modul Pegawai
      },
      {
        name: "M. Ananda Akbar",
        email: "akbar@facultyware.com",
        password: hashPassword,
        roleId: ROLES.PEGAWAI, // Modul Pegawai
      },
    ];

    // 3. Lakukan Looping untuk memasukkan data ke Database secara berurutan
    for (const anggota of timProject) {
      console.log(`\n[~] Memproses pendaftaran: ${anggota.name}...`);

      // A. Cek apakah email sudah terdaftar untuk menghindari error Duplicate Entry
      const [existingUser] = await db.query(
        "SELECT id FROM users WHERE email = ?",
        [anggota.email],
      );

      if (existingUser.length > 0) {
        console.log(`⚠️  LEWAT: Email ${anggota.email} sudah ada di database.`);
        continue;
      }

      // B. Jalankan query INSERT ke tabel 'users' riil Bos
      // ALASAN: Membuat entitas akun fisik terlebih dahulu di database
      const [userResult] = await db.query(
        "INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [anggota.name, anggota.email, anggota.password],
      );

      // C. Ambil ID yang digenerate otomatis oleh MySQL (AUTO_INCREMENT)
      const newUserId = userResult.insertId;

      // D. Jalankan query INSERT ke tabel pivot 'model_has_roles'
      // ALASAN: Menghubungkan ID user baru ke ID peran (role) yang sesuai di skema SQL Bos
      // DAMPAK: Logika query JOIN pada indexController akan langsung mengenali hak akses user ini
      await db.query(
        "INSERT INTO model_has_roles (role_id, model_type, model_id) VALUES (?, 'User', ?)",
        [anggota.roleId, newUserId],
      );

      console.log(
        `✅ SUKSES: ${anggota.name} terdaftar (ID: ${newUserId}, Role ID: ${anggota.roleId})`,
      );
    }

    console.log("\n==================================================");
    console.log("🎉 SEEDING SELESAI! SEMUA USER SIAP DIGUNAKAN, BOS.");
    console.log("==================================================");
  } catch (error) {
    console.error("\n❌ Waduh, proses seeder gagal total, Bos:", error);
  } finally {
    // Mematikan proses script Node.js secara bersih setelah semua query selesai dieksekusi
    process.exit();
  }
}

// Jalankan fungsi seeder utama
seed();
