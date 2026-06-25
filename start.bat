@echo off
title GeoMind AI
cd /d "%~dp0"
echo.
echo  Starting GeoMind AI (backend + frontend)...
echo  Wait 5 seconds, then open: http://localhost:5173
echo  Login: demo@geomind.ai / DemoSurvey2026!
echo.
npm start
pause