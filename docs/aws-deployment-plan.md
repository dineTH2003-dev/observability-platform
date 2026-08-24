# CloudSight — Complete AWS Deployment Plan (A to Z)

> Beginner-friendly. Step-by-step. Never deployed to AWS before? This guide covers everything.

---

## Final Architecture

```
GitHub (your code)
   │  push to main
   ▼
GitHub Actions CI/CD
   ├──► Build Docker images → push to Amazon ECR
   ├──► SSH deploy to EC2 (backend + ML + Redis)
   └──► Build React → upload to S3 → invalidate CloudFront

                  Users
                    │ HTTPS
              CloudFront CDN (free SSL)
                 ├── S3 Bucket (React frontend)
                 └── EC2 Nginx :443 (API + WebSockets)
                          │
                    Docker Compose
                    ├── Backend Node.js :9000
                    ├── ML Worker Python (every 60min)
                    └── Redis :6379
                          │
                    Amazon RDS
                    PostgreSQL db.t3.micro
```

### Cost Summary

| Service | Year 1 (Free Tier) | After Free Tier |
|---|---|---|
| EC2 t3.small | $0 | $15.18 |
| EBS 20GB | $0 | $1.60 |
| RDS db.t3.micro | $0 | $13.02 |
| S3 + CloudFront | $0.01 | $0.01 |
| ECR (images) | $0 | $0.10 |
| SSM Parameter Store | $0 | $0 |
| CloudWatch | $0 | $1.00 |
| **TOTAL** | **~$0.01/mo** | **~$30.91/mo** |

---

## PHASE 1 — AWS Account Setup (30 mins)

### Step 1.1 — Log Into AWS Console
1. Go to https://aws.amazon.com → **Sign In**
2. Go to **Billing → Credits** → enter your $200 credit code
3. Set a billing alarm: **CloudWatch → Alarms → Create Alarm**
   - Metric: `EstimatedCharges` > `$35` → notify your email

### Step 1.2 — Create an IAM User for CI/CD
Never use your root account for deployments.

1. Go to **IAM → Users → Create User**
2. Name: `cloudsight-cicd`
3. Attach policies:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonSSMReadOnlyAccess`
4. Go to **Security Credentials → Create Access Key** → choose "CLI"
5. Save the **Access Key ID** and **Secret Access Key** — you'll need these for GitHub

---

## PHASE 2 — AWS Infrastructure (1–2 hours)

### Step 2.1 — Create RDS PostgreSQL Database

1. Go to **RDS → Create Database**
2. Settings:
   - Engine: **PostgreSQL 15**
   - Template: **Free Tier**
   - DB instance identifier: `cloudsight-db`
   - Master username: `cloudsight_admin`
   - Master password: create a strong one (save it!)
   - Instance class: `db.t3.micro`
   - Storage: 20 GB gp2
   - **Public access: NO** (we'll connect from EC2 only)
3. Click **Create Database** — takes ~5 minutes
4. After creation, copy the **Endpoint** (looks like `cloudsight-db.xxxx.us-east-1.rds.amazonaws.com`)

### Step 2.2 — Launch EC2 Instance

1. Go to **EC2 → Launch Instance**
2. Settings:
   - Name: `cloudsight-server`
   - AMI: **Ubuntu Server 24.04 LTS** (Free tier eligible)
   - Instance type: `t3.small`
   - Key pair: **Create new** → name it `cloudsight-key` → **Download .pem file** (keep this safe!)
   - Network: Default VPC
   - Security Group — create new, add these rules:

| Type | Port | Source | Why |
|---|---|---|---|
| SSH | 22 | My IP | Admin access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure traffic |

   - Storage: 20 GB gp3
3. Click **Launch Instance**

### Step 2.3 — Allow EC2 to Talk to RDS

1. Go to **RDS → your database → VPC Security Group**
2. Edit **Inbound Rules → Add Rule**:
   - Type: PostgreSQL, Port: 5432
   - Source: the **Security Group ID** of your EC2 instance
3. This means ONLY your EC2 can reach the database — nothing else

### Step 2.4 — Allocate Elastic IP (Static IP)

1. Go to **EC2 → Elastic IPs → Allocate Elastic IP**
2. Click **Associate** → select your `cloudsight-server`
3. Copy the IP address (e.g., `54.123.45.67`) — this never changes

### Step 2.5 — Create ECR Repositories (Docker Image Registry)

1. Go to **ECR → Create Repository** → name: `cloudsight/backend` → Private → Create
2. Repeat → name: `cloudsight/ml-worker` → Private → Create
3. Copy your **registry URL**: `<account-id>.dkr.ecr.us-east-1.amazonaws.com`

### Step 2.6 — Store Secrets in SSM Parameter Store

Go to **Systems Manager → Parameter Store → Create Parameter** for each:

| Parameter Name | Value |
|---|---|
| `/cloudsight/prod/DB_HOST` | your RDS endpoint |
| `/cloudsight/prod/DB_USER` | `cloudsight_admin` |
| `/cloudsight/prod/DB_PASSWORD` | your RDS password |
| `/cloudsight/prod/DB_NAME` | `cloudsight_prod` |
| `/cloudsight/prod/JWT_SECRET` | run `openssl rand -hex 32` |
| `/cloudsight/prod/JWT_REFRESH_SECRET` | run `openssl rand -hex 32` |
| `/cloudsight/prod/ML_INTERNAL_TOKEN` | run `openssl rand -hex 16` |
| `/cloudsight/prod/EMAIL_PASS` | your Gmail app password |

Use **SecureString** type for all passwords/secrets.

---

## PHASE 3 — Configure EC2 Server (45 mins)

### Step 3.1 — SSH Into Your Server

```bash
# On your local machine
chmod 400 cloudsight-key.pem
ssh -i cloudsight-key.pem ubuntu@54.123.45.67
```

### Step 3.2 — Install Docker, Nginx, AWS CLI

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx awscli git

# Enable Docker and add ubuntu user to docker group
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

# Log out and back in
exit
ssh -i cloudsight-key.pem ubuntu@54.123.45.67

# Verify Docker works
docker --version
```

