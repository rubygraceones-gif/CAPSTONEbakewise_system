/**
 * BAKEWISE POS & SALES MANAGEMENT MODULE E2E TEST SUITE
 * 
 * Comprehensive automated verification for:
 * 1. Product Catalog & Category Queries
 * 2. Multi-Branch Inventory & Strict Isolation
 * 3. Checkout Pre-conditions & Error Messages
 * 4. Atomic Transaction Processing & Receipt Generation
 * 5. Branch Stock Deductions & Cross-Branch Protection
 * 6. Sales History Tracking, Filtering & Details Retrieval
 * 7. Transaction Voiding & Automatic Stock Restoration
 */

const { Pool } = require('pg');
const http = require('http');

const PG_URL = "postgresql://postgres.ewgebrbrgftbsljjgkwr:BakeWise2026!Secure@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
const pool = new Pool({ connectionString: PG_URL });

const TEST_PORT = 3099;
process.env.PORT = TEST_PORT;

let serverProcess = null;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("=================================================================");
  console.log("  BAKEWISE POS & SALES MANAGEMENT MODULE - COMPREHENSIVE E2E TEST");
  console.log("=================================================================\n");

  try {
    // 0. Start Server
    console.log("[STEP 0] Starting BakeWise Server on port " + TEST_PORT + "...");
    const { server } = require('../backend/server.js');
    serverProcess = server;
    console.log("  ✓ Test server listening on http://127.0.0.1:" + TEST_PORT + "\n");

    // Wait 1.5s for DB connection pool to settle
    await new Promise(r => setTimeout(r, 1500));

    // TEST 1: Database Baseline Verification
    console.log("[TEST 1] Verifying Database Baseline (Branches, Products, Inventory)...");
    const branches = await pool.query("SELECT id, name FROM bw_branches ORDER BY id ASC");
    assert(branches.rows.length >= 3, `Expected at least 3 branches, found ${branches.rows.length}`);
    const mainBranch = branches.rows.find(b => b.name === 'Main Branch');
    const lasangBranch = branches.rows.find(b => b.name === 'Lasang');
    const kibungsodBranch = branches.rows.find(b => b.name === 'Kibungsod');
    assert(mainBranch != null, "Main Branch must exist in bw_branches");
    assert(lasangBranch != null, "Lasang Branch must exist in bw_branches");
    assert(kibungsodBranch != null, "Kibungsod Branch must exist in bw_branches");

    const mainId = mainBranch.id;
    const lasangId = lasangBranch.id;
    const kibungsodId = kibungsodBranch.id;

    // Reset baseline stock for Pandesal (p1) to prompt specs:
    // Main Branch = 30, Lasang = 50, Kibungsod = 20
    await pool.query("UPDATE bw_inventory SET stock_level = 30 WHERE (product_id = 'p1' OR product_id = '1') AND branch_id = $1", [mainId]);
    await pool.query("UPDATE bw_inventory SET stock_level = 50 WHERE (product_id = 'p1' OR product_id = '1') AND branch_id = $1", [lasangId]);
    await pool.query("UPDATE bw_inventory SET stock_level = 20 WHERE (product_id = 'p1' OR product_id = '1') AND branch_id = $1", [kibungsodId]);

    // Ensure Muffin (p10) baseline is 40 at Main Branch
    await pool.query("UPDATE bw_inventory SET stock_level = 40 WHERE (product_id = 'p10' OR product_id = '10') AND branch_id = $1", [mainId]);

    const stockCheck = await pool.query(
      "SELECT branch_id, stock_level FROM bw_inventory WHERE (product_id = 'p1' OR product_id = '1') AND branch_id IN ($1, $2, $3) ORDER BY branch_id",
      [mainId, lasangId, kibungsodId]
    );
    const mainPandesalStock = parseInt(stockCheck.rows.find(r => r.branch_id === mainId).stock_level);
    const lasangPandesalStock = parseInt(stockCheck.rows.find(r => r.branch_id === lasangId).stock_level);
    const kibungsodPandesalStock = parseInt(stockCheck.rows.find(r => r.branch_id === kibungsodId).stock_level);

    assert(mainPandesalStock === 30, `Main Branch Pandesal stock must be 30, got ${mainPandesalStock}`);
    assert(lasangPandesalStock === 50, `Lasang Branch Pandesal stock must be 50, got ${lasangPandesalStock}`);
    assert(kibungsodPandesalStock === 20, `Kibungsod Branch Pandesal stock must be 20, got ${kibungsodPandesalStock}`);
    console.log("  ✓ Baseline verified: Main=30, Lasang=50, Kibungsod=20\n");

    // TEST 2: Product Catalog & Batch Sync API
    console.log("[TEST 2] Verifying /api/sync and Product List...");
    const syncRes = await makeRequest('GET', '/api/sync');
    assert(syncRes.status === 200, `/api/sync returned status ${syncRes.status}`);
    assert(Array.isArray(syncRes.data.products), "Expected products array from /api/sync");
    const pandesalProduct = syncRes.data.products.find(p => p.id === 'p1' || p.id === '1' || p.name.toLowerCase().includes('pandesal'));
    assert(pandesalProduct != null, "Pandesal product must be listed in products catalog");
    assert(parseFloat(pandesalProduct.price) > 0, `Pandesal price must be positive, got ${pandesalProduct.price}`);
    console.log(`  ✓ Product ${pandesalProduct.name} (₱${parseFloat(pandesalProduct.price).toFixed(2)}) is active\n`);

    // TEST 3: Pre-Checkout Validation & Error Handling
    console.log("[TEST 3] Testing Checkout Validation Rules & Error Messages...");

    // Test 3A: Empty cart
    const emptyRes = await makeRequest('POST', '/api/pos/checkout', {
      branch_id: mainId,
      items: []
    });
    assert(emptyRes.status === 400, "Empty cart should return HTTP 400");
    assert(emptyRes.data.error.includes("add products"), "Empty cart error should be descriptive: " + emptyRes.data.error);

    // Test 3B: Non-existent branch
    const badBranchRes = await makeRequest('POST', '/api/pos/checkout', {
      branch_id: 999999,
      items: [{ product_id: 'p1', product_name: 'Pandesal', quantity: 1, unit_price: 45, subtotal: 45 }]
    });
    assert(badBranchRes.status === 400, "Invalid branch should return HTTP 400");
    assert(badBranchRes.data.error.includes("branch does not exist"), "Invalid branch error should be descriptive: " + badBranchRes.data.error);

    // Test 3C: Insufficient payment
    const underpayRes = await makeRequest('POST', '/api/pos/checkout', {
      branch_id: mainId,
      subtotal: 225,
      discount: 0,
      total: 225,
      payment_amount: 100, // Short payment
      payment_method: 'Cash',
      items: [{ product_id: 'p1', product_name: 'Pandesal', quantity: 5, unit_price: 45, subtotal: 225 }]
    });
    assert(underpayRes.status === 400, "Insufficient cash tendered should return HTTP 400");
    assert(underpayRes.data.error.includes("insufficient"), "Insufficient payment error should be descriptive: " + underpayRes.data.error);

    // Test 3D: Insufficient stock (Overselling prevention)
    const overStockRes = await makeRequest('POST', '/api/pos/checkout', {
      branch_id: mainId,
      subtotal: 45000,
      discount: 0,
      total: 45000,
      payment_amount: 45000,
      payment_method: 'Cash',
      items: [{ product_id: 'p1', product_name: 'Pandesal', quantity: 999, unit_price: 45, subtotal: 45000 }]
    });
    assert(overStockRes.status === 400, "Overselling stock should return HTTP 400");
    assert(overStockRes.data.error.includes("Insufficient stock"), "Over-stock error should state 'Insufficient stock': " + overStockRes.data.error);
    console.log("  ✓ All validation rules correctly returned HTTP 400 with descriptive error messages\n");

    // TEST 4: Successful POS Transaction Execution (Core Checkout Flow)
    console.log("[TEST 4] Processing Valid POS Checkout at Main Branch...");
    // Buying 5 Pandesal (₱45 each = ₱225) + 2 Muffins (₱12 each = ₱24)
    // Subtotal = ₱249, Discount = ₱20, Total = ₱229
    // Tendered = ₱500, Expected Change = ₱271
    const checkoutPayload = {
      branch_id: mainId,
      cashier_name: "Maria Santos",
      subtotal: 249.00,
      discount: 20.00,
      total: 229.00,
      payment_amount: 500.00,
      change_amount: 271.00,
      payment_method: "Cash",
      items: [
        { product_id: 'p1', product_name: 'Pandesal', quantity: 5, unit_price: 45.00, subtotal: 225.00 },
        { product_id: 'p10', product_name: 'Muffin', quantity: 2, unit_price: 12.00, subtotal: 24.00 }
      ]
    };

    const checkoutRes = await makeRequest('POST', '/api/pos/checkout', checkoutPayload);
    assert(checkoutRes.status === 201, `Expected HTTP 201 Created, got ${checkoutRes.status}`);
    assert(checkoutRes.data.success === true, "Response success flag must be true");
    assert(checkoutRes.data.transaction != null, "Response must include created transaction object");

    const createdTx = checkoutRes.data.transaction;
    assert(createdTx.transaction_number && createdTx.transaction_number.startsWith("POS-"), 
      `Valid transaction number generated: ${createdTx.transaction_number}`);
    assert(parseInt(createdTx.branch_id) === mainId, `Branch ID must match Main Branch (${mainId})`);
    assert(createdTx.cashier === "Maria Santos", `Cashier name recorded correctly: ${createdTx.cashier}`);
    assert(parseFloat(createdTx.total) === 229.00, `Total recorded as ₱229.00, got ${createdTx.total}`);
    assert(parseFloat(createdTx.payment_amount) === 500.00, `Payment recorded as ₱500.00, got ${createdTx.payment_amount}`);
    assert(parseFloat(createdTx.change_amount) === 271.00, `Change recorded as ₱271.00, got ${createdTx.change_amount}`);
    assert(Array.isArray(createdTx.items) && createdTx.items.length === 2, "Transaction must return 2 line items");
    console.log(`  ✓ POS Checkout succeeded with receipt #${createdTx.transaction_number}\n`);

    // TEST 5: Strict Branch Inventory Isolation
    console.log("[TEST 5] Verifying Strict Branch Inventory Isolation in Database...");
    const postStock = await pool.query(
      "SELECT branch_id, product_id, stock_level FROM bw_inventory WHERE (product_id IN ('p1', 'p10', '1', '10')) AND branch_id IN ($1, $2, $3) ORDER BY branch_id, product_id",
      [mainId, lasangId, kibungsodId]
    );

    const mainPandesalPost = parseInt(postStock.rows.find(r => r.branch_id === mainId && (r.product_id === 'p1' || r.product_id === '1')).stock_level);
    const mainMuffinPost = parseInt(postStock.rows.find(r => r.branch_id === mainId && (r.product_id === 'p10' || r.product_id === '10')).stock_level);
    const lasangPandesalPost = parseInt(postStock.rows.find(r => r.branch_id === lasangId && (r.product_id === 'p1' || r.product_id === '1')).stock_level);
    const kibungsodPandesalPost = parseInt(postStock.rows.find(r => r.branch_id === kibungsodId && (r.product_id === 'p1' || r.product_id === '1')).stock_level);

    assert(mainPandesalPost === 25, `Main Branch Pandesal must be decremented from 30 to 25 (got ${mainPandesalPost})`);
    assert(mainMuffinPost === 38, `Main Branch Muffin must be decremented from 40 to 38 (got ${mainMuffinPost})`);
    assert(lasangPandesalPost === 50, `Lasang Pandesal MUST REMAIN 50 (no cross-branch leakage, got ${lasangPandesalPost})`);
    assert(kibungsodPandesalPost === 20, `Kibungsod Pandesal MUST REMAIN 20 (no cross-branch leakage, got ${kibungsodPandesalPost})`);
    console.log("  ✓ Strict Branch Isolation verified: Main stock deducted (30->25, 40->38); Lasang (50) and Kibungsod (20) completely untouched!\n");

    // TEST 6: Sales History & Reprint API
    console.log("[TEST 6] Testing Sales History, Branch Filtering, & Transaction Details...");
    const historyMain = await makeRequest('GET', `/api/pos/transactions?branch_id=${mainId}`);
    assert(historyMain.status === 200, "Fetching history for Main Branch should return HTTP 200");
    const foundInMain = (historyMain.data || []).find(tx => tx.transaction_number === createdTx.transaction_number);
    assert(foundInMain != null, "Completed transaction must be listed in Main Branch sales history");
    assert(foundInMain.items && foundInMain.items.length === 2, "History item must include itemized products");

    // Check isolation in Lasang history: The Main Branch sale must NOT show in Lasang history
    const historyLasang = await makeRequest('GET', `/api/pos/transactions?branch_id=${lasangId}`);
    const foundInLasang = (historyLasang.data || []).find(tx => tx.transaction_number === createdTx.transaction_number);
    assert(foundInLasang == null, "Main Branch sale must NOT appear in Lasang branch sales history");

    // Fetch individual transaction details
    const txDetailsRes = await makeRequest('GET', `/api/pos/transactions/${createdTx.id}`);
    assert(txDetailsRes.status === 200, "Fetching transaction details should return HTTP 200");
    assert(txDetailsRes.data.transaction_number === createdTx.transaction_number, "Transaction details ID must match");
    assert(parseFloat(txDetailsRes.data.total) === 229.00, "Details total must be ₱229.00");
    console.log("  ✓ Sales history and receipt reprint endpoints confirmed working\n");

    // TEST 7: Voiding Transaction & Automatic Inventory Restoration
    console.log("[TEST 7] Testing Transaction Void & Inventory Restoration...");
    const voidRes = await makeRequest('POST', `/api/pos/void/${createdTx.id}`, {
      voided_by: "Admin Maria"
    });
    assert(voidRes.status === 200, `Voiding transaction should return HTTP 200, got ${voidRes.status}`);
    assert(voidRes.data.success === true, "Void response success must be true");

    // Verify inventory restored back to original levels in Main Branch
    const restoredStock = await pool.query(
      "SELECT branch_id, product_id, stock_level FROM bw_inventory WHERE (product_id IN ('p1', 'p10', '1', '10')) AND branch_id = $1 ORDER BY product_id",
      [mainId]
    );
    const mainPandesalRestored = parseInt(restoredStock.rows.find(r => r.product_id === 'p1' || r.product_id === '1').stock_level);
    const mainMuffinRestored = parseInt(restoredStock.rows.find(r => r.product_id === 'p10' || r.product_id === '10').stock_level);

    assert(mainPandesalRestored === 30, `Main Branch Pandesal must be restored back from 25 to 30 (got ${mainPandesalRestored})`);
    assert(mainMuffinRestored === 40, `Main Branch Muffin must be restored back from 38 to 40 (got ${mainMuffinRestored})`);

    // Verify transaction status is now 'Voided'
    const voidedTxCheck = await pool.query("SELECT status FROM bw_pos_transactions WHERE id = $1", [createdTx.id]);
    assert(voidedTxCheck.rows[0].status === 'Voided', "Transaction status must be updated to 'Voided'");
    console.log("  ✓ Transaction voided successfully: status='Voided' and inventory fully restored (25->30, 38->40)\n");

    console.log("=================================================================");
    console.log("  🎉 ALL 7 TEST SUITES PASSED! POS MODULE FULLY AUDITED & VERIFIED");
    console.log("=================================================================");

  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED WITH ERROR:", error);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      serverProcess.close();
    }
    await pool.end();
  }
}

runTests();
