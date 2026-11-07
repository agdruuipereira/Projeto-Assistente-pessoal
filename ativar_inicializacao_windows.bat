@echo off
chcp 65001 >nul
title Ativar Inicializacao com Windows - Nexus Command
color 0A

set "SCRIPT_DIR=%~dp0"
set "VBS_PATH=%SCRIPT_DIR%iniciar_silencioso.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_PATH=%STARTUP_FOLDER%\NexusCommand.lnk"

echo ========================================================
echo   CONFIGURAR INICIALIZAÇÃO AUTOMÁTICA COM O WINDOWS
echo ========================================================
echo.
echo Criando atalho no diretório de inicialização do seu Windows...
echo Pasta de Inicialização:
echo %STARTUP_FOLDER%
echo.

powershell -NoProfile -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"%VBS_PATH%\"'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Nexus Command - Inicialização Automática com o Windows'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] SUCESSO!
    echo O Nexus Command agora iniciará automaticamente e em segundo plano
    echo toda vez que você ligar ou reiniciar o computador!
    echo.
    echo Atalho criado: %SHORTCUT_PATH%
) else (
    echo [ERRO] Não foi possível criar o atalho automaticamente.
    echo Você pode copiar manualmente o arquivo 'iniciar_silencioso.vbs'
    echo para a pasta: shell:startup
)

echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul

