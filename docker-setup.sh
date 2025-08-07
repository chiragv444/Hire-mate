#!/bin/bash

# HireMate Docker Setup Script
echo "🚀 Setting up HireMate with Docker..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "📝 Please edit .env file with your Firebase credentials before running the containers"
    else
        echo "❌ .env.example file not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if Firebase service account key exists
if [ ! -f backend/service-account-key.json ]; then
    echo "⚠️  Firebase service account key not found at backend/service-account-key.json"
    echo "📝 Please download your Firebase service account key and place it at backend/service-account-key.json"
    echo "   You can download it from: Firebase Console > Project Settings > Service Accounts"
    read -p "Press Enter when you've added the service account key file..."
fi

# Build and start containers
echo "🔨 Building Docker containers..."
docker-compose build

echo "🚀 Starting HireMate services..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ HireMate is now running!"
    echo ""
    echo "🌐 Frontend: http://localhost:4000"
    echo "🔧 Backend API: http://localhost:8000"
    echo "📚 API Documentation: http://localhost:8000/docs"
    echo "🔍 Health Check: http://localhost:8000/health"
    echo ""
    echo "📋 To view logs: docker-compose logs -f"
    echo "🛑 To stop: docker-compose down"
else
    echo "❌ Failed to start services. Check logs with: docker-compose logs"
fi
