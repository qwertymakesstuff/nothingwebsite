@echo off
title missing.website (offline)
echo.
echo   missing.website is running offline at http://localhost:8642/
echo   Keep this window open while you play. Close it to stop.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launcher\server.ps1" -Root "%~dp0site"
if errorlevel 1 pause
