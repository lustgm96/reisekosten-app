@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 (
  echo Projektordner konnte nicht geoeffnet werden.
  pause
  exit /b 1
)

if not exist ".env" copy ".env.example" ".env" >nul

if not exist "node_modules" (
  echo Bitte zuerst SETUP.cmd starten.
  pause
  popd
  exit /b 1
)

echo.
echo Erzeuge Prisma Client...
call npx prisma generate
if errorlevel 1 goto :error

echo.
echo App startet unter http://localhost:3000
echo.
call npm run dev
popd
exit /b 0

:error
echo Prisma Client konnte nicht erzeugt werden.
pause
popd
exit /b 1
