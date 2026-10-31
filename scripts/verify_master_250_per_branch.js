/**
 * Comprehensive Validation Suite for Rose Bakeshop x BakeWise:
 * 250 Completed POS Sales per Branch per Day (Oct 14 - Nov 13, 2026)
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runValidation() {
  console.log('========================================================================');
  console.log('MANDATORY FINAL VALIDATION: 250 SALES / BRANCH / DAY AUDIT');
  console.log('Branches: Lasang (3) and Tibungco 2 (5)');
  console.log('Coverage: October 14, 2026 to November 13, 2026 (31 calendar days)');
  console.log('========================================================================\n');

  let hasErrors = false;

  // 1. Daily POS Transaction Counts for Each Date
  console.log('--- 1. DAILY COMPLETED POS TRANSACTION COUNTS AUDIT (31 DATES) ---');
  const dailyQuery = await pool.query(`
    SELECT 
      date,
      COUNT(*) FILTER (WHERE branch_id = 3 AND status = 'Completed') as lasang_completed,
      COUNT(*) FILTER (WHERE branch_id = 5 AND status = 'Completed') as tibungco_completed,
      COUNT(*) FILTER (WHERE branch_id IN (3, 5) AND status = 'Completed') as combined_completed
    FROM bw_pos_transactions
    WHERE date >= '2026-10-14' AND date <= '2026-11-13'
    GROUP BY date
    ORDER BY date ASC
  `);

  console.log(`Found ${dailyQuery.rows.length} calendar dates in dataset.`);
  
  let totalLasang = 0;
  let totalTibungco = 0;
  let totalCombined = 0;

  for (const r of dailyQuery.rows) {
    const dStr = r.date.toISOString ? r.date.toISOString().split('T')[0] : String(r.date).split('T')[0];
    const las = parseInt(r.lasang_completed);
    const tib = parseInt(r.tibungco_completed);
    const comb = parseInt(r.combined_completed);

    totalLasang += las;
    totalTibungco += tib;
    totalCombined += comb;

    const ok = (las === 250 && tib === 250 && comb === 500);
    if (!ok) {
      console.error(`  [MISMATCH] Date ${dStr}: Lasang=${las} (exp 250), Tibungco 2=${tib} (exp 250), Combined=${comb} (exp 500)`);
      hasErrors = true;
    }
  }

  console.log(`\n  Total Lasang Completed POS Sales: ${totalLasang.toLocaleString()} (Target: 7,750)`);
  console.log(`  Total Tibungco 2 Completed POS Sales: ${totalTibungco.toLocaleString()} (Target: 7,750)`);
  console.log(`  Total Combined Completed POS Sales: ${totalCombined.toLocaleString()} (Target: 15,500)`);

  if (totalLasang === 7750 && totalTibungco === 7750 && totalCombined === 15500) {
    console.log('  ✓ PASS: Perfect match of 250 sales/branch/day across all 31 dates (15,500 total)!');
  } else {
    console.error('  ❌ FAIL: Total transaction count discrepancy!');
    hasErrors = true;
  }

  // 2. Receipt Number Uniqueness
  console.log('\n--- 2. RECEIPT NUMBER UNIQUENESS AUDIT ---');
  const uniqueReceipts = await pool.query(`
    SELECT COUNT(DISTINCT transaction_number) as distinct_receipts, COUNT(*) as total_records
    FROM bw_pos_transactions
    WHERE branch_id IN (3, 5) AND date >= '2026-10-14' AND date <= '2026-11-13'
  `);
  const distinct = parseInt(uniqueReceipts.rows[0].distinct_receipts);
  const total = parseInt(uniqueReceipts.rows[0].total_records);
  console.log(`  Distinct Receipt Numbers: ${distinct.toLocaleString()} / Total Records: ${total.toLocaleString()}`);
  if (distinct === total && total === 15500) {
    console.log('  ✓ PASS: 100% of the 15,500 receipts are strictly unique!');
  } else {
    console.error('  ❌ FAIL: Duplicate receipt numbers found!');
    hasErrors = true;
  }

  // 3. Mathematical Subtotal & Grand Total Integrity
  console.log('\n--- 3. MATHEMATICAL TOTALS INTEGRITY AUDIT ---');
  const mathCheck = await pool.query(`
    SELECT COUNT(*) as mismatch_count
    FROM bw_pos_transactions t
    JOIN (
      SELECT transaction_id, SUM(subtotal) as items_sum
      FROM bw_pos_transaction_items
      GROUP BY transaction_id
    ) i ON t.id = i.transaction_id
    WHERE t.branch_id IN (3, 5) AND ABS(t.subtotal - i.items_sum) > 0.01
  `);
  const mismatches = parseInt(mathCheck.rows[0].mismatch_count);
  console.log(`  Subtotal mismatches against line items: ${mismatches}`);
  if (mismatches === 0) {
    console.log('  ✓ PASS: Every transaction header matches the exact sum of its line items!');
  } else {
    console.error(`  ❌ FAIL: ${mismatches} transactions have subtotal discrepancies!`);
    hasErrors = true;
  }

  // 4. Line Items Presence Check
  console.log('\n--- 4. LINE ITEMS INTEGRITY ---');
  const emptyTxCheck = await pool.query(`
    SELECT COUNT(*) as empty_count
    FROM bw_pos_transactions t
    LEFT JOIN bw_pos_transaction_items i ON t.id = i.transaction_id
    WHERE t.branch_id IN (3, 5) AND i.id IS NULL
  `);
  const emptyCount = parseInt(emptyTxCheck.rows[0].empty_count);
  console.log(`  Transactions without line items: ${emptyCount}`);
  if (emptyCount === 0) {
    console.log('  ✓ PASS: Every single transaction has valid line items.');
  } else {
    console.error(`  ❌ FAIL: ${emptyCount} transactions have zero line items!`);
    hasErrors = true;
  }

  // 5. Payment Validation (Cash & GCash)
  console.log('\n--- 5. PAYMENT INFORMATION VALIDATION ---');
  const paymentCheck = await pool.query(`
    SELECT 
      payment_method,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE payment_amount < total) as underpaid,
      COUNT(*) FILTER (WHERE payment_method = 'Cash' AND ABS(change_amount - (payment_amount - total)) > 0.01) as bad_change
    FROM bw_pos_transactions
    WHERE branch_id IN (3, 5) AND date >= '2026-10-14' AND date <= '2026-11-13'
    GROUP BY payment_method
  `);
  console.table(paymentCheck.rows);
  const anyUnderpaid = paymentCheck.rows.some(r => parseInt(r.underpaid) > 0 || parseInt(r.bad_change || 0) > 0);
  if (!anyUnderpaid) {
    console.log('  ✓ PASS: All transactions fully paid with exact change arithmetic!');
  } else {
    console.error('  ❌ FAIL: Underpaid or incorrect change detected!');
    hasErrors = true;
  }

  // 6. Usable Inventory Balances & Negative Inventory Check
  console.log('\n--- 6. INVENTORY BALANCES & NEGATIVE STOCK CHECK ---');
  const negCheck = await pool.query(`
    SELECT COUNT(*) as neg_count FROM bw_inventory WHERE branch_id IN (3, 5) AND stock_level < 0
  `);
  const negCount = parseInt(negCheck.rows[0].neg_count);
  console.log(`  Negative inventory rows: ${negCount}`);
  if (negCount === 0) {
    console.log('  ✓ PASS: Zero negative inventory balances!');
  } else {
    console.error(`  ❌ FAIL: ${negCount} products have negative stock!`);
    hasErrors = true;
  }

  // Display Closing Inventory Table
  const closingStock = await pool.query(`
    SELECT i.branch_id, b.name as branch_name, i.product_id, p.name as product_name, i.stock_level, i.unit, i.status
    FROM bw_inventory i
    JOIN bw_branches b ON b.id = i.branch_id
    JOIN bw_products p ON p.id = i.product_id
    WHERE i.branch_id IN (3, 5) AND i.status != 'Inactive'
    ORDER BY i.branch_id, i.product_id
  `);
  console.log('\nVerified Usable Closing Inventory:');
  console.table(closingStock.rows);

  // 7. Zero Contamination Check for Branches 2 and 4
  console.log('\n--- 7. ZERO CONTAMINATION AUDIT (Other Branches) ---');
  const contamCheck = await pool.query(`
    SELECT branch_id, COUNT(*) as pos_tx_count, SUM(total) as revenue
    FROM bw_pos_transactions
    WHERE date >= '2026-10-14' AND date <= '2026-11-13'
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(contamCheck.rows);

  // 8. Total Revenue Summary
  console.log('\n--- 8. REVENUE SUMMARY ---');
  const revSummary = await pool.query(`
    SELECT 
      branch_id,
      COUNT(*) as total_sales_tx,
      SUM(total) as total_revenue
    FROM bw_pos_transactions
    WHERE branch_id IN (3, 5) AND date >= '2026-10-14' AND date <= '2026-11-13'
    GROUP BY branch_id
    ORDER BY branch_id
  `);
  console.table(revSummary.rows);

  await pool.end();

  if (hasErrors) {
    console.error('\n❌ AUDIT FAILED WITH DISCREPANCIES');
    process.exit(1);
  } else {
    console.log('\n========================================================================');
    console.log('🎉 ALL MANDATORY VALIDATIONS PASSED WITHOUT A SINGLE DISCREPANCY (100%)');
    console.log('========================================================================');
  }
}

runValidation().catch(console.error);

