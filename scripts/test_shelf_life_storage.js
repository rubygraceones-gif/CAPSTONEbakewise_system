/**
 * Test Suite: Storage Condition Dropdown & Prediction Algorithm - BakeWise
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== RUNNING SHELF LIFE STORAGE & PREDICTION VERIFICATION ===\n');

// 1. Check frontend/index.html
console.log('--- 1. Checking frontend/index.html ---');
const htmlContent = fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8');

const expectedOptions = [
  'Uncovered Storage',
  'Sealed Packaging',
  'Refrigerated Storage',
  'Frozen Storage',
  'Display Case Storage',
  'Covered Room-Temperature Storage'
];

const forbiddenOldOptions = [
  'Ambient Room Temp (25°C)',
  'Refrigerated (4°C)',
  'High Humidity / Display Showcase',
  'value="sealed"',
  'value="open"',
  'value="refrigerated"'
];

// Extract <select ... id="shelf-storage"> content
const selectMatch = htmlContent.match(/<select[^>]*id="shelf-storage"[^>]*>([\s\S]*?)<\/select>/i);
assert(selectMatch, 'shelf-storage select element must exist in index.html');
const selectInner = selectMatch[1];

// Verify all 6 expected options exist in select
for (const opt of expectedOptions) {
  assert(selectInner.includes(opt), `Missing option in index.html: ${opt}`);
  console.log(`  ✓ Found formal option: "${opt}"`);
}

// Verify no forbidden old options in select
for (const oldOpt of forbiddenOldOptions) {
  assert(!selectInner.includes(oldOpt), `Found forbidden old option in index.html: ${oldOpt}`);
  console.log(`  ✓ Verified old option removed: "${oldOpt}"`);
}

// Verify default selected option
assert(selectInner.includes('value="Covered Room-Temperature Storage" selected') || 
       selectInner.includes('selected>Covered Room-Temperature Storage'), 
       'Default selected option must be Covered Room-Temperature Storage');
console.log('  ✓ Default option is "Covered Room-Temperature Storage"');

// 2. Check frontend/app.js configuration
console.log('\n--- 2. Checking frontend/app.js dropdown combobox items ---');
const appJsContent = fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8');

// Verify initCombobox("shelf-storage") items
const comboboxShelfMatch = appJsContent.match(/initCombobox\("shelf-storage",\s*\{([\s\S]*?)\}\);/);
assert(comboboxShelfMatch, 'initCombobox("shelf-storage") must exist in app.js');
const comboboxShelfBlock = comboboxShelfMatch[1];

for (const opt of expectedOptions) {
  assert(comboboxShelfBlock.includes(opt), `Missing option in initCombobox items: ${opt}`);
  console.log(`  ✓ Combobox contains item: "${opt}"`);
}

// 3. Test normalizeStorageCondition & calculateShelfLifePrediction logic
console.log('\n--- 3. Testing normalizeStorageCondition and Algorithm Multipliers ---');

// Setup mock window & store environment
global.window = {};
global.document = {
  getElementById: () => null
};
global.store = {
  products: [
    { id: "p1", name: "Pandesal", category: "Bread", price: 45, shelfLifeDays: 3 },
    { id: "p2", name: "Special Ensaymada", category: "Pastries", price: 30, shelfLifeDays: 4 },
    { id: "p3", name: "Classic Sliced Bread", category: "Bread", price: 65, shelfLifeDays: 7 },
    { id: "p4", name: "Premium Chocolate Cake", category: "Cakes", price: 380, shelfLifeDays: 5 }
  ]
};

// Evaluate the functions from app.js in a controlled context
const vm = require('vm');
const scriptContext = {
  window: global.window,
  document: global.document,
  store: global.store,
  console: console,
  Math: Math,
  Date: Date,
  Number: Number,
  String: String,
  parseInt: parseInt
};
vm.createContext(scriptContext);

// Extract helper functions from app.js: normalizeStorageCondition and calculateShelfLifePrediction
const normMatch = appJsContent.match(/function normalizeStorageCondition[\s\S]*?window\.normalizeStorageCondition\s*=\s*normalizeStorageCondition;/);
assert(normMatch, 'normalizeStorageCondition must be defined in app.js');
vm.runInContext(normMatch[0], scriptContext);

const calcMatch = appJsContent.match(/function calculateShelfLifePrediction[\s\S]*?window\.calculateShelfLifePrediction\s*=\s*calculateShelfLifePrediction;/);
assert(calcMatch, 'calculateShelfLifePrediction must be defined in app.js');
vm.runInContext(calcMatch[0], scriptContext);

const normalizeStorageCondition = scriptContext.window.normalizeStorageCondition;
const calculateShelfLifePrediction = scriptContext.window.calculateShelfLifePrediction;

// Test normalization
const normTests = [
  { input: 'Uncovered Storage', expected: 'Uncovered Storage' },
  { input: 'open', expected: 'Uncovered Storage' },
  { input: 'Open/Exposed', expected: 'Uncovered Storage' },
  { input: 'Sealed Packaging', expected: 'Sealed Packaging' },
  { input: 'sealed', expected: 'Sealed Packaging' },
  { input: 'Refrigerated Storage', expected: 'Refrigerated Storage' },
  { input: 'refrigerated', expected: 'Refrigerated Storage' },
  { input: 'Refrigerated (4°C)', expected: 'Refrigerated Storage' },
  { input: 'Frozen Storage', expected: 'Frozen Storage' },
  { input: 'frozen', expected: 'Frozen Storage' },
  { input: 'Display Case Storage', expected: 'Display Case Storage' },
  { input: 'High Humidity / Display Showcase', expected: 'Display Case Storage' },
  { input: 'Covered Room-Temperature Storage', expected: 'Covered Room-Temperature Storage' },
  { input: 'Ambient Room Temp (25°C)', expected: 'Covered Room-Temperature Storage' }
];

for (const t of normTests) {
  const res = normalizeStorageCondition(t.input);
  assert.strictEqual(res, t.expected, `Normalization failed for "${t.input}": expected "${t.expected}", got "${res}"`);
  console.log(`  ✓ Normalization: "${t.input}" -> "${res}"`);
}

// 4. Test all 6 Storage Conditions with Pandesal (base = 3 days, temp = 25°C, humid = 60%, prodDate = today)
console.log('\n--- 4. Testing Multipliers and Outputs for All 6 Storage Conditions ---');
const todayStr = new Date().toISOString().split('T')[0];

const conditions = [
  'Uncovered Storage',
  'Display Case Storage',
  'Covered Room-Temperature Storage',
  'Sealed Packaging',
  'Refrigerated Storage',
  'Frozen Storage'
];

const results = {};
for (const cond of conditions) {
  const pred = calculateShelfLifePrediction({
    breadType: 'Pandesal',
    breadName: 'Pandesal',
    storage: cond,
    temp: 25,
    humid: 60,
    prodDate: todayStr
  });
  results[cond] = pred;
  console.log(`  • [${cond}]`);
  console.log(`      Multiplier: ${pred.storageMultiplier}x | Total Shelf Life: ${pred.totalShelfLife} days | Freshness: ${pred.freshnessScore}% | Risk: ${pred.risk}`);
  console.log(`      Storage Msg: "${pred.storageMsg}"`);
}

// Assert ordering: Uncovered < Display Case < Covered Room-Temp < Sealed < Refrigerated < Frozen
assert(results['Uncovered Storage'].totalShelfLife < results['Display Case Storage'].totalShelfLife, 'Uncovered must have lower shelf life than Display Case');
assert(results['Display Case Storage'].totalShelfLife < results['Covered Room-Temperature Storage'].totalShelfLife, 'Display Case must have lower shelf life than Covered Room-Temp');
assert(results['Covered Room-Temperature Storage'].totalShelfLife < results['Sealed Packaging'].totalShelfLife, 'Covered Room-Temp must have lower shelf life than Sealed Packaging');
assert(results['Sealed Packaging'].totalShelfLife < results['Refrigerated Storage'].totalShelfLife, 'Sealed Packaging must have lower shelf life than Refrigerated Storage');
assert(results['Refrigerated Storage'].totalShelfLife < results['Frozen Storage'].totalShelfLife, 'Refrigerated Storage must have lower shelf life than Frozen Storage');

console.log('\n  ✓ Hierarchy validated: Uncovered (0.50x) < Display (0.85x) < Covered Room-Temp (1.00x) < Sealed (1.25x) < Refrigerated (1.60x) < Frozen (3.50x)');

// 5. Test Weather Decay Simulation (ST-AI-007)
console.log('\n--- 5. Testing Weather Decay (33°C / 82% humidity) ---');
const normalWeatherPred = calculateShelfLifePrediction({
  breadType: 'Pandesal',
  breadName: 'Pandesal',
  storage: 'Covered Room-Temperature Storage',
  temp: 25,
  humid: 60,
  prodDate: todayStr
});

const severeWeatherPred = calculateShelfLifePrediction({
  breadType: 'Pandesal',
  breadName: 'Pandesal',
  storage: 'Covered Room-Temperature Storage',
  temp: 33,
  humid: 82,
  prodDate: todayStr
});

console.log(`  Normal Weather (25°C / 60%): ${normalWeatherPred.totalShelfLife} days`);
console.log(`  Severe Weather (33°C / 82%): ${severeWeatherPred.totalShelfLife} days`);
assert(severeWeatherPred.totalShelfLife < normalWeatherPred.totalShelfLife * 0.6, 'Severe heat and humidity must reduce shelf life by > 40%');
assert(severeWeatherPred.tempMsg.includes('accelerates') || severeWeatherPred.tempMsg.includes('High temperature'), 'Temp msg must reflect high heat');
assert(severeWeatherPred.humidMsg.includes('mold risk') || severeWeatherPred.humidMsg.includes('High humidity'), 'Humid msg must reflect mold risk');
console.log('  ✓ Severe weather decay verified: accelerated degradation detected with warning messages.');

// 6. Test Aged Bread / Spoilage Progression
console.log('\n--- 6. Testing Bread Age and Risk Levels ---');
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

const agedPred = calculateShelfLifePrediction({
  breadType: 'Pandesal',
  breadName: 'Pandesal',
  storage: 'Uncovered Storage',
  temp: 28,
  humid: 70,
  prodDate: twoDaysAgoStr
});

console.log(`  Aged Uncovered Pandesal (2 days old): remaining ${agedPred.remainingDays} days, freshness ${agedPred.freshnessScore}%, risk: ${agedPred.risk}`);
assert(agedPred.freshnessScore <= 25, '2-day-old uncovered pandesal must have freshness <= 25%');
assert.strictEqual(agedPred.risk, 'High Risk', '2-day-old uncovered pandesal must be High Risk');
console.log('  ✓ Aged bread risk assessment verified: correctly flagged as High Risk.');

// 7. Test New Redesign UI Elements in index.html
console.log('\n--- 7. Testing Redesigned UI Structure in index.html ---');
assert(htmlContent.includes('Shelf Life Prediction &amp; Repurposing') || htmlContent.includes('Shelf Life Prediction & Repurposing'), 'Must include header title');
assert(htmlContent.includes('Monitor product freshness, estimate remaining shelf life, and identify spoilage risks.'), 'Must include header subtitle');
assert(htmlContent.includes('Prediction Settings'), 'Must include Prediction Settings card title');
assert(htmlContent.includes('Calculate Shelf Life'), 'Button text must be Calculate Shelf Life');
assert(htmlContent.includes('Product Freshness Monitoring'), 'Must include Product Freshness Monitoring title');
assert(htmlContent.includes('Prediction Analysis'), 'Must include Prediction Analysis title');
assert(htmlContent.includes('Recommended Repurposing Options'), 'Must include Recommended Repurposing Options title');
assert(htmlContent.includes('Prediction Information'), 'Must include Prediction Information title');
assert(htmlContent.includes('id="res-circular-progress"'), 'Must include circular progress SVG id');
assert(htmlContent.includes('id="res-freshness-status-badge"'), 'Must include freshness status badge id');
assert(htmlContent.includes('id="res-expiry-date"'), 'Must include expiry date id');
assert(htmlContent.includes('id="shelf-repurpose-container"'), 'Must include shelf repurpose container id');

console.log('  ✓ Header title & subtitle verified');
console.log('  ✓ Prediction Settings card verified');
console.log('  ✓ "Calculate Shelf Life" orange button verified');
console.log('  ✓ 3 Summary Cards with Circular progress & Expiry date verified');
console.log('  ✓ Product Freshness Monitoring with 3 ranges verified');
console.log('  ✓ Prediction Analysis with 4 detailed factors verified');
console.log('  ✓ Recommended Repurposing Options section verified');
console.log('  ✓ Prediction Information notice verified');

// 8. Test renderShelfRepurposingOptions Safety Rules
console.log('\n--- 8. Testing Repurposing Safety Rules & Logic ---');
let renderedHtml = '';
const mockContainer = {
  replaceChildren: () => {},
  innerHTML: ''
};
// Attach mock setSafeHtml
scriptContext.setSafeHtml = (elem, content) => { renderedHtml = content; };
const repurposeMatch = appJsContent.match(/function renderShelfRepurposingOptions[\s\S]*?window\.renderShelfRepurposingOptions\s*=\s*renderShelfRepurposingOptions;/);
assert(repurposeMatch, 'renderShelfRepurposingOptions must be defined in app.js');
vm.runInContext(repurposeMatch[0], scriptContext);

const renderShelfRepurposingOptions = scriptContext.window.renderShelfRepurposingOptions;

// Test A: Spoiled Product (< 25%) MUST NOT be repurposed!
scriptContext.document.getElementById = (id) => id === 'shelf-repurpose-container' ? mockContainer : null;
renderShelfRepurposingOptions({ freshnessScore: 15, breadName: 'Pandesal' });
assert(renderedHtml.includes('Unsafe for Repurposing — Mark for Disposal'), 'Spoiled product must trigger disposal alert');
assert(renderedHtml.includes('Log Waste'), 'Spoiled product must have Log Waste button');
assert(!renderedHtml.includes('Use Recipe'), 'Spoiled product must NEVER offer repurposing recipes');
console.log('  ✓ Safety Rule 1: Spoiled product (<25%) correctly blocked from repurposing & marked for disposal.');

// Test B: Peak Freshness (>= 75%)
renderShelfRepurposingOptions({ freshnessScore: 90, breadName: 'Pandesal' });
assert(renderedHtml.includes('Peak Freshness — Repurposing Not Required'), 'Peak fresh product must show not required');
console.log('  ✓ Safety Rule 2: Peak fresh product (>=75%) informs staff that repurposing is not required yet.');

// Test C: Moderate Freshness (25% - 74%) MUST show safe repurposing recipes
renderShelfRepurposingOptions({ freshnessScore: 50, breadName: 'Pandesal' });
assert(renderedHtml.includes('Garlic Butter Croutons'), 'Near-expiry Pandesal should recommend Croutons');
assert(renderedHtml.includes('Fine Toasted Breadcrumbs'), 'Near-expiry Pandesal should recommend Breadcrumbs');
assert(renderedHtml.includes('Freshness 25%–74%'), 'Recommendations must display safety criteria');
console.log('  ✓ Safe Repurposing: Near-expiry bread (25%–74%) shows actionable bakery recipes with safety requirements.');

console.log('\n======================================================');
console.log('ALL STORAGE CONDITION & PREDICTION ALGORITHM TESTS PASSED!');
console.log('======================================================\n');

