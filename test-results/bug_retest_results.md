# BakeWise Pre-UAT Bug Retesting & Regression Report

**Project:** BakeWise — AI-Powered Bakery Management System  
**Test Suite:** Defect Tracking & Regression Verification (BUG-001 to BUG-010)  
**Date:** October 12, 2026  
**Build Tested:** Version 2.0.0 (Alpha Release) / Build 2026.10.12 / Commit `1eef864`  

---

## Defect Retest Register

| Bug ID | Found In | Description | Severity | Fix Plan & Lead | Retest Build | Status | Evidence Filename |
|---|---|---|---|---|---|---|---|
| **BUG-001** | UT-014 | Create Staff form password was text by default showing plain password123. | Major | Ceilo Morales: Set type to password & add eye toggle. | Build 2026.10.12 | **Resolved** | evidence/BUG-001_fix_pass_toggle.png |
| **BUG-002** | ST-F-001 | Login password eye toggle button had inverted icons on initial load. | Minor | Ruby Grace Oñes: Fixed display rules & aria labels. | Build 2026.10.12 | **Resolved** | evidence/BUG-002_fix_eye_icons.png |
| **BUG-003** | UT-015 | User email allowed any domain instead of enforcing @bakewise.com restriction. | Major | Ruby Grace Oñes: Added regex pattern to input & validation. | Build 2026.10.12 | **Resolved** | evidence/BUG-003_fix_email_regex.png |
| **BUG-004** | ST-F-006 | Leaflet branch map container threw size calculation warning when hidden in tab. | Minor | Ceilo Morales: Added invalidateSize() call on tab switch. | Build 2026.10.12 | **Resolved** | evidence/BUG-004_fix_map_resize.png |
| **BUG-005** | ST-AI-003 | AI forecast threw JSON parse error when sales history had 0 records. | Major | Ruby Grace Oñes: Added fallback default prediction logic. | Build 2026.10.12 | **Resolved** | evidence/BUG-005_fix_ai_empty.png |
| **BUG-006** | IT-011 | POS cart quantity decrement allowed reducing below 1 item in UI view. | Minor | Ceilo Morales: Bound min="1" and delete handler on zero. | Build 2026.10.12 | **Resolved** | evidence/BUG-006_fix_cart_zero.png |
| **BUG-007** | ST-NF-002 | Browser back button showed cached private pane markup before redirect. | Major | Ruby Grace Oñes: Added instant anti-flicker CSS/JS session check. | Build 2026.10.12 | **Resolved** | evidence/BUG-007_fix_anti_flicker.png |
| **BUG-008** | PT-001 | Chart.js canvas re-draw caused minor memory leak on repeated tab switches. | Minor | Ceilo Morales: Added chart.destroy() before new instance. | Build 2026.10.12 | **Resolved** | evidence/BUG-008_fix_chart_leak.png |
| **BUG-009** | IT-012 | PostgreSQL duplicate key notice on branch seed execution during startup. | Minor | Ruby Grace Oñes: Added ON CONFLICT DO NOTHING to seed SQL. | Build 2026.10.12 | **Resolved** | evidence/BUG-009_fix_pg_seed.png |
| **BUG-010** | ST-F-007 | Shelf-life countdown timer did not update dynamically without refresh. | Minor | Ceilo Morales: Synchronized with setInterval 60s live countdown. | Build 2026.10.12 | **Resolved** | evidence/BUG-010_fix_timer_sync.png |

---

## Retest Verdict
All 10 logged defects have been verified as **RESOLVED** through regression testing on the live codebase. There are 0 open critical, major, or minor defects.
