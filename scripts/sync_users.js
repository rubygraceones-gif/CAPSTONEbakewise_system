const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = process.env.DATABASE_URL || "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function syncUsers() {
  await client.connect();
  const hash = bcrypt.hashSync('password123', 10);

  // 1. Tibungco 2 users
  await client.query(`
    INSERT INTO bw_users (email, password, name, role, branch_id)
    VALUES ('inventory_tibungco@bakewise.com', $1, 'Tibungco Inventory Staff', 'inventory', 5)
    ON CONFLICT (email) DO UPDATE SET branch_id = 5, role = 'inventory', password = $1
  `, [hash]);

  // 2. Lasang users
  await client.query(`
    INSERT INTO bw_users (email, password, name, role, branch_id)
    VALUES ('inventory_lasang@bakewise.com', $1, 'Lasang Inventory Staff', 'inventory', 3)
    ON CONFLICT (email) DO UPDATE SET branch_id = 3, role = 'inventory', password = $1
  `, [hash]);

  // 3. Admin user
  await client.query(`
    INSERT INTO bw_users (email, password, name, role, branch_id)
    VALUES ('admin@bakewise.com', $1, 'System Administrator', 'admin', NULL)
    ON CONFLICT (email) DO UPDATE SET branch_id = NULL, role = 'admin', password = $1
  `, [hash]);

  const users = await client.query("SELECT id, email, role, branch_id FROM bw_users WHERE email LIKE '%@bakewise.com'");
  console.log("Users:", users.rows);
  await client.end();
}

syncUsers().catch(console.error);
