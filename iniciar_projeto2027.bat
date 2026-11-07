@echo off
title Projeto 2027 - Obsidian Nexus
color 0A
chcp 65001 >nul

echo =======================================================
echo          PROJETO 2027 — OBSIDIAN NEXUS
echo =======================================================
echo.
echo [1/2] Verificando dependências do projeto...

if not exist "node_modules\" (
    echo Instalando pacotes necessários pela primeira vez...
    call npm install
)

echo.
echo [2/2] Iniciando o servidor de desenvolvimento...
echo O seu navegador abrirá automaticamente em instantes!
echo.
echo Para fechar a aplicação quando terminar, basta fechar esta janela.
echo =======================================================
echo.

start /b node server.js
start http://localhost:3000
npm run dev

