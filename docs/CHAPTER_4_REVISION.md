# Chapter 4: System Development and Implementation

## 4.1 System Architecture
The BakeWise system implements a modern three-tier architecture (Client-Server model) with a specialized Machine Learning Microservice Layer. 
- **Presentation Tier**: Developed using HTML5, Vanilla JavaScript, CSS3, and Chart.js for data visualization. It operates as a Single Page Application (SPA).
- **Application Tier**: Developed using Node.js and Express.js, providing RESTful API endpoints for system operations and data retrieval.
- **Machine Learning Layer**: Developed using Python and the Scikit-learn library, this layer specifically handles the Random Forest Regression algorithm for demand forecasting.
- **Data Tier**: Uses MySQL (via XAMPP) for relational data storage, tracking inventory, sales, waste, and user credentials.

## 4.2 System Modules Implementation

### 4.2.1 Dashboard Module
The dashboard successfully aggregates real-time data from the database, displaying Key Performance Indicators (KPIs) such as total revenue, sales volume, and waste costs. 

### 4.2.2 Inventory and Production Management
This module handles the tracking of baked goods. It utilizes First-In-First-Out (FIFO) logic and precisely tracks production dates and shelf-life to generate expiration alerts.

### 4.2.3 AI Demand Forecasting (Random Forest)
As proposed in the methodology, the AI Demand Forecasting module has been fully implemented using Python. The system utilizes a `RandomForestRegressor` model to analyze historical sales data, applying feature engineering (day of week, day of month, previous sales lags) to predict the next day's optimal baking quantity. This directly minimizes overproduction and stockouts.

### 4.2.4 Product Repurposing Engine
The rule-based repurposing engine calculates a "Freshness Index" for each product. When a product's freshness drops to 30% (approaching its expiration limit), the system automatically flags it and suggests a predefined repurposing recipe (e.g., converting unsold bread into croutons), effectively recovering potential lost revenue.

### 4.2.5 Sales and Waste Tracking
All transactions are logged seamlessly. Sales transactions automatically deduct stock from the active inventory, while waste logs track the specific reasons for spoilage, allowing management to identify patterns in production inefficiencies.

## 4.3 Database Implementation
The MySQL database `bakewise_db` has been fully normalized to ensure data integrity. 
The implementation accurately reflects the designed Entity Relationship Diagram (ERD), comprising tables for `bw_users`, `bw_branches`, `bw_products`, `bw_inventory`, `bw_sales`, and `bw_waste`.

## 4.4 Software and Tools Used
- **Frontend**: HTML5, CSS3, JavaScript, Chart.js, Lucide Icons
- **Backend Framework**: Node.js, Express.js
- **Machine Learning**: Python 3.10+, Scikit-learn, Pandas
- **Database**: MySQL, XAMPP, phpMyAdmin
- **Development Environment**: Visual Studio Code, Git/GitHub
