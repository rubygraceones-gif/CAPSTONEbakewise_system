const { Client } = require('pg');

const connStr = process.env.DATABASE_URL || "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function migrate() {
  console.log("Connecting to database...");
  await client.connect();
  console.log("Connected. Applying branch-based inventory & product catalog schema...");

  // 1. bw_products enhancements
  await client.query(`
    ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES bw_branches(id) ON DELETE CASCADE;
    ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
    ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Active';
    ALTER TABLE bw_products ADD COLUMN IF NOT EXISTS description TEXT;
  `);
  console.log("✓ bw_products columns updated");

  // 2. bw_branch_products mapping table
  await client.query(`
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
  `);
  console.log("✓ bw_branch_products table ready");

  // 3. bw_inventory enhancements
  await client.query(`
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'pcs';
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'In Stock';
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS batch_id VARCHAR(100);
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS production_time VARCHAR(20) DEFAULT '06:00:00';
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS expiry_time VARCHAR(20) DEFAULT '18:00:00';
    ALTER TABLE bw_inventory ADD COLUMN IF NOT EXISTS degradation_percent INTEGER DEFAULT 0;
  `);
  console.log("✓ bw_inventory columns updated");

  // 4. bw_inventory_movements table
  await client.query(`
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
  `);
  console.log("✓ bw_inventory_movements table ready");

  // 5. bw_inventory_batches table
  await client.query(`
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
  console.log("✓ bw_inventory_batches table ready");

  await client.end();
  console.log("Database schema migration completed successfully!");
}

migrate().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
