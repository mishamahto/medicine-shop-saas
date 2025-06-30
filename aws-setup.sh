#!/bin/bash

# 🚀 AWS Serverless Setup Script for Medicine Shop SaaS
# This script helps you set up AWS serverless deployment

echo "🏥 Setting up AWS Serverless for Medicine Shop SaaS..."
echo "=================================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if Serverless Framework is installed
if ! command -v serverless &> /dev/null; then
    echo "📦 Installing Serverless Framework..."
    npm install -g serverless
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "🔐 AWS credentials not configured. Please run:"
    echo "   aws configure"
    echo "   Then provide your AWS Access Key ID, Secret Access Key, and region."
    exit 1
fi

echo "✅ AWS CLI and Serverless Framework are ready!"

# Install dependencies
echo "📦 Installing AWS Lambda dependencies..."
cd aws
npm install

echo "🔧 Setting up environment variables..."
echo ""
echo "Please set up your AWS Systems Manager parameters:"
echo "=================================================="
echo ""
echo "1. Create RDS PostgreSQL database first:"
echo "   aws rds create-db-instance \\"
echo "     --db-instance-identifier medicine-shop-db \\"
echo "     --db-instance-class db.t3.micro \\"
echo "     --engine postgres \\"
echo "     --master-username admin \\"
echo "     --master-user-password YOUR_PASSWORD \\"
echo "     --allocated-storage 20"
echo ""
echo "2. Store database credentials in AWS Systems Manager:"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/db-host' --value 'YOUR_RDS_ENDPOINT' --type 'SecureString'"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/db-port' --value '5432' --type 'SecureString'"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/db-name' --value 'medicine_shop' --type 'SecureString'"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/db-user' --value 'admin' --type 'SecureString'"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/db-password' --value 'YOUR_PASSWORD' --type 'SecureString'"
echo "   aws ssm put-parameter --name '/medicine-shop/dev/jwt-secret' --value 'YOUR_JWT_SECRET' --type 'SecureString'"
echo ""
echo "3. Deploy the backend:"
echo "   serverless deploy"
echo ""
echo "4. Update frontend API URL and deploy:"
echo "   cd ../client"
echo "   # Update API_BASE_URL in src/services/api.js"
echo "   npm run build"
echo "   aws s3 sync build/ s3://YOUR_BUCKET_NAME"
echo ""
echo "🎉 Setup complete! Your Medicine Shop SaaS is ready for AWS deployment!" 