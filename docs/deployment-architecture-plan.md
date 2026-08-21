# CloudSight Observability Platform — Production Deployment Architecture Plan

**Version**: 2.0 — AWS Amplify + EC2 Architecture  
**Branch Strategy**: `deployment` branch triggers all production CI/CD pipelines  
**Status**: Planning → Ready for Execution

---

## 1. Target Architecture Overview

```
                              ┌─────────────────────────────┐
                              │       GitHub Repository      │
                              │  observability-platform      │
                              └──────────────┬──────────────┘
                                             │
                                    push to `deployment`
                                             │
                         ┌───────────────────┴──────────────────┐
                         │                                      │
                         ▼                                      ▼
               ┌─────────────────┐                  ┌──────────────────────┐
               │  AWS Amplify    │                  │   GitHub Actions     │
               │  Frontend CI/CD │                  │  Backend + ML CI/CD  │
               │                 │                  │                      │
               │ Path: frontend/ │                  │ Path: backend/ ml/   │
               └────────┬────────┘                  └──────────┬───────────┘
                        │                                      │
                        │ npm ci + npm run build               │ docker build
                        ▼                                      │ docker push → ECR
                 Amplify Hosting                               │
                 (HTTPS + CDN)                                 ▼
                        │                                 Amazon ECR
                        │                            (Container Registry)
                        │ HTTPS                              │
                        │                                   ▼
                        │                           ┌───────────────────┐
                        │                           │     AWS EC2       │
                        │                           │  cloudsight-server│
                        │                           │  t3.medium / t2   │
                        │                           │  Ubuntu 24.04 LTS │
                        │                           │                   │
                        │                           │  ┌─────────────┐  │
                        │                           │  │    Nginx    │  │
                        │                           │  │  Port 80/443│  │
                        │                           │  └──────┬──────┘  │
                        │                           │         │         │
                        │                           │  ┌──────▼──────┐  │
                        │                           │  │  Node.js    │  │
                        │                           │  │  Backend    │  │
                        │                           │  │  Port 9000  │  │
                        │                           │  └──────┬──────┘  │
                        │                           │         │         │
                        │                           │  ┌──────▼──────┐  │
                        │                           │  │  ML Worker  │  │
                        │                           │  │  (Python)   │  │
                        │                           │  └─────────────┘  │
                        │                           │         │         │
                        │                           │  ┌──────▼──────┐  │
                        │                           │  │    Redis    │  │
                        │                           │  │  Port 6379  │  │
                        │                           │  └─────────────┘  │
                        │                           └───────────────────┘
                        │                                    │
                        │                                    │ Private VPC
                        │                                    ▼
                        │                          ┌──────────────────────┐
                        └──────── HTTPS API ──────►│     AWS RDS          │
                                                   │     PostgreSQL 15    │
                                                   │     db.t3.micro      │
                                                   └──────────────────────┘
```

---

## 2. Branch & CI/CD Strategy

```
feature/xyz
     │
     ▼ Pull Request
   develop
     │
     ▼ Pull Request + Review
    main
     │
     ▼ PR (approved release)
 deployment  ◄─── THIS TRIGGERS ALL CI/CD
     │
     ├──────────────────────────────────┐
     │                                  │
     ▼                                  ▼
AWS Amplify                       GitHub Actions
frontend/** changes                backend/** + ml/** changes
     │                                  │
     ▼                                  ▼
React SPA Deployed              Docker → ECR → EC2
```

### Branch Rules
| Branch | Purpose | Auto Deploy |
|--------|---------|-------------|
| `feature/*` | Developer work | No |
| `develop` | Integration testing | No |
| `main` | Approved, tested code | No |
| `deployment` | **Production release** | **Yes — both pipelines** |

> ⚠️ **Never push directly to `deployment`.** Always merge from `main` via a Pull Request.

---

## 3. File-by-File Changes Required

### What Already Exists & Works ✅
| File | Status | Notes |
|------|--------|-------|
| `backend/Dockerfile` | ✅ Good | Node.js 20-alpine, PORT 9000 |
| `ml/Dockerfile` | ✅ Good | Python 3.10-slim |
| `docker-compose.prod.yml` | ✅ Good | Redis + Backend + ML |
| `frontend/src/api/api.ts` | ✅ Ready | Uses `VITE_API_BASE_URL` env var correctly |
| `amplify.yml` | ✅ Created | Monorepo config targeting `frontend/` |
| `backend/src/socket.js` | ⚠️ Fix needed | CORS is `"*"` — must be locked to Amplify URL |
| `backend/src/app.js` | ⚠️ Fix needed | CORS is open `cors()` — must be locked to Amplify URL |
| `.github/workflows/deploy.yml` | ⚠️ Update needed | Must trigger on `deployment` branch, remove frontend SCP |

