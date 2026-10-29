const fs = require('fs');
const htmlPath = fs.existsSync('frontend/index.html') ? 'frontend/index.html' : 'public/index.html';
const html = fs.readFileSync(htmlPath, 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('class="view-pane"') || l.includes('class="panel-card"') && l.includes('id=')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
