# BakeWise System - Railway & Supabase Deployment Guide

This guide outlines how to deploy the **BakeWise Enterprise Bakery Management System** to **Railway** with a **Supabase PostgreSQL** database.

---

## 1. System Architecture Overview

The system is engineered for multi-driver database resilience:
* **Local Development**: Runs seamlessly with **XAMPP MySQL** (`bakewise_db`).
* **Cloud Deployment (Railway + Supabase)**: Automatically connects to **Supabase PostgreSQL** when `DATABASE_URL` is set, executing schema creation and default seeding automatically on first launch.

---

## 2. Supabase Setup (Database)

1. Sign in to your [Supabase Dashboard](https://supabase.com/).
2. Create a new project named `bakewise_db` (or select an existing project).
3. Under **Project Settings -> Database**:
   - Copy the **URI Connection String** (Transaction Pooler or Session Pooler).
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`

---

## 3. Railway Deployment Setup

1. Sign in to your [Railway Dashboard](https://railway.app/).
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository (`CAPSTONEbakewise_system`).
4. Go to **Variables** in your Railway service settings and add the following environment variables:

| Variable Name | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres` | Your Supabase Postgres Connection String |
| `JWT_SECRET` | `your_secure_jwt_secret_key_here` | Secret key used for signing JWT tokens |
| `NODE_ENV` | `production` | Enables production mode |
| `PORT` | `3000` | Optional (Railway assigns PORT dynamically) |

5. Railway will automatically detect `railway.toml` and build using Nixpacks (Node.js 20 + Python 3.11 for AI forecasting).

---

## 4. Verification & Testing

Once Railway deploys your service, visit the following URLs:

1. **Status Endpoint**:
   `https://<your-railway-app>.up.railway.app/api/status`
   * Should return `dbConnection: "healthy"` and `connectionStringUsed: "Supabase PostgreSQL"`.

2. **Web Application**:
   `https://<your-railway-app>.up.railway.app`
   * Log in with default admin credentials:
     - **Email**: `admin@bakewise.com`
     - **Password**: `password123`

---

## 5. Troubleshooting & Maintenance

* **Schema Sync**: Schema tables (`bw_branches`, `bw_users`, `bw_products`, `bw_sales`, `bw_inventory`, `bw_production`, `bw_waste`) and default seed accounts automatically populate on first startup.
* **AI Forecast**: Python 3.11 with `scikit-learn`, `pandas`, and `numpy` is installed via `requirements.txt` and `railway.toml`.
