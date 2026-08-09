const mysql = require('mysql2/promise');

async function run() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'bakewise_db'
  });

  try {
    await pool.query('ALTER TABLE bw_branches ADD COLUMN store_hours VARCHAR(100)');
    console.log("Added store_hours");
  } catch (e) {
    console.log("store_hours might exist", e.message);
  }

  try {
    await pool.query('ALTER TABLE bw_branches ADD COLUMN contact_no VARCHAR(100)');
    console.log("Added contact_no");
  } catch (e) {
    console.log("contact_no might exist", e.message);
  }

  process.exit(0);
}

run();
