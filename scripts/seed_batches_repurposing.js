const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function seed() {
  console.log("Seeding traceable inventory batches and near-expiry records for BakeWise...");

  // 1. Ensure columns exist in bw_inventory_batches
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bw_inventory_batches (
      id SERIAL PRIMARY KEY,
      batch_code VARCHAR(100) UNIQUE NOT NULL,
      branch_id INTEGER NOT NULL,
      product_id VARCHAR(50) NOT NULL,
      initial_quantity INTEGER NOT NULL,
      current_quantity INTEGER NOT NULL,
      production_date DATE NOT NULL,
      production_time VARCHAR(20) DEFAULT '06:00:00',
      expiry_date DATE NOT NULL,
      expiry_time VARCHAR(20) DEFAULT '18:00:00',
      storage_condition VARCHAR(100) DEFAULT 'Covered Room-Temperature Storage',
      status VARCHAR(50) DEFAULT 'In Stock',
      food_safety_status VARCHAR(50) DEFAULT 'Approved',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add storage_condition and food_safety_status if not present
  await pool.query(`
    ALTER TABLE bw_inventory_batches ADD COLUMN IF NOT EXISTS storage_condition VARCHAR(100) DEFAULT 'Covered Room-Temperature Storage';
    ALTER TABLE bw_inventory_batches ADD COLUMN IF NOT EXISTS food_safety_status VARCHAR(50) DEFAULT 'Approved';
  `);

  // Clear old test batches if any
  await pool.query("DELETE FROM bw_inventory_batches");

  const now = new Date('2026-10-31T18:00:00.000Z');
  
  // Sample batches
  const batches = [
    {
      code: 'BATCH-PAN-20261030-01',
      branch_id: 2,
      product_id: 'p1', // Pandesal
      initial_qty: 50,
      current_qty: 15,
      prod_date: '2026-10-30',
      prod_time: '05:00:00',
      expiry_date: '2026-11-01',
      expiry_time: '12:00:00',
      storage: 'Covered Room-Temperature Storage',
      status: 'Near Expiry',
      food_safety: 'Approved'
    },
    {
      code: 'BATCH-SLB-20261029-02',
      branch_id: 2,
      product_id: 'p3', // Classic Sliced Bread
      initial_qty: 40,
      current_qty: 8,
      prod_date: '2026-10-29',
      prod_time: '06:00:00',
      expiry_date: '2026-11-01',
      expiry_time: '06:00:00',
      storage: 'Covered Room-Temperature Storage',
      status: 'Expiring Soon',
      food_safety: 'Approved'
    },
    {
      code: 'BATCH-ENS-20261029-01',
      branch_id: 2,
      product_id: 'p2', // Special Ensaymada
      initial_qty: 30,
      current_qty: 10,
      prod_date: '2026-10-29',
      prod_time: '07:00:00',
      expiry_date: '2026-11-01',
      expiry_time: '18:00:00',
      storage: 'Display Case Storage',
      status: 'Near Expiry',
      food_safety: 'Approved'
    },
    {
      code: 'BATCH-CAK-20261025-01',
      branch_id: 2,
      product_id: 'p4', // Premium Chocolate Cake
      initial_qty: 10,
      current_qty: 2,
      prod_date: '2026-10-25',
      prod_time: '08:00:00',
      expiry_date: '2026-10-30', // Expired yesterday
      expiry_time: '18:00:00',
      storage: 'Refrigerated Storage',
      status: 'Expired',
      food_safety: 'Spoiled'
    },
    {
      code: 'BATCH-PAN-20261031-01',
      branch_id: 2,
      product_id: 'p1', // Fresh Pandesal
      initial_qty: 60,
      current_qty: 45,
      prod_date: '2026-10-31',
      prod_time: '04:30:00',
      expiry_date: '2026-11-02',
      expiry_time: '18:00:00',
      storage: 'Covered Room-Temperature Storage',
      status: 'In Stock',
      food_safety: 'Approved'
    },
    {
      code: 'BATCH-MUF-20261031-01',
      branch_id: 2,
      product_id: 'p10', // Fresh Muffin
      initial_qty: 40,
      current_qty: 35,
      prod_date: '2026-10-31',
      prod_time: '06:00:00',
      expiry_date: '2026-11-03',
      expiry_time: '18:00:00',
      storage: 'Display Case Storage',
      status: 'In Stock',
      food_safety: 'Approved'
    },
    {
      code: 'BATCH-UBEPAN-20261030-01',
      branch_id: 3, // Lasang Branch
      product_id: 'p_ube_lasang', // Ube Cheese Pandesal
      initial_qty: 30,
      current_qty: 6,
      prod_date: '2026-10-30',
      prod_time: '06:00:00',
      expiry_date: '2026-11-01',
      expiry_time: '08:00:00',
      storage: 'Covered Room-Temperature Storage',
      status: 'Expiring Soon',
      food_safety: 'Approved'
    }
  ];

  for (const b of batches) {
    await pool.query(`
      INSERT INTO bw_inventory_batches
      (batch_code, branch_id, product_id, initial_quantity, current_quantity, production_date, production_time, expiry_date, expiry_time, storage_condition, status, food_safety_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [b.code, b.branch_id, b.product_id, b.initial_qty, b.current_qty, b.prod_date, b.prod_time, b.expiry_date, b.expiry_time, b.storage, b.status, b.food_safety]);
  }

  // Also update corresponding bw_inventory records to match batch codes and quantities
  for (const b of batches) {
    const existing = await pool.query(
      "SELECT id FROM bw_inventory WHERE product_id = $1 AND branch_id = $2 AND (batch_id = $3 OR batch_id IS NULL) LIMIT 1",
      [b.product_id, b.branch_id, b.code]
    );

    if (existing.rows.length > 0) {
      await pool.query(`
        UPDATE bw_inventory
        SET stock_level = $1, batch_id = $2, production_date = $3, expiry_date = $4,
            production_time = $5, expiry_time = $6, status = $7
        WHERE id = $8
      `, [b.current_qty, b.code, b.prod_date, b.expiry_date, b.prod_time, b.expiry_time, b.status === 'Expired' ? 'Expired' : 'In Stock', existing.rows[0].id]);
    } else {
      await pool.query(`
        INSERT INTO bw_inventory
        (product_id, branch_id, stock_level, production_date, expiry_date, production_time, expiry_time, unit, status, batch_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pcs', $8, $9)
      `, [b.product_id, b.branch_id, b.current_qty, b.prod_date, b.expiry_date, b.prod_time, b.expiry_time, b.status === 'Expired' ? 'Expired' : 'In Stock', b.code]);
    }
  }

  console.log("Successfully seeded", batches.length, "traceable inventory batches.");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
