@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
  echo Projektordner konnte nicht geoeffnet werden.
  pause
  exit /b 1
)

if not exist ".env" copy ".env.example" ".env" >nul

echo.
echo Entferne alte Installationsreste...
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /f /q "package-lock.json"
if exist ".next" rmdir /s /q ".next"
if exist "prisma\dev.db" del /f /q "prisma\dev.db"
if exist "prisma\dev.db-journal" del /f /q "prisma\dev.db-journal"

echo.
echo [1/5] Installiere Abhaengigkeiten...
call npm install
if errorlevel 1 goto :error

echo.
echo [2/5] Pruefe Prisma Schema...
call npx prisma validate
if errorlevel 1 goto :error

echo.
echo [3/5] Erzeuge Prisma Client...
call npx prisma generate
if errorlevel 1 goto :error

echo.
echo [4/5] Erzeuge Datenbank...
call npx prisma migrate dev --name init
if errorlevel 1 goto :error

echo.
echo [5/5] Fuege Testdaten ein...
call npx prisma db seed
if errorlevel 1 goto :error

echo.
echo Einrichtung erfolgreich abgeschlossen.
echo Danach STARTEN.cmd ausfuehren.
echo.
pause
popd
exit /b 0

:error
echo.
echo Einrichtung fehlgeschlagen.
echo Bitte die komplette Ausgabe kopieren.
echo.
pause
popd
exit /b 1