---

## 4. Changes to Make Before Deployment

### Phase A: Code Readiness (Local — Do This First)

#### A1. Fix Backend CORS (Critical)
`backend/src/app.js` currently uses `app.use(cors())` which is wide open.
For production, lock it to the Amplify URL:

```js
// backend/src/app.js
const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,           // Amplify URL (set in .env.prod)
  "http://localhost:5173",            // Local dev
  "http://localhost:3000",            // Local dev alternate
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true,
}));
```

#### A2. Fix Socket.io CORS (Critical)
`backend/src/socket.js` currently uses `origin: "*"`.
Change it to read from environment:

```js
// backend/src/socket.js
io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  }
});
```

#### A3. Update `.env.prod` on EC2
Add `FRONTEND_URL` variable pointing to the Amplify app URL (get this after Amplify is set up):
```env
FRONTEND_URL=https://main.xxxxx.amplifyapp.com
```

#### A4. Update GitHub Actions Workflow
Update `.github/workflows/deploy.yml` to:
1. Trigger on `deployment` branch only
2. Path filters: only run when `backend/**`, `ml/**` change
3. Remove all frontend SCP/S3 steps completely

#### A5. Update `amplify.yml` to Add `VITE_API_BASE_URL` Hint
The Amplify build file is ready. `VITE_API_BASE_URL` will be set via the Amplify Console environment variables.

---

## 5. Updated GitHub Actions Workflow (Backend + ML Only)

File: `.github/workflows/deploy.yml`

```yaml
name: Deploy CloudSight Backend & ML Services

on:
  push:
    branches: [deployment]   # ← ONLY triggers on deployment branch
    paths:
      - 'backend/**'
      - 'ml/**'
      - 'docker-compose.prod.yml'
      - '.github/workflows/deploy.yml'

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}

jobs:
  build-and-push:
    name: Build & Push Docker Images to ECR
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - uses: aws-actions/amazon-ecr-login@v2

      - name: Build & push backend image
        run: |
          docker build -t $ECR_REGISTRY/cloudsight/backend:${{ github.sha }} \
                        -t $ECR_REGISTRY/cloudsight/backend:latest ./backend
          docker push $ECR_REGISTRY/cloudsight/backend:${{ github.sha }}
          docker push $ECR_REGISTRY/cloudsight/backend:latest

      - name: Build & push ML worker image
        run: |
          docker build -t $ECR_REGISTRY/cloudsight/ml-worker:${{ github.sha }} \
                        -t $ECR_REGISTRY/cloudsight/ml-worker:latest ./ml
          docker push $ECR_REGISTRY/cloudsight/ml-worker:${{ github.sha }}
          docker push $ECR_REGISTRY/cloudsight/ml-worker:latest

  deploy-to-ec2:
    name: Deploy Backend & ML to EC2
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - name: SSH Deploy to EC2
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            aws ecr get-login-password --region us-east-1 | \
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}

            docker pull ${{ secrets.ECR_REGISTRY }}/cloudsight/backend:latest
            docker pull ${{ secrets.ECR_REGISTRY }}/cloudsight/ml-worker:latest

            cd ~/observability-platform
            export ECR_REGISTRY=${{ secrets.ECR_REGISTRY }}
            docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --force-recreate

            docker image prune -f
```

---

## 6. Amplify Build Configuration

File: `amplify.yml` (already created at repository root)

```yaml
version: 1
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
```

### Amplify SPA Rewrite Rule (Set in Console)
| Source | Target | Type |
|--------|--------|------|
| `</^[^.]+$\|\.(?!(css\|gif\|ico\|jpg\|js\|png\|txt\|svg\|woff\|woff2\|ttf\|map\|json)$)([^.]+$)/>` | `/index.html` | `200 (Rewrite)` |

### Amplify Environment Variable (Set in Console)
| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `http://<YOUR_ELASTIC_IP>/api` ← (or `https://api.yourdomain.com/api` if domain exists) |

---

## 7. EC2 Nginx Configuration (API Proxy Only — No Static Files)

Since Amplify serves the frontend, Nginx on EC2 only proxies API and WebSocket traffic:

```nginx
server {
    listen 80;
    server_name <YOUR_ELASTIC_IP>;  # Replace with domain when available

    client_max_body_size 10M;

    # Backend REST API
    location /api/ {
        proxy_pass http://127.0.0.1:9000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # WebSocket — Socket.io real-time events
    location /socket.io/ {
        proxy_pass http://127.0.0.1:9000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Root health check
    location / {
        return 200 'CloudSight API Active';
        add_header Content-Type text/plain;
    }
}
```

---

## 8. GitHub Repository Secrets Required

Go to: **GitHub → Settings → Secrets and variables → Actions**

