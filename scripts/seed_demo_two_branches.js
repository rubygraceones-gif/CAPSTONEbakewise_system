/**
 * BakeWise Fast & Atomic Demo Data Seeder for Exactly 2 Branches:
 * 1. Lasang (branch_id = 3)
 * 2. Tibungco 2 (branch_id = 5)
 * 
 * Date Range: October 14, 2026 to October 31, 2026 (inclusive, 18 calendar days)
 * Timezone: Asia/Manila (UTC+8)
 * 
 * Mathematical Consistency Formula:
 * Closing Stock = Opening Stock + Received + Production + Transfer In - Sales - Waste - Transfer Out - Repurposed
 */

const { Pool } = require('pg');

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

// Batch multi-row insert helper
async function batchInsert(table, columns, rows, chunkSize = 80) {
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

// 18 calendar days: Oct 14 to Oct 31, 2026
const DATE_LIST = [];
for (let d = 14; d <= 31; d++) {
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  DATE_LIST.push(`2026-10-${dayStr}`);
}

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

const BRANCH_CONFIGS = [
  {
    branchId: 3,
    branchName: 'Lasang',
    cashierName: 'Demo Cashier - Lasang',
    bakerName: 'Demo Baker - Lasang',
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang'],
    initialStock: {
      p1: 35,
      p2: 25,
      p3: 30,
      p4: 8,
      p5: 25,
      p6: 20,
      p8: 10,
      p10: 25,
      p_ube_lasang: 20
    },
    dailyProduction: {
      p1: [25, 35],
      p2: [10, 15],
      p3: [12, 18],
      p4: [0, 4],
      p5: [10, 12],
      p6: [8, 10],
      p8: [0, 3],
      p10: [15, 18],
      p_ube_lasang: [18, 24]
    },
    salesProfile: (pId, dayIndex, dayOfWeek) => {
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      if (pId === 'p1') {
        // Pandesal: starts ~20, grows to ~32 -> HIGH DEMAND
        const base = 20 + Math.floor(dayIndex * 0.7);
        return base + (isWeekend ? 3 : 0);
      } else if (pId === 'p2') {
        // Ensaymada: stable ~9 -> STABLE DEMAND
        return 9 + (isWeekend ? 2 : -1);
      } else if (pId === 'p3') {
        // Classic Sliced Bread: starts ~10, grows to ~14 -> MODERATE DEMAND
        const base = 10 + Math.floor(dayIndex * 0.25);
        return base + (isWeekend ? 2 : 0);
      } else if (pId === 'p4') {
        // Chocolate Cake: 1 weekday, 2-3 weekend -> STABLE DEMAND
        return isWeekend ? 3 : 1;
      } else if (pId === 'p5') {
        // Spanish Bread: starts ~12, declines to ~6 -> LOW DEMAND
        return Math.max(5, 12 - Math.floor(dayIndex * 0.4));
      } else if (pId === 'p6') {
        // Croissant: stable ~8 -> STABLE DEMAND
        return 8 + (isWeekend ? 1 : 0);
      } else if (pId === 'p8') {
        // Chiffon Cake: 1-2 -> STABLE DEMAND
        return isWeekend ? 2 : 1;
      } else if (pId === 'p10') {
        // Muffin: stable ~14 -> STABLE DEMAND
        return 14 + (isWeekend ? 2 : -1);
      } else if (pId === 'p_ube_lasang') {
        // Ube Cheese Pandesal: starts ~15, grows to ~24 -> HIGH DEMAND
        const base = 15 + Math.floor(dayIndex * 0.55);
        return base + (isWeekend ? 3 : 0);
      }
      return 5;
    }
  },
  {
    branchId: 5,
    branchName: 'Tibungco 2',
    cashierName: 'Demo Cashier - Tibungco 2',
    bakerName: 'Demo Baker - Tibungco 2',
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10'],
    initialStock: {
      p1: 30,
      p2: 20,
      p3: 20,
      p4: 6,
      p5: 20,
      p6: 15,
      p8: 8,
      p10: 22
    },
    dailyProduction: {
      p1: [28, 35],
      p2: [8, 12],
      p3: [14, 18],
      p4: [0, 3],
      p5: [10, 12],
      p6: [7, 10],
      p8: [0, 2],
      p10: [15, 20]
    },
    salesProfile: (pId, dayIndex, dayOfWeek) => {
      const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
      if (pId === 'p1') {
        // Pandesal: high steady volume ~28-30 -> STABLE DEMAND
        return 28 + (dayIndex % 3 === 0 ? 2 : 0) + (isWeekend ? 2 : 0);
      } else if (pId === 'p2') {
        // Ensaymada: declining from 10 to 5 -> LOW DEMAND
        return Math.max(5, 10 - Math.floor(dayIndex * 0.35));
      } else if (pId === 'p3') {
        // Classic Sliced Bread: strong growth from 11 up to 21 -> HIGH DEMAND
        const base = 11 + Math.floor(dayIndex * 0.6);
        return base + (isWeekend ? 2 : 0);
      } else if (pId === 'p4') {
        // Chocolate cake: 1 weekday, 2 weekend -> STABLE DEMAND
        return isWeekend ? 2 : 1;
      } else if (pId === 'p5') {
        // Spanish bread: steady ~10 -> STABLE DEMAND
        return 10 + (isWeekend ? 1 : 0);
      } else if (pId === 'p6') {
        // Croissant: steady ~7 -> STABLE DEMAND
        return 7 + (isWeekend ? 1 : 0);
      } else if (pId === 'p8') {
        // Chiffon cake: 1 -> STABLE DEMAND
        return 1;
      } else if (pId === 'p10') {
        // Muffin: moderate growth from 12 up to 17 -> MODERATE DEMAND
        const base = 12 + Math.floor(dayIndex * 0.3);
        return base + (isWeekend ? 2 : 0);
      }
      return 5;
    }
  }
];

async function seedDemoDataFast() {
  console.log('====================================================');
  console.log('FAST ATOMIC DEMO SEEDER: EXACTLY 2 BRANCHES');
  console.log('Branches: Lasang (3) & Tibungco 2 (5)');
  console.log('Dates: 2026-10-14 through 2026-10-31 (18 days)');
  console.log('====================================================\n');

  // Step 1: Clean test products & existing demo data for branch 3 and 5 only
  console.log('[1/5] Purging old demo records for branch 3 & 5...');
  await queryWithRetry("DELETE FROM bw_products WHERE id LIKE 'p_test_%'");
  await queryWithRetry("DELETE FROM bw_branch_products WHERE product_id LIKE 'p_test_%' OR branch_id IN (3, 5)");
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

  // Step 2: Set up Branch Catalog overrides
  console.log('\n[2/5] Creating branch product catalogs...');
  const bpRows = [];
  for (const b of BRANCH_CONFIGS) {
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

  // Step 3: In-Memory 18-Day Simulation
  console.log('\n[3/5] Calculating 18-day chronological mathematical model...');
  
  const runningStock = { 3: {}, 5: {} };
  const movementRows = [];
  const productionRows = [];
  const batchRows = [];
  const wasteRows = [];
  const repurposeRows = [];
  const posTxRows = [];
  const txItemRows = [];
  const salesRows = [];

  // Opening stock on Oct 14
  for (const b of BRANCH_CONFIGS) {
    for (const pId of b.productIds) {
      runningStock[b.branchId][pId] = b.initialStock[pId] || 25;
      movementRows.push({
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
        reason: 'Historical baseline stock level as of October 14, 2026',
        notes: 'System audit baseline',
        performed_by: 'Demo System',
        status: 'Completed',
        created_at: '2026-10-14 05:00:00'
      });
    }
  }

  // Simulation day by day
  for (let dayIndex = 0; dayIndex < DATE_LIST.length; dayIndex++) {
    const dateStr = DATE_LIST[dayIndex];
    const curDateObj = new Date(dateStr + 'T00:00:00+08:00');
    const dayOfWeek = curDateObj.getDay();

    for (const b of BRANCH_CONFIGS) {
      const branchId = b.branchId;

      // A. Morning Production
      for (const pId of b.productIds) {
        const p = PRODUCTS_MASTER[pId];
        const prodRange = b.dailyProduction[pId];
        let bakeQty = 0;

        if (prodRange[1] === 0) {
          bakeQty = 0;
        } else if (prodRange[0] === 0) {
          bakeQty = (dayIndex % 3 === 0 || (p.category === 'Cakes' && (dayOfWeek === 5 || dayOfWeek === 6))) ? Math.max(2, prodRange[1]) : 0;
        } else {
          const min = prodRange[0];
          const max = prodRange[1];
          bakeQty = min + ((dayIndex + (branchId === 3 ? 1 : 2)) % (max - min + 1));
        }

        if (bakeQty > 0) {
          const prodCode = `DEMO-PRD-B${branchId}-${pId}-${dateStr.replace(/-/g, '')}`;
          const batchCode = `DEMO-BAT-B${branchId}-${pId}-${dateStr.replace(/-/g, '')}`;

          productionRows.push({
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

          // Expiry
          const expDateObj = new Date(curDateObj.getTime() + (p.shelf_life * 24 * 60 * 60 * 1000));
          const expYear = expDateObj.getFullYear();
          const expMonth = String(expDateObj.getMonth() + 1).padStart(2, '0');
          const expDay = String(expDateObj.getDate()).padStart(2, '0');
          const expiryDateStr = `${expYear}-${expMonth}-${expDay}`;
          const storageCond = p.category === 'Cakes' ? 'Refrigerated Storage' : (p.category === 'Pastries' ? 'Display Case Storage' : 'Covered Room-Temperature Storage');

          batchRows.push({
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

          movementRows.push({
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
            reason: 'Daily fresh morning baking cycle',
            notes: null,
            performed_by: b.bakerName,
            status: 'Completed',
            created_at: `${dateStr} 06:15:00`
          });
        }
      }

      // B. Documented Transfer on Oct 24
      if (dateStr === '2026-10-24' && branchId === 3) {
        const trfQty = 10;
        const trfPid = 'p3';
        const trfRef = 'DEMO-TRF-20261024-001';

        // Lasang Out
        const prevB3 = runningStock[3][trfPid];
        runningStock[3][trfPid] -= trfQty;
        movementRows.push({
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
          reason: 'Inter-branch stock transfer to support Tibungco 2 weekend rush',
          notes: 'Authorized transfer',
          performed_by: 'Branch Supervisor',
          status: 'Completed',
          created_at: `${dateStr} 10:00:00`
        });

        // Tibungco 2 In
        const prevB5 = runningStock[5][trfPid];
        runningStock[5][trfPid] += trfQty;
        movementRows.push({
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
          reason: 'Inter-branch stock transfer received from Lasang',
          notes: 'Inspected and verified',
          performed_by: 'Tibungco Receiver',
          status: 'Completed',
          created_at: `${dateStr} 10:45:00`
        });
      }

      // C. Repurposing on Oct 28
      if (dateStr === '2026-10-28') {
        if (branchId === 3) {
          const repPid = 'p1';
          const repQty = 6;
          const repRecipe = 'Bread Crumbs';
          const prevStock = runningStock[3][repPid];
          runningStock[3][repPid] -= repQty;

          repurposeRows.push({
            batch_id: 'DEMO-BAT-B3-p1-20261026',
            product_id: repPid,
            product_name: 'Pandesal',
            quantity: repQty,
            target_recipe: repRecipe,
            branch_id: 3,
            timestamp: `${dateStr} 15:00:00`
          });

          movementRows.push({
            movement_type: 'Repurpose Deduction',
            branch_id: 3,
            product_id: repPid,
            quantity: -repQty,
            previous_stock: prevStock,
            new_stock: runningStock[3][repPid],
            unit: PRODUCTS_MASTER[repPid].unit,
            batch_id: null,
            source_branch_id: null,
            dest_branch_id: null,
            reference_id: 'DEMO-REP-20261028-B3',
            reason: `Safe repurposing: 6 pcs of near-expiry Pandesal processed into ${repRecipe}`,
            notes: null,
            performed_by: 'Baker Staff',
            status: 'Completed',
            created_at: `${dateStr} 15:05:00`
          });
        } else if (branchId === 5) {
          const repPid = 'p3';
          const repQty = 5;
          const repRecipe = 'Croutons';
          const prevStock = runningStock[5][repPid];
          runningStock[5][repPid] -= repQty;

          repurposeRows.push({
            batch_id: 'DEMO-BAT-B5-p3-20261025',
            product_id: repPid,
            product_name: 'Classic Sliced Bread',
            quantity: repQty,
            target_recipe: repRecipe,
            branch_id: 5,
            timestamp: `${dateStr} 15:30:00`
          });

          movementRows.push({
            movement_type: 'Repurpose Deduction',
            branch_id: 5,
            product_id: repPid,
            quantity: -repQty,
            previous_stock: prevStock,
            new_stock: runningStock[5][repPid],
            unit: PRODUCTS_MASTER[repPid].unit,
            batch_id: null,
            source_branch_id: null,
            dest_branch_id: null,
            reference_id: 'DEMO-REP-20261028-B5',
            reason: `Safe repurposing: 5 pcs of near-expiry Classic Sliced Bread processed into ${repRecipe}`,
            notes: null,
            performed_by: 'Baker Staff',
            status: 'Completed',
            created_at: `${dateStr} 15:35:00`
          });
        }
      }

      // D. Occasional Scrap / Waste
      if (dateStr === '2026-10-18' && branchId === 3) {
        const wastePid = 'p1';
        const wasteQty = 2;
        const wasteCost = wasteQty * PRODUCTS_MASTER[wastePid].cost;
        const prevStock = runningStock[3][wastePid];
        runningStock[3][wastePid] -= wasteQty;

        wasteRows.push({
          product_id: wastePid,
          qty: wasteQty,
          cost: wasteCost,
          reason: 'DEMO: Overbaked Batch Trimming',
          date: dateStr,
          branch_id: 3,
          created_at: `${dateStr} 16:00:00`
        });

        movementRows.push({
          movement_type: 'Waste Scrap',
          branch_id: 3,
          product_id: wastePid,
          quantity: -wasteQty,
          previous_stock: prevStock,
          new_stock: runningStock[3][wastePid],
          unit: PRODUCTS_MASTER[wastePid].unit,
          batch_id: null,
          source_branch_id: null,
          dest_branch_id: null,
          reference_id: 'DEMO-WST-20261018-B3',
          reason: 'Logged waste scrap: Overbaked batch trimming',
          notes: null,
          performed_by: b.cashierName,
          status: 'Completed',
          created_at: `${dateStr} 16:05:00`
        });
      }

      if (dateStr === '2026-10-26' && branchId === 5) {
        const wastePid = 'p2';
        const wasteQty = 1;
        const wasteCost = wasteQty * PRODUCTS_MASTER[wastePid].cost;
        const prevStock = runningStock[5][wastePid];
        runningStock[5][wastePid] -= wasteQty;

        wasteRows.push({
          product_id: wastePid,
          qty: wasteQty,
          cost: wasteCost,
          reason: 'DEMO: Damaged Packaging / Deformed',
          date: dateStr,
          branch_id: 5,
          created_at: `${dateStr} 16:15:00`
        });

        movementRows.push({
          movement_type: 'Waste Scrap',
          branch_id: 5,
          product_id: wastePid,
          quantity: -wasteQty,
          previous_stock: prevStock,
          new_stock: runningStock[5][wastePid],
          unit: PRODUCTS_MASTER[wastePid].unit,
          batch_id: null,
          source_branch_id: null,
          dest_branch_id: null,
          reference_id: 'DEMO-WST-20261026-B5',
          reason: 'Logged waste scrap: Damaged packaging during display',
          notes: null,
          performed_by: b.cashierName,
          status: 'Completed',
          created_at: `${dateStr} 16:20:00`
        });
      }

      // E. Sales Transactions
      const daySalesNeeded = {};
      for (const pId of b.productIds) {
        const target = b.salesProfile(pId, dayIndex, dayOfWeek);
        const maxPossible = Math.max(0, runningStock[branchId][pId] - 5);
        daySalesNeeded[pId] = Math.min(target, maxPossible);
      }

      const numTx = 6 + (dayIndex % 4);
      const txBaskets = Array.from({ length: numTx }, () => []);

      for (const pId of b.productIds) {
        let needed = daySalesNeeded[pId];
        let basketIdx = 0;
        while (needed > 0) {
          const take = Math.min(needed, 1 + ((needed + basketIdx) % 3));
          txBaskets[basketIdx % numTx].push({
            product_id: pId,
            qty: take,
            price: PRODUCTS_MASTER[pId].price
          });
          needed -= take;
          basketIdx++;
        }
      }

      let txSeq = 1;
      for (let t = 0; t < txBaskets.length; t++) {
        const basket = txBaskets[t];
        if (basket.length === 0) continue;

        const seqStr = String(txSeq).padStart(3, '0');
        const txNumber = `DEMO-POS-B${branchId}-${dateStr.replace(/-/g, '')}-${seqStr}`;
        const hour = 7 + Math.floor((t / txBaskets.length) * 12);
        const minute = (t * 13) % 60;
        const txTimestamp = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

        let subtotal = 0;
        for (const item of basket) {
          subtotal += item.qty * item.price;
        }
        subtotal = Math.round(subtotal * 100) / 100;
        const discount = 0.00;
        const total = subtotal;
        const paymentMethod = (t % 3 === 0) ? 'GCash' : 'Cash';
        const paymentAmount = paymentMethod === 'Cash' ? Math.ceil(total / 50) * 50 : total;
        const changeAmount = Math.round((paymentAmount - total) * 100) / 100;

        posTxRows.push({
          transaction_number: txNumber,
          branch_id: branchId,
          cashier: b.cashierName,
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

        for (const item of basket) {
          salesRows.push({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
            date: dateStr,
            cashier: b.cashierName,
            branch_id: branchId,
            created_at: txTimestamp
          });

          const prevStock = runningStock[branchId][item.product_id];
          runningStock[branchId][item.product_id] -= item.qty;

          movementRows.push({
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
            reference_id: txNumber,
            reason: 'POS Sale Checkout',
            notes: null,
            performed_by: b.cashierName,
            status: 'Completed',
            created_at: txTimestamp
          });
        }

        txSeq++;
      }
    }
  }

  console.log(`✓ Model computed: ${productionRows.length} production orders, ${posTxRows.length} POS transactions, ${salesRows.length} sales lines, ${movementRows.length} movements.`);

  // Step 4: Fast Batched Execution into Postgres
  console.log('\n[4/5] Executing high-speed batched database inserts...');

  // A. Production
  console.log(`  -> Inserting ${productionRows.length} production records...`);
  await batchInsert('bw_production', [
    'product_id', 'planned', 'actual', 'date', 'baker', 'status', 'code', 'branch_id', 'created_at'
  ], productionRows);

  // B. Batches
  console.log(`  -> Inserting ${batchRows.length} inventory batch records...`);
  await batchInsert('bw_inventory_batches', [
    'batch_code', 'branch_id', 'product_id', 'initial_quantity', 'current_quantity',
    'production_date', 'production_time', 'expiry_date', 'expiry_time', 'storage_condition', 'status', 'food_safety_status', 'created_at'
  ], batchRows);

  // Near-expiry batches for Oct 31 repurposing demonstration
  await queryWithRetry(`
    INSERT INTO bw_inventory_batches (
      batch_code, branch_id, product_id, initial_quantity, current_quantity,
      production_date, production_time, expiry_date, expiry_time, storage_condition, status, food_safety_status, created_at
    ) VALUES 
      ('DEMO-BAT-B3-p1-NEAR-EXP', 3, 'p1', 15, 12, '2026-10-30', '06:00:00', '2026-11-01', '18:00:00', 'Covered Room-Temperature Storage', 'In Stock', 'Approved', '2026-10-30 06:00:00'),
      ('DEMO-BAT-B5-p3-NEAR-EXP', 5, 'p3', 10, 8, '2026-10-28', '07:00:00', '2026-11-01', '19:00:00', 'Covered Room-Temperature Storage', 'In Stock', 'Approved', '2026-10-28 07:00:00')
  `);

  // C. Waste & Repurposing
  console.log(`  -> Inserting ${wasteRows.length} waste and ${repurposeRows.length} repurpose records...`);
  await batchInsert('bw_waste', [
    'product_id', 'qty', 'cost', 'reason', 'date', 'branch_id', 'created_at'
  ], wasteRows);

  await batchInsert('bw_repurpose_logs', [
    'batch_id', 'product_id', 'product_name', 'quantity', 'target_recipe', 'branch_id', 'timestamp'
  ], repurposeRows);

  // D. POS Transactions & Line Items
  console.log(`  -> Inserting ${posTxRows.length} POS transactions...`);
  const insertedTxIds = await batchInsert('bw_pos_transactions', [
    'transaction_number', 'branch_id', 'cashier', 'subtotal', 'discount', 'total',
    'payment_amount', 'change_amount', 'payment_method', 'status', 'date', 'created_at'
  ], posTxRows.map(t => ({
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
  })));

  // Map transaction items to generated IDs
  for (let i = 0; i < posTxRows.length; i++) {
    const txId = insertedTxIds[i].id;
    for (const item of posTxRows[i].items) {
      txItemRows.push({
        transaction_id: txId,
        product_id: item.product_id,
        quantity: item.qty,
        unit_price: item.price,
        subtotal: Math.round(item.qty * item.price * 100) / 100
      });
    }
  }

  console.log(`  -> Inserting ${txItemRows.length} POS transaction item lines...`);
  await batchInsert('bw_pos_transaction_items', [
    'transaction_id', 'product_id', 'quantity', 'unit_price', 'subtotal'
  ], txItemRows);

  // E. Sales
  console.log(`  -> Inserting ${salesRows.length} sales lines...`);
  await batchInsert('bw_sales', [
    'product_id', 'qty', 'price', 'date', 'cashier', 'branch_id', 'created_at'
  ], salesRows);

  // F. Inventory Movements
  console.log(`  -> Inserting ${movementRows.length} movement audit lines...`);
  await batchInsert('bw_inventory_movements', [
    'movement_type', 'branch_id', 'product_id', 'quantity', 'previous_stock', 'new_stock',
    'unit', 'batch_id', 'source_branch_id', 'dest_branch_id', 'reference_id', 'reason',
    'notes', 'performed_by', 'status', 'created_at'
  ], movementRows);

  // Step 5: Update bw_inventory
  console.log('\n[5/5] Finalizing usable inventory stock balances in bw_inventory...');
  for (const b of BRANCH_CONFIGS) {
    for (const pId of b.productIds) {
      const finalBal = runningStock[b.branchId][pId];
      const p = PRODUCTS_MASTER[pId];
      const batchCode = `DEMO-BAT-B${b.branchId}-${pId}-20261031`;

      const existingInv = await queryWithRetry(
        'SELECT id FROM bw_inventory WHERE branch_id = $1 AND product_id = $2',
        [b.branchId, pId]
      );

      if (existingInv.rows.length > 0) {
        await queryWithRetry(`
          UPDATE bw_inventory
          SET stock_level = $1,
              production_date = '2026-10-31',
              production_time = '06:00:00',
              expiry_date = '2026-11-02',
              expiry_time = '18:00:00',
              unit = $2,
              status = 'In Stock',
              batch_id = $3
          WHERE id = $4
        `, [finalBal, p.unit, batchCode, existingInv.rows[0].id]);
      } else {
        await queryWithRetry(`
          INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id, unit, status, batch_id, production_time, expiry_time)
          VALUES ($1, $2, '2026-10-31', '2026-11-02', $3, $4, 'In Stock', $5, '06:00:00', '18:00:00')
        `, [pId, finalBal, b.branchId, p.unit, batchCode]);
      }
    }
  }

  // Deactivate Ube Pandesal in Tibungco 2
  await queryWithRetry(`
    UPDATE bw_inventory SET stock_level = 0, status = 'Inactive'
    WHERE branch_id = 5 AND product_id = 'p_ube_lasang'
  `);

  console.log('\n====================================================');
  console.log('🎉 DEMO DATA SEEDING COMPLETE FOR LASANG & TIBUNGCO 2');
  console.log('====================================================');

  await pool.end();
}

seedDemoDataFast().catch(err => {
  console.error('\n❌ Fatal error during demo seeding:', err);
  process.exit(1);
});
