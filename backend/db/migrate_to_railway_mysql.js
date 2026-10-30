/**
 * BakeWise Migration Script: Supabase/PostgreSQL -> Railway MySQL
 * Usage:
 *   node backend/db/migrate_to_railway_mysql.js "<RAILWAY_MYSQL_URL>"
 * or set MYSQL_URL in environment:
 *   $env:MYSQL_URL="mysql://root:password@...railway.app:3306/railway"
 *   node backend/db/migrate_to_railway_mysql.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function migrate() {
  console.log("--------------------------------------------------");
  console.log("BakeWise MySQL Database Migration & Setup Tool");
  console.log("--------------------------------------------------");

  let connConfig = process.argv[2] || process.env.MYSQL_URL || process.env.DATABASE_URL || process.env.MYSQL_PUBLIC_URL;

  let pool;
  if (connConfig && (connConfig.startsWith('mysql://') || connConfig.includes('mysql'))) {
    const sanitized = connConfig.replace(/:[^:@]+@/, ':***@');
    console.log(`Connecting to MySQL via URL: ${sanitized}`);
    pool = mysql.createPool({ uri: connConfig, waitForConnections: true, connectionLimit: 5 });
  } else {
    const host = process.env.MYSQLHOST || process.env.MYSQL_HOST || '127.0.0.1';
    const port = parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306');
    const user = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
    const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || 'railway';

    console.log(`Connecting to MySQL via parameters: ${user}@${host}:${port}/${database}`);
    pool = mysql.createPool({ host, port, user, password, database, waitForConnections: true, connectionLimit: 5 });
  }

  try {
    await pool.query("SELECT 1");
    console.log("🟢 Connected to MySQL database successfully!");
  } catch (err) {
    console.error("❌ Failed to connect to MySQL database:", err.message);
    process.exit(1);
  }

  console.log("\n[1/3] Creating all system tables in MySQL...");

  // 1. bw_branches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude FLOAT DEFAULT 300,
      longitude FLOAT DEFAULT 200,
      address TEXT,
      store_hours VARCHAR(100),
      contact_no VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 2. bw_users
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      branch_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 3. bw_products
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      shelf_life_days INT DEFAULT 2,
      repurpose_recipe TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 4. bw_sales
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_sales (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      qty INT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      cashier VARCHAR(255) DEFAULT 'Staff',
      branch_id INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 5. bw_inventory
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_inventory (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      stock_level INT NOT NULL DEFAULT 0,
      production_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      branch_id INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 6. bw_production
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_production (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      planned INT NOT NULL,
      actual INT NOT NULL,
      date DATE NOT NULL,
      baker VARCHAR(255) DEFAULT 'Baker',
      status VARCHAR(50) DEFAULT 'Completed',
      code VARCHAR(100),
      branch_id INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 7. bw_waste
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_waste (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      qty INT NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      branch_id INT DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 8. bw_pos_transactions
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_pos_transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_number VARCHAR(100) NOT NULL UNIQUE,
      branch_id INT DEFAULT 1,
      cashier VARCHAR(255) DEFAULT 'Staff',
      subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
      discount DECIMAL(10,2) NOT NULL DEFAULT 0,
      total DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      change_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(50) DEFAULT 'Cash',
      status VARCHAR(50) DEFAULT 'Completed',
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 9. bw_pos_transaction_items
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_pos_transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id INT NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // 10. bw_repurpose_logs
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_repurpose_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      batch_id VARCHAR(100),
      product_id VARCHAR(50) NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      target_recipe VARCHAR(255) NOT NULL,
      branch_id INT DEFAULT 1,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("✓ All 10 tables created or verified successfully.");

  console.log("\n[2/3] Migrating data from backup JSON snapshot...");
  const dataFile = path.join(__dirname, 'supabase_migration_data.json');
  if (fs.existsSync(dataFile)) {
    const backup = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

    // Migrate branches
    if (backup.bw_branches && backup.bw_branches.length > 0) {
      for (const b of backup.bw_branches) {
        await pool.query(
          `INSERT INTO bw_branches (id, name, address, latitude, longitude, status)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address)`,
          [b.id, b.name, b.location || b.address || '', b.latitude || 300, b.longitude || 200, b.status || 'Active']
        );
      }
      console.log(`✓ Migrated ${backup.bw_branches.length} branches`);
    }

    // Migrate users
    if (backup.bw_users && backup.bw_users.length > 0) {
      for (const u of backup.bw_users) {
        await pool.query(
          `INSERT INTO bw_users (id, email, password, name, role, branch_id)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), branch_id = VALUES(branch_id)`,
          [u.id, u.email, u.password, u.name, u.role, u.branch_id]
        );
      }
      console.log(`✓ Migrated ${backup.bw_users.length} users`);
    }

    // Migrate products
    if (backup.bw_products && backup.bw_products.length > 0) {
      for (const p of backup.bw_products) {
        await pool.query(
          `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), cost = VALUES(cost)`,
          [p.id, p.name, p.category, p.price, p.cost, p.shelf_life_days || 2, p.repurpose_recipe || 'N/A']
        );
      }
      console.log(`✓ Migrated ${backup.bw_products.length} products`);
    }

    // Migrate inventory
    if (backup.bw_inventory && backup.bw_inventory.length > 0) {
      for (const inv of backup.bw_inventory) {
        const prodDate = inv.production_date ? inv.production_date.split('T')[0] : new Date().toISOString().split('T')[0];
        const expDate = inv.expiry_date ? inv.expiry_date.split('T')[0] : new Date(Date.now() + 3*86400000).toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO bw_inventory (id, product_id, stock_level, production_date, expiry_date, branch_id)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE stock_level = VALUES(stock_level)`,
          [inv.id, inv.product_id, inv.stock_level, prodDate, expDate, inv.branch_id || 1]
        );
      }
      console.log(`✓ Migrated ${backup.bw_inventory.length} inventory records`);
    }

    // Migrate sales
    if (backup.bw_sales && backup.bw_sales.length > 0) {
      for (const s of backup.bw_sales) {
        const saleDate = s.date ? s.date.split('T')[0] : new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO bw_sales (id, product_id, qty, price, date, cashier, branch_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE qty = VALUES(qty), price = VALUES(price)`,
          [s.id, s.product_id, s.qty, s.price, saleDate, s.cashier || 'Staff', s.branch_id || 1]
        );
      }
      console.log(`✓ Migrated ${backup.bw_sales.length} sales records`);
    }
  }

  console.log("\n[3/3] Ensuring baseline products and inventory stock are seeded...");

  const baselineProducts = [
    ['p1', 'Pandesal', 'Bread', 45.00, 18.00, 2, 'Garlic Croutons or Fine Breadcrumbs'],
    ['p2', 'Special Ensaymada', 'Pastries', 30.00, 12.00, 3, 'Baked Ensaymada Pudding'],
    ['p3', 'Classic Sliced Bread', 'Bread', 65.00, 28.00, 4, 'Cinnamon Bread Pudding or French Toast Sliders'],
    ['p4', 'Premium Chocolate Cake', 'Cakes', 380.00, 160.00, 5, 'Chocolate Truffle Cake Pops'],
    ['p5', 'Spanish Bread', 'Bread', 10.00, 4.00, 2, 'Bread Pudding Base'],
    ['p6', 'Butter Croissant', 'Pastries', 50.00, 22.00, 2, 'Double Baked Almond Croissants'],
    ['p7', 'Coke', 'Drinks', 25.00, 12.00, 90, 'N/A'],
    ['p8', 'Chiffon Cake', 'Cakes', 180.00, 80.00, 2, 'Pudding'],
    ['p10', 'Muffin', 'Pastries', 12.00, 4.00, 3, 'N/A']
  ];

  for (const p of baselineProducts) {
    await pool.query(
      `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), cost = VALUES(cost)`,
      p
    );
  }

  // Stock inventory for active branches
  const [prods] = await pool.query('SELECT id FROM bw_products');
  const [branches] = await pool.query('SELECT id FROM bw_branches LIMIT 10');
  for (const b of (branches || [])) {
    for (const p of (prods || [])) {
      const pIdStr = String(p.id).trim();
      const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
      const [check] = await pool.query(
        'SELECT id FROM bw_inventory WHERE (product_id = ? OR product_id = ?) AND branch_id = ?',
        [pIdStr, altPid, b.id]
      );
      if (!check || check.length === 0) {
        let stock = 35;
        if (pIdStr === 'p1') stock = 100;
        if (pIdStr === 'p4') stock = 20;
        if (pIdStr === 'p7') stock = 50;
        if (pIdStr === 'p10') stock = 35;
        const prodDate = new Date().toISOString().split('T')[0];
        const expDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await pool.query(
          'INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES (?, ?, ?, ?, ?)',
          [pIdStr, stock, prodDate, expDate, b.id]
        );
      }
    }
  }

  console.log("✓ Baseline products and inventory stock verified.");
  console.log("\n--------------------------------------------------");
  console.log("🟢 MYSQL DATABASE MIGRATION COMPLETED SUCCESSFULLY!");
  console.log("--------------------------------------------------");

  await pool.end();
}

migrate().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
