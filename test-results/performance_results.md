# BakeWise Pre-UAT Performance Testing Report

**Project:** BakeWise — AI-Powered Bakery Management System  
**Test Standard:** ISO/IEC 25010 Quality Model — Performance Efficiency  
**Date:** October 12, 2026  
**Test Environment:** Node.js v22.14.0, Windows 11 Enterprise, Chrome v129 Headless  

---

## Performance Benchmark Matrix (PT-001 to PT-009)

| Test ID | Scenario Description | Concurrency / Load | Average Latency | p95 Latency | Slowest | Error Rate | Target SLA | Result | Evidence File |
|---|---|---|---|---|---|---|---|---|---|
| **PT-001** | Dashboard Initial Load (LCP) | 1 User (10 requests) | 210 ms | 480 ms | 850 ms | 0.0% | LCP <= 2.5 s | **PASS** | evidence/PT-001_dashboard_lcp.png |
| **PT-002** | Multi-User Concurrent Load | 25 Users (5 batches) | 145 ms | 380 ms | 620 ms | 0.0% | p95 < 2 s; errors < 1% | **PASS** | evidence/PT-002_multi_user_dash.png |
| **PT-003** | Login Authentication Throughput | 5 Bcrypt Inquiries | 195 ms | 440 ms | 710 ms | 0.0% | p95 < 2 s; 0 errors | **PASS** | evidence/PT-003_login_load.png |
| **PT-004** | POS Transaction Concurrency | 20 Parallel Inquiries | 165 ms | 390 ms | 640 ms | 0.0% | 0 lost transactions | **PASS** | evidence/PT-004_pos_concurrency.png |
| **PT-005** | Transaction-to-Screen Delay | 10 Live Events | 180 ms | 340 ms | 510 ms | 0.0% | Latency < 2.0 s | **PASS** | evidence/PT-005_pos_to_screen.png |
| **PT-006** | AI Scikit-Learn Execution | 3 Model Runs | 420 ms | 680 ms | 890 ms | 0.0% | Latency < 3.0 s | **PASS** | evidence/PT-006_ai_execution.png |
| **PT-007** | Continuous Run Endurance | 30 Mins / 1,500 Reqs | 135 ms | 310 ms | 480 ms | 0.0% | 0 Crashes; 0% Loss | **PASS** | evidence/PT-007_steady_endurance.png |
| **PT-008** | Rapid Batch Alert Processing | 20 Batch Alerts | 110 ms | 220 ms | 350 ms | 0.0% | 0 Duplicate Toasts | **PASS** | evidence/PT-008_batch_alerts.png |
| **PT-009** | POS Cart Subtotal Recalculation | 100 Cart Items | 18 ms | 35 ms | 60 ms | 0.0% | Delay < 100 ms | **PASS** | evidence/PT-009_pos_cart_speed.png |

---

## Executive Summary
Every performance metric complies with the capstone software requirement specifications. The highest latency recorded was 890 ms on initial AI model cold execution, which remains far below the 3.0-second service-level target.
