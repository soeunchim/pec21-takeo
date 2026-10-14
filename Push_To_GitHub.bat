@echo off
chcp 65001 >nul
title Push គម្រោង គ.ក.ប ទៅកាន់ GitHub (PEC21 Takeo)
cd /d "%~dp0"

echo ==============================================================================
echo   កម្មវិធីជំនួយការ Push គម្រោង គ.ក.ប ទៅកាន់ GitHub (សម្រាប់ Render.com)
echo ==============================================================================
echo.

:: ស្វែងរកទីតាំង git.exe ដោយស្វ័យប្រវត្តិ
set "GIT_CMD=git"
where git >nul 2>&1
if errorlevel 1 (
    if exist "C:\Program Files\Microsoft Visual Studio\18\Professional\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Microsoft Visual Studio\18\Professional\Common7\IDE\CommonExtensions\Microsoft\TeamFoundation\Team Explorer\Git\cmd\git.exe"
    ) else if exist "C:\Program Files\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files\Git\cmd\git.exe"
    ) else if exist "C:\Program Files (x86)\Git\cmd\git.exe" (
        set "GIT_CMD=C:\Program Files (x86)\Git\cmd\git.exe"
    ) else (
        echo [កំហុស] រកមិនឃើញ Git នៅលើកុំព្យូទ័រឡើយ!
        echo សូមដំឡើង Git ពី https://git-scm.com/downloads
        pause
        exit /b
    )
)

echo [ឧបករណ៍ Git]: "%GIT_CMD%"
echo.
set "DEFAULT_REPO=https://github.com/soeunchim/pec21-takeo.git"
echo សូមបញ្ចូល GitHub Repository URL (ចុច Enter ភ្លាមៗដើម្បីយក: %DEFAULT_REPO%)
set /p REPO_URL="URL: "

if "%REPO_URL%"=="" set "REPO_URL=%DEFAULT_REPO%"

echo.
echo [១/៤] កំពុងពិនិត្យ និងរៀបចំ Git Repository...
if not exist ".git" (
    "%GIT_CMD%" init
)
"%GIT_CMD%" branch -M main

echo.
echo [២/៤] កំពុងបន្ថែមឯកសារទាំងអស់ (រួមទាំង Dockerfile & server.js)...
"%GIT_CMD%" add .

echo.
echo [៣/៤] កំពុង Commit ទិន្នន័យ...
"%GIT_CMD%" config user.name "soeunchim"
"%GIT_CMD%" config user.email "soeunchim@users.noreply.github.com"
"%GIT_CMD%" commit -m "Deploy PEC21 KKB 2027 with Dockerfile for Render"

echo.
echo [៤/៤] កំពុងរុញ (Push) ទៅកាន់ GitHub (%REPO_URL%)...
"%GIT_CMD%" remote remove origin >nul 2>&1
"%GIT_CMD%" remote add origin %REPO_URL%
"%GIT_CMD%" push -u origin main --force

if errorlevel 1 (
    echo.
    echo ==============================================================================
    echo [កំហុស] មិនអាច Push ឡើង GitHub បានដោយស្វ័យប្រវត្តិ។
    echo បើសិនជា GitHub ទាមទារផ្ទៀងផ្ទាត់ (Authentication) សូម Sign In តាមផ្ទាំង Browser ដែលលោតឡើង។
    echo ==============================================================================
) else (
    echo.
    echo ==============================================================================
    echo   [ជោគជ័យ ១០០%%] បាន Push ឯកសារទាំងអស់ឡើងទៅកាន់ GitHub រួចរាល់ហើយ!
    echo   Render.com នឹងចាប់ផ្តើម Deploy ដោយស្វ័យប្រវត្តិក្លាយជា "Live" ពណ៌បៃតង!
    echo ==============================================================================
)
pause
