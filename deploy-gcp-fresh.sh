#!/bin/bash

# 🚀 GCP Serverless Deployment Script for Medicine Shop SaaS (Fresh Database)
# This script deploys the application to GCP Cloud Run using existing fresh database

set -e

echo "🏥 Deploying Medicine Shop SaaS to GCP Cloud Run (Fresh Database)..."
echo "===================================================================="

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

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  containerregistry.googleapis.com

# Get database connection info
echo "🔗 Getting database connection info..."
DB_CONNECTION_NAME=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")
echo "✅ Database connection: $DB_CONNECTION_NAME"

# Configure Docker for GCP
echo "🐳 Configuring Docker for GCP..."
gcloud auth configure-docker

# Build and deploy backend
echo "🚀 Building and deploying backend..."
cd server
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-backend .

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

gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-frontend .

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
echo "🎉 Deployment completed successfully!"
echo "====================================="
echo ""
echo "📱 Frontend URL: $FRONTEND_URL"
echo "🔧 Backend URL: $BACKEND_URL"
echo ""
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "💰 Estimated monthly cost: $0-15 (free tier) / $15-40 (after free tier)"
echo ""
echo "📊 Monitor your deployment:"
echo "   gcloud run services list"
echo "   gcloud sql instances list" 