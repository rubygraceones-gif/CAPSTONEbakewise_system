# BakeWise System Installation Guide

## 1. System Requirements
- Operating System: Windows 10/11
- Node.js (v18.x or higher)
- Python 3.10+
- XAMPP (for MySQL)

## 2. Setting Up the Database
1. Open XAMPP Control Panel and start **Apache** and **MySQL**.
2. Open your browser and go to `http://localhost/phpmyadmin`.
3. Create a new database named `bakewise_db`.
4. Import the `bakewise_db.sql` file provided in the root directory into the new database.

## 3. Python Environment Setup
BakeWise requires Python for its Machine Learning Demand Forecasting engine (Random Forest).
1. Ensure Python is added to your system PATH.
2. Open a terminal/command prompt.
3. Install the required libraries by running:
   ```bash
   pip install pandas scikit-learn
   ```

## 4. Node.js Environment Setup
1. Open a terminal and navigate to the `CAPSTONEbakewise_system` folder.
2. Install the backend dependencies:
   ```bash
   npm install express mysql2 cors
   ```

## 5. Running the System
1. Open a terminal in the project directory.
2. Start the Node backend server:
   ```bash
   node server.js
   ```
3. Look for the success message: `BakeWise Enterprise System server is listening on http://localhost:3000`.
4. Open your web browser and navigate to `http://localhost:3000`.

## 6. Default Credentials
- **Admin**: `admin@bakewise.com` / `password123`
- **Manager**: `manager@bakewise.com` / `password123`
- **Staff**: `staff@bakewise.com` / `password123`
