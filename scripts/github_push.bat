@echo off
setlocal enabledelayedexpansion

REM =========================================================================
REM Windows Fix Wizard - Automated GitHub Push & Dynamic Release Pipeline
REM Developer: AhBiYout (CISNet)
REM GitHub Account: AhBiYout-all
REM Target Repository: https://github.com/AhBiYout-all/windows-fix-wizard
REM Official Blog: https://ahbiyoutvibe.blogspot.com/
REM Affiliation: https://www.cisnet.co.kr
REM =========================================================================

echo [1/6] Extracting Dynamic Version (Single Source of Truth)...

set APP_VER=
REM 1st Priority: Extract from package.json via Node.js
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "usebackq delims=" %%V in (`node -e "try { const p=require('./package.json'); console.log(p.version||''); } catch(e){}"`) do (
        set "APP_VER=%%V"
    )
)

REM 2nd Priority (Fallback): Extract via PowerShell from package.json or docs/PATCH_NOTE.md
if "%APP_VER%"=="" (
    where powershell >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        for /f "usebackq delims=" %%V in (`powershell -NoProfile -Command "if (Test-Path './package.json') { (Get-Content './package.json' | ConvertFrom-Json).version } elseif (Test-Path './docs/PATCH_NOTE.md') { (Select-String -Path './docs/PATCH_NOTE.md' -Pattern 'v(\d+\.\d+\.\d+)').Matches[0].Groups[1].Value }"`) do (
            set "APP_VER=%%V"
        )
    )
)

REM Final fallback safety default
if "%APP_VER%"=="" (
    set "APP_VER=3.11.0"
)

title [Windows Fix Wizard v%APP_VER%] GitHub Automated Push & Sync Tool
echo Dynamic Version Resolved: v%APP_VER%
echo Target Remote: https://github.com/AhBiYout-all/windows-fix-wizard.git
echo Live Website (GitHub Pages): https://AhBiYout-all.github.io/windows-fix-wizard/
echo.

echo [2/6] Running Security & Privacy Pre-flight Scan...
echo Checking for unauthorized private information or credential leaks...

REM Check for untracked .env files or personal email leaks
set LEAK_FOUND=0
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in PATH! Please install Git for Windows.
    pause
    exit /b 1
)

for /f "delims=" %%F in ('git status --porcelain') do (
    echo %%F | findstr /i "\.env serviceAccountKey" >nul
    if !ERRORLEVEL! equ 0 (
        echo [CRITICAL ALERT] Found sensitive file attempting to be staged: %%F
        set LEAK_FOUND=1
    )
)

if %LEAK_FOUND% equ 1 (
    echo.
    echo [BLOCKED] Push aborted due to sensitive file detection!
    echo Please review your .gitignore and unstaged sensitive files before proceeding.
    pause
    exit /b 1
)
echo [PASSED] Privacy and credential pre-flight verification cleared.
echo.

echo [3/6] Configuring Remote Repository...
git rev-parse --is-inside-work-tree >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Initializing local Git repository...
    git init -b main
)
git remote get-url origin >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo Adding origin remote: https://github.com/AhBiYout-all/windows-fix-wizard.git
    git remote add origin https://github.com/AhBiYout-all/windows-fix-wizard.git
) else (
    echo Existing remote origin detected:
    git remote -v
)
echo.

echo [4/6] Staging Files & Creating Dynamic Version Commit...
git add .
git status --short

set /p USER_CONFIRM="Do you want to commit and push changes as v%APP_VER% to origin main? (Y/N): "
if /i not "%USER_CONFIRM%"=="Y" (
    echo [CANCELLED] Operation aborted by user.
    pause
    exit /b 0
)

set "COMMIT_MSG=[Release] Windows Fix Wizard v%APP_VER% - Pipeline Automation & GitHub Releases Sync"
git commit -m "%COMMIT_MSG%"

echo.
echo [5/6] Creating & Synchronizing Semantic Version Tag (v%APP_VER%)...
git tag -d "v%APP_VER%" >nul 2>&1
git tag -a "v%APP_VER%" -m "Release Windows Fix Wizard v%APP_VER%"

echo.
echo [6/6] Pushing to GitHub (main branch + tags)...
git push origin main
git push origin "v%APP_VER%"

echo.
echo =========================================================================
echo [SUCCESS] Windows Fix Wizard v%APP_VER% pushed to GitHub!
echo Repository:    https://github.com/AhBiYout-all/windows-fix-wizard
echo Releases:      https://github.com/AhBiYout-all/windows-fix-wizard/releases
echo Live Website:  https://AhBiYout-all.github.io/windows-fix-wizard/
echo Official Blog: https://ahbiyoutvibe.blogspot.com/
echo Affiliation:   https://www.cisnet.co.kr
echo -------------------------------------------------------------------------
echo GitHub Pages workflow (.github/workflows/deploy-pages.yml) is now building
echo and deploying your website automatically to GitHub Pages.
echo =========================================================================
echo.
pause
