@echo off
echo ========================================
echo   SmartFinance - Starting all services
echo ========================================
echo.

REM Check if .env exists in backend
if not exist "backend\.env" (
    echo [ERROR] backend\.env not found!
    echo Please copy backend\.env.example to backend\.env and fill in your values.
    pause
    exit /b 1
)

REM Check if .env exists in frontend
if not exist "frontend\.env" (
    echo Creating frontend\.env with default values...
    copy "frontend\.env.example" "frontend\.env"
)

REM Install dependencies if node_modules missing
if not exist "receipt-ocr\node_modules" (
    echo Installing OCR service dependencies...
    cd receipt-ocr
    call npm install
    cd ..
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Starting OCR service on port 5001...
start "OCR Service" cmd /k "cd receipt-ocr && node server.js"

timeout /t 2 /nobreak >nul

echo Starting backend on port 5000...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting frontend on port 5173...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo   All services started!
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:5000
echo   OCR:       http://localhost:5001
echo ========================================
echo.
echo You can close this window. The 3 service windows will keep running.
pause
