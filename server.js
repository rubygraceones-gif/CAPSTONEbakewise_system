const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- DATABASE DRIVER STATE ---
let activeDbDriver = 'none'; // 'mysql' | 'pg' | 'memory'
let mysqlPool = null;
let pgPool = null;

// XAMPP MySQL Connection Settings
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'bakewise_db'
};

// PostgreSQL Connection String (Fallback)
const PG_CONNECTION_STRING = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_k0h9pXrJxRcQ@ep-lingering-flower-a4gancu9-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require";

// Initialize Database Connection
async function setupDatabaseConnection() {
  console.log("--------------------------------------------------");
  console.log("Checking XAMPP MySQL database connection on localhost:3306...");

  // 1. Try Connecting to Local XAMPP MySQL Server
  try {
    const rootConn = await mysql.createConnection({
      host: MYSQL_CONFIG.host,
      port: MYSQL_CONFIG.port,
      user: MYSQL_CONFIG.user,
      password: MYSQL_CONFIG.password
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${MYSQL_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();

    mysqlPool = mysql.createPool({
      ...MYSQL_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test MySQL query
    await mysqlPool.query("SELECT 1");
    activeDbDriver = 'mysql';
    console.log("🟢 CONNECTED TO XAMPP MYSQL DATABASE ('bakewise_db') SUCCESSFULLY!");
    console.log("XAMPP phpMyAdmin URL: http://localhost/phpmyadmin");
    console.log("--------------------------------------------------");
    await initializeMysqlSchema();
    return;
  } catch (err) {
    console.error("❌ CRITICAL ERROR: Could not connect to XAMPP MySQL Database.");
    console.error("📌 Please open XAMPP Control Panel and ensure 'MySQL' is Started.");
    console.error("Error details:", err.message);
    
    // Force the system to stop instead of silently falling back to a cloud database
    // This ensures data is ALWAYS saved to the local phpMyAdmin.
    process.exit(1);
  }
}

// Global Database Query Helper
async function queryDb(sql, params = []) {
  if (activeDbDriver === 'mysql' && mysqlPool) {
    // Convert PostgreSQL $1, $2 placeholders to MySQL ? placeholders
    const mysqlSql = sql.replace(/\$\d+/g, '?').replace(/RETURNING \*/gi, '');
    const [rows] = await mysqlPool.query(mysqlSql, params);

    // Normalize INSERT RETURNING behavior for MySQL
    if (sql.trim().toUpperCase().startsWith("INSERT")) {
      const insertId = rows.insertId;
      if (insertId) {
        const tableMatch = sql.match(/INSERT INTO\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const [insertedRows] = await mysqlPool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [insertId]);
          if (insertedRows && insertedRows.length > 0) return { rows: insertedRows };
        }
      }
    }
    return { rows: Array.isArray(rows) ? rows : [rows] };
  } else if (activeDbDriver === 'pg' && pgPool) {
    const result = await pgPool.query(sql, params);
    return result;
  } else {
    return { rows: [] };
  }
}

// --- INITIALIZE MYSQL SCHEMA & SEED DATA ---
async function initializeMysqlSchema() {
  console.log("Synchronizing XAMPP MySQL table schemas and seed records...");

  // 1. bw_branches
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS bw_branches (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      latitude FLOAT DEFAULT 300,
      longitude FLOAT DEFAULT 200,
      address TEXT,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    INSERT INTO bw_branches (id, name, latitude, longitude, address, status) VALUES
    (1, 'Main Branch (Central)', 620, 100, 'Agdao District, Davao City', 'Active'),
    (2, 'North District Branch', 480, 170, 'Buhangin Flyover, Davao City', 'Active'),
    (3, 'Eastside Hub Branch', 380, 230, 'Bajada Commercial Zone, Davao City', 'Active'),
    (4, 'South Regional Branch', 240, 310, 'Matina Crossing, Davao City', 'Active')
    ON DUPLICATE KEY UPDATE name = VALUES(name), latitude = VALUES(latitude), longitude = VALUES(longitude), address = VALUES(address);
  `);

  // 2. bw_users
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT INTO bw_users (id, email, password, name, role, branch_id) VALUES
    (1, 'manager@bakewise.com', 'password123', 'Branch Manager', 'manager', 1),
    (2, 'sales@bakewise.com', 'password123', 'Sales Staff', 'sales', 1),
    (3, 'inventory@bakewise.com', 'password123', 'Inventory Specialist', 'inventory', 1),
    (4, 'production@bakewise.com', 'password123', 'Baking Specialist', 'production', 1),
    (5, 'admin@bakewise.com', 'password123', 'System Administrator', 'admin', NULL)
    ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), branch_id = VALUES(branch_id);
  `);

  // 3. bw_products
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe) VALUES
    ('p1', 'Pandesal (10pcs/pack)', 'Bread', 45.00, 18.00, 2, 'Garlic Croutons or Fine Breadcrumbs'),
    ('p2', 'Special Ensaymada', 'Pastries', 30.00, 12.00, 3, 'Baked Ensaymada Pudding'),
    ('p3', 'Classic Sliced Bread', 'Bread', 65.00, 28.00, 4, 'Cinnamon Bread Pudding or French Toast Sliders'),
    ('p4', 'Premium Chocolate Cake', 'Cakes', 380.00, 160.00, 5, 'Chocolate Truffle Cake Pops'),
    ('p5', 'Spanish Bread', 'Bread', 10.00, 4.00, 2, 'Bread Pudding Base'),
    ('p6', 'Butter Croissant', 'Pastries', 50.00, 22.00, 2, 'Double Baked Almond Croissants')
    ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), cost = VALUES(cost);
  `);

  // 4. bw_sales
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT IGNORE INTO bw_sales (product_id, qty, price, date, cashier, branch_id) VALUES
    ('p1', 45, 45.00, '2026-07-12', 'Sales Staff', 1),
    ('p2', 28, 30.00, '2026-07-12', 'Sales Staff', 1),
    ('p3', 20, 65.00, '2026-07-12', 'Sales Staff', 1),
    ('p1', 52, 45.00, '2026-07-13', 'Sales Staff', 1),
    ('p2', 30, 30.00, '2026-07-13', 'Sales Staff', 1),
    ('p1', 60, 45.00, '2026-07-14', 'Sales Staff', 1),
    ('p3', 28, 65.00, '2026-07-14', 'Sales Staff', 1);
  `);

  // 5. bw_inventory
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT IGNORE INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES
    ('p1', 350, '2026-07-24', '2026-07-26', 1),
    ('p2', 15, '2026-07-15', '2026-07-18', 1),
    ('p3', 12, '2026-07-14', '2026-07-18', 1),
    ('p4', 4, '2026-07-13', '2026-07-18', 1),
    ('p5', 50, '2026-07-16', '2026-07-18', 1),
    ('p6', 8, '2026-07-17', '2026-07-19', 1);
  `);

  // 6. bw_production
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT IGNORE INTO bw_production (product_id, planned, actual, date, baker, status, code, branch_id) VALUES
    ('p1', 80, 80, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-01', 1),
    ('p2', 40, 40, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-02', 1),
    ('p3', 25, 23, '2026-07-16', 'Baking Specialist', 'Completed', 'B-260717-03', 1),
    ('p6', 20, 20, '2026-07-17', 'Baking Specialist', 'Completed', 'B-260718-01', 1);
  `);

  // 7. bw_waste
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    INSERT IGNORE INTO bw_waste (product_id, qty, cost, reason, date, branch_id) VALUES
    ('p1', 10, 18.00, 'Expired', '2026-07-13', 1),
    ('p2', 5, 12.00, 'Expired', '2026-07-14', 1),
    ('p6', 4, 22.00, 'Quality Defect', '2026-07-16', 1);
  `);

  console.log("XAMPP MySQL database schema & seed initialization complete!");
}

// --- INITIALIZE POSTGRESQL SCHEMA ---
async function initializePgSchema() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS bw_branches (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      status VARCHAR(20) DEFAULT 'Active',
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS bw_users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(50) NOT NULL,
      branch_id INTEGER REFERENCES bw_branches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bw_products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      cost NUMERIC(10, 2) NOT NULL,
      shelf_life_days INTEGER NOT NULL,
      repurpose_recipe TEXT
    );

    CREATE TABLE IF NOT EXISTS bw_sales (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      qty INTEGER NOT NULL,
      price NUMERIC(10, 2) NOT NULL,
      date DATE NOT NULL,
      cashier VARCHAR(100) NOT NULL,
      branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bw_inventory (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      stock_level INTEGER NOT NULL,
      production_date DATE NOT NULL,
      expiry_date DATE NOT NULL,
      branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bw_production (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      planned INTEGER NOT NULL,
      actual INTEGER NOT NULL,
      date DATE NOT NULL,
      baker VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'Completed',
      code VARCHAR(50),
      branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bw_waste (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(50) NOT NULL,
      qty INTEGER NOT NULL,
      cost NUMERIC(10, 2) NOT NULL,
      reason VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE
    );
  `);
}

