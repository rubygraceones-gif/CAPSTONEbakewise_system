import os

filepath = r"c:\Users\Ruby Grace\Downloads\CAPSTONEbakewise_system\public\app.js"
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "options: {" in line and "      if (fIndex === 0) {" in ''.join(lines[i:i+5]):
        new_lines.append(line)
        
        # inject the missing code
        missing_code = """      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { 
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '₱' + value.toLocaleString();
            }
          }
        }
      },
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ': ₱' + context.parsed.y.toLocaleString();
            }
          }
        }
      }
    }
  });

  // Dynamic AI Insight for Branch Performance
  const branchInsightEl = document.getElementById("insight-branches-chart");
  if (branchInsightEl) {
    const allBranchPerformance = store.branches.map(b => {
      const bSales = store.sales.filter(s => s.branchId === b.id).reduce((sum, s) => sum + (s.qty * s.price), 0);
      const bWaste = store.waste.filter(w => w.branchId === b.id).reduce((sum, w) => sum + (w.qty * w.cost), 0);
      return { name: b.name, sales: bSales, waste: bWaste };
    });
    
    const totalSalesGlobal = allBranchPerformance.reduce((a, b) => a + b.sales, 0);
    const totalWasteGlobal = allBranchPerformance.reduce((a, b) => a + b.waste, 0);
    
    if (totalSalesGlobal === 0 && totalWasteGlobal === 0) {
      branchInsightEl.innerHTML = '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i><span>No branch data available for comparison.</span>';
    } else {
      const sortedBySales = [...allBranchPerformance].sort((a, b) => b.sales - a.sales);
      const sortedByWaste = [...allBranchPerformance].sort((a, b) => b.waste - a.waste);
      
      const top3 = sortedBySales.slice(0, 3).filter(b => b.sales > 0);
      let rankingText = top3.map((b, i) => {
        const rank = i === 0 ? '1st' : i === 1 ? '2nd' : '3rd';
        return `<strong>${rank}: ${b.name}</strong> (₱${b.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`;
      }).join(", ");
      
      if (!rankingText) rankingText = "No sales generated yet.";
      
      let insightHtml = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
      insightHtml += `<div style="display: flex; align-items: flex-start; gap: 8px;">
        <i data-lucide="sparkles" style="width: 14px; height: 14px; margin-top: 2px; flex-shrink: 0;"></i>
        <span style="line-height: 1.4;"><strong>Top Branches by Sales:</strong> ${rankingText}</span>
      </div>`;
      
      let decisionText = "";
      if (top3.length > 0) {
        decisionText += `Maintain high inventory levels and consider running promotions at top performing branches to maximize revenue. `;
      }
      if (sortedByWaste[0] && sortedByWaste[0].waste > 0) {
        decisionText += `Monitor <strong>${sortedByWaste[0].name}</strong> closely as it reported the highest waste cost (₱${sortedByWaste[0].waste.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}). Investigate their inventory management to minimize losses.`;
      }
      
      if (decisionText) {
        insightHtml += `<div style="display: flex; align-items: flex-start; gap: 8px;">
          <i data-lucide="target" style="width: 14px; height: 14px; margin-top: 2px; flex-shrink: 0;"></i>
          <span style="font-size: 0.9em; line-height: 1.4;"><strong>Decision Support:</strong> ${decisionText}</span>
        </div>`;
      }
      insightHtml += `</div>`;
      
      branchInsightEl.innerHTML = insightHtml;
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderRealtimeAlerts() {
  const container = document.getElementById("dashboard-ai-alerts-container");
  if (!container) return;
  container.innerHTML = "";
  const alerts = [];

  const branchIdStr = store.getSelectedBranchId();
  const branchId = branchIdStr === 'all' ? 'all' : parseInt(branchIdStr);

  store.inventory.forEach(item => {
    if (branchId !== 'all' && item.branchId !== branchId) return;
    if (item.stockLevel > 0) {
      const p = store.products.find(x => x.id === item.productId);
      if (!p) return;
      const fIndex = getFreshnessIndex(item.productionDate, item.expiryDate);
      const b = store.branches.find(x => x.id === item.branchId) || { name: "Unknown Branch" };\n"""
        new_lines.append(missing_code)
        
        # skip the empty line right after options if there is one
        if lines[i+1].strip() == "":
            skip = True
        
    elif skip:
        skip = False
    else:
        new_lines.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
