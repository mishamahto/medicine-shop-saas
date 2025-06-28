#!/bin/bash

echo "🚀 Starting build process..."

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install

# Build React app
echo "🔨 Building React app..."
npm run build

# Go back to root
cd ..

echo "✅ Build completed successfully!"
echo "📁 React build should be in: client/build/" 