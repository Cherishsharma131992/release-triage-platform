@echo off
rem One-click demo launcher: uses portable Node 22 so better-sqlite3 matches,
rem and headed mode so Chrome opens visibly.
set "PATH=%USERPROFILE%\tools\node-v22.23.5-win-x64;%PATH%"
set "HEADED=1"
cd /d "%~dp0"
call npm.cmd run demo:live
pause
