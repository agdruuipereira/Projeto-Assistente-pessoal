@echo off
chcp 65001 >nul
title Desativar Inicializacao com Windows - Nexus Command
color 0C

set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\NexusCommand.lnk"

echo ========================================================
echo   DESATIVAR INICIALIZAÇÃO AUTOMÁTICA COM O WINDOWS
echo ========================================================
echo.

if exist "%SHORTCUT_PATH%" (
    del "%SHORTCUT_PATH%"
    echo [OK] O atalho de inicialização foi removido com sucesso!
    echo O Nexus Command não será mais iniciado automaticamente ao ligar o PC.
) else (
    echo O Nexus Command já não estava configurado para iniciar automaticamente.
)

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul

