// scripts/createStartupShortcut.js
// Permite ativar ou desativar a inicialização automática do Nexus Command com o Windows.
// Suporta módulos ESM nativos ("type": "module").
// Uso: node scripts/createStartupShortcut.js enable|disable

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ACTION = process.argv[2]; // "enable" or "disable"
if (!['enable', 'disable'].includes(ACTION)) {
  console.log('Uso: node scripts/createStartupShortcut.js enable|disable');
  process.exit(1);
}

const startupFolder = path.join(process.env.APPDATA || '', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const shortcutPath = path.join(startupFolder, 'NexusCommand.lnk');
const projectDir = path.resolve(__dirname, '..');
const vbsPath = path.join(projectDir, 'iniciar_silencioso.vbs');

if (ACTION === 'enable') {
  try {
    const psCommand = `$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('${shortcutPath.replace(/'/g, "''")}'); $s.TargetPath = 'wscript.exe'; $s.Arguments = '\"${vbsPath.replace(/'/g, "''")}\"'; $s.WorkingDirectory = '${projectDir.replace(/'/g, "''")}'; $s.Description = 'Nexus Command - Inicialização Automática com o Windows'; $s.Save()`;
    execSync(`powershell -NoProfile -Command "${psCommand}"`, { stdio: 'inherit' });
    console.log('[OK] Atalho de inicialização criado com sucesso em:', shortcutPath);
  } catch (err) {
    console.error('[ERRO] Falha ao criar atalho de inicialização:', err.message);
  }
} else {
  try {
    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
      console.log('[OK] Atalho de inicialização removido da pasta Startup.');
    } else {
      console.log('Nenhum atalho encontrado para remover.');
    }
  } catch (err) {
    console.error('[ERRO] Falha ao remover atalho:', err.message);
  }
}
