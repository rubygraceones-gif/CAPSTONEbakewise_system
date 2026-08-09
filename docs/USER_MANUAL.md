# BakeWise System User Manual

## Overview
BakeWise is an AI-powered bakery management system designed to optimize production, track inventory, and minimize food waste using Machine Learning predictions and intelligent repurposing logic.

## 1. Dashboard
The Main Dashboard provides a bird's-eye view of your bakery's performance today.
- **Key Metrics**: Shows total revenue, total sales count, total active inventory, and total waste cost.
- **Recent Alerts**: Displays critical low-stock and upcoming expiration alerts.

## 2. Product Catalog
Manage your bakery items in this module.
- **Add Product**: Click "+ New Product" to define a product name, category, price, production cost, shelf-life, and a repurposing recipe.
- **Edit/Delete**: Use the action buttons on the product rows to update prices or remove discontinued items.

## 3. Inventory Management
Track what is currently in stock.
- **Add Batch**: Click "+ Add Stock Batch" to register newly baked items. You must specify the production date.
- **Expiry Tracking**: The system calculates the expiry date automatically based on the product's defined shelf-life in the catalog.

## 4. Sales & POS (Point of Sale)
Log customer purchases.
- **New Transaction**: Click "+ New Sale". Select the product and enter the quantity. The system automatically calculates total price.
- **Stock Deductions**: Logging a sale automatically deducts the quantity from the available inventory using FIFO (First-In, First-Out).

## 5. Waste & Spoilage Tracking
Log items that are no longer sellable.
- **Log Waste**: Click "+ Log Waste". Specify the product, quantity, and reason (Expired, Damaged, Quality Issue).
- **Impact Tracking**: The system calculates the monetary loss based on the product's production cost.

## 6. AI Analytics & Forecasting
The core intelligence of BakeWise.
- **Demand Forecast**: A bar chart comparing historical average sales vs. AI-predicted demand for tomorrow (powered by Random Forest Regression).
- **Production Recommendations**: Tells you exactly how many of each item to bake to meet predicted demand while avoiding overproduction.
- **Repurposing Engine**: Scans inventory for items within 30% of their expiry limit and suggests specific recipes (e.g., turning 2-day-old bread into croutons) to prevent waste.

## 7. Reporting & Analytics
Generate comprehensive business reports.
- **Sales Summary**: View total units sold and gross income per product.
- **CSV Export**: Click "Download CSV Report" to export raw sales data for external accounting.
- **Print/PDF**: Click "Print Report" to save the view as a PDF.
- **Database Backup**: Click "Export Database Backup SQL" to download a local copy of your database.

## 8. Multi-Branch Network (Admin Only)
Manage multiple bakery locations.
- Add or remove branch nodes. The dashboard metrics will filter based on the active branch selected in the sidebar header.

## 9. Staff Management (Admin Only)
Manage user access.
- Add new employees and assign roles (Admin, Manager, Staff). Roles determine which modules can be accessed.
