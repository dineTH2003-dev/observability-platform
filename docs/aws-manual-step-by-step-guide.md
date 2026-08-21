# Step-by-Step AWS Console & Deployment Guide (AWS Amplify + EC2 Edition)

This guide provides **exact click-by-click instructions** and **copy-paste commands** for deploying your Observability Platform on AWS using **AWS Amplify** for the Frontend React SPA and **EC2 + Docker + RDS** for the Backend & ML services.

---

## Architecture Overview

```
                               GitHub Repository
                                       │
                      ┌────────────────┴────────────────┐
                      │                                 │
                 /frontend                         /backend & /ml
                      │                                 │
                      ▼                                 ▼
                 AWS Amplify                      GitHub Actions
              (Frontend CI/CD)                   (Backend CI/CD)
                      │                                 │
               Build React App                          ▼
                      │                              AWS ECR
                      ▼                                 │
               Amplify Hosting                          ▼
                      │                              AWS EC2
                      │                         (Docker + Nginx)
                      │                                 │
                      └───────── HTTPS API ────────────►│
                                                        ▼
                                                     AWS RDS
                                                  (PostgreSQL)
```

---

## Task Checklist & Status

- [x] **STEP 1**: Redeem AWS Credits & Set Billing Alarm
- [x] **STEP 2**: Create IAM User for GitHub Actions (CI/CD)
- [x] **STEP 3**: Create RDS PostgreSQL Database
- [x] **STEP 4**: Launch EC2 Instance & Download Key Pair
- [x] **STEP 5**: Configure Security Groups (Connect EC2 to RDS)
- [x] **STEP 6**: Allocate Elastic IP (Static Public IP)
- [x] **STEP 7**: Create ECR Repositories (Docker Registries)
- [x] **STEP 8**: Add Secrets to SSM Parameter Store
- [x] **STEP 9**: SSH into EC2 & Install Docker, Nginx, AWS CLI
- [x] **STEP 10**: Configure `.env.prod` on EC2
- [x] **STEP 11**: Initialize Database Tables on RDS
- [ ] **STEP 12**: Configure Nginx API & WebSocket Reverse Proxy on EC2
- [ ] **STEP 13**: Connect GitHub Repository to AWS Amplify Hosting
- [ ] **STEP 14**: Configure SPA Rewrite Rules & Environment Variables in AWS Amplify
- [ ] **STEP 15**: Configure GitHub Repository Secrets & Push Monorepo Code

---

## STEP 1 to STEP 11 (COMPLETED)

*(You have already completed Steps 1 through 11 manually: IAM, RDS, EC2, Elastic IP, ECR, SSM, Docker, `.env.prod`, and Database schemas).*

---

## STEP 12: Configure Nginx API & WebSocket Reverse Proxy on EC2

Since AWS Amplify will host the Frontend on AWS's global network, your EC2 instance only needs Nginx to handle incoming API (`/api/`) and WebSocket (`/socket.io/`) requests and forward them to your Backend container running on Port 9000.

### 12.1 Edit Nginx Site Configuration
SSH into your EC2 instance:
```bash
ssh -i cloudsight-key.pem ubuntu@<YOUR_ELASTIC_IP>
```

Open Nginx site configuration:
```bash
sudo nano /etc/nginx/sites-available/cloudsight
```

Paste this configuration:
```nginx
server {
    listen 80;
    server_name _; # Accepts requests from your Elastic IP or domain

    # Increase max upload size for metric payload / logs
    client_max_body_size 10M;

    # API Requests -> Backend Docker container (Port 9000)
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

    # WebSocket Connections -> Socket.io on Backend (Port 9000)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:9000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Root status check
    location / {
        return 200 'CloudSight API Server Operating Normally';
        add_header Content-Type text/plain;
    }
}
```

### 12.2 Enable Site & Reload Nginx
```bash
sudo ln -sf /etc/nginx/sites-available/cloudsight /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## STEP 13: Connect GitHub Repository to AWS Amplify Hosting

1. Log into the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **AWS Amplify** and click **AWS Amplify**.
3. Click the orange **Create new app** (or **Host web app**) button.
4. Select **GitHub** as the code repository source -> click **Next**.
5. Authorize AWS Amplify to access your GitHub account.
6. Select your repository: `dineTH2003-dev/observability-platform`
7. Select branch: `main` (or `deployment` for initial testing).
8. Amplify will automatically detect `amplify.yml` in the root of your repository!
   - Monorepo setting (`appRoot: frontend`) will automatically target the React application.
9. Click **Next**.

---

## STEP 14: Configure SPA Rewrite Rules & Environment Variables in AWS Amplify

### 14.1 Add Environment Variable (`VITE_API_BASE_URL`)
Before clicking *Save and Deploy* in AWS Amplify:
1. Expand **Advanced settings** (or go to *Environment variables* in Amplify app settings).
2. Click **Add environment variable**:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `http://<YOUR_ELASTIC_IP>/api` (Replace with your EC2 Elastic IP, e.g. `http://54.123.45.67/api`).
3. Click **Save and deploy**. Amplify will build and publish your React app in ~2 minutes!

### 14.2 Configure Single Page Application (SPA) Redirect Rule
To prevent 404 errors when refreshing inner React pages (e.g. `/incidents`, `/metrics`):
1. In the left navigation menu of AWS Amplify, click **Rewrites and redirects**.
2. Click **Edit**.
3. Add a new rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
4. Click **Save**.

---

## STEP 15: Configure GitHub Repository Secrets & Push Monorepo Code

### 15.1 Add GitHub Actions Secrets for Backend CI/CD
Go to your GitHub repository -> **Settings** -> **Secrets and variables** -> **Actions**:
Add these 5 repository secrets for the backend pipeline:

| Secret Name | Value |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | Access Key from Step 2 |
| `AWS_SECRET_ACCESS_KEY` | Secret Key from Step 2 |
| `ECR_REGISTRY` | Your ECR Registry URI prefix from Step 7 |
| `EC2_HOST` | Your Elastic IP address |
| `EC2_SSH_KEY` | Entire content of `cloudsight-key.pem` |

### 15.2 Commit & Push Code to Trigger Pipelines
From your local terminal:
```bash
git add .
git commit -m "feat: setup AWS Amplify frontend and GitHub Actions backend deployment"
git push origin deployment
```

Create a Pull Request and merge into `main` branch.

Now, whenever you push changes:
* **Changes to `frontend/**`**: AWS Amplify automatically builds and deploys your React UI.
* **Changes to `backend/**` or `ml/**`**: GitHub Actions automatically builds Docker images, pushes to ECR, and updates containers on EC2!

---

## Congratulations! 🎉

Your Observability Platform is now running on a **clean, decoupled Monorepo CI/CD architecture** powered by **AWS Amplify Hosting** for Frontend and **AWS EC2 + ECR + RDS** for Backend & ML!
