const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const { Pool, types } = require('pg');
// Configure node-postgres type parsers to prevent timezone shift on DATE and TIMESTAMP columns
if (types && typeof types.setTypeParser === 'function') {
  types.setTypeParser(1082, str => str); // DATE (e.g. '2026-10-14')
  types.setTypeParser(1114, str => str); // TIMESTAMP without timezone (e.g. '2026-10-14 05:32:01')
}
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const apicache = require('apicache');
require('dotenv').config();
const { runAutoSeeder, generateDayTimes, DATES } = require('./auto_seeder');

// Helper to get current date, time, and full timestamp in Philippine Standard Time (Asia/Manila, UTC+8)
function getPhilippineNow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  const m = {};
  parts.forEach(p => { m[p.type] = p.value; });
  const hour = m.hour === '24' ? '00' : m.hour;
  const dateStr = `${m.year}-${m.month}-${m.day}`;
  const timeStr = `${hour}:${m.minute}:${m.second}`;
  return {
    date: dateStr,
    time: timeStr,
    datetime: `${dateStr} ${timeStr}`,
    now
  };
}


const app = express();
const PORT = process.env.PORT || 3000;

// Enable 'trust proxy' for reverse proxies (Railway, Heroku, Nginx, Cloudflare)
app.set('trust proxy', 1);

// Disable Express fingerprinting
app.disable('x-powered-by');

// Suppress and genericize Server header across all responses (suppresses 'railway-hikari' info disclosure)
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');
  res.setHeader('Server', 'webserver');
  next();
});

// Security and Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://unpkg.com", "https://*.tile.openstreetmap.org", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(xss());
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
// Real-Time Dynamic API Headers: Prevent stale HTTP/CDN caching on live database data
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

const clearApiCache = () => {};

// Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: { error: 'Too many requests from this IP, please try again later' }
});

app.use('/api/', apiLimiter);

// JWT Middleware
function authenticateToken(req, res, next) {
  // Allow OPTIONS preflight requests
  if (req.method === 'OPTIONS') return next();

  const isWhitelisted = (
    req.path === '/auth/login' ||
    req.path === '/status' ||
    req.path === '/sync' ||
    req.path.startsWith('/admin') ||
    req.path.startsWith('/pos') ||
    req.path.startsWith('/inventory') ||
    req.path.startsWith('/products') ||
    req.path.startsWith('/branches') ||
    req.path.startsWith('/repurpose') ||
    req.path.startsWith('/forecast') ||
    req.path.startsWith('/users') ||
    req.path.startsWith('/sales') ||
    req.path.startsWith('/production') ||
    req.path.startsWith('/waste')
  );

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      req.user = null;
      if (!isWhitelisted) {
        return res.status(401).json({ error: 'Token is invalid or expired' });
      }
    }
  }

  // Allow public/system API routes without strict JWT header check
  if (isWhitelisted) return next();

  if (token == null) return res.status(401).json({ error: 'No token provided' });
  if (!req.user) return res.status(401).json({ error: 'Token is invalid or expired' });
  next();
}

// Helper to verify role and branch access
function checkBranchAccess(req, targetBranchId) {
  if (!req.user) return true;
  if (req.user.role === 'admin') return true;
  if (!targetBranchId || targetBranchId === 'all') return true;
  return parseInt(targetBranchId) === parseInt(req.user.branchId);
}

app.use('/api/', authenticateToken);

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

// Default Supabase PostgreSQL Connection String
const DEFAULT_SUPABASE_URL = "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

// Determine if running in Cloud / Railway environment
const isCloudEnv = !!(
  process.env.RAILWAY_ENVIRONMENT ||
  process.env.RAILWAY_ENVIRONMENT_NAME ||
  process.env.RAILWAY_SERVICE_ID ||
  process.env.RAILWAY_PROJECT_ID ||
  process.env.NODE_ENV === 'production' ||
  process.env.PORT
);

let dbReadyPromise = null;

// Initialize Database Connection (MySQL as Primary Engine with Railway / Local XAMPP Support)
async function setupDatabaseConnection() {
  console.log("--------------------------------------------------");
  console.log("Initializing BakeWise Database Engine (MySQL Priority)...");
  console.log(`Environment mode: ${isCloudEnv ? 'Cloud / Railway Production' : 'Local Development'}`);

  // 1. Gather all potential MySQL connection candidates
  const mysqlUrlCandidates = [];

  if (process.env.MYSQL_URL && process.env.MYSQL_URL.trim()) {
    mysqlUrlCandidates.push(process.env.MYSQL_URL.trim());
  }
  if (process.env.MYSQL_PUBLIC_URL && process.env.MYSQL_PUBLIC_URL.trim()) {
    mysqlUrlCandidates.push(process.env.MYSQL_PUBLIC_URL.trim());
  }
  if (process.env.MYSQL_PRIVATE_URL && process.env.MYSQL_PRIVATE_URL.trim()) {
    mysqlUrlCandidates.push(process.env.MYSQL_PRIVATE_URL.trim());
  }
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() && (
      process.env.DATABASE_URL.startsWith('mysql://') ||
      process.env.DATABASE_URL.includes('mysql') ||
      !process.env.DATABASE_URL.startsWith('postgres')
  )) {
    mysqlUrlCandidates.push(process.env.DATABASE_URL.trim());
  }

  // 1A. Attempt MySQL via Connection URL (Railway MySQL)
  for (const connUrl of mysqlUrlCandidates) {
    try {
      const sanitized = connUrl.replace(/:[^:@]+@/, ':***@');
      console.log(`Attempting Railway MySQL connection to: ${sanitized}`);
      mysqlPool = mysql.createPool({
        uri: connUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true
      });
      await mysqlPool.query("SELECT 1");
      activeDbDriver = 'mysql';
      console.log("🟢 CONNECTED TO RAILWAY MYSQL DATABASE SUCCESSFULLY!");
      console.log("--------------------------------------------------");
      await initializeMysqlSchema();
      runAutoSeeder(queryDb, false).catch(e => console.warn("Auto-seeder notice:", e.message));
      return;
    } catch (err) {
      console.error("❌ Railway MySQL connection attempt failed:", err.message);
      if (mysqlPool) {
        try { await mysqlPool.end(); } catch (e) {}
        mysqlPool = null;
      }
    }
  }

  // 1B. Attempt MySQL via host/port/user/password configuration (Railway discrete env vars or XAMPP)
  const mysqlHost = process.env.MYSQLHOST || process.env.MYSQL_HOST || (isCloudEnv ? null : '127.0.0.1');
  if (mysqlHost) {
    const mysqlPort = parseInt(process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306');
    const mysqlUser = process.env.MYSQLUSER || process.env.MYSQL_USER || 'root';
    const mysqlPassword = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || '';
    const mysqlDatabase = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || (isCloudEnv ? 'railway' : 'bakewise_db');

    try {
      console.log(`Checking MySQL server at ${mysqlHost}:${mysqlPort} (DB: ${mysqlDatabase})...`);

      // On local dev, create database if it doesn't exist
      if (!isCloudEnv) {
        try {
          const rootConn = await mysql.createConnection({
            host: mysqlHost,
            port: mysqlPort,
            user: mysqlUser,
            password: mysqlPassword
          });
          await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${mysqlDatabase}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
          await rootConn.end();
        } catch (e) {
          // Ignore if cannot connect as root
        }
      }

      mysqlPool = mysql.createPool({
        host: mysqlHost,
        port: mysqlPort,
        user: mysqlUser,
        password: mysqlPassword,
        database: mysqlDatabase,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        dateStrings: true
      });

      await mysqlPool.query("SELECT 1");
      activeDbDriver = 'mysql';
      console.log(`🟢 CONNECTED TO MYSQL DATABASE ('${mysqlDatabase}') SUCCESSFULLY!`);
      if (!isCloudEnv) {
        console.log("XAMPP phpMyAdmin URL: http://localhost/phpmyadmin");
      }
      console.log("--------------------------------------------------");
      await initializeMysqlSchema();
      runAutoSeeder(queryDb, false).catch(e => console.warn("Auto-seeder notice:", e.message));
      return;
    } catch (err) {
      console.log("ℹ️ MySQL configuration attempt failed:", err.message);
      if (mysqlPool) {
        try { await mysqlPool.end(); } catch (e) {}
        mysqlPool = null;
      }
    }
  }

  // 2. Fallback to PostgreSQL only if MySQL is not available
  const pgCandidates = [];
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().startsWith('postgres')) {
    pgCandidates.push(process.env.DATABASE_URL.trim());
  }
  if (process.env.SUPABASE_DB_URL && process.env.SUPABASE_DB_URL.trim()) {
    pgCandidates.push(process.env.SUPABASE_DB_URL.trim());
  }
  if (!pgCandidates.includes(DEFAULT_SUPABASE_URL)) {
    pgCandidates.push(DEFAULT_SUPABASE_URL);
  }

  for (const connStr of pgCandidates) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const sanitized = connStr.replace(/:[^:@]+@/, ':***@');
        console.log(`Attempting PostgreSQL fallback connection (attempt ${attempt}/3) to: ${sanitized}`);
        pgPool = new Pool({
          connectionString: connStr,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 15000,
          idleTimeoutMillis: 30000
        });
        await pgPool.query("SELECT 1");
        activeDbDriver = 'pg';
        console.log("🟢 CONNECTED TO POSTGRESQL DATABASE FALLBACK SUCCESSFULLY!");
        console.log("--------------------------------------------------");
        await initializePgSchema();
        runAutoSeeder(queryDb, false).catch(e => console.warn("Auto-seeder notice:", e.message));
        return;
      } catch (pgErr) {
        console.error(`❌ PostgreSQL connection fallback attempt ${attempt} failed:`, pgErr.message);
        if (pgPool) {
          try { await pgPool.end(); } catch (e) {}
          pgPool = null;
        }
        if (attempt < 3) {
          await new Promise(r => setTimeout(r, 1500));
        }
      }
    }
  }

  console.error("❌ CRITICAL ERROR: Unable to connect to MySQL or fallback database engine!");
  process.exit(1);
}

