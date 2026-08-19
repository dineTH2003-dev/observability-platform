# Step-by-Step AWS Console & Server Setup Guide (Beginner Friendly)

This guide provides **exact click-by-click instructions** and **copy-paste commands** for every manual step required to deploy your Observability Platform on AWS.

---

## Task Checklist & Overview

- [ ] **STEP 1**: Redeem AWS Credits & Set Billing Alarm
- [ ] **STEP 2**: Create IAM User for GitHub Actions (CI/CD)
- [ ] **STEP 3**: Create RDS PostgreSQL Database
- [ ] **STEP 4**: Launch EC2 Instance & Download Key Pair
- [ ] **STEP 5**: Configure Security Groups (Connect EC2 to RDS)
- [ ] **STEP 6**: Allocate Elastic IP (Static Public IP)
- [ ] **STEP 7**: Create ECR Repositories (Docker Registries)
- [ ] **STEP 8**: Add Secrets to SSM Parameter Store
- [ ] **STEP 9**: SSH into EC2 & Install Docker, Nginx, AWS CLI
- [ ] **STEP 10**: Configure Nginx Reverse Proxy & `.env.prod` on EC2
- [ ] **STEP 11**: Initialize Database Tables on RDS
- [ ] **STEP 12**: Create S3 Bucket for Frontend
- [ ] **STEP 13**: Create CloudFront Distribution with SPA Rewrite Rules
- [ ] **STEP 14**: Configure GitHub Repository Secrets & Push to `main`
- [ ] **STEP 15**: Enable Free SSL (HTTPS) via Certbot

---

## STEP 1: Redeem AWS Credits & Set Billing Alarm

### 1.1 Redeem Credits
1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. In the top search bar, type **Billing** and select **Billing and Cost Management**.
3. In the left navigation menu, click **Credits** (under *Billing*).
4. Click **Redeem credit**.
5. Type your **Credit Code** and click **Redeem credit**.

### 1.2 Set a Billing Alarm (Prevent Surprises)
1. Search for **CloudWatch** in the top search bar and click it.
2. Ensure your region (top right dropdown) is **US East (N. Virginia) `us-east-1`** (Billing metrics are only stored in `us-east-1`).
3. In the left sidebar, click **Alarms** -> **All alarms**.
4. Click the orange **Create alarm** button.
5. Click **Select metric** -> click **Billing** -> click **Total Estimated Charge**.
6. Check the box next to **USD** (`EstimatedCharges`) and click **Select metric**.
7. Under *Whenever EstimatedCharges is...*, set **Greater than** `35` (USD).
8. Click **Next**.
9. Select **Create new topic** under *Notification*. Enter your email address and click **Create topic**.
10. Check your email inbox and click **Confirm subscription** in the confirmation email from AWS!
11. Back in AWS, click **Next**, enter Alarm name `CloudSight-Billing-Alarm`, click **Next**, and click **Create alarm**.

---

## STEP 2: Create IAM User for GitHub Actions CI/CD

