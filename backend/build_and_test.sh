#!/bin/bash

# Build and Test Script for HireMate Backend Docker Container

set -e

# Check if OpenAI API key is provided
if [ -z "$1" ]; then
    echo "⚠️  Warning: No OpenAI API key provided"
    echo "Usage: $0 <your-openai-api-key>"
    echo "Example: $0 sk-1234567890abcdef..."
    echo ""
    echo "Building without API key (will use basic parsing)..."
    OPENAI_API_KEY=""
else
    OPENAI_API_KEY="$1"
    echo "✅ OpenAI API key provided"
fi

echo "🚀 Building HireMate Backend Docker Container..."
echo "=================================================="

# Build the Docker image
echo "🔨 Building Docker image..."
docker build -t hiremate-backend .

if [ $? -eq 0 ]; then
    echo "✅ Docker build successful!"
else
    echo "❌ Docker build failed!"
    exit 1
fi

echo ""
echo "🧪 Testing the container..."
echo "=================================================="

# Run the test script in the container with API key
echo "🔍 Running setup tests..."
if [ -n "$OPENAI_API_KEY" ]; then
    docker run --rm -e OPENAI_API_KEY="$OPENAI_API_KEY" hiremate-backend python test_docker_setup.py
else
    docker run --rm hiremate-backend python test_docker_setup.py
fi

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed. Check the output above for details."
fi

echo ""
echo "🚀 Starting the application for manual testing..."
echo "Press Ctrl+C to stop the container"

# Run the container interactively for manual testing with API key
if [ -n "$OPENAI_API_KEY" ]; then
    docker run --rm -e OPENAI_API_KEY="$OPENAI_API_KEY" -p 8000:8000 hiremate-backend
else
    docker run --rm -p 8000:8000 hiremate-backend
fi