// Global Database Query Helper
async function queryDb(sql, params = []) {
  if (!activeDbDriver && dbReadyPromise) {
    try {
      await dbReadyPromise;
    } catch (e) {
      console.error("queryDb error waiting for dbReadyPromise:", e.message);
    }
  }
  if (activeDbDriver === 'mysql' && mysqlPool) {
    // Convert PostgreSQL $1, $2 placeholders to MySQL ? placeholders
    // And properly map repeated positional parameters to the correct ? slots
    // And remove any RETURNING ... clause which is unsupported in MySQL
    const paramIndices = [];
    const mysqlSql = sql.replace(/\$(\d+)/g, (_, num) => {
      paramIndices.push(parseInt(num) - 1);
      return '?';
    }).replace(/RETURNING\s+[^;]+/gi, '');
    const mappedParams = paramIndices.length > 0 ? paramIndices.map(idx => params[idx]) : params;
    const [rows] = await mysqlPool.query(mysqlSql, mappedParams);

    // Normalize INSERT RETURNING behavior for MySQL
    if (sql.trim().toUpperCase().startsWith("INSERT")) {
      const insertId = rows.insertId;
      if (insertId) {
        const tableMatch = sql.match(/INSERT INTO\s+([a-zA-Z0-9_]+)/i);
        if (tableMatch) {
          const tableName = tableMatch[1];
          const ALLOWED_TABLES = [
            'bw_branches', 'bw_users', 'bw_products', 'bw_branch_products', 'bw_sales',
            'bw_inventory', 'bw_inventory_movements', 'bw_inventory_batches', 'bw_production', 'bw_waste',
            'bw_pos_transactions', 'bw_pos_transaction_items', 'bw_repurpose_logs'
          ];
          if (ALLOWED_TABLES.includes(tableName)) {
            const selectCols = (tableName === 'bw_users') ? 'id, name, email, role, branch_id' : '*';
            const [insertedRows] = await mysqlPool.query(`SELECT ${selectCols} FROM ?? WHERE id = ?`, [tableName, insertId]);
            if (insertedRows && insertedRows.length > 0) return { rows: insertedRows };
          }
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
      store_hours VARCHAR(100),
      contact_no VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  console.log("MySQL branch table ready: automatic seeding disabled for fresh registrations.");

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

  const [uRows] = await mysqlPool.query("SELECT COUNT(*) as count FROM bw_users");
  if (uRows && uRows[0] && uRows[0].count === 0) {
    console.log("Seeding default administrative users into empty bw_users table...");
    const defaultHash = bcrypt.hashSync('password123', 10);
    const defaultSeedUsers = [
      [1, 'manager@bakewise.com', defaultHash, 'Branch Manager', 'manager', 1],
      [2, 'sales@bakewise.com', defaultHash, 'Sales Staff', 'sales', 1],
      [3, 'inventory@bakewise.com', defaultHash, 'Inventory Specialist', 'inventory', 1],
      [4, 'production@bakewise.com', defaultHash, 'Baking Specialist', 'production', 1],
      [5, 'admin@bakewise.com', defaultHash, 'System Administrator', 'admin', null]
    ];
    for (const u of defaultSeedUsers) {
      await mysqlPool.query(
        'INSERT INTO bw_users (id, email, password, name, role, branch_id) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id',
        u
      );
    }
  } else {
    console.log(`Skipping user seeding: bw_users table already contains ${uRows[0].count} accounts.`);
  }

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

  const [pRows] = await mysqlPool.query("SELECT COUNT(*) as count FROM bw_products");
  if (pRows && pRows[0] && pRows[0].count === 0) {
    console.log("Seeding default bakery products into empty bw_products table...");
    await mysqlPool.query(`
      INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe) VALUES
      ('p1', 'Pandesal', 'Bread', 45.00, 18.00, 2, 'Garlic Croutons or Fine Breadcrumbs'),
      ('p2', 'Special Ensaymada', 'Pastries', 30.00, 12.00, 3, 'Baked Ensaymada Pudding'),
      ('p3', 'Classic Sliced Bread', 'Bread', 65.00, 28.00, 4, 'Cinnamon Bread Pudding or French Toast Sliders'),
      ('p4', 'Premium Chocolate Cake', 'Cakes', 380.00, 160.00, 5, 'Chocolate Truffle Cake Pops'),
      ('p5', 'Spanish Bread', 'Bread', 10.00, 4.00, 2, 'Bread Pudding Base'),
      ('p6', 'Butter Croissant', 'Pastries', 50.00, 22.00, 2, 'Double Baked Almond Croissants'),
      ('p7', 'Coke', 'Drinks', 25.00, 12.00, 90, 'N/A'),
      ('p8', 'Chiffon Cake', 'Cakes', 180.00, 80.00, 2, 'Pudding'),
      ('p10', 'Muffin', 'Pastries', 12.00, 4.00, 3, 'N/A')
      ON DUPLICATE KEY UPDATE id = id;
    `);
  } else {
    console.log(`Skipping product seeding: bw_products table already contains ${pRows[0].count} items.`);
  }

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

  // Seed data removed for bw_sales

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

  // Seed data removed for bw_inventory

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

  // Seed data removed for bw_production

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

  // 8. bw_pos_transactions
  await mysqlPool.query(`
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

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS bw_pos_transaction_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      transaction_id INT NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
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

  // MySQL Branch & Inventory extensions
  try {
    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bw_branch_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        branch_id INT NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        custom_name VARCHAR(255),
        category VARCHAR(100),
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2) NOT NULL,
        shelf_life_days INT DEFAULT 2,
        repurpose_recipe TEXT,
        unit VARCHAR(50) DEFAULT 'pcs',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_branch_product (branch_id, product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bw_inventory_movements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        movement_type VARCHAR(50) NOT NULL,
        branch_id INT NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        quantity INT NOT NULL,
        previous_stock INT DEFAULT 0,
        new_stock INT DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pcs',
        batch_id VARCHAR(100),
        source_branch_id INT DEFAULT NULL,
        dest_branch_id INT DEFAULT NULL,
        reference_id VARCHAR(100) DEFAULT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        notes TEXT,
        performed_by VARCHAR(255) DEFAULT 'Staff',
        authorized_by VARCHAR(255) DEFAULT 'System',
        status VARCHAR(50) DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await mysqlPool.query(`
      CREATE TABLE IF NOT EXISTS bw_inventory_batches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        batch_code VARCHAR(100) NOT NULL,
        branch_id INT NOT NULL,
        product_id VARCHAR(50) NOT NULL,
        initial_quantity INT NOT NULL,
        current_quantity INT NOT NULL,
        production_date DATE NOT NULL,
        production_time VARCHAR(20) DEFAULT '06:00:00',
        expiry_date DATE NOT NULL,
        expiry_time VARCHAR(20) DEFAULT '18:00:00',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Helper to ensure column exists in MySQL tables
    const ensureMysqlColumn = async (tableName, colName, colDef) => {
      try {
        const [existing] = await mysqlPool.query(
          `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
          [tableName, colName]
        );
        if (!existing || existing.length === 0) {
          await mysqlPool.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${colName}\` ${colDef}`);
        }
      } catch (colErr) {
        // Ignore if already added or restricted
      }
    };

    await ensureMysqlColumn('bw_products', 'branch_id', 'INT DEFAULT NULL');
    await ensureMysqlColumn('bw_products', 'unit', "VARCHAR(50) DEFAULT 'pcs'");
    await ensureMysqlColumn('bw_products', 'status', "VARCHAR(50) DEFAULT 'Active'");
    await ensureMysqlColumn('bw_products', 'description', 'TEXT');

    await ensureMysqlColumn('bw_inventory', 'unit', "VARCHAR(50) DEFAULT 'pcs'");
    await ensureMysqlColumn('bw_inventory', 'status', "VARCHAR(50) DEFAULT 'In Stock'");
    await ensureMysqlColumn('bw_inventory', 'batch_id', 'VARCHAR(100) DEFAULT NULL');
    await ensureMysqlColumn('bw_inventory', 'production_time', "VARCHAR(20) DEFAULT '06:00:00'");
    await ensureMysqlColumn('bw_inventory', 'expiry_time', "VARCHAR(20) DEFAULT '18:00:00'");
    await ensureMysqlColumn('bw_inventory', 'degradation_percent', 'DECIMAL(5,2) DEFAULT 0.00');
  } catch (err) {
    console.warn("MySQL branch extensions notice:", err.message);
  }

  // Seed initial stock levels into bw_inventory ONLY on empty database
  try {
    const [invRows] = await mysqlPool.query("SELECT COUNT(*) as count FROM bw_inventory");
    if (invRows && invRows[0] && invRows[0].count === 0) {
      console.log("Seeding initial stock levels into empty bw_inventory table...");
      const [prods] = await mysqlPool.query('SELECT id FROM bw_products');
      const [branches] = await mysqlPool.query('SELECT id FROM bw_branches LIMIT 10');
      for (const b of (branches || [])) {
        for (const p of (prods || [])) {
          const pIdStr = String(p.id).trim();
          let stock = 35;
          if (pIdStr === 'p1') stock = 100;
          if (pIdStr === 'p4') stock = 20;
          if (pIdStr === 'p7') stock = 50;
          if (pIdStr === 'p10') stock = 35;
          const prodDate = new Date().toISOString().split('T')[0];
          const expDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          await mysqlPool.query(
            'INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES (?, ?, ?, ?, ?)',
            [pIdStr, stock, prodDate, expDate, b.id]
          );
        }
      }
    } else {
      console.log(`Skipping inventory seeding: bw_inventory already contains ${invRows[0].count} records.`);
    }
  } catch (err) {
    console.warn("⚠️ MySQL inventory auto-seed notice:", err.message);
  }

  console.log("MySQL database schema & seed initialization complete!");
  await healOrphanedBranchRecords();
}

// --- INITIALIZE POSTGRESQL SCHEMA & SEED DATA ---
async function initializePgSchema() {
  console.log("Synchronizing Supabase / PostgreSQL table schemas and seed records...");
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS bw_repurpose_logs (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(100),
        product_id VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        target_recipe VARCHAR(255) NOT NULL,
        branch_id INTEGER DEFAULT 1,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn("⚠️ Postgres repurpose table notice:", err.message);
  }
  try {
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS bw_branches (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        latitude DOUBLE PRECISION DEFAULT 300,
        longitude DOUBLE PRECISION DEFAULT 200,
        status VARCHAR(50) DEFAULT 'Active',
        address TEXT,
        store_hours VARCHAR(100),
        contact_no VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE bw_branches ADD COLUMN IF NOT EXISTS address TEXT;
      ALTER TABLE bw_branches ADD COLUMN IF NOT EXISTS store_hours VARCHAR(100);
      ALTER TABLE bw_branches ADD COLUMN IF NOT EXISTS contact_no VARCHAR(100);

      CREATE TABLE IF NOT EXISTS bw_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        branch_id INTEGER REFERENCES bw_branches(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_products (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        cost NUMERIC(10, 2) NOT NULL,
        shelf_life_days INTEGER DEFAULT 2,
        repurpose_recipe TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_sales (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        qty INTEGER NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        date DATE NOT NULL,
        cashier VARCHAR(255) DEFAULT 'Staff',
        branch_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_inventory (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        stock_level INTEGER NOT NULL DEFAULT 0,
        production_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        branch_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_production (
        id SERIAL PRIMARY KEY,
        product_id VARCHAR(50) NOT NULL,
        planned INTEGER NOT NULL,
        actual INTEGER NOT NULL,
        date DATE NOT NULL,
        baker VARCHAR(255) DEFAULT 'Baker',
        status VARCHAR(50) DEFAULT 'Completed',
        code VARCHAR(100),
        branch_id INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_pos_transactions (
        id SERIAL PRIMARY KEY,
        transaction_number VARCHAR(100) NOT NULL UNIQUE,
        branch_id INTEGER DEFAULT 1,
        cashier VARCHAR(255) DEFAULT 'Staff',
        subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
        discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        change_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
        payment_method VARCHAR(50) DEFAULT 'Cash',
        status VARCHAR(50) DEFAULT 'Completed',
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_pos_transaction_items (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES bw_pos_transactions(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL
      );

      -- PostgreSQL Branch & Inventory extensions
      ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE;
      ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
      ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
      ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS description TEXT;

      CREATE TABLE IF NOT EXISTS bw_branch_products (
        id SERIAL PRIMARY KEY,
        branch_id INTEGER NOT NULL REFERENCES bw_branches(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL REFERENCES bw_products(id) ON DELETE CASCADE,
        custom_name VARCHAR(255),
        category VARCHAR(100),
        price NUMERIC(10, 2) NOT NULL,
        cost NUMERIC(10, 2) NOT NULL,
        shelf_life_days INTEGER DEFAULT 2,
        repurpose_recipe TEXT,
        unit VARCHAR(50) DEFAULT 'pcs',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_branch_product UNIQUE (branch_id, product_id)
      );

      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Stock';
      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);
      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS production_time VARCHAR(20) DEFAULT '06:00:00';
      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS expiry_time VARCHAR(20) DEFAULT '18:00:00';
      ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS degradation_percent INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS bw_inventory_movements (
        id SERIAL PRIMARY KEY,
        movement_type VARCHAR(50) NOT NULL,
        branch_id INTEGER NOT NULL REFERENCES bw_branches(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        quantity INTEGER NOT NULL,
        previous_stock INTEGER DEFAULT 0,
        new_stock INTEGER DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'pcs',
        batch_id VARCHAR(100),
        source_branch_id INTEGER DEFAULT NULL,
        dest_branch_id INTEGER DEFAULT NULL,
        reference_id VARCHAR(100) DEFAULT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        notes TEXT,
        performed_by VARCHAR(255) DEFAULT 'Staff',
        authorized_by VARCHAR(255) DEFAULT 'System',
        status VARCHAR(50) DEFAULT 'Completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS bw_inventory_batches (
        id SERIAL PRIMARY KEY,
        batch_code VARCHAR(100) NOT NULL,
        branch_id INTEGER NOT NULL REFERENCES bw_branches(id) ON DELETE CASCADE,
        product_id VARCHAR(50) NOT NULL,
        initial_quantity INTEGER NOT NULL,
        current_quantity INTEGER NOT NULL,
        production_date DATE NOT NULL,
        production_time VARCHAR(20) DEFAULT '06:00:00',
        expiry_date DATE NOT NULL,
        expiry_time VARCHAR(20) DEFAULT '18:00:00',
        status VARCHAR(50) DEFAULT 'Active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch (err) {
    console.warn("⚠️ Postgres table creation notice:", err.message);
  }

  // PostgreSQL branch table ready: automatic seeding disabled for fresh registrations
  // Seed default user accounts into PostgreSQL only if bw_users is empty
  try {
    const pgUserCount = await pgPool.query("SELECT COUNT(*) as count FROM bw_users");
    if (pgUserCount && pgUserCount.rows && parseInt(pgUserCount.rows[0].count) === 0) {
      console.log("Seeding default administrative users into empty bw_users table (PostgreSQL)...");
      const defaultHash = bcrypt.hashSync('password123', 10);
      const defaultSeedUsers = [
        [1, 'manager@bakewise.com', defaultHash, 'Branch Manager', 'manager', 1],
        [2, 'sales@bakewise.com', defaultHash, 'Sales Staff', 'sales', 1],
        [3, 'inventory@bakewise.com', defaultHash, 'Inventory Specialist', 'inventory', 1],
        [4, 'production@bakewise.com', defaultHash, 'Baking Specialist', 'production', 1],
        [5, 'admin@bakewise.com', defaultHash, 'System Administrator', 'admin', null]
      ];
      for (const u of defaultSeedUsers) {
        await pgPool.query(
          'INSERT INTO bw_users (id, email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
          u
        );
      }
    } else {
      console.log(`Skipping Postgres user seeding: bw_users table already contains ${pgUserCount.rows[0].count} accounts.`);
    }
  } catch (err) {
    console.warn("⚠️ Postgres user seed notice:", err.message);
  }

  // Seed default products into PostgreSQL
  try {
    await pgPool.query(`
      INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe) VALUES
      ('p1', 'Pandesal (10pcs/pack)', 'Bread', 45.00, 18.00, 2, 'Garlic Croutons or Fine Breadcrumbs'),
      ('p2', 'Special Ensaymada', 'Pastries', 30.00, 12.00, 3, 'Baked Ensaymada Pudding'),
      ('p3', 'Classic Sliced Bread', 'Bread', 65.00, 28.00, 4, 'Cinnamon Bread Pudding or French Toast Sliders'),
      ('p4', 'Premium Chocolate Cake', 'Cakes', 380.00, 160.00, 5, 'Chocolate Truffle Cake Pops'),
      ('p5', 'Spanish Bread', 'Bread', 10.00, 4.00, 2, 'Bread Pudding Base'),
      ('p6', 'Butter Croissant', 'Pastries', 50.00, 22.00, 2, 'Double Baked Almond Croissants')
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (err) {
    console.warn("⚠️ Postgres product seed notice:", err.message);
  }

  // Seed reference branches and initial inventory into PostgreSQL if branches are empty
  try {
    let branches = await pgPool.query('SELECT id, name FROM bw_branches');
    if (branches.rows.length === 0) {
      console.log("Seeding reference branches: Main Branch, Lasang, Kibungsod...");
      await pgPool.query(`
        INSERT INTO bw_branches (name, address, contact_no, latitude, longitude, store_hours, status) VALUES
        ('Main Branch', 'San Pedro St., Poblacion, Davao City', '09171234567', 7.0736, 125.6110, '05:00 AM - 09:00 PM', 'Active'),
        ('Lasang', 'KM 23, Lasang, Davao City', '09181234567', 7.2136, 125.6810, '05:00 AM - 09:00 PM', 'Active'),
        ('Kibungsod', 'National Highway, Kibungsod, Magsaysay', '09191234567', 6.7836, 125.1810, '05:00 AM - 09:00 PM', 'Active');
      `);
      branches = await pgPool.query('SELECT id, name FROM bw_branches');
    }

    const prods = await pgPool.query('SELECT id FROM bw_products');
    for (const b of branches.rows) {
      for (const p of prods.rows) {
        const pIdStr = String(p.id).trim();
        const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
        const check = await pgPool.query(
          'SELECT id FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3',
          [pIdStr, altPid, b.id]
        );
        if (check.rows.length === 0) {
          let stock = 40;
          if (b.name === 'Main Branch' && pIdStr === 'p1') stock = 30;
          else if (b.name === 'Lasang' && pIdStr === 'p1') stock = 50;
          else if (b.name === 'Kibungsod' && pIdStr === 'p1') stock = 20;

          const prodDate = new Date().toISOString().split('T')[0];
          const expDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          await pgPool.query(
            'INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES ($1, $2, $3, $4, $5)',
            [pIdStr, stock, prodDate, expDate, b.id]
          );
        }
      }
    }
  } catch (err) {
    console.warn("⚠️ Postgres inventory auto-seed notice:", err.message);
  }

  // Reset SERIAL sequence values
  try {
    await pgPool.query(`SELECT setval('bw_branches_id_seq', COALESCE((SELECT MAX(id) FROM bw_branches), 1))`);
    await pgPool.query(`SELECT setval('bw_users_id_seq', COALESCE((SELECT MAX(id) FROM bw_users), 1))`);
  } catch (err) {
    console.warn("⚠️ Postgres sequence sync notice:", err.message);
  }

  console.log("Supabase / PostgreSQL database schema & seed initialization complete!");
  await healOrphanedBranchRecords();
}


// Auto-heal orphaned branch IDs pointing to deleted branches and synchronize financial totals
async function healOrphanedBranchRecords() {
  try {
    // 0. Ensure EXACTLY 1 sole branch exists: Lasang
    let allBr = await queryDb("SELECT id, name FROM bw_branches");
    let brRows = allBr.rows || [];
    let bLasang = brRows.find(b => b.name && b.name.toLowerCase().includes('lasang'));

    if (!bLasang) {
      try {
        await queryDb(
          "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          ['Lasang', 14.5995, 120.984, 'Daang Maharlika Hwy, Bunawan, Davao City, Davao del Sur', '5:00 AM – 10:00 PM', '09935981766', 'Active']
        );
      } catch (e) {}
      const res = await queryDb("SELECT id, name FROM bw_branches WHERE name LIKE '%Lasang%' ORDER BY id DESC LIMIT 1");
      bLasang = res.rows[0];
    }

    if (!bLasang) return;

    const lasangId = parseInt(bLasang.id);

    // 1. Permanently remove Tibungco and any non-Lasang branches
    try {
      await queryDb(`DELETE FROM bw_branches WHERE id != $1 OR LOWER(name) LIKE '%tibungco%'`, [lasangId]);
    } catch (e) { console.warn("Notice: Tibungco branch deletion:", e.message); }

    // 2. Permanently remove all accounts belonging to Tibungco / other branches
    try {
      await queryDb(
        `DELETE FROM bw_users WHERE (branch_id IS NOT NULL AND branch_id != $1) OR LOWER(email) IN ('roberto.gomez@bakewise.com', 'lorna.villanueva@bakewise.com', 'arnel.mendoza@bakewise.com', 'patricia.dizon@bakewise.com', 'kristine.ramos@bakewise.com')`,
        [lasangId]
      );
    } catch (e) { console.warn("Notice: Tibungco users deletion:", e.message); }

    // 3. Ensure exactly one Catalina Kato account is registered in bw_users as Sales Staff for Lasang (remove duplicates)
    try {
      await queryDb("DELETE FROM bw_users WHERE email = 'catalinekato@bakewise.com' OR (name = 'Catalina Kato' AND id != 86 AND email != 'catalina.kato@bakewise.com')");
      const catalinaHash = bcrypt.hashSync('password123', 10);
      try {
        await queryDb(
          "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON DUPLICATE KEY UPDATE name = 'Catalina Kato', role = 'sales', branch_id = $6",
          ['catalina.kato@bakewise.com', catalinaHash, 'Catalina Kato', 'sales', lasangId, lasangId]
        );
      } catch (e) {
        try {
          await queryDb(
            "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = 'Catalina Kato', role = 'sales', branch_id = $6",
            ['catalina.kato@bakewise.com', catalinaHash, 'Catalina Kato', 'sales', lasangId, lasangId]
          );
        } catch (e2) {}
      }
    } catch (e) { console.warn("Notice: Catalina Kato deduplication:", e.message); }

    // 4. Permanently delete all Tibungco data across all database tables
    try {
      await queryDb(`DELETE FROM bw_pos_transaction_items WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id != $1)`, [lasangId]);
      await queryDb(`DELETE FROM bw_pos_transactions WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_sales WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_inventory WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_production WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_waste WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_inventory_batches WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_inventory_movements WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_repurpose_logs WHERE branch_id != $1`, [lasangId]);
      await queryDb(`DELETE FROM bw_branch_products WHERE branch_id != $1`, [lasangId]);
    } catch (e) { console.warn("Notice: Tibungco tables data purge:", e.message); }

    // 5. Ensure Catalina Kato is the Cashier across all Lasang POS transactions & sales records
    try {
      await queryDb(`UPDATE bw_pos_transactions SET cashier = 'Catalina Kato' WHERE branch_id = $1`, [lasangId]);
      await queryDb(`UPDATE bw_sales SET cashier = 'Catalina Kato' WHERE branch_id = $1`, [lasangId]);
    } catch (e) { console.warn("Notice: set cashier Catalina Kato:", e.message); }

    // 6. Remove legacy duplicate test product 'p11' ('pandesal')
    try {
      await queryDb(`DELETE FROM bw_products WHERE id = 'p11' OR (LOWER(name) = 'pandesal' AND id != 'p1')`);
    } catch (e) { console.warn("Notice: p11 cleanup:", e.message); }

    // 6B. Ensure Coke (Beverages / Drinks) is registered in bw_products and assigned Lasang inventory
    try {
      try {
        await queryDb(`
          INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status)
          VALUES ('p7', 'Coke', 'Drinks', 25.00, 12.00, 90, 'N/A', NULL, 'pcs', 'Active')
          ON DUPLICATE KEY UPDATE name = 'Coke', category = 'Drinks', price = 25.00, cost = 12.00, shelf_life_days = 90
        `);
      } catch (eSql) {
        await queryDb(`
          INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status)
          VALUES ('p7', 'Coke', 'Drinks', 25.00, 12.00, 90, 'N/A', NULL, 'pcs', 'Active')
          ON CONFLICT (id) DO UPDATE SET name = 'Coke', category = 'Drinks', price = 25.00, cost = 12.00, shelf_life_days = 90
        `).catch(() => {});
      }

      // Ensure Coke inventory exists for Lasang
      const cokeInvCheck = await queryDb("SELECT id FROM bw_inventory WHERE product_id = 'p7' AND branch_id = $1", [lasangId]);
      if (!cokeInvCheck.rows || cokeInvCheck.rows.length === 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const expDateStr = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await queryDb(
          "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status, batch_id) VALUES ($1, $2, $3, $4, $5, 'pcs', 'In Stock', $6)",
          ['p7', 50, todayStr, expDateStr, lasangId, 'BAT-B212-p7-' + todayStr.replace(/-/g, '')]
        );
      }
    } catch (e) { console.warn("Notice: Coke catalog registration:", e.message); }

    // 7. Synchronize bw_waste cost to standard product unit costs
    try {
      await queryDb(`UPDATE bw_waste SET cost = 25.00 WHERE product_id = 'p1' AND cost = 50.00`);
      await queryDb(`UPDATE bw_waste SET cost = 18.00 WHERE product_id = 'p2' AND cost = 36.00`);
    } catch (e) { console.warn("Notice: waste cost sync:", e.message); }

    // 8. Consolidate bw_inventory to keep exactly 1 active stock row per product for Lasang
    try {
      await queryDb(`
        DELETE FROM bw_inventory 
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT MAX(id) as id 
            FROM bw_inventory 
            GROUP BY branch_id, product_id
          ) as latest_inv
        )
      `);
    } catch (e) { console.warn("Notice: inventory consolidation:", e.message); }

    // 9. Normalize SIM-POS- to POS- transaction numbers
    try {
      await queryDb(`
        UPDATE bw_pos_transactions
        SET transaction_number = REPLACE(transaction_number, 'SIM-POS-', 'POS-')
        WHERE transaction_number LIKE 'SIM-POS-%'
      `);
    } catch (e) { console.warn("Notice: transaction number normalization:", e.message); }

    // 10. Multi-day varied timestamps preserved (no static overwrite)

    // 11. Verify full transaction population for Lasang (target: 7,750 total across 31 days, 250/day, Cashier: Catalina Kato)
    try {
      const countRes = await queryDb(
        "SELECT COUNT(*) as count FROM bw_pos_transactions WHERE branch_id = $1 AND date >= '2026-10-14' AND date <= '2026-11-13' AND cashier = 'Catalina Kato'",
        [lasangId]
      );
      const totalCount = parseInt(countRes.rows[0]?.count || 0);
      // Check if timestamps are already varied across days (sample tx 1 and 250 on 10-14 vs 10-15)
      const sampleTxs = await queryDb(
        "SELECT date, created_at FROM bw_pos_transactions WHERE transaction_number LIKE '%-001' AND date IN ('2026-10-14', '2026-10-15') ORDER BY date ASC"
      );
      const timesDiffer = (sampleTxs.rows && sampleTxs.rows.length >= 2 && String(sampleTxs.rows[0].created_at).slice(-8) !== String(sampleTxs.rows[1].created_at).slice(-8));

      const sampleTxs250 = await queryDb(
        "SELECT date, created_at FROM bw_pos_transactions WHERE transaction_number LIKE '%-250' AND date IN ('2026-10-14', '2026-10-15') ORDER BY date ASC"
      );
      const timesDiffer250 = (sampleTxs250.rows && sampleTxs250.rows.length >= 2 && String(sampleTxs250.rows[0].created_at).slice(-8) !== String(sampleTxs250.rows[1].created_at).slice(-8));
      
      if (totalCount < 7500 || !timesDiffer || !timesDiffer250) {
        console.log(`[DATA HEALING] Reseeding with varied daily timestamps for Lasang (Cashier: Catalina Kato)...`);
        runAutoSeeder(queryDb, true).catch(err => console.error("Auto-seeder run error:", err.message));
      }
    } catch (e) { console.warn("Notice: transaction count verification:", e.message); }
  } catch (err) {
    console.warn("Notice: branch record alignment:", err.message);
  }
}

dbReadyPromise = setupDatabaseConnection();

// --- REST API ENDPOINTS ---

// 1. HEALTH & STATUS CHECK
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    system: 'BakeWise Bakery Management Enterprise',
    database_driver: activeDbDriver,
    dbConnection: activeDbDriver !== 'none' ? 'healthy' : 'disconnected',
    connectionStringUsed: activeDbDriver === 'mysql' ? 'MySQL Database (Railway / Local)' : 'PostgreSQL Database',
    timestamp: new Date().toISOString()
  });
});

// ADMINISTRATIVE TRIGGER TO ENSURE MASTER DEMO DATA IS FULLY POPULATED
app.all('/api/admin/seed-demo-data', async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.body?.force === true;
    console.log(`[ADMIN SEED] Triggered demo data seeding (force=${force}) on driver: ${activeDbDriver}...`);
    const result = await runAutoSeeder(queryDb, force);
    if (typeof clearApiCache === 'function') clearApiCache();
    res.json(result);
  } catch (err) {
    console.error('[ADMIN SEED ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ADMINISTRATIVE TRIGGER TO DIRECTLY APPLY VARIED DAILY TIMESTAMPS
app.all('/api/admin/apply-varied-timestamps', async (req, res) => {
  try {
    const branchRes = await queryDb("SELECT id FROM bw_branches WHERE LOWER(name) LIKE '%lasang%' LIMIT 1");
    if (!branchRes.rows || branchRes.rows.length === 0) {
      return res.status(404).json({ error: "Lasang branch not found" });
    }
    const lasangId = parseInt(branchRes.rows[0].id);

    console.log('[TIMESTAMP UPDATE] Applying unique varied timestamps for 31 days...');
    const updatedDays = [];

    for (let dayIdx = 0; dayIdx < DATES.length; dayIdx++) {
      const { dateStr } = DATES[dayIdx];
      const dayTimes = generateDayTimes(dayIdx, 250);

      // Fetch all transactions for this date ordered by id ASC
      const txsRes = await queryDb(
        "SELECT id, transaction_number FROM bw_pos_transactions WHERE branch_id = $1 AND date = $2 ORDER BY id ASC",
        [lasangId, dateStr]
      );
      const rows = txsRes.rows || [];
      if (rows.length === 0) continue;

      for (let i = 0; i < rows.length; i++) {
        const timeStr = dayTimes[i % 250];
        const newCreatedAt = `${dateStr} ${timeStr}`;
        await queryDb(
          "UPDATE bw_pos_transactions SET created_at = $1, cashier = 'Catalina Kato' WHERE id = $2",
          [newCreatedAt, rows[i].id]
        );
      }

      // Also align production and batches for that day
      const prodMin = 20 + ((dayIdx * 7 + 13) % 25);
      const prodSec = (dayIdx * 19 + 7) % 60;
      const prodTimeStr = `05:${String(prodMin).padStart(2, '0')}:${String(prodSec).padStart(2, '0')}`;
      const prodCreatedAt = `${dateStr} ${prodTimeStr}`;
      await queryDb("UPDATE bw_production SET created_at = $1 WHERE branch_id = $2 AND date = $3", [prodCreatedAt, lasangId, dateStr]).catch(() => {});
      await queryDb("UPDATE bw_inventory_batches SET created_at = $1, production_time = $2 WHERE branch_id = $3 AND production_date = $4", [prodCreatedAt, prodTimeStr, lasangId, dateStr]).catch(() => {});

      updatedDays.push({
        date: dateStr,
        txCount: rows.length,
        firstTxTime: dayTimes[0],
        lastTxTime: dayTimes[Math.min(rows.length - 1, 249)]
      });
    }

    if (typeof clearApiCache === 'function') clearApiCache();
    res.json({ success: true, updatedDaysCount: updatedDays.length, sampleDays: updatedDays.slice(0, 5) });
  } catch (err) {
    console.error('[TIMESTAMP UPDATE ERROR]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. AUTHENTICATION & LOGIN API
app.post('/api/auth/login', loginLimiter, async (req, res) => {
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

    let query = "SELECT * FROM bw_users WHERE (LOWER(email) = $1 OR LOWER(email) = $2)";
    let params = [email, aliasEmail];

    const result = await queryDb(query, params);

    if (result.rows && result.rows.length > 0) {
      const user = result.rows[0];

      if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const roleMap = {
        'sales': 'Sales Staff',
        'inventory': 'Inventory Specialist',
        'production': 'Baking Specialist',
        'manager': 'Branch Manager',
        'admin': 'System Administrator'
      };

      const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branch_id
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

      res.json({
        token,
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


// --- UNIFIED HIGH-SPEED BATCH SYNC API ---
app.get('/api/sync', async (req, res) => {
  await healOrphanedBranchRecords();
  const { branch_id } = req.query;
  const bId = (branch_id && branch_id !== 'all') ? parseInt(branch_id) : null;

  try {
    const branchesPromise = queryDb("SELECT * FROM bw_branches ORDER BY id ASC");
    const usersPromise = queryDb("SELECT id, email, name, role, branch_id FROM bw_users ORDER BY id ASC");
    const productsPromise = queryDb("SELECT * FROM bw_products ORDER BY id ASC");
    const inventoryPromise = queryDb("SELECT * FROM bw_inventory ORDER BY id ASC");

    const salesSql = bId
      ? "SELECT * FROM bw_sales WHERE branch_id = $1 ORDER BY date DESC, id DESC LIMIT 50000"
      : "SELECT * FROM bw_sales ORDER BY date DESC, id DESC LIMIT 50000";
    const salesParams = bId ? [bId] : [];
    const salesPromise = queryDb(salesSql, salesParams);

    const prodSql = bId
      ? "SELECT * FROM bw_production WHERE branch_id = $1 ORDER BY date DESC, id DESC LIMIT 10000"
      : "SELECT * FROM bw_production ORDER BY date DESC, id DESC LIMIT 10000";
    const prodParams = bId ? [bId] : [];
    const prodPromise = queryDb(prodSql, prodParams);

    const wasteSql = bId
      ? "SELECT * FROM bw_waste WHERE branch_id = $1 ORDER BY date DESC, id DESC LIMIT 5000"
      : "SELECT * FROM bw_waste ORDER BY date DESC, id DESC LIMIT 5000";
    const wasteParams = bId ? [bId] : [];
    const wastePromise = queryDb(wasteSql, wasteParams);

    const movSql = bId
      ? "SELECT * FROM bw_inventory_movements WHERE branch_id = $1 ORDER BY created_at DESC LIMIT 2000"
      : "SELECT * FROM bw_inventory_movements ORDER BY created_at DESC LIMIT 2000";
    const movParams = bId ? [bId] : [];
    const movementsPromise = queryDb(movSql, movParams);

    const [branchesRes, usersRes, productsRes, salesRes, inventoryRes, prodRes, wasteRes, movementsRes] = await Promise.all([
      branchesPromise,
      usersPromise,
      productsPromise,
      salesPromise,
      inventoryPromise,
      prodPromise,
      wastePromise,
      movementsPromise
    ]);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      branches: branchesRes.rows || [],
      users: usersRes.rows || [],
      products: productsRes.rows || [],
      sales: salesRes.rows || [],
      inventory: inventoryRes.rows || [],
      production: prodRes.rows || [],
      waste: wasteRes.rows || [],
      movements: movementsRes.rows || []
    });
  } catch (err) {
    console.error("[SYNC API ERROR]", err);
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
  const { name, latitude, longitude, address, store_hours, contact_no } = req.body;
  const cleanContact = (contact_no ? String(contact_no).trim() : '');
  const phContactRegex = /^(09\d{9}|639\d{9})$/;
  if (!cleanContact || !phContactRegex.test(cleanContact)) {
    return res.status(400).json({ error: "Please enter a valid Philippine contact number using numbers only." });
  }
  try {
    const result = await queryDb(
      "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *",
      [name, parseFloat(latitude), parseFloat(longitude), address, store_hours, cleanContact]
    );
    const branchRecord = (result.rows && result.rows[0]) ? result.rows[0] : null;
    const branchId = branchRecord ? branchRecord.id : null;

    if (branchId) {
      // Initialize inventory for all active products for the newly created branch
      const prodsRes = await queryDb("SELECT id FROM bw_products");
      const today = new Date().toISOString().split('T')[0];
      const expiry = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      for (const p of (prodsRes.rows || [])) {
        const pIdStr = String(p.id).trim();
        const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
        const check = await queryDb(
          "SELECT id FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3",
          [pIdStr, altPid, branchId]
        );
        if (!check.rows || check.rows.length === 0) {
          await queryDb(
            "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES ($1, $2, $3, $4, $5)",
            [pIdStr, 35, today, expiry, branchId]
          );
        }
      }
      await healOrphanedBranchRecords();
    }

    clearApiCache();
    res.status(201).json(result.rows[0] || { name, latitude, longitude, address, store_hours, contact_no: cleanContact, status: 'Active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, address, store_hours, contact_no, status } = req.body;
  const cleanContact = (contact_no ? String(contact_no).trim() : '');
  const phContactRegex = /^(09\d{9}|639\d{9})$/;
  if (!cleanContact || !phContactRegex.test(cleanContact)) {
    return res.status(400).json({ error: "Please enter a valid Philippine contact number using numbers only." });
  }
  try {
    await queryDb(
      "UPDATE bw_branches SET name = $1, latitude = $2, longitude = $3, address = $4, store_hours = $5, contact_no = $6, status = $7 WHERE id = $8",
      [name, parseFloat(latitude), parseFloat(longitude), address, store_hours, cleanContact, status || 'Active', parseInt(id)]
    );
    clearApiCache();
    res.json({ success: true, id, name, latitude, longitude, address, store_hours, contact_no: cleanContact, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/branches/:id', async (req, res) => {
  const { id } = req.params;
  const branchId = parseInt(id);
  if (isNaN(branchId)) {
    return res.status(400).json({ error: "Invalid branch ID" });
  }

  try {
    // 1. Verify branch exists
    const checkBranch = await queryDb("SELECT id, name FROM bw_branches WHERE id = $1", [branchId]);
    if (!checkBranch || !checkBranch.rows || checkBranch.rows.length === 0) {
      return res.status(404).json({ error: `Branch ID ${branchId} does not exist.` });
    }

    if (activeDbDriver === 'pg' && pgPool) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');

        // 1. Delete POS transaction items belonging to POS transactions of this branch
        await client.query(`
          DELETE FROM bw_pos_transaction_items 
          WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id = $1)
        `, [branchId]);

        // 2. Delete POS transactions belonging to this branch
        await client.query('DELETE FROM bw_pos_transactions WHERE branch_id = $1', [branchId]);

        // 3. Delete Sales records belonging to this branch
        await client.query('DELETE FROM bw_sales WHERE branch_id = $1', [branchId]);

        // 4. Delete Inventory / Stock records belonging to this branch
        await client.query('DELETE FROM bw_inventory WHERE branch_id = $1', [branchId]);

        // 5. Delete Production batches and records belonging to this branch
        await client.query('DELETE FROM bw_production WHERE branch_id = $1', [branchId]);

        // 6. Delete Waste records belonging to this branch
        await client.query('DELETE FROM bw_waste WHERE branch_id = $1', [branchId]);

        // 7. Delete Repurpose logs belonging to this branch (if table exists)
        await client.query('DELETE FROM bw_repurpose_logs WHERE branch_id = $1', [branchId]).catch(() => {});

        // 8. Delete all staff accounts assigned to this branch, strictly excluding the System Administrator
        await client.query(`
          DELETE FROM bw_users 
          WHERE branch_id = $1 
            AND role != 'admin' 
            AND email != 'admin@bakewise.com'
        `, [branchId]);

        // Clear branch_id for any admin accounts that were associated with this branch
        await client.query(`
          UPDATE bw_users 
          SET branch_id = NULL 
          WHERE branch_id = $1
        `, [branchId]);

        // 9. Delete the branch itself
        await client.query('DELETE FROM bw_branches WHERE id = $1', [branchId]);

        await client.query('COMMIT');
      } catch (dbErr) {
        await client.query('ROLLBACK');
        throw dbErr;
      } finally {
        client.release();
      }
    } else if (activeDbDriver === 'mysql' && mysqlPool) {
      const conn = await mysqlPool.getConnection();
      try {
        await conn.beginTransaction();

        // 1. Delete POS transaction items
        await conn.query(`
          DELETE FROM bw_pos_transaction_items 
          WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id = ?)
        `, [branchId]);

        // 2. Delete POS transactions
        await conn.query('DELETE FROM bw_pos_transactions WHERE branch_id = ?', [branchId]);

        // 3. Delete Sales
        await conn.query('DELETE FROM bw_sales WHERE branch_id = ?', [branchId]);

        // 4. Delete Inventory / Stock
        await conn.query('DELETE FROM bw_inventory WHERE branch_id = ?', [branchId]);

        // 5. Delete Production
        await conn.query('DELETE FROM bw_production WHERE branch_id = ?', [branchId]);

        // 6. Delete Waste
        await conn.query('DELETE FROM bw_waste WHERE branch_id = ?', [branchId]);

        // 7. Delete Repurpose logs
        await conn.query('DELETE FROM bw_repurpose_logs WHERE branch_id = ?', [branchId]).catch(() => {});

        // 8. Delete staff accounts, strictly protecting System Administrator
        await conn.query(`
          DELETE FROM bw_users 
          WHERE branch_id = ? 
            AND role != 'admin' 
            AND email != 'admin@bakewise.com'
        `, [branchId]);

        // Clear branch_id for any admin
        await conn.query(`
          UPDATE bw_users 
          SET branch_id = NULL 
          WHERE branch_id = ?
        `, [branchId]);

        // 9. Delete the branch itself
        await conn.query('DELETE FROM bw_branches WHERE id = ?', [branchId]);

        await conn.commit();
      } catch (dbErr) {
        await conn.rollback();
        throw dbErr;
      } finally {
        conn.release();
      }
    } else {
      // Fallback driver execution
      await queryDb('DELETE FROM bw_pos_transaction_items WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id = $1)', [branchId]);
      await queryDb('DELETE FROM bw_pos_transactions WHERE branch_id = $1', [branchId]);
      await queryDb('DELETE FROM bw_sales WHERE branch_id = $1', [branchId]);
      await queryDb('DELETE FROM bw_inventory WHERE branch_id = $1', [branchId]);
      await queryDb('DELETE FROM bw_production WHERE branch_id = $1', [branchId]);
      await queryDb('DELETE FROM bw_waste WHERE branch_id = $1', [branchId]);
      await queryDb('DELETE FROM bw_repurpose_logs WHERE branch_id = $1', [branchId]).catch(() => {});
      await queryDb("DELETE FROM bw_users WHERE branch_id = $1 AND role != 'admin' AND email != 'admin@bakewise.com'", [branchId]);
      await queryDb("UPDATE bw_users SET branch_id = NULL WHERE branch_id = $1", [branchId]);
      await queryDb('DELETE FROM bw_branches WHERE id = $1', [branchId]);
    }

    clearApiCache();
    console.log(`[BRANCH DELETION] Permanently deleted branch ID ${branchId} and all associated data.`);
    res.json({
      success: true,
      message: "Branch and all associated data have been successfully deleted."
    });
  } catch (err) {
    console.error("Complete branch deletion error:", err);
    res.status(500).json({ error: err.message || "Failed to delete branch and associated records." });
  }
});

app.delete('/api/branches', async (req, res) => {
  try {
    // Preserve staff accounts by updating branch_id to NULL
    await queryDb("UPDATE bw_users SET branch_id = NULL");

    // Clear all existing branch registrations
    await queryDb("DELETE FROM bw_branches");

    // Reset sequence if supported
    if (activeDbDriver === 'pg' && pgPool) {
      await pgPool.query("ALTER SEQUENCE IF EXISTS bw_branches_id_seq RESTART WITH 1").catch(() => {});
    } else if (activeDbDriver === 'mysql' && mysqlPool) {
      await mysqlPool.query("ALTER TABLE bw_branches AUTO_INCREMENT = 1").catch(() => {});
    }

    clearApiCache();
    console.log("[BRANCH RESET] Cleared all registered branches. Ready for fresh registrations.");
    res.json({
      success: true,
      message: "All branch registrations have been cleared."
    });
  } catch (err) {
    console.error("Branch reset error:", err);
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
  let { name, email, password, role, branch_id } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required.' });
  }
  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = (role || '').trim().toLowerCase();

    // Strict branch assignment enforcement:
    // System Administrators have global access and branch_id is strictly NULL
    // Non-administrator staff accounts require a valid existing branch assignment
    let bId = null;
    if (cleanRole === 'admin') {
      bId = null;
    } else {
      if (!branch_id || branch_id === 'all' || isNaN(parseInt(branch_id))) {
        return res.status(400).json({ error: 'Assigned bakeshop branch is required for staff accounts.' });
      }
      bId = parseInt(branch_id);
      const branchCheck = await queryDb("SELECT id FROM bw_branches WHERE id = $1", [bId]);
      if (!branchCheck.rows || branchCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid branch ID specified. Please select an existing branch.' });
      }
    }

    const hashedPassword = bcrypt.hashSync(password.trim(), 10);
    const result = await queryDb(
      "INSERT INTO bw_users (name, email, password, role, branch_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, branch_id",
      [name.trim(), cleanEmail, hashedPassword, role, bId]
    );
    clearApiCache();
    console.log(`[USER CREATED] Registered new user account: ${cleanEmail} (Role: ${role}, Branch: ${bId})`);
    res.status(201).json(result.rows[0] || { name, email: cleanEmail, role, branch_id: bId });
  } catch (err) {
    console.error("[USER CREATION ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  let { name, email, password, role, branch_id } = req.body;
  try {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanRole = (role || '').trim().toLowerCase();

    // Check if target user exists and whether protected primary admin
    const target = await queryDb("SELECT id, email, role, name FROM bw_users WHERE id = $1", [parseInt(id)]);
    if (!target.rows || target.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    const existingUser = target.rows[0];
    if (existingUser.email === 'admin@bakewise.com' && cleanRole !== 'admin') {
      return res.status(403).json({ error: 'The primary System Administrator role cannot be changed.' });
    }

    // Strict branch assignment enforcement:
    // System Administrators have global access and branch_id is strictly NULL
    // Non-administrator staff accounts require a valid existing branch assignment
    let bId = null;
    if (cleanRole === 'admin') {
      bId = null;
    } else {
      if (!branch_id || branch_id === 'all' || isNaN(parseInt(branch_id))) {
        return res.status(400).json({ error: 'Assigned bakeshop branch is required for staff accounts.' });
      }
      bId = parseInt(branch_id);
      const branchCheck = await queryDb("SELECT id FROM bw_branches WHERE id = $1", [bId]);
      if (!branchCheck.rows || branchCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid branch ID specified. Please select an existing branch.' });
      }
    }

    let query = "UPDATE bw_users SET name = $1, email = $2, role = $3, branch_id = $4";
    let params = [name ? name.trim() : existingUser.name, cleanEmail || existingUser.email, role, bId];
    if (password && password.trim() !== "") {
      const hashedPassword = bcrypt.hashSync(password.trim(), 10);
      query += ", password = $5 WHERE id = $6";
      params.push(hashedPassword, parseInt(id));
      console.log(`[USER UPDATE] Successfully updated password and profile for user ID: ${id} (${cleanEmail})`);
    } else {
      query += " WHERE id = $5";
      params.push(parseInt(id));
      console.log(`[USER UPDATE] Successfully updated profile (password preserved) for user ID: ${id} (${cleanEmail})`);
    }
    await queryDb(query, params);
    clearApiCache();
    res.json({ success: true, id: parseInt(id), name: params[0], email: cleanEmail || existingUser.email, role, branch_id: bId });
  } catch (err) {
    console.error("[USER UPDATE ERROR]", err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const target = await queryDb("SELECT id, email, role FROM bw_users WHERE id = $1", [parseInt(id)]);
    if (target.rows && target.rows.length > 0) {
      const u = target.rows[0];
      if (u.email === 'admin@bakewise.com') {
        return res.status(403).json({ error: 'The primary System Administrator account is protected and cannot be deleted.' });
      }
    }
    await queryDb("DELETE FROM bw_users WHERE id = $1", [parseInt(id)]);
    clearApiCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. PRODUCTS API (BRANCH-SPECIFIC & GLOBAL CATALOG)
app.get('/api/products', async (req, res) => {
  const { branch_id, category, status, search } = req.query;
  try {
    if (req.user && req.user.role !== 'admin') {
      if (branch_id && branch_id !== 'all' && parseInt(branch_id) !== parseInt(req.user.branchId)) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to view products for this branch." });
      }
    }

    const effectiveBranchId = (req.user && req.user.role !== 'admin')
      ? req.user.branchId
      : (branch_id && branch_id !== 'all' ? parseInt(branch_id) : null);

    let query = `
      SELECT p.*, b.name as branch_name 
      FROM bw_products p
      LEFT JOIN bw_branches b ON p.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      params.push(effectiveBranchId);
      query += ` AND (p.branch_id = $${params.length} OR p.branch_id IS NULL)`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND LOWER(p.category) = LOWER($${params.length})`;
    }

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND LOWER(p.status) = LOWER($${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND LOWER(p.name) LIKE $${params.length}`;
    }

    query += " ORDER BY p.name ASC, p.id ASC";
    const result = await queryDb(query, params);

    // Apply branch product overrides if branch is specified
    if (effectiveBranchId && result.rows) {
      const overrides = await queryDb("SELECT * FROM bw_branch_products WHERE branch_id = $1", [effectiveBranchId]);
      if (overrides.rows && overrides.rows.length > 0) {
        const overrideMap = new Map();
        overrides.rows.forEach(o => overrideMap.set(String(o.product_id), o));

        result.rows = result.rows.map(prod => {
          const ov = overrideMap.get(String(prod.id));
          if (!ov) return prod;
          return {
            ...prod,
            name: ov.custom_name || prod.name,
            category: ov.category || prod.category,
            price: ov.price !== undefined ? parseFloat(ov.price) : prod.price,
            cost: ov.cost !== undefined ? parseFloat(ov.cost) : prod.cost,
            shelf_life_days: ov.shelf_life_days !== undefined ? ov.shelf_life_days : prod.shelf_life_days,
            repurpose_recipe: ov.repurpose_recipe !== undefined ? ov.repurpose_recipe : prod.repurpose_recipe,
            unit: ov.unit || prod.unit,
            status: ov.status || prod.status
          };
        }).filter(p => p.status !== 'Inactive' || status === 'Inactive' || status === 'all');
      }
    }

    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', async (req, res) => {
  const { id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status, description, initial_stock } = req.body;
  if (!name || price == null) {
    return res.status(400).json({ error: "Product name and price are required." });
  }

  let targetBranchId = (branch_id && branch_id !== 'all') ? parseInt(branch_id) : null;
  if (req.user && req.user.role !== 'admin') {
    if (targetBranchId && targetBranchId !== parseInt(req.user.branchId)) {
      return res.status(403).json({ error: "Forbidden: You cannot create products for other branches." });
    }
    targetBranchId = req.user.branchId;
  }

  try {
    const prodId = id || "p" + Date.now();
    const prodUnit = unit || 'pcs';
    const prodStatus = status || 'Active';
    const shelfDays = parseInt(shelf_life_days) || 2;
    const numPrice = parseFloat(price);
    const numCost = parseFloat(cost) || 0;

    await queryDb(
      `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [prodId, name, category, numPrice, numCost, shelfDays, repurpose_recipe || '', targetBranchId, prodUnit, prodStatus, description || '']
    );

    // Initial stock injection if provided (assign to target branch or Lasang)
    const initQty = parseInt(initial_stock) || 0;
    if (initQty > 0) {
      const activeBranchId = targetBranchId || (await queryDb("SELECT id FROM bw_branches WHERE status = 'Active' ORDER BY id ASC LIMIT 1")).rows[0]?.id || 212;
      const todayStr = new Date().toISOString().split('T')[0];
      const expDateStr = new Date(Date.now() + shelfDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      await queryDb(
        `INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'In Stock')`,
        [prodId, initQty, todayStr, expDateStr, activeBranchId, prodUnit]
      );

      await queryDb(
        `INSERT INTO bw_inventory_movements (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reason, performed_by, status)
         VALUES ('Stock In', $1, $2, $3, 0, $3, $4, 'Initial Product Stock', $5, 'Completed')`,
        [activeBranchId, prodId, initQty, prodUnit, req.user ? (req.user.name || req.user.email) : 'System']
      );
    }

    clearApiCache();
    res.status(201).json({
      id: prodId,
      name,
      category,
      price: numPrice,
      cost: numCost,
      shelf_life_days: shelfDays,
      repurpose_recipe: repurpose_recipe || '',
      branch_id: targetBranchId,
      unit: prodUnit,
      status: prodStatus,
      description: description || ''
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status, description } = req.body;
  try {
    const existing = await queryDb("SELECT * FROM bw_products WHERE id = $1", [id]);
    if (!existing.rows || existing.rows.length === 0) {
      return res.status(404).json({ error: "Product not found." });
    }

    const curProd = existing.rows[0];
    if (req.user && req.user.role !== 'admin') {
      if (curProd.branch_id && parseInt(curProd.branch_id) !== parseInt(req.user.branchId)) {
        return res.status(403).json({ error: "Forbidden: You cannot modify products belonging to another branch." });
      }
    }

    const targetBranchId = branch_id !== undefined ? (branch_id && branch_id !== 'all' ? parseInt(branch_id) : null) : curProd.branch_id;
    const prodUnit = unit || curProd.unit || 'pcs';
    const prodStatus = status || curProd.status || 'Active';

    await queryDb(
      `UPDATE bw_products SET 
        name = $1, category = $2, price = $3, cost = $4, shelf_life_days = $5, 
        repurpose_recipe = $6, branch_id = $7, unit = $8, status = $9, description = $10 
       WHERE id = $11`,
      [
        name !== undefined ? name : curProd.name,
        category !== undefined ? category : curProd.category,
        price !== undefined ? parseFloat(price) : curProd.price,
        cost !== undefined ? parseFloat(cost) : curProd.cost,
        shelf_life_days !== undefined ? parseInt(shelf_life_days) : curProd.shelf_life_days,
        repurpose_recipe !== undefined ? repurpose_recipe : curProd.repurpose_recipe,
        targetBranchId,
        prodUnit,
        prodStatus,
        description !== undefined ? description : curProd.description,
        id
      ]
    );

    clearApiCache();
    res.json({ id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id: targetBranchId, unit: prodUnit, status: prodStatus });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await queryDb("SELECT * FROM bw_products WHERE id = $1", [id]);
    if (existing.rows && existing.rows.length > 0) {
      const curProd = existing.rows[0];
      if (req.user && req.user.role !== 'admin') {
        if (curProd.branch_id && parseInt(curProd.branch_id) !== parseInt(req.user.branchId)) {
          return res.status(403).json({ error: "Forbidden: You cannot delete products belonging to another branch." });
        }
      }
    }
    await queryDb("DELETE FROM bw_products WHERE id = $1", [id]);
    clearApiCache();
    res.json({ success: true });
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
  const { product_id, qty, price, date, cashier, branch_id, created_at } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const phNow = getPhilippineNow();
    const saleDate = date || phNow.date;
    const saleCreatedAt = created_at || phNow.datetime;
    const activeCashier = cashier || 'Catalina Kato';
    const result = await queryDb(
      "INSERT INTO bw_sales (product_id, qty, price, date, cashier, branch_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [product_id, parseInt(qty || 1), parseFloat(price || 0), saleDate, activeCashier, bId, saleCreatedAt]
    );
    clearApiCache();
    res.status(201).json(result.rows[0] || { product_id, qty, price, date, cashier, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- REAL-TIME POINT OF SALE (POS) API ENDPOINTS ---

// 1. GET ALL POS TRANSACTIONS (WITH ITEMIZED PRODUCTS)
app.get('/api/pos/transactions', async (req, res) => {
  const { branch_id, date, payment_method, status, search, limit } = req.query;
  try {
    let query = "SELECT * FROM bw_pos_transactions";
    let params = [];
    let conditions = [];

    if (branch_id && branch_id !== 'all') {
      params.push(parseInt(branch_id));
      conditions.push(`branch_id = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`date = $${params.length}`);
    }
    if (payment_method && payment_method !== 'all') {
      params.push(payment_method);
      conditions.push(`payment_method = $${params.length}`);
    }
    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY date DESC, id DESC";

    const maxLimit = limit === 'all' ? null : (parseInt(limit) || 1000);
    if (maxLimit) {
      params.push(maxLimit);
      query += ` LIMIT $${params.length}`;
    }

    const txResult = await queryDb(query, params);
    const transactions = txResult.rows || [];

    if (transactions.length > 0) {
      const txIds = transactions.map(t => t.id);
      let items = [];
      const chunkSize = 500;
      for (let i = 0; i < txIds.length; i += chunkSize) {
        const chunk = txIds.slice(i, i + chunkSize);
        const placeholders = chunk.map((_, idx) => `$${idx + 1}`).join(',');
        const itemsResult = await queryDb(
          `SELECT ti.*, p.name as product_name, p.category as product_category 
           FROM bw_pos_transaction_items ti 
           LEFT JOIN bw_products p ON ti.product_id = p.id 
           WHERE ti.transaction_id IN (${placeholders})`,
          chunk
        );
        items.push(...(itemsResult.rows || []));
      }

      const itemsByTx = new Map();
      items.forEach(item => {
        if (!itemsByTx.has(item.transaction_id)) itemsByTx.set(item.transaction_id, []);
        itemsByTx.get(item.transaction_id).push(item);
      });

      transactions.forEach(t => {
        t.items = itemsByTx.get(t.id) || [];
        t.items_count = t.items.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 0), 0);
      });
    }

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET SINGLE POS TRANSACTION DETAILS
app.get('/api/pos/transactions/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const txResult = await queryDb("SELECT * FROM bw_pos_transactions WHERE id = $1 OR transaction_number = $2", [parseInt(id) || 0, id]);
    if (!txResult.rows || txResult.rows.length === 0) {
      return res.status(404).json({ error: "POS Transaction not found" });
    }
    const tx = txResult.rows[0];

    const itemsResult = await queryDb(
      `SELECT ti.*, p.name as product_name, p.category as product_category 
       FROM bw_pos_transaction_items ti 
       LEFT JOIN bw_products p ON ti.product_id = p.id 
       WHERE ti.transaction_id = $1`,
      [tx.id]
    );
    tx.items = itemsResult.rows || [];
    tx.items_count = tx.items.reduce((acc, curr) => acc + curr.quantity, 0);

    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POS CHECKOUT (ATOMIC TRANSACTION: VERIFY STOCK -> INSERT TX -> INSERT ITEMS -> DEDUCT INVENTORY -> RECORD SALES)
app.post('/api/pos/checkout', async (req, res) => {
  const { items, branch_id, cashier, cashier_name, subtotal, discount, total, payment_amount, change_amount, payment_method, date } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: "Please add products before proceeding to checkout.", message: "Please add products before proceeding to checkout." });
  }

  const bId = branch_id ? parseInt(branch_id) : 1;
  const phNow = getPhilippineNow();
  const txDate = date || phNow.date;
  const activeCashier = cashier_name || cashier || 'Catalina Kato';
  const txCreatedAt = req.body.created_at || phNow.datetime;
  const payMethod = payment_method || 'Cash';
  const numSubtotal = parseFloat(subtotal || 0);
  const numDiscount = parseFloat(discount || 0);
  const numTotal = Math.max(0, numSubtotal - numDiscount);
  const numPayment = parseFloat(payment_amount != null ? payment_amount : numTotal);
  const numChange = parseFloat(change_amount != null ? change_amount : Math.max(0, numPayment - numTotal));

  try {
    // 1. Verify branch exists
    const branchRes = await queryDb("SELECT id, name FROM bw_branches WHERE id = $1", [bId]);
    if (!branchRes.rows || branchRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Selected branch does not exist or has been removed. Please select an active branch.",
        message: "Selected branch does not exist or has been removed. Please select an active branch."
      });
    }
    const branchName = branchRes.rows[0].name;

    // 2. Validate Payment
    if (payMethod === 'Cash' && numPayment < numTotal) {
      return res.status(400).json({
        success: false,
        error: "Cash tendered is insufficient.",
        message: "Cash tendered is insufficient."
      });
    }

    // 3. STRICT BRANCH INVENTORY VALIDATION (Never deduct from other branches)
    for (const item of items) {
      const pIdStr = String(item.product_id).trim();
      const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
      const reqQty = parseInt(item.quantity) || 1;

      const invCheck = await queryDb(
        "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3 ORDER BY id ASC",
        [pIdStr, altPid, bId]
      );
      const currentStock = (invCheck.rows && invCheck.rows.length > 0)
        ? invCheck.rows.reduce((sum, row) => sum + (parseInt(row.stock_level) || 0), 0)
        : 0;

      if (currentStock < reqQty) {
        const pRes = await queryDb("SELECT name FROM bw_products WHERE id = $1 OR id = $2", [pIdStr, altPid]);
        const pName = (pRes.rows && pRes.rows.length > 0) ? pRes.rows[0].name : (item.product_name || item.product_id);
        return res.status(400).json({
          success: false,
          error: `Insufficient stock. Only ${currentStock} units are available for ${pName} at ${branchName}.`,
          message: `Insufficient stock. Only ${currentStock} units are available for ${pName} at ${branchName}.`
        });
      }
    }

    // 4. GENERATE UNIQUE TRANSACTION NUMBER (POS-YYYYMMDD-###-XXX)
    const dateFormatted = txDate.replace(/-/g, '');
    const countRes = await queryDb("SELECT COUNT(*) as cnt FROM bw_pos_transactions WHERE date = $1", [txDate]);
    const cntVal = countRes.rows && countRes.rows[0] ? (countRes.rows[0].cnt || countRes.rows[0].count || 0) : 0;
    const nextSeq = String(parseInt(cntVal) + 1).padStart(3, '0');
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const txNumber = `POS-${dateFormatted}-${nextSeq}-${randomSuffix}`;

    // 5. INSERT POS TRANSACTION HEADER WITH ACCURATE PHILIPPINE DATE & TIME
    const txInsert = await queryDb(
      `INSERT INTO bw_pos_transactions 
       (transaction_number, branch_id, cashier, subtotal, discount, total, payment_amount, change_amount, payment_method, status, date, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Completed', $10, $11) RETURNING *`,
      [
        txNumber,
        bId,
        activeCashier,
        numSubtotal,
        numDiscount,
        numTotal,
        numPayment,
        numChange,
        payMethod,
        txDate,
        txCreatedAt
      ]
    );

    const createdTx = (txInsert.rows && txInsert.rows[0]) ? txInsert.rows[0] : {
      transaction_number: txNumber,
      branch_id: bId,
      branch_name: branchName,
      cashier: activeCashier,
      subtotal: numSubtotal,
      discount: numDiscount,
      total: numTotal,
      payment_amount: numPayment,
      change_amount: numChange,
      payment_method: payMethod,
      status: 'Completed',
      date: txDate,
      created_at: txCreatedAt
    };
    if (!createdTx.created_at) createdTx.created_at = txCreatedAt;
    createdTx.branch_name = branchName;
    const txId = createdTx.id || Date.now();

    // 6. PROCESS ITEMS: INSERT TRANSACTION ITEMS, DEDUCT STRICTLY FROM BRANCH INVENTORY, RECORD SALES
    const createdItems = [];
    const lowStockWarnings = [];

    for (const item of items) {
      const pIdStr = String(item.product_id).trim();
      const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
      const qty = parseInt(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const itemSubtotal = parseFloat(item.subtotal != null ? item.subtotal : (qty * unitPrice));

      // A. Insert Item Record
      await queryDb(
        `INSERT INTO bw_pos_transaction_items (transaction_id, product_id, quantity, unit_price, subtotal) 
         VALUES ($1, $2, $3, $4, $5)`,
        [txId, pIdStr, qty, unitPrice, itemSubtotal]
      );
      
      const pRes = await queryDb("SELECT name, category FROM bw_products WHERE id = $1 OR id = $2", [pIdStr, altPid]);
      const pName = (pRes.rows && pRes.rows[0]) ? pRes.rows[0].name : (item.product_name || item.product_id);
      const pCat = (pRes.rows && pRes.rows[0]) ? pRes.rows[0].category : 'Bread';

      createdItems.push({
        product_id: pIdStr,
        product_name: pName,
        product_category: pCat,
        quantity: qty,
        unit_price: unitPrice,
        subtotal: itemSubtotal
      });

      // B. Deduct Inventory Stock strictly from this branch's inventory records
      const invRows = await queryDb(
        "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3 ORDER BY id ASC",
        [pIdStr, altPid, bId]
      );

      let remainingToDeduct = qty;
      let totalRemainingStock = 0;
      let initialTotalStock = 0;
      let itemUnit = item.unit || (pRes.rows && pRes.rows[0] && pRes.rows[0].unit) || 'pcs';

      for (const row of (invRows.rows || [])) {
        const rowStock = parseInt(row.stock_level) || 0;
        if (row.unit) itemUnit = row.unit;
        initialTotalStock += rowStock;
        if (remainingToDeduct > 0 && rowStock > 0) {
          const deductNow = Math.min(rowStock, remainingToDeduct);
          const newLevel = rowStock - deductNow;
          await queryDb("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [newLevel, row.id]);
          remainingToDeduct -= deductNow;
          totalRemainingStock += newLevel;
        } else {
          totalRemainingStock += rowStock;
        }
      }

      if (totalRemainingStock <= 10) {
        lowStockWarnings.push({ product_id: pIdStr, product_name: pName, remaining_stock: totalRemainingStock });
      }

      // Record in bw_inventory_movements (Stock movement audit trail)
      await queryDb(
        `INSERT INTO bw_inventory_movements 
         (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reference_id, reason, performed_by, status, created_at)
         VALUES ('Sale Deduction', $1, $2, $3, $4, $5, $6, $7, 'POS Sale', $8, 'Completed', $9)`,
        [bId, pIdStr, -qty, initialTotalStock, totalRemainingStock, itemUnit, txNumber, activeCashier, txCreatedAt]
      );

      // C. Record in bw_sales (Preserving legacy analytics)
      await queryDb(
        "INSERT INTO bw_sales (product_id, qty, price, date, cashier, branch_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [pIdStr, qty, unitPrice, txDate, activeCashier, bId, txCreatedAt]
      );
    }

    createdTx.items = createdItems;

    clearApiCache();
    res.status(201).json({
      success: true,
      message: "Sale completed successfully!",
      transaction: createdTx,
      low_stock_warnings: lowStockWarnings,
      lowStockWarnings
    });
  } catch (err) {
    console.error("[POS CHECKOUT ERROR]:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Failed to process POS checkout",
      message: err.message || "Failed to process POS checkout"
    });
  }
});

// 4. VOID POS TRANSACTION (RESTORES INVENTORY)
app.post('/api/pos/void/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const txRes = await queryDb("SELECT * FROM bw_pos_transactions WHERE id = $1 OR transaction_number = $2", [parseInt(id) || 0, id]);
    if (!txRes.rows || txRes.rows.length === 0) {
      return res.status(404).json({ error: "POS Transaction not found" });
    }
    const tx = txRes.rows[0];
    if (tx.status === 'Voided') {
      return res.status(400).json({ error: "Transaction is already voided." });
    }

    // Update status to Voided
    await queryDb("UPDATE bw_pos_transactions SET status = 'Voided' WHERE id = $1", [tx.id]);

    // Fetch items and restore inventory
    const itemsRes = await queryDb("SELECT * FROM bw_pos_transaction_items WHERE transaction_id = $1", [tx.id]);
    const items = itemsRes.rows || [];

    for (const item of items) {
      const pIdStr = String(item.product_id).trim();
      const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : ('p' + pIdStr);
      const invCheck = await queryDb(
        "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3 ORDER BY id ASC LIMIT 1",
        [pIdStr, altPid, tx.branch_id]
      );
      if (invCheck.rows && invCheck.rows.length > 0) {
        const curStock = parseInt(invCheck.rows[0].stock_level);
        const restoredStock = curStock + parseInt(item.quantity);
        const itemUnit = (invCheck.rows[0] && invCheck.rows[0].unit) || item.unit || 'pcs';
        await queryDb("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [restoredStock, invCheck.rows[0].id]);

        // Log movement for void restoration
        await queryDb(
          `INSERT INTO bw_inventory_movements 
           (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reference_id, reason, performed_by, status)
           VALUES ('Manual Adjustment', $1, $2, $3, $4, $5, $6, $7, 'POS Void Restoration', 'Manager', 'Completed')`,
          [tx.branch_id, pIdStr, parseInt(item.quantity), curStock, restoredStock, itemUnit, tx.transaction_number]
        );
      }
    }

    clearApiCache();

    res.json({ success: true, message: `Transaction ${tx.transaction_number} has been voided and inventory restored.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. REPURPOSE BATCH ENDPOINTS
app.post('/api/repurpose', async (req, res) => {
  const { product_id, product_name, quantity, target_recipe, branch_id, batch_id } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: "Product ID and quantity are required." });
  }

  const bId = branch_id ? parseInt(branch_id) : 1;
  const qtyNum = parseInt(quantity);
  const pName = product_name || product_id;
  const recipe = target_recipe || "Repurposed Recipe";
  const bIdStr = String(batch_id || `batch_${Date.now()}`);

  try {
    const altPid = String(product_id).startsWith('p') ? String(product_id).substring(1) : `p${product_id}`;
    
    // Deduct stock from near-expiry or matching inventory items for this product
    const invRes = await queryDb(
      "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3 AND stock_level > 0 ORDER BY expiry_date ASC, id ASC",
      [String(product_id), String(altPid), bId]
    );

    let remainingToDeduct = qtyNum;
    if (invRes.rows && invRes.rows.length > 0) {
      for (const row of invRes.rows) {
        if (remainingToDeduct <= 0) break;
        const currentStock = parseInt(row.stock_level) || 0;
        const deduct = Math.min(currentStock, remainingToDeduct);
        const newStock = currentStock - deduct;
        remainingToDeduct -= deduct;

        await queryDb(
          "UPDATE bw_inventory SET stock_level = $1 WHERE id = $2",
          [newStock, row.id]
        );
      }
    }

    // Insert Repurpose Log with accurate timestamp
    const phNow = getPhilippineNow();
    const repTimestamp = req.body.timestamp || req.body.created_at || phNow.datetime;
    const logRes = await queryDb(
      `INSERT INTO bw_repurpose_logs (batch_id, product_id, product_name, quantity, target_recipe, branch_id, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [bIdStr, String(product_id), pName, qtyNum, recipe, bId, repTimestamp]
    );

    // Deduct from bw_inventory_batches if matching batch exists
    if (batch_id) {
      await queryDb(`
        UPDATE bw_inventory_batches
        SET current_quantity = GREATEST(0, current_quantity - $1),
            status = CASE WHEN current_quantity - $1 <= 0 THEN 'Repurposed' ELSE status END
        WHERE (batch_code = $2 OR id = $3) AND branch_id = $4
      `, [qtyNum, String(batch_id), parseInt(batch_id) || 0, bId]).catch(e => console.warn("batch repurpose notice:", e.message));
    }

    // Insert into bw_inventory_movements
    const prevStock = invRes.rows && invRes.rows[0] ? parseInt(invRes.rows[0].stock_level) : qtyNum;
    await queryDb(`
      INSERT INTO bw_inventory_movements
      (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reference_id, reason, performed_by, status, created_at)
      VALUES ('Repurposed', $1, $2, $3, $4, $5, 'pcs', $6, $7, $8, 'Completed', $9)
    `, [bId, String(product_id), qtyNum, prevStock, Math.max(0, prevStock - qtyNum), bIdStr, `Repurposed into ${recipe}`, req.user ? req.user.name : 'Baker / Staff', repTimestamp]).catch(e => console.warn("movement log notice:", e.message));

    const createdLog = (logRes.rows && logRes.rows[0]) ? logRes.rows[0] : {
      batch_id: bIdStr,
      product_id: String(product_id),
      product_name: pName,
      quantity: qtyNum,
      target_recipe: recipe,
      branch_id: bId,
      timestamp: new Date().toISOString()
    };

    apicache.clear();
    res.json({
      success: true,
      message: `Successfully repurposed ${qtyNum} pcs of ${pName} into '${recipe}'`,
      repurposed_log: createdLog
    });
  } catch (err) {
    console.error("Error logging repurpose action:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/repurpose/logs', async (req, res) => {
  const { branch_id } = req.query;
  const bId = branch_id && branch_id !== 'all' ? parseInt(branch_id) : null;
  try {
    let sql = "SELECT * FROM bw_repurpose_logs";
    let params = [];
    if (bId) {
      sql += " WHERE branch_id = $1";
      params.push(bId);
    }
    sql += " ORDER BY timestamp DESC";
    const result = await queryDb(sql, params);
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. INVENTORY BATCHES (TRACEABLE PER-BATCH EXPIRY & FOOD-SAFETY RECORDS)
app.get('/api/inventory/batches', async (req, res) => {
  const { branch_id, status } = req.query;
  try {
    let sql = `
      SELECT b.*, COALESCE(p.name, b.product_id) as product_name, COALESCE(p.category, 'Bread') as category,
             COALESCE(p.unit, 'pcs') as unit, COALESCE(p.repurpose_recipe, 'Bread Crumbs') as repurpose_recipe,
             COALESCE(br.name, 'Branch ' || b.branch_id) as branch_name
      FROM bw_inventory_batches b
      LEFT JOIN bw_products p ON p.id = b.product_id
      LEFT JOIN bw_branches br ON br.id = b.branch_id
      WHERE 1=1
    `;
    const params = [];
    if (branch_id && branch_id !== 'all') {
      params.push(parseInt(branch_id));
      sql += ` AND b.branch_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      sql += ` AND b.status = $${params.length}`;
    }
    sql += " ORDER BY b.expiry_date ASC, b.id ASC";
    const result = await queryDb(sql, params);
    res.json(result.rows || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. INVENTORY API (BRANCH-ISOLATED INVENTORY & STOCK MOVEMENTS)
app.get('/api/inventory', async (req, res) => {
  const { branch_id, category, status, search, date, expiry } = req.query;
  try {
    // Role-based branch authorization check
    if (req.user && req.user.role !== 'admin') {
      if (branch_id && branch_id !== 'all' && parseInt(branch_id) !== parseInt(req.user.branchId)) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to access inventory for this branch." });
      }
    }

    const effectiveBranchId = (req.user && req.user.role !== 'admin')
      ? req.user.branchId
      : (branch_id && branch_id !== 'all' ? parseInt(branch_id) : null);

    let query = `
      SELECT 
        i.id,
        i.product_id,
        COALESCE(p.name, i.product_id) as product_name,
        i.branch_id,
        COALESCE(b.name, CONCAT('Branch ', i.branch_id)) as branch_name,
        COALESCE(p.category, 'Bread') as category,
        i.stock_level,
        COALESCE(i.unit, p.unit, 'pcs') as unit,
        i.production_date,
        COALESCE(i.production_time, '06:00:00') as production_time,
        i.expiry_date,
        COALESCE(i.expiry_time, '18:00:00') as expiry_time,
        COALESCE(p.shelf_life_days, 2) as shelf_life_days,
        COALESCE(i.status, 'In Stock') as status,
        i.batch_id,
        i.created_at
      FROM bw_inventory i
      LEFT JOIN bw_products p ON i.product_id = p.id
      LEFT JOIN bw_branches b ON i.branch_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      params.push(effectiveBranchId);
      query += ` AND i.branch_id = $${params.length}`;
    }

    if (category && category !== 'all') {
      params.push(category);
      query += ` AND LOWER(p.category) = LOWER($${params.length})`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND LOWER(p.name) LIKE $${params.length}`;
    }

    if (date) {
      params.push(date);
      query += ` AND i.production_date = $${params.length}`;
    }

    if (expiry) {
      params.push(expiry);
      query += ` AND i.expiry_date = $${params.length}`;
    }

    // Maintain separate records per branch (never aggregate into one row)
    query += " ORDER BY b.name ASC, p.name ASC, i.id ASC";
    const result = await queryDb(query, params);

    const toCleanDateStr = (val) => {
      if (!val) return '';
      if (val instanceof Date) {
        const y = val.getFullYear();
        const m = String(val.getMonth() + 1).padStart(2, '0');
        const d = String(val.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      const s = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);
      const parsed = new Date(s);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return s;
    };

    // Compute dynamic freshness degradation % and shelf status
    const enrichedRows = (result.rows || []).map(row => {
      const prodDateStr = toCleanDateStr(row.production_date) || '2026-10-14';
      const expDateStr = toCleanDateStr(row.expiry_date) || '2026-10-16';
      const prodTime = new Date(`${prodDateStr}T${row.production_time || '00:00:00'}`).getTime();
      const expTime = new Date(`${expDateStr}T${row.expiry_time || '23:59:59'}`).getTime();
      const now = Date.now();

      let degradationPercent = 0;
      let shelfStatus = 'Fresh';

      if (!isNaN(expTime) && !isNaN(prodTime) && expTime > prodTime) {
        const totalDuration = expTime - prodTime;
        const elapsed = now - prodTime;
        degradationPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      } else {
        degradationPercent = 100;
      }

      if (now >= expTime) {
        shelfStatus = 'Expired';
      } else if (degradationPercent >= 70) {
        shelfStatus = 'Near Expiry';
      } else if (parseInt(row.stock_level) <= 10) {
        shelfStatus = 'Low Stock';
      } else {
        shelfStatus = 'Fresh';
      }

      return {
        ...row,
        production_date: prodDateStr,
        expiry_date: expDateStr,
        degradation_percent: degradationPercent,
        shelf_status: shelfStatus
      };
    });

    let finalRows = enrichedRows;
    if (status && status !== 'all') {
      finalRows = enrichedRows.filter(r => 
        r.shelf_status.toLowerCase() === status.toLowerCase() ||
        r.status.toLowerCase() === status.toLowerCase()
      );
    }

    res.json(finalRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { product_id, stock_level, production_date, expiry_date, branch_id, unit, batch_id, production_time, expiry_time, performed_by } = req.body;
  if (!product_id || stock_level == null || !branch_id) {
    return res.status(400).json({ error: "product_id, stock_level, and branch_id are required." });
  }

  const bId = parseInt(branch_id);
  if (req.user && req.user.role !== 'admin') {
    if (bId !== parseInt(req.user.branchId)) {
      return res.status(403).json({ error: "Forbidden: You cannot modify inventory for this branch." });
    }
  }

  const qty = parseInt(stock_level);
  const phNow = getPhilippineNow();
  const prodDate = production_date || phNow.date;
  const expDate = expiry_date || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const prodTime = production_time || phNow.time;
  const expTime = expiry_time || '18:00:00';
  const invCreatedAt = phNow.datetime;
  const unitStr = unit || 'pcs';
  const performer = performed_by || (req.user ? (req.user.name || req.user.email) : 'Inventory Staff');

  try {
    const pIdStr = String(product_id).trim();
    const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;

    const check = await queryDb(
      "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3",
      [pIdStr, altPid, bId]
    );

    let result;
    let prevStock = 0;
    let newStock = qty;

    if (check.rows && check.rows.length > 0) {
      prevStock = parseInt(check.rows[0].stock_level) || 0;
      newStock = prevStock + qty;
      result = await queryDb(
        `UPDATE bw_inventory 
         SET stock_level = $1, production_date = $2, expiry_date = $3, unit = $4, production_time = $5, expiry_time = $6, status = 'In Stock' 
         WHERE id = $7 RETURNING *`,
        [newStock, prodDate, expDate, unitStr, prodTime, expTime, check.rows[0].id]
      );
    } else {
      result = await queryDb(
        `INSERT INTO bw_inventory 
         (product_id, stock_level, production_date, expiry_date, branch_id, unit, production_time, expiry_time, status, batch_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'In Stock', $9) RETURNING *`,
        [pIdStr, qty, prodDate, expDate, bId, unitStr, prodTime, expTime, batch_id || null]
      );
    }

    // Log Stock Movement
    await queryDb(
      `INSERT INTO bw_inventory_movements 
       (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reason, performed_by, status)
       VALUES ('Stock In', $1, $2, $3, $4, $5, $6, 'Inventory Addition', $7, 'Completed')`,
      [bId, pIdStr, qty, prevStock, newStock, unitStr, performer]
    );

    clearApiCache();
    res.json(result.rows[0] || { product_id: pIdStr, stock_level: newStock, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Manual Stock Adjustments, Damage & Expiry
app.post('/api/inventory/adjust', async (req, res) => {
  const { branch_id, product_id, adjustment_type, quantity, reason, notes, performed_by, authorized_by } = req.body;
  if (!branch_id || !product_id || quantity == null) {
    return res.status(400).json({ error: "branch_id, product_id, and quantity are required." });
  }

  const bId = parseInt(branch_id);
  if (req.user && req.user.role !== 'admin') {
    if (bId !== parseInt(req.user.branchId)) {
      return res.status(403).json({ error: "Forbidden: You cannot adjust inventory for another branch." });
    }
  }

  const adjType = adjustment_type || 'Manual Adjustment';
  const adjQty = parseInt(quantity);
  const pIdStr = String(product_id).trim();
  const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
  const performer = performed_by || (req.user ? (req.user.name || req.user.email) : 'Staff');
  const authorizer = authorized_by || (req.user ? (req.user.name || req.user.email) : 'Branch Manager');
  const phNow = getPhilippineNow();
  const adjCreatedAt = req.body.created_at || phNow.datetime;

  try {
    const invCheck = await queryDb(
      "SELECT id, stock_level FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3",
      [pIdStr, altPid, bId]
    );

    if (!invCheck.rows || invCheck.rows.length === 0) {
      return res.status(404).json({ error: "Inventory record not found for this product and branch." });
    }

    const currentStock = parseInt(invCheck.rows[0].stock_level) || 0;
    const newStock = Math.max(0, currentStock + adjQty);
    const unitStr = (invCheck.rows[0] && invCheck.rows[0].unit) || req.body.unit || 'pcs';

    await queryDb("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [newStock, invCheck.rows[0].id]);

    const movementRes = await queryDb(
      `INSERT INTO bw_inventory_movements 
       (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, reason, notes, performed_by, authorized_by, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Completed', $12) RETURNING *`,
      [adjType, bId, pIdStr, adjQty, currentStock, newStock, unitStr, reason || adjType, notes || '', performer, authorizer, adjCreatedAt]
    );

    if (adjType === 'Damaged' || adjType === 'Expired') {
      const pRes = await queryDb("SELECT cost FROM bw_products WHERE id = $1 OR id = $2", [pIdStr, altPid]);
      const cost = (pRes.rows && pRes.rows[0]) ? parseFloat(pRes.rows[0].cost) : 10.00;
      const wasteQty = Math.abs(adjQty);
      await queryDb(
        `INSERT INTO bw_waste (product_id, qty, cost, reason, date, branch_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [pIdStr, wasteQty, cost, reason || adjType, phNow.date, bId, adjCreatedAt]
      );
    }

    clearApiCache();
    res.json({
      success: true,
      message: "Inventory adjusted successfully",
      previous_stock: currentStock,
      new_stock: newStock,
      movement: movementRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Branch-to-Branch Transfers
app.post('/api/inventory/transfer', async (req, res) => {
  const { from_branch_id, to_branch_id, product_id, quantity, notes, performed_by, authorized_by } = req.body;
  if (!from_branch_id || !to_branch_id || !product_id || !quantity) {
    return res.status(400).json({ error: "from_branch_id, to_branch_id, product_id, and quantity are required." });
  }

  const srcBranchId = parseInt(from_branch_id);
  const destBranchId = parseInt(to_branch_id);
  const transferQty = parseInt(quantity);

  if (srcBranchId === destBranchId) {
    return res.status(400).json({ error: "Source and destination branch cannot be the same." });
  }

  if (transferQty <= 0) {
    return res.status(400).json({ error: "Transfer quantity must be greater than zero." });
  }

  if (req.user && req.user.role !== 'admin') {
    if (srcBranchId !== parseInt(req.user.branchId)) {
      return res.status(403).json({ error: "Forbidden: You are only authorized to initiate transfers from your assigned branch." });
    }
  }

  const pIdStr = String(product_id).trim();
  const altPid = pIdStr.startsWith('p') ? pIdStr.substring(1) : `p${pIdStr}`;
  const performer = performed_by || (req.user ? (req.user.name || req.user.email) : 'Staff');
  const authorizer = authorized_by || (req.user ? (req.user.name || req.user.email) : 'Branch Manager');

  try {
    const srcInv = await queryDb(
      "SELECT * FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3",
      [pIdStr, altPid, srcBranchId]
    );

    if (!srcInv.rows || srcInv.rows.length === 0 || parseInt(srcInv.rows[0].stock_level) < transferQty) {
      const avail = (srcInv.rows && srcInv.rows.length > 0) ? srcInv.rows[0].stock_level : 0;
      return res.status(400).json({
        error: `Insufficient stock in source branch. Available: ${avail}, Requested: ${transferQty}`
      });
    }

    const srcRow = srcInv.rows[0];
    const srcPrevStock = parseInt(srcRow.stock_level);
    const srcNewStock = srcPrevStock - transferQty;
    const unitStr = srcRow.unit || 'pcs';

    const destInv = await queryDb(
      "SELECT * FROM bw_inventory WHERE (product_id = $1 OR product_id = $2) AND branch_id = $3",
      [pIdStr, altPid, destBranchId]
    );

    let destPrevStock = 0;
    let destNewStock = transferQty;
    let destRowId = null;

    if (destInv.rows && destInv.rows.length > 0) {
      destPrevStock = parseInt(destInv.rows[0].stock_level) || 0;
      destNewStock = destPrevStock + transferQty;
      destRowId = destInv.rows[0].id;
    }

    const transferRef = `TRF-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    await queryDb("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [srcNewStock, srcRow.id]);

    if (destRowId) {
      await queryDb(
        `UPDATE bw_inventory 
         SET stock_level = $1, production_date = $2, expiry_date = $3, status = 'In Stock' 
         WHERE id = $4`,
        [destNewStock, srcRow.production_date, srcRow.expiry_date, destRowId]
      );
    } else {
      await queryDb(
        `INSERT INTO bw_inventory 
         (product_id, stock_level, production_date, expiry_date, branch_id, unit, production_time, expiry_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'In Stock')`,
        [pIdStr, destNewStock, srcRow.production_date, srcRow.expiry_date, destBranchId, unitStr, srcRow.production_time, srcRow.expiry_time]
      );
    }

    // Source: Transfer Out
    await queryDb(
      `INSERT INTO bw_inventory_movements 
       (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, source_branch_id, dest_branch_id, reference_id, reason, notes, performed_by, authorized_by, status)
       VALUES ('Transfer Out', $1, $2, $3, $4, $5, $6, $1, $7, $8, 'Branch transfer out', $9, $10, $11, 'Completed')`,
      [srcBranchId, pIdStr, -transferQty, srcPrevStock, srcNewStock, unitStr, destBranchId, transferRef, notes || '', performer, authorizer]
    );

    // Destination: Transfer In
    await queryDb(
      `INSERT INTO bw_inventory_movements 
       (movement_type, branch_id, product_id, quantity, previous_stock, new_stock, unit, source_branch_id, dest_branch_id, reference_id, reason, notes, performed_by, authorized_by, status)
       VALUES ('Transfer In', $1, $2, $3, $4, $5, $6, $7, $1, $8, 'Branch transfer in', $9, $10, $11, 'Completed')`,
      [destBranchId, pIdStr, transferQty, destPrevStock, destNewStock, unitStr, srcBranchId, transferRef, notes || '', performer, authorizer]
    );

    clearApiCache();
    res.json({
      success: true,
      message: "Branch stock transfer completed successfully",
      reference_id: transferRef,
      source: { branch_id: srcBranchId, previous_stock: srcPrevStock, new_stock: srcNewStock },
      destination: { branch_id: destBranchId, previous_stock: destPrevStock, new_stock: destNewStock }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit Movements Log
app.get('/api/inventory/movements', async (req, res) => {
  const { branch_id, product_id, movement_type, limit } = req.query;
  try {
    if (req.user && req.user.role !== 'admin') {
      if (branch_id && branch_id !== 'all' && parseInt(branch_id) !== parseInt(req.user.branchId)) {
        return res.status(403).json({ error: "Forbidden: You cannot view movements for another branch." });
      }
    }

    const effectiveBranchId = (req.user && req.user.role !== 'admin')
      ? req.user.branchId
      : (branch_id && branch_id !== 'all' ? parseInt(branch_id) : null);

    let query = `
      SELECT 
        m.*,
        COALESCE(p.name, m.product_id) as product_name,
        COALESCE(b.name, 'Branch ' || m.branch_id) as branch_name,
        sb.name as source_branch_name,
        db.name as dest_branch_name
      FROM bw_inventory_movements m
      LEFT JOIN bw_products p ON m.product_id = p.id
      LEFT JOIN bw_branches b ON m.branch_id = b.id
      LEFT JOIN bw_branches sb ON m.source_branch_id = sb.id
      LEFT JOIN bw_branches db ON m.dest_branch_id = db.id
      WHERE 1=1
    `;
    const params = [];

    if (effectiveBranchId) {
      params.push(effectiveBranchId);
      query += ` AND m.branch_id = $${params.length}`;
    }

    if (product_id) {
      params.push(product_id);
      query += ` AND m.product_id = $${params.length}`;
    }

    if (movement_type && movement_type !== 'all') {
      params.push(movement_type);
      query += ` AND m.movement_type = $${params.length}`;
    }

    const maxLimit = parseInt(limit) || 100;
    query += ` ORDER BY m.id DESC LIMIT ${maxLimit}`;

    const result = await queryDb(query, params);
    res.json(result.rows || []);
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
  const { product_id, planned, actual, date, baker, status, code, branch_id, created_at } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const phNow = getPhilippineNow();
    const prodDate = date || phNow.date;
    const prodCreatedAt = created_at || phNow.datetime;
    const activeBaker = baker || 'Marco Reyes';
    const activeStatus = status || 'Completed';
    const prodCode = code || `PRD-B${bId}-${product_id}-${prodDate.replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    const result = await queryDb(
      "INSERT INTO bw_production (product_id, planned, actual, date, baker, status, code, branch_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
      [product_id, parseInt(planned || 0), parseInt(actual || planned || 0), prodDate, activeBaker, activeStatus, prodCode, bId, prodCreatedAt]
    );
    clearApiCache();
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
  const { product_id, qty, cost, reason, date, branch_id, created_at } = req.body;
  try {
    const bId = branch_id ? parseInt(branch_id) : 1;
    const phNow = getPhilippineNow();
    const wasteDate = date || phNow.date;
    const wasteCreatedAt = created_at || phNow.datetime;
    const wasteCost = parseFloat(cost || 25.00);
    const result = await queryDb(
      "INSERT INTO bw_waste (product_id, qty, cost, reason, date, branch_id, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [product_id, parseInt(qty || 1), wasteCost, reason || 'Display Scrap / Overbaked', wasteDate, bId, wasteCreatedAt]
    );
    clearApiCache();
    res.status(201).json(result.rows[0] || { product_id, qty, cost, reason, date, branch_id: bId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. DATABASE BACKUP & RECOVERY API
app.get('/api/backup', async (req, res) => {
  try {
    const fs = require('fs');
    const dumpPath = fs.existsSync(path.join(__dirname, 'db', 'bakewise_db.sql')) ? path.join(__dirname, 'db', 'bakewise_db.sql') : path.join(__dirname, '..', 'bakewise_db.sql');
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

// 11. DEMAND FORECASTING API (STATISTICAL MACHINE LEARNING WITH PYTHON INTEGRATION)
function calculateStatisticalDemandForecast({ salesRecords, productId, branchId, productName, category, unit, targetDate }) {
  const today = targetDate ? new Date(targetDate) : new Date();

  const catLower = (category || '').toLowerCase();
  const nameLower = (productName || '').toLowerCase();
  let defaultBaseline = 15;
  if (nameLower.includes('pandesal') || catLower.includes('bread')) defaultBaseline = 22;
  else if (catLower.includes('pastr') || nameLower.includes('ensaymada') || nameLower.includes('muffin')) defaultBaseline = 14;
  else if (catLower.includes('cake') || nameLower.includes('cake')) defaultBaseline = 4;
  else if (catLower.includes('beverage') || nameLower.includes('coke') || nameLower.includes('drink')) defaultBaseline = 12;

  const standardDowMultipliers = {
    0: 1.20, // Sunday
    1: 0.90, // Monday
    2: 0.92, // Tuesday
    3: 0.95, // Wednesday
    4: 1.00, // Thursday
    5: 1.15, // Friday
    6: 1.25  // Saturday
  };

  const dailySalesMap = new Map();
  if (Array.isArray(salesRecords)) {
    for (const s of salesRecords) {
      if (!s) continue;
      const rawDate = s.date || s.created_at;
      if (!rawDate) continue;
      const dateStr = typeof rawDate === 'string' ? rawDate.split('T')[0] : new Date(rawDate).toISOString().split('T')[0];
      const q = parseInt(s.qty || s.quantity) || 0;
      if (q > 0) {
        dailySalesMap.set(dateStr, (dailySalesMap.get(dateStr) || 0) + q);
      }
    }
  }

  const sortedDates = Array.from(dailySalesMap.keys()).sort();
  const salesDaysCount = sortedDates.length;
  const totalQtySold = Array.from(dailySalesMap.values()).reduce((a, b) => a + b, 0);

  if (salesDaysCount < 3) {
    const historicalAvg = salesDaysCount > 0 ? parseFloat((totalQtySold / salesDaysCount).toFixed(1)) : 0;
    const baseVal = historicalAvg > 0 ? Math.round(historicalAvg) : defaultBaseline;

    const dailyForecast = [];
    for (let d = 1; d <= 7; d++) {
      const dDate = new Date(today);
      dDate.setDate(dDate.getDate() + d);
      const dow = dDate.getDay();
      const mult = standardDowMultipliers[dow] || 1.0;
      dailyForecast.push(Math.max(1, Math.round(baseVal * mult)));
    }
    const sevenDayTotal = dailyForecast.reduce((a, b) => a + b, 0);

    return {
      product_id: productId || '',
      product_name: productName || '',
      predicted_demand: dailyForecast[0],
      daily_forecast: dailyForecast,
      seven_day_total: sevenDayTotal,
      historical_avg: historicalAvg,
      confidence: "Insufficient historical data",
      reliability_score: "N/A (< 3 sales days)",
      data_points: salesDaysCount,
      data_period: salesDaysCount > 0 ? `${salesDaysCount} recorded sales day(s)` : "No completed sales records",
      is_fallback: true,
      fallback_reason: "Insufficient historical transaction data (< 3 distinct sales days) to train statistical prediction model.",
      trend: "Insufficient Data",
      unit: unit || "pcs",
      last_updated: new Date().toISOString()
    };
  }

  const historicalAvg = parseFloat((totalQtySold / salesDaysCount).toFixed(1));

  // Empirical DOW seasonality
  const dowSales = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const [dateStr, q] of dailySalesMap.entries()) {
    const dow = new Date(dateStr + 'T12:00:00').getDay();
    dowSales[dow].push(q);
  }

  const empiricalDowMultipliers = {};
  for (let dow = 0; dow < 7; dow++) {
    if (dowSales[dow].length > 0) {
      const dowMean = dowSales[dow].reduce((a, b) => a + b, 0) / dowSales[dow].length;
      empiricalDowMultipliers[dow] = Math.min(1.65, Math.max(0.65, dowMean / Math.max(1, historicalAvg)));
    } else {
      empiricalDowMultipliers[dow] = standardDowMultipliers[dow];
    }
  }

  // Weighted recent trend (last up to 7 sales days)
  const recentDays = sortedDates.slice(-7);
  let weightedSum = 0;
  let weightTotal = 0;
  recentDays.forEach((dt, idx) => {
    const w = idx + 1;
    weightedSum += dailySalesMap.get(dt) * w;
    weightTotal += w;
  });
  const recentWeightedAvg = weightedSum / weightTotal;
  const baselineDemand = (recentWeightedAvg * 0.60) + (historicalAvg * 0.40);

  const dailyForecast = [];
  for (let d = 1; d <= 7; d++) {
    const dDate = new Date(today);
    dDate.setDate(dDate.getDate() + d);
    const dow = dDate.getDay();
    const mult = empiricalDowMultipliers[dow] || 1.0;
    const projected = Math.max(1, Math.round(baselineDemand * mult));
    dailyForecast.push(projected);
  }

  const sevenDayTotal = dailyForecast.reduce((a, b) => a + b, 0);

  const quantities = Array.from(dailySalesMap.values());
  const variance = quantities.reduce((acc, val) => acc + Math.pow(val - historicalAvg, 2), 0) / salesDaysCount;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / Math.max(1, historicalAvg);

  let confidence = "Low";
  let reliabilityScore = "60% - 69%";
  if (salesDaysCount >= 14 && cv <= 0.40) {
    confidence = "High";
    reliabilityScore = "88% - 94%";
  } else if (salesDaysCount >= 5 && cv <= 0.70) {
    confidence = "Medium";
    reliabilityScore = "75% - 84%";
  }

  let trend = "Stable";
  const trendDiff = recentWeightedAvg - historicalAvg;
  if (trendDiff >= 1.5) trend = "Upward";
  else if (trendDiff <= -1.5) trend = "Downward";

  const firstDate = sortedDates[0];
  const lastDate = sortedDates[sortedDates.length - 1];

  return {
    product_id: productId || '',
    product_name: productName || '',
    predicted_demand: dailyForecast[0],
    daily_forecast: dailyForecast,
    seven_day_total: sevenDayTotal,
    historical_avg: historicalAvg,
    confidence: confidence,
    reliability_score: reliabilityScore,
    data_points: salesDaysCount,
    data_period: `${salesDaysCount} sales days (${firstDate} to ${lastDate})`,
    is_fallback: false,
    trend: trend,
    unit: unit || "pcs",
    last_updated: new Date().toISOString()
  };
}

app.post('/api/forecast', async (req, res) => {
  const { sales, product_id, branch_id, product_name, category, unit, target_date } = req.body;
  let salesData = sales;

  // If sales array is not provided or empty, query completed sales from DB
  if ((!salesData || !Array.isArray(salesData) || salesData.length === 0) && product_id) {
    try {
      let sql = `
        SELECT date, qty, price FROM bw_sales
        WHERE product_id = $1
      `;
      const params = [String(product_id)];
      if (branch_id && branch_id !== 'all') {
        params.push(parseInt(branch_id));
        sql += ` AND branch_id = $${params.length}`;
      }
      sql += " ORDER BY date ASC";
      const dbSales = await queryDb(sql, params);
      salesData = dbSales.rows || [];
    } catch (e) {
      salesData = [];
    }
  }

  // Attempt Python Random Forest model first if script exists
  const { spawn } = require('child_process');
  const scriptPath = fs.existsSync(path.join(__dirname, 'src', 'ai_forecast.py')) ? path.join(__dirname, 'src', 'ai_forecast.py') : path.join(__dirname, '..', 'src', 'ai_forecast.py');

  if (fs.existsSync(scriptPath) && Array.isArray(salesData) && salesData.length >= 3) {
    try {
      const child = spawn('python', [scriptPath]);
      let stdoutData = '';
      let stderrData = '';

      child.stdout.on('data', chunk => { stdoutData += chunk; });
      child.stderr.on('data', chunk => { stderrData += chunk; });

      const timeout = setTimeout(() => {
        try { child.kill(); } catch (e) {}
        if (!res.headersSent) {
          const jsForecast = calculateStatisticalDemandForecast({ salesRecords: salesData, productId: product_id, branchId: branch_id, productName: product_name, category, unit, targetDate: target_date });
          res.json(jsForecast);
        }
      }, 3500);

      child.on('error', () => {
        clearTimeout(timeout);
        if (!res.headersSent) {
          const jsForecast = calculateStatisticalDemandForecast({ salesRecords: salesData, productId: product_id, branchId: branch_id, productName: product_name, category, unit, targetDate: target_date });
          res.json(jsForecast);
        }
      });

      child.on('close', code => {
        clearTimeout(timeout);
        if (res.headersSent) return;
        if (code === 0 && stdoutData.trim()) {
          try {
            const parsed = JSON.parse(stdoutData.trim());
            if (parsed && typeof parsed.predicted_demand === 'number' && Array.isArray(parsed.daily_forecast)) {
              return res.json(parsed);
            }
          } catch (e) {}
        }
        const jsForecast = calculateStatisticalDemandForecast({ salesRecords: salesData, productId: product_id, branchId: branch_id, productName: product_name, category, unit, targetDate: target_date });
        res.json(jsForecast);
      });

      child.stdin.write(JSON.stringify({
        sales: salesData,
        product_id: product_id,
        product_name: product_name,
        category: category,
        unit: unit,
        target_date: target_date
      }));
      child.stdin.end();
      return;
    } catch (e) {
      // Fall through to JS engine
    }
  }

  // Pure JavaScript analytical engine (Deterministic, instant, and resilient)
  const forecastResult = calculateStatisticalDemandForecast({
    salesRecords: salesData,
    productId: product_id,
    branchId: branch_id,
    productName: product_name,
    category,
    unit,
    targetDate: target_date
  });
  return res.json(forecastResult);
});



// --- SERVE FRONTEND STATIC FILES ---
const ROOT_DIR = path.resolve(__dirname, '..');
const frontendDir = fs.existsSync(path.join(ROOT_DIR, 'frontend')) ? path.join(ROOT_DIR, 'frontend') : path.join(ROOT_DIR, 'public');
app.use(express.static(frontendDir, {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.match(/\.(png|jpg|jpeg|svg|woff2?|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));
if (fs.existsSync(path.join(ROOT_DIR, 'public')) && frontendDir !== path.join(ROOT_DIR, 'public')) {
  app.use(express.static(path.join(ROOT_DIR, 'public')));
}

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// START EXPRESS SERVER
const server = app.listen(PORT, () => {
  console.log(`BakeWise Enterprise System server is listening on http://localhost:${PORT}`);
});

module.exports = { app, server };
