#!/bin/bash

# 🔄 GCP Database Reset Script for Medicine Shop SaaS
# This script clears the existing SQL database and creates a fresh one

set -e

echo "🗄️ Resetting GCP SQL Database for Medicine Shop SaaS..."
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

# Check if Cloud SQL instance exists
echo "🔍 Checking if Cloud SQL instance exists..."
if gcloud sql instances describe medicine-shop-db --quiet 2>/dev/null; then
    echo "✅ Cloud SQL instance 'medicine-shop-db' found"
    
    # Drop existing database if it exists
    echo "🗑️ Dropping existing database..."
    gcloud sql databases delete medicine_shop \
        --instance=medicine-shop-db \
        --quiet || echo "Database 'medicine_shop' doesn't exist or already deleted"
    
    # Create fresh database
    echo "📊 Creating fresh database..."
    gcloud sql databases create medicine_shop \
        --instance=medicine-shop-db \
        --quiet
    
    echo "✅ Database 'medicine_shop' created successfully"
else
    echo "❌ Cloud SQL instance 'medicine-shop-db' not found"
    echo "Creating new Cloud SQL instance..."
    
    # Enable required APIs
    echo "🔧 Enabling required APIs..."
    gcloud services enable \
        sqladmin.googleapis.com \
        secretmanager.googleapis.com \
        cloudbuild.googleapis.com \
        containerregistry.googleapis.com
    
    # Create Cloud SQL instance
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
    
    # Create database
    echo "📊 Creating database..."
    gcloud sql databases create medicine_shop \
        --instance=medicine-shop-db \
        --quiet
    
    # Create database user
    echo "👤 Creating database user..."
    DB_PASSWORD=$(openssl rand -base64 32)
    gcloud sql users create medicine-shop-user \
        --instance=medicine-shop-db \
        --password="$DB_PASSWORD" \
        --quiet
    
    # Get database connection info
    echo "🔗 Getting database connection info..."
    DB_CONNECTION_NAME=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")
    
    # Store secrets in Secret Manager
    echo "🔐 Storing secrets in Secret Manager..."
    echo -n "$DB_CONNECTION_NAME" | gcloud secrets create db-host --data-file=- --quiet || true
    echo -n "5432" | gcloud secrets create db-port --data-file=- --quiet || true
    echo -n "medicine_shop" | gcloud secrets create db-name --data-file=- --quiet || true
    echo -n "medicine-shop-user" | gcloud secrets create db-user --data-file=- --quiet || true
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=- --quiet || true
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -base64 64)
    echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- --quiet || true
    
    echo "✅ New Cloud SQL instance and database created successfully"
fi

# Get database connection info
echo "🔗 Getting database connection info..."
DB_CONNECTION_NAME=$(gcloud sql instances describe medicine-shop-db --format="value(connectionName)")

# Update secrets in Secret Manager with fresh credentials
echo "🔐 Updating secrets in Secret Manager..."
if ! gcloud secrets describe db-host --quiet 2>/dev/null; then
    echo -n "$DB_CONNECTION_NAME" | gcloud secrets create db-host --data-file=-
else
    echo -n "$DB_CONNECTION_NAME" | gcloud secrets versions add db-host --data-file=-
fi

if ! gcloud secrets describe db-port --quiet 2>/dev/null; then
    echo -n "5432" | gcloud secrets create db-port --data-file=-
else
    echo -n "5432" | gcloud secrets versions add db-port --data-file=-
fi

if ! gcloud secrets describe db-name --quiet 2>/dev/null; then
    echo -n "medicine_shop" | gcloud secrets create db-name --data-file=-
else
    echo -n "medicine_shop" | gcloud secrets versions add db-name --data-file=-
fi

if ! gcloud secrets describe db-user --quiet 2>/dev/null; then
    echo -n "medicine-shop-user" | gcloud secrets create db-user --data-file=-
else
    echo -n "medicine-shop-user" | gcloud secrets versions add db-user --data-file=-
fi

# Get or generate database password
if gcloud secrets describe db-password --quiet 2>/dev/null; then
    echo "🔐 Using existing database password from Secret Manager"
else
    echo "🔐 Generating new database password..."
    DB_PASSWORD=$(openssl rand -base64 32)
    echo -n "$DB_PASSWORD" | gcloud secrets create db-password --data-file=-
    
    # Update database user password
    echo "👤 Updating database user password..."
    gcloud sql users set-password medicine-shop-user \
        --instance=medicine-shop-db \
        --password="$DB_PASSWORD" \
        --quiet
fi

# Generate new JWT secret
echo "🔐 Generating new JWT secret..."
JWT_SECRET=$(openssl rand -base64 64)
if ! gcloud secrets describe jwt-secret --quiet 2>/dev/null; then
    echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
else
    echo -n "$JWT_SECRET" | gcloud secrets versions add jwt-secret --data-file=-
fi

# Test database connection
echo "🔍 Testing database connection..."
echo "Connection Name: $DB_CONNECTION_NAME"
echo "Database: medicine_shop"
echo "User: medicine-shop-user"

# Initialize database schema
echo "🔧 Initializing database schema..."
cd server

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing server dependencies..."
    npm install
fi

# Run database initialization
echo "🚀 Running database initialization..."
NODE_ENV=production \
DB_HOST="/cloudsql/$DB_CONNECTION_NAME" \
DB_PORT="5432" \
DB_NAME="medicine_shop" \
DB_USER="medicine-shop-user" \
DB_PASSWORD=$(gcloud secrets versions access latest --secret="db-password") \
ADMIN_PASSWORD="admin123" \
node database/init.js

cd ..

echo ""
echo "🎉 Database reset completed successfully!"
echo "========================================"
echo ""
echo "🗄️ Database Info:"
echo "   Instance: medicine-shop-db"
echo "   Database: medicine_shop"
echo "   User: medicine-shop-user"
echo "   Connection: $DB_CONNECTION_NAME"
echo ""
echo "🔐 Secrets stored in Secret Manager:"
echo "   - db-host"
echo "   - db-port"
echo "   - db-name"
echo "   - db-user"
echo "   - db-password"
echo "   - jwt-secret"
echo ""
echo "🔑 Default admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo "📊 Next steps:"
echo "   1. Deploy backend: ./deploy-gcp.sh"
echo "   2. Or deploy manually:"
echo "      cd server && gcloud builds submit --tag gcr.io/$PROJECT_ID/medicine-shop-backend ."
echo "      gcloud run deploy medicine-shop-backend --image gcr.io/$PROJECT_ID/medicine-shop-backend --add-cloudsql-instances $DB_CONNECTION_NAME --set-env-vars DB_HOST=/cloudsql/$DB_CONNECTION_NAME,DB_PORT=5432,DB_NAME=medicine_shop,DB_USER=medicine-shop-user,NODE_ENV=production --set-secrets JWT_SECRET=jwt-secret:latest,DB_PASSWORD=db-password:latest --platform managed --region $REGION --allow-unauthenticated"
echo "" 