/**
 * EduAttend — Student Seeder
 * Usage:
 *   node backend/scripts/seed-student.js
 *   node backend/scripts/seed-student.js --phone=7350557473 --name="Demo Student"
 */

const path = require('path');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DEFAULTS = {
  instituteLoginId: 'BFA2024001',
  studentName: 'Demo Student',
  classLevel: '10',
  board: 'CBSE',
  stream: '',
  parentName: 'Demo Parent',
  parentPhone: '7350557473',
  parentEmail: 'parent.demo@example.com',
  aadhar: '',
  password: '123456',
};

function getArg(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (!hit) return fallback;
  return hit.slice(name.length + 3).trim();
}

function makeLoginId(studentId, instituteCode) {
  const code = (instituteCode || 'INS').slice(0, 3).toUpperCase();
  return `STU${String(studentId).padStart(4, '0')}${code}`;
}

async function main() {
  const cfg = {
    instituteLoginId: getArg('institute', DEFAULTS.instituteLoginId),
    studentName: getArg('name', DEFAULTS.studentName),
    classLevel: getArg('class', DEFAULTS.classLevel),
    board: getArg('board', DEFAULTS.board),
    stream: getArg('stream', DEFAULTS.stream),
    parentName: getArg('parent', DEFAULTS.parentName),
    parentPhone: getArg('phone', DEFAULTS.parentPhone),
    parentEmail: getArg('email', DEFAULTS.parentEmail),
    aadhar: getArg('aadhar', DEFAULTS.aadhar),
    password: getArg('password', DEFAULTS.password),
  };

  if (!['8', '9', '10', '11', '12'].includes(cfg.classLevel)) {
    throw new Error('Invalid class. Use one of 8,9,10,11,12');
  }

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduattend',
  });

  const [[institute]] = await db.execute(
    'SELECT id, code, name FROM institutes WHERE login_id = ? LIMIT 1',
    [cfg.instituteLoginId]
  );
  if (!institute) {
    throw new Error(`Institute not found for login_id=${cfg.instituteLoginId}`);
  }

  const [[existing]] = await db.execute(
    'SELECT id, student_login_id FROM students WHERE institute_id = ? AND parent_phone = ? AND name = ? LIMIT 1',
    [institute.id, cfg.parentPhone, cfg.studentName]
  );
  if (existing) {
    console.log(`⚠️  Student already exists (id=${existing.id}, login=${existing.student_login_id || 'N/A'})`);
    await db.end();
    return;
  }

  const [[batch]] = await db.execute(
    'SELECT id FROM batches WHERE institute_id = ? ORDER BY id ASC LIMIT 1',
    [institute.id]
  );
  const batchId = batch ? batch.id : null;
  const finalStream = (cfg.classLevel === '11' || cfg.classLevel === '12') ? (cfg.stream || 'Board') : '';

  const [insertResult] = await db.execute(
    `INSERT INTO students
      (institute_id, batch_id, name, aadhar, class, board, stream, parent_name, parent_phone, parent_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      institute.id,
      batchId,
      cfg.studentName,
      cfg.aadhar,
      cfg.classLevel,
      cfg.board,
      finalStream,
      cfg.parentName,
      cfg.parentPhone,
      cfg.parentEmail,
    ]
  );

  const studentId = insertResult.insertId;
  const loginId = makeLoginId(studentId, institute.code);
  const hashed = await bcrypt.hash(cfg.password, 10);

  await db.execute(
    'UPDATE students SET student_login_id = ?, student_password = ?, must_change_pass = TRUE WHERE id = ?',
    [loginId, hashed, studentId]
  );

  const [[countRow]] = await db.execute(
    'SELECT COUNT(*) AS cnt FROM students WHERE institute_id = ?',
    [institute.id]
  );
  await db.execute(
    'UPDATE institutes SET students_count = ? WHERE id = ?',
    [countRow.cnt, institute.id]
  );

  console.log('✅ Student seeded successfully');
  console.log(`Institute: ${institute.name} (${cfg.instituteLoginId})`);
  console.log(`Student ID: ${studentId}`);
  console.log(`Student Login ID: ${loginId}`);
  console.log(`Default Password: ${cfg.password}`);
  console.log(`Parent Phone: ${cfg.parentPhone}`);
  console.log(`Batch ID: ${batchId || 'NULL (no batch found)'}`);

  await db.end();
}

main().catch((err) => {
  console.error(`❌ Seeder failed: ${err.message}`);
  process.exit(1);
});