| Secret Name | Where to Get It | Required By |
|-------------|----------------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM → Users → `cloudsight-cicd` → Access Keys (Step 2) | GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | IAM → Users → `cloudsight-cicd` → Access Keys (Step 2) | GitHub Actions |
| `ECR_REGISTRY` | ECR → Registry URI (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`) | GitHub Actions |
| `EC2_HOST` | EC2 → Elastic IP address (e.g. `54.123.45.67`) | GitHub Actions |
| `EC2_SSH_KEY` | Full content of `cloudsight-key.pem` (including `-----BEGIN RSA PRIVATE KEY-----`) | GitHub Actions |

> ✅ `CLOUDFRONT_DIST_ID`, `S3_BUCKET`, and `API_DOMAIN` are **no longer needed**.
> ✅ Amplify manages its own credentials — no AWS secrets needed for frontend.

---

## 9. Phased Execution Order

Follow this exact order. **Do not skip phases.**

### ─── PHASE A: Repository Code Fixes (Local Machine) ───────────────────

```
[ ] A1. Fix CORS in backend/src/app.js (lock to FRONTEND_URL env var)
[ ] A2. Fix Socket.io CORS in backend/src/socket.js (lock to FRONTEND_URL)
[ ] A3. Update .github/workflows/deploy.yml:
        - branch: [deployment]
        - path filters for backend/** and ml/**
        - remove frontend deploy job entirely
[ ] A4. Confirm amplify.yml exists at repo root (already done ✅)
[ ] A5. Commit everything:
        git add .
        git commit -m "feat: production CORS, Amplify CI/CD setup"
        git push origin deployment
```

### ─── PHASE B: EC2 Server Setup (SSH into EC2) ──────────────────────────

```
[ ] B1. SSH into EC2: ssh -i cloudsight-key.pem ubuntu@<ELASTIC_IP>
[ ] B2. Verify Docker is running: docker --version && docker compose version
[ ] B3. Create project directory: mkdir -p ~/observability-platform
[ ] B4. Copy .env.prod to EC2 (nano ~/observability-platform/.env.prod)
[ ] B5. Configure and enable Nginx (see Step 12 in guide)
[ ] B6. Test Nginx: sudo nginx -t && sudo systemctl reload nginx
```

### ─── PHASE C: Database Initialization (On EC2) ─────────────────────────

```
[ ] C1. Clone repo on EC2 to get schema files:
        cd ~/observability-platform
        git clone https://github.com/dineTH2003-dev/observability-platform.git repo_code
[ ] C2. Run database schema:
        psql "host=<RDS_ENDPOINT> user=cloudsight_admin dbname=cloudsight_prod sslmode=require" \
             -f repo_code/database/schema.sql
        psql "host=<RDS_ENDPOINT> user=cloudsight_admin dbname=cloudsight_prod sslmode=require" \
             -f repo_code/database/ml_anomaly_schema.sql
[ ] C3. Verify tables exist: psql and \dt
```

### ─── PHASE D: Backend Manual First Deploy (On EC2) ─────────────────────

```
[ ] D1. Login to ECR manually:
        aws ecr get-login-password --region us-east-1 | \
          docker login --username AWS --password-stdin <ECR_REGISTRY>
[ ] D2. Pull images:
        docker pull <ECR_REGISTRY>/cloudsight/backend:latest
        docker pull <ECR_REGISTRY>/cloudsight/ml-worker:latest
[ ] D3. Start services:
        cd ~/observability-platform
        export ECR_REGISTRY=<YOUR_ECR_REGISTRY>
        docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
[ ] D4. Check all services are running:
        docker compose -f docker-compose.prod.yml ps
[ ] D5. Tail logs for errors:
        docker compose -f docker-compose.prod.yml logs --tail=100 -f backend
[ ] D6. Test API locally on EC2:
        curl http://localhost:9000/
[ ] D7. Test through Nginx:
        curl http://<ELASTIC_IP>/api/health  (or root)
```

### ─── PHASE E: AWS Amplify Setup (AWS Console) ──────────────────────────

```
[ ] E1. Go to AWS Console → search AWS Amplify
[ ] E2. Click "Create new app" → select GitHub
[ ] E3. Authorize Amplify with GitHub account
[ ] E4. Repository: dineTH2003-dev/observability-platform
[ ] E5. Branch: deployment
[ ] E6. ✅ Check "My app is a monorepo"
[ ] E7. Application root: frontend
[ ] E8. Amplify auto-detects amplify.yml — confirm settings look correct
[ ] E9. BEFORE deploying, add Environment Variable:
        Key:   VITE_API_BASE_URL
        Value: http://<YOUR_ELASTIC_IP>/api
[ ] E10. Click "Save and deploy"
[ ] E11. Wait ~2 minutes — watch build logs in Amplify console
[ ] E12. Copy your Amplify URL (e.g. https://main.xxxxx.amplifyapp.com)
```

### ─── PHASE F: SPA Route Fix & CORS Update ──────────────────────────────

```
[ ] F1. Go to Amplify → App → Hosting → Rewrites and redirects
[ ] F2. Add rewrite rule:
        Source: </^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>
        Target: /index.html
        Type:   200 (Rewrite)
[ ] F3. Update .env.prod on EC2 with FRONTEND_URL:
        nano ~/observability-platform/.env.prod
        Add: FRONTEND_URL=https://main.xxxxx.amplifyapp.com
[ ] F4. Restart backend container:
        docker compose -f docker-compose.prod.yml --env-file .env.prod up -d backend
[ ] F5. Open Amplify URL in browser → test login, navigation, data loading
```

### ─── PHASE G: CI/CD Automation Verification ────────────────────────────

```
[ ] G1. Add all GitHub Actions secrets (listed in Section 8 above)
[ ] G2. Make a small change in backend/src/app.js (e.g. add a comment)
[ ] G3. git add . && git commit -m "ci: test backend deployment pipeline"
[ ] G4. git push origin deployment
[ ] G5. Check GitHub → Actions tab → watch pipeline run automatically
[ ] G6. Make a small frontend UI change in frontend/src/
[ ] G7. git push origin deployment
[ ] G8. Check AWS Amplify → app → watch build triggered automatically
[ ] G9. Both pipelines should now work end-to-end
```

---

## 10. Production Verification Checklist

After all phases complete, verify each integration point:

```
[ ] Frontend loads at Amplify URL with correct pages
[ ] Login / Signup works → JWT token stored in localStorage
[ ] Dashboard fetches metrics from EC2 API
[ ] Incidents / Alerts pages load data
[ ] WebSocket real-time events work (anomaly created → dashboard updates)
[ ] ML Worker runs and produces anomaly scores
[ ] Backend → Redis caching works (dashboard fast on second load)
[ ] Backend → RDS reads & writes correctly
[ ] git push → Amplify auto-deploys frontend
[ ] git push backend change → GitHub Actions → ECR → EC2 auto-deploys
```

---

## 11. Cost Estimate (AWS Free Tier)

| Service | Free Tier | Monthly Cost |
|---------|-----------|-------------|
| EC2 t3.medium | NOT free (t2.micro is free) | ~$30/mo (t3.medium) |
| RDS db.t3.micro | 750 hrs/mo free | $0 |
| ECR | 500MB/mo free | $0 (small images) |
| Amplify Hosting | 5GB/mo + 15GB bandwidth free | $0 |
| SSM Parameter Store | Standard params free | $0 |
| Elastic IP | Free if attached to running instance | $0 |

> 💡 **Cost Tip**: If budget is very tight, consider `t2.micro` (Free Tier eligible). However ML Worker + Backend + Redis together may hit memory limits. `t3.medium` is recommended for stability.

---

## 12. Your Final Repository Structure

```
observability-platform/
│
├── .github/
│   └── workflows/
│       └── deploy.yml          ← Backend+ML CI/CD (triggers on deployment branch)
│
├── amplify.yml                 ← Amplify Frontend CI/CD config (monorepo)
│
├── frontend/
│   ├── src/
│   │   └── api/
│   │       └── api.ts          ← Uses VITE_API_BASE_URL env var ✅
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── app.js              ← CORS locked to FRONTEND_URL ← needs fix
│   │   └── socket.js           ← Socket CORS locked to FRONTEND_URL ← needs fix
│   ├── Dockerfile              ← Node.js 20-alpine ✅
│   └── package.json
│
├── ml/
│   ├── app/
│   ├── Dockerfile              ← Python 3.10-slim ✅
│   └── requirements.txt
│
├── database/
│   ├── schema.sql
│   └── ml_anomaly_schema.sql
│
└── docker-compose.prod.yml     ← Redis + Backend + ML Worker ✅
```

---

## 13. Quick Deployment Summary Card

```
TODAY'S ORDER:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Fix backend CORS (app.js + socket.js)
2. Update deploy.yml (deployment branch + no frontend job)
3. git push origin deployment

4. SSH into EC2 → setup Nginx → start Docker containers
5. Initialize RDS database tables

6. Go to AWS Console → Create Amplify App
   → Connect GitHub repo, branch: deployment
   → Set VITE_API_BASE_URL env var
   → Deploy frontend

7. Add SPA rewrite rule in Amplify

8. Update .env.prod with FRONTEND_URL (Amplify URL)
9. Restart backend Docker container

10. Test everything end-to-end in browser
11. Add GitHub Secrets → test CI/CD push

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULT: Full-stack auto-deploying production app on AWS
```
