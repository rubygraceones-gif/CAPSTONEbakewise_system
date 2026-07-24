const mysql = require('mysql2/promise');
async function test() {
  const mysqlPool = mysql.createPool({ host: '127.0.0.1', user: 'root', password: '', database: 'bakewise_db' });
  const sql = 'INSERT INTO bw_users (name, email, password, role, branch_id) VALUES (\'Test 2\', \'test2@bakewise.com\', \'pass\', \'admin\', null)';
  const mysqlSql = sql.replace(/\$\d+/g, '?').replace(/RETURNING \*/gi, '');
  const [rows] = await mysqlPool.query(mysqlSql, []);
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const insertId = rows.insertId;
      if (insertId) {
        const tableMatch = sql.match(/INSERT INTO\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const [insertedRows] = await mysqlPool.query(SELECT * FROM  WHERE id = ?, [insertId]);
          if (insertedRows && insertedRows.length > 0) console.log('Retrieved:', insertedRows);
        }
      }
    }
  mysqlPool.end();
}
test();