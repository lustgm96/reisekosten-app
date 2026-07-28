@echo off
setlocal
pushd "%~dp0"

if exist "node_modules\.prisma" rmdir /s /q "node_modules\.prisma"
if exist "node_modules\@prisma\client" rmdir /s /q "node_modules\@prisma\client"

call npm install
if errorlevel 1 goto :error

call npx prisma validate
if errorlevel 1 goto :error

call npx prisma generate
if errorlevel 1 goto :error

echo.
echo Prisma wurde erfolgreich repariert.
pause
popd
exit /b 0

:error
echo.
echo Prisma-Reparatur fehlgeschlagen.
pause
popd
exit /b 1
