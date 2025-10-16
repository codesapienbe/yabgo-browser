@echo off
echo 🚀 Building YABGO Browser...

REM Clean previous build
call npm run clean

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Build TypeScript
echo 🔨 Compiling TypeScript...
call npm run build

if %errorlevel% equ 0 (
    echo ✅ Build completed successfully!
    echo Run 'npm start' to launch YABGO Browser
) else (
    echo ❌ Build failed!
    exit /b 1
)