import React, { useState } from 'react';
import { encryptVaultPassword, decryptVaultPassword, generateStrongPassword } from '../services/cryptoVault';
import { db } from '../services/db';
import { playTactileFeedback } from '../services/haptics';

export default function Cofre({
  knowledgeItems = [],
  onCreateKnowledge,
  onUpdateKnowledge,
  onDeleteKnowledge,
  vaultItems = [],
  onCreateVaultItem,
  onDeleteVaultItem,
  isUltraClean
}) {
  const [activeTab, setActiveTab] = useState('cofre'); // 'cofre' | 'conhecimento' | 'gerador' | 'backup'

  // Vault (Cofre) states
  const [vaultSearch, setVaultSearch] = useState('');
  const [selectedVaultItem, setSelectedVaultItem] = useState(null);
  const [masterPassword, setMasterPassword] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [decryptedText, setDecryptedText] = useState(null);
  const [decryptError, setDecryptError] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [copiedVaultId, setCopiedVaultId] = useState(null);

  // New Credential Modal
  const [showNewVaultModal, setShowNewVaultModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [loginId, setLoginId] = useState('');
  const [plainPassword, setPlainPassword] = useState('');
  const [newMasterPassword, setNewMasterPassword] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Knowledge Hub states
  const [knowledgeSearch, setKnowledgeSearch] = useState('');
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] = useState('Todas');
  const [selectedKnowledgeType, setSelectedKnowledgeType] = useState('Todos');
  const [copiedKnowledgeId, setCopiedKnowledgeId] = useState(null);

  // Note Modal (Create & Edit)
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteType, setNoteType] = useState('Caderno');
  const [noteCategory, setNoteCategory] = useState('Ideias');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Password Generator States
  const [genLength, setGenLength] = useState(20);
  const [genIncludeUpper, setGenIncludeUpper] = useState(true);
  const [genIncludeNumbers, setGenIncludeNumbers] = useState(true);
  const [genIncludeSymbols, setGenIncludeSymbols] = useState(true);
  const [generatedPassword, setGeneratedPassword] = useState(() => generateStrongPassword(20));
  const [copiedGenPassword, setCopiedGenPassword] = useState(false);

  // Knowledge Categories
  const knowledgeCategories = [
    'Todas',
    'Ideias',
    'Resumos',
    'Negócios',
    'Estudo',
    'Estratégia 2027',
    'Pessoal'
  ];

  // Decrypt handler
  const handleOpenDecryptModal = (item) => {
    setSelectedVaultItem(item);
    setMasterPassword('');
    setDecryptedText(null);
    setDecryptError(null);
    playTactileFeedback('check');
  };

  const handleExecuteDecrypt = async () => {
    if (!masterPassword) return;
    setIsDecrypting(true);
    setDecryptError(null);
    setDecryptedText(null);

    try {
      const plain = await decryptVaultPassword(
        masterPassword,
        selectedVaultItem.encrypted_cipher,
        selectedVaultItem.iv_vector,
        selectedVaultItem.salt
      );

      setDecryptedText(plain);
      playTactileFeedback('level_up');

      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(plain);
          setCopiedVaultId(selectedVaultItem.id);
          setTimeout(() => setCopiedVaultId(null), 4000);
        } catch (_) {}
      }
    } catch (err) {
      setDecryptError('Falha na autenticação AES-GCM: Senha mestra incorreta ou vetor de inicialização inválido.');
      playTactileFeedback('click');
    } finally {
      setIsDecrypting(false);
    }
  };

  // Encrypt & Save new credential
  const handleCreateVaultSubmit = async (e) => {
    e.preventDefault();
    if (!serviceName.trim() || !plainPassword || !newMasterPassword) return;

    setIsEncrypting(true);
    try {
      const encrypted = await encryptVaultPassword(newMasterPassword, plainPassword);
      onCreateVaultItem({
        service_name: serviceName.trim(),
        login_identifier: loginId.trim(),
        encrypted_cipher: encrypted.encrypted_cipher,
        iv_vector: encrypted.iv_vector,
        salt: encrypted.salt
      });
      setServiceName('');
      setLoginId('');
      setPlainPassword('');
      setNewMasterPassword('');
      setShowNewVaultModal(false);
      playTactileFeedback('level_up');
    } catch (err) {
      alert('Erro ao criptografar: ' + err.message);
    } finally {
      setIsEncrypting(false);
    }
  };

  // Knowledge Note Create / Edit handlers
  const handleOpenCreateNote = () => {
    setEditingNote(null);
    setNoteType('Caderno');
    setNoteCategory('Ideias');
    setNoteTitle('');
    setNoteContent('');
    setShowNoteModal(true);
  };

  const handleOpenEditNote = (item) => {
    setEditingNote(item);
    setNoteType(item.item_type || 'Caderno');
    setNoteCategory(item.category || 'Ideias');
    setNoteTitle(item.title || '');
    setNoteContent(item.content_or_url || '');
    setShowNoteModal(true);
  };

  const handleSaveNoteSubmit = (e) => {
    e.preventDefault();
    if (!noteTitle.trim()) return;

    const payload = {
      item_type: noteType,
      category: noteCategory,
      title: noteTitle.trim(),
      content_or_url: noteContent.trim(),
      is_favorite: editingNote ? !!editingNote.is_favorite : true
    };

    if (editingNote && onUpdateKnowledge) {
      onUpdateKnowledge(editingNote.id, payload);
    } else {
      onCreateKnowledge(payload);
    }

    setShowNoteModal(false);
    setEditingNote(null);
    playTactileFeedback('check');
  };

  const handleCopyKnowledge = async (item) => {
    try {
      const text = `${item.title}\n\n${item.content_or_url || ''}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedKnowledgeId(item.id);
      playTactileFeedback('check');
      setTimeout(() => setCopiedKnowledgeId(null), 2500);
    } catch (_) {}
  };

  // Generate new strong password
  const handleRegeneratePassword = () => {
    const chars = {
      upper: genIncludeUpper,
      numbers: genIncludeNumbers,
      symbols: genIncludeSymbols
    };
    // Generate with custom constraints
    let pool = 'abcdefghijklmnopqrstuvwxyz';
    if (chars.upper) pool += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (chars.numbers) pool += '0123456789';
    if (chars.symbols) pool += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let result = '';
    const array = new Uint32Array(genLength);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
      for (let i = 0; i < genLength; i++) {
        result += pool[array[i] % pool.length];
      }
    } else {
      for (let i = 0; i < genLength; i++) {
        result += pool[Math.floor(Math.random() * pool.length)];
      }
    }

    setGeneratedPassword(result);
    setCopiedGenPassword(false);
    playTactileFeedback('check');
  };

  const handleCopyGenPassword = async () => {
    if (!generatedPassword) return;
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(generatedPassword);
      setCopiedGenPassword(true);
      playTactileFeedback('check');
      setTimeout(() => setCopiedGenPassword(false), 3000);
    }
  };

  // Backups
  const handleExportBackup = () => {
    try {
      const snapshot = db.exportFullSystemSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projeto2027_snapshot_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      playTactileFeedback('level_up');
    } catch (err) {
      alert('Erro ao exportar backup: ' + err.message);
    }
  };

  const handleExportMarkdownVault = () => {
    try {
      const allKnowledge = db.getKnowledgeItems();
      const allGoals = db.getGoals();
      const allMedia = db.getMediaCatalog();
      const allLogs = db.getDailyLogs();

      const doc = [];
      doc.push('# 🧠 Segundo Cérebro Nexus — Dossiê Completo de Conhecimento');
      doc.push(`*Exportação gerada em ${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeStyle: 'medium' }).format(new Date())}*\n`);
      doc.push('> Este documento contém a compilação completa do seu acervo intelectual, notas táticas, metas e reflexões, formatado para importação direta no Obsidian, Logseq ou Notion.\n');
      doc.push('---\n');

      // 1. Índice de Conhecimento
      doc.push('## 📚 1. Notas & Base de Conhecimento');
      if (allKnowledge.length === 0) {
        doc.push('_Nenhuma nota registrada até o momento._\n');
      } else {
        const grouped = {};
        allKnowledge.forEach((item) => {
          const cat = item.category || 'Geral';
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(item);
        });

        Object.entries(grouped).forEach(([cat, items]) => {
          doc.push(`### 📂 Categoria: ${cat}`);
          items.forEach((item) => {
            doc.push(`#### 📝 ${item.title || 'Sem título'}`);
            doc.push(`- **Tipo:** \`${item.item_type || 'Nota'}\``);
            doc.push('');
            doc.push(item.content_or_url || '*(Sem conteúdo)*');
            doc.push('');
          });
        });
      }
      doc.push('---\n');

      // 2. Metas Estratégicas
      doc.push('## 🎯 2. Metas & Objetivos Estratégicos (Horizonte 2027)');
      if (allGoals.length === 0) {
        doc.push('_Nenhuma meta cadastrada._\n');
      } else {
        allGoals.forEach((g) => {
          const pct = g.target_value ? Math.round(((g.current_value || 0) / g.target_value) * 100) : 0;
          doc.push(`### 🏁 ${g.title} (${g.target_year || '2027'})`);
          doc.push(`- **Pilar / Área:** ${g.theme || 'Geral'}`);
          doc.push(`- **Progresso:** ${g.current_value || 0} / ${g.target_value || 100} (${pct}%)`);
          if (g.notes) doc.push(`- **Motivação:** ${g.notes}`);
          doc.push('');
        });
      }
      doc.push('---\n');

      // 3. Acervo Cultural
      doc.push('## 🎬 3. Acervo Cultural (Livros, Filmes & Séries)');
      if (allMedia.length === 0) {
        doc.push('_Nenhuma obra registrada._\n');
      } else {
        allMedia.forEach((m) => {
          doc.push(`- **[${m.media_type || 'Obra'}]** *${m.title}* — Status: \`${m.status || 'Não iniciado'}\` (${m.rating || 5}★)`);
          if (m.notes) doc.push(`  > "${m.notes}"`);
        });
      }
      doc.push('');
      doc.push('---\n');

      // 4. Reflexões e Diários
      doc.push('## 🧘 4. Histórico de Reflexões Diárias');
      if (allLogs.length === 0) {
        doc.push('_Nenhum diário registrado._\n');
      } else {
        allLogs.slice(0, 20).forEach((log) => {
          doc.push(`### 📅 Data: ${log.log_date}`);
          if (log.reflection_gratitude) doc.push(`- **Gratidão:** ${log.reflection_gratitude}`);
          if (log.reflection_better) doc.push(`- **Melhorias:** ${log.reflection_better}`);
          if (log.reflection_learning) doc.push(`- **Aprendizado:** ${log.reflection_learning}`);
          if (log.journal_richtext) doc.push(`- **Notas:**\n${log.journal_richtext}`);
          doc.push('');
        });
      }

      const blob = new Blob([doc.join('\n')], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_segundo_cerebro_${new Date().toISOString().split('T')[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      playTactileFeedback('level_up');
    } catch (err) {
      alert('Erro ao exportar Segundo Cérebro: ' + err.message);
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data || typeof data !== 'object') {
          throw new Error('Arquivo JSON inválido.');
        }

        db.restoreFullSystemSnapshot(data);
        playTactileFeedback('level_up');
        alert('✓ Snapshot do sistema restaurado com sucesso! O ecossistema foi atualizado.');
        window.location.reload();
      } catch (err) {
        alert('Erro ao importar backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Filtered Vault Items
  const filteredVaultItems = vaultItems.filter((item) => {
    if (!vaultSearch.trim()) return true;
    const q = vaultSearch.toLowerCase().trim();
    return (
      (item.service_name && item.service_name.toLowerCase().includes(q)) ||
      (item.login_identifier && item.login_identifier.toLowerCase().includes(q))
    );
  });

  // Filtered Knowledge Items
  const filteredKnowledge = knowledgeItems.filter((k) => {
    if (selectedKnowledgeCategory !== 'Todas' && k.category !== selectedKnowledgeCategory) return false;
    if (selectedKnowledgeType !== 'Todos' && k.item_type !== selectedKnowledgeType) return false;
    if (knowledgeSearch.trim()) {
      const q = knowledgeSearch.toLowerCase().trim();
      const titleMatch = (k.title || '').toLowerCase().includes(q);
      const contentMatch = (k.content_or_url || '').toLowerCase().includes(q);
      const catMatch = (k.category || '').toLowerCase().includes(q);
      if (!titleMatch && !contentMatch && !catMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Top Banner & Security Status */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#0A0E17] border border-[#1F293D] p-6 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cofre Blindado & Segundo Cérebro
              </span>
              <span className="text-xs text-[#64748B]">• AES-256-GCM / PBKDF2</span>
              {isUltraClean && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  ✨ Modo Essencial
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Cofre Criptográfico & Conhecimento
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Custódia blindada de senhas com criptografia client-side de nível militar e central de notas, cadernos e dossiês estratégicos do Projeto 2027.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {activeTab === 'cofre' ? (
              <button
                onClick={() => setShowNewVaultModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#041F15] font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">add_moderator</span>
                <span>+ Nova Credencial</span>
              </button>
            ) : activeTab === 'conhecimento' ? (
              <button
                onClick={handleOpenCreateNote}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#022129] font-bold text-sm shadow-[0_0_20px_rgba(6,182,212,0.25)] active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">note_add</span>
                <span>+ Nova Nota / Link</span>
              </button>
            ) : null}

            <button
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-semibold transition-colors"
              title="Download de snapshot JSON completo"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">download</span>
              <span className="hidden sm:inline">Backup JSON</span>
            </button>

            <button
              onClick={handleExportMarkdownVault}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-colors"
              title="Exportar dossiê completo para Obsidian (.md)"
            >
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              <span className="hidden sm:inline">Obsidian (.md)</span>
            </button>
          </div>
        </div>

        {/* Security & Vault Telemetry Chips */}
        {!isUltraClean && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#1F293D]/70">
            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Credenciais no Cofre</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">{vaultItems.length} blindadas</div>
                <span className="text-[10px] text-[#94A3B8]">Criptografia ativa</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Algoritmo / KDF</span>
                <div className="text-xl font-bold text-white mt-0.5 font-mono text-sm sm:text-base">AES-GCM-256</div>
                <span className="text-[10px] text-cyan-400 font-mono">PBKDF2 100k iterações</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[20px]">enhanced_encryption</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Segundo Cérebro</span>
                <div className="text-xl font-bold text-purple-400 mt-0.5 font-mono">{knowledgeItems.length} notas</div>
                <span className="text-[10px] text-[#94A3B8]">Cadernos e referências</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Privacidade Total</span>
                <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">Zero-Knowledge</div>
                <span className="text-[10px] text-[#94A3B8]">100% Client-Side</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[20px]">shield</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-1.5 bg-[#111827] border border-[#1F293D] p-1 rounded-xl flex-wrap">
          <button
            onClick={() => setActiveTab('cofre')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cofre'
                ? 'bg-emerald-500 text-[#041F15] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">lock</span>
            <span>Cofre de Senhas ({vaultItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('conhecimento')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'conhecimento'
                ? 'bg-cyan-500 text-[#022129] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Segundo Cérebro & Cadernos ({knowledgeItems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('gerador')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'gerador'
                ? 'bg-purple-500 text-white shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">password</span>
            <span>Gerador de Senhas</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'backup'
                ? 'bg-amber-500 text-[#041F15] shadow-sm font-bold'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>Soberania & Backups</span>
          </button>
        </div>
      </div>

      {/* TAB 1: COFRE ZERO-KNOWLEDGE */}
      {activeTab === 'cofre' && (
        <div className="space-y-4">
          {/* Search bar & Security Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111827]/80 border border-[#1F293D] p-3 rounded-xl text-xs">
            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">search</span>
              <input
                type="text"
                value={vaultSearch}
                onChange={(e) => setVaultSearch(e.target.value)}
                placeholder="Pesquisar credencial por serviço ou login..."
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Memória Volátil: Senhas decifradas nunca são armazenadas em disco.</span>
            </div>
          </div>

          {/* Credentials Table / Cards */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#0C121E] text-[#94A3B8] uppercase text-[10px] font-semibold tracking-wider border-b border-[#1F293D]">
                  <tr>
                    <th className="py-3 px-4">Aplicação / Serviço</th>
                    <th className="py-3 px-4">Identificador / Login</th>
                    <th className="py-3 px-4">Cifra & Assinatura</th>
                    <th className="py-3 px-4">Protocolo</th>
                    <th className="py-3 px-4 text-right">Ação Segura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F293D]/60 text-slate-200">
                  {filteredVaultItems.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#64748B]">
                        <span className="material-symbols-outlined text-[36px] mb-2 block">key_off</span>
                        Nenhuma credencial encontrada. Clique em "+ Nova Credencial" para proteger uma chave.
                      </td>
                    </tr>
                  ) : (
                    filteredVaultItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#1E293B]/40 transition-colors group">
                        <td className="py-3 px-4 font-medium text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 font-bold shrink-0">
                              <span className="material-symbols-outlined text-[18px]">key</span>
                            </div>
                            <span className="font-bold">{item.service_name}</span>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[#94A3B8]">
                          {item.login_identifier || '—'}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          <div className="space-y-0.5">
                            <span className="text-emerald-400 font-bold tracking-widest text-[12px]">••••••••••••</span>
                            <div className="text-[10px] text-[#64748B]">
                              iv: {item.iv_vector ? item.iv_vector.slice(0, 8) : '—'}...
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold">
                            AES-256-GCM
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenDecryptModal(item)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500 text-[#041F15] hover:bg-emerald-400 text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[15px]">lock_open</span>
                              <span>Desbloquear</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja excluir permanentemente a credencial de "${item.service_name}"?`)) {
                                  onDeleteVaultItem(item.id);
                                }
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-red-400 transition-all rounded hover:bg-[#1E293B]"
                              title="Excluir credencial"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEGUNDO CÉREBRO & CADERNOS */}
      {activeTab === 'conhecimento' && (
        <div className="space-y-4">
          {/* Toolbar: Category + Type + Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#111827]/80 border border-[#1F293D] p-3 rounded-xl text-xs">
            {/* Category pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[#64748B] font-semibold mr-1">Categoria:</span>
              {knowledgeCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedKnowledgeCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    selectedKnowledgeCategory === cat
                      ? 'bg-cyan-500 text-[#022129] font-bold shadow-sm'
                      : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative w-full md:w-72 shrink-0">
              <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">search</span>
              <input
                type="text"
                value={knowledgeSearch}
                onChange={(e) => setKnowledgeSearch(e.target.value)}
                placeholder="Pesquisar notas, ideias e resumos..."
                className="w-full bg-[#1E293B] border border-[#334155] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          {/* Notes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredKnowledge.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-[#111827] border border-[#1F293D] rounded-2xl p-6">
                <span className="material-symbols-outlined text-[42px] text-[#64748B] mb-2">menu_book</span>
                <p className="text-sm font-semibold text-white">Nenhuma nota encontrada.</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Clique em "+ Nova Nota / Link" para registrar insights, diretrizes e cadernos.
                </p>
                <button
                  onClick={handleOpenCreateNote}
                  className="mt-4 px-4 py-2 rounded-xl bg-cyan-500 text-[#022129] text-xs font-bold hover:bg-cyan-400 transition-colors"
                >
                  + Nova Nota / Link
                </button>
              </div>
            ) : (
              filteredKnowledge.map((k) => {
                const isLink = k.item_type === 'Link' || k.content_or_url?.startsWith('http');

                return (
                  <div
                    key={k.id}
                    className="bg-[#111827] border border-[#1F293D] hover:border-[#334155] rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm"
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/25">
                            {k.category || 'Ideias'}
                          </span>
                          <span className="text-[10px] font-mono text-[#64748B] bg-[#1E293B] px-1.5 py-0.5 rounded">
                            {k.item_type || 'Caderno'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyKnowledge(k)}
                            className="p-1 rounded text-[#94A3B8] hover:text-cyan-400 transition-all opacity-0 group-hover:opacity-100"
                            title="Copiar conteúdo"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {copiedKnowledgeId === k.id ? 'check' : 'content_copy'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditNote(k)}
                            className="p-1 rounded text-[#94A3B8] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="Editar nota"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          {onDeleteKnowledge && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja excluir a nota "${k.title}"?`)) {
                                  onDeleteKnowledge(k.id);
                                }
                              }}
                              className="p-1 rounded text-[#94A3B8] hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                              title="Excluir nota"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-white leading-snug mb-2">
                        {k.title}
                      </h3>

                      {/* Content Preview */}
                      <div className="text-xs text-[#94A3B8] leading-relaxed whitespace-pre-wrap line-clamp-6 bg-[#0C121E] p-3 rounded-xl border border-[#1F293D]/60 font-sans">
                        {k.content_or_url || '(Sem conteúdo)'}
                      </div>
                    </div>

                    {/* Bottom Actions for Link */}
                    {isLink && (
                      <div className="mt-3 pt-3 border-t border-[#1F293D] flex items-center justify-between">
                        <span className="text-[11px] text-[#64748B] font-mono truncate max-w-[200px]">
                          {k.content_or_url}
                        </span>
                        <a
                          href={k.content_or_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                        >
                          <span>Abrir Link</span>
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                        </a>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GERADOR DE SENHAS FORTES */}
      {activeTab === 'gerador' && (
        <div className="max-w-2xl mx-auto bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-6">
          <div className="border-b border-[#1F293D] pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">password</span>
              Gerador de Senhas Seguras & Chaves de API
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Gere chaves criptograficamente fortes com entropia máxima para blindar suas contas e serviços.
            </p>
          </div>

          {/* Generated Password Box */}
          <div className="bg-[#0C121E] border border-[#1F293D] rounded-xl p-4 flex items-center justify-between gap-3">
            <span className="font-mono text-base sm:text-lg text-emerald-400 font-bold tracking-wider select-all break-all">
              {generatedPassword}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRegeneratePassword}
                className="p-2 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-slate-200 transition-colors"
                title="Gerar nova"
              >
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
              <button
                type="button"
                onClick={handleCopyGenPassword}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-[#041F15] font-bold text-xs hover:bg-emerald-400 transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedGenPassword ? 'check' : 'content_copy'}
                </span>
                <span>{copiedGenPassword ? 'Copiada!' : 'Copiar'}</span>
              </button>
            </div>
          </div>

          {/* Generator Options */}
          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-[#94A3B8] font-semibold">Tamanho da Senha:</span>
                <span className="font-mono font-bold text-white text-sm">{genLength} caracteres</span>
              </div>
              <input
                type="range"
                min="12"
                max="48"
                value={genLength}
                onChange={(e) => {
                  setGenLength(Number(e.target.value));
                  setTimeout(handleRegeneratePassword, 50);
                }}
                className="w-full accent-purple-500 h-1.5 bg-[#1E293B] rounded cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <label className="flex items-center gap-2 text-xs text-slate-200 bg-[#1E293B]/60 p-3 rounded-xl border border-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeUpper}
                  onChange={(e) => {
                    setGenIncludeUpper(e.target.checked);
                    setTimeout(handleRegeneratePassword, 50);
                  }}
                  className="w-4 h-4 accent-purple-500 rounded"
                />
                <span>Maiúsculas (A-Z)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-200 bg-[#1E293B]/60 p-3 rounded-xl border border-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeNumbers}
                  onChange={(e) => {
                    setGenIncludeNumbers(e.target.checked);
                    setTimeout(handleRegeneratePassword, 50);
                  }}
                  className="w-4 h-4 accent-purple-500 rounded"
                />
                <span>Números (0-9)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-200 bg-[#1E293B]/60 p-3 rounded-xl border border-[#334155] cursor-pointer">
                <input
                  type="checkbox"
                  checked={genIncludeSymbols}
                  onChange={(e) => {
                    setGenIncludeSymbols(e.target.checked);
                    setTimeout(handleRegeneratePassword, 50);
                  }}
                  className="w-4 h-4 accent-purple-500 rounded"
                />
                <span>Símbolos (!@#$)</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setPlainPassword(generatedPassword);
                  setShowNewVaultModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add_moderator</span>
                <span>Guardar esta senha no Cofre Criptográfico</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SOBERANIA & BACKUPS */}
      {activeTab === 'backup' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">cloud_sync</span>
              Soberania Digital & Portabilidade de Dados
            </h2>
            <p className="text-xs text-[#94A3B8] leading-relaxed">
              No Projeto 2027, todos os dados são 100% de sua propriedade. Você pode exportar snapshots integrais em JSON, gerar dossiês em Markdown para o Obsidian ou restaurar backups a qualquer momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Export JSON */}
            <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-3">
                  <span className="material-symbols-outlined text-[22px]">data_object</span>
                </div>
                <h3 className="text-sm font-bold text-white">Snapshot Completo (JSON)</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  Exporta todas as tabelas: tarefas, metas, finanças, caixinhas, treinos, hábitos, filmes, livros e notas em um único arquivo JSON.
                </p>
              </div>
              <button
                onClick={handleExportBackup}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-[#041F15] font-bold text-xs hover:bg-emerald-400 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Baixar Snapshot JSON</span>
              </button>
            </div>

            {/* Export Markdown Obsidian */}
            <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400 mb-3">
                  <span className="material-symbols-outlined text-[22px]">psychology</span>
                </div>
                <h3 className="text-sm font-bold text-white">Dossiê Segundo Cérebro (.md)</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  Exporta todo o acervo de conhecimento, metas e reflexões diárias formatado para importação direta no Obsidian, Logseq ou Notion.
                </p>
              </div>
              <button
                onClick={handleExportMarkdownVault}
                className="w-full py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Baixar Dossiê (.md)</span>
              </button>
            </div>

            {/* Restore JSON Backup */}
            <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 flex flex-col justify-between space-y-4 md:col-span-2">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 mb-3">
                  <span className="material-symbols-outlined text-[22px]">upload_file</span>
                </div>
                <h3 className="text-sm font-bold text-white">Restaurar Snapshot do Sistema</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  Importe um arquivo de backup `.json` gerado anteriormente para recuperar o estado completo do ecossistema.
                </p>
              </div>

              <label className="w-full py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                <span className="material-symbols-outlined text-[16px] text-amber-400">upload</span>
                <span>Selecionar Arquivo de Backup JSON</span>
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DESCRIPTOGRAFAR CREDENCIAL */}
      {selectedVaultItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-start justify-between border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-[22px]">lock_open</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Desbloquear Credencial</h3>
                  <p className="text-[11px] text-[#94A3B8]">Derivação local PBKDF2 (Client-Side)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVaultItem(null)}
                className="text-[#94A3B8] hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Service metadata box */}
            <div className="p-3 bg-[#0C121E] border border-[#1F293D] rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[#94A3B8] uppercase font-semibold">SERVIÇO ALVO</span>
                <span className="font-mono text-emerald-400 font-bold">AES-256-GCM</span>
              </div>
              <div className="text-sm font-bold text-white">{selectedVaultItem.service_name}</div>
              {selectedVaultItem.login_identifier && (
                <div className="text-xs text-[#94A3B8] font-mono">
                  Login: {selectedVaultItem.login_identifier}
                </div>
              )}
            </div>

            {/* Demo hint */}
            <div className="p-2.5 rounded-lg bg-[#1E293B] border border-[#334155] text-xs flex items-center justify-between">
              <span className="text-[#94A3B8]">Senha Mestra padrão (demo):</span>
              <button
                type="button"
                onClick={() => setMasterPassword('Master2027!')}
                className="font-mono font-bold text-emerald-400 bg-[#111827] px-2 py-0.5 rounded border border-emerald-500/30 hover:bg-emerald-500/10 text-xs"
              >
                Master2027!
              </button>
            </div>

            {/* Master Password Input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-[#94A3B8] block">Senha Mestra do Cofre</label>
              <div className="flex items-center bg-[#1E293B] border border-[#334155] px-3 py-2 rounded-xl">
                <input
                  type={showMasterPassword ? 'text' : 'password'}
                  autoFocus
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleExecuteDecrypt();
                  }}
                  placeholder="Digite sua senha mestra..."
                  className="w-full bg-transparent text-white focus:outline-none font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="text-[#94A3B8] hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showMasterPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Decrypted result */}
            {decryptedText && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>Credencial Decifrada (Copiada para a Área de Transferência!)</span>
                </div>
                <div className="bg-[#111827] border border-emerald-500/20 px-3 py-2 rounded-lg font-mono text-sm text-emerald-400 font-bold flex items-center justify-between select-all">
                  <span>{decryptedText}</span>
                  <span className="text-[10px] text-[#94A3B8] uppercase font-sans font-normal">AES-256 OK</span>
                </div>
              </div>
            )}

            {/* Decrypt error */}
            {decryptError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span>
                <span>{decryptError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
              <button
                type="button"
                onClick={() => setSelectedVaultItem(null)}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                disabled={isDecrypting}
                onClick={handleExecuteDecrypt}
                className="px-5 py-2 rounded-xl bg-emerald-500 text-[#041F15] font-bold text-xs hover:bg-emerald-400 transition-all shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isDecrypting ? 'sync' : 'lock_open'}
                </span>
                <span>{isDecrypting ? 'Decifrando...' : 'Descriptografar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA CREDENCIAL BLINDADA */}
      {showNewVaultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">add_moderator</span>
                Nova Credencial Blindada
              </h3>
              <button
                onClick={() => setShowNewVaultModal(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateVaultSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Serviço / Aplicação</label>
                <input
                  type="text"
                  required
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex: GitHub, AWS, Banco Inter..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Identificador / Login</label>
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="Ex: alexandre@empresa.com ou admin"
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#94A3B8]">Senha a Criptografar</label>
                  <button
                    type="button"
                    onClick={() => setPlainPassword(generateStrongPassword(24))}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-0.5"
                  >
                    <span className="material-symbols-outlined text-[13px]">key</span>
                    <span>Gerar Senha Forte</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={plainPassword}
                  onChange={(e) => setPlainPassword(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-emerald-400 block mb-1">
                  Sua Senha Mestra (para cifrar via AES-256)
                </label>
                <input
                  type="password"
                  required
                  value={newMasterPassword}
                  onChange={(e) => setNewMasterPassword(e.target.value)}
                  placeholder="Sua senha mestra secreta (ex: Master2027!)..."
                  className="w-full bg-[#1E293B] border border-emerald-500/40 rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setShowNewVaultModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isEncrypting}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-[#041F15] font-bold text-xs hover:bg-emerald-400 transition-all shadow-sm"
                >
                  {isEncrypting ? 'Cifrando AES-256...' : 'Criptografar e Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR / EDITAR NOTA OU LINK */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400">
                  {editingNote ? 'edit_note' : 'note_add'}
                </span>
                {editingNote ? 'Editar Nota / Link' : 'Nova Nota / Link'}
              </h3>
              <button
                onClick={() => {
                  setShowNoteModal(false);
                  setEditingNote(null);
                }}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveNoteSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Tipo</label>
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Caderno">Caderno (Anotação)</option>
                    <option value="Link">Link de Referência</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Categoria</label>
                  <select
                    value={noteCategory}
                    onChange={(e) => setNoteCategory(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-cyan-500"
                  >
                    <option value="Ideias">Ideias</option>
                    <option value="Resumos">Resumos</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Estudo">Estudo</option>
                    <option value="Estratégia 2027">Estratégia 2027</option>
                    <option value="Pessoal">Pessoal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Ex: Arquitetura de Microsserviços 2027..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  {noteType === 'Link' ? 'URL do Link' : 'Conteúdo / Notas em Markdown'}
                </label>
                <textarea
                  rows={5}
                  required
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder={noteType === 'Link' ? 'https://exemplo.com/artigo-estrategico' : 'Escreva suas notas, bullet points e reflexões...'}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-500 resize-none font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoteModal(false);
                    setEditingNote(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-500 text-[#022129] font-bold text-xs hover:bg-cyan-400 transition-all shadow-sm"
                >
                  {editingNote ? 'Salvar Alterações' : 'Cadastrar Nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
