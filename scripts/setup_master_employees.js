/**
 * Set up the required 10 employee accounts for Rose Bakeshop x BakeWise:
 * LASANG (Branch 3):
 *  - 1 Manager: manager_lasang@bakewise.com (Elena Santos)
 *  - 2 Inventory / Production Staff: inventory_lasang@bakewise.com (Danilo Cruz), production_lasang@bakewise.com (Marco Reyes)
 *  - 2 Cashiers: cashier1_lasang@bakewise.com (Grace Lim), cashier2_lasang@bakewise.com (Ramon Bautista)
 * 
 * TIBUNGCO 2 (Branch 5):
 *  - 1 Manager: manager_tibungco@bakewise.com (Roberto Gomez)
 *  - 2 Inventory / Production Staff: inventory_tibungco@bakewise.com (Lorna Villanueva), production_tibungco@bakewise.com (Arnel Mendoza)
 *  - 2 Cashiers: cashier1_tibungco@bakewise.com (Patricia Dizon), cashier2_tibungco@bakewise.com (Kristine Ramos)
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const EMPLOYEES = [
  // LASANG (Branch 3)
  {
    name: 'Elena Santos',
    email: 'manager_lasang@bakewise.com',
    role: 'manager',
    branch_id: 3
  },
  {
    name: 'Danilo Cruz',
    email: 'inventory_lasang@bakewise.com',
    role: 'inventory',
    branch_id: 3
  },
  {
    name: 'Marco Reyes',
    email: 'production_lasang@bakewise.com',
    role: 'production',
    branch_id: 3
  },
  {
    name: 'Grace Lim',
    email: 'cashier1_lasang@bakewise.com',
    role: 'sales',
    branch_id: 3
  },
  {
    name: 'Ramon Bautista',
    email: 'cashier2_lasang@bakewise.com',
    role: 'sales',
    branch_id: 3
  },

  // TIBUNGCO 2 (Branch 5)
  {
    name: 'Roberto Gomez',
    email: 'manager_tibungco@bakewise.com',
    role: 'manager',
    branch_id: 5
  },
  {
    name: 'Lorna Villanueva',
    email: 'inventory_tibungco@bakewise.com',
    role: 'inventory',
    branch_id: 5
  },
  {
    name: 'Arnel Mendoza',
    email: 'production_tibungco@bakewise.com',
    role: 'production',
    branch_id: 5
  },
  {
    name: 'Patricia Dizon',
    email: 'cashier1_tibungco@bakewise.com',
    role: 'sales',
    branch_id: 5
  },
  {
    name: 'Kristine Ramos',
    email: 'cashier2_tibungco@bakewise.com',
    role: 'sales',
    branch_id: 5
  }
];

async function setupEmployees() {
  console.log('--- Setting up 10 Official Employee Accounts ---');
  const defaultHash = bcrypt.hashSync('password123', 10);

  for (const emp of EMPLOYEES) {
    const existing = await pool.query('SELECT id, name, role, branch_id FROM bw_users WHERE email = $1', [emp.email]);
    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE bw_users SET name = $1, password = $2, role = $3, branch_id = $4 WHERE id = $5',
        [emp.name, defaultHash, emp.role, emp.branch_id, existing.rows[0].id]
      );
      console.log(`✓ Updated account: ${emp.name} (${emp.email}, Role: ${emp.role}, Branch: ${emp.branch_id})`);
    } else {
      await pool.query(
        'INSERT INTO bw_users (name, email, password, role, branch_id) VALUES ($1, $2, $3, $4, $5)',
        [emp.name, emp.email, defaultHash, emp.role, emp.branch_id]
      );
      console.log(`✓ Created account: ${emp.name} (${emp.email}, Role: ${emp.role}, Branch: ${emp.branch_id})`);
    }
  }

  const allUsers = await pool.query('SELECT id, name, email, role, branch_id FROM bw_users ORDER BY branch_id, id');
  console.log('\n--- Current Users in Database ---');
  console.table(allUsers.rows);

  await pool.end();
}

setupEmployees().catch(console.error);

