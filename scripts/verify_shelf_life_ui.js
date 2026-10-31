const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  
  let filePath = path.join(__dirname, '../frontend', reqPath);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(__dirname, '..', reqPath);
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const PORT = 3889;
server.listen(PORT, async () => {
  console.log(`Static server running on http://localhost:${PORT}`);

  const chromePath = fs.existsSync('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

  console.log('Using browser executable:', chromePath);

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 950 });

  console.log('Navigating to app...');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  // Navigate to pane-shelf-life
  await page.evaluate(() => {
    if (typeof navigateToPane === 'function') {
      navigateToPane('pane-shelf-life');
    } else {
      document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
      document.getElementById('pane-shelf-life').classList.add('active');
    }
  });

  await new Promise(r => setTimeout(r, 600));

  // Verify slider attributes
  const sliderAttrs = await page.evaluate(() => {
    const slider = document.getElementById('shelf-temp');
    return {
      min: slider.getAttribute('min'),
      max: slider.getAttribute('max'),
      value: slider.value,
      bandText: document.getElementById('shelf-temp-band')?.textContent
    };
  });
  console.log('Slider attributes:', sliderAttrs);

  // Set temperature to 45°C (Hot)
  console.log('Setting temperature to 45°C (Hot)...');
  await page.evaluate(() => {
    const slider = document.getElementById('shelf-temp');
    slider.value = 45;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 400));

  const hotState = await page.evaluate(() => {
    return {
      tempVal: document.getElementById('shelf-temp-val')?.textContent,
      tempBand: document.getElementById('shelf-temp-band')?.textContent,
      freshness: document.getElementById('res-freshness')?.textContent,
      status: document.getElementById('res-freshness-status-badge')?.textContent,
      days: document.getElementById('res-days')?.textContent,
      risk: document.getElementById('res-risk')?.textContent
    };
  });
  console.log('State at 45°C Hot:', hotState);

  await page.screenshot({ path: path.join(__dirname, '../evidence/shelf_life_45c_hot.png'), fullPage: true });

  // Set temperature to 70°C (Very Hot)
  console.log('Setting temperature to 70°C (Very Hot)...');
  await page.evaluate(() => {
    const slider = document.getElementById('shelf-temp');
    slider.value = 70;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await new Promise(r => setTimeout(r, 400));

  const veryHotState = await page.evaluate(() => {
    return {
      tempVal: document.getElementById('shelf-temp-val')?.textContent,
      tempBand: document.getElementById('shelf-temp-band')?.textContent,
      freshness: document.getElementById('res-freshness')?.textContent,
      status: document.getElementById('res-freshness-status-badge')?.textContent,
      days: document.getElementById('res-days')?.textContent,
      risk: document.getElementById('res-risk')?.textContent
    };
  });
  console.log('State at 70°C Very Hot:', veryHotState);

  await page.screenshot({ path: path.join(__dirname, '../evidence/shelf_life_70c_very_hot.png'), fullPage: true });

  // Set temperature to 18°C (Cool) and click "Calculate Shelf Life" button
  console.log('Setting temperature to 18°C (Cool) and clicking Calculate button...');
  await page.evaluate(() => {
    const slider = document.getElementById('shelf-temp');
    slider.value = 18;
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    document.getElementById('btn-predict-shelf').click();
  });
  await new Promise(r => setTimeout(r, 400));

  const coolState = await page.evaluate(() => {
    return {
      tempVal: document.getElementById('shelf-temp-val')?.textContent,
      tempBand: document.getElementById('shelf-temp-band')?.textContent,
      freshness: document.getElementById('res-freshness')?.textContent,
      status: document.getElementById('res-freshness-status-badge')?.textContent,
      days: document.getElementById('res-days')?.textContent,
      risk: document.getElementById('res-risk')?.textContent
    };
  });
  console.log('State at 18°C Cool:', coolState);

  await page.screenshot({ path: path.join(__dirname, '../evidence/shelf_life_18c_cool.png'), fullPage: true });

  console.log('All screenshots captured successfully.');
  await browser.close();
  server.close();
  process.exit(0);
});

