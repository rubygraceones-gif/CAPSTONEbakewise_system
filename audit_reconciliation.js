const https = require('https');

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    https.get('https://capstone-bakewise-system-production.up.railway.app' + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: e.message, raw: data.substring(0, 200) }); }
      });
    }).on('error', reject);
  });
}

async function runReconciliation() {
  const [products, inventory, sales, production, waste, movements] = await Promise.all([
    fetchJson('/api/products'),
    fetchJson('/api/inventory?branch_id=212'),
    fetchJson('/api/sales?branch_id=212'),
    fetchJson('/api/production?branch_id=212'),
    fetchJson('/api/waste?branch_id=212'),
    fetchJson('/api/inventory/movements?branch_id=212')
  ]);

  console.log("=== HISTORICAL AUDIT & RECONCILIATION: OCT 14 - NOV 13, 2026 ===");
  console.log(`Products: ${products.length}, Current Batches: ${inventory.length}`);
  console.log(`Sales Items: ${sales.length}, Production Runs: ${production.length}, Waste Entries: ${waste.length}`);

  const prodSummary = {};
  products.forEach(p => {
    prodSummary[p.id] = {
      id: p.id,
      name: p.name,
      category: p.category,
      unit: p.unit || 'pcs',
      price: p.price,
      cost: p.cost,
      posSoldQty: 0,
      posRevenue: 0,
      productionOutput: 0,
      wasteQty: 0,
      wasteCost: 0,
      currentInventory: 0
    };
  });

  // 1. Sales
  sales.forEach(s => {
    const pid = s.productId || s.product_id;
    const item = prodSummary[pid] || prodSummary[`p${pid}`] || Object.values(prodSummary).find(x => x.name.toLowerCase() === (s.product_name || '').toLowerCase());
    if (item) {
      const q = parseInt(s.qty) || 0;
      item.posSoldQty += q;
      item.posRevenue += (q * parseFloat(s.price || item.price || 0));
    }
  });

  // 2. Production
  production.forEach(pr => {
    const pid = pr.productId || pr.product_id;
    const item = prodSummary[pid] || prodSummary[`p${pid}`];
    if (item) {
      item.productionOutput += (parseInt(pr.actual) || parseInt(pr.planned) || 0);
    }
  });

  // 3. Waste
  waste.forEach(w => {
    const pid = w.productId || w.product_id;
    const item = prodSummary[pid] || prodSummary[`p${pid}`];
    if (item) {
      const q = parseInt(w.qty) || 0;
      item.wasteQty += q;
      item.wasteCost += (q * parseFloat(w.cost || item.cost || 0));
    }
  });

  // 4. Current Usable Inventory Stock
  inventory.forEach(inv => {
    const pid = inv.productId || inv.product_id;
    const item = prodSummary[pid] || prodSummary[`p${pid}`];
    if (item) {
      item.currentInventory += (parseInt(inv.stock_level) || parseInt(inv.stockLevel) || 0);
    }
  });

  console.log("\nPRODUCT RECONCILIATION SUMMARY (Lasang Branch):");
  console.table(Object.values(prodSummary).map(p => ({
    Product: p.name,
    Category: p.category,
    Unit: p.unit,
    "Sold Qty": p.posSoldQty,
    "Gross Sales (PHP)": p.posRevenue.toFixed(2),
    "Prod Output": p.productionOutput,
    "Waste Qty": p.wasteQty,
    "Ending Stock": p.currentInventory
  })));

  const grandTotalSales = Object.values(prodSummary).reduce((s, p) => s + p.posRevenue, 0);
  const grandTotalUnitsSold = Object.values(prodSummary).reduce((s, p) => s + p.posSoldQty, 0);
  const grandTotalWasteCost = Object.values(prodSummary).reduce((s, p) => s + p.wasteCost, 0);
  const grandTotalEndingStock = Object.values(prodSummary).reduce((s, p) => s + p.currentInventory, 0);

  console.log("\n=== NETWORK TOTALS ===");
  console.log(`Grand Total Sales: PHP ${grandTotalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Grand Total Units Sold: ${grandTotalUnitsSold} units`);
  console.log(`Grand Total Waste Cost: PHP ${grandTotalWasteCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Current Available Ending Stock: ${grandTotalEndingStock} units across active Lasang batches`);
}

runReconciliation().catch(console.error);

