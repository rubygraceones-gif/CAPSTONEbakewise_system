const puppeteer = require('puppeteer-core');
const path = require('path');
const { spawn } = require('child_process');

const TEST_PORT = 3288;

async function run() {
  console.log('=================================================================');
  console.log('  BAKEWISE POS AUTOMATIC PRODUCT ADDITION & CHECKOUT AUDIT TEST  ');
  console.log('=================================================================\n');

  // 1. Start BakeWise backend server on TEST_PORT
  console.log(`[SETUP] Starting BakeWise Server on port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['backend/server.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  serverProc.stdout.on('data', d => {
    const s = d.toString();
    if (s.includes('listening on')) console.log('  [SERVER]', s.trim());
  });

  serverProc.stderr.on('data', d => {
    const s = d.toString().trim();
    if (s && !s.includes('notice')) console.error('  [SERVER ERR]', s);
  });

  await new Promise(resolve => setTimeout(resolve, 4000));

  // Launch browser
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  page.on('console', msg => {
    const t = msg.text();
    if (t.includes('Error') || t.includes('warning') || t.includes('CHECKOUT')) {
      console.log('  [BROWSER CONSOLE]', t);
    }
  });

  await page.goto(`http://localhost:${TEST_PORT}/index.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#app-sidebar', { timeout: 15000 });

  // Authenticate as Admin & Navigate to POS (pane-sales)
  await page.evaluate(async () => {
    try {
      await window.store.login('admin@bakewise.com', 'password123');
      await window.store.syncWithBackend();
    } catch(e) {
      console.error("Login failed:", e);
    }
    window.navigateToPane('pane-sales');
    if (typeof window.renderPosProducts === 'function') window.renderPosProducts();
    if (typeof window.updatePosCartUI === 'function') window.updatePosCartUI();
  });

  await new Promise(r => setTimeout(r, 1200));

  // Verify product cards are displayed
  const cardsCount = await page.evaluate(() => {
    return document.querySelectorAll('.pos-product-card').length;
  });
  const cardNamesInDom = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.pos-product-card')).map(c => c.textContent.replace(/\s+/g, ' ').trim());
  });
  console.log(`  Found ${cardsCount} product cards loaded in POS:`, cardNamesInDom);

  // Helper to get fresh bounding box for any product card
  const getCardBox = async (productKeyword) => {
    return page.evaluate((kw) => {
      const card = Array.from(document.querySelectorAll('.pos-product-card')).find(c => c.textContent.includes(kw));
      if (!card) return null;
      card.scrollIntoView({ block: 'center', behavior: 'instant' });
      const rect = card.getBoundingClientRect();
      return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
    }, productKeyword);
  };

  // Helper to read current cart state
  const getCartState = async () => {
    return page.evaluate(() => {
      const cart = (window.getPosCart ? window.getPosCart() : window.posCart) || [];
      return {
        text: document.getElementById('pos-cart-count')?.textContent || '',
        itemsCount: cart.length,
        totalQty: cart.reduce((s, i) => s + i.qty, 0),
        items: cart
      };
    });
  };

  // --- ACCEPTANCE TEST 1: Hover over Muffin without clicking ---
  console.log('\n[TEST 1] Moving cursor over Muffin without clicking...');
  let muffinBox = await getCardBox('Muffin');
  if (!muffinBox) {
    throw new Error('Muffin card not found in POS product grid!');
  }

  // Move mouse over Muffin
  await page.mouse.move(muffinBox.x + muffinBox.width / 2, muffinBox.y + muffinBox.height / 2);
  await new Promise(r => setTimeout(r, 400));
  // Jiggle mouse over Muffin
  await page.mouse.move(muffinBox.x + muffinBox.width / 3, muffinBox.y + muffinBox.height / 3);
  await new Promise(r => setTimeout(r, 400));

  let cartState = await getCartState();
  console.log(`  Cart Count: "${cartState.text}", Total Qty: ${cartState.totalQty}`);
  if (cartState.totalQty !== 0) {
    throw new Error(`TEST 1 FAILED: Hovering over Muffin added products to cart! Qty: ${cartState.totalQty}`);
  }
  console.log('  ✓ TEST 1 PASSED: Moving cursor over Muffin did NOT change cart quantity (0 items).');

  // --- ACCEPTANCE TEST 2: Move cursor over Pandesal, Ensaymada, Bread, Cake ---
  console.log('\n[TEST 2] Moving cursor across Pandesal, Ensaymada, Bread, and Cake...');
  const cardNames = ['Pandesal', 'Ensaymada', 'Bread', 'Cake'];
  for (const name of cardNames) {
    const box = await getCardBox(name);
    if (box) {
      console.log(`  Moving over ${name}...`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise(r => setTimeout(r, 200));
    }
  }

  cartState = await getCartState();
  console.log(`  Cart Count: "${cartState.text}", Total Qty: ${cartState.totalQty}`);
  if (cartState.totalQty !== 0) {
    throw new Error(`TEST 2 FAILED: Moving across cards added products to cart! Qty: ${cartState.totalQty}`);
  }
  console.log('  ✓ TEST 2 PASSED: Moving across Pandesal, Ensaymada, Bread, Cake did NOT change cart quantity (0 items).');

  // --- ACCEPTANCE TEST 3: Click Muffin once ---
  console.log('\n[TEST 3] Clicking Muffin once...');
  muffinBox = await getCardBox('Muffin');
  await page.mouse.click(muffinBox.x + muffinBox.width / 2, muffinBox.y + muffinBox.height / 2);
  await new Promise(r => setTimeout(r, 400));

  cartState = await getCartState();
  console.log(`  Cart Count: "${cartState.text}", Items:`, cartState.items);
  if (cartState.totalQty !== 1 || cartState.items[0]?.name !== 'Muffin') {
    throw new Error(`TEST 3 FAILED: Expected exactly 1 Muffin in cart, got: ${JSON.stringify(cartState)}`);
  }
  console.log('  ✓ TEST 3 PASSED: Clicking Muffin once increased cart quantity by exactly ONE (1 item, qty: 1).');

  // --- ACCEPTANCE TEST 4: Click Muffin again ---
  console.log('\n[TEST 4] Clicking Muffin a second time...');
  muffinBox = await getCardBox('Muffin');
  await page.mouse.click(muffinBox.x + muffinBox.width / 2, muffinBox.y + muffinBox.height / 2);
  await new Promise(r => setTimeout(r, 400));

  cartState = await getCartState();
  console.log(`  Cart Count: "${cartState.text}", Items:`, cartState.items);
  if (cartState.totalQty !== 2 || cartState.items[0]?.qty !== 2) {
    throw new Error(`TEST 4 FAILED: Expected exactly 2 Muffins in cart, got: ${JSON.stringify(cartState)}`);
  }
  console.log('  ✓ TEST 4 PASSED: Clicking Muffin again increased cart quantity by exactly ONE more (qty: 2).');

  // Check subtotal and total
  const summary = await page.evaluate(() => {
    return {
      subtotal: document.getElementById('pos-summary-subtotal')?.textContent || '',
      total: document.getElementById('pos-summary-total')?.textContent || '',
      checkoutText: document.getElementById('btn-pos-checkout-text')?.textContent || ''
    };
  });
  console.log('  Cart summary:', summary);

  // --- ACCEPTANCE TEST 5 & 6: Complete checkout & verify sales history + inventory ---
  console.log('\n[TEST 5 & 6] Performing checkout and verifying no "unit" error and correct inventory/sales deduction...');
  
  // Enter cash tendered
  await page.evaluate(() => {
    const input = document.getElementById('pos-tendered-input');
    if (input) {
      input.value = '100.00';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  // Check initial stock from backend before checkout
  const initialInvRes = await fetch(`http://localhost:${TEST_PORT}/api/inventory?branch_id=2`);
  const initialInv = await initialInvRes.json();
  const initialMuffin = initialInv.find(i => String(i.product_id).includes('10') || i.product_name === 'Muffin');
  const initialMuffinStock = initialMuffin ? parseInt(initialMuffin.stock_level) : 0;
  console.log(`  Initial Muffin stock at Branch 2: ${initialMuffinStock}`);

  // Click Checkout Button
  const checkoutBtn = await page.$('#btn-pos-checkout');
  await checkoutBtn.click();
  await new Promise(r => setTimeout(r, 2000));

  // Check for any toast or errors
  const toasts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.toast, .notification-toast')).map(el => el.textContent.trim());
  });
  console.log('  Browser toasts during checkout:', toasts);

  const hasUnitError = toasts.some(t => t.toLowerCase().includes('unknown column') && t.toLowerCase().includes('unit'));
  if (hasUnitError) {
    throw new Error('TEST 5 FAILED: Checkout resulted in Unknown column "unit" error!');
  }

  // Check if receipt modal opened or cart cleared
  const checkoutResult = await page.evaluate(() => {
    const modal = document.getElementById('pos-receipt-modal');
    const cart = (window.getPosCart ? window.getPosCart() : window.posCart) || [];
    return {
      receiptVisible: modal && modal.style.display !== 'none',
      cartQty: cart.length
    };
  });
  console.log('  Checkout Result:', checkoutResult);

  // Check sales history from backend
  const historyRes = await fetch(`http://localhost:${TEST_PORT}/api/pos/transactions?branch_id=2`);
  const history = await historyRes.json();
  const latestTx = history[0];
  console.log('  Latest POS Transaction from backend:', latestTx ? {
    txNumber: latestTx.transaction_number,
    branch_id: latestTx.branch_id,
    total: latestTx.total,
    status: latestTx.status,
    itemsCount: latestTx.items ? latestTx.items.length : 0
  } : 'NONE');

  if (!latestTx || latestTx.status !== 'Completed') {
    throw new Error('TEST 5 & 6 FAILED: POS Transaction was not recorded as Completed in backend!');
  }
  console.log('  ✓ TEST 5 PASSED: Checkout completed successfully without any "unit" column error!');

  // Check inventory deduction
  const afterInvRes = await fetch(`http://localhost:${TEST_PORT}/api/inventory?branch_id=2`);
  const afterInv = await afterInvRes.json();
  const afterMuffin = afterInv.find(i => String(i.product_id).includes('10') || i.product_name === 'Muffin');
  const afterMuffinStock = afterMuffin ? parseInt(afterMuffin.stock_level) : 0;
  console.log(`  Muffin stock after checkout: ${afterMuffinStock} (decreased by ${initialMuffinStock - afterMuffinStock})`);

  if (afterMuffinStock !== initialMuffinStock - 2) {
    throw new Error(`TEST 6 FAILED: Expected stock deduction of 2, but initial=${initialMuffinStock}, after=${afterMuffinStock}`);
  }
  console.log('  ✓ TEST 6 PASSED: Branch inventory accurately decremented by 2, and sales record successfully persisted!');

  console.log('\n=================================================================');
  console.log('  🎉 ALL 6 ACCEPTANCE TESTS PASSED WITH ZERO REGRESSIONS!');
  console.log('=================================================================\n');

  await browser.close();
  serverProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ ACCEPTANCE TEST FAILED:', err);
  process.exit(1);
});
