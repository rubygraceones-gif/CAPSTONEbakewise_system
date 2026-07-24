const mysql = require('mysql2/promise');
async function test() {
  const pool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'bakewise_db' });
  try {
    const [rows] = await pool.query('INSERT INTO bw_users (name, email, password, role, branch_id) VALUES (?, ?, ?, ?, ?)', ['Test User', 'test@bakewise.com', 'pass', 'admin', null]);
    console.log('Success:', rows);
  } catch (e) {
    console.error('Error:', e);
  }
  pool.end();
}
test();