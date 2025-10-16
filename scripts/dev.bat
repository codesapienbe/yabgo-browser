@echo off
echo 🛠️ Starting YABGO Browser in development mode...

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
)

REM Start development with hot reload
call npm run dev