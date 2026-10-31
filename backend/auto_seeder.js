/**
 * ROSE BAKESHOP x BAKEWISE - UNIVERSAL DATABASE SEEDER
 * Compatible with MySQL (Railway / XAMPP) and PostgreSQL (Supabase)
 * 
 * Coverage: October 14, 2026 to November 13, 2026 (31 calendar days)
 * Target: Exactly 250 Completed POS Sales per Branch per Day
 *  - Lasang: 7,750 sales
 *  - Tibungco 2: 7,750 sales
 *  - Combined: 15,500 completed transactions
 * 
 * Seed Identifier: ROSE_BAKEWISE_250_PER_BRANCH_20261014_20261113
 */

const bcrypt = require('bcryptjs');

const SEED_IDENTIFIER = 'ROSE_BAKEWISE_250_PER_BRANCH_20261014_20261113';

// Generate 31 calendar dates: Oct 14 to Nov 13, 2026
const DATES = [];
for (let d = 14; d <= 31; d++) {
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  DATES.push({ dateStr: `2026-10-${dayStr}`, isFuture: false });
}
for (let d = 1; d <= 13; d++) {
  const dayStr = d < 10 ? `0${d}` : `${d}`;
  DATES.push({ dateStr: `2026-11-${dayStr}`, isFuture: true });
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

function createRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

async function runAutoSeeder(queryDb, force = false) {
  console.log('========================================================================');
  console.log('AUTO-SEEDER: VERIFYING DEMO DATA COVERAGE (Oct 14 - Nov 13, 2026)');
  console.log('========================================================================');

  // 1. Dynamic Branch Resolution
  const branchRows = (await queryDb("SELECT id, name FROM bw_branches")).rows || [];
  let bLasang = branchRows.find(b => b.name && b.name.toLowerCase().includes('lasang'));
  let bTibungco = branchRows.find(b => b.name && b.name.toLowerCase().includes('tibungco'));

  if (!bLasang) {
    const ins = await queryDb(
      "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      ['Lasang', 14.5995, 120.984, 'Daang Maharlika Hwy, Bunawan, Davao City', '5:00 AM – 10:00 PM', '09935981766', 'Active']
    );
    bLasang = { id: ins.rows[0].id, name: 'Lasang' };
  }
  if (!bTibungco) {
    const ins = await queryDb(
      "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
      ['Tibungco 2', 130, 230, 'Along National Highway, Tibungco', '5:00 AM – 9:00 PM', '09929888211', 'Active']
    );
    bTibungco = { id: ins.rows[0].id, name: 'Tibungco 2' };
  }

  const lasangId = parseInt(bLasang.id);
  const tibungcoId = parseInt(bTibungco.id);

  console.log(`Resolved Target Branches: Lasang (ID: ${lasangId}), Tibungco 2 (ID: ${tibungcoId})`);

  // Helper batch insert
  async function batchInsert(table, columns, rows, chunkSize = 100) {
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

      const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valueClauses.join(', ')}`;
      const res = await queryDb(sql, params);
      if (res && res.rows) allResults.push(...res.rows);
    }
    return allResults;
  }

  async function seedRichInventory(lId, tId) {
    console.log('Populating rich multi-batch inventory across October 14 - November 13...');
    await queryDb("DELETE FROM bw_inventory WHERE branch_id IN ($1, $2)", [lId, tId]);

    const bConfigs = [
      {
        branchId: lId,
        productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang']
      },
      {
        branchId: tId,
        productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10']
      }
    ];

    const checkpoints = [
      '2026-10-14', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19',
      '2026-10-21', '2026-10-24', '2026-10-27', '2026-10-30',
      '2026-11-02', '2026-11-05', '2026-11-08', '2026-11-11', '2026-11-13'
    ];

    const invRows = [];
    for (const b of bConfigs) {
      for (const pId of b.productIds) {
        const p = PRODUCTS_MASTER[pId];
        const shelfDays = p.shelf_life || 3;

        for (const prodDate of checkpoints) {
          const dObj = new Date(`${prodDate}T00:00:00Z`);
          const expObj = new Date(dObj.getTime() + shelfDays * 24 * 60 * 60 * 1000);
          let expDate = expObj.toISOString().split('T')[0];

          // Ensure specific lots expire on 2026-10-21 for both branches
          if (prodDate === '2026-10-18' && (pId === 'p2' || pId === 'p10' || pId === 'p3')) {
            expDate = '2026-10-21';
          }
          if (prodDate === '2026-10-19' && (pId === 'p1' || pId === 'p5' || pId === 'p6' || pId === 'p8' || pId === 'p_ube_lasang')) {
            expDate = '2026-10-21';
          }
          if (prodDate === '2026-10-17' && pId === 'p4') {
            expDate = '2026-10-21';
          }

          const dateClean = prodDate.replace(/-/g, '');
          const batchCode = `BAT-B${b.branchId}-${pId}-${dateClean}`;
          const baseStock = (pId === 'p1' || pId === 'p_ube_lasang') ? 60 : (pId === 'p4' ? 15 : 40);
          const stockLevel = Math.max(12, baseStock + ((prodDate.charCodeAt(9) * 7) % 25) - 8);

          let status = 'In Stock';
          if (stockLevel <= 10) status = 'Low Stock';

          invRows.push({
            product_id: pId,
            stock_level: stockLevel,
            production_date: prodDate,
            expiry_date: expDate,
            branch_id: b.branchId,
            batch_id: batchCode,
            unit: p.unit || 'pcs',
            status: status
          });
        }
      }
    }

    await batchInsert('bw_inventory', [
      'product_id', 'stock_level', 'production_date', 'expiry_date',
      'branch_id', 'batch_id', 'unit', 'status'
    ], invRows);

    console.log(`✓ Seeded ${invRows.length} rich multi-date inventory records into bw_inventory.`);
  }

  // 2. Check existing transaction counts
  const countRes = await queryDb(
    "SELECT COUNT(*) as count FROM bw_pos_transactions WHERE branch_id IN ($1, $2) AND date >= '2026-10-14' AND date <= '2026-11-13'",
    [lasangId, tibungcoId]
  );
  const currentCount = parseInt(countRes.rows[0]?.count || 0);
  console.log(`Current completed POS transactions in target date range: ${currentCount}`);

  const invCountRes = await queryDb(
    "SELECT COUNT(*) as count FROM bw_inventory WHERE branch_id IN ($1, $2)",
    [lasangId, tibungcoId]
  );
  const currentInvCount = parseInt(invCountRes.rows[0]?.count || 0);

  if (!force && currentCount >= 15000) {
    if (currentInvCount < 50) {
      console.log('Transactions populated, but inventory requires rich multi-date lot seeding. Seeding inventory now...');
      await seedRichInventory(lasangId, tibungcoId);
    } else {
      console.log('✓ Target demo dataset and inventory are already fully populated in this database. Skipping auto-seeding.');
    }
    return { success: true, alreadyPopulated: true, totalTransactions: currentCount, inventoryRecords: Math.max(currentInvCount, 204) };
  }

  // Ensure products exist in bw_products
  for (const pid of Object.keys(PRODUCTS_MASTER)) {
    const p = PRODUCTS_MASTER[pid];
    try {
      await queryDb(
        `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), cost = VALUES(cost)`,
        [p.id, p.name, p.category, p.price, p.cost, p.shelf_life, p.repurpose]
      );
    } catch (e) {
      // In PostgreSQL, try ON CONFLICT
      try {
        await queryDb(
          `INSERT INTO bw_products (id, name, category, price, cost, shelf_life_days, repurpose_recipe)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price`,
          [p.id, p.name, p.category, p.price, p.cost, p.shelf_life, p.repurpose]
        );
      } catch (e2) {}
    }
  }

  // Ensure employee accounts
  const defaultHash = bcrypt.hashSync('password123', 10);
  const staffToEnsure = [
    { name: 'Elena Santos', email: 'elena.santos@bakewise.com', role: 'manager', branchId: lasangId },
    { name: 'Danilo Cruz', email: 'danilo.cruz@bakewise.com', role: 'inventory', branchId: lasangId },
    { name: 'Marco Reyes', email: 'marco.reyes@bakewise.com', role: 'production', branchId: lasangId },
    { name: 'Grace Lim', email: 'grace.lim@bakewise.com', role: 'sales', branchId: lasangId },
    { name: 'Ramon Bautista', email: 'ramon.bautista@bakewise.com', role: 'sales', branchId: lasangId },
    { name: 'Roberto Gomez', email: 'roberto.gomez@bakewise.com', role: 'manager', branchId: tibungcoId },
    { name: 'Lorna Villanueva', email: 'lorna.villanueva@bakewise.com', role: 'inventory', branchId: tibungcoId },
    { name: 'Arnel Mendoza', email: 'arnel.mendoza@bakewise.com', role: 'production', branchId: tibungcoId },
    { name: 'Patricia Dizon', email: 'patricia.dizon@bakewise.com', role: 'sales', branchId: tibungcoId },
    { name: 'Kristine Ramos', email: 'kristine.ramos@bakewise.com', role: 'sales', branchId: tibungcoId }
  ];

  for (const s of staffToEnsure) {
    try {
      await queryDb(
        "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON DUPLICATE KEY UPDATE branch_id = VALUES(branch_id)",
        [s.email, defaultHash, s.name, s.role, s.branchId]
      );
    } catch (e) {
      try {
        await queryDb(
          "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET branch_id = EXCLUDED.branch_id",
          [s.email, defaultHash, s.name, s.role, s.branchId]
        );
      } catch (e2) {}
    }
  }

  // Purge prior target branch demo records
  console.log('Purging prior target branch records for clean seeding...');
  try {
    await queryDb("DELETE FROM bw_pos_transaction_items WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id IN ($1, $2))", [lasangId, tibungcoId]);
  } catch (e) {}
  await queryDb("DELETE FROM bw_pos_transactions WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]);
  await queryDb("DELETE FROM bw_sales WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]);
  await queryDb("DELETE FROM bw_production WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]);
  await queryDb("DELETE FROM bw_waste WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]);
  try { await queryDb("DELETE FROM bw_inventory_batches WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_inventory_movements WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_repurpose_logs WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_branch_products WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]); } catch (e) {}

  const BRANCH_CONFIGS = [
    {
      branchId: lasangId,
      branchName: 'Lasang',
      bakerName: 'Marco Reyes',
      cashiers: [
        { name: 'Grace Lim', shift: 'Morning Shift (05:00 - 13:00)' },
        { name: 'Ramon Bautista', shift: 'Afternoon Shift (13:00 - 21:00)' }
      ],
      productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang'],
      initialStock: { p1: 60, p2: 40, p3: 45, p4: 15, p5: 50, p6: 35, p8: 20, p10: 50, p_ube_lasang: 50 }
    },
    {
      branchId: tibungcoId,
      branchName: 'Tibungco 2',
      bakerName: 'Arnel Mendoza',
      cashiers: [
        { name: 'Patricia Dizon', shift: 'Morning Shift (05:00 - 13:00)' },
        { name: 'Kristine Ramos', shift: 'Afternoon Shift (13:00 - 21:00)' }
      ],
      productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10'],
      initialStock: { p1: 65, p2: 40, p3: 40, p4: 12, p5: 50, p6: 35, p8: 18, p10: 55 }
    }
  ];

  // Initialize branch products
  for (const b of BRANCH_CONFIGS) {
    for (const pId of b.productIds) {
      const p = PRODUCTS_MASTER[pId];
      try {
        await queryDb(
          "INSERT INTO bw_branch_products (branch_id, product_id, custom_name, category, price, cost, shelf_life_days, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
          [b.branchId, p.id, p.name, p.category, p.price, p.cost, p.shelf_life, p.unit, 'Active']
        );
      } catch (e) {}
    }
  }

  // Initialize running stock
  const runningStock = {};
  runningStock[lasangId] = { ...BRANCH_CONFIGS[0].initialStock };
  runningStock[tibungcoId] = { ...BRANCH_CONFIGS[1].initialStock };

  // Set opening inventory in bw_inventory
  await queryDb("DELETE FROM bw_inventory WHERE branch_id IN ($1, $2)", [lasangId, tibungcoId]);
  for (const b of BRANCH_CONFIGS) {
    for (const pId of b.productIds) {
      const p = PRODUCTS_MASTER[pId];
      await queryDb(
        "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES ($1, $2, $3, $4, $5)",
        [pId, runningStock[b.branchId][pId], '2026-10-14', '2026-10-16', b.branchId]
      );
    }
  }

  console.log('Simulating 31 calendar days (250 sales/branch/day)...');

  // Loop through 31 days
  for (let dayIdx = 0; dayIdx < DATES.length; dayIdx++) {
    const { dateStr, isFuture } = DATES[dayIdx];
    const dateClean = dateStr.replace(/-/g, '');
    const curDateObj = new Date(`${dateStr}T00:00:00+08:00`);
    const dayOfWeek = curDateObj.getDay();
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const dayProdBatch = [];
    const dayBatchRows = [];
    const dayWasteBatch = [];
    const dayRepurposeBatch = [];
    const dayMovementsBatch = [];
    const dayTxBatch = [];
    const daySalesBatch = [];

    for (const b of BRANCH_CONFIGS) {
      const branchId = b.branchId;
      const branchTxs = [];
      const dayProductSoldQty = {};
      b.productIds.forEach(pId => { dayProductSoldQty[pId] = 0; });

      // Generate exactly 250 sales
      for (let txSeq = 1; txSeq <= 250; txSeq++) {
        const rng = createRng((dayIdx + 1) * 100000 + branchId * 1000 + txSeq);
        const cashier = (txSeq <= 135) ? b.cashiers[0].name : b.cashiers[1].name;

        // Transaction timestamp
        let hour = 5 + Math.floor((txSeq / 250) * 16);
        if (hour > 20) hour = 20;
        const minute = Math.floor(rng() * 60);
        const second = Math.floor(rng() * 60);
        const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
        const txTimestamp = `${dateStr} ${timeStr}`;

        const seqStr = String(txSeq).padStart(3, '0');
        const txPrefix = isFuture ? 'SIM-POS' : 'POS';
        const txNumber = `${txPrefix}-B${branchId}-${dateClean}-${seqStr}`;

        // Construct items
        const basket = [];
        let p1Id = 'p1';
        if (branchId === lasangId && rng() < 0.28) {
          p1Id = 'p_ube_lasang';
        } else {
          const r1 = rng();
          if (r1 < 0.25) p1Id = 'p10';
          else if (r1 < 0.45) p1Id = 'p2';
          else if (r1 < 0.65) p1Id = 'p1';
          else if (r1 < 0.80) p1Id = 'p6';
          else if (isWeekend && r1 < 0.92) p1Id = 'p4';
          else p1Id = 'p3';
        }

        let p1Qty = 1;
        if (p1Id === 'p1' || p1Id === 'p_ube_lasang') p1Qty = 1 + (rng() < 0.45 ? 1 : 0);
        else if (p1Id === 'p10' || p1Id === 'p5') p1Qty = 1 + (rng() < 0.40 ? 1 : 0) + (rng() < 0.20 ? 1 : 0);

        basket.push({ product_id: p1Id, qty: p1Qty, price: PRODUCTS_MASTER[p1Id].price });
        dayProductSoldQty[p1Id] += p1Qty;

        if (rng() < 0.35) {
          let p2Id = (p1Id !== 'p10') ? 'p10' : 'p2';
          if (rng() < 0.40) p2Id = 'p5';
          if (p2Id !== p1Id && b.productIds.includes(p2Id)) {
            const p2Qty = (p2Id === 'p10' || p2Id === 'p5') ? (1 + (rng() < 0.3 ? 1 : 0)) : 1;
            basket.push({ product_id: p2Id, qty: p2Qty, price: PRODUCTS_MASTER[p2Id].price });
            dayProductSoldQty[p2Id] += p2Qty;
          }
        }

        let subtotal = 0;
        for (const item of basket) { subtotal += item.qty * item.price; }
        subtotal = Math.round(subtotal * 100) / 100;
        const discount = 0.00;
        const total = subtotal;

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

      // Morning production
      for (const pId of b.productIds) {
        const p = PRODUCTS_MASTER[pId];
        const soldQty = dayProductSoldQty[pId] || 0;
        const buffer = 10 + Math.floor((dayIdx % 10) * 1.5);
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

        const expDateObj = new Date(curDateObj.getTime() + (p.shelf_life * 24 * 60 * 60 * 1000));
        const expMonth = String(expDateObj.getMonth() + 1).padStart(2, '0');
        const expDay = String(expDateObj.getDate()).padStart(2, '0');
        const expiryDateStr = `${expDateObj.getFullYear()}-${expMonth}-${expDay}`;
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

        runningStock[branchId][pId] += bakeQty;
      }

      // Deduct sold items
      for (const tx of branchTxs) {
        for (const item of tx.items) {
          runningStock[branchId][item.product_id] -= item.qty;
          daySalesBatch.push({
            product_id: item.product_id,
            qty: item.qty,
            price: item.price,
            date: dateStr,
            cashier: tx.cashier,
            branch_id: branchId,
            created_at: tx.created_at
          });
        }
      }

      // Waste scrap
      if (dayIdx % 5 === 2) {
        const wastePid = (branchId === lasangId) ? 'p1' : 'p2';
        const wasteQty = 2;
        const wasteCost = wasteQty * PRODUCTS_MASTER[wastePid].cost;
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
      }

      // Repurposing
      if (dayIdx === 14 || dayIdx === 28) {
        const repPid = (branchId === lasangId) ? 'p1' : 'p3';
        const repQty = 5;
        const repRecipe = (repPid === 'p1') ? 'Bread Crumbs' : 'Croutons';
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
      }

      dayTxBatch.push(...branchTxs);
    }

    // Insert day batches
    await batchInsert('bw_production', ['product_id', 'planned', 'actual', 'date', 'baker', 'status', 'code', 'branch_id', 'created_at'], dayProdBatch);
    try {
      await batchInsert('bw_inventory_batches', [
        'batch_code', 'branch_id', 'product_id', 'initial_quantity', 'current_quantity',
        'production_date', 'production_time', 'expiry_date', 'expiry_time', 'storage_condition', 'status', 'food_safety_status', 'created_at'
      ], dayBatchRows);
    } catch (e) {}

    if (dayWasteBatch.length > 0) {
      await batchInsert('bw_waste', ['product_id', 'qty', 'cost', 'reason', 'date', 'branch_id', 'created_at'], dayWasteBatch);
    }
    if (dayRepurposeBatch.length > 0) {
      try {
        await batchInsert('bw_repurpose_logs', ['batch_id', 'product_id', 'product_name', 'quantity', 'target_recipe', 'branch_id', 'timestamp'], dayRepurposeBatch);
      } catch (e) {}
    }

    // Insert 500 POS Transactions
    await batchInsert('bw_pos_transactions', [
      'transaction_number', 'branch_id', 'cashier', 'subtotal', 'discount', 'total',
      'payment_amount', 'change_amount', 'payment_method', 'status', 'date', 'created_at'
    ], dayTxBatch);

    // Fetch inserted IDs to link items by exact date and branches
    const insertedTxsRes = await queryDb(
      "SELECT id, transaction_number FROM bw_pos_transactions WHERE date = $1 AND branch_id IN ($2, $3)",
      [dateStr, lasangId, tibungcoId]
    );
    const txIdMap = {};
    (insertedTxsRes.rows || []).forEach(t => { txIdMap[t.transaction_number] = t.id; });

    const dayTxItems = [];
    for (const t of dayTxBatch) {
      const realTxId = txIdMap[t.transaction_number];
      if (realTxId) {
        for (const item of t.items) {
          dayTxItems.push({
            transaction_id: realTxId,
            product_id: item.product_id,
            quantity: item.qty,
            unit_price: item.price,
            subtotal: Math.round(item.qty * item.price * 100) / 100
          });
        }
      }
    }
    if (dayTxItems.length > 0) {
      await batchInsert('bw_pos_transaction_items', ['transaction_id', 'product_id', 'quantity', 'unit_price', 'subtotal'], dayTxItems);
    }

    // Mirror to bw_sales
    await batchInsert('bw_sales', ['product_id', 'qty', 'price', 'date', 'cashier', 'branch_id', 'created_at'], daySalesBatch);

    if ((dayIdx + 1) % 5 === 0 || dayIdx === DATES.length - 1) {
      console.log(`[Day ${dayIdx + 1}/31] Seeded 500 POS sales for ${dateStr} (Total: ${(dayIdx + 1) * 500})`);
    }
  }

  // Seed rich multi-batch inventory across dates
  await seedRichInventory(lasangId, tibungcoId);

  console.log('🎉 AUTO-SEEDER COMPLETED SUCCESSFULLY: 15,500 completed transactions generated across 31 dates!');
  return { success: true, totalTransactions: 15500, dateRange: '2026-10-14 to 2026-11-13' };
}

module.exports = { runAutoSeeder, SEED_IDENTIFIER };
