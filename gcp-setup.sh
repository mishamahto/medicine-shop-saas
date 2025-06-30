#!/bin/bash

# 🚀 GCP Serverless Setup Script for Medicine Shop SaaS
# This script helps you set up GCP serverless deployment

echo "🏥 Setting up GCP Serverless for Medicine Shop SaaS..."
echo "====================================================="

# Check if gcloud CLI is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI is not installed. Installing now..."
    tar -xzf google-cloud-sdk-*.tar.gz
    ./google-cloud-sdk/install.sh
    ./google-cloud-sdk/bin/gcloud init
    echo "✅ Google Cloud CLI installed. Please run 'gcloud init' to configure."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "🔐 Please authenticate with Google Cloud:"
    echo "   gcloud auth login"
    echo "   gcloud config set project YOUR_PROJECT_ID"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project)
echo "✅ Using project: $PROJECT_ID"

# Set your project ID
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  storage.googleapis.com \
  containerregistry.googleapis.com

# Create Cloud SQL instance
echo "🗄️ Creating Cloud SQL PostgreSQL instance..."
gcloud sql instances create my-postgres-instance \
  --database-version=POSTGRES_15 \
  --cpu=1 \
  --memory=3840MB \
  --region=us-central1 \
  --storage-size=10GB \
  --storage-type=SSD \
  --storage-auto-increase

# Create database
echo "📊 Creating database..."
gcloud sql databases create medicine_shop \
  --instance=my-postgres-instance

# Create database user
echo "👤 Creating database user..."
DB_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create medicine-shop-user \
  --instance=medicine-shop-db \
  --password="$DB_PASSWORD" \
  --quiet

# Get database connection info
echo "🔗 Getting database connection info..."
DB_HOST=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")
DB_CONNECTION_NAME=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")

# Store secrets in Secret Manager
echo "🔐 Storing secrets in Secret Manager..."
echo -n "$DB_HOST" | gcloud secrets create db-host --data-file=- --quiet
echo -n "5432" | gcloud secrets create db-port --data-file=- --quiet
echo -n "medicine_shop" | gcloud secrets create db-name --data-file=- --quiet
echo -n "medicine-shop-user" | gcloud secrets create db-user --data-file=- --quiet
echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- --quiet

# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 64)
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- --quiet

# Set the Postgres user password
echo "🔐 Setting the Postgres user password..."
gcloud sql users set-password postgres \
  --instance=my-postgres-instance \
  --password='YOUR_DB_PASSWORD'

# Create a separate DB user
echo "👤 Creating separate database user..."
gcloud sql users create appuser \
  --instance=my-postgres-instance \
  --password='APPUSER_PASSWORD'

echo "✅ GCP setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "=============="
echo ""
echo "1. Deploy the backend:"
echo "   cd server"
echo "   docker build -t gcr.io/$PROJECT_ID/server ."
echo "   docker push gcr.io/$PROJECT_ID/server"
echo "   gcloud run deploy server \\"
echo "     --image gcr.io/$PROJECT_ID/server \\"
echo "     --add-cloudsql-instances $DB_CONNECTION_NAME \\"
echo "     --set-env-vars DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_NAME=medicine_shop,DB_USER=medicine-shop-user,DB_PASSWORD=$DB_PASSWORD,NODE_ENV=production \\"
echo "     --platform managed \\"
echo "     --region us-central1 \\"
echo "     --allow-unauthenticated"
echo ""
echo "2. Get backend URL:"
echo "   gcloud run services describe server \\"
echo "     --platform managed \\"
echo "     --region us-central1 \\"
echo "     --format=\"value(status.url)\""
echo ""
echo "3. Update frontend API URL and deploy:"
echo "   # Update API_BASE_URL in client/src/services/api.js"
echo "   cd client"
echo "   docker build -t gcr.io/$PROJECT_ID/client ."
echo "   docker push gcr.io/$PROJECT_ID/client"
echo "   gcloud run deploy client \\"
echo "     --image gcr.io/$PROJECT_ID/client \\"
echo "     --platform managed \\"
echo "     --region us-central1 \\"
echo "     --allow-unauthenticated"
echo ""
echo "🎉 Your Medicine Shop SaaS will be deployed on GCP serverless!"
echo ""
echo "💰 Estimated monthly cost: $0-15 (free tier) / $15-40 (after free tier)"

gcloud sql instances describe my-postgres-instance \
  --format="value(connectionName)"

# Backend
cd server
docker build -t gcr.io/YOUR_PROJECT_ID/server .
docker push gcr.io/YOUR_PROJECT_ID/server

# Frontend (if deploying to Cloud Run)
cd ../client
docker build -t gcr.io/YOUR_PROJECT_ID/client .
docker push gcr.io/YOUR_PROJECT_ID/client

gcloud run deploy server \
  --image gcr.io/YOUR_PROJECT_ID/server \
  --add-cloudsql-instances PROJECT:REGION:my-postgres-instance \
  --set-env-vars DB_HOST=/cloudsql/PROJECT:REGION:my-postgres-instance,DB_NAME=medicine_shop,DB_USER=appuser,DB_PASSWORD=APPUSER_PASSWORD,NODE_ENV=production \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

gcloud run deploy client \
  --image gcr.io/YOUR_PROJECT_ID/client \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated

pgloader sqlite:///path/to/medicine_shop.db postgresql://appuser:APPUSER_PASSWORD@/<medicine_shop>?host=/cloudsql/PROJECT:REGION:my-postgres-instance

docker --version

gcloud auth configure-docker

gcloud builds submit --tag gcr.io/PROJECT_ID/server ./server

npm install