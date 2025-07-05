#!/bin/bash

# 🚀 Fast GCP Deployment Script for Medicine Shop SaaS
# This script deploys the application to GCP Cloud Run (skips existing resources)

set -e

echo "🏥 Fast Deploying Medicine Shop SaaS to GCP Cloud Run..."
echo "========================================================"

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud:"
    echo "   gcloud auth login"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
echo "✅ Using project: $PROJECT_ID"

# Set region
REGION="us-central1"
echo "📍 Using region: $REGION"

# Enable required APIs (fast - skips if already enabled)
echo "🔧 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com \
  --quiet

# Check if Cloud SQL instance exists
if ! gcloud sql instances describe medicine-shop-db --quiet 2>/dev/null; then
    echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
    gcloud sql instances create medicine-shop-db \
      --database-version=POSTGRES_15 \
      --cpu=1 \
      --memory=3840MB \
      --region=$REGION \
      --storage-size=10GB \
      --storage-type=SSD \
      --storage-auto-increase \
      --quiet
else
    echo "✅ Cloud SQL instance already exists"
fi

# Check if database exists
if ! gcloud sql databases describe medicine_shop --instance=medicine-shop-db --quiet 2>/dev/null; then
    echo "📊 Creating database..."
    gcloud sql databases create medicine_shop \
      --instance=medicine-shop-db \
      --quiet
else
    echo "✅ Database already exists"
fi

# Check if database user exists
if ! gcloud sql users describe medicine-shop-user --instance=medicine-shop-db --quiet 2>/dev/null; then
    echo "👤 Creating database user..."
    DB_PASSWORD=$(openssl rand -base64 32)
    gcloud sql users create medicine-shop-user \
      --instance=medicine-shop-db \
      --password="$DB_PASSWORD" \
      --quiet
else
    echo "✅ Database user already exists"
    # Get existing password from secret manager or generate new one
    DB_PASSWORD=$(gcloud secrets versions access latest --secret=db-password 2>/dev/null || openssl rand -base64 32)
fi

# Get database connection info
echo "🔗 Getting database connection info..."
DB_CONNECTION_NAME=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")

# Store secrets in Secret Manager (skip if exists)
echo "🔐 Storing secrets in Secret Manager..."
echo -n "$DB_CONNECTION_NAME" | gcloud secrets create db-host --data-file=- --quiet 2>/dev/null || echo "✅ db-host secret already exists"
echo -n "5432" | gcloud secrets create db-port --data-file=- --quiet 2>/dev/null || echo "✅ db-port secret already exists"
echo -n "medicine_shop" | gcloud secrets create db-name --data-file=- --quiet 2>/dev/null || echo "✅ db-name secret already exists"
echo -n "medicine-shop-user" | gcloud secrets create db-user --data-file=- --quiet 2>/dev/null || echo "✅ db-user secret already exists"
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- --quiet 2>/dev/null || echo "✅ db-password secret already exists"

# Generate JWT secret (skip if exists)
JWT_SECRET=$(gcloud secrets versions access latest --secret=jwt-secret 2>/dev/null || openssl rand -base64 64)
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- --quiet 2>/dev/null || echo "✅ jwt-secret already exists"

# Configure Docker for GCP
echo "🐳 Configuring Docker for GCP..."
gcloud auth configure-docker --quiet

# Build and deploy backend (with caching)
echo "🚀 Building and deploying backend..."
cd server

# Use cached build if possible
echo "📦 Building backend container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-backend . --quiet

echo "🚀 Deploying backend to Cloud Run..."
gcloud run deploy medicine-shop-backend \
  --image gcr.io/$PROJECT_ID/medicine-shop-backend \
  --add-cloudsql-instances $DB_CONNECTION_NAME \
  --set-env-vars DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_PORT=5432,DB_NAME=medicine_shop,DB_USER=medicine-shop-user,NODE_ENV=production \
  --set-secrets JWT_SECRET=jwt-secret:latest,DB_PASSWORD=db-password:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --quiet

# Get backend URL
BACKEND_URL=$(gcloud run services describe medicine-shop-backend \
  --platform managed \
  --region $REGION \
  --format="value(status.url)")

echo "✅ Backend deployed at: $BACKEND_URL"

# Build and deploy frontend
echo "🚀 Building and deploying frontend..."
cd ../client

# Update API URL in the frontend
echo "🔧 Updating API URL in frontend..."
sed -i.bak "s|http://localhost:5000|$BACKEND_URL|g" src/services/api.js

echo "📦 Building frontend container..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-frontend . --quiet

echo "🚀 Deploying frontend to Cloud Run..."
gcloud run deploy medicine-shop-frontend \
  --image gcr.io/$PROJECT_ID/medicine-shop-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --quiet

# Get frontend URL
FRONTEND_URL=$(gcloud run services describe medicine-shop-frontend \
  --platform managed \
  --region $REGION \
  --format="value(status.url)")

echo "✅ Frontend deployed at: $FRONTEND_URL"

# Restore original API URL
echo "🔧 Restoring original API URL..."
mv src/services/api.js.bak src/services/api.js

echo ""
echo "🎉 Fast deployment completed successfully!"
echo "=========================================="
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔧 Backend URL: $BACKEND_URL"
echo ""
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "⏱️  This deployment took less time by reusing existing resources!"
echo ""
echo "📊 Monitor your deployment:"
echo "   gcloud run services list"
echo "   gcloud sql instances list" 