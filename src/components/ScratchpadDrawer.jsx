import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { playTactileFeedback } from '../services/haptics';

export default function ScratchpadDrawer({ isOpen, onClose }) {
  const [content, setContent] = useState(() => {
    return localStorage.getItem('projeto2027_scratchpad') || '';
  });
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (isOpen) {
      setContent(localStorage.getItem('projeto2027_scratchpad') || '');
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    localStorage.setItem('projeto2027_scratchpad', val);
  };

  const handleCopy = () => {
    if (navigator.clipboard && content) {
      navigator.clipboard.writeText(content);
      playTactileFeedback('check');
      setFeedback('Copiado para a área de transferência!');
      setTimeout(() => setFeedback(''), 2500);
    }
  };

  const handleSaveToVault = () => {
    if (!content.trim()) return;
    const firstLine = content.trim().split('\n')[0].replace(/^[#•\-\*\s]+/, '').slice(0, 40);
    db.createKnowledgeItem({
      title: firstLine || 'Nota do Scratchpad',
      item_type: 'Caderno',
      category: 'Ideias',
      content_or_url: content.trim()
    });
    playTactileFeedback('level_up');
    setFeedback('✓ Guardada com sucesso no Cofre & Notas!');
    setTimeout(() => setFeedback(''), 2500);
  };

  const handleClear = () => {
    if (!content.trim()) return;
    if (confirm('Deseja limpar todo o Scratchpad?')) {
      setContent('');
      localStorage.setItem('projeto2027_scratchpad', '');
      playTactileFeedback('uncheck');
    }
  };

  if (!isOpen) return null;

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity" 
        onClick={onClose}
      />

      {/* Sliding Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-[#111827] border-l border-[#1F293D] shadow-2xl z-50 flex flex-col justify-between animate-fade-in">
        {/* Header */}
        <div className="h-16 px-5 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8B5CF6] text-[20px]">edit_note</span>
            <span className="text-sm font-bold text-white tracking-tight">Scratchpad / Bloco Rápido</span>
          </div>

          <div className="flex items-center gap-2">
            <kbd className="font-mono text-[10px] text-[#94A3B8] bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#334155]">
              Auto-save
            </kbd>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div className="bg-[#10B981]/15 text-[#10B981] border-b border-[#10B981]/30 text-xs px-4 py-2 font-medium flex items-center gap-1.5 animate-pulse">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>{feedback}</span>
          </div>
        )}

        {/* Editor Area */}
        <div className="flex-1 p-5 flex flex-col">
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Digite qualquer pensamento rápido, rascunho de texto, ideias brutas, links ou código... Tudo o que você escreve aqui é salvo automaticamente em tempo real."
            className="flex-1 w-full bg-[#1E293B]/50 border border-[#334155]/40 rounded-xl p-4 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#8B5CF6] resize-none font-mono leading-relaxed"
            autoFocus
          />
        </div>

        {/* Footer & Actions */}
        <div className="p-4 border-t border-[#1F293D] bg-[#161F30]/70 flex items-center justify-between gap-2">
          <div className="text-[11px] text-[#94A3B8] font-mono">
            <span>{wordCount} palavras</span> • <span>{charCount} caracteres</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClear}
              disabled={!content.trim()}
              className="p-2 rounded-lg text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors disabled:opacity-40 cursor-pointer"
              title="Limpar bloco de notas"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!content.trim()}
              className="px-2.5 py-1.5 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-white transition-colors disabled:opacity-40 flex items-center gap-1 cursor-pointer"
              title="Copiar todo o texto"
            >
              <span className="material-symbols-outlined text-[16px]">content_copy</span>
              <span>Copiar</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToVault}
              disabled={!content.trim()}
              className="px-3 py-1.5 rounded-lg bg-[#8B5CF6] hover:bg-[#7C3AED] text-xs font-bold text-white transition-colors disabled:opacity-40 flex items-center gap-1 shadow-sm cursor-pointer"
              title="Transformar este rascunho em uma nota permanente do Cofre"
            >
              <span className="material-symbols-outlined text-[16px]">save</span>
              <span>Guardar no Cofre</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

