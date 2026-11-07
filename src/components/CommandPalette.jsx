import React, { useState, useEffect } from 'react';

export default function CommandPalette({ isOpen, onClose, onNavigate, tasks = [], goals = [], media = [], knowledge = [] }) {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNavItems = [
    { id: 'hub-diario', label: 'Hub Diário — Hábitos & Tarefas', icon: 'dashboard', section: 'Navegação' },
    { id: 'calendario', label: 'Calendário Interativo — Agenda & Prazos', icon: 'calendar_month', section: 'Navegação' },
    { id: 'foco-total', label: 'Modo Foco — Pomodoro & Som Ambiente', icon: 'timer', section: 'Navegação' },
    { id: 'metas', label: 'Metas & Objetivos — Planejamento Multi-Ano', icon: 'flag', section: 'Navegação' },
    { id: 'financas', label: 'Finanças — Gestão de Capital & Assinaturas', icon: 'account_balance_wallet', section: 'Navegação' },
    { id: 'saude', label: 'Saúde & Treinos — Métricas Corporais & Sono', icon: 'vital_signs', section: 'Navegação' },
    { id: 'leitura-cinema', label: 'Leitura & Cinema — Acervo Cultural', icon: 'auto_stories', section: 'Navegação' },
    { id: 'cofre', label: 'Cofre & Notas — Criptografia AES-256', icon: 'lock', section: 'Navegação' },
    { id: 'configuracoes', label: 'Configurações do Sistema — Tema, Perfil & Pomodoro', icon: 'settings', section: 'Sistema' }
  ];

  const searchResults = query.trim() === ''
    ? quickNavItems
    : [
        ...quickNavItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase())),
        ...tasks
          .filter((t) => t.title.toLowerCase().includes(query.toLowerCase()))
          .map((t) => ({ id: 'hub-diario', label: `Tarefa: ${t.title}`, icon: 'task_alt', section: 'Tarefas' })),
        ...goals
          .filter((g) => g.title.toLowerCase().includes(query.toLowerCase()))
          .map((g) => ({ id: 'metas-2027', label: `Meta: ${g.title}`, icon: 'flag', section: 'Metas' })),
        ...media
          .filter((m) => m.title.toLowerCase().includes(query.toLowerCase()))
          .map((m) => ({ id: 'leitura-cinema', label: `Mídia: ${m.title}`, icon: 'auto_stories', section: 'Acervo' })),
        ...knowledge
          .filter((k) => k.title.toLowerCase().includes(query.toLowerCase()))
          .map((k) => ({ id: 'cofre', label: `Nota: ${k.title}`, icon: 'menu_book', section: 'Conhecimento' }))
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-background/80 backdrop-blur-xl animate-fade-in">
      <div
        className="w-full max-w-xl bg-surface-container-low border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-outline-variant/20 flex items-center gap-3 bg-surface-container/50">
          <span className="material-symbols-outlined text-primary text-[22px]">search</span>
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite para buscar em 2027 ou navegar..."
            className="w-full bg-transparent text-on-surface placeholder:text-on-surface-variant font-body-md focus:outline-none"
          />
          <kbd className="font-mono text-[11px] text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded border border-outline-variant/30">
            ESC
          </kbd>
        </div>

        {/* Results Stream */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-body-sm">
              Nenhum resultado encontrado para "{query}".
            </div>
          ) : (
            searchResults.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-surface-container text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px] text-primary group-hover:scale-110 transition-transform">
                    {item.icon}
                  </span>
                  <span className="font-label-md text-on-surface group-hover:text-primary transition-colors">
                    {item.label}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-on-surface-variant uppercase px-2 py-0.5 rounded bg-surface-container-high">
                  {item.section}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="p-2.5 bg-surface-container-lowest/80 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">keyboard_return</span> Selecionar
          </span>
          <span className="font-mono">Obsidian Nexus Navigation</span>
        </div>
      </div>
    </div>
  );
}

