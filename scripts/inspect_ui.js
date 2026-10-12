const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');

const lines = html.split('\n');
lines.forEach((l, i) => {
  if (l.includes('class="view-pane"') || l.includes('class="panel-card"') && l.includes('id=')) {
    console.log(`${i+1}: ${l.trim()}`);
  }
});
