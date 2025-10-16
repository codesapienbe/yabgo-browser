#!/bin/bash
# Development script for YABGO Browser

echo "🛠️ Starting YABGO Browser in development mode..."

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start development with hot reload
npm run dev