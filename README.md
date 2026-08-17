# CloudSight — AI-Powered Observability Platform

A full-stack, real-time infrastructure observability platform with AI-driven anomaly detection, automated incident management, and live WebSocket dashboards.

---

## 🏗️ Architecture

```
observability-platform/
├── backend/          # Node.js + Express REST API (Port 9000)
├── frontend/         # React + TypeScript + Vite dashboard (Port 3000)
├── ml/               # Python ML anomaly detection worker
├── database/         # PostgreSQL schema & migrations
├── docs/             # Documentation & architecture diagrams
├── mock_agent.py     # Data simulator for development/testing
└── run_all.sh        # One-command startup script
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **Python** 3.10+
- **PostgreSQL** 14+
- **Redis** (optional — falls back to in-memory cache)

### 1. Database Setup
```bash
psql -U postgres -f database/schema.sql
psql -U postgres -f database/ml_anomaly_schema.sql
psql -U postgres -f database/seed.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env          # Fill in DB credentials and secrets
npm install
npm run dev                    # Starts on http://localhost:9000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev                    # Starts on http://localhost:3000
```

### 4. ML Worker Setup
```bash
cd ml
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
./start_worker.sh
```

### 5. Start Everything at Once
```bash
chmod +x run_all.sh
./run_all.sh
```

---

## 🔑 Default Login

| Email | Password | Role |
|---|---|---|
| `tracka@gmail.com` | `tracka` | Admin |

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query |
| Styling | Tailwind CSS, custom Nebula dark theme |
| Real-time | Socket.IO WebSockets |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 14 |
| Caching | Redis (in-memory fallback) |
| ML | Python, scikit-learn, NumPy, pandas |
| Auth | JWT (access + refresh tokens), email verification |

---

## 📂 Key Directories

| Path | Purpose |
|---|---|
| `backend/src/routes/` | Express route definitions |
| `backend/src/services/` | Business logic layer |
| `backend/src/models/` | Database query layer |
| `frontend/src/api/` | Axios API client layer |
| `frontend/src/app/services/` | Fetch-based service layer |
| `frontend/src/app/pages/` | Page components |
| `frontend/src/app/hooks/` | WebSocket & state hooks |
| `ml/app/detectors/` | ML anomaly detector models |
| `docs/` | Architecture docs & diagrams |

---

## 📖 Documentation

- [Anomaly Detection ML Process](docs/anomaly-detection-ml-process.md)
- [Anomaly Detection Deep Dive](docs/anomaly_detection_deep_dive.md)
- [AWS Deployment Plan](docs/aws-deployment-plan.md)
- [Architecture Diagram](docs/full_architecture_diagram_1786787352402.png)
