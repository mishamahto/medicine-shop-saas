#!/bin/bash

# Exit on error
set -e

# Configuration
PROJECT_ID="galvanic-vim-464504-n5"
REGION="us-central1"
DB_INSTANCE="medicine-shop-db"
DB_NAME="medicine_shop"
DB_USER="medicine-shop-user"

echo "🚀 Starting deployment process..."

# Build and deploy backend
echo "📦 Building and deploying backend..."
cd server
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-backend .
gcloud run deploy medicine-shop-backend \
  --image gcr.io/$PROJECT_ID/medicine-shop-backend \
  --platform managed \
  --region $REGION \
  --add-cloudsql-instances $PROJECT_ID:$REGION:$DB_INSTANCE \
  --set-env-vars "DB_HOST=/cloudsql/$PROJECT_ID:$REGION:$DB_INSTANCE" \
  --set-env-vars "DB_NAME=$DB_NAME" \
  --set-env-vars "DB_USER=$DB_USER" \
  --set-env-vars "DB_PORT=5432" \
  --allow-unauthenticated

# Build and deploy frontend
echo "📦 Building and deploying frontend..."
cd ../client
gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-frontend .
gcloud run deploy medicine-shop-frontend \
  --image gcr.io/$PROJECT_ID/medicine-shop-frontend \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated

echo "✅ Deployment completed successfully!"