1. Search for **IAM** in the top search bar and click **IAM**.
2. In the left menu, click **Users** -> click **Create user** (top right).
3. **User name**: `cloudsight-cicd` -> Click **Next**.
4. Select **Attach policies directly**.
5. Search for and check the box for each of these 4 policies:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonSSMReadOnlyAccess`
6. Click **Next** -> click **Create user**.
7. Click on your newly created user (`cloudsight-cicd`).
8. Click the **Security credentials** tab.
9. Scroll down to **Access keys** and click **Create access key**.
10. Select **Command Line Interface (CLI)** -> check the acknowledgment checkbox -> click **Next**.
11. Click **Create access key**.
12. **IMPORTANT**: Copy both **Access key ID** and **Secret access key** (or click *Download .csv file*). Keep these open for STEP 14!

---

## STEP 3: Create RDS PostgreSQL Database

1. Search for **RDS** in the top search bar and click **RDS**.
2. Click the orange **Create database** button.
3. Choose configuration options:
   - **Database creation method**: Standard create
   - **Engine type**: PostgreSQL
   - **Engine Version**: PostgreSQL 15.x (or latest 15.x)
   - **Templates**: **Free tier**
   - **DB instance identifier**: `cloudsight-db`
   - **Master username**: `cloudsight_admin`
   - **Master password**: Enter a strong password (e.g. `CloudSight2026SecurePass!`) and write it down!
   - **Confirm master password**: Re-enter password.
   - **DB instance class**: `db.t3.micro` (or `db.t4g.micro`)
   - **Storage type**: General Purpose SSD (gp2 or gp3)
   - **Allocated storage**: `20` GB
   - **Connectivity**:
     - **Public access**: Select **No** (Security best practice: only EC2 can talk to RDS).
   - **Initial database name**: Expand *Additional configuration* at the bottom -> Type **DB name**: `cloudsight_prod`
4. Click **Create database**. *(Takes ~3-5 minutes to provision).*
5. Once the status shows **Available**, click on `cloudsight-db`.
6. Under **Connectivity & security**, copy the **Endpoint** string (e.g., `cloudsight-db.c123456789.us-east-1.rds.amazonaws.com`).

---

## STEP 4: Launch EC2 Instance & Download Key Pair

1. Search for **EC2** in the top search bar and click **EC2**.
2. Click the orange **Launch instance** button.
3. **Name**: `cloudsight-server`
4. **Application and OS Images (Amazon Machine Image)**: Select **Ubuntu** (Ubuntu Server 24.04 LTS, 64-bit x86).
5. **Instance type**: Select **`t3.medium`** (2 vCPU, 4 GiB RAM — ideal for future Kafka integration).
6. **Key pair (login)**:
   - Click **Create new key pair**.
   - Key pair name: `cloudsight-key`
   - Key pair type: RSA
   - Private key file format: `.pem`
   - Click **Create key pair** -> Save the downloaded `cloudsight-key.pem` file safely on your computer!
7. **Network settings**:
   - Click **Edit** on the right.
   - Security group name: `cloudsight-ec2-sg`
   - Description: `Security group for CloudSight EC2 server`
   - Under *Inbound security groups rules*, add these 3 rules:
     - **Rule 1**: Type `SSH`, Port `22`, Source `My IP` (for security).
     - **Rule 2**: Click *Add security group rule* -> Type `HTTP`, Port `80`, Source `Anywhere-IPv4` (`0.0.0.0/0`).
     - **Rule 3**: Click *Add security group rule* -> Type `HTTPS`, Port `443`, Source `Anywhere-IPv4` (`0.0.0.0/0`).
8. **Configure storage**: Change size to `20` GiB (gp3).
9. Click **Launch instance**.

---

## STEP 5: Configure Security Groups (Connect EC2 to RDS)

Now we must allow EC2 to connect to PostgreSQL on RDS:

1. Go to **EC2** -> Click **Security Groups** in the left menu.
2. Find the Security Group ID for `cloudsight-ec2-sg` (e.g., `sg-0abc12345678`). Copy this ID.
3. Go back to **RDS** -> Click **Databases** -> Click `cloudsight-db`.
4. Under **Connectivity & security**, click the link under **VPC security groups** (e.g. `rds-ec2-1` or `default`).
5. Click the **Inbound rules** tab -> Click **Edit inbound rules**.
6. Click **Add rule**:
   - **Type**: `PostgreSQL` (Port `5432`)
   - **Source**: Select **Custom** -> paste your EC2 Security Group ID (`sg-0abc12345678`).
7. Click **Save rules**. Now EC2 has exclusive access to RDS!

---

## STEP 6: Allocate Elastic IP (Static Public IP)

1. In the EC2 left sidebar, scroll down to *Network & Security* and click **Elastic IPs**.
2. Click **Allocate Elastic IP address** -> click **Allocate**.
3. Select your newly created Elastic IP -> click **Actions** (top right) -> click **Associate Elastic IP address**.
4. **Resource type**: Instance
5. **Instance**: Select your `cloudsight-server` instance.
6. Click **Associate**.
7. Copy the Elastic IP address (e.g. `54.123.45.67`).

---

## STEP 7: Create ECR Repositories (Docker Registries)

1. Search for **ECR** in the top search bar and click **Elastic Container Registry**.
2. Click **Create repository**.
3. **Repository name**: `cloudsight/backend`
4. Leave Tag immutability disabled -> click **Create repository**.
5. Click **Create repository** again.
6. **Repository name**: `cloudsight/ml-worker`
7. Click **Create repository**.
8. Copy your registry URI prefix shown above the table (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`).

---

## STEP 8: Store Secrets in SSM Parameter Store

1. Search for **Systems Manager** in the top search bar and click it.
2. In the left menu, click **Parameter Store**.
3. Click **Create parameter** for each of the following keys:

