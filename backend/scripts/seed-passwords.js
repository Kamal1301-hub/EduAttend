/**
 * EduAttend — Password Seeder
 * Run ONCE after database setup to set correct passwords:
 *   node backend/scripts/seed-passwords.js
 */

const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function main() {
  console.log('\n🔐 EduAttend Password Seeder\n');

  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'eduattend',
  });

  const ROUNDS = 10;

  // ── Super Admin ───────────────────────────────────────
  const adminPass = 'Admin@2024';
  const adminHash = await bcrypt.hash(adminPass, ROUNDS);
  await db.execute(
    'UPDATE super_admin SET password = ? WHERE login_id = ?',
    [adminHash, 'superadmin']
  );
  console.log('✅ Super Admin    login_id=superadmin      password=Admin@2024');

  // ── Institute Seeds ───────────────────────────────────
  const institutes = [
    { loginId: 'BFA2024001', password: 'Bfa@7842'  },
    { loginId: 'VMH2024002', password: 'Vmh@3361'  },
  ];

  for (const inst of institutes) {
    const hash = await bcrypt.hash(inst.password, ROUNDS);
    const [rows] = await db.execute(
      'SELECT id FROM institutes WHERE login_id = ?',
      [inst.loginId]
    );
    if (rows.length > 0) {
      await db.execute(
        'UPDATE institutes SET password = ? WHERE login_id = ?',
        [hash, inst.loginId]
      );
      console.log(`✅ Institute       login_id=${inst.loginId}  password=${inst.password}`);
    } else {
      console.log(`⚠️  Institute ${inst.loginId} not found — skipped`);
    }
  }

  await db.end();
  console.log('\n✅ All passwords updated successfully!\n');
}

main().catch(err => {
  console.error('\n❌ Seeder failed:', err.message);
  process.exit(1);
});
