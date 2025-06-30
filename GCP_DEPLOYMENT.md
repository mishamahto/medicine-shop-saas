# 🚀 GCP Serverless Deployment Guide - Medicine Shop SaaS

## 🎯 **Why GCP Serverless?**

- ✅ **Generous Free Tier** - 2M requests/month on Cloud Run
- ✅ **Persistent Database** - Cloud SQL PostgreSQL
- ✅ **Auto-scaling** - Scales to zero when not used
- ✅ **Global CDN** - Cloud CDN for fast delivery
- ✅ **Enterprise Security** - Google's security infrastructure
- ✅ **Cost-effective** - Pay only for what you use

---

## 🏗️ **GCP Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloud CDN     │    │   Cloud Run     │    │   Cloud SQL     │
│   (Static)      │───▶│   (Backend)     │───▶│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Cloud Run     │
                       │   (Frontend)    │
                       └─────────────────┘
```

---

## 📋 **Step 1: GCP Services We'll Use**

### **Core Services:**
1. **Cloud Run** - Serverless containers for backend and frontend
2. **Cloud SQL** - Managed PostgreSQL database
3. **Cloud Storage** - Static file hosting (alternative)
4. **Cloud CDN** - Global content delivery
5. **Secret Manager** - Environment variables and secrets

### **Additional Services:**
- **Cloud Build** - Automated deployments
- **Cloud Logging** - Monitoring and logs
- **Cloud Monitoring** - Performance monitoring

---

## 🚀 **Step 2: Prepare Your Application**

### **2.1 Update Database Configuration**
Replace SQLite with PostgreSQL:

```javascript
// server/database/init.js
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### **2.2 Create Dockerfile for Backend**
```dockerfile
# server/Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
```

### **2.3 Create Dockerfile for Frontend**
```dockerfile
# client/Dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔧 **Step 3: GCP Setup**

### **3.1 Install Google Cloud CLI**
```bash
# macOS
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init
```

### **3.2 Enable Required APIs**
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com
```

### **3.3 Create Project (if needed)**
```bash
gcloud projects create medicine-shop-saas --name="Medicine Shop SaaS"
gcloud config set project medicine-shop-saas
```

---

## 🗄️ **Step 4: Database Setup**

### **4.1 Create Cloud SQL Instance**
```bash
gcloud sql instances create medicine-shop-db \
  --database-version=POSTGRES_14 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --backup-start-time=02:00 \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=02:00
```

### **4.2 Create Database**
```bash
gcloud sql databases create medicine_shop \
  --instance=medicine-shop-db
```

### **4.3 Create User**
```bash
gcloud sql users create medicine-shop-user \
  --instance=medicine-shop-db \
  --password=YOUR_SECURE_PASSWORD
```

### **4.4 Get Connection Info**
```bash
gcloud sql instances describe medicine-shop-db \
  --format="value(connectionName)"
```

---

## 🔐 **Step 5: Environment Variables**

### **5.1 Store Secrets in Secret Manager**
```bash
# Database credentials
echo -n "YOUR_DB_HOST" | gcloud secrets create db-host --data-file=-
echo -n "5432" | gcloud secrets create db-port --data-file=-
echo -n "medicine_shop" | gcloud secrets create db-name --data-file=-
echo -n "medicine-shop-user" | gcloud secrets create db-user --data-file=-
echo -n "YOUR_SECURE_PASSWORD" | gcloud secrets create db-password --data-file=-
echo -n "YOUR_JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
```

### **5.2 Create .env.yaml for Cloud Run**
```yaml
# server/.env.yaml
DB_HOST: "YOUR_DB_HOST"
DB_PORT: "5432"
DB_NAME: "medicine_shop"
DB_USER: "medicine-shop-user"
DB_PASSWORD: "YOUR_SECURE_PASSWORD"
JWT_SECRET: "YOUR_JWT_SECRET"
NODE_ENV: "production"
```

---

## 🚀 **Step 6: Deploy Backend**

### **6.1 Build and Deploy Backend**
```bash
cd server

# Build container
gcloud builds submit --tag gcr.io/medicine-shop-saas/backend

# Deploy to Cloud Run
gcloud run deploy medicine-shop-backend \
  --image gcr.io/medicine-shop-saas/backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets DB_HOST=db-host:latest \
  --set-secrets DB_PORT=db-port:latest \
  --set-secrets DB_NAME=db-name:latest \
  --set-secrets DB_USER=db-user:latest \
  --set-secrets DB_PASSWORD=db-password:latest \
  --set-secrets JWT_SECRET=jwt-secret:latest
```

### **6.2 Get Backend URL**
```bash
gcloud run services describe medicine-shop-backend \
  --platform managed \
  --region us-central1 \
  --format="value(status.url)"
```

---

