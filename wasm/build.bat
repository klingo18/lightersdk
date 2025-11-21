@echo off
REM Build Lighter WASM for Windows - Full SDK

echo Building Lighter WASM SDK...

REM Create dist directory if it doesn't exist
if not exist "..\sdk\dist" mkdir "..\sdk\dist"

REM Try multiple locations for wasm_exec.js
echo Looking for wasm_exec.js...
set FOUND=0

if exist "C:\Program Files\Go\lib\wasm\wasm_exec.js" (
    echo Found at: C:\Program Files\Go\lib\wasm\wasm_exec.js
    copy /Y "C:\Program Files\Go\lib\wasm\wasm_exec.js" "..\sdk\dist\" >nul
    if not errorlevel 1 (
        set FOUND=1
        echo Copied successfully
    )
)

if %FOUND%==0 (
    if exist "C:\Program Files\Go\misc\wasm\wasm_exec.js" (
        echo Found at: C:\Program Files\Go\misc\wasm\wasm_exec.js
        copy /Y "C:\Program Files\Go\misc\wasm\wasm_exec.js" "..\sdk\dist\" >nul
        if not errorlevel 1 (
            set FOUND=1
            echo Copied successfully
        )
    )
)

if %FOUND%==0 (
    echo.
    echo ERROR: Could not find or copy wasm_exec.js
    echo.
    echo Please manually copy the file:
    echo 1. Find wasm_exec.js in your Go installation
    echo 2. Copy it to: %CD%\..\sdk\dist\wasm_exec.js
    echo.
    echo Common locations:
    echo    C:\Program Files\Go\lib\wasm\wasm_exec.js
    echo    C:\Program Files\Go\misc\wasm\wasm_exec.js
    echo.
    pause
    exit /b 1
)

REM Build WASM with all functions
echo Building complete WASM binary...
set GOOS=js
set GOARCH=wasm
go build -o ..\sdk\dist\lighter.wasm main.go additional_functions.go pool_functions.go

if errorlevel 1 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

echo.
echo ===================================
echo Build complete!
echo ===================================
echo.
echo Files created in sdk/dist/:
dir ..\sdk\dist\lighter.wasm
dir ..\sdk\dist\wasm_exec.js
echo.
echo WASM Functions Available:
echo   Trading:
echo   - signCreateOrder, signCancelOrder, signModifyOrder
echo   - signCancelAllOrders, signCreateGroupedOrders
echo   Account:
echo   - signUpdateLeverage, signUpdateMargin
echo   - signWithdraw, signTransfer, signCreateSubAccount
echo   Pools:
echo   - signCreatePublicPool, signUpdatePublicPool
echo   - signMintShares, signBurnShares
echo   Auth:
echo   - createAuthToken, generateKey, signChangePubKey
echo.
echo To test:
echo 1. cd ..\sdk
echo 2. python -m http.server 8000
echo 3. Open: http://localhost:8000/examples/trading-example.html
echo.
pause
