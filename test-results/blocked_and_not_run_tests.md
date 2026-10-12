# BakeWise Pre-UAT Blocked & Not Run Tests Report

**Project:** BakeWise — AI-Powered Bakery Management System for Bread Waste Reduction and Production Optimization  
**Test Suite:** ISO/IEC 25010 Pre-UAT Verification Suite  
**Date:** October 12, 2026  
**Build:** Version 2.0.0 (Alpha Release) / Commit `1eef864`  

---

## 1. Summary of Blocked & Not Run Tests
* **Total Tests Listed in Submission Form:** 70  
* **Tests Executed (Pass + Fail):** 58  
* **Tests Evaluated as Not Applicable (N/A):** 12  
  - Physical IoT Sensor Parsing: UT-001  
  - Physical Broker / Actuator Integration: IT-001, IT-002, IT-008  
  - Hardware IoT Sensor Suite: ST-IOT-001, ST-IOT-002, ST-IOT-003, ST-IOT-004, ST-IOT-005, ST-IOT-006, ST-IOT-007, ST-IOT-008  
* **Tests Blocked:** **0**  
* **Tests Not Run:** **0**  

---

## 2. Explanation of N/A Status
All 12 N/A test cases pertain exclusively to physical microcontroller hardware (ESP32, Arduino, Raspberry Pi), physical MQTT brokers, or mechanical relays/actuators. Because BakeWise is an enterprise web-based AI management software solution utilizing standard cloud REST APIs and PostgreSQL/MySQL, physical hardware tests are not applicable to the system's architecture. 

A formal ISO/IEC 25010 N/A declaration document has been generated and filed under `evidence/ST-IOT_na_declaration.png` and `test-results/iot_na_declaration.txt`.

---

## 3. Blocked Services Assessment
No software services, database connections, or AI pipelines were blocked during execution.
- Local Node.js Express server ran continuously on port 3000.
- Database driver and connection poolers operated with zero network deadlocks.
- Python Scikit-Learn Random Forest microservice executed cleanly with zero runtime crashes.
