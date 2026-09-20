import os

filepath = r"c:\Users\Ruby Grace\Downloads\CAPSTONEbakewise_system\public\app.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

target1 = """async function getAIPredictedDemand(productId) {
  const salesHistory = store.sales.filter(s => s.productId === productId);
  if (salesHistory.length === 0) return 30;

  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: salesHistory })
    });
    if (response.ok) {
      const data = await response.json();
      return data.predicted_demand !== undefined ? data.predicted_demand : 30;
    }
  } catch (error) {
    console.error("AI Forecast error:", error);
  }

  // Fallback
  const qtySum = salesHistory.slice(-3).reduce((sum, s) => sum + s.qty, 0);
  const avg = Math.round(qtySum / Math.min(3, salesHistory.length));
  return Math.max(5, avg);
}"""

rep1 = """async function getAIPredictedDemand(productId) {
  const salesHistory = store.sales.filter(s => s.productId === productId);
  if (salesHistory.length === 0) return { demand: 30 };

  try {
    const response = await fetch('/api/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sales: salesHistory })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        demand: data.predicted_demand !== undefined ? data.predicted_demand : 30,
        metrics: data.metrics,
        insights: data.insights
      };
    }
  } catch (error) {
    console.error("AI Forecast error:", error);
  }

  // Fallback
  const qtySum = salesHistory.slice(-3).reduce((sum, s) => sum + s.qty, 0);
  const avg = Math.round(qtySum / Math.min(3, salesHistory.length));
  return { demand: Math.max(5, avg) };
}"""

content = content.replace(target1, rep1)

target2 = "const predictedDemand = await Promise.all(store.products.map(p => getAIPredictedDemand(p.id)));"
rep2 = """const aiResults = await Promise.all(store.products.map(p => getAIPredictedDemand(p.id)));
  const predictedDemand = aiResults.map(r => r.demand);"""
content = content.replace(target2, rep2)

target3 = """      }
    }
  });
}

async function renderBakeRecommendations() {"""

rep3 = """      }
    }
  });

  const metricsEl = document.getElementById("ai-forecast-metrics");
  if (metricsEl) {
    const topResultIdx = predictedDemand.indexOf(Math.max(...predictedDemand));
    const topResult = aiResults[topResultIdx];
    const topProductName = store.products[topResultIdx]?.name;

    if (topResult && topResult.metrics) {
      metricsEl.style.display = "block";
      const { rmse, f1_score } = topResult.metrics;
      const insightsList = topResult.insights.map(ins => `<li>${ins}</li>`).join("");

      metricsEl.innerHTML = `
        <h4 style="margin:0 0 8px 0; color: var(--primary-color); display: flex; align-items: center; gap: 6px;">
          <i data-lucide="brain-circuit" style="width: 16px; height: 16px;"></i>
          AI Scoring Matrix & Insights (${topProductName})
        </h4>
        <div style="display: flex; gap: 16px; margin-bottom: 12px;">
          <div style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Root Mean Squared Error (RMSE)</div>
            <div style="font-size: 1.25rem; font-weight: bold; color: #0f172a;">${rmse.toFixed(2)}</div>
          </div>
          <div style="background: #fff; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0;">
            <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase;">Classification F1-Score</div>
            <div style="font-size: 1.25rem; font-weight: bold; color: #0f172a;">${f1_score.toFixed(2)}</div>
          </div>
        </div>
        <div style="background: #ebf8ff; border-left: 4px solid #3b82f6; padding: 8px 12px; font-size: 0.85rem; color: #1e3a8a;">
          <strong>Meaningful Insights:</strong>
          <ul style="margin: 4px 0 0 16px; padding: 0;">
            ${insightsList}
          </ul>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    } else {
      metricsEl.style.display = "none";
    }
  }
}

async function renderBakeRecommendations() {"""

content = content.replace(target3, rep3)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("done")
