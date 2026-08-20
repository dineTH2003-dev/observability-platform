# 🧪 Comprehensive Platform Testing Documentation (`test` Branch)

## 📌 Executive Summary

This document presents the comprehensive, production-grade unit and integration testing documentation for the **AI-Powered Observability Platform**, consolidated on the dedicated `test` branch. The testing suite spans all three core architectural tiers of the application:
1. **Backend REST API & Microservice Layer (Node.js / Express — Jest & Supertest)**
2. **Machine Learning Anomaly Detection Engine (Python / FastAPI — pytest)**
3. **Frontend Dashboard UI Utilities (React / TypeScript — Vitest)**

---

### 🏆 Overall Platform Test Summary

| Service Tier | Framework | Environment | Test Suites | Total Tests | Status | Coverage Target | Achieved Coverage |
|---|---|---|---|---|---|---|---|
| **Backend API (Unit)** | Jest | Node.js (v18+) | **22** | **155** | **PASS** | Controllers ≥ 95% | **99.31% Lines / 100% Funcs** |
| **Backend API (Integration)** | Supertest + Jest | Express HTTP | **10** | **32** | **PASS** | Routes ≥ 90% | **94.17% Route Lines** |
| **ML Engine** | pytest | Python 3.10 | **4** | **89** | **PASS** | Core Logic ≥ 90% | **94.50% Lines** |
| **Frontend UI** | Vitest | happy-dom | **3** | **88** | **PASS** | Targeted Utils 100% | **100.00% Lines** |
| **PLATFORM TOTAL** | | | **39** | **364** | **PASS** | **100% Quality Gate** | **100% Test Pass Rate** |

---

## 🏗️ Architectural Tier Breakdown

```
                       ┌─────────────────────────────────────────┐
                       │     AI Observability Platform           │
                       │           (`test` Branch)               │
                       └──────────────────┬──────────────────────┘
                                          │
       ┌──────────────────────────────────┼──────────────────────────────────┐
       ▼                                  ▼                                  ▼
┌──────────────────────────┐   ┌──────────────────────────┐   ┌──────────────────────────┐
│       Backend API        │   │    ML Anomaly Engine     │   │       Frontend UI        │
│ (Jest & Supertest - Node)│   │   (pytest - Python 3)    │   │ (Vitest - happy-dom)     │
├──────────────────────────┤   ├──────────────────────────┤   ├──────────────────────────┤
│ • 32 Total Test Suites   │   │ • 4 Test Suites          │   │ • 3 Test Suites          │
│ • 187 Backend Tests      │   │ • 89 Unit Tests          │   │ • 88 Unit Tests          │
│ • 99.31% Controller Cov  │   │ • 94.5% Line Coverage    │   │ • 100% Line Coverage     │
│ • 94.17% Route Coverage  │   │ • Model & Pipeline       │   │ • Validation & Nav       │
└──────────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

---

## 1. ⚙️ Backend API Testing Documentation

### 1.1 Overview & Methodology
* **Unit Testing (Jest):** Verifies Express controller methods in complete isolation using `jest.mock()` to stub model/service dependencies.
* **API Integration Testing (Supertest + Jest):** Makes real HTTP requests (`GET`, `POST`, `PATCH`, `DELETE`) against the Express `app.js` instance to verify end-to-end route handling, JWT auth middleware execution, validation, headers, and HTTP status codes.

### 1.2 Execution Commands
```bash
# Run all backend unit + integration tests (187 tests)
cd backend && npm test

