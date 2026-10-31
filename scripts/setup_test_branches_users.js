const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const connStr = process.env.DATABASE_URL || "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function seedBranchesAndUsers() {
  await client.connect();
  console.log("Setting up branches and test users...");

  // Update branch 2 name to Tibungco 2 if it was Main Branch
  await client.query("UPDATE bw_branches SET name = 'Tibungco 2' WHERE id = 2");

  // Ensure Lasang exists
  const lasangRes = await client.query("SELECT id FROM bw_branches WHERE name = 'Lasang'");
  let lasangId = lasangRes.rows.length > 0 ? lasangRes.rows[0].id : null;
  if (!lasangId) {
    const newL = await client.query("INSERT INTO bw_branches (name, address, status) VALUES ('Lasang', 'KM 23, Lasang, Davao City', 'Active') RETURNING id");
    lasangId = newL.rows[0].id;
  }

  // Ensure Tibungco 2 exists
  const tibRes = await client.query("SELECT id FROM bw_branches WHERE name = 'Tibungco 2'");
  let tibId = tibRes.rows.length > 0 ? tibRes.rows[0].id : null;
  if (!tibId) {
    const newT = await client.query("INSERT INTO bw_branches (name, address, status) VALUES ('Tibungco 2', 'Tibungco, Davao City', 'Active') RETURNING id");
    tibId = newT.rows[0].id;
  }

  console.log("Tibungco 2 ID:", tibId, "Lasang ID:", lasangId);

  // Setup Lasang inventory user for testing authorization
  const hash = bcrypt.hashSync('password123', 10);
  await client.query(
    `INSERT INTO bw_users (email, password, name, role, branch_id)
     VALUES ('inventory_lasang@bakewise.com', $1, 'Lasang Inventory Officer', 'inventory', $2)
     ON CONFLICT (email) DO UPDATE SET branch_id = $2, role = 'inventory'`,
    [hash, lasangId]
  );

  const branches = await client.query("SELECT id, name FROM bw_branches ORDER BY id ASC");
  console.log("Current branches:", branches.rows);

  const users = await client.query("SELECT id, email, role, branch_id FROM bw_users ORDER BY id ASC");
  console.log("Current users:", users.rows);

  console.log("Setup finished successfully.");
  await client.end();
}

seedBranchesAndUsers().catch(err => {
  console.error(err);
  process.exit(1);
});

