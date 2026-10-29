import re

file_path = "c:\\Users\\Ruby Grace\\Downloads\\CAPSTONEbakewise_system\\public\\app.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of setupNotifications
start_idx = content.find("  // Initial badge update")

if start_idx != -1:
    # Truncate content right at the end of setupNotifications
    content = content[:start_idx]
    
    # Append the correct structure
    content += """  // Initial badge update
  window.updateNotificationBadge();
}

// ==========================================================================
// SHELF LIFE PREDICTOR UI & LOGIC
// ==========================================================================
function setupShelfLifePredictor() {
  const shelfTemp = document.getElementById("shelf-temp");
  const shelfTempVal = document.getElementById("shelf-temp-val");
  const shelfHumid = document.getElementById("shelf-humidity");
  const shelfHumidVal = document.getElementById("shelf-humidity-val");

  if (shelfTemp && shelfTempVal) {
    shelfTemp.addEventListener("input", (e) => shelfTempVal.textContent = e.target.value);
  }
  if (shelfHumid && shelfHumidVal) {
    shelfHumid.addEventListener("input", (e) => shelfHumidVal.textContent = e.target.value);
  }

  const btnPredictShelf = document.getElementById("btn-predict-shelf");
  if (btnPredictShelf) {
    btnPredictShelf.addEventListener("click", () => {
      const breadTypeEl = document.getElementById("shelf-bread-type");
      const breadType = breadTypeEl.value;
      const breadName = breadTypeEl.options[breadTypeEl.selectedIndex].text;
      const storage = document.getElementById("shelf-storage").value;
      const temp = parseInt(document.getElementById("shelf-temp").value);
      const humid = parseInt(document.getElementById("shelf-humidity").value);
      const prodDate = document.getElementById("shelf-date").value;

      if (!prodDate) {
        if (typeof showToast === 'function') showToast("Please select a Production Date.", "error");
        return;
      }

      // Base shelf life in days based on Bread Type
      let baseShelfLife = 3;
      if (breadType === "pandesal") baseShelfLife = 3;
      else if (breadType === "sliced_bread") baseShelfLife = 7;
      else if (breadType === "ensaymada") baseShelfLife = 5;
      else if (breadType === "cake") baseShelfLife = 4;

      // Calculate Modifiers
      let multiplier = 1.0;
      if (storage === "refrigerated") multiplier *= 1.5;
      else if (storage === "open") multiplier *= 0.5;

      if (temp > 30) multiplier *= 0.7; 
      else if (temp < 20) multiplier *= 1.1; 

      if (humid > 70) multiplier *= 0.6; 
      else if (humid < 40) multiplier *= 0.8; 
      else multiplier *= 1.1; 

      let totalShelfLife = Math.max(1, Math.round(baseShelfLife * multiplier));

      // Calculate Remaining Days and Freshness
      const today = new Date();
      today.setHours(0,0,0,0);
      const pDate = new Date(prodDate);
      pDate.setHours(0,0,0,0);
      
      const diffTime = today - pDate;
      const daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let remainingDays = totalShelfLife - daysElapsed;
      let freshnessScore = 0;
      
      if (remainingDays <= 0) {
        remainingDays = 0;
        freshnessScore = 0;
      } else if (daysElapsed < 0) {
        remainingDays = totalShelfLife;
        freshnessScore = Math.min(100, Math.max(0, Math.round((totalShelfLife / baseShelfLife) * 100)));
      } else {
        freshnessScore = Math.min(100, Math.max(0, Math.round((remainingDays / baseShelfLife) * 100)));
      }

      // Update UI elements
      document.getElementById("res-bread-name").textContent = breadName;
      document.getElementById("res-freshness").textContent = freshnessScore + "%";
      document.getElementById("res-days").textContent = remainingDays + " Days";

      const freshnessBar = document.getElementById("res-freshness-bar");
      const freshnessBarText = document.getElementById("res-freshness-bar-text");
      freshnessBar.style.width = freshnessScore + "%";
      freshnessBarText.textContent = freshnessScore + "%";

      let risk = "Low";
      let riskColor = "#22c55e"; // Green
      let riskIcon = "check-square";
      
      if (freshnessScore <= 25) {
        risk = "High";
        riskColor = "#ef4444"; // Red
        riskIcon = "alert-triangle";
        freshnessBar.style.backgroundColor = "#ef4444";
      } else if (freshnessScore <= 75) {
        risk = "Moderate";
        riskColor = "#eab308"; // Yellow
        riskIcon = "alert-circle";
        freshnessBar.style.backgroundColor = "#eab308";
      } else {
        freshnessBar.style.backgroundColor = "#22c55e";
      }
      
      const resRisk = document.getElementById("res-risk");
      resRisk.textContent = risk;
      resRisk.style.color = riskColor;
      
      document.getElementById("res-freshness").style.color = riskColor;
      freshnessBarText.style.color = riskColor;

      const riskIconEl = document.getElementById("res-risk-icon");
      if (riskIconEl && typeof lucide !== 'undefined') {
        riskIconEl.setAttribute("data-lucide", riskIcon);
        riskIconEl.style.color = riskColor;
        lucide.createIcons();
      }

      // Generate Analysis Messages
      let tempMsg = temp > 30 ? `High temp (${temp}°C) accelerates spoilage.` : temp < 20 ? `Cool temp (${temp}°C) extends shelf life.` : `Optimal room temperature (${temp}°C).`;
      let humidMsg = humid > 70 ? `High humidity (${humid}%) risks rapid mold growth.` : humid < 40 ? `Low humidity (${humid}%) risks rapid staling.` : `Ideal humidity (${humid}%) preserves texture.`;
      let storageMsg = storage === "sealed" ? "Sealed packaging protects from air." : storage === "refrigerated" ? "Refrigeration slows mold but may cause staling." : "Open storage exposes product to contaminants.";

      document.getElementById("res-msg-temp").textContent = tempMsg;
      document.getElementById("res-msg-temp").style.color = temp > 30 ? "#ef4444" : "var(--text-secondary)";
      
      document.getElementById("res-msg-humid").textContent = humidMsg;
      document.getElementById("res-msg-humid").style.color = (humid > 70 || humid < 40) ? "#f59e0b" : "var(--text-secondary)";
      
      document.getElementById("res-msg-storage").textContent = storageMsg;
      document.getElementById("res-msg-storage").style.color = storage === "open" ? "#ef4444" : "var(--text-secondary)";
    });
  }
}

// Call on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupShelfLifePredictor);
} else {
  setupShelfLifePredictor();
}
"""

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed app.js successfully.")
else:
    print("Could not find the target to truncate.")
