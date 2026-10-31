const assert = require('assert');
const puppeteer = require('puppeteer-core');
const fs = require('fs');

const { app, server } = require('../backend/server.js');

async function waitForDbReady(port, maxWaitMs = 15000) {
  const startTime = Date.now();
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const res = await fetch(`http://localhost:${port}/api/status`);
      if (res.ok) {
        const body = await res.json();
        if (body.database_driver && body.database_driver !== 'none') {
          console.log(`Database connected via driver: ${body.database_driver}`);
          return;
        }
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Database did not become ready in time');
}

async function run() {
  const PORT = server.address().port;
  console.log(`Waiting for database readiness on port ${PORT}...`);
  await waitForDbReady(PORT);

  const chromePathCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  let executablePath = chromePathCandidates.find(p => fs.existsSync(p));

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('BROWSER CONSOLE ERROR:', msg.text());
  });

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('#pane-sales', { timeout: 10000 });

  // 1. Simulate Admin Login
  await page.evaluate(() => {
    store.currentUser = { id: 1, name: 'System Administrator', email: 'admin@bakewise.com', role: 'admin' };
    sessionStorage.setItem('bakewise_v2_session', JSON.stringify(store.currentUser));
    navigateToPane('pane-sales');
    switchPosTab('history');
  });

  await page.waitForSelector('#pos-history-tbody', { timeout: 10000 });

  // 2. Test Oct 14 in UI
  console.log('Testing pos-history-date = 2026-10-14 in UI...');
  const res14 = await page.evaluate(async () => {
    const dateInput = document.getElementById('pos-history-date');
    dateInput.value = '2026-10-14';
    await refreshPosHistory();

    const tbody = document.getElementById('pos-history-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return {
      rowCount: rows.length,
      hasNoDataMsg: tbody.innerText.includes('No POS transactions found'),
      sampleTxNumber: rows[0] ? rows[0].querySelector('td')?.innerText : null,
      sampleDateCol: rows[0] ? rows[0].querySelectorAll('td')[1]?.innerText : null
    };
  });

  console.log('Oct 14 UI Result:', res14);
  assert(!res14.hasNoDataMsg, 'Must not show "No POS transactions found"');
  assert(res14.rowCount > 0, 'Must show transactions for Oct 14');
  console.log('✓ PASS: UI successfully rendered transactions for Oct 14!');

  // 3. Test Oct 16 in UI
  console.log('\nTesting pos-history-date = 2026-10-16 in UI...');
  const res16 = await page.evaluate(async () => {
    const dateInput = document.getElementById('pos-history-date');
    dateInput.value = '2026-10-16';
    await refreshPosHistory();

    const tbody = document.getElementById('pos-history-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return {
      rowCount: rows.length,
      hasNoDataMsg: tbody.innerText.includes('No POS transactions found'),
      sampleTxNumber: rows[0] ? rows[0].querySelector('td')?.innerText : null,
      sampleDateCol: rows[0] ? rows[0].querySelectorAll('td')[1]?.innerText : null
    };
  });

  console.log('Oct 16 UI Result:', res16);
  assert(!res16.hasNoDataMsg, 'Must not show "No POS transactions found"');
  assert(res16.rowCount > 0, 'Must show transactions for Oct 16');
  console.log('✓ PASS: UI successfully rendered transactions for Oct 16!');

  // 4. Test Lasang (Branch 3) filter in UI
  console.log('\nTesting Branch filter = Lasang (3) for Oct 14...');
  const resLasang = await page.evaluate(async () => {
    const branchInput = document.getElementById('pos-history-branch');
    if (branchInput) branchInput.value = '3';
    const dateInput = document.getElementById('pos-history-date');
    dateInput.value = '2026-10-14';
    await refreshPosHistory();

    const tbody = document.getElementById('pos-history-tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return {
      rowCount: rows.length,
      sampleTxNumber: rows[0] ? rows[0].querySelector('td')?.innerText : null
    };
  });

  console.log('Lasang Result:', resLasang);
  assert(resLasang.rowCount === 250, `Expected 250 Lasang transactions, got ${resLasang.rowCount}`);
  console.log('✓ PASS: Exactly 250 Lasang transactions displayed for Oct 14!');

  await browser.close();
  server.close();
  console.log('\n====================================================');
  console.log('🎉 ALL AUDIT & BROWSER UI TESTS PASSED (100%)!');
  console.log('====================================================');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  server.close();
  process.exit(1);
});
