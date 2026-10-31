/**
 * ROSE BAKESHOP x BAKEWISE - MASTER DATABASE POPULATION
 * Exactly 250 Completed POS Sales per Branch per Day
 * 
 * Branches:
 *  - Lasang, Davao City (ID: 3)
 *  - Tibungco 2, Davao City (ID: 5)
 * 
 * Date Coverage:
 *  - October 14, 2026 to November 15, 2026 (33 calendar days)
 *  - Oct 14–31: Historical operational sales (18 days x 250 = 4,500/branch)
 *  - Nov 1–15: Future simulation sales (15 days x 250 = 3,750/branch)
 * 
 * TOTAL EXPECTED COMPLETED POS TRANSACTIONS:
 *  - Lasang: 8,250
 *  - Tibungco 2: 8,250
 *  - Grand Total: 16,500 completed transactions
 * 
 * Seed Identifier: ROSE_BAKEWISE_250_PER_BRANCH_20261014_20261115
 */

const { Pool } = require('pg');

const SEED_IDENTIFIER = 'ROSE_BAKEWISE_250_PER_BRANCH_20261014_20261115';

const pool = new Pool({
  connectionString: 'postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
  keepAlive: true
});

async function queryWithRetry(sql, params = [], retries = 3) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await pool.query(sql, params);
    } catch (e) {
      if (i === retries) throw e;
      console.warn(`[Retry ${i}/${retries}] Query error: ${e.message}`);
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}

