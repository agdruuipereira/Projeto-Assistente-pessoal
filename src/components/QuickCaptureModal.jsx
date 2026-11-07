import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { playTactileFeedback } from '../services/haptics';

export default function QuickCaptureModal({ isOpen, onClose, onTaskCreated }) {
  const [content, setContent] = useState('');
  const [captureType, setCaptureType] = useState('task'); // 'task' | 'finance' | 'idea' | 'scratchpad'
  const [amount, setAmount] = useState('');
  const [txType, setTxType] = useState('Gasto');
  const [feedback, setFeedback] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setContent('');
      setAmount('');
      setFeedback('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;

    const today = new Date().toISOString().split('T')[0];

    if (captureType === 'task') {
      db.createTask({
        title: content.trim(),
        category: 'Trabalho',
        priority: 'Alta',
        due_date: today,
        status: 'Não iniciado'
      });
      if (onTaskCreated) onTaskCreated();
      playTactileFeedback('check');
      setFeedback('✓ Tarefa adicionada para hoje!');
    } else if (captureType === 'finance') {
      db.createTransaction({
        title: content.trim(),
        amount: Number(amount) || 0,
        tx_type: txType,
        category: 'Geral',
        tx_date: today,
        payment_status: 'Pago',
        is_recurring: false
      });
      playTactileFeedback('check');
      setFeedback(`✓ ${txType} registrado(a)!`);
    } else if (captureType === 'idea') {
      db.createKnowledgeItem({
        title: content.trim().slice(0, 50) + (content.length > 50 ? '...' : ''),
        item_type: 'Ideia',
        category: 'Despejo Rápido',
        content_or_url: content.trim()
      });
      playTactileFeedback('check');
      setFeedback('✓ Ideia guardada no Cofre!');
    } else if (captureType === 'scratchpad') {
      const current = localStorage.getItem('projeto2027_scratchpad') || '';
      const updated = current ? `${current}\n• ${content.trim()}` : `• ${content.trim()}`;
      localStorage.setItem('projeto2027_scratchpad', updated);
      playTactileFeedback('check');
      setFeedback('✓ Adicionado ao Scratchpad!');
    }

    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior */}
        <div className="px-5 py-3.5 border-b border-[#1F293D] flex items-center justify-between bg-[#161F30]">
          <div className="flex items-center gap-2 text-xs font-bold text-[#06B6D4] uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            Captura Rápida Instantânea
          </div>
          <kbd className="font-mono text-[10px] text-[#94A3B8] bg-[#1E293B] px-1.5 py-0.5 rounded border border-[#334155]">
            ESC para fechar
          </kbd>
        </div>

        {/* Formulário de Captura */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <textarea
              ref={inputRef}
              rows="3"
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite sua ideia, tarefa urgente ou gasto..."
              className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-sm text-white placeholder:text-[#64748B] outline-none focus:border-[#06B6D4] resize-none"
            />
          </div>

          {/* Seletor de Destino */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'task', label: 'Tarefa', icon: 'task_alt', color: '#10B981' },
              { id: 'finance', label: 'Finanças', icon: 'payments', color: '#06B6D4' },
              { id: 'idea', label: 'Nota / Ideia', icon: 'lightbulb', color: '#8B5CF6' },
              { id: 'scratchpad', label: 'Scratchpad', icon: 'edit_note', color: '#F59E0B' }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCaptureType(t.id)}
                className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                  captureType === t.id
                    ? 'bg-[#1E293B] shadow-sm'
                    : 'bg-[#1E293B]/40 hover:bg-[#1E293B] border-[#1F293D]'
                }`}
                style={{
                  borderColor: captureType === t.id ? t.color : undefined
                }}
              >
                <span className="material-symbols-outlined text-[16px]" style={{ color: t.color }}>
                  {t.icon}
                </span>
                <span className={`text-xs font-semibold ${captureType === t.id ? 'text-white' : 'text-[#94A3B8]'}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>

          {/* Campo extra de Valor se for Finança */}
          {captureType === 'finance' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-[#94A3B8] block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="text-[11px] text-[#94A3B8] block mb-1">Tipo</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white outline-none"
                >
                  <option value="Gasto">Gasto / Despesa</option>
                  <option value="Receita">Receita / Entrada</option>
                </select>
              </div>
            </div>
          )}

          {/* Feedback e Botão Enviar */}
          <div className="flex items-center justify-between pt-2">
            <div>
              {feedback && (
                <span className="text-xs font-semibold text-[#10B981] animate-pulse">
                  {feedback}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Salvar</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

