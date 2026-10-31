const { Client } = require('pg');

const connStr = process.env.DATABASE_URL || "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function seedBranchSampleData() {
  await client.connect();

  const tibBranch = (await client.query("SELECT id FROM bw_branches WHERE name = 'Tibungco 2'")).rows[0];
  const lasBranch = (await client.query("SELECT id FROM bw_branches WHERE name = 'Lasang'")).rows[0];

  const tibId = tibBranch.id;
  const lasId = lasBranch.id;

  console.log("Tibungco 2 ID:", tibId, "Lasang ID:", lasId);

  // Ensure Muffin exists in bw_products
  await client.query(`
    INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe, unit, status)
    VALUES ('p10', 'Muffin', 'Pastries', 12.00, 4.00, 3, 'N/A', 'pcs', 'Active')
    ON CONFLICT (id) DO UPDATE SET name = 'Muffin', category = 'Pastries'
  `);

  // Ensure Ube Cheese Pandesal exists exclusively for Lasang (branch_id = lasId)
  await client.query(`
    INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe, branch_id, unit, status)
    VALUES ('p_ube_lasang', 'Ube Cheese Pandesal', 'Bread', 50.00, 20.00, 2, 'Breadcrumbs', $1, 'pcs', 'Active')
    ON CONFLICT (id) DO UPDATE SET branch_id = $1, name = 'Ube Cheese Pandesal'
  `, [lasId]);

  const todayStr = new Date().toISOString().split('T')[0];
  const expStr = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Tibungco 2 stock
  // Pandesal: 26, Muffin: 28, Special Ensaymada: 20, Classic Sliced Bread: 27
  const tibStocks = [
    { pid: 'p1', stock: 26 },
    { pid: 'p10', stock: 28 },
    { pid: 'p2', stock: 20 },
    { pid: 'p3', stock: 27 }
  ];

  for (const item of tibStocks) {
    const existing = await client.query("SELECT id FROM bw_inventory WHERE product_id = $1 AND branch_id = $2", [item.pid, tibId]);
    if (existing.rows.length > 0) {
      await client.query("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [item.stock, existing.rows[0].id]);
    } else {
      await client.query(
        "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status) VALUES ($1, $2, $3, $4, $5, 'pcs', 'In Stock')",
        [item.pid, item.stock, todayStr, expStr, tibId]
      );
    }
  }

  // Lasang stock
  // Pandesal: 35, Muffin: 35, Special Ensaymada: 35, Ube Cheese Pandesal: 18
  const lasStocks = [
    { pid: 'p1', stock: 35 },
    { pid: 'p10', stock: 35 },
    { pid: 'p2', stock: 35 },
    { pid: 'p_ube_lasang', stock: 18 }
  ];

  for (const item of lasStocks) {
    const existing = await client.query("SELECT id FROM bw_inventory WHERE product_id = $1 AND branch_id = $2", [item.pid, lasId]);
    if (existing.rows.length > 0) {
      await client.query("UPDATE bw_inventory SET stock_level = $1 WHERE id = $2", [item.stock, existing.rows[0].id]);
    } else {
      await client.query(
        "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status) VALUES ($1, $2, $3, $4, $5, 'pcs', 'In Stock')",
        [item.pid, item.stock, todayStr, expStr, lasId]
      );
    }
  }

  console.log("Tibungco 2 and Lasang sample inventory successfully initialized!");
  await client.end();
}

seedBranchSampleData().catch(console.error);