## 🌐 **Step 7: Deploy Frontend**

### **7.1 Update API URL**
```javascript
// client/src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 
  'https://medicine-shop-backend-xxxxx-uc.a.run.app';
```

### **7.2 Build and Deploy Frontend**
```bash
cd client

# Build React app
npm run build

# Create nginx config
cat > nginx.conf << EOF
events {
    worker_connections 1024;
}
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    server {
        listen 8080;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;
        
        location / {
            try_files \$uri \$uri/ /index.html;
        }
        
        location /api {
            proxy_pass https://medicine-shop-backend-xxxxx-uc.a.run.app;
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
        }
    }
}
EOF

# Build container
gcloud builds submit --tag gcr.io/medicine-shop-saas/frontend

# Deploy to Cloud Run
gcloud run deploy medicine-shop-frontend \
  --image gcr.io/medicine-shop-saas/frontend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --max-instances 5
```

---

## 📊 **Step 8: Monitoring & Logging**

### **8.1 View Logs**
```bash
# Backend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=medicine-shop-backend" --limit=50

# Frontend logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=medicine-shop-frontend" --limit=50
```

### **8.2 Set up Monitoring**
```bash
# Create uptime check
gcloud monitoring uptime-checks create http medicine-shop-health \
  --uri=https://medicine-shop-frontend-xxxxx-uc.a.run.app \
  --display-name="Medicine Shop Health Check"
```

---

## 💰 **Step 9: Cost Optimization**

### **Free Tier Limits:**
- **Cloud Run**: 2M requests/month
- **Cloud SQL**: 1 f1-micro instance
- **Cloud Build**: 120 build-minutes/day
- **Cloud Storage**: 5GB storage
- **Secret Manager**: 6 versions per secret

### **Estimated Monthly Costs (After Free Tier):**
- **Cloud Run**: $0.40 per 1M requests (~$2-10/month)
- **Cloud SQL**: $7.50/month (f1-micro)
- **Cloud Build**: $0.003/minute (~$5-20/month)
- **Total**: ~$15-40/month

### **Cost Optimization Tips:**
- Use f1-micro database instance
- Set max instances to limit scaling
- Use Cloud CDN for static assets
- Monitor usage with Cloud Monitoring

---

## 🔄 **Step 10: CI/CD Pipeline**

### **10.1 GitHub Actions Workflow**
```yaml
# .github/workflows/deploy.yml
name: Deploy to GCP

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Google Cloud CLI
        uses: google-github-actions/setup-gcloud@v0
        with:
          project_id: medicine-shop-saas
          service_account_key: ${{ secrets.GCP_SA_KEY }}
      
      - name: Deploy Backend
        run: |
          cd server
          gcloud builds submit --tag gcr.io/medicine-shop-saas/backend
          gcloud run deploy medicine-shop-backend \
            --image gcr.io/medicine-shop-saas/backend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
      
      - name: Deploy Frontend
        run: |
          cd client
          npm install
          npm run build
          gcloud builds submit --tag gcr.io/medicine-shop-saas/frontend
          gcloud run deploy medicine-shop-frontend \
            --image gcr.io/medicine-shop-saas/frontend \
            --platform managed \
            --region us-central1 \
            --allow-unauthenticated
```

---

## 🎯 **Benefits of GCP Serverless**

### **✅ Advantages:**
- **Generous free tier** - 2M requests/month
- **Persistent database** - Cloud SQL PostgreSQL
- **Auto-scaling** - Scales to zero when not used
- **Global infrastructure** - Google's global network
- **Enterprise security** - Google's security features
- **Cost-effective** - Pay per use model

### **⚠️ Considerations:**
- **Learning curve** - GCP services complexity
- **Vendor lock-in** - Google-specific services
- **Cold starts** - Initial response delay
- **Cost management** - Need to monitor usage

---

## 🚀 **Quick Start Commands**

```bash
# 1. Install and configure GCP CLI
curl https://sdk.cloud.google.com | bash
gcloud init

# 2. Enable APIs
gcloud services enable run.googleapis.com sqladmin.googleapis.com

# 3. Create database
gcloud sql instances create medicine-shop-db --database-version=POSTGRES_14 --tier=db-f1-micro

# 4. Deploy backend
cd server && gcloud builds submit --tag gcr.io/PROJECT_ID/backend
gcloud run deploy backend --image gcr.io/PROJECT_ID/backend --allow-unauthenticated

# 5. Deploy frontend
cd client && npm run build
gcloud builds submit --tag gcr.io/PROJECT_ID/frontend
gcloud run deploy frontend --image gcr.io/PROJECT_ID/frontend --allow-unauthenticated
```

---

**Ready to deploy your Medicine Shop SaaS on GCP serverless? Let me know if you want to proceed with this setup! 🏥💊** 