// Fast batch insert helper
async function batchInsert(table, columns, rows, chunkSize = 150) {
  if (!rows || rows.length === 0) return [];
  const allResults = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valueClauses = [];
    const params = [];
    let pIdx = 1;

    for (const r of chunk) {
      const placeholders = [];
      for (const col of columns) {
        placeholders.push(`$${pIdx++}`);
        params.push(r[col] !== undefined ? r[col] : null);
      }
      valueClauses.push(`(${placeholders.join(', ')})`);
    }

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueClauses.join(', ')} RETURNING id`;
    const res = await queryWithRetry(sql, params);
    if (res && res.rows) allResults.push(...res.rows);
  }
  return allResults;
}

// Generate the 33 calendar dates: Oct 14 to Nov 15, 2026
const DATES = [];
// Oct 14 to 31 (18 days)
for (let d = 14; d <= 31; d++) {
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  DATES.push({ dateStr: `2026-10-${dayStr}`, isFuture: false });
}
// Nov 1 to 15 (15 days)
for (let d = 1; d <= 15; d++) {
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  DATES.push({ dateStr: `2026-11-${dayStr}`, isFuture: true });
}

// Product catalog reference
const PRODUCTS_MASTER = {
  p1: { id: 'p1', name: 'Pandesal', category: 'Bread', price: 45.00, cost: 25.00, unit: 'pack', shelf_life: 2, repurpose: 'Bread Crumbs' },
  p2: { id: 'p2', name: 'Special Ensaymada', category: 'Pastries', price: 30.00, cost: 18.00, unit: 'pcs', shelf_life: 3, repurpose: 'Bread Pudding' },
  p3: { id: 'p3', name: 'Classic Sliced Bread', category: 'Bread', price: 65.00, cost: 38.00, unit: 'loaf', shelf_life: 4, repurpose: 'Croutons' },
  p4: { id: 'p4', name: 'Premium Chocolate Cake', category: 'Cakes', price: 380.00, cost: 220.00, unit: 'box', shelf_life: 5, repurpose: null },
  p5: { id: 'p5', name: 'Spanish Bread', category: 'Bread', price: 10.00, cost: 5.00, unit: 'pcs', shelf_life: 2, repurpose: 'Bread Crumbs' },
  p6: { id: 'p6', name: 'Butter Croissant', category: 'Pastries', price: 50.00, cost: 28.00, unit: 'pcs', shelf_life: 2, repurpose: 'Bread Pudding' },
  p8: { id: 'p8', name: 'Chiffon Cake', category: 'Cakes', price: 180.00, cost: 100.00, unit: 'box', shelf_life: 2, repurpose: null },
  p10: { id: 'p10', name: 'Muffin', category: 'Pastries', price: 12.00, cost: 7.00, unit: 'pcs', shelf_life: 3, repurpose: 'Crumb Topping' },
  p_ube_lasang: { id: 'p_ube_lasang', name: 'Ube Cheese Pandesal', category: 'Bread', price: 50.00, cost: 30.00, unit: 'pack', shelf_life: 2, repurpose: 'Bread Crumbs' }
};

const BRANCHES = [
  {
    branchId: 3,
    branchName: 'Lasang',
    bakerName: 'Marco Reyes',
    cashiers: [
      { name: 'Grace Lim', shift: 'Morning Shift (05:00 - 13:00)' },
      { name: 'Ramon Bautista', shift: 'Afternoon Shift (13:00 - 21:00)' }
    ],
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang'],
    initialStock: {
      p1: 60,
      p2: 40,
      p3: 45,
      p4: 15,
      p5: 50,
      p6: 35,
      p8: 20,
      p10: 50,
      p_ube_lasang: 50
    }
  },
  {
    branchId: 5,
    branchName: 'Tibungco 2',
    bakerName: 'Arnel Mendoza',
    cashiers: [
      { name: 'Patricia Dizon', shift: 'Morning Shift (05:00 - 13:00)' },
      { name: 'Kristine Ramos', shift: 'Afternoon Shift (13:00 - 21:00)' }
    ],
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10'],
    initialStock: {
      p1: 65,
      p2: 40,
      p3: 40,
      p4: 12,
      p5: 50,
      p6: 35,
      p8: 18,
      p10: 55
    }
  }
];

// Seeded pseudorandom generator for deterministic, realistic distributions
function createRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function runMasterSeeder() {
  console.log('========================================================================');
  console.log('ROSE BAKESHOP x BAKEWISE: MASTER 250 SALES/DAY DATABASE SEEDER');
  console.log('Branches: Lasang (3) & Tibungco 2 (5)');
  console.log(`Dates: 33 Calendar Days (${DATES[0].dateStr} to ${DATES[DATES.length - 1].dateStr})`);
  console.log('Expected Total: 16,500 Completed POS Transactions');
  console.log('========================================================================\n');

  // Step 1: Clean prior demo records for branch 3 and 5 only
  console.log('[1/5] Purging previous demo records for branch 3 & 5...');
  await queryWithRetry(`
    DELETE FROM bw_pos_transaction_items
    WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id IN (3, 5))
  `);
  await queryWithRetry('DELETE FROM bw_pos_transactions WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_sales WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_production WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_waste WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_inventory_batches WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_inventory_movements WHERE branch_id IN (3, 5)');
  await queryWithRetry('DELETE FROM bw_repurpose_logs WHERE branch_id IN (3, 5)');
  console.log('✓ Cleaned prior branch 3 and 5 records. Untouched all other branches.');

  // Step 2: Ensure Branch Product Catalogs
  console.log('\n[2/5] Initializing branch product catalogs...');
  await queryWithRetry('DELETE FROM bw_branch_products WHERE branch_id IN (3, 5)');
  const bpRows = [];
  for (const b of BRANCHES) {
    for (const pId of b.productIds) {
      const p = PRODUCTS_MASTER[pId];
      bpRows.push({
        branch_id: b.branchId,
        product_id: p.id,
        custom_name: p.name,
        category: p.category,
        price: p.price,
        cost: p.cost,
        shelf_life_days: p.shelf_life,
        repurpose_recipe: p.repurpose,
        unit: p.unit,
        status: 'Active',
        created_at: '2026-10-14 05:00:00'
      });
    }
  }
  await batchInsert('bw_branch_products', [
    'branch_id', 'product_id', 'custom_name', 'category', 'price', 'cost',
    'shelf_life_days', 'repurpose_recipe', 'unit', 'status', 'created_at'
  ], bpRows);
  console.log(`✓ Seeded ${bpRows.length} branch product catalog records.`);

  // Step 3: Initialize Running Stock & Opening Balance Movements
  console.log('\n[3/5] Recording opening stock balances as of October 14, 2026...');
  const runningStock = { 3: {}, 5: {} };
  const initialMovements = [];

  for (const b of BRANCHES) {
    for (const pId of b.productIds) {
      runningStock[b.branchId][pId] = b.initialStock[pId] || 40;
      initialMovements.push({
        movement_type: 'Initial Balance',
        branch_id: b.branchId,
        product_id: pId,
        quantity: runningStock[b.branchId][pId],
        previous_stock: 0,
        new_stock: runningStock[b.branchId][pId],
        unit: PRODUCTS_MASTER[pId].unit,
        batch_id: `INIT-B${b.branchId}-${pId}`,
        source_branch_id: null,
        dest_branch_id: null,
        reference_id: `DEMO-INIT-B${b.branchId}`,
        reason: 'Historical baseline stock balance as of October 14, 2026',
        notes: `Seed: ${SEED_IDENTIFIER}`,
        performed_by: 'System Administrator',
        status: 'Completed',
        created_at: '2026-10-14 05:00:00'
      });
    }
  }
  await batchInsert('bw_inventory_movements', [
    'movement_type', 'branch_id', 'product_id', 'quantity', 'previous_stock', 'new_stock',
    'unit', 'batch_id', 'source_branch_id', 'dest_branch_id', 'reference_id', 'reason',
    'notes', 'performed_by', 'status', 'created_at'
  ], initialMovements);
  console.log('✓ Initial balances recorded.');

  // Step 4: Daily Generation Loop for 33 Days
  console.log('\n[4/5] Executing 33-Day Simulation (250 completed sales/branch/day)...');

  let totalTxInserted = 0;
  let totalSalesLinesInserted = 0;

  for (let dayIdx = 0; dayIdx < DATES.length; dayIdx++) {
    const { dateStr, isFuture } = DATES[dayIdx];
    const curDateObj = new Date(dateStr + 'T00:00:00+08:00');
    const dayOfWeek = curDateObj.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    const dateClean = dateStr.replace(/-/g, '');

    const dayTxBatch = [];
    const dayItemsBatch = [];
    const daySalesBatch = [];
    const dayProdBatch = [];
    const dayBatchRows = [];
    const dayWasteBatch = [];
    const dayRepurposeBatch = [];
    const dayMovementsBatch = [];

    for (const b of BRANCHES) {
      const branchId = b.branchId;
      const rng = createRng(branchId * 1000 + dayIdx * 37);

      // --- A. GENERATE 250 BASKETS FIRST ---
      const branchTxs = [];
      const dayProductSoldQty = {};
      for (const pId of b.productIds) {
        dayProductSoldQty[pId] = 0;
      }

      for (let txSeq = 1; txSeq <= 250; txSeq++) {
        const seqStr = String(txSeq).padStart(3, '0');
        const txPrefix = isFuture ? 'SIM-POS' : 'POS';
        const txNumber = `${txPrefix}-B${branchId}-${dateClean}-${seqStr}`;

        // Cashier selection
        const cashier = (txSeq <= 125) ? b.cashiers[0].name : b.cashiers[1].name;

        // Operating hours: 05:30 to 20:45 spread smoothly
        let minuteOfDay;
        if (txSeq <= 80) {
          // 05:30 to 09:00 (210 mins)
          minuteOfDay = 5 * 60 + 30 + Math.floor((txSeq / 80) * 210);
        } else if (txSeq <= 145) {
          // 09:00 to 13:30 (270 mins)
          minuteOfDay = 9 * 60 + Math.floor(((txSeq - 80) / 65) * 270);
        } else if (txSeq <= 215) {
          // 13:30 to 18:00 (270 mins)
          minuteOfDay = 13 * 60 + 30 + Math.floor(((txSeq - 145) / 70) * 270);
        } else {
          // 18:00 to 20:45 (165 mins)
          minuteOfDay = 18 * 60 + Math.floor(((txSeq - 215) / 35) * 165);
        }

        const hh = String(Math.floor(minuteOfDay / 60)).padStart(2, '0');
        const mm = String(minuteOfDay % 60).padStart(2, '0');
        const ss = String(Math.floor(rng() * 60)).padStart(2, '0');
        const txTimestamp = `${dateStr} ${hh}:${mm}:${ss}`;

        // Choose items in basket based on time of day
        const basket = [];
        const isMorning = txSeq <= 80;
        const isEvening = txSeq >= 215;

        // 1. Primary Item
        let p1Id;
        const r1 = rng();
        if (isMorning) {
          if (branchId === 3 && r1 < 0.35) p1Id = 'p_ube_lasang';
          else if (r1 < 0.70) p1Id = 'p1'; // Pandesal
          else if (r1 < 0.85) p1Id = 'p3'; // Sliced Bread
          else p1Id = 'p5'; // Spanish Bread
        } else if (isEvening) {
          if (r1 < 0.50) p1Id = 'p3'; // Sliced Bread
          else if (r1 < 0.75) p1Id = 'p1'; // Pandesal
          else if (branchId === 3 && r1 < 0.90) p1Id = 'p_ube_lasang';
          else p1Id = 'p10'; // Muffin
        } else {
          if (r1 < 0.25) p1Id = 'p10'; // Muffin
          else if (r1 < 0.45) p1Id = 'p2'; // Ensaymada
          else if (r1 < 0.65) p1Id = 'p1'; // Pandesal
          else if (r1 < 0.80) p1Id = 'p6'; // Butter Croissant
          else if (isWeekend && r1 < 0.92) p1Id = 'p4'; // Chocolate Cake
          else p1Id = 'p3'; // Sliced Bread
        }

        let p1Qty = 1;
        if (p1Id === 'p1' || p1Id === 'p_ube_lasang') p1Qty = 1 + (rng() < 0.45 ? 1 : 0);
        else if (p1Id === 'p10' || p1Id === 'p5') p1Qty = 1 + (rng() < 0.40 ? 1 : 0) + (rng() < 0.20 ? 1 : 0);

        basket.push({ product_id: p1Id, qty: p1Qty, price: PRODUCTS_MASTER[p1Id].price });
        dayProductSoldQty[p1Id] += p1Qty;

        // 2. Secondary Item (35% probability)
        if (rng() < 0.35) {
          let p2Id = (p1Id !== 'p10') ? 'p10' : 'p2';
          if (rng() < 0.40) p2Id = 'p5';
          if (p2Id !== p1Id && b.productIds.includes(p2Id)) {
            const p2Qty = (p2Id === 'p10' || p2Id === 'p5') ? (1 + (rng() < 0.3 ? 1 : 0)) : 1;
            basket.push({ product_id: p2Id, qty: p2Qty, price: PRODUCTS_MASTER[p2Id].price });
            dayProductSoldQty[p2Id] += p2Qty;
          }
        }

        // 3. Third Item (10% probability, e.g. weekend or family purchase)
        if (rng() < 0.10) {
          const p3Id = (p1Id !== 'p3') ? 'p3' : 'p6';
          if (b.productIds.includes(p3Id) && !basket.some(i => i.product_id === p3Id)) {
            basket.push({ product_id: p3Id, qty: 1, price: PRODUCTS_MASTER[p3Id].price });
            dayProductSoldQty[p3Id] += 1;
          }
        }

        // Totals
        let subtotal = 0;
        for (const item of basket) {
          subtotal += item.qty * item.price;
        }
        subtotal = Math.round(subtotal * 100) / 100;
        const discount = 0.00;
        const total = subtotal;

        // Payment method
        const paymentMethod = (txSeq % 4 === 0) ? 'GCash' : 'Cash';
        let paymentAmount = total;
        let changeAmount = 0.00;

        if (paymentMethod === 'Cash') {
          paymentAmount = Math.ceil(total / 20) * 20;
          if (paymentAmount < total) paymentAmount += 20;
          changeAmount = Math.round((paymentAmount - total) * 100) / 100;
        }

        branchTxs.push({
          transaction_number: txNumber,
          branch_id: branchId,
          cashier: cashier,
          subtotal: subtotal,
          discount: discount,
          total: total,
          payment_amount: paymentAmount,
          change_amount: changeAmount,
          payment_method: paymentMethod,
          status: 'Completed',
          date: dateStr,
          created_at: txTimestamp,
          items: basket
        });
      }

      // --- B. MORNING PRODUCTION (Must support day's sales + buffer) ---
      for (const pId of b.productIds) {
        const p = PRODUCTS_MASTER[pId];
        const soldQty = dayProductSoldQty[pId] || 0;
        
        // Bake enough to cover today's sales plus a buffer (10 to 25 units)
        const buffer = 10 + Math.floor(rng() * 15);
        const bakeQty = Math.max(soldQty + buffer, 15);

        const prodCode = `PRD-B${branchId}-${pId}-${dateClean}`;
        const batchCode = `BAT-B${branchId}-${pId}-${dateClean}`;

        dayProdBatch.push({
          product_id: pId,
          planned: bakeQty,
          actual: bakeQty,
          date: dateStr,
          baker: b.bakerName,
          status: 'Completed',
          code: prodCode,
          branch_id: branchId,
          created_at: `${dateStr} 05:45:00`
        });

        // Expiry calculation
        const expDateObj = new Date(curDateObj.getTime() + (p.shelf_life * 24 * 60 * 60 * 1000));
        const expYear = expDateObj.getFullYear();
        const expMonth = String(expDateObj.getMonth() + 1).padStart(2, '0');
        const expDay = String(expDateObj.getDate()).padStart(2, '0');
        const expiryDateStr = `${expYear}-${expMonth}-${expDay}`;
        const storageCond = p.category === 'Cakes' ? 'Refrigerated Storage' : (p.category === 'Pastries' ? 'Display Case Storage' : 'Covered Room-Temperature Storage');

        dayBatchRows.push({
          batch_code: batchCode,
          branch_id: branchId,
          product_id: pId,
          initial_quantity: bakeQty,
          current_quantity: bakeQty,
          production_date: dateStr,
          production_time: '06:00:00',
          expiry_date: expiryDateStr,
          expiry_time: '18:00:00',
          storage_condition: storageCond,
          status: 'In Stock',
          food_safety_status: 'Approved',
          created_at: `${dateStr} 06:00:00`
        });

        const prevStock = runningStock[branchId][pId];
        runningStock[branchId][pId] += bakeQty;

        dayMovementsBatch.push({
          movement_type: 'Production',
          branch_id: branchId,
          product_id: pId,
          quantity: bakeQty,
          previous_stock: prevStock,
          new_stock: runningStock[branchId][pId],
          unit: p.unit,
          batch_id: batchCode,
          source_branch_id: null,
          dest_branch_id: null,
          reference_id: prodCode,
          reason: 'Daily fresh morning baking output',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: b.bakerName,
          status: 'Completed',
          created_at: `${dateStr} 06:15:00`
        });
      }

      // --- C. INTER-BRANCH STOCK TRANSFERS ---
      // Transfer 1: Oct 24 (10 loaves of Classic Sliced Bread from Lasang to Tibungco 2)
      if (dateStr === '2026-10-24' && branchId === 3) {
        const trfQty = 10;
        const trfPid = 'p3';
        const trfRef = 'TRF-20261024-001';

        const prevB3 = runningStock[3][trfPid];
        runningStock[3][trfPid] -= trfQty;
        dayMovementsBatch.push({
          movement_type: 'Transfer Out',
          branch_id: 3,
          product_id: trfPid,
          quantity: -trfQty,
          previous_stock: prevB3,
          new_stock: runningStock[3][trfPid],
          unit: PRODUCTS_MASTER[trfPid].unit,
          batch_id: null,
          source_branch_id: 3,
          dest_branch_id: 5,
          reference_id: trfRef,
          reason: 'Weekend replenishment transfer to Tibungco 2',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: 'Elena Santos',
          status: 'Completed',
          created_at: `${dateStr} 10:00:00`
        });

        const prevB5 = runningStock[5][trfPid];
        runningStock[5][trfPid] += trfQty;
        dayMovementsBatch.push({
          movement_type: 'Transfer In',
          branch_id: 5,
          product_id: trfPid,
          quantity: trfQty,
          previous_stock: prevB5,
          new_stock: runningStock[5][trfPid],
          unit: PRODUCTS_MASTER[trfPid].unit,
          batch_id: null,
          source_branch_id: 3,
          dest_branch_id: 5,
          reference_id: trfRef,
          reason: 'Weekend replenishment transfer from Lasang',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: 'Lorna Villanueva',
          status: 'Completed',
          created_at: `${dateStr} 10:30:00`
        });
      }

      // Transfer 2: Nov 7 (12 loaves of Classic Sliced Bread from Lasang to Tibungco 2)
      if (dateStr === '2026-11-07' && branchId === 3) {
        const trfQty = 12;
        const trfPid = 'p3';
        const trfRef = 'TRF-20261107-002';

        const prevB3 = runningStock[3][trfPid];
        runningStock[3][trfPid] -= trfQty;
        dayMovementsBatch.push({
          movement_type: 'Transfer Out',
          branch_id: 3,
          product_id: trfPid,
          quantity: -trfQty,
          previous_stock: prevB3,
          new_stock: runningStock[3][trfPid],
          unit: PRODUCTS_MASTER[trfPid].unit,
          batch_id: null,
          source_branch_id: 3,
          dest_branch_id: 5,
          reference_id: trfRef,
          reason: 'Simulation weekend transfer to Tibungco 2',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: 'Elena Santos',
          status: 'Completed',
          created_at: `${dateStr} 10:00:00`
        });

        const prevB5 = runningStock[5][trfPid];
        runningStock[5][trfPid] += trfQty;
        dayMovementsBatch.push({
          movement_type: 'Transfer In',
          branch_id: 5,
          product_id: trfPid,
          quantity: trfQty,
          previous_stock: prevB5,
          new_stock: runningStock[5][trfPid],
          unit: PRODUCTS_MASTER[trfPid].unit,
          batch_id: null,
          source_branch_id: 3,
          dest_branch_id: 5,
          reference_id: trfRef,
          reason: 'Simulation weekend transfer from Lasang',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: 'Lorna Villanueva',
          status: 'Completed',
          created_at: `${dateStr} 10:30:00`
        });
      }

      // --- D. OCCASIONAL SCRAP / WASTE (Every ~5 days) ---
      if (dayIdx % 5 === 2) {
        const wastePid = (branchId === 3) ? 'p1' : 'p2';
        const wasteQty = 2;
        const wasteCost = wasteQty * PRODUCTS_MASTER[wastePid].cost;
        const prevStock = runningStock[branchId][wastePid];
        runningStock[branchId][wastePid] -= wasteQty;

        dayWasteBatch.push({
          product_id: wastePid,
          qty: wasteQty,
          cost: wasteCost,
          reason: 'Overbaked Batch Trimming / Display Scrap',
          date: dateStr,
          branch_id: branchId,
          created_at: `${dateStr} 16:30:00`
        });

        dayMovementsBatch.push({
          movement_type: 'Waste Scrap',
          branch_id: branchId,
          product_id: wastePid,
          quantity: -wasteQty,
          previous_stock: prevStock,
          new_stock: runningStock[branchId][wastePid],
          unit: PRODUCTS_MASTER[wastePid].unit,
          batch_id: null,
          source_branch_id: null,
          dest_branch_id: null,
          reference_id: `WST-B${branchId}-${dateClean}`,
          reason: 'Waste scrap logged: Overbaked batch trimming',
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: b.cashiers[1].name,
          status: 'Completed',
          created_at: `${dateStr} 16:35:00`
        });
      }

      // --- E. REPURPOSING NEAR-EXPIRY UNEXPIRED BREAD (Select days) ---
      if (dayIdx === 14 || dayIdx === 28) {
        const repPid = (branchId === 3) ? 'p1' : 'p3';
        const repQty = 5;
        const repRecipe = (repPid === 'p1') ? 'Bread Crumbs' : 'Croutons';
        const prevStock = runningStock[branchId][repPid];
        runningStock[branchId][repPid] -= repQty;

        dayRepurposeBatch.push({
          batch_id: `BAT-B${branchId}-${repPid}-${dateClean}`,
          product_id: repPid,
          product_name: PRODUCTS_MASTER[repPid].name,
          quantity: repQty,
          target_recipe: repRecipe,
          branch_id: branchId,
          timestamp: `${dateStr} 15:00:00`
        });

        dayMovementsBatch.push({
          movement_type: 'Repurpose Deduction',
          branch_id: branchId,
          product_id: repPid,
          quantity: -repQty,
          previous_stock: prevStock,
          new_stock: runningStock[branchId][repPid],
          unit: PRODUCTS_MASTER[repPid].unit,
          batch_id: null,
          source_branch_id: null,
          dest_branch_id: null,
          reference_id: `REP-B${branchId}-${dateClean}`,
          reason: `Safe repurposing: ${repQty} units of near-expiry ${PRODUCTS_MASTER[repPid].name} into ${repRecipe}`,
          notes: `Seed: ${SEED_IDENTIFIER}`,
          performed_by: b.bakerName,
          status: 'Completed',
          created_at: `${dateStr} 15:05:00`
        });
      }

      // --- F. INVENTORY MOVEMENTS FOR SALES ---
      for (const tx of branchTxs) {
        for (const item of tx.items) {
          const prevStock = runningStock[branchId][item.product_id];
          runningStock[branchId][item.product_id] -= item.qty;

          dayMovementsBatch.push({
            movement_type: 'Sale Deduction',
            branch_id: branchId,
            product_id: item.product_id,
            quantity: -item.qty,
            previous_stock: prevStock,
            new_stock: runningStock[branchId][item.product_id],
            unit: PRODUCTS_MASTER[item.product_id].unit,
            batch_id: null,
            source_branch_id: null,
            dest_branch_id: null,
            reference_id: tx.transaction_number,
            reason: 'POS Sale Checkout',
            notes: `Seed: ${SEED_IDENTIFIER}`,
            performed_by: tx.cashier,
            status: 'Completed',
            created_at: tx.created_at
          });
        }
      }

      // Append to day batches
      dayTxBatch.push(...branchTxs);
    }

    // --- EXECUTE INSERTS FOR THIS CALENDAR DAY ---
    // 1. Insert Production
    await batchInsert('bw_production', [
      'product_id', 'planned', 'actual', 'date', 'baker', 'status', 'code', 'branch_id', 'created_at'
    ], dayProdBatch);

    // 2. Insert Batches
    await batchInsert('bw_inventory_batches', [
      'batch_code', 'branch_id', 'product_id', 'initial_quantity', 'current_quantity',
      'production_date', 'production_time', 'expiry_date', 'expiry_time', 'storage_condition', 'status', 'food_safety_status', 'created_at'
    ], dayBatchRows);

    // 3. Insert Waste & Repurpose
    if (dayWasteBatch.length > 0) {
      await batchInsert('bw_waste', ['product_id', 'qty', 'cost', 'reason', 'date', 'branch_id', 'created_at'], dayWasteBatch);
    }
    if (dayRepurposeBatch.length > 0) {
      await batchInsert('bw_repurpose_logs', ['batch_id', 'product_id', 'product_name', 'quantity', 'target_recipe', 'branch_id', 'timestamp'], dayRepurposeBatch);
    }

    // 4. Insert 500 POS Transactions (250 Lasang + 250 Tibungco 2)
    const insertedTxs = await batchInsert('bw_pos_transactions', [
      'transaction_number', 'branch_id', 'cashier', 'subtotal', 'discount', 'total',
      'payment_amount', 'change_amount', 'payment_method', 'status', 'date', 'created_at'
    ], dayTxBatch.map(t => ({
      transaction_number: t.transaction_number,
      branch_id: t.branch_id,
      cashier: t.cashier,
      subtotal: t.subtotal,
      discount: t.discount,
      total: t.total,
      payment_amount: t.payment_amount,
      change_amount: t.change_amount,
      payment_method: t.payment_method,
      status: t.status,
      date: t.date,
      created_at: t.created_at
    })), 250);

    totalTxInserted += insertedTxs.length;

    // Map items to transaction IDs
    for (let i = 0; i < dayTxBatch.length; i++) {
      const txId = insertedTxs[i].id;
      for (const item of dayTxBatch[i].items) {
        dayItemsBatch.push({
          transaction_id: txId,
          product_id: item.product_id,
          quantity: item.qty,
          unit_price: item.price,
          subtotal: Math.round(item.qty * item.price * 100) / 100
        });

        daySalesBatch.push({
          product_id: item.product_id,
          qty: item.qty,
          price: item.price,
          date: dayTxBatch[i].date,
          cashier: dayTxBatch[i].cashier,
          branch_id: dayTxBatch[i].branch_id,
          created_at: dayTxBatch[i].created_at
        });
      }
    }

    // 5. Insert POS items and Sales
    await batchInsert('bw_pos_transaction_items', [
      'transaction_id', 'product_id', 'quantity', 'unit_price', 'subtotal'
    ], dayItemsBatch, 250);

    await batchInsert('bw_sales', [
      'product_id', 'qty', 'price', 'date', 'cashier', 'branch_id', 'created_at'
    ], daySalesBatch, 250);

    totalSalesLinesInserted += daySalesBatch.length;

    // 6. Insert movements
    await batchInsert('bw_inventory_movements', [
      'movement_type', 'branch_id', 'product_id', 'quantity', 'previous_stock', 'new_stock',
      'unit', 'batch_id', 'source_branch_id', 'dest_branch_id', 'reference_id', 'reason',
      'notes', 'performed_by', 'status', 'created_at'
    ], dayMovementsBatch, 250);

    const progressPct = Math.round(((dayIdx + 1) / DATES.length) * 100);
    console.log(`[Day ${dayIdx + 1}/33] ${dateStr} ${isFuture ? '(SIMULATION)' : '(HISTORICAL)'} -> Seeded 500 POS sales (250 Lasang + 250 Tibungco 2). Progress: ${progressPct}%`);
  }

  // Step 5: Update Usable Closing Inventory in bw_inventory
  console.log('\n[5/5] Finalizing verified positive stock balances in bw_inventory...');
  for (const b of BRANCHES) {
    for (const pId of b.productIds) {
      const finalBal = runningStock[b.branchId][pId];
      const p = PRODUCTS_MASTER[pId];
      const batchCode = `BAT-B${b.branchId}-${pId}-20261115`;

      if (finalBal <= 0) {
        throw new Error(`CRITICAL INVENTORY VIOLATION: Final stock for ${pId} in Branch ${b.branchId} is ${finalBal}`);
      }

      const existingInv = await queryWithRetry(
        'SELECT id FROM bw_inventory WHERE branch_id = $1 AND product_id = $2',
        [b.branchId, pId]
      );

      if (existingInv.rows.length > 0) {
        await queryWithRetry(`
          UPDATE bw_inventory
          SET stock_level = $1,
              production_date = '2026-11-15',
              production_time = '06:00:00',
              expiry_date = '2026-11-17',
              expiry_time = '18:00:00',
              unit = $2,
              status = 'In Stock',
              batch_id = $3
          WHERE id = $4
        `, [finalBal, p.unit, batchCode, existingInv.rows[0].id]);
      } else {
        await queryWithRetry(`
          INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status, batch_id, production_time, expiry_time)
          VALUES ($1, $2, '2026-11-15', '2026-11-17', $3, $4, 'In Stock', $5, '06:00:00', '18:00:00')
        `, [pId, finalBal, b.branchId, p.unit, batchCode]);
      }
    }
  }

  // Deactivate Ube Pandesal in Tibungco 2
  await queryWithRetry(`
    UPDATE bw_inventory SET stock_level = 0, status = 'Inactive'
    WHERE branch_id = 5 AND product_id = 'p_ube_lasang'
  `);

  console.log('\n========================================================================');
  console.log('🎉 MASTER DATABASE POPULATION COMPLETED SUCCESSFULLY!');
  console.log(`Total POS Transactions Created: ${totalTxInserted.toLocaleString()}`);
  console.log(`Total Sales Lines Created: ${totalSalesLinesInserted.toLocaleString()}`);
  console.log('========================================================================');

  await pool.end();
}

runMasterSeeder().catch(err => {
  console.error('\n❌ Fatal error in master seeder:', err);
  process.exit(1);
});