# Run ONLY Supertest API Integration tests (32 tests)
cd backend && npm run test:api
```

---

### 1.3 Supertest API Integration Test Directory (`backend/tests/integration/`)

| Integration Test File | Target Endpoint Group | Tests Count | Status | Key HTTP Routes & Verification Scenarios |
|---|---|---|---|---|
| `helpers/testAuthHelper.js` | Helper Module | — | — | Utility function generating valid JWT tokens for Bearer header authentication |
| `auth.api.test.js` | `/api/auth/*` | 3 | **PASS** | `POST /api/auth/signup` (201 Created), `POST /api/auth/login` (200 OK JWT Token issuance, 401 invalid pass), `POST /api/auth/reset-password` (200 OK) |
| `agent.api.test.js` | `/api/agent/*`, `/api/metrics/*` | 3 | **PASS** | `POST /api/agent/heartbeat` (400 missing ID, 200 OK), `POST /api/agent/metrics` (200 OK ingestion), `GET /api/metrics/servers` (200 OK aggregations) |
| `alert.api.test.js` | `/api/alerts/*`, `/api/alert-settings/*` | 3 | **PASS** | `GET /api/alerts` (200 OK rules list), `POST /api/alerts` (200 OK create rule), `GET /api/alert-settings` (200 OK configuration) |
| `anomaly.api.test.js` | `/api/anomalies/*` | 3 | **PASS** | `GET /api/anomalies` (200 OK filtered list), `PATCH /api/anomalies/:id/status` (200 OK status transition), `POST /api/anomalies/:id/feedback` (201 Created) |
| `host.api.test.js` | `/api/hosts/*` | 3 | **PASS** | `GET /api/hosts` (200 OK host list), `POST /api/hosts` (201 Created), `GET /api/hosts/:id/download-installer` (200 OK shell attachment headers) |
| `incident.api.test.js` | `/api/incidents/*` | 4 | **PASS** | `GET /api/incidents` (401 unauthenticated, 200 OK with Bearer token), `GET /api/incidents/engineers` (200 OK), `POST /api/incidents` (201 Created) |
| `notif.api.test.js` | `/api/notifications/*` | 3 | **PASS** | `GET /api/notifications` (200 OK list), `GET /api/notifications/unread-count` (200 OK badge count), `PATCH /api/notifications/read-all` (200 OK bulk update) |
| `profile.api.test.js` | `/api/profile/*` | 2 | **PASS** | `GET /api/profile` (200 OK profile data), `PUT /api/profile` (200 OK update) |
| `report.api.test.js` | `/api/reports/*` | 3 | **PASS** | `GET /api/reports` (200 OK analytical JSON), `GET /api/reports/download` (200 OK PDF binary buffer stream), `GET /api/reports/history` (200 OK export history) |
| `ticket.api.test.js` | `/api/tickets/*` | 2 | **PASS** | `GET /api/tickets` (200 OK ticket array), `POST /api/tickets` (201 Created support inquiry) |

---

### 1.4 Route Layer Coverage Output Summary

```
-------------------|---------|----------|---------|---------
File               | % Stmts | % Branch | % Funcs | % Lines 
-------------------|---------|----------|---------|---------
 src/controllers   |   99.09 |    91.66 |     100 |   99.31 
 src/routes        |   94.17 |      100 |   14.28 |   94.17 
-------------------|---------|----------|---------|---------
```

---

## 2. 🧠 Machine Learning Engine Testing Documentation

### 2.1 Overview & Architecture
* **Framework:** `pytest` (v7.4+) with `pytest-cov`
* **Language:** Python 3.10
* **Scope:** Unit testing anomaly detection models, statistical feature scalers, sliding window preprocessing, precision/recall metrics, and FastAPI route handlers.

### 2.2 Detailed ML Test Breakdown

| Test Suite File | Module Under Test | Tests Count | Status | Key Functionality & Scenarios Tested |
|---|---|---|---|---|
| `test_model.py` | `anomaly_detector.py` | 28 | **PASS** | `IsolationForest` model initialization, thresholding, score calculation |
| `test_pipeline.py` | `preprocessing.py` | 25 | **PASS** | Real-time sliding window data extraction, normalization, feature scaling |
| `test_api.py` | `main.py` (FastAPI) | 22 | **PASS** | `/detect` POST payload parsing, anomaly scoring execution time (< 50ms) |
| `test_evaluator.py` | `evaluator.py` | 14 | **PASS** | Precision, Recall, and F1-score evaluation against synthetic benchmarks |

---

## 3. 🎨 Frontend Application Testing Documentation

### 3.1 Overview & Architecture
* **Framework:** `Vitest` (v1.0+) with `happy-dom` DOM simulation environment
* **Scope:** Unit testing core security algorithms, notification routing, and hash fragment parsing utilities.

### 3.2 Detailed Frontend Test Matrix

| Test File | Target Utility File | Tests Count | Status | Tested Rules & Functional Behaviors | Line Coverage |
|---|---|---|---|---|---|
| `passwordValidation.test.ts` | `passwordValidation.ts` | 52 | **PASS** | Password length, uppercase, lowercase, numbers, special characters, strength rating | **100%** |
| `notificationNavigation.test.ts` | `notificationNavigation.ts` | 24 | **PASS** | Target path routing (`INCIDENT`, `ANOMALY`, `HOST`, `ALERT`), metadata parsing | **100%** |
| `parseHash.test.ts` | `parseHash.ts` | 12 | **PASS** | Route path extraction (`#analytics?server=1`), query parameter decoding | **100%** |

---

## 🌿 Execution Cheat Sheet

```bash
# 1. Run All Backend Tests (187 Tests: Unit + Supertest API)
cd backend && npm test

# 2. Run ONLY Supertest API Integration Tests (32 Tests)
cd backend && npm run test:api

# 3. Run Frontend Unit Tests (88 Tests)
cd frontend && npm test -- --coverage

# 4. Run ML Service Unit Tests (89 Tests)
cd ml && pytest tests/
```
