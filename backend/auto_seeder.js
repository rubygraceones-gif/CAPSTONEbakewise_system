/**
 * ROSE BAKESHOP x BAKEWISE - UNIVERSAL DATABASE SEEDER
 * Single Branch Deployment: Lasang - Davao City
 * 
 * Coverage: October 14, 2026 to November 13, 2026 (31 calendar days)
 * Target: Exactly 250 Completed POS Sales per Day
 *  - Lasang: 7,750 sales (Cashier: Catalina Kato)
 * 
 * Seed Identifier: ROSE_BAKEWISE_LASANG_ONLY_CATALINA_KATO_2026
 */

const bcrypt = require('bcryptjs');

const SEED_IDENTIFIER = 'ROSE_BAKEWISE_VARIED_TIMES_CATALINA_2026';

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
  console.log('AUTO-SEEDER: LASANG SOLE BRANCH & CATALINA KATO CASHIER (Oct 14 - Nov 13, 2026)');
  console.log('========================================================================');

  // 1. Resolve Lasang and Purge Tibungco
  const branchRows = (await queryDb("SELECT id, name FROM bw_branches")).rows || [];
  let bLasang = branchRows.find(b => b.name && b.name.toLowerCase().includes('lasang'));

  if (!bLasang) {
    try {
      await queryDb(
        "INSERT INTO bw_branches (name, latitude, longitude, address, store_hours, contact_no, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ['Lasang', 14.5995, 120.984, 'Daang Maharlika Hwy, Bunawan, Davao City, Davao del Sur', '5:00 AM – 10:00 PM', '09935981766', 'Active']
      );
    } catch (e) {}
    const r = await queryDb("SELECT id, name FROM bw_branches WHERE name LIKE '%Lasang%' ORDER BY id DESC LIMIT 1");
    bLasang = r.rows[0];
  }

  const lasangId = parseInt(bLasang.id);
  console.log(`Sole Active Target Branch: Lasang (ID: ${lasangId})`);

  // Permanently remove Tibungco branch and all records/accounts belonging to other branches
  try {
    await queryDb("DELETE FROM bw_branches WHERE id != $1 OR LOWER(name) LIKE '%tibungco%'", [lasangId]);
    await queryDb("DELETE FROM bw_users WHERE (branch_id IS NOT NULL AND branch_id != $1) OR LOWER(email) IN ('roberto.gomez@bakewise.com', 'lorna.villanueva@bakewise.com', 'arnel.mendoza@bakewise.com', 'patricia.dizon@bakewise.com', 'kristine.ramos@bakewise.com')", [lasangId]);
    await queryDb("DELETE FROM bw_pos_transaction_items WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id != $1)", [lasangId]);
    await queryDb("DELETE FROM bw_pos_transactions WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_sales WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_inventory WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_production WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_waste WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_inventory_batches WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_inventory_movements WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_repurpose_logs WHERE branch_id != $1", [lasangId]);
    await queryDb("DELETE FROM bw_branch_products WHERE branch_id != $1", [lasangId]);
  } catch (e) {
    console.warn("Notice: Tibungco cleanup in seeder:", e.message);
  }

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

  async function seedRichInventory(lId) {
    console.log('Populating active consolidated inventory for Lasang...');
    await queryDb("DELETE FROM bw_inventory WHERE branch_id = $1", [lId]);

    const productIds = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang'];
    const invRows = [];

    for (const pId of productIds) {
      const p = PRODUCTS_MASTER[pId];
      const shelfDays = p.shelf_life || 3;
      const curProdDate = '2026-10-31';
      const dObj = new Date(`${curProdDate}T00:00:00Z`);
      const expObj = new Date(dObj.getTime() + shelfDays * 24 * 60 * 60 * 1000);
      const expMonth = String(expObj.getMonth() + 1).padStart(2, '0');
      const expDay = String(expObj.getDate()).padStart(2, '0');
      const curExpDate = `${expObj.getFullYear()}-${expMonth}-${expDay}`;
      const baseStock = (pId === 'p1' || pId === 'p_ube_lasang') ? 60 : (pId === 'p4' ? 15 : 40);
      const stockLevel = baseStock + ((pId.charCodeAt(pId.length - 1) * 7) % 15);

      invRows.push({
        product_id: pId,
        stock_level: stockLevel,
        production_date: curProdDate,
        expiry_date: curExpDate,
        branch_id: lId,
        batch_id: `BAT-B${lId}-${pId}-20261031`,
        unit: p.unit || 'pcs',
        status: 'In Stock'
      });
    }

    await batchInsert('bw_inventory', [
      'product_id', 'stock_level', 'production_date', 'expiry_date',
      'branch_id', 'batch_id', 'unit', 'status'
    ], invRows);

    console.log(`✓ Seeded ${invRows.length} active consolidated inventory records for Lasang.`);
  }

  // Check if Catalina Kato is already cashier and transactions fully populated
  const countRes = await queryDb(
    "SELECT COUNT(*) as count FROM bw_pos_transactions WHERE branch_id = $1 AND date >= '2026-10-14' AND date <= '2026-11-13' AND cashier = 'Catalina Kato'",
    [lasangId]
  );
  const currentCount = parseInt(countRes.rows[0]?.count || 0);
  console.log(`Current completed POS transactions with Cashier Catalina Kato: ${currentCount}`);

  if (!force && currentCount >= 7750) {
    console.log('✓ Target 7,750 Lasang sales with Cashier Catalina Kato are already fully populated. Ensuring inventory...');
    await seedRichInventory(lasangId);
    return { success: true, alreadyPopulated: true, totalTransactions: currentCount, branch: 'Lasang' };
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

  // Ensure staff accounts for Lasang (with Catalina Kato as Cashier in Sales Staff)
  const defaultHash = bcrypt.hashSync('password123', 10);
  const staffToEnsure = [
    { name: 'Elena Santos', email: 'elena.santos@bakewise.com', role: 'manager', branchId: lasangId },
    { name: 'Danilo Cruz', email: 'danilo.cruz@bakewise.com', role: 'inventory', branchId: lasangId },
    { name: 'Marco Reyes', email: 'marco.reyes@bakewise.com', role: 'production', branchId: lasangId },
    { name: 'Catalina Kato', email: 'catalina.kato@bakewise.com', role: 'sales', branchId: lasangId },
    { name: 'Catalina Kato', email: 'catalinekato@bakewise.com', role: 'sales', branchId: lasangId }
  ];

  for (const s of staffToEnsure) {
    try {
      await queryDb(
        "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), branch_id = VALUES(branch_id)",
        [s.email, defaultHash, s.name, s.role, s.branchId]
      );
    } catch (e) {
      try {
        await queryDb(
          "INSERT INTO bw_users (email, password, name, role, branch_id) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, branch_id = EXCLUDED.branch_id",
          [s.email, defaultHash, s.name, s.role, s.branchId]
        );
      } catch (e2) {}
    }
  }

  // Purge prior Lasang demo records for a clean consistent slate
  console.log('Purging prior Lasang records for fresh seeding with Cashier Catalina Kato...');
  try {
    await queryDb("DELETE FROM bw_pos_transaction_items WHERE transaction_id IN (SELECT id FROM bw_pos_transactions WHERE branch_id = $1)", [lasangId]);
  } catch (e) {}
  await queryDb("DELETE FROM bw_pos_transactions WHERE branch_id = $1", [lasangId]);
  await queryDb("DELETE FROM bw_sales WHERE branch_id = $1", [lasangId]);
  await queryDb("DELETE FROM bw_production WHERE branch_id = $1", [lasangId]);
  await queryDb("DELETE FROM bw_waste WHERE branch_id = $1", [lasangId]);
  try { await queryDb("DELETE FROM bw_inventory_batches WHERE branch_id = $1", [lasangId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_inventory_movements WHERE branch_id = $1", [lasangId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_repurpose_logs WHERE branch_id = $1", [lasangId]); } catch (e) {}
  try { await queryDb("DELETE FROM bw_branch_products WHERE branch_id = $1", [lasangId]); } catch (e) {}

  const branchConfig = {
    branchId: lasangId,
    branchName: 'Lasang',
    bakerName: 'Marco Reyes',
    cashierName: 'Catalina Kato',
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p8', 'p10', 'p_ube_lasang'],
    initialStock: { p1: 60, p2: 40, p3: 45, p4: 15, p5: 50, p6: 35, p8: 20, p10: 50, p_ube_lasang: 50 }
  };

  for (const pId of branchConfig.productIds) {
    const p = PRODUCTS_MASTER[pId];
    try {
      await queryDb(
        "INSERT INTO bw_branch_products (branch_id, product_id, custom_name, category, price, cost, shelf_life_days, unit, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        [lasangId, p.id, p.name, p.category, p.price, p.cost, p.shelf_life, p.unit, 'Active']
      );
    } catch (e) {}
  }

  // Initialize running stock
  const runningStock = { ...branchConfig.initialStock };

  // Set opening inventory in bw_inventory
  await queryDb("DELETE FROM bw_inventory WHERE branch_id = $1", [lasangId]);
  for (const pId of branchConfig.productIds) {
    const p = PRODUCTS_MASTER[pId];
    await queryDb(
      "INSERT INTO bw_inventory (product_id, stock_level, production_date, expiry_date, branch_id) VALUES ($1, $2, $3, $4, $5)",
      [pId, runningStock[pId], '2026-10-14', '2026-10-16', lasangId]
    );
  }

  console.log('Simulating 31 calendar days (250 sales/day for Lasang with Cashier Catalina Kato)...');

  // Loop through 31 days
  for (let dayIdx = 0; dayIdx < DATES.length; dayIdx++) {
    const { dateStr, isFuture } = DATES[dayIdx];
    const dateClean = dateStr.replace(/-/g, '');
    const curDateObj = new Date(`${dateStr}T00:00:00+08:00`);
    const dayOfWeek = curDateObj.getDay(); // 0: Sun, 6: Sat
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);

    const dayProdBatch = [];
    const dayBatchRows = [];
    const dayWasteBatch = [];
    const dayRepurposeBatch = [];
    const dayMovementsBatch = [];
    const dayTxBatch = [];
    const daySalesBatch = [];

    const branchTxs = [];
    const dayProductSoldQty = {};
    branchConfig.productIds.forEach(pId => { dayProductSoldQty[pId] = 0; });

    // Generate exactly 250 sales with Cashier: Catalina Kato
    for (let txSeq = 1; txSeq <= 250; txSeq++) {
      const rng = createRng((dayIdx + 1) * 100000 + lasangId * 1000 + txSeq);
      const cashier = 'Catalina Kato';

      // Transaction timestamp - distributed sequentially across store hours 05:15 to 20:45
      const minuteOffset = Math.floor(((txSeq - 1) / 250) * 930);
      const txTotalMinutes = 5 * 60 + 15 + minuteOffset;
      const hour = Math.floor(txTotalMinutes / 60);
      const minute = txTotalMinutes % 60;
      const second = Math.floor((txSeq * 19 + 7) % 60);

      const hourStr = String(hour).padStart(2, '0');
      const minStr = String(minute).padStart(2, '0');
      const secStr = String(second).padStart(2, '0');
      const timeStr = `${hourStr}:${minStr}:${secStr}`;
      const createdAt = `${dateStr} ${timeStr}`;

      const seqStr = String(txSeq).padStart(3, '0');
      const txNum = `POS-B${lasangId}-${dateClean}-${seqStr}`;

      // Pick 1 to 3 distinct products
      const numLines = Math.floor(rng() * 3) + 1;
      const pPool = [...branchConfig.productIds];
      const selectedItems = [];
      let subtotal = 0;

      for (let line = 0; line < numLines; line++) {
        if (pPool.length === 0) break;
        const pIndex = Math.floor(rng() * pPool.length);
        const pId = pPool.splice(pIndex, 1)[0];
        const p = PRODUCTS_MASTER[pId];

        // Quantity: cakes 1 box, breads/pastries 1-3
        let qty = 1;
        if (p.category !== 'Cakes') {
          qty = Math.floor(rng() * 3) + 1;
        }

        const lineTotal = Math.round(qty * p.price * 100) / 100;
        subtotal += lineTotal;
        selectedItems.push({
          product_id: p.id,
          qty: qty,
          price: p.price,
          name: p.name,
          category: p.category
        });

        dayProductSoldQty[pId] = (dayProductSoldQty[pId] || 0) + qty;
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const discount = 0.00;
      const total = subtotal;

      // Payment method
      const payRng = rng();
      let payMethod = 'Cash';
      let tender = total;
      let change = 0.00;
      if (payRng > 0.65) {
        payMethod = 'GCash';
        tender = total;
      } else if (payRng > 0.50) {
        payMethod = 'Credit Card';
        tender = total;
      } else {
        const roundBills = [20, 50, 100, 200, 500, 1000];
        const nextBill = roundBills.find(b => b >= total) || Math.ceil(total / 100) * 100;
        tender = nextBill;
        change = Math.round((tender - total) * 100) / 100;
      }

      const txRecord = {
        transaction_number: txNum,
        branch_id: lasangId,
        cashier: cashier,
        subtotal: subtotal,
        discount: discount,
        total: total,
        payment_amount: tender,
        change_amount: change,
        payment_method: payMethod,
        status: 'Completed',
        date: dateStr,
        created_at: createdAt,
        items: selectedItems
      };

      branchTxs.push(txRecord);
      dayTxBatch.push(txRecord);
    }

    // Morning Production: 05:45 AM
    for (const pId of branchConfig.productIds) {
      const p = PRODUCTS_MASTER[pId];
      const soldEst = dayProductSoldQty[pId] || 15;
      const buffer = isWeekend ? 20 : 10;
      const bakeQty = Math.max(15, soldEst + buffer);

      const prodCode = `PRD-B${lasangId}-${pId}-${dateClean}`;
      dayProdBatch.push({
        product_id: pId,
        planned: bakeQty,
        actual: bakeQty,
        date: dateStr,
        baker: branchConfig.bakerName,
        status: 'Completed',
        code: prodCode,
        branch_id: lasangId,
        created_at: `${dateStr} 05:45:00`
      });

      const batchNum = `BAT-B${lasangId}-${pId}-${dateClean}`;
      const dObj = new Date(`${dateStr}T00:00:00Z`);
      const expObj = new Date(dObj.getTime() + (p.shelf_life || 2) * 24 * 60 * 60 * 1000);
      const expMonth = String(expObj.getMonth() + 1).padStart(2, '0');
      const expDay = String(expObj.getDate()).padStart(2, '0');
      const expStr = `${expObj.getFullYear()}-${expMonth}-${expDay}`;

      dayBatchRows.push({
        batch_number: batchNum,
        product_id: pId,
        branch_id: lasangId,
        quantity_produced: bakeQty,
        quantity_remaining: Math.max(0, bakeQty - (dayProductSoldQty[pId] || 0)),
        production_date: dateStr,
        expiry_date: expStr,
        production_time: '05:45:00',
        expiry_time: '18:00:00',
        freshness_degradation: 0,
        status: 'Fresh',
        food_safety_status: 'Safe',
        created_at: `${dateStr} 05:45:00`
      });

      runningStock[pId] += bakeQty;
    }

    // Deduct sold items
    for (const tx of branchTxs) {
      for (const item of tx.items) {
        runningStock[item.product_id] -= item.qty;
        daySalesBatch.push({
          product_id: item.product_id,
          qty: item.qty,
          price: item.price,
          date: dateStr,
          cashier: tx.cashier,
          branch_id: lasangId,
          created_at: tx.created_at
        });
      }
    }

    // Waste scrap on select days
    if (dayIdx % 5 === 2) {
      const wastePid = 'p1';
      const wasteQty = 2;
      const unitCost = PRODUCTS_MASTER[wastePid].cost;
      runningStock[wastePid] -= wasteQty;

      dayWasteBatch.push({
        product_id: wastePid,
        qty: wasteQty,
        cost: unitCost,
        reason: 'Overbaked Batch Trimming / Display Scrap',
        date: dateStr,
        branch_id: lasangId,
        created_at: `${dateStr} 16:30:00`
      });
    }

    // Repurpose on Day 6 & Day 18
    if (dayIdx === 6 || dayIdx === 18) {
      const repurposeQty = 8;
      runningStock['p1'] -= repurposeQty;

      dayRepurposeBatch.push({
        batch_id: `BAT-B${lasangId}-p1-${dateClean}`,
        product_id: 'p1',
        product_name: 'Pandesal',
        quantity: repurposeQty,
        target_recipe: 'Bread Crumbs',
        branch_id: lasangId,
        timestamp: `${dateStr} 17:00:00`
      });
    }

    // Stock Movements
    for (const pId of branchConfig.productIds) {
      dayMovementsBatch.push({
        product_id: pId,
        branch_id: lasangId,
        quantity: dayProductSoldQty[pId] || 10,
        movement_type: 'Out - Sale',
        notes: `Consolidated daily POS sales for ${dateStr} (Cashier: Catalina Kato)`,
        created_at: `${dateStr} 20:50:00`
      });
    }

    // Insert batches for current day
    await batchInsert('bw_production', ['product_id', 'planned', 'actual', 'date', 'baker', 'status', 'code', 'branch_id', 'created_at'], dayProdBatch);
    try {
      await batchInsert('bw_inventory_movements', ['product_id', 'branch_id', 'quantity', 'movement_type', 'notes', 'created_at'], dayMovementsBatch);
    } catch (e) {}
    try {
      await batchInsert('bw_inventory_batches', [
        'batch_number', 'product_id', 'branch_id', 'quantity_produced', 'quantity_remaining',
        'production_date', 'expiry_date', 'production_time', 'expiry_time', 'freshness_degradation', 'status', 'food_safety_status', 'created_at'
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

    // Insert 250 POS Transactions
    await batchInsert('bw_pos_transactions', [
      'transaction_number', 'branch_id', 'cashier', 'subtotal', 'discount', 'total',
      'payment_amount', 'change_amount', 'payment_method', 'status', 'date', 'created_at'
    ], dayTxBatch);

    // Fetch inserted IDs to link items
    const insertedTxsRes = await queryDb(
      "SELECT id, transaction_number FROM bw_pos_transactions WHERE date = $1 AND branch_id = $2",
      [dateStr, lasangId]
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
      console.log(`[Day ${dayIdx + 1}/31] Seeded 250 POS sales for ${dateStr} with Cashier Catalina Kato (Total: ${(dayIdx + 1) * 250})`);
    }
  }

  // Seed rich multi-batch inventory across dates
  await seedRichInventory(lasangId);

  console.log('🎉 AUTO-SEEDER COMPLETED SUCCESSFULLY: 7,750 completed transactions generated for Lasang with Cashier Catalina Kato!');
  return { success: true, totalTransactions: 7750, dateRange: '2026-10-14 to 2026-11-13', branch: 'Lasang', cashier: 'Catalina Kato' };
}

module.exports = { runAutoSeeder, SEED_IDENTIFIER };
