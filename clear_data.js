const mysql = require('mysql2/promise');

async function clearData() {
  try {
    const conn = await mysql.createConnection({
      host: '127.0.0.1',
      port: 3306,
      user: 'root',
      password: '',
      database: 'bakewise_db'
    });

    console.log("Connected to MySQL. Clearing data tables...");
    await conn.query("TRUNCATE TABLE bw_sales;");
    await conn.query("TRUNCATE TABLE bw_inventory;");
    await conn.query("TRUNCATE TABLE bw_production;");
    await conn.query("TRUNCATE TABLE bw_waste;");

    console.log("Data cleared successfully.");
    await conn.end();
  } catch (err) {
    console.error("Failed to connect or clear MySQL database:", err.message);
  }
}

clearData();
