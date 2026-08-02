@echo off
setlocal
cd /d "%~dp0"
set "KHILA_NODE=node"
where node >nul 2>nul
if errorlevel 1 set "KHILA_NODE=C:\Users\wilke\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
echo Starting Khila's World...
echo Open http://localhost:8787 in your browser.
"%KHILA_NODE%" server.js
if errorlevel 1 pause
