@echo off
chcp 65001 >nul
cd /d "%~dp0"
title PEC21 Takeo - KKB 2027 (Port 3027)

echo ======================================================================
echo   PEC21 Takeo - KKB Examination Score System 2027
echo   ប្រព័ន្ធគ្រប់គ្រង និងបូកស្រង់ពិន្ទុនៃការប្រឡង គ.ក.ប ២០២៧ (PEC21)
echo ======================================================================
echo.
echo   [+] កំពុងចាប់ផ្តើម Server (Starting Server)...
echo   [+] អាសយដ្ឋានមូលដ្ឋាន (Local URL): http://localhost:3027
echo.
echo ======================================================================

timeout /t 2 /nobreak >nul
start http://localhost:3027
node server.js
pause