### Step 3.3 — Configure AWS CLI on EC2

```bash
aws configure
# AWS Access Key ID: (your cicd user key)
# AWS Secret Access Key: (your cicd user secret)
# Default region: us-east-1
# Default output format: json
```

### Step 3.4 — Create Production Environment File

```bash
mkdir -p ~/observability-platform
cat > ~/observability-platform/.env.prod << 'EOF'
NODE_ENV=production
PORT=9000
DB_HOST=<YOUR_RDS_ENDPOINT>
DB_USER=cloudsight_admin
DB_PASSWORD=<YOUR_RDS_PASSWORD>
DB_NAME=cloudsight_prod
DB_PORT=5432
DB_SSL=true
JWT_SECRET=<generated>
JWT_REFRESH_SECRET=<generated>
JWT_EXPIRES_IN=15m
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com
ML_INTERNAL_TOKEN=<generated>
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=cloudsightms@gmail.com
EMAIL_PASS=<gmail_app_password>
REDIS_HOST=redis
REDIS_PORT=6379
BACKEND_API_URL=http://backend:9000/api
EOF
```

### Step 3.5 — Configure Nginx

```bash
sudo tee /etc/nginx/sites-available/cloudsight << 'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/cloudsight /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## PHASE 4 — Dockerize Your Application (Code Changes)

Run these on your **local machine** inside the project folder.

### Step 4.1 — Create `backend/Dockerfile`

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 9000
CMD ["node", "src/server.js"]
```

### Step 4.2 — Create `ml/Dockerfile`

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "-m", "app.jobs.run_worker", "--interval-seconds", "60", "--minutes", "60"]
```

### Step 4.3 — Create `docker-compose.prod.yml`

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    restart: always
    ports:
      - "6379:6379"

  backend:
    image: ${ECR_REGISTRY}/cloudsight/backend:latest
    restart: always
    ports:
      - "9000:9000"
    env_file: .env.prod
    depends_on:
      - redis

  ml-worker:
    image: ${ECR_REGISTRY}/cloudsight/ml-worker:latest
    restart: always
    env_file: .env.prod
    depends_on:
      - backend
```

### Step 4.4 — Create `.dockerignore` (in root)

```
node_modules/
.venv/
dist/
build/
.git/
*.log
logs/
.env
```

### Step 4.5 — Fix Hardcoded URLs in Frontend

These files have `localhost:9000` hardcoded and will break in production:

**`frontend/src/api/alertApi.ts`** — change:
```ts
baseURL: 'http://localhost:9000/api',
```
to:
```ts
baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
```

**`frontend/src/api/anomalyApi.ts`** — same fix

**`frontend/src/api/incidentApi.ts`** — same fix

**`frontend/src/app/pages/auth/ForgotPassword.tsx`** — change:
```ts
await axios.post("http://localhost:9000/api/auth/forgot-password", {
```
to:
```ts
await axios.post(`${import.meta.env.VITE_API_BASE_URL ?? ''}/auth/forgot-password`, {
```

**`frontend/src/app/pages/auth/ResetPassword.tsx`** — same fix for reset-password URL

---

## PHASE 5 — Initialize Database on RDS

Run these from your EC2 instance after the app is deployed:

