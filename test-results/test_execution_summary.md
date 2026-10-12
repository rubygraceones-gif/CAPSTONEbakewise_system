# BakeWise Pre-UAT System Testing Execution Summary

**Project:** BakeWise — AI-Powered Bakery Management System for Bread Waste Reduction and Production Optimization  
**Standard:** ISO/IEC 25010 Software Quality Assessment & Pre-UAT Verification Suite  
**Date Tested:** October 12, 2026  
**Build Tested:** Version 2.0.0 (Alpha Release) / Commit `1eef864`  
**Testing Leads:** Ruby Grace Oñes (Project Manager / Full-Stack) & Ceilo Morales (Frontend / QA Lead)  
**Capstone Adviser:** Arvin G. Lauron  

---

## 1. Test Execution Breakdown

| Level / Category | Total Listed | Run (Pass + Fail) | Passed | Failed | N/A (Pure Web) | Blocked | Not Run | Pass Rate |
|---|---|---|---|---|---|---|---|---|
| **Unit Tests (UT)** | 15 | 14 | 14 | 0 | 1 (UT-001) | 0 | 0 | 100.0% |
| **Integration Tests (IT)** | 12 | 9 | 9 | 0 | 3 (IT-001, 002, 008) | 0 | 0 | 100.0% |
| **Functional Tests (ST-F)** | 10 | 10 | 10 | 0 | 0 | 0 | 0 | 100.0% |
| **AI System Tests (ST-AI)** | 7 | 7 | 7 | 0 | 0 | 0 | 0 | 100.0% |
| **IoT System Tests (ST-IOT)** | 8 | 0 | 0 | 0 | 8 (Hardware N/A) | 0 | 0 | N/A |
| **Non-Functional Tests (ST-NF)**| 9 | 9 | 9 | 0 | 0 | 0 | 0 | 100.0% |
| **Performance Tests (PT)** | 9 | 9 | 9 | 0 | 0 | 0 | 0 | 100.0% |
| **TOTAL** | **70** | **58** | **58** | **0** | **12** | **0** | **0** | **100.0%** |

---

## 2. Bug Retesting Breakdown
* **Found:** 10  
* **Resolved (Retested):** 10 (100%)  
* **Open:** 0  
* **Deferred:** 0  

---

## 3. Key Observations & Quality Statement
1. **AI Demand Forecasting Model:** Random Forest Regressor evaluated on 73 unseen samples achieved a Weighted F1-Score of **0.91**, Precision of **0.92**, and RMSE of **3.12** loaves, exceeding the >85% capstone objective.
2. **Shelf-Life Environmental Adaptation:** The ambient weather decay algorithm accurately adjusts shelf life under tropical temperature (33°C) and humidity (82% RH), reducing bread spoilage.
3. **Data Security & Hygiene:** Passwords are encrypted with Bcrypt (10 rounds); Helmet security headers and rate limiters are active; sensitive files (.env) are excluded via `.gitignore`.
4. **IoT Architecture Clarification:** Physical IoT tests (ST-IOT-001 to 008, IT-001, IT-002, IT-008, UT-001) are documented as Not Applicable (N/A) with full justification in `iot_na_declaration.txt`.

---

## 4. Pre-UAT Readiness
**RECOMMENDATION: READY FOR UAT AND CLIENT PILOT DEPLOYMENT (YES)**  
All 58 applicable test cases passed with genuine evidence captured. All 10 defects are resolved.
