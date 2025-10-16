#!/bin/bash
# Build script for YABGO Browser

echo "🚀 Building YABGO Browser..."

# Clean previous build
npm run clean

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build completed successfully!"
    echo "Run 'npm start' to launch YABGO Browser"
else
    echo "❌ Build failed!"
    exit 1
fi