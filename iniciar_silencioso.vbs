Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtem o diretorio da pasta do projeto
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = strPath

' Inicia o servidor SQLite e o Vite dev server silenciosamente em segundo plano (0 = janela oculta)
' O Vite abrira o navegador automaticamente em http://localhost:3000
WshShell.Run "cmd /c node server.js", 0, False
WshShell.Run "cmd /c npm run dev", 0, False

