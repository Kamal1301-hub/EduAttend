const db = require('./config/db');

async function run() {
  try {
    await db.query(`ALTER TABLE batches MODIFY class ENUM('8','9','10','11','12','Alumni') NOT NULL;`);
    console.log('✅ Updated batches table');
    await db.query(`ALTER TABLE students MODIFY class ENUM('8','9','10','11','12','Alumni') NOT NULL;`);
    console.log('✅ Updated students table');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit();
  }
}

run();
