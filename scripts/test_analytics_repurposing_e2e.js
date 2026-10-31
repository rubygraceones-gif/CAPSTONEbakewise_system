const puppeteer = require('puppeteer-core');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const TEST_PORT = 3295;

function makeRequest(method, endpoint, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: 'localhost',
      port: TEST_PORT,
      path: endpoint,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {})
      }
    }, res => {
      let resData = '';
      res.on('data', chunk => resData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(resData) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: resData });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('========================================================================');
  console.log('  BAKEWISE DEMAND FORECASTING, OPTIMIZATION & REPURPOSING E2E AUDIT    ');
  console.log('========================================================================\n');

  // 1. Start Server
  console.log(`[SETUP] Starting BakeWise server on port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['backend/server.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  await new Promise(resolve => {
    let ready = false;
    serverProc.stdout.on('data', d => {
      const s = d.toString();
      if (s.includes('listening on') || s.includes('CONNECTED TO') || s.includes('initialization complete')) {
        console.log('  [SERVER READY]', s.trim());
      }
      if (s.includes('CONNECTED TO') || s.includes('initialization complete')) {
        ready = true;
      }
    });
    serverProc.stderr.on('data', d => {
      const s = d.toString().trim();
      if (s && !s.includes('notice')) console.error('  [SERVER ERR]', s);
    });

    const checkInterval = setInterval(() => {
      if (ready) {
        clearInterval(checkInterval);
        setTimeout(resolve, 1000);
      }
    }, 400);

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 8000);
  });

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc, condition) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✓ [PASS] ${desc}`);
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
    }
  }

  try {
    // TEST 1: Backend /api/forecast returns product-specific predictions (NEVER fixed 35)
    console.log('\n--- TEST SUITE 1: API Demand Forecasting & Mathematical Integrity ---');
    
    // Pandesal (product p1, Branch 2)
    const fPandesal = await makeRequest('POST', '/api/forecast', {
      product_id: 'p1',
      branch_id: 2,
      product_name: 'Pandesal',
      category: 'Bread',
      unit: 'pcs'
    });
    assert('POST /api/forecast returns 200 OK for Pandesal', fPandesal.status === 200);
    assert('Pandesal predicted demand is distinct and NOT fixed at 35', fPandesal.body.predicted_demand !== 35);
    assert('Pandesal 7-day forecast array has length 7', Array.isArray(fPandesal.body.daily_forecast) && fPandesal.body.daily_forecast.length === 7);
    
    const sumPandesal = fPandesal.body.daily_forecast.reduce((a, b) => a + b, 0);
    assert(`7-day total strictly equals sum of daily forecasts (${fPandesal.body.seven_day_total} === ${sumPandesal})`, fPandesal.body.seven_day_total === sumPandesal);
    assert(`Tomorrow's forecast matches Day 1 (${fPandesal.body.predicted_demand} === ${fPandesal.body.daily_forecast[0]})`, fPandesal.body.predicted_demand === fPandesal.body.daily_forecast[0]);

    // Muffin (product p10, Branch 2)
    const fMuffin = await makeRequest('POST', '/api/forecast', {
      product_id: 'p10',
      branch_id: 2,
      product_name: 'Muffin',
      category: 'Pastries',
      unit: 'pcs'
    });
    assert('Muffin predicted demand is calculated independently from Pandesal', fMuffin.body.predicted_demand !== fPandesal.body.predicted_demand);
    assert('Muffin 7-day total strictly equals sum of daily forecasts', fMuffin.body.seven_day_total === fMuffin.body.daily_forecast.reduce((a, b) => a + b, 0));

    // Zero-sales product test
    const fEmpty = await makeRequest('POST', '/api/forecast', {
      product_id: 'p_none_zero',
      branch_id: 2,
      product_name: 'Rare Sourdough',
      category: 'Bread',
      sales: []
    });
    assert('Empty sales history honestly reports Insufficient historical data', fEmpty.body.confidence === 'Insufficient historical data');
    assert('Empty sales history marks is_fallback as true', fEmpty.body.is_fallback === true);
    assert('Empty sales history provides category baseline estimate without pretending to be AI', typeof fEmpty.body.fallback_reason === 'string' && fEmpty.body.fallback_reason.length > 0);

    // TEST 2: Inventory Batches API & Food Safety Assessment
    console.log('\n--- TEST SUITE 2: Batch Expiry & Food-Safety Traceability ---');
    const batchesRes = await makeRequest('GET', '/api/inventory/batches?branch_id=2');
    assert('GET /api/inventory/batches returns 200 OK', batchesRes.status === 200);
    assert('Batches are loaded from database', Array.isArray(batchesRes.body) && batchesRes.body.length > 0);

    const expiredCake = batchesRes.body.find(b => b.product_id === 'p4' || (b.category && b.category.toLowerCase().includes('cake')));
    if (expiredCake) {
      assert('Expired/spoiled cake batch is present with status Expired or Spoiled', expiredCake.status === 'Expired' || expiredCake.food_safety_status === 'Spoiled');
    }

    const nearExpiryBread = batchesRes.body.find(b => b.product_id === 'p1' || b.product_id === 'p3');
    if (nearExpiryBread) {
      assert('Near-expiry bread batch is recorded with traceable batch_code', typeof nearExpiryBread.batch_code === 'string' && nearExpiryBread.batch_code.startsWith('BATCH-'));
    }

    // TEST 3: UI E2E Validation in Headless Chrome
    console.log('\n--- TEST SUITE 3: Frontend UI, Modals & Repurposing Flow ---');
    const browser = await puppeteer.launch({
      headless: "new",
      executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 900 });

    page.on('console', msg => {
      const txt = msg.text();
      if (txt.includes('error') || txt.includes('warn') || txt.includes('Repurpose')) {
        console.log('    [BROWSER CONSOLE]', txt.slice(0, 120));
      }
    });

    await page.goto(`http://localhost:${TEST_PORT}/index.html`, { waitUntil: 'networkidle0' });

    // Authenticate as Admin & Navigate to Optimization & Analytics (pane-ai-analytics)
    console.log('  [AUTH] Authenticating and navigating to Optimization & Analytics view...');
    await page.evaluate(async () => {
      try {
        if (window.store && typeof window.store.login === 'function') {
          await window.store.login('admin@bakewise.com', 'password123');
        }
        if (window.store && typeof window.store.syncWithBackend === 'function') {
          await window.store.syncWithBackend();
        }
      } catch (e) {
        console.error("Auth error:", e);
      }
      if (typeof window.navigateToPane === 'function') {
        window.navigateToPane('pane-ai-analytics');
      } else if (typeof switchPane === 'function') {
        switchPane('pane-ai-analytics');
      }
      if (typeof refreshAIAnalyticsPane === 'function') {
        await refreshAIAnalyticsPane();
      }
    });
    await new Promise(r => setTimeout(r, 2500));

    // Verify Table 1: Daily Demand Prediction Table
    const table1Rows = await page.evaluate(() => {
      const rows = document.querySelectorAll('#ai-daily-prediction-tbody tr');
      return Array.from(rows).map(r => {
        const cols = r.querySelectorAll('td');
        return {
          product: cols[0]?.innerText.trim(),
          category: cols[1]?.innerText.trim(),
          unit: cols[2]?.innerText.trim(),
          histAvg: cols[3]?.innerText.trim(),
          tomorrow: cols[4]?.innerText.trim(),
          total7: cols[5]?.innerText.trim(),
          confidence: cols[6]?.innerText.trim(),
          period: cols[7]?.innerText.trim()
        };
      });
    });

    assert('Daily Prediction Table rendered products', table1Rows.length > 0);
    const tomorrowValues = new Set(table1Rows.map(r => r.tomorrow));
    assert(`Tomorrow's forecast has individual distinct values across products (not all identical): [${Array.from(tomorrowValues).slice(0, 4).join(', ')}]`, tomorrowValues.size > 1);
    assert('Correct product unit is rendered (e.g. pcs)', table1Rows[0].unit && table1Rows[0].unit.length > 0);

    // Verify Table 2: 7-Day Forecast Projection Table
    const table2Data = await page.evaluate(() => {
      const headerCols = Array.from(document.querySelectorAll('#ai-7day-projection-thead-tr th')).map(th => th.innerText.trim());
      const rows = Array.from(document.querySelectorAll('#ai-7day-projection-tbody tr')).map(tr => {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        return cells;
      });
      return { headers: headerCols, rows };
    });

    assert('7-Day Projection Table rendered Day 1 to Day 7 with dynamic dates', table2Data.headers.length >= 9);
    assert('7-Day Projection Table rendered rows', table2Data.rows.length > 0);

    // Verify mathematical equality on the first row of Table 2
    if (table2Data.rows.length > 0) {
      const firstRow = table2Data.rows[0];
      const dailyNums = firstRow.slice(1, 8).map(cell => parseInt(cell) || 0);
      const computedSum = dailyNums.reduce((a, b) => a + b, 0);
      const displayedTotal = parseInt(firstRow[8]) || 0;
      assert(`UI 7-Day Total matches sum of daily projections (${displayedTotal} === ${computedSum})`, displayedTotal === computedSum);
    }

    // Verify Section 3: Production Optimization Recommendations & Modal Breakdown
    console.log('\n  [CHECK] Verifying Production Optimization Formula & Transparency Modal...');
    const recCardsCount = await page.evaluate(() => document.querySelectorAll('#ai-recs-container .ai-recommendation-card').length);
    assert('Production recommendation cards rendered', recCardsCount > 0);

    // Click "View Math" breakdown button on the first recommendation card
    await page.evaluate(() => {
      const firstMathBtn = document.querySelector('.btn-prod-breakdown-details');
      if (firstMathBtn) firstMathBtn.click();
    });
    await new Promise(r => setTimeout(r, 600));

    const isModalOpen = await page.evaluate(() => {
      const m = document.getElementById('prod-breakdown-modal');
      return m && m.style.display !== 'none';
    });
    assert('Production Calculation Breakdown Modal opened with formula transparency', isModalOpen);

    const modalContainsFormula = await page.evaluate(() => {
      const body = document.getElementById('prod-breakdown-body');
      return body && body.innerText.includes('MAX(0, Forecast Demand + Safety Stock');
    });
    assert('Modal explicitly shows the required production optimization formula', modalContainsFormula);

    // Close breakdown modal
    await page.evaluate(() => {
      if (typeof closeProdBreakdownModal === 'function') closeProdBreakdownModal();
    });
    await new Promise(r => setTimeout(r, 300));

    // Verify Section 4: Repurposing Recommendations
    console.log('\n  [CHECK] Verifying Food-Safety Repurposing Rules & Badges...');
    const repurposeCards = await page.evaluate(() => {
      const cards = document.querySelectorAll('#ai-repurpose-container .repurpose-card');
      return Array.from(cards).map(c => {
        return {
          title: c.querySelector('.repurpose-item-name')?.innerText.trim(),
          badge: c.querySelector('.badge')?.innerText.trim(),
          recipe: c.querySelector('.repurpose-recipe')?.innerText.trim(),
          reason: c.innerText.includes('Reason:') ? c.innerText : '',
          hasActiveButton: !c.querySelector('button')?.disabled
        };
      });
    });

    assert('Repurposing cards rendered for eligible batches / food-safety notices', repurposeCards.length > 0);

    // Check that SAFE TO REPURPOSE or EXPIRING SOON statuses are present
    const eligibleItem = repurposeCards.find(c => c.badge === 'SAFE TO REPURPOSE' || c.badge === 'EXPIRING SOON');
    assert('Eligible near-expiry bread/pastry is flagged as SAFE TO REPURPOSE or EXPIRING SOON', !!eligibleItem);

    // Check that expired items are flagged as NOT ELIGIBLE with action disabled
    const notEligibleItem = repurposeCards.find(c => c.badge === 'NOT ELIGIBLE');
    if (notEligibleItem) {
      assert('Expired or perishable cake items are strictly flagged as NOT ELIGIBLE', notEligibleItem.hasActiveButton === false);
    }

    // Test Repurposing Action Flow: click "Mark as Repurposed" on an eligible item
    const repurposedSuccess = await page.evaluate(async () => {
      const activeBtn = document.querySelector('.btn-repurpose-action');
      if (activeBtn) {
        activeBtn.click();
        return true;
      }
      return false;
    });
    assert('Clicked "Mark as Repurposed" action button', repurposedSuccess);
    await new Promise(r => setTimeout(r, 1500));

    // Take screenshot of Optimization & Analytics pane for visual verification
    await page.screenshot({ path: path.join(__dirname, '..', 'evidence', 'demand_forecasting_optimization_repurposing.png'), fullPage: true });
    console.log('  [SCREENSHOT] Saved full dashboard verification to evidence/demand_forecasting_optimization_repurposing.png');

    await browser.close();

    console.log('\n========================================================================');
    console.log(`  FINAL RESULT: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('========================================================================\n');

  } catch (err) {
    console.error('[TEST ERROR]', err);
  } finally {
    serverProc.kill();
    process.exit(passedTests === totalTests ? 0 : 1);
  }
}

run();
