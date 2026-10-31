const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});

async function verify() {
  console.log('====================================================');
  console.log('AUDIT & VERIFICATION REPORT: TWO-BRANCH DEMO POPULATION');
  console.log('Target Branches: Lasang (3) & Tibungco 2 (5)');
  console.log('Date Target: 2026-10-14 to 2026-10-31 (18 days)');
  console.log('====================================================\n');

  // 1. Check Branches in Database
  const branchesRes = await pool.query('SELECT id, name, status FROM bw_branches ORDER BY id');
  console.log('1. REGISTERED BRANCHES IN DATABASE:');
  console.table(branchesRes.rows);

  // 2. Demo Record Counts Across All Branches (to prove zero contamination)
  console.log('\n2. DEMO SALES RECORD DISTRIBUTION (Zero Contamination Check):');
  const demoSalesDist = await pool.query(`
    SELECT branch_id, COUNT(*) as sales_count, SUM(qty) as total_units_sold, SUM(qty * price) as total_sales_amount
    FROM bw_sales
    WHERE date >= '2026-10-14' AND date <= '2026-10-31'
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(demoSalesDist.rows);

  // 3. Calendar Days Check for Lasang & Tibungco 2
  console.log('\n3. CALENDAR DAYS COVERAGE (Target: exactly 18 days):');
  const daysCheck = await pool.query(`
    SELECT 
      branch_id,
      COUNT(DISTINCT date) as distinct_sales_days,
      MIN(date) as earliest_date,
      MAX(date) as latest_date
    FROM bw_sales
    WHERE branch_id IN (3, 5)
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(daysCheck.rows);

  // 4. Production Orders by Branch
  console.log('\n4. PRODUCTION SUMMARY:');
  const prodCheck = await pool.query(`
    SELECT 
      branch_id,
      COUNT(*) as total_batches,
      COUNT(DISTINCT date) as distinct_production_days,
      SUM(actual) as total_units_baked
    FROM bw_production
    WHERE branch_id IN (3, 5)
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(prodCheck.rows);

  // 5. Waste Records by Branch
  console.log('\n5. WASTE SUMMARY:');
  const wasteCheck = await pool.query(`
    SELECT 
      branch_id,
      COUNT(*) as waste_incidents,
      SUM(qty) as total_scrap_qty,
      SUM(cost) as total_scrap_cost
    FROM bw_waste
    WHERE branch_id IN (3, 5)
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(wasteCheck.rows);

  // 6. Food-Safety & Repurposing Batches Summary
  console.log('\n6. BATCH INVENTORY & FOOD-SAFETY SUMMARY:');
  const batchCheck = await pool.query(`
    SELECT 
      branch_id,
      COUNT(*) as total_batches,
      SUM(current_quantity) as total_batch_stock,
      COUNT(*) FILTER (WHERE expiry_date >= '2026-11-01') as valid_unexpired_batches
    FROM bw_inventory_batches
    WHERE branch_id IN (3, 5)
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(batchCheck.rows);

  // 7. Repurpose Logs Summary
  console.log('\n7. REPURPOSE LOGS SUMMARY:');
  const repCheck = await pool.query(`
    SELECT branch_id, COUNT(*) as repurpose_count, SUM(quantity) as total_repurposed_units
    FROM bw_repurpose_logs
    WHERE branch_id IN (3, 5)
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(repCheck.rows);

  // 8. Inter-Branch Transfer Audit Trail
  console.log('\n8. INTER-BRANCH TRANSFER AUDIT:');
  const trfCheck = await pool.query(`
    SELECT id, movement_type, branch_id, product_id, quantity, source_branch_id, dest_branch_id, reference_id, reason
    FROM bw_inventory_movements
    WHERE movement_type IN ('Transfer Out', 'Transfer In') AND branch_id IN (3, 5)
    ORDER BY id
  `);
  console.table(trfCheck.rows);

  // 9. Current Usable Inventory Stock Levels (Closing stock as of Oct 31)
  console.log('\n9. CLOSING INVENTORY BALANCES (bw_inventory):');
  const invCheck = await pool.query(`
    SELECT i.branch_id, b.name as branch_name, i.product_id, p.name as product_name, i.stock_level, i.unit, i.status
    FROM bw_inventory i
    JOIN bw_branches b ON b.id = i.branch_id
    JOIN bw_products p ON p.id = i.product_id
    WHERE i.branch_id IN (3, 5) AND i.status != 'Inactive'
    ORDER BY i.branch_id, i.product_id
  `);
  console.table(invCheck.rows);

  // 10. Check that NO stock is negative
  const negCheck = await pool.query(`
    SELECT COUNT(*) as neg_count FROM bw_inventory WHERE branch_id IN (3, 5) AND stock_level < 0
  `);
  console.log('\n10. NEGATIVE INVENTORY CHECK (Must be 0):', negCheck.rows[0].neg_count);

  await pool.end();
}

verify().catch(console.error);

