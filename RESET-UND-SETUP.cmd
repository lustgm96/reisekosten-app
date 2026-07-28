@echo off
setlocal
pushd "%~dp0"

echo Entferne alte Installationsreste...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f /q "package-lock.json"
if exist "prisma\dev.db" del /f /q "prisma\dev.db"
if exist "prisma\dev.db-journal" del /f /q "prisma\dev.db-journal"

if not exist ".env" copy ".env.example" ".env" >nul

echo.
echo Installiere neu...
call npm install
if errorlevel 1 goto :error

call npm run setup
if errorlevel 1 goto :error

echo.
echo Neuinstallation abgeschlossen.
pause
popd
exit /b 0

:error
echo.
echo Neuinstallation fehlgeschlagen.
pause
popd
exit /b 1
