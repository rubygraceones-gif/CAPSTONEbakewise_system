const { Client } = require('pg');

const connStr = process.env.DATABASE_URL || "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function fixBranches() {
  await client.connect();
  // Restore Branch 2 as Main Branch
  await client.query("UPDATE bw_branches SET name = 'Main Branch' WHERE id = 2");

  // Check if Tibungco 2 exists
  const tib = await client.query("SELECT id FROM bw_branches WHERE name = 'Tibungco 2'");
  if (tib.rows.length === 0) {
    await client.query(`
      INSERT INTO bw_branches (name, address, contact_no, latitude, longitude, store_hours, status)
      VALUES ('Tibungco 2', 'KM 18, Tibungco, Davao City', '09201234567', 7.1836, 125.6610, '05:00 AM - 09:00 PM', 'Active')
    `);
  }

  const all = await client.query("SELECT id, name FROM bw_branches ORDER BY id ASC");
  console.log("Branches:", all.rows);
  await client.end();
}

fixBranches().catch(console.error);

