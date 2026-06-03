const bcrypt = require("bcryptjs"); // Diubah ke bcryptjs agar sesuai package.json
const mysql = require("mysql2/promise");
require("dotenv").config();

async function fixPassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const targetEmail = "pegawai@lembur.com";
    const passwordBaru = "password123";
    const namaPegawai = "Pegawai Lembur"; // Data tambahan untuk kolom 'name' di gambar

    // 1. Generate hash password secara aman
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(passwordBaru, salt);

    console.log("--- DEBUG INFO ---");
    console.log("Password asli:", passwordBaru);
    console.log("Hash baru dihasilkan:", hash);

    // 2. Cek apakah user sudah ada di tabel 'users'
    const [rows] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [targetEmail],
    );

    if (rows.length === 0) {
      // ALASAN: Karena database kosong (berdasarkan gambar), kita harus INSERT data baru
      // DAMPAK: Kolom id, name, email, dan password akan terisi secara presisi
      console.log(
        `\n[!] Email ${targetEmail} tidak ditemukan. Membuat user baru...`,
      );

      await connection.execute(
        "INSERT INTO users (name, email, password, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [namaPegawai, targetEmail, hash],
      );

      console.log(`✅ BERHASIL: User '${namaPegawai}' berhasil didaftarkan!`);
    } else {
      // ALASAN: Jika di kemudian hari data sudah ada, kita hanya perlu memperbarui passwordnya saja
      console.log(
        `\n[!] Email ${targetEmail} ditemukan. Memperbarui password...`,
      );

      await connection.execute(
        "UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?",
        [hash, targetEmail],
      );

      console.log("✅ BERHASIL: Password berhasil diperbarui!");
    }

    // 3. Tes Verifikasi Internal Enkripsi
    const match = await bcrypt.compare(passwordBaru, hash);
    console.log("Tes verifikasi enkripsi:", match ? "✅ VALID" : "❌ INVALID");
    console.log("------------------");
    console.log(
      `Silakan buka phpMyAdmin kembali, klik 'Browse' untuk melihat data baru, Bos!`,
    );
  } catch (err) {
    console.error("Waduh error, Bos:", err);
  } finally {
    await connection.end();
  }
}

fixPassword();
