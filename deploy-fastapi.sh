#!/bin/bash

# 🚀 FastAPI Backend Deployment Script for Medicine Shop SaaS
# This script deploys the FastAPI backend to GCP Cloud Run

set -e

echo "🐍 Deploying FastAPI Backend to GCP Cloud Run..."
echo "================================================"

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

# Build and deploy FastAPI backend
echo "🚀 Building and deploying FastAPI backend..."
cd server

# Use the FastAPI Dockerfile
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-fastapi-backend -f Dockerfile.fastapi .

gcloud run deploy medicine-shop-fastapi-backend \
  --image gcr.io/$PROJECT_ID/medicine-shop-fastapi-backend \
  --add-cloudsql-instances $DB_CONNECTION_NAME \
  --set-env-vars DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_PORT=5432,DB_NAME=medicine_shop,DB_USER=medicine-shop-user,NODE_ENV=production \
  --set-secrets JWT_SECRET=jwt-secret:latest,DB_PASSWORD=db-password:latest \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --quiet

# Get backend URL
BACKEND_URL=$(gcloud run services describe medicine-shop-fastapi-backend \
  --platform managed \
  --region $REGION \
  --format="value(status.url)")

echo "✅ FastAPI Backend deployed at: $BACKEND_URL"

cd ..

echo ""
echo "🎉 FastAPI Backend deployment completed successfully!"
echo "==================================================="
echo ""
echo "🔧 Backend URL: $BACKEND_URL"
echo "📚 API Documentation: $BACKEND_URL/docs"
echo ""
echo "🔐 Default login credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Next steps:"
echo "   1. Test the API: curl $BACKEND_URL/api/health"
echo "   2. View API docs: $BACKEND_URL/docs"
echo "   3. Update frontend API URL if needed"
echo "" 