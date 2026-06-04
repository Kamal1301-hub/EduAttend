const db = require('../config/db');

async function fixPasswords() {
  try {
    const [result] = await db.query("UPDATE students SET student_password = '123456' WHERE student_password LIKE '$2a$%'");
    console.log(`Updated ${result.affectedRows} students passwords to plain text.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fixPasswords();
