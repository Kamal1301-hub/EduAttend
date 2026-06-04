const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function importSQL() {
  console.log('Connecting to MySQL...');
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  try {
    const sqlPath = path.join(__dirname, 'database.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Remove the `USE eduattend;` statement if the database doesn't exist yet, 
    // or just let it execute. The pool automatically binds to the DB if it is given.
    // However, the SQL file has `CREATE DATABASE IF NOT EXISTS eduattend;`
    // Let's run it as-is.
    console.log('Executing database.sql...');
    await pool.query(sql);
    console.log('✅ Base schema and seed records inserted successfully!');
    
    console.log('\nRunning seed-passwords.js...');
    require('./scripts/seed-passwords.js');
    
  } catch (error) {
    console.error('❌ Error executing SQL:', error);
  } finally {
    setTimeout(() => pool.end(), 2000);
  }
}

importSQL();
