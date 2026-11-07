@echo off
cd /d "%~dp0"
start /b node server.js
npm run dev