```bash
# Install psql client
sudo apt install -y postgresql-client

# Run schema on RDS (replace endpoint)
psql "host=<RDS_ENDPOINT> user=cloudsight_admin dbname=cloudsight_prod sslmode=require" \
  -f ~/observability-platform/database/schema.sql

psql "host=<RDS_ENDPOINT> user=cloudsight_admin dbname=cloudsight_prod sslmode=require" \
  -f ~/observability-platform/database/ml_anomaly_schema.sql

psql "host=<RDS_ENDPOINT> user=cloudsight_admin dbname=cloudsight_prod sslmode=require" \
  -f ~/observability-platform/database/add_dashboard_indexes.sql
```

---

## PHASE 6 — Frontend: S3 + CloudFront

### Step 6.1 — Create S3 Bucket

1. **S3 → Create bucket**
   - Name: `cloudsight-frontend-prod`
   - Region: `us-east-1`
   - Uncheck **Block all public access**
2. Bucket → **Properties → Static website hosting → Enable**
   - Index document: `index.html`
   - Error document: `index.html` (for SPA routing)

### Step 6.2 — Create CloudFront Distribution

1. **CloudFront → Create Distribution**
   - Origin domain: your S3 bucket
   - Viewer protocol policy: **Redirect HTTP to HTTPS**
   - Default root object: `index.html`
2. **Error pages → Create custom error response**:
   - HTTP error: 403 → Response page: `/index.html` → HTTP 200
   - HTTP error: 404 → Response page: `/index.html` → HTTP 200
3. After creation, copy the **Distribution ID** and **CloudFront domain** (e.g., `d1abc.cloudfront.net`)

---

## PHASE 7 — CI/CD Pipeline with GitHub Actions

Create this file: `.github/workflows/deploy.yml`

```yaml
name: Deploy CloudSight

on:
  push:
    branches: [main]

env:
  AWS_REGION: us-east-1
  ECR_REGISTRY: ${{ secrets.ECR_REGISTRY }}

jobs:

  # ── Job 1: Build & push Docker images to ECR ──
  build-and-push:
    name: Build Docker Images
    runs-on: ubuntu-latest
    outputs:
      image-tag: ${{ steps.meta.outputs.sha }}
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & push backend image
        run: |
          docker build -t $ECR_REGISTRY/cloudsight/backend:${{ github.sha }} ./backend
          docker push $ECR_REGISTRY/cloudsight/backend:${{ github.sha }}
          docker tag $ECR_REGISTRY/cloudsight/backend:${{ github.sha }} $ECR_REGISTRY/cloudsight/backend:latest
          docker push $ECR_REGISTRY/cloudsight/backend:latest

      - name: Build & push ML worker image
        run: |
          docker build -t $ECR_REGISTRY/cloudsight/ml-worker:${{ github.sha }} ./ml
          docker push $ECR_REGISTRY/cloudsight/ml-worker:${{ github.sha }}
          docker tag $ECR_REGISTRY/cloudsight/ml-worker:${{ github.sha }} $ECR_REGISTRY/cloudsight/ml-worker:latest
          docker push $ECR_REGISTRY/cloudsight/ml-worker:latest

  # ── Job 2: Deploy to EC2 ──
  deploy-backend:
    name: Deploy to EC2
    runs-on: ubuntu-latest
    needs: build-and-push
    steps:
      - uses: actions/checkout@v4

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            # Login to ECR
            aws ecr get-login-password --region us-east-1 | \
              docker login --username AWS --password-stdin ${{ secrets.ECR_REGISTRY }}

            # Pull latest images
            docker pull ${{ secrets.ECR_REGISTRY }}/cloudsight/backend:latest
            docker pull ${{ secrets.ECR_REGISTRY }}/cloudsight/ml-worker:latest

            # Restart with new images
            cd ~/observability-platform
            ECR_REGISTRY=${{ secrets.ECR_REGISTRY }} \
              docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --pull always

            # Clean up old images
            docker image prune -f

  # ── Job 3: Build & deploy frontend ──
  deploy-frontend:
    name: Deploy Frontend to S3
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Build React app
        working-directory: frontend
        run: |
          npm ci
          VITE_API_BASE_URL=https://${{ secrets.API_DOMAIN }}/api npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Upload to S3
        run: aws s3 sync frontend/dist/ s3://${{ secrets.S3_BUCKET }} --delete

      - name: Invalidate CloudFront cache
        run: |
          aws cloudfront create-invalidation \
            --distribution-id ${{ secrets.CLOUDFRONT_DIST_ID }} \
            --paths "/*"
```

### GitHub Secrets to Add

