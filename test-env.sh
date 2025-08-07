#!/bin/bash

# Test Environment Variables Script
echo "🔍 Testing Environment Variables..."
echo ""

# Load .env file
if [ -f .env ]; then
    echo "✅ .env file found"
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

# Test each Firebase environment variable
echo "Testing Firebase environment variables:"
echo ""

echo "VITE_API_BASE_URL: ${VITE_API_BASE_URL:-'❌ NOT SET'}"
echo "VITE_FIREBASE_API_KEY: ${VITE_FIREBASE_API_KEY:-'❌ NOT SET'}"
echo "VITE_FIREBASE_AUTH_DOMAIN: ${VITE_FIREBASE_AUTH_DOMAIN:-'❌ NOT SET'}"
echo "VITE_FIREBASE_PROJECT_ID: ${VITE_FIREBASE_PROJECT_ID:-'❌ NOT SET'}"
echo "VITE_FIREBASE_STORAGE_BUCKET: ${VITE_FIREBASE_STORAGE_BUCKET:-'❌ NOT SET'}"
echo "VITE_FIREBASE_MESSAGING_SENDER_ID: ${VITE_FIREBASE_MESSAGING_SENDER_ID:-'❌ NOT SET'}"
echo "VITE_FIREBASE_APP_ID: ${VITE_FIREBASE_APP_ID:-'❌ NOT SET'}"
echo "VITE_FIREBASE_MEASUREMENT_ID: ${VITE_FIREBASE_MEASUREMENT_ID:-'❌ NOT SET'}"

echo ""
echo "🔧 If any variables show '❌ NOT SET', please check your .env file"
echo "📝 Your .env file should contain all Firebase credentials with VITE_ prefix"
