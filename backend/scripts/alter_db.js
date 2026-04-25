const db = require('../config/db');

async function run() {
  try {
    await db.query("ALTER TABLE students ADD COLUMN student_phone VARCHAR(15) AFTER stream;");
    console.log("Migration successful");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists, ignoring.");
    } else {
      console.error("Migration failed:", err);
    }
  } finally {
    process.exit(0);
  }
}

run();