setupDatabaseConnection();

// --- REST API ENDPOINTS ---

// 1. HEALTH & STATUS CHECK
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: 'BakeWise Bakery Management Enterprise',
    database_driver: activeDbDriver,
    dbConnection: activeDbDriver !== 'none' ? 'healthy' : 'disconnected',
    connectionStringUsed: activeDbDriver === 'mysql' ? 'XAMPP MySQL' : 'Neon Postgres',
    timestamp: new Date().toISOString()
  });
});

// 2. AUTHENTICATION & LOGIN API
app.post('/api/auth/login', async (req, res) => {
  let { email, password } = req.body;
  email = (email || '').trim().toLowerCase();
  password = (password || '').trim();

  if (email && !email.includes('@')) {
    email = `${email}@bakewise.com`;
  }

  try {
    const aliasEmail = email.includes('@bakewise.com')
      ? email.replace('@bakewise.com', '@rosebakeshop.com')
      : (email.includes('@rosebakeshop.com') ? email.replace('@rosebakeshop.com', '@bakewise.com') : email);

    let query = "SELECT * FROM bw_users WHERE (LOWER(email) = $1 OR LOWER(email) = $2) AND password = $3";
    let params = [email, aliasEmail, password];

    const result = await queryDb(query, params);

    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0];
      const roleMap = {
        'sales': 'Sales Staff',
        'inventory': 'Inventory Specialist',
        'production': 'Baking Specialist',
        'manager': 'Branch Manager',
        'admin': 'System Administrator'
      };
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roleLabel: roleMap[user.role] || 'BakeWise Staff',
        branchId: user.branch_id
      });
    } else {
      res.status(401).json({ error: "Invalid email address or password" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. BRANCH NETWORK API
app.get('/api/branches', async (req, res) => {
  try {
    const result = await queryDb("SELECT * FROM bw_branches ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', async (req, res) => {
  const { name, latitude, longitude, address } = req.body;
  try {
    const result = await queryDb(
      "INSERT INTO bw_branches (name, latitude, longitude, address, status) VALUES ($1, $2, $3, $4, 'Active') RETURNING *",
      [name, parseFloat(latitude), parseFloat(longitude), address]
    );
    res.status(201).json(result.rows[0] || { name, latitude, longitude, address, status: 'Active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, address, status } = req.body;
  try {
    await queryDb(
      "UPDATE bw_branches SET name = $1, latitude = $2, longitude = $3, address = $4, status = $5 WHERE id = $6",
      [name, parseFloat(latitude), parseFloat(longitude), address, status || 'Active', parseInt(id)]
    );
    res.json({ success: true, id, name, latitude, longitude, address, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/branches/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await queryDb("DELETE FROM bw_branches WHERE id = $1", [parseInt(id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. USER ACCOUNTS MANAGEMENT API
app.get('/api/users', async (req, res) => {
  try {
    const result = await queryDb("SELECT id, email, name, role, branch_id FROM bw_users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, password, role, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : null;
    const result = await queryDb(
      "INSERT INTO bw_users (name, email, password, role, branch_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, email, password, role, bId]
    );
    res.status(201).json(result.rows[0] || { name, email, role, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, password, role, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : null;
    let query = "UPDATE bw_users SET name = $1, email = $2, role = $3, branch_id = $4";
    let params = [name, email, role, bId];
    if (password && password.trim() !== "") {
      query += ", password = $5 WHERE id = $6";
      params.push(password, parseInt(id));
    } else {
      query += " WHERE id = $5";
      params.push(parseInt(id));
    }
    await queryDb(query, params);
    res.json({ success: true, id, name, email, role, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await queryDb("DELETE FROM bw_users WHERE id = $1", [parseInt(id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PRODUCTS API
app.get('/api/products', async (req, res) => {
  try {
    const result = await queryDb("SELECT * FROM bw_products ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, category, price, cost, shelf_life_days, repurpose_recipe } = req.body;
  try {
    const prodId = id || "p_" + Date.now();
    const result = await queryDb(
      "INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [prodId, name, category, parseFloat(price), parseFloat(cost), parseInt(shelf_life_days), repurpose_recipe]
    );
    res.status(201).json(result.rows[0] || { id: prodId, name, category, price, cost, shelf_life_days, repurpose_recipe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. SALES API
app.get('/api/sales', async (req, res) => {
  const { branch_id } = req.query;
  try {
    let query = "SELECT * FROM bw_sales";
    let params = [];
    if (branch_id) {
      query += " WHERE branch_id = $1";
      params.push(parseInt(branch_id));
    }
    query += " ORDER BY date DESC, id DESC";
    const result = await queryDb(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { product_id, qty, price, date, cashier, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const result = await queryDb(
      "INSERT INTO bw_sales (product_id, qty, price, date, cashier, branch_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [product_id, parseInt(qty), parseFloat(price), date, cashier, bId]
    );
    res.status(201).json(result.rows[0] || { product_id, qty, price, date, cashier, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. INVENTORY API
app.get('/api/inventory', async (req, res) => {
  const { branch_id } = req.query;
  try {
    let query = "SELECT * FROM bw_inventory";
    let params = [];
    if (branch_id) {
      query += " WHERE branch_id = $1";
      params.push(parseInt(branch_id));
    }
    const result = await queryDb(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { product_id, stock_level, production_date, expiry_date, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const check = await queryDb(
      "SELECT id, stock_level FROM bw_inventory WHERE product_id = $1 AND branch_id = $2",
      [product_id, bId]
    );
    let result;
    if (check.rows && check.rows.length > 0) {
      const newStock = check.rows[0].stock_level + parseInt(stock_level);
      result = await queryDb(
        "UPDATE bw_inventory SET stock_level = $1, production_date = $2, expiry_date = $3 WHERE id = $4 RETURNING *",
        [newStock, production_date, expiry_date, check.rows[0].id]
      );
    } else {
      result = await queryDb(
        "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
        [product_id, parseInt(stock_level), production_date, expiry_date, bId]
      );
    }
    res.json(result.rows[0] || { product_id, stock_level, production_date, expiry_date, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. PRODUCTION API
app.get('/api/production', async (req, res) => {
  const { branch_id } = req.query;
  try {
    let query = "SELECT * FROM bw_production";
    let params = [];
    if (branch_id) {
      query += " WHERE branch_id = $1";
      params.push(parseInt(branch_id));
    }
    query += " ORDER BY date DESC, id DESC";
    const result = await queryDb(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/production', async (req, res) => {
  const { product_id, planned, actual, date, baker, status, code, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const result = await queryDb(
      "INSERT INTO bw_production (product_id, planned, actual, date, baker, status, code, branch_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
      [product_id, parseInt(planned), parseInt(actual), date, baker, status, code, bId]
    );
    res.status(201).json(result.rows[0] || { product_id, planned, actual, date, baker, status, code, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. WASTE API
app.get('/api/waste', async (req, res) => {
  const { branch_id } = req.query;
  try {
    let query = "SELECT * FROM bw_waste";
    let params = [];
    if (branch_id) {
      query += " WHERE branch_id = $1";
      params.push(parseInt(branch_id));
    }
    query += " ORDER BY date DESC, id DESC";
    const result = await queryDb(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/waste', async (req, res) => {
  const { product_id, qty, cost, reason, date, branch_id } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const result = await queryDb(
      "INSERT INTO bw_waste (product_id, qty, cost, reason, date, branch_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [product_id, parseInt(qty), parseFloat(cost), reason, date, bId]
    );
    res.status(201).json(result.rows[0] || { product_id, qty, cost, reason, date, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. DATABASE BACKUP & RECOVERY API
app.get('/api/backup', async (req, res) => {
  try {
    const fs = require('fs');
    const dumpPath = path.join(__dirname, 'bakewise_db.sql');
    if (fs.existsSync(dumpPath)) {
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename="bakewise_db_backup.sql"');
      return res.sendFile(dumpPath);
    } else {
      res.status(404).json({ error: "Backup file not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SERVE FRONTEND STATIC FILES ---
app.use(express.static(path.join(__dirname)));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// START EXPRESS SERVER
app.listen(PORT, () => {
  console.log(`BakeWise Enterprise System server is listening on http://localhost:${PORT}`);
});
