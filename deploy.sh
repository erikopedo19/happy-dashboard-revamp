#!/bin/bash
# Deployment script for Cutzio Barbershop Booking App

echo "🚀 Deploying Cutzio Barbershop Booking App..."

# Build the application
echo "📦 Building application..."
npm run build

if [ ! -d "dist" ]; then
  echo "❌ Build failed - dist folder not found"
  exit 1
fi

echo "✅ Build successful!"

# Deploy to Netlify
echo "🌐 Deploying to Netlify..."
npx netlify deploy --dir=dist --prod --message="Production deployment"

echo "✨ Deployment complete!"
