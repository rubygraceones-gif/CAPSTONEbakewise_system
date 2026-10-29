import re

files = [
    "c:\\Users\\Ruby Grace\\Downloads\\CAPSTONEbakewise_system\\public\\index.html",
    "c:\\Users\\Ruby Grace\\Downloads\\CAPSTONEbakewise_system\\public\\app.js"
]

replacements = [
    ("AI-Powered", "Advanced"),
    ("AI-powered", "advanced"),
    ("AI-Driven", "Advanced"),
    ("AI & Demand Forecasting", "Demand Forecasting"),
    ("AI Real-time Action Alerts", "Real-time Action Alerts"),
    ("AI Demand Forecasting", "Demand Forecasting"),
    ("AI Production Optimization Recommendations", "Bakewise Production Optimization Recommendations"),
    ("AI Analysis Summary", "Analysis Summary"),
    ("Artificial Intelligence Analytics", "Optimization & Analytics"),
    ("Check AI optimization model", "Check optimization model"),
    ("AI Predicted Demand (Tomorrow)", "Predicted Demand (Tomorrow)")
]

for file_path in files:
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
        
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

print("Text replacements completed.")
