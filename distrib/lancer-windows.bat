@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js n est pas installe. Telechargez la version LTS sur https://nodejs.org puis relancez.
  pause
  exit /b 1
)
node server.mjs
pause
