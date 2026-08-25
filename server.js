const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const path = require('path');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const apicache = require('apicache');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://unpkg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://unpkg.com", "https://*.tile.openstreetmap.org", "https://a.tile.openstreetmap.org", "https://b.tile.openstreetmap.org", "https://c.tile.openstreetmap.org"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(xss());
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';
const cache = apicache.middleware;

// Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  message: { error: 'Too many login attempts from this IP, please try again after 15 minutes' }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later' }
});

app.use('/api/', apiLimiter);

// JWT Middleware
function authenticateToken(req, res, next) {
  // Allow OPTIONS preflight requests
  if (req.method === 'OPTIONS') return next();
  
  // Allow /api/auth/login and /api/status without token
  if (req.path === '/auth/login' || req.path === '/status') return next();
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.status(401).json({ error: 'No token provided' });
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
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
      store_hours VARCHAR(100),
      contact_no VARCHAR(100),
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  await mysqlPool.query(`
    INSERT INTO bw_branches (id, name, address, store_hours, contact_no, latitude, longitude, status) VALUES
    (1, 'Agdao 1', 'Aquino St., Brgy. T. Monteverd...', '24 HOURS', '(082) 286-2546', 110, 210, 'Active'),
    (2, 'Agdao 2', 'Door 2, Uy King Bldg, Lapu- La...', '24 HOURS', '(082) 300-7675', 120, 220, 'Active'),
    (3, 'Agusan Bus Terminal', 'Bus Terminal, Brgy.2, San Fran...', '5 AM to 7 PM', '0916-454-2735', 130, 230, 'Active'),
    (4, 'Ampayon 1', 'Purok 3 Ampayan, Butuan City, ...', '5 AM to 8 PM', '0938-852-1975', 140, 240, 'Active'),
    (5, 'Ampayon 2', 'Purok 3A Ampayan, Butuan City,...', '5 AM to 8 PM', '0938-540-3676', 150, 250, 'Active'),
    (6, 'Asuncion', 'Purok 7, Brgy. Cambanogoy, Asu...', '5 AM to 8 PM', '0945-176-7953', 160, 260, 'Active'),
    (7, 'Bad as', 'Bad As, Placer, Surigao del No...', '5 AM to 8 PM', '0951-409-5056', 170, 270, 'Active'),
    (8, 'Bago Gallera', 'Purok 1, Pag-Asa, Phase 1, Brg...', '24 HOURS', '0966-755-2122', 180, 280, 'Active'),
    (9, 'Bahbah', 'P-11 Poblacion, Prosperidad, A...', '5 AM to 6 PM', '0945-468-4128', 190, 290, 'Active'),
    (10, 'Bajada', 'JP Laurel Avenue, Bajada, Brgy...', '5 AM to 10 PM', '(082) 222-5071', 100, 200, 'Active'),
    (11, 'Balingoan', 'Bauk-Bauk, Balingoan, Misamis ...', '5 AM to 7 PM', '0948-546-5957', 110, 210, 'Active'),
    (12, 'Bancasi', 'P.1, Bancasi, Butuan City, CAR...', '5 AM to 7 PM', '0912-708-0728', 120, 220, 'Active'),
    (13, 'Bansalan 1', 'R. Delos Cientos St., Bansalan...', '24 HOURS', '(082) 272-0571', 130, 230, 'Active'),
    (14, 'Bansalan 2', 'Viacrusis St., Poblacion Dos, ...', '24 HOURS', '(082) 284-9538', 140, 240, 'Active'),
    (15, 'Bansalan Main', 'Quiros St., Bansalan, Davao de...', '5 AM to 8 PM', '0996-662-8871', 150, 250, 'Active'),
    (16, 'Bansalan Stall', 'Quiros St., Public Market, Ban...', '5 AM to 8 PM', '', 160, 260, 'Active'),
    (17, 'Basak', 'Corner Merkado-Basak, Lapu-Lap...', '5 AM to 9 PM', '0912-505-3321', 170, 270, 'Active'),
    (18, 'Bato 1', 'J. Rizal Street, Bato, Leyte', '4 AM to 10 PM', '0975-362-2936', 180, 280, 'Active'),
    (19, 'Bato 2', 'J. Luna St., Bato, Leyte', '4 AM to 10 PM', '0926-174-8153', 190, 290, 'Active'),
    (20, 'Bayugan', 'P-15 Poblacion, Bayugan, Agusa...', '5 AM to 7 PM', '0948-675-5661', 100, 200, 'Active'),
    (21, 'Bayugan Branch 3', 'Narra Avenue, Taglatawan, Bayu...', '5 AM to 7 PM', '0956-582-0030', 110, 210, 'Active'),
    (22, 'Bayugan Branch 4', 'Purok 9, Taglatawan, Bayugan C...', '5 AM to 7 PM', '0907-558-8989', 120, 220, 'Active'),
    (23, 'Bayugan Main', 'Purok 15, Esperanza Road, Pobl...', '5 AM to 7 PM', '0953-074-0657', 130, 230, 'Active'),
    (24, 'Bayugan Stall', 'Public Market, Taglatawan, Bay...', '5 AM to 7 PM', '0951-879-8298', 140, 240, 'Active'),
    (25, 'Boulevard 1', 'Quezon Blvd., Corner Bonifacio...', '24 HOURS', '(082) 221-2040', 150, 250, 'Active'),
    (26, 'Boulevard 2', 'Cor. Fatima St., Quezon Blvd.,...', '24 HOURS', '(082) 224-1634', 160, 260, 'Active'),
    (27, 'BSP', 'Purok 3,J.Rosales Avenue, Brgy...', '5 AM to 8 PM', '0950-775-3073', 170, 270, 'Active'),
    (28, 'Buenavista 1', 'P.1, Brgy. 2, Buenavista, Agus...', '5 AM to 8 PM', '0919-797-2033', 180, 280, 'Active'),
    (29, 'Buenavista 2', 'P.7, Brgy. 3, Buenavista, Agus...', '5 AM to 8 PM', '0912-708-0728', 190, 290, 'Active'),
    (30, 'Buhangin', 'Buhangin Public Market, Buhang...', '24 HOURS', '0977-088-1941', 100, 200, 'Active'),
    (31, 'Bunawan', 'Laluna Bldg., Public Market, B...', '24 HOURS', '0967-227-8454', 110, 210, 'Active'),
    (32, 'Burgos', 'P. Burgos St., Sikatuna, Butua...', '5 AM to 7 PM', '0948-200-8250', 120, 220, 'Active'),
    (33, 'Cabadbaran 1', 'A. Curato St., Brgy. 8, Cabadb...', '5 AM to 8 PM', '0907-230-5441', 130, 230, 'Active'),
    (34, 'Cabadbaran 3', 'Asis St., Brgy. 8, Cabadbaran ...', '5 AM to 8 PM', '0930-972-3611', 140, 240, 'Active'),
    (35, 'Cabadbaran 4', 'Highway, Brgy. Mabini, Cabadba...', '5 AM to 8 PM', '0948-200-8269', 150, 250, 'Active'),
    (36, 'Cabaluna', 'Brgy. Gredu Cabaluna, Panabo C...', '5 AM to 9 PM', '0967-448-9442', 160, 260, 'Active'),
    (37, 'Cabantian', 'Km.11, Purok 34, Forestal Road...', '24 HOURS', '0966-307-1966', 170, 270, 'Active'),
    (38, 'Cabantian 1', 'Corner Emilia Homes, Brgy. Cab...', '24 HOURS', '(082) 284-7620', 180, 280, 'Active'),
    (39, 'Cabantian 2', 'Alongside Cabantian, Cabantia...', '24 HOURS', '(082) 286-0564', 190, 290, 'Active'),
    (40, 'Caimito', 'Purok Caimito, Mankilam, Tagum...', '5 AM to 8 PM', '0906-337-1120', 100, 200, 'Active'),
    (41, 'Calinan 1', 'Prk. 31, Malanos St., Calinan,...', '24 HOURS', '0965-128-1090', 110, 210, 'Active'),
    (42, 'Calinan 2', 'Door 1 Isaguirre Bldg, Magsays...', '24 HOURS', '(082) 285-7848', 120, 220, 'Active'),
    (43, 'Calinan 3', 'Prk. 2, De Lara Street, Calina...', '24 HOURS', '0953-3861-045', 130, 230, 'Active'),
    (44, 'Calinan 4', 'Prk. 37, Davao-Bukidnon Road, ...', '24 HOURS', '(082) 284-9535', 140, 240, 'Active'),
    (45, 'Capitol', 'Purok 1, Roseville, Brgy. Vill...', '5 AM to 7 PM', '0950-775-3074', 150, 250, 'Active'),
    (46, 'Carmen', 'Pedrosa Bldg., Burgos St., Pob...', '5 AM to 8 PM', '0946-141-8632', 160, 260, 'Active'),
    (47, 'Carmen', 'Prk 6 ,Ising, Carmen, Davao de...', '24 HOURS', '(084) 284-9530', 170, 270, 'Active'),
    (48, 'Carmen, CDO', 'V.Neri St., Carmen, Cagayan de...', '5 AM to 8 PM', '0926-295-1809', 180, 280, 'Active'),
    (49, 'Catalunan', 'Lot 22, Blk 58, South Villa He...', '24 HOURS', '0946-623-4022', 190, 290, 'Active'),
    (50, 'Charis', 'J. Satorre St., Langihan, Holy...', '5 AM to 8 PM', '0950-578-7469', 100, 200, 'Active'),
    (51, 'Claver 1', 'Purok 6, Tayaga, Claver, Surig...', '5 AM to 8 PM', '0920-332-5133', 110, 210, 'Active'),
    (52, 'Claver 2', 'Purok 6 ,Tayag Ina, Claver, Su...', '5 AM to 8 PM', '0951-458-5123', 120, 220, 'Active'),
    (53, 'Claveria', 'CM Recto, Davao City, Davao de...', '6 AM to 6 PM', '0966-352-6613', 130, 230, 'Active'),
    (54, 'Damosa 1', 'St. Anthony Village, Brgy. Alf...', '24 HOURS', '0951-0948-036', 140, 240, 'Active'),
    (55, 'Damosa 2', 'Corner Jade St., Ph-2 Diamond ...', '24 HOURS', '0951-4041-867', 150, 250, 'Active'),
    (56, 'Digos', 'First Crumb, Lopez Jaena, Digo...', '5 AM to 8 PM', '0966-462-1892', 160, 260, 'Active'),
    (57, 'Digos 1', '1010 Rizal Ave., Zone 1 Poblac...', '24 HOURS', '0907-1687-981', 170, 270, 'Active'),
    (58, 'Digos 10', 'Purok Manggahan, Tres De Mayo,...', '24 HOURS', '0930-0579-713', 180, 280, 'Active'),
    (59, 'Digos 2', 'Lot 21, Blk 18, Lapu-Lapu St.,...', '24 HOURS', '0910-7383-510', 190, 290, 'Active'),
    (60, 'Digos 3', 'Rizal Ave, Zone 2 Poblacion, D...', '24 HOURS', '0907-5336-955', 100, 200, 'Active'),
    (61, 'Digos 4', 'Lim Ext., Zone 3 Poblacion, Di...', '24 HOURS', '0948-5557-529', 110, 210, 'Active'),
    (62, 'Digos 5', 'Tienda Aplaya, Digos City, Dav...', '24 HOURS', '(082) 237-0408', 120, 220, 'Active'),
    (63, 'Digos 6', '1st Crumb St., Zone 1, Digos C...', '24 HOURS', '(082) 286-0602', 130, 230, 'Active'),
    (64, 'Digos 7', 'McArthur Highway, Kiagot, Digo...', '24 HOURS', '(082) 286-3204', 140, 240, 'Active'),
    (65, 'Digos 8', 'Purok Acacia, Tres De Mayo, Di...', '5 AM to 6 PM', '0930-0579-713', 150, 250, 'Active'),
    (66, 'Digos 9', 'Purok Acacia Cogon, Digos City...', '24 HOURS', '(082) 286-0624', 160, 260, 'Active'),
    (67, 'Digos Mall', 'Sultan Kudarat Road, Digos Cit...', '24 HOURS', '(082) 286-4037', 170, 270, 'Active'),
    (68, 'Dona Pilar', 'Dr. 2 Velonia Suites Bldg., St...', '24 HOURS', '0967-226-3911', 180, 280, 'Active'),
    (69, 'Esperanza', 'Purok 10, Poblacion, Esperanza...', '5 AM to 8 PM', '0912-583-6130', 190, 290, 'Active'),
    (70, 'G. Flores', 'J. Flores Avenue, Brgy. Humabo...', '5 AM to 9 PM', '0910-177-4745', 100, 200, 'Active'),
    (71, 'Gempesaw', 'Gempesaw St., Magsaysay Avenue...', '5 AM to 7 PM', '0935-897-2679', 110, 210, 'Active'),
    (72, 'Gensan 1', 'Lot 2, Blk 1, Prk 11A, Fatima,...', '4 AM to 12 AM', '(083) 286-0604', 120, 220, 'Active'),
    (73, 'Gensan 2', 'Lower Acharon, Calumpang, Gene...', '4 AM to 12 AM', '(083) 286-3043', 130, 230, 'Active'),
    (74, 'Gensan 3', 'Zone 8, Blk. 11, Fatima Genera...', '4 AM to 12 AM', '(083) 284-2735', 140, 240, 'Active'),
    (75, 'Gensan 4', 'Aparente St., Corner Guevarra ...', '24 HOURS', '(083) 286-4034', 150, 250, 'Active'),
    (76, 'Gingoog 1', 'Brgy. 22 A, Gingoog City, Misa...', '5 AM to 7 PM', '0950-185-4505', 160, 260, 'Active'),
    (77, 'Gingoog 2', 'Donya Grasyana St., Brgy. 20, ...', '5 AM to 7 PM', '0912-708-0728', 170, 270, 'Active'),
    (78, 'GSI', 'JS Citimall Ilustre St., Brgy....', '10 AM to 7 PM', '(082) 286-3455', 180, 280, 'Active'),
    (79, 'HAGONOY', 'F.anzar St. Hagonoy davao dels...', '24/7', '', 190, 290, 'Active'),
    (80, 'Head Office', 'Ruby St, Agdao, Davao City, Da...', '8AM to 5PM', '', 100, 200, 'Active'),
    (81, 'Hilangos 1', 'Capt. Flordeliz St., Hilongos...', '4 AM to 8 PM', '0905-609-9090', 110, 210, 'Active'),
    (82, 'Hilangos 2', 'R.V. Fulache Corner M.L. Flore...', '4 AM to 8 PM', '0975-289-887', 120, 220, 'Active'),
    (83, 'Hilangos 3', 'Public Market, Central Pobloac...', '4 AM to 8 PM', '0905-175-8928', 130, 230, 'Active'),
    (84, 'Holy Cross', 'CTV Lending Bldg., San Antonio...', '24 HOURS', '0905-519-2279', 140, 240, 'Active'),
    (85, 'Ilang', 'Purok 10, Brgy. Tibungco, Buna...', '4 AM to 10 PM', '0948-325-0889', 150, 250, 'Active'),
    (86, 'Ilang', 'Central Ilang, Near Elem. Scho...', '24 HOURS', '0975-814-7475', 160, 260, 'Active'),
    (87, 'Indangan', 'Deca Homes Indangan, Cabantian...', '24 HOURS', '(082) 284-1482', 170, 270, 'Active'),
    (88, 'Inopacan', 'Inopacan, Leyte', '4 AM to 8 PM', '0926-532-0371', 180, 280, 'Active'),
    (89, 'Jerome', 'R. Castillo St., Corner Jerome...', '24 HOURS', '0906-584-9681', 190, 290, 'Active'),
    (90, 'JIK', '1st Gate, Famucy Bldg., Langih...', '5 AM to 8 PM', '0946-141-8996', 100, 200, 'Active'),
    (91, 'Kibongsod', 'Kibungsod, Magsaysay, Misamis ...', '5 AM to 8 PM', '0930-887-1480', 110, 210, 'Active'),
    (92, 'Kidapawan 2', 'Fronting DCCS, Quezon Avenue, ...', '24 HOURS', '(064) 286-3051', 120, 220, 'Active'),
    (93, 'Kidapawan 3', 'Datu Ingkal St., Poblacion, Ki...', '24 HOURS', '(064) 286-4027', 130, 230, 'Active'),
    (94, 'Kitcharao', 'Brgy. Poblacion, Kitcharao, Ag...', '5 AM to 8 PM', '0950-775-3067', 140, 240, 'Active'),
    (95, 'La Filipina', 'Prk. 2-A, La Filipina, Tagum C...', '5 AM to 8 PM', '0916-758-7469', 150, 250, 'Active'),
    (96, 'Lasang', 'Purok Leo, Brgy. Lasang Road, ...', '24 HOURS', '(082) 286-0361', 160, 260, 'Active'),
    (97, 'Libertad 1', 'P.3, Libertad, Butuan City, CA...', '5 AM to 8 PM', '0946-142-0567', 170, 270, 'Active'),
    (98, 'Libertad 2', 'Libertad, Butuan City, CARAGA', '5 AM to 8 PM', '0946-141-9661', 180, 280, 'Active'),
    (99, 'Los Amigos', 'Purok 6-D, Brgy. Los Amigos, T...', '24 HOURS', '0912-2367-397', 190, 290, 'Active'),
    (100, 'Lupon Aguinaldo', 'Aguinaldo St., Poblacion Lupon...', '5 AM to 8 PM', '0966-305-6521', 100, 200, 'Active'),
    (101, 'Lupon Rizal', 'Rizal St., Lupon, Davao Orient...', '5 AM to 8 PM', '0926-724-3938', 110, 210, 'Active'),
    (102, 'Maa', 'Purok 39, Salcedo Village, Riv...', '24 HOURS', '0977-704-4352', 120, 220, 'Active'),
    (103, 'Maa 1', 'Aldia Bldg., Maa Road, Davao C...', '24 HOURS', '(082) 224-1864', 130, 230, 'Active'),
    (104, 'Maa 2', 'Purok 15, Spring Village, Brgy...', '24 HOURS', '(082) 284-8094', 140, 240, 'Active'),
    (105, 'Maa HB1', 'Door 3, Ground Floor, Vyrgyz P...', '24 HOURS', '0956-693-9995', 150, 250, 'Active'),
    (106, 'Maasin 1', 'Corner R. Garces St. & Espina ...', '4 AM to 7 PM', '0997-507-2821', 160, 260, 'Active'),
    (107, 'Maasin 2', 'R. Kangleon St., Abgao, Maasin...', '4 AM to 7 PM', '0997-507-2779', 170, 270, 'Active'),
    (108, 'Maasin 3', 'Purok Mangga, Isagani, Maasin ...', '4 AM to 7 PM', '0905-319-7626', 180, 280, 'Active'),
    (109, 'Mabini', 'Prk. Castrence, Mabini St., Ma...', '5 AM to 8 PM', '0956-579-4002', 190, 290, 'Active'),
    (110, 'Madaum', 'Purok 9, Katipunan, Madaum, Ta...', '5 AM to 8 PM', '0967-226-4011', 100, 200, 'Active'),
    (111, 'Magpayang', 'P-1 Magpayang, Mainit, Agusan ...', '5 AM to 8 PM', '0912-700-7946', 110, 210, 'Active'),
    (112, 'Malalag', 'Purok Camanchiles, Poblacion, ...', '5 AM to 8 PM', '0907-5335-343', 120, 220, 'Active'),
    (113, 'Mandug', 'Phase 2, Mandug H-Way, Brgy. M...', '24 HOURS', '0956-235-3122', 130, 230, 'Active'),
    (114, 'Mangga', 'Purok Kalipay, Visayan Village...', '5 AM to 8 PM', '0995-094-3562', 140, 240, 'Active'),
    (115, 'Maramag', 'P7, North Poblacion, Maramag, ...', '5 AM to 8 PM', '0936-270-2708', 150, 250, 'Active'),
    (116, 'Marigodon 1', 'C/O Rose Bakeshop, Crossing Ma...', '5 AM to 10 PM', '0910-848-2059', 160, 260, 'Active'),
    (117, 'Marigodon 2', 'Market Market, Marigondon, Lap...', '5 AM to 10 PM', '0947-415-9355', 170, 270, 'Active'),
    (118, 'Mati', 'Martinez St., Brgy. Dahican, M...', '5 AM to 8 PM', '0967-226-4008', 180, 280, 'Active'),
    (119, 'Matina Aplaya', 'Del Carmen Village, Brgy. Mati...', '24 HOURS', '(082) 286-4007', 190, 290, 'Active'),
    (120, 'Matina Pangi', 'Brgy. 74-A, Matina Crossing, T...', '24 HOURS', '(082) 284-1361', 100, 200, 'Active'),
    (121, 'Meadows', 'Edella Complex, Green Meadows,...', '24 HOURS', '0935-7489-504', 110, 210, 'Active'),
    (122, 'Medina', 'P. 6, South Poblacion, Medina,...', '5 AM to 8 PM', '0909-588-0180', 120, 220, 'Active'),
    (123, 'Milan', 'Door 2, Tiempo Bldg., Cabantia...', '24 HOURS', '(082) 284-9532', 130, 230, 'Active'),
    (124, 'Mintal', 'Prk 12, San Francisco St., Brg...', '24 HOURS', '0975-9621-342', 140, 240, 'Active'),
    (125, 'Mintal 2', 'Edeliza Complex, Green Meadows...', '5 AM to 8 PM1', '', 150, 250, 'Active'),
    (126, 'Montilla', 'Montilla Blvd., Butuan City, C...', '5 AM to 8 PM', '0912-708-0728', 160, 260, 'Active'),
    (127, 'Nasipit', 'Brgy. 4, Nasipit, Agusan del N...', '5 AM to 8 PM', '0951-814-8153', 170, 270, 'Active'),
    (128, 'New Corella', 'Purok 3, Poblacion, New Corell...', '5 AM to 8 PM', '0977-761-0340', 180, 280, 'Active'),
    (129, 'New pandan', '2312 Roxas St., New Pandan, Pa...', '5 AM to 9 PM', '0945-096-9817', 190, 290, 'Active'),
    (130, 'New Visayas', 'Door 1&2 Cubay Bldg., Prk. 3 L...', '5 AM to 7 PM', '0966-461-5918', 100, 200, 'Active'),
    (131, 'NHA', '9 Mabini St., Brgy. Buhangin, ...', '24 HOURS', '(082) 241-2672', 110, 210, 'Active'),
    (132, 'Obrero', 'Corner Lacson-Porras Sts., Brg...', '24 HOURS', '(082) 224-2233', 120, 220, 'Active'),
    (133, 'Ochoa', 'Ochoa Avenue, Tandang Sora, Bu...', '5 AM to 8 PM', '0907-281-8528', 130, 230, 'Active'),
    (134, 'Ormoc', 'Lilia Ave., Purok Jasmin, Cogo...', '4 AM to 10 PM', '0916-914-3858', 140, 240, 'Active'),
    (135, 'Padada 1', 'Matas Bldg., Rizal St., Padada...', '5 AM to 8 PM', '082-284-9531 / 0915-181-8325', 150, 250, 'Active'),
    (136, 'Padada 2', 'Quezon St., Brgy. Nco M, Padad...', '5 AM to 8 PM', '0946-647-5903', 160, 260, 'Active'),
    (137, 'Pag-asa', 'Corner Pag-Asa St,. Buhangin, ...', '24 HOURS', '(082) 225-9084', 170, 270, 'Active'),
    (138, 'Palm Drive', 'Door 2, Adolfo Bldg., Palm Dri...', '24 HOURS', '0966-461-5938', 180, 280, 'Active'),
    (139, 'Panabo 1', 'Purok Nangka, Gredu, Panabo Ci...', '24 HOURS', '(084) 286-3761', 190, 290, 'Active'),
    (140, 'Panabo 3', 'Prk 3A, Duterte St., San Fran...', '24 HOURS', '(084) 286-4024', 100, 200, 'Active'),
    (141, 'Panabo 4', 'Prk. 2, San Francisco, Panabo ...', '24 HOURS', '0975-607-1027', 110, 210, 'Active'),
    (142, 'Panabo 6', 'Prk Chico, Sto. Niño, Panabo ...', '24 HOURS', '(084) 286-4004', 120, 220, 'Active'),
    (143, 'Panabo Mall', 'Panabo Grand Mall, Prk Chico, ...', '24 HOURS', '(084) 286-2551', 130, 230, 'Active'),
    (144, 'Panacan', 'Km 14, San Miguel St., Brgy. P...', '24 HOURS', '(082) 286-0365', 140, 240, 'Active'),
    (145, 'Pantalan', 'Pantalan, Miranda, Babak Distr...', '5 AM to 8 PM', '0945-659-5465', 150, 250, 'Active'),
    (146, 'Pantukan', 'King King Highway, Pantukan, D...', '5 AM to 8 PM', '0966-465-4752', 160, 260, 'Active'),
    (147, 'Patin ay', 'Purok 3, Patin-Ay, Prosperidad...', '5 AM to 6 PM', '0966-461-5927', 170, 270, 'Active'),
    (148, 'Patin Ay', 'Brgy. Patin-Ay, Prosperidad, A...', '5 AM to 7 PM', '0956-582-0034', 180, 280, 'Active'),
    (149, 'Penaplata', 'Purok 2, Penaplata, IGACOS, Da...', '5 AM to 8 PM', '0967-226-3993', 190, 290, 'Active'),
    (150, 'Placer', 'Poblacion Center, Placer, Suri...', '5 AM to 7 PM', '0951-410-7088', 100, 200, 'Active'),
    (151, 'Poblacion', 'Beside City Central School, P....', '5 AM to 9 PM', '0933-136-1206', 110, 210, 'Active'),
    (152, 'Polomolok 1', 'Diamson Bldg., Dahlia St., Pob...', '4 AM to 10 PM', '(083) 286-4530', 120, 220, 'Active'),
    (153, 'Polomolok 2', 'Purok San Agustin, Pannary Roa...', '4 AM to 10 PM', '(083) 286-4026', 130, 230, 'Active'),
    (154, 'Polomolok 3', 'Tuazo Subd., Poblacion, Polomo...', '4 AM to 10 PM', '(083) 286-4025', 140, 240, 'Active'),
    (155, 'Puan', 'Libby Road, Puan, Talomo, Dava...', '24 HOURS', '(082) 284-9534', 150, 250, 'Active'),
    (156, 'R.Castillo', 'R. Castillo Street, Brgy. Ubal...', '24 HOURS', '(082) 228-2991', 160, 260, 'Active'),
    (157, 'Rasay Toril', 'Corner De Guzman-Rasay Sts., T...', '24 HOURS', '0945-113-7999', 170, 270, 'Active'),
    (158, 'Robinsons', 'J.C Aquino Avenue, Butuan City...', '9 AM to 8 PM', '0950-832-8918', 180, 280, 'Active'),
    (159, 'RTR', 'P.3, Brgy. Poblacion 2, Remedi...', '5 AM to 8 PM', '0907-230-5172', 190, 290, 'Active'),
    (160, 'Salay', 'P. 7, Brgy. Poblacion, Salay, ...', '5 AM to 7 PM', '0946-038-2867', 100, 200, 'Active'),
    (161, 'San Francisco Branch 4', 'Brgy. 2, San Francisco, Agusan...', '5 AM to 7 PM', '0956-582-0034', 110, 210, 'Active'),
    (162, 'San Francisco Main', 'Center Island, Brgy. 4, San Fr...', '5 AM to 7 PM', '0917-710-5481', 120, 220, 'Active'),
    (163, 'San Francisco Stall', 'Old Painitan, Brgy. 2, San Fra...', '5 AM to 6 PM', '', 130, 230, 'Active'),
    (164, 'San Miguel', 'San Miguel, Tagum City, Davao ...', '5 AM to 8 PM', '0967-226-4004', 140, 240, 'Active'),
    (165, 'San Pedro', 'San Pedro St., Brgy. 2-A, Pobl...', '4 AM to 10 PM', '(082) 225-4778', 150, 250, 'Active'),
    (166, 'Sandawa 1', 'Sandawa Road, SIR, Davao City,...', '24 HOURS', '0915-677-8822', 160, 260, 'Active'),
    (167, 'Sann Francisco Branch 3', 'Public Market, Brgy. 2, San Fr...', '5 AM to 7 PM', '0995-153-8599', 170, 270, 'Active'),
    (168, 'Santiago', 'Zone 3, Poblacion 2, Santiago,...', '5 AM to 8 PM', '0946-670-9432', 180, 280, 'Active'),
    (169, 'Sibagat', 'P-8A, Poblacion, Sibagat, Agus...', '5 AM to 8 PM', '0907-230-5466', 190, 290, 'Active'),
    (170, 'Sison', 'P-2, San Pedro, Sison, Surigao...', '5 AM to 8 PM', '0907-840-0278', 100, 200, 'Active'),
    (171, 'Sobrecarey', 'Sobrecarey St., Magugpo Poblac...', '5 AM to 8 PM', '0966-487-6448', 110, 210, 'Active'),
    (172, 'Sogod 1', 'Rizal St., Zone V, Sogod, Sout...', '4 AM to 7 PM', '0935-620-8650', 120, 220, 'Active'),
    (173, 'Sogod 2', 'Zone I, Sogod, Southern Leye', '4 AM to 7 PM', '0905-129-0437', 130, 230, 'Active'),
    (174, 'Sta Cruz 1', 'Townsite, Zone II, Sta.Cruz, D...', '24 HOURS', '(082) 286-0624', 140, 240, 'Active'),
    (175, 'Sta Cruz 2', 'Sitio San Jose, Zone 4, Sta.Cr...', '24 HOURS', '(082) 284-1533', 150, 250, 'Active'),
    (176, 'Sta Maria', 'Poblacion, Sta. Maria, Davao O...', '5 AM to 10 PM', '0946-7529-688', 160, 260, 'Active'),
    (177, 'Suaybaguio', 'Suaybaguio-A, Magugpo North, T...', '5 AM to 8 PM', '0967-226-4000', 170, 270, 'Active'),
    (178, 'Surigao', 'Lynde Building, Km. 4, Luna, S...', '5 AM to 8 PM', '0930-475-4965', 180, 280, 'Active'),
    (179, 'Taganito', 'Purok 2, Taganito, Claver, Sur...', '5 AM to 8 PM', '0946-305-0114', 190, 290, 'Active'),
    (180, 'Tagum 1', 'Prk. 5, Apokon, Tagum City, Da...', '4 AM to 8 PM', '(084) 284-3243', 100, 200, 'Active'),
    (181, 'Tagum 2', 'Asaje Bldg., Prk. Cabilto, Vis...', '4 AM to 8 PM', '0947-3269-005', 110, 210, 'Active'),
    (182, 'Tagum 3', 'Dr. 1 Pereyras Bldg., Magugpo ...', '4 AM to 8 PM', '(084) 286-4038', 120, 220, 'Active'),
    (183, 'Tagum 4', 'Villa Magsanoc, Mankilam, Tagu...', '4 AM to 8 PM', '(084) 286-1703', 130, 230, 'Active'),
    (184, 'Tagum 5', 'Ferido Bldg., Purok Galingan, ...', '4 AM to 8 PM', '(084) 281-9267', 140, 240, 'Active'),
    (185, 'Tagum 6', 'Prk. Bagong, Lipunan Sup Bldg....', '4 AM to 8 PM', '(084) 284-9266', 150, 250, 'Active'),
    (186, 'Tagum 7', 'Purok Pag-asa, Visayan Village...', '4 AM to 8 PM', '(084) 284-1446', 160, 260, 'Active'),
    (187, 'Tagum 8', 'Fronting Apokon Elem. School, ...', '4 AM to 8 PM', '(084) 228-41383', 170, 270, 'Active'),
    (188, 'Tagum 9', 'Purok. Narra, New Visayan Vill...', '4 AM to 8 PM', '0926-880-0491', 180, 280, 'Active'),
    (189, 'Tagum Briz', 'Colina Bldg., Prk. 56, Talisay...', '5 AM to 8 PM', '0916-454-5637', 190, 290, 'Active'),
    (190, 'Tecarro', 'G.E. Torres St., Sandawa Road,...', '24 HOURS', '0966-461-5921', 100, 200, 'Active'),
    (191, 'Terminal', 'Bus Terminal, Langihan Port, P...', '5 AM to 7 PM', '0912-708-0728', 110, 210, 'Active'),
    (192, 'Tibungco 1', 'Eliong St., Tibungco, Davao Ci...', '24 HOURS', '(082) 284-9536', 120, 220, 'Active'),
    (193, 'Tibungco 2', 'Along National Highway, Tibung...', '24 HOURS', '(082) 286-0608', 130, 230, 'Active'),
    (194, 'Tigatto', 'Km 7, Tigatto Road, Buhangin D...', '24 HOURS', '0948-5647-435', 140, 240, 'Active'),
    (195, 'Tigatto', 'Blk 79, Lot 27, Deca Homes Esp...', '24 HOURS', '0967-226-4001', 150, 250, 'Active'),
    (196, 'Times Beach', 'Purok 24, Manggahan Times, Brg...', '24 HOURS', '0915-463-3389', 160, 260, 'Active'),
    (197, 'Toril 1', 'P-4 Vdlr St., Bayabas Crossing...', '24 HOURS', '(082) 286-0561', 170, 270, 'Active'),
    (198, 'Toril 2', 'Lizada, Toril, Davao City, Dav...', '24 HOURS', '(082) 284-9527', 180, 280, 'Active'),
    (199, 'Toril 3', 'Prk. 4, McArthur Highway, Cros...', '9 AM to 6 PM', '0948-824-5966', 190, 290, 'Active'),
    (200, 'Toril 4', 'Purok 2, Brgy. Lubogan, Toril,...', '24 HOURS', '(082) 284-2752', 100, 200, 'Active'),
    (201, 'Toril 5', 'Lot 1, Blk 6, Fesa St., Sitio ...', '24 HOURS', '(082) 286-1704', 110, 210, 'Active'),
    (202, 'Toril 6', 'Purok 4, Vdlr St., Infront Of ...', '24 HOURS', '(082) 286-4035', 120, 220, 'Active'),
    (203, 'Toril 7 (IWHA)', 'Doña Carmen Denia Drive, Brgy...', '24 HOURS', '(082) 286-4527', 130, 230, 'Active'),
    (204, 'Toril 8', 'Sitio Fisherman Village, Brgy....', '24 HOURS', '(082) 286-0565', 140, 240, 'Active'),
    (205, 'Ulas', 'Ulas Crossing, Talomo, Davao C...', '24 HOURS', '0967-226-4002', 150, 250, 'Active'),
    (206, 'Valencia Main', 'Purok 13, Hagkol Poblacion, Va...', '5 AM to 8 PM', '0953-379-3439', 160, 260, 'Active'),
    (207, 'Valencia Upland', 'Purok 13, Hagkol Poblacion, Va...', '5 AM to 8 PM', '0906-932-7613', 170, 270, 'Active'),
    (208, 'Valencia Villa', 'Villahermosa Bldg., Purok 1, G...', '5 AM to 8 PM', '0935-235-5605', 180, 280, 'Active'),
    (209, 'Victorias', 'Brgy. 4 (Fytc), San Francisco,...', '5 AM to 8 PM', '0907-856-6864', 190, 290, 'Active'),
    (210, 'Villarica', 'Miranda, Babak District, IGACO...', '5 AM to 8 PM', '0945-708-7429', 100, 200, 'Active')
    ON DUPLICATE KEY UPDATE 
      name = VALUES(name), 
      address = VALUES(address),
      store_hours = VALUES(store_hours),
      contact_no = VALUES(contact_no);
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
      address TEXT,
      store_hours VARCHAR(100),
      contact_no VARCHAR(100)
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

// 3. BRANCH NETWORK API
app.get('/api/branches', cache('5 minutes'), async (req, res) => {
  try {
    const result = await queryDb("SELECT * FROM bw_branches ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/branches', async (req, res) => {
  const { name, latitude, longitude, address, store_hours, contact_no } = req.body;
  try {
    const result = await queryDb(
      "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, 'Active') RETURNING *",
      [name, parseFloat(latitude), parseFloat(longitude), address, store_hours, contact_no]
    );
    res.status(201).json(result.rows[0] || { name, latitude, longitude, address, store_hours, contact_no, status: 'Active' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/branches/:id', async (req, res) => {
  const { id } = req.params;
  const { name, latitude, longitude, address, store_hours, contact_no, status } = req.body;
  try {
    await queryDb(
      "UPDATE bw_branches SET name = $1, latitude = $2, longitude = $3, address = $4, store_hours = $5, contact_no = $6, status = $7 WHERE id = $8",
      [name, parseFloat(latitude), parseFloat(longitude), address, store_hours, contact_no, status || 'Active', parseInt(id)]
    );
    res.json({ success: true, id, name, latitude, longitude, address, store_hours, contact_no, status });
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
app.get('/api/products', cache('5 minutes'), async (req, res) => {
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
    await queryDb(
      "INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [prodId, name, category, parseFloat(price), parseFloat(cost), parseInt(shelf_life_days), repurpose_recipe]
    );
    res.status(201).json({ id: prodId, name, category, price, cost, shelf_life_days, repurpose_recipe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, price, cost, shelf_life_days, repurpose_recipe } = req.body;
  try {
    await queryDb(
      "UPDATE bw_products SET name = $1, category = $2, price = $3, cost = $4, shelf_life_days = $5, repurpose_recipe = $6 WHERE id = $7",
      [name, category, parseFloat(price), parseFloat(cost), parseInt(shelf_life_days), repurpose_recipe, id]
    );
    res.json({ id, name, category, price, cost, shelf_life_days, repurpose_recipe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await queryDb("DELETE FROM bw_products WHERE id = $1", [id]);
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

// 11. AI FORECASTING API (RANDOM FOREST VIA PYTHON)
app.post('/api/forecast', (req, res) => {
  const { exec } = require('child_process');

  const payload = JSON.stringify(req.body);
  const scriptPath = path.join(__dirname, 'src', 'ai_forecast.py');

  // Use python.exe or python depending on env. 
  // In Windows env provided, we verified python is available
  const command = `python "${scriptPath}"`;

  const child = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return res.status(500).json({ predicted_demand: 30, error: 'AI Prediction Failed' });
    }
    try {
      const result = JSON.parse(stdout);
      res.json(result);
    } catch (e) {
      console.error(`JSON Parse Error: ${e} Output: ${stdout}`);
      res.status(500).json({ predicted_demand: 30, error: 'Invalid Output from AI Engine' });
    }
  });

  child.stdin.write(payload);
  child.stdin.end();
});

// --- SERVE FRONTEND STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// START EXPRESS SERVER
app.listen(PORT, () => {
  console.log(`BakeWise Enterprise System server is listening on http://localhost:${PORT}`);
});