Go to: **GitHub Repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret Name | Where to Get It |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM user `cloudsight-cicd` → Access Key |
| `AWS_SECRET_ACCESS_KEY` | IAM user `cloudsight-cicd` → Secret Key |
| `ECR_REGISTRY` | `<account-id>.dkr.ecr.us-east-1.amazonaws.com` |
| `EC2_HOST` | Your Elastic IP (e.g., `54.123.45.67`) |
| `EC2_SSH_KEY` | Full contents of `cloudsight-key.pem` |
| `S3_BUCKET` | `cloudsight-frontend-prod` |
| `CLOUDFRONT_DIST_ID` | CloudFront distribution ID (e.g., `E1ABC2DEFGHI`) |
| `API_DOMAIN` | `api.yourdomain.com` or your EC2 IP |

---

## PHASE 8 — SSL Certificate (HTTPS)

After pointing your domain's DNS A record to your Elastic IP:

```bash
# SSH into EC2 and run:
sudo certbot --nginx -d api.yourdomain.com \
  --non-interactive --agree-tos -m your@email.com
```

Certbot auto-renews every 90 days — nothing else needed.

---

## PHASE 9 — First Manual Deploy & Verification

### On your local machine, do the first deploy manually:

```bash
# 1. Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin <ECR_REGISTRY>

# 2. Build and push images
docker build -t <ECR_REGISTRY>/cloudsight/backend:latest ./backend
docker push <ECR_REGISTRY>/cloudsight/backend:latest

docker build -t <ECR_REGISTRY>/cloudsight/ml-worker:latest ./ml
docker push <ECR_REGISTRY>/cloudsight/ml-worker:latest

# 3. SSH into EC2 and start everything
ssh -i cloudsight-key.pem ubuntu@54.123.45.67

cd ~/observability-platform
git clone https://github.com/dineTH2003-dev/observability-platform.git .
ECR_REGISTRY=<ECR_REGISTRY> docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 4. Check all containers are running
docker compose -f docker-compose.prod.yml ps

# 5. Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail 30
```

### Verification Checklist

```bash
# Test backend API
curl http://54.123.45.67:9000/
# Expected: {"message":"AIOps Backend Running","env":"production"}

# Test via Nginx (HTTPS)
curl https://api.yourdomain.com/

# Check ML worker is running
docker compose -f docker-compose.prod.yml logs ml-worker --tail 20

# Check database connection
docker compose -f docker-compose.prod.yml exec backend \
  node -e "require('./src/config/db').connectDatabase().then(()=>console.log('DB OK'))"
```

---

## Complete Checklist

### AWS Setup
- [ ] Apply $200 credits in Billing console
- [ ] Set billing alarm at $35
- [ ] Create IAM user `cloudsight-cicd` with required policies
- [ ] Launch EC2 t3.small (Ubuntu 24.04)
- [ ] Allocate and associate Elastic IP
- [ ] Create RDS PostgreSQL db.t3.micro
- [ ] Allow EC2 Security Group to access RDS port 5432
- [ ] Create ECR repos: `cloudsight/backend` and `cloudsight/ml-worker`
- [ ] Add all secrets to SSM Parameter Store
- [ ] Create S3 bucket for frontend
- [ ] Create CloudFront distribution

### Code Changes
- [ ] `backend/Dockerfile`
- [ ] `ml/Dockerfile`
- [ ] `.dockerignore`
- [ ] `docker-compose.prod.yml`
- [ ] Fix `alertApi.ts` hardcoded localhost URL
- [ ] Fix `anomalyApi.ts` hardcoded localhost URL
- [ ] Fix `incidentApi.ts` hardcoded localhost URL
- [ ] Fix `ForgotPassword.tsx` hardcoded localhost URL
- [ ] Fix `ResetPassword.tsx` hardcoded localhost URL
- [ ] `.github/workflows/deploy.yml`

### EC2 Server
- [ ] SSH in, install Docker + Nginx + AWS CLI
- [ ] Configure AWS CLI with IAM credentials
- [ ] Create `.env.prod` with all production values
- [ ] Configure Nginx config and reload

### Database
- [ ] Run `schema.sql` on RDS
- [ ] Run `ml_anomaly_schema.sql` on RDS
- [ ] Run `add_dashboard_indexes.sql` on RDS

### GitHub CI/CD
- [ ] Add all 8 GitHub repository secrets
- [ ] Push to `main` branch → verify Actions tab shows green

### Verification
- [ ] Backend API responds at EC2 IP
- [ ] Frontend loads on CloudFront domain
- [ ] Socket.IO connects (check browser Network tab → WS)
- [ ] ML worker shows activity in logs every 60 minutes
- [ ] Login/register works end-to-end
