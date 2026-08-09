# BakeWise System Architecture

## Architecture Overview

BakeWise follows a modern **Three-Tier Architecture** consisting of a Presentation Tier, an Application Tier, and a Data Tier. It also incorporates a specialized **Machine Learning Microservice Layer** to handle predictive analytics.

### 1. Presentation Tier (Client)
- **Technology**: HTML5, Vanilla JavaScript, CSS3 (Custom `style.css`), Chart.js
- **Responsibility**: Renders the User Interface (UI), handles user interactions, performs client-side form validations, and dynamically updates the DOM using DOM manipulation.
- **Design Pattern**: Single Page Application (SPA) utilizing modular JavaScript functions to switch between "panes" (Dashboard, Inventory, AI Analytics, etc.) without page reloads.

### 2. Application Tier (Backend Server)
- **Technology**: Node.js, Express.js
- **Responsibility**: Acts as the central REST API. Handles routing, authentication, business logic, and orchestrates calls between the database and the Machine Learning engine.
- **Key Modules**:
  - `server.js`: The main entry point. Defines all CRUD endpoints (`/api/sales`, `/api/inventory`, etc.).
  - Serves the static assets from the `/public` directory.

### 3. Machine Learning Microservice Layer
- **Technology**: Python 3.10+, Scikit-learn (Random Forest Regressor), Pandas
- **Responsibility**: Processes historical sales data to predict future demand.
- **Integration**: The Node.js server invokes the Python script (`src/ai_forecast.py`) via the `child_process.exec` module. Data is passed via standard input (stdin) in JSON format, and predictions are returned via standard output (stdout).

### 4. Data Tier (Database)
- **Technology**: MySQL (via XAMPP)
- **Responsibility**: Persistent storage of system data (Users, Branches, Products, Inventory, Sales, Waste).
- **Integration**: Node.js connects to MySQL using the `mysql2` driver with connection pooling.

## Data Flow (AI Demand Forecasting)
1. **Client**: The frontend requests AI analytics.
2. **Backend**: Express.js receives the request and gathers historical sales data from the MySQL database.
3. **ML Engine**: Express.js spawns a Python process, passing the data. `ai_forecast.py` trains a Random Forest model on the fly and outputs the predicted demand.
4. **Backend**: Express parses the Python output and sends it back to the client as JSON.
5. **Client**: Chart.js renders the predicted demand, and the rule-based engine calculates recommended baking quantities by subtracting current inventory stock from the prediction.