| Parameter Name | Type | Value |
| :--- | :--- | :--- |
| `/cloudsight/prod/DB_HOST` | String | Your RDS Endpoint from STEP 3 |
| `/cloudsight/prod/DB_USER` | String | `cloudsight_admin` |
| `/cloudsight/prod/DB_PASSWORD` | SecureString | Your RDS Password from STEP 3 |
| `/cloudsight/prod/DB_NAME` | String | `cloudsight_prod` |
| `/cloudsight/prod/JWT_SECRET` | SecureString | A long random string (e.g. `9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c`) |
| `/cloudsight/prod/JWT_REFRESH_SECRET` | SecureString | Another long random string |
| `/cloudsight/prod/ML_INTERNAL_TOKEN` | SecureString | A random secret token |
| `/cloudsight/prod/EMAIL_PASS` | SecureString | Gmail App Password (if using Gmail SMTP) |

---

## STEP 9: SSH into EC2 & Install Docker, Nginx, AWS CLI

Open a terminal on your computer where `cloudsight-key.pem` is located:

```bash
# Set proper permissions for key file
chmod 400 cloudsight-key.pem

# SSH into your EC2 instance (Replace 54.123.45.67 with your Elastic IP)
ssh -i cloudsight-key.pem ubuntu@54.123.45.67
```

Once connected to your EC2 server, execute these commands:

```bash
# 1. Update Ubuntu packages
sudo apt update && sudo apt upgrade -y

# 2. Install Docker, Docker Compose, Nginx, Certbot, AWS CLI, PostgreSQL Client, Git
sudo apt install -y docker.io docker-compose-v2 nginx certbot python3-certbot-nginx awscli postgresql-client git

# 3. Enable Docker service and add ubuntu user to docker group
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu

# 4. Exit SSH and reconnect so group changes take effect
exit
ssh -i cloudsight-key.pem ubuntu@54.123.45.67

# 5. Verify Docker runs without sudo
docker --version
```

Configure AWS CLI on the EC2 instance:
```bash
aws configure
```
- **AWS Access Key ID**: Paste Access Key from STEP 2
- **AWS Secret Access Key**: Paste Secret Key from STEP 2
- **Default region name**: `us-east-1`
- **Default output format**: `json`

---

## STEP 10: Configure Nginx Reverse Proxy & `.env.prod` on EC2

### 10.1 Create Project Directory & `.env.prod` File
Run on your EC2 instance:

```bash
mkdir -p ~/observability-platform
cd ~/observability-platform

nano .env.prod
```
Paste the following content into `.env.prod` (replace placeholders with your real values):

```env
NODE_ENV=production
PORT=9000
DB_HOST=cloudsight-db.xxxx.us-east-1.rds.amazonaws.com
DB_USER=cloudsight_admin
DB_PASSWORD=YourSecureRDSPassword123!
DB_NAME=cloudsight_prod
DB_PORT=5432
DB_SSL=true

JWT_SECRET=9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c
JWT_REFRESH_SECRET=1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d
JWT_EXPIRES_IN=15m

FRONTEND_URL=https://api.yourdomain.com
BACKEND_URL=https://api.yourdomain.com
ML_INTERNAL_TOKEN=super_secure_ml_token_2026

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=cloudsightms@gmail.com
EMAIL_PASS=your_gmail_app_password

REDIS_HOST=redis
REDIS_PORT=6379
BACKEND_API_URL=http://backend:9000/api
```
Press `Ctrl + O`, `Enter` to save, and `Ctrl + X` to exit nano.

### 10.2 Configure Nginx Reverse Proxy
```bash
sudo nano /etc/nginx/sites-available/cloudsight
```
Paste this configuration:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com; # Or use your Elastic IP temporarily if no domain

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
```
Enable the site in Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/cloudsight /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

---

## STEP 11: Initialize Database Tables on RDS

Clone your repository to EC2 to run database schemas directly against RDS:

```bash
cd ~/observability-platform
git clone https://github.com/dineTH2003-dev/observability-platform.git repo_code

# Run SQL schema files against RDS database
psql "host=YOUR_RDS_ENDPOINT user=cloudsight_admin dbname=cloudsight_prod sslmode=require" -f repo_code/database/schema.sql

psql "host=YOUR_RDS_ENDPOINT user=cloudsight_admin dbname=cloudsight_prod sslmode=require" -f repo_code/database/ml_anomaly_schema.sql

