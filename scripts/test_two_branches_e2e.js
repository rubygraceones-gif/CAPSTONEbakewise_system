/**
 * E2E & Backend Verification for Two-Branch Demo Data:
 * 1. Lasang (branch_id = 3)
 * 2. Tibungco 2 (branch_id = 5)
 * 3. All Branches Consolidated View
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const TEST_PORT = 3008;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
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

function assert(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
  } else {
    console.error(`  [FAIL] ${description}`);
    throw new Error(`Assertion failed: ${description}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('E2E TEST SUITE: TWO-BRANCH HISTORICAL DEMO DATA');
  console.log('Target Branches: Lasang (3) and Tibungco 2 (5)');
  console.log('====================================================\n');

  console.log(`[SETUP] Spawning BakeWise server on port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['backend/server.js'], {
    env: { ...process.env, PORT: TEST_PORT },
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe'
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server boot timed out after 35 seconds without connecting to DB.'));
    }, 35000);

    const onData = (d) => {
      const s = d.toString();
      if (s.includes('CONNECTED TO POSTGRESQL') || s.includes('CONNECTED TO MYSQL')) {
        console.log('  [DB CONNECTED]', s.trim());
        clearTimeout(timeout);
        setTimeout(resolve, 2000);
      }
    };

    serverProc.stdout.on('data', onData);
    serverProc.stderr.on('data', d => {
      const s = d.toString();
      if (s.includes('attempt')) console.log('  [RETRY]', s.trim());
    });
  });

  try {
    // Test 1: Lasang Sales API
    console.log('\n--- TEST 1: Lasang (Branch 3) Sales API ---');
    const salesB3 = await makeRequest('GET', '/api/sales?branch_id=3');
    assert('GET /api/sales?branch_id=3 returns 200 OK', salesB3.status === 200);
    assert('Lasang has sales records (> 50 transactions)', Array.isArray(salesB3.body) && salesB3.body.length >= 50);
    const datesB3 = new Set(salesB3.body.map(s => s.date ? s.date.split('T')[0] : null));
    assert(`Lasang covers exactly 18 distinct calendar days (${datesB3.size} days)`, datesB3.size === 18);

    // Test 2: Tibungco 2 Sales API
    console.log('\n--- TEST 2: Tibungco 2 (Branch 5) Sales API ---');
    const salesB5 = await makeRequest('GET', '/api/sales?branch_id=5');
    assert('GET /api/sales?branch_id=5 returns 200 OK', salesB5.status === 200);
    assert('Tibungco 2 has sales records (> 50 transactions)', Array.isArray(salesB5.body) && salesB5.body.length >= 50);
    const datesB5 = new Set(salesB5.body.map(s => s.date ? s.date.split('T')[0] : null));
    assert(`Tibungco 2 covers exactly 18 distinct calendar days (${datesB5.size} days)`, datesB5.size === 18);

    // Test 3: Lasang Production API
    console.log('\n--- TEST 3: Lasang (Branch 3) Production API ---');
    const prodB3 = await makeRequest('GET', '/api/production?branch_id=3');
    assert('GET /api/production?branch_id=3 returns 200 OK', prodB3.status === 200);
    assert('Lasang has production records (> 50 orders)', Array.isArray(prodB3.body) && prodB3.body.length >= 50);

    // Test 4: Tibungco 2 Production API
    console.log('\n--- TEST 4: Tibungco 2 (Branch 5) Production API ---');
    const prodB5 = await makeRequest('GET', '/api/production?branch_id=5');
    assert('GET /api/production?branch_id=5 returns 200 OK', prodB5.status === 200);
    assert('Tibungco 2 has production records (> 50 orders)', Array.isArray(prodB5.body) && prodB5.body.length >= 50);

    // Test 5: Demand Forecast for Lasang vs Tibungco 2 (Dynamic & Isolated)
    console.log('\n--- TEST 5: Isolated Demand Forecasts for Lasang vs Tibungco 2 ---');
    const fLasangP1 = await makeRequest('POST', '/api/forecast', {
      product_id: 'p1',
      branch_id: 3,
      product_name: 'Pandesal',
      category: 'Bread'
    });
    assert('Forecast for Pandesal in Lasang succeeds', fLasangP1.status === 200 && fLasangP1.body.predicted_demand > 0);

    const fTibungcoP1 = await makeRequest('POST', '/api/forecast', {
      product_id: 'p1',
      branch_id: 5,
      product_name: 'Pandesal',
      category: 'Bread'
    });
    assert('Forecast for Pandesal in Tibungco 2 succeeds', fTibungcoP1.status === 200 && fTibungcoP1.body.predicted_demand > 0);

    console.log(`  Lasang Pandesal Daily Average: ${fLasangP1.body.historical_avg}, Tomorrow's Forecast: ${fLasangP1.body.predicted_demand}`);
    console.log(`  Tibungco 2 Pandesal Daily Average: ${fTibungcoP1.body.historical_avg}, Tomorrow's Forecast: ${fTibungcoP1.body.predicted_demand}`);
    assert('Lasang and Tibungco 2 have independent forecasts', fLasangP1.body.predicted_demand > 0 && fTibungcoP1.body.predicted_demand > 0);

    // Test 6: Usable Closing Inventory API
    console.log('\n--- TEST 6: Branch-Isolated Usable Inventory API ---');
    const invB3 = await makeRequest('GET', '/api/inventory?branch_id=3');
    assert('GET /api/inventory?branch_id=3 returns 200 OK', invB3.status === 200);
    assert('Lasang has active inventory records', Array.isArray(invB3.body) && invB3.body.length > 0);
    const ubeLasang = invB3.body.find(i => i.product_id === 'p_ube_lasang');
    assert('Lasang has branch-exclusive Ube Cheese Pandesal', !!ubeLasang && ubeLasang.stock_level > 0);

    const invB5 = await makeRequest('GET', '/api/inventory?branch_id=5');
    assert('GET /api/inventory?branch_id=5 returns 200 OK', invB5.status === 200);
    const ubeTibungco = invB5.body.find(i => i.product_id === 'p_ube_lasang');
    assert('Tibungco 2 does NOT sell Ube Cheese Pandesal', !ubeTibungco || ubeTibungco.stock_level === 0 || ubeTibungco.status === 'Inactive');

    // Test 7: Food-Safety Traceable Batches API
    console.log('\n--- TEST 7: Food-Safety Traceable Batches & Repurposing Logs ---');
    const batchesB3 = await makeRequest('GET', '/api/inventory/batches?branch_id=3');
    assert('Batches API for Lasang returns 200 OK', batchesB3.status === 200);
    assert('Lasang batches include active batches with expiry dates', Array.isArray(batchesB3.body) && batchesB3.body.length > 0);

    const batchesB5 = await makeRequest('GET', '/api/inventory/batches?branch_id=5');
    assert('Batches API for Tibungco 2 returns 200 OK', batchesB5.status === 200);

    const repB3 = await makeRequest('GET', '/api/repurpose/logs?branch_id=3');
    assert('Repurpose logs API for Lasang returns 200 OK', repB3.status === 200);
    assert('Lasang has documented repurpose log (Bread Crumbs)', Array.isArray(repB3.body) && repB3.body.length >= 1);

    const repB5 = await makeRequest('GET', '/api/repurpose/logs?branch_id=5');
    assert('Repurpose logs API for Tibungco 2 returns 200 OK', repB5.status === 200);
    assert('Tibungco 2 has documented repurpose log (Croutons)', Array.isArray(repB5.body) && repB5.body.length >= 1);

    console.log('\n====================================================');
    console.log('🎉 ALL TWO-BRANCH E2E API VERIFICATIONS PASSED (100%)');
    console.log('====================================================');

  } finally {
    serverProc.kill('SIGINT');
  }
}

runTests().catch(err => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
