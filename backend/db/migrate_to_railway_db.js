const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const targetUrl = process.env.NEW_DATABASE_URL || process.env.DATABASE_URL;

if (!targetUrl || targetUrl.includes('supabase.com')) {
  console.error("Please set NEW_DATABASE_URL to your new Railway PostgreSQL connection string.");
  console.error("Example: $env:NEW_DATABASE_URL='postgresql://postgres:password@postgres.railway.internal:5432/railway'; node backend/db/migrate_to_railway_db.js");
  process.exit(1);
}

const pool = new Pool({ connectionString: targetUrl });

async function restore() {
  const dataFile = path.join(__dirname, 'supabase_migration_data.json');
  if (!fs.existsSync(dataFile)) {
    console.error("No migration file found at:", dataFile);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

  console.log("Restoring records to new Railway Database...");

  // 1. Branches
  if (data.bw_branches) {
    for (const b of data.bw_branches) {
      await pool.query(
        `INSERT INTO bw_branches (id, name, location, contact, manager_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [b.id, b.name, b.location, b.contact, b.manager_name]
      );
    }
    console.log(`✓ Restored ${data.bw_branches.length} branches`);
  }

  // 2. Users
  if (data.bw_users) {
    for (const u of data.bw_users) {
      await pool.query(
        `INSERT INTO bw_users (id, email, password, name, role, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [u.id, u.email, u.password, u.name, u.role, u.branch_id]
      );
    }
    console.log(`✓ Restored ${data.bw_users.length} users`);
  }

  // 3. Products
  if (data.bw_products) {
    for (const p of data.bw_products) {
      await pool.query(
        `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.category, p.price, p.cost, p.shelf_life_days, p.repurpose_recipe]
      );
    }
    console.log(`✓ Restored ${data.bw_products.length} products`);
  }

  // 4. Inventory
  if (data.bw_inventory) {
    for (const inv of data.bw_inventory) {
      await pool.query(
        `INSERT INTO bw_inventory (id, product_id, stock_level, production_date, expiry_date, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [inv.id, inv.product_id, inv.stock_level, inv.production_date, inv.expiry_date, inv.branch_id]
      );
    }
    console.log(`✓ Restored ${data.bw_inventory.length} inventory records`);
  }

  // 5. Sales
  if (data.bw_sales) {
    for (const s of data.bw_sales) {
      await pool.query(
        `INSERT INTO bw_sales (id, transaction_id, product_id, product_name, category, quantity, total_price, date, branch_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [s.id, s.transaction_id, s.product_id, s.product_name, s.category, s.quantity, s.total_price, s.date, s.branch_id]
      );
    }
    console.log(`✓ Restored ${data.bw_sales.length} sales records`);
  }

  console.log("Database migration to Railway completed successfully!");
  await pool.end();
}

restore().catch(console.error);