psql "host=YOUR_RDS_ENDPOINT user=cloudsight_admin dbname=cloudsight_prod sslmode=require" -f repo_code/database/add_dashboard_indexes.sql
```

---

## STEP 12: Create S3 Bucket for Frontend

1. Search for **S3** in top search bar -> click **S3**.
2. Click **Create bucket**.
3. **Bucket name**: `cloudsight-frontend-prod` *(Must be globally unique, e.g. `cloudsight-frontend-prod-1234`)*.
4. **AWS Region**: `us-east-1` (US East N. Virginia).
5. **Object Ownership**: ACLs disabled (recommended).
6. **Block Public Access settings for this bucket**:
   - Uncheck **Block *all* public access**.
   - Check the acknowledgement box: *"I acknowledge that the current settings may result in this bucket and the objects within it becoming public."*
7. Click **Create bucket**.
8. Click on your newly created bucket -> Click the **Properties** tab.
9. Scroll down to the bottom -> **Static website hosting** -> Click **Edit**.
10. Select **Enable**.
11. **Index document**: `index.html`
12. **Error document**: `index.html`
13. Click **Save changes**.

---

## STEP 13: Create CloudFront Distribution with SPA Rewrite Rules

1. Search for **CloudFront** in top search bar -> click **CloudFront**.
2. Click **Create distribution**.
3. **Origin domain**: Click the field and select your S3 bucket endpoint (e.g. `cloudsight-frontend-prod.s3.amazonaws.com`).
4. **Viewer protocol policy**: Select **Redirect HTTP to HTTPS**.
5. **Allowed HTTP methods**: GET, HEAD.
6. Scroll down to **Default root object**: Type `index.html`.
7. Click **Create distribution**. *(Takes ~2-3 minutes to deploy)*.
8. Once created, click on the **Error pages** tab inside your CloudFront distribution -> Click **Create custom error response**.
   - **HTTP error code**: `403: Forbidden`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`
   - Click **Create custom error response**.
9. Click **Create custom error response** again for 404:
   - **HTTP error code**: `404: Not Found`
   - **Customize error response**: Yes
   - **Response page path**: `/index.html`
   - **HTTP Response code**: `200: OK`
   - Click **Create custom error response**.
10. Copy your **Distribution ID** (e.g. `E1ABC2DEFGHIJK`) and **Distribution Domain Name** (e.g. `d123456789.cloudfront.net`).

---

## STEP 14: Configure GitHub Repository Secrets & Push to `main`

1. Go to your GitHub repository: `github.com/dineTH2003-dev/observability-platform`
2. Click **Settings** (top tab) -> In the left menu, expand **Secrets and variables** -> click **Actions**.
3. Click the green **New repository secret** button for each of these 8 secrets:

| Secret Name | Value to Enter |
| :--- | :--- |
| `AWS_ACCESS_KEY_ID` | Access Key ID from STEP 2 |
| `AWS_SECRET_ACCESS_KEY` | Secret Access Key from STEP 2 |
| `ECR_REGISTRY` | Your ECR Registry URI prefix from STEP 7 (e.g. `123456789012.dkr.ecr.us-east-1.amazonaws.com`) |
| `EC2_HOST` | Your Elastic IP address from STEP 6 (e.g. `54.123.45.67`) |
| `EC2_SSH_KEY` | Open `cloudsight-key.pem` in text editor, copy entire content including `-----BEGIN RSA PRIVATE KEY-----` |
| `S3_BUCKET` | Your S3 Bucket name from STEP 12 (e.g. `cloudsight-frontend-prod`) |
| `CLOUDFRONT_DIST_ID` | Distribution ID from STEP 13 (e.g. `E1ABC2DEFGHIJK`) |
| `API_DOMAIN` | Your domain or Elastic IP (e.g. `api.yourdomain.com`) |

4. Once all 8 secrets are added, push your changes to GitHub on your machine:
```bash
git add .
git commit -m "feat: complete AWS deployment setup with CI/CD"
git push origin deployment
```
Create a Pull Request and merge into `main` branch (or push directly to `main`).
5. Click the **Actions** tab on GitHub and watch your CI/CD pipeline build Docker containers, push to ECR, deploy to EC2, and upload frontend to S3 automatically!

---

## STEP 15: Enable Free SSL (HTTPS) via Certbot

Once your domain DNS A record points to your Elastic IP:

SSH into your EC2 server and run:
```bash
sudo certbot --nginx -d api.yourdomain.com
```
Follow the prompts to enter your email and agree to terms. Certbot will automatically install HTTPS SSL certificates and configure auto-renewal!

---

## Congratulations! 🎉

Your CloudSight Observability Platform is now fully deployed on AWS with automated CI/CD continuous deployment!
