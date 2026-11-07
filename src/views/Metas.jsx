import React, { useState, useRef } from 'react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const THEMES = [
  { id: 'Profissional', name: 'Profissional', icon: 'business_center', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 'Financeiro', name: 'Financeiro', icon: 'account_balance_wallet', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'Saúde e Bem-estar', name: 'Saúde & Bem-estar', icon: 'fitness_center', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
  { id: 'Intelectual', name: 'Intelectual & Conhecimento', icon: 'psychology', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { id: 'Pessoal', name: 'Pessoal & Família', icon: 'person', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' }
];

export default function Metas({ goals = [], onCreateGoal, onUpdateGoal, onDeleteGoal, isUltraClean }) {
  const [activeTab, setActiveTab] = useState('cards'); // 'cards' | 'timeline' | 'pilares'
  const [selectedYear, setSelectedYear] = useState('Todos');
  const [selectedTheme, setSelectedTheme] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos'); // 'Todos' | 'andamento' | 'concluidas'
  const [searchQuery, setSearchQuery] = useState('');

  // Milestone inline adding state: { [goalId]: text }
  const [newMilestoneText, setNewMilestoneText] = useState({});
  const [activeMilestoneInput, setActiveMilestoneInput] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  // Form states
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('Profissional');
  const [targetYear, setTargetYear] = useState(2027);
  const [targetMonth, setTargetMonth] = useState(12);
  const [targetValue, setTargetValue] = useState(100);
  const [currentValue, setCurrentValue] = useState(0);
  const [unit, setUnit] = useState('%');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef(null);

  const availableYears = ['Todos', '2025', '2026', '2027', '2028', '2029', '2030'];

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Selecione uma imagem de até 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(String(event.target.result));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStartEdit = (goal) => {
    setEditingGoal(goal);
    setTitle(goal.title || '');
    setTheme(goal.theme || 'Profissional');
    setTargetYear(Number(goal.target_year) || 2027);
    setTargetMonth(Number(goal.target_month) || 12);
    setTargetValue(Number(goal.target_value) || 100);
    setCurrentValue(Number(goal.current_value) || 0);
    setUnit(goal.unit || '%');
    setNotes(goal.notes || '');
    setImageUrl(goal.image_url || '');
    setShowModal(true);
  };

  const handleOpenCreateModal = () => {
    setEditingGoal(null);
    setTitle('');
    setTheme('Profissional');
    setTargetYear(2027);
    setTargetMonth(12);
    setTargetValue(100);
    setCurrentValue(0);
    setUnit('%');
    setNotes('');
    setImageUrl('');
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const goalPayload = {
      title: title.trim(),
      theme,
      target_year: Number(targetYear),
      target_month: Number(targetMonth),
      target_value: Number(targetValue) || 100,
      current_value: Number(currentValue) || 0,
      unit: unit.trim() || '%',
      notes: notes.trim(),
      image_url: imageUrl.trim(),
      is_completed: Number(currentValue) >= Number(targetValue)
    };

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, goalPayload);
    } else {
      onCreateGoal({
        ...goalPayload,
        milestones: []
      });
    }

    setShowModal(false);
    setEditingGoal(null);
  };

  // Helper inline milestone addition
  const handleAddMilestone = (goalId) => {
    const text = (newMilestoneText[goalId] || '').trim();
    if (!text) return;

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    const prev = goal.milestones || [];
    const updated = [...prev, { id: 'm_' + Date.now(), title: text, done: false }];
    onUpdateGoal(goalId, { milestones: updated });

    setNewMilestoneText((prevMap) => ({ ...prevMap, [goalId]: '' }));
    setActiveMilestoneInput(null);
  };

  const handleToggleMilestone = (goal, milestoneId) => {
    const prev = goal.milestones || [];
    const updated = prev.map((m) => (m.id === milestoneId ? { ...m, done: !m.done } : m));
    const doneCount = updated.filter((m) => m.done).length;
    const autoProgress = updated.length > 0 ? Math.round((doneCount / updated.length) * (goal.target_value || 100)) : goal.current_value;
    const isCompleted = doneCount === updated.length && updated.length > 0;

    onUpdateGoal(goal.id, {
      milestones: updated,
      current_value: autoProgress,
      is_completed: isCompleted
    });
  };

  const handleDeleteMilestone = (goal, milestoneId) => {
    const prev = goal.milestones || [];
    const updated = prev.filter((m) => m.id !== milestoneId);
    onUpdateGoal(goal.id, { milestones: updated });
  };

  // Quick progress adjustment
  const handleAdjustProgress = (goal, delta) => {
    const target = Number(goal.target_value) || 100;
    const current = Number(goal.current_value) || 0;
    const nextVal = Math.max(0, Math.min(target, current + delta));
    onUpdateGoal(goal.id, {
      current_value: nextVal,
      is_completed: nextVal >= target
    });
  };

  const handleSetPresetProgress = (goal, percentage) => {
    const target = Number(goal.target_value) || 100;
    const nextVal = Math.round((percentage / 100) * target);
    onUpdateGoal(goal.id, {
      current_value: nextVal,
      is_completed: percentage >= 100
    });
  };

  const handleToggleComplete = (goal) => {
    const target = Number(goal.target_value) || 100;
    const isNowDone = !goal.is_completed && Number(goal.current_value) < target;
    onUpdateGoal(goal.id, {
      current_value: isNowDone ? target : 0,
      is_completed: isNowDone
    });
  };

  // Filtering
  const filteredGoals = goals.filter((g) => {
    const goalYear = String(g.target_year || 2027);
    const matchesYear = selectedYear === 'Todos' || goalYear === selectedYear;
    const matchesTheme = selectedTheme === 'Todos' || g.theme === selectedTheme;
    const matchesSearch = !searchQuery || g.title?.toLowerCase().includes(searchQuery.toLowerCase());

    const isComplete = g.is_completed || Number(g.current_value) >= Number(g.target_value);
    let matchesStatus = true;
    if (statusFilter === 'andamento') matchesStatus = !isComplete && Number(g.current_value) > 0;
    if (statusFilter === 'concluidas') matchesStatus = isComplete;
    if (statusFilter === 'iniciar') matchesStatus = Number(g.current_value) === 0;

    return matchesYear && matchesTheme && matchesSearch && matchesStatus;
  });

  // Telemetry KPIs
  const totalGoalsCount = goals.length;
  const completedCount = goals.filter((g) => g.is_completed || Number(g.current_value) >= Number(g.target_value)).length;
  const inProgressCount = goals.filter((g) => !g.is_completed && Number(g.current_value) > 0 && Number(g.current_value) < Number(g.target_value)).length;
  const avgProgress = totalGoalsCount
    ? Math.round(goals.reduce((acc, g) => acc + (Math.min(100, (Number(g.current_value || 0) / Number(g.target_value || 100)) * 100)), 0) / totalGoalsCount)
    : 0;

  const getThemeMeta = (th) => {
    return THEMES.find((t) => t.id === th) || {
      name: th,
      icon: 'flag',
      color: 'text-slate-300',
      bg: 'bg-slate-800/40',
      border: 'border-slate-700'
    };
  };

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* Strategic Header & Horizon Hub */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#0A0E17] border border-[#1F293D] p-6 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Horizonte 2027 • OKRs Estratégicos
              </span>
              <span className="text-xs text-[#64748B]">• Multi-Ano</span>
              {isUltraClean && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-bold">
                  ✨ Modo Essencial
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Metas & Objetivos 2027
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Alinhamento estratégico contínuo. Defina marcos anuais, desdobre em etapas operacionais e acompanhe o ritmo de realização rumo ao objetivo final.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#041F15] font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.25)] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>+ Nova Meta</span>
            </button>
          </div>
        </div>

        {/* Telemetry KPI Cards */}
        {!isUltraClean && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-[#1F293D]/70">
            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Metas Ativas</span>
                <div className="text-xl font-bold text-white mt-0.5 font-mono">{totalGoalsCount} OKRs</div>
                <span className="text-[10px] text-cyan-400 font-medium">{inProgressCount} em andamento</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#1E293B] border border-[#334155] flex items-center justify-center text-cyan-400">
                <span className="material-symbols-outlined text-[20px]">flag</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Progresso Médio</span>
                <div className="text-xl font-bold text-emerald-400 mt-0.5 font-mono">{avgProgress}%</div>
                <span className="text-[10px] text-[#94A3B8]">Trajetória consolidada</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[20px]">trending_up</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Concluídas</span>
                <div className="text-xl font-bold text-white mt-0.5 font-mono">{completedCount} Metas</div>
                <span className="text-[10px] text-emerald-400 font-medium">
                  {totalGoalsCount ? Math.round((completedCount / totalGoalsCount) * 100) : 0}% de taxa
                </span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
                <span className="material-symbols-outlined text-[20px]">verified</span>
              </div>
            </div>

            <div className="bg-[#111827]/80 border border-[#1F293D] p-3.5 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Horizonte Alvo</span>
                <div className="text-xl font-bold text-amber-400 mt-0.5 font-mono">2027</div>
                <span className="text-[10px] text-[#94A3B8]">31 Dezembro</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-1.5 bg-[#111827] border border-[#1F293D] p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('cards')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'cards'
                ? 'bg-emerald-500 text-[#041F15] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">grid_view</span>
            <span>Cartões & Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-emerald-500 text-[#041F15] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">timeline</span>
            <span>Linha do Tempo 2025–2027</span>
          </button>

          <button
            onClick={() => setActiveTab('pilares')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'pilares'
                ? 'bg-emerald-500 text-[#041F15] shadow-sm'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">donut_large</span>
            <span>Diagnóstico por Pilar</span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative hidden sm:block w-64">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-[#64748B] text-[16px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar meta..."
            className="w-full bg-[#111827] border border-[#1F293D] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Toolbar (Cards & Timeline) */}
      {activeTab !== 'pilares' && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#111827]/80 border border-[#1F293D] p-3 rounded-xl text-xs">
          {/* Year Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#64748B] font-semibold mr-1">Ano:</span>
            {availableYears.map((yr) => (
              <button
                key={yr}
                onClick={() => setSelectedYear(yr)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  selectedYear === yr
                    ? 'bg-cyan-500 text-[#022129] font-bold shadow-sm'
                    : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>

          {/* Area / Pilar Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[#64748B] font-semibold mr-1">Área:</span>
            {['Todos', ...THEMES.map((t) => t.id)].map((th) => (
              <button
                key={th}
                onClick={() => setSelectedTheme(th)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-medium ${
                  selectedTheme === th
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                {th === 'Saúde e Bem-estar' ? 'Saúde' : th}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#64748B] font-semibold mr-1">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#1E293B] border border-[#334155] rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-emerald-500"
            >
              <option value="Todos">Todas as Metas</option>
              <option value="andamento">Em Andamento</option>
              <option value="concluidas">Concluídas</option>
              <option value="iniciar">A Iniciar (0%)</option>
            </select>
          </div>
        </div>
      )}

      {/* TAB 1: CARDS GRID */}
      {activeTab === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredGoals.length === 0 ? (
            <div className="col-span-full text-center py-16 bg-[#111827] border border-[#1F293D] rounded-2xl p-6">
              <span className="material-symbols-outlined text-[42px] text-[#64748B] mb-2">radar</span>
              <p className="text-sm font-semibold text-white">Nenhuma meta encontrada com os filtros selecionados.</p>
              <p className="text-xs text-[#94A3B8] mt-1">
                Ajuste os filtros de ano e área acima ou crie um novo objetivo estratégico para seu plano 2027.
              </p>
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-[#041F15] text-xs font-bold hover:bg-emerald-400 transition-colors"
              >
                + Cadastrar Nova Meta
              </button>
            </div>
          ) : (
            filteredGoals.map((g) => {
              const current = Number(g.current_value) || 0;
              const target = Number(g.target_value) || 100;
              const pct = Math.min(100, Math.round((current / target) * 100));
              const isDone = g.is_completed || current >= target;
              const themeMeta = getThemeMeta(g.theme);
              const year = g.target_year || 2027;
              const monthName = MONTH_NAMES[(Number(g.target_month) || 12) - 1] || 'Dezembro';
              const milestones = g.milestones || [];
              const doneMilestones = milestones.filter((m) => m.done).length;
              const isAddingMilestone = activeMilestoneInput === g.id;

              return (
                <div
                  key={g.id}
                  className={`bg-[#111827] border rounded-2xl flex flex-col justify-between transition-all group shadow-sm hover:shadow-md ${
                    isDone
                      ? 'border-emerald-500/40 bg-gradient-to-b from-[#111827] to-[#06231A]/30'
                      : 'border-[#1F293D] hover:border-[#334155]'
                  }`}
                >
                  <div className="p-5">
                    {/* Top card header */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-semibold flex items-center gap-1.5 ${themeMeta.bg} ${themeMeta.color} ${themeMeta.border}`}>
                        <span className="material-symbols-outlined text-[13px]">{themeMeta.icon}</span>
                        {themeMeta.name}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded">
                          {year} • {monthName}
                        </span>

                        <button
                          onClick={() => handleStartEdit(g)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-cyan-400 transition-all rounded hover:bg-[#1E293B]"
                          title="Editar meta"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir a meta "${g.title}"?`)) {
                              onDeleteGoal(g.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#94A3B8] hover:text-red-400 transition-all rounded hover:bg-[#1E293B]"
                          title="Excluir meta"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Vision Board Image Preview */}
                    {g.image_url && (
                      <div className="w-full h-36 rounded-xl overflow-hidden mb-3 relative bg-[#1E293B] border border-[#1F293D]">
                        <img
                          src={g.image_url}
                          alt={g.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent opacity-70" />
                        {isDone && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-emerald-500/90 text-[#041F15] text-[10px] font-bold backdrop-blur-sm">
                            ✨ Concluída
                          </div>
                        )}
                      </div>
                    )}

                    {/* Title & Notes */}
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-base font-bold leading-snug ${isDone ? 'text-emerald-400 line-through decoration-emerald-500/50' : 'text-white'}`}>
                          {g.title}
                        </h3>
                        {isDone && (
                          <span className="material-symbols-outlined text-emerald-400 text-[20px] shrink-0" title="Meta Concluída">
                            check_circle
                          </span>
                        )}
                      </div>
                      {g.notes && (
                        <p className="text-xs text-[#94A3B8] mt-1.5 line-clamp-2 italic">
                          "{g.notes}"
                        </p>
                      )}
                    </div>

                    {/* Progress Bar & Numeric Steppers */}
                    <div className="space-y-2 pt-2 border-t border-[#1F293D]/60">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#94A3B8] font-medium flex items-center gap-1">
                          Progresso
                          {isDone && <span className="text-emerald-400 font-bold">• 100% Alcançado</span>}
                        </span>
                        <span className="font-mono font-bold text-white">
                          {pct}% ({current}/{target} {g.unit || '%'})
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isDone
                              ? 'bg-emerald-500'
                              : 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Steppers & Presets */}
                      <div className="flex items-center justify-between gap-1 pt-1 flex-wrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustProgress(g, -10)}
                            className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white font-mono text-[10px] font-bold transition-colors"
                            title="Diminuir 10"
                          >
                            -10
                          </button>
                          <button
                            onClick={() => handleAdjustProgress(g, 5)}
                            className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-cyan-400 font-mono text-[10px] font-bold transition-colors"
                            title="Avançar 5"
                          >
                            +5
                          </button>
                          <button
                            onClick={() => handleAdjustProgress(g, 10)}
                            className="px-2 py-0.5 rounded bg-[#1E293B] hover:bg-[#334155] text-emerald-400 font-mono text-[10px] font-bold transition-colors"
                            title="Avançar 10"
                          >
                            +10
                          </button>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1">
                          {[25, 50, 75].map((pr) => (
                            <button
                              key={pr}
                              onClick={() => handleSetPresetProgress(g, pr)}
                              className="px-1.5 py-0.5 rounded bg-[#1E293B]/60 hover:bg-[#334155] text-[#94A3B8] hover:text-white text-[10px] font-mono transition-colors"
                            >
                              {pr}%
                            </button>
                          ))}
                          <button
                            onClick={() => handleToggleComplete(g)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-emerald-500 text-[#041F15] hover:bg-emerald-400'
                            }`}
                            title={isDone ? 'Reabrir meta' : 'Concluir meta'}
                          >
                            {isDone ? 'Concluída ✔' : 'Concluir'}
                          </button>
                        </div>
                      </div>

                      {/* Interactive Slider */}
                      <input
                        type="range"
                        min="0"
                        max={target}
                        value={current}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          onUpdateGoal(g.id, {
                            current_value: val,
                            is_completed: val >= target
                          });
                        }}
                        className="w-full accent-emerald-500 h-1 bg-[#1E293B] rounded cursor-pointer mt-1"
                      />
                    </div>
                  </div>

                  {/* Sub-marcos / Etapas Operacionais (Sem window.prompt!) */}
                  <div className="px-5 py-3.5 bg-[#0C121E]/60 border-t border-[#1F293D] rounded-b-2xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#94A3B8]">
                      <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px] text-cyan-400">task_alt</span>
                        Etapas & Marcos ({doneMilestones}/{milestones.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveMilestoneInput(isAddingMilestone ? null : g.id)}
                        className="text-[11px] text-cyan-400 hover:text-white transition-colors cursor-pointer font-bold flex items-center gap-0.5"
                      >
                        <span className="material-symbols-outlined text-[13px]">{isAddingMilestone ? 'close' : 'add'}</span>
                        {isAddingMilestone ? 'Cancelar' : 'Nova Etapa'}
                      </button>
                    </div>

                    {/* Inline Milestone Input Form */}
                    {isAddingMilestone && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <input
                          type="text"
                          autoFocus
                          value={newMilestoneText[g.id] || ''}
                          onChange={(e) => setNewMilestoneText({ ...newMilestoneText, [g.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMilestone(g.id);
                            }
                            if (e.key === 'Escape') setActiveMilestoneInput(null);
                          }}
                          placeholder="Ex: Ler capítulo 1, Poupar R$ 500..."
                          className="flex-1 bg-[#1E293B] border border-cyan-500/40 rounded-lg px-2.5 py-1 text-xs text-white placeholder-[#64748B] outline-none focus:border-cyan-400"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMilestone(g.id)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500 text-[#022129] font-bold text-xs hover:bg-cyan-400 transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    )}

                    {/* Milestone Items List */}
                    {milestones.length > 0 ? (
                      <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                        {milestones.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-xs py-0.5 group/m hover:bg-[#1E293B]/40 px-1 rounded transition-colors">
                            <label className="flex items-center gap-2 cursor-pointer truncate flex-1 select-none">
                              <input
                                type="checkbox"
                                checked={m.done}
                                onChange={() => handleToggleMilestone(g, m.id)}
                                className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer shrink-0"
                              />
                              <span className={`text-[11px] truncate ${m.done ? 'line-through text-[#64748B]' : 'text-slate-200'}`}>
                                {m.title}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => handleDeleteMilestone(g, m.id)}
                              className="opacity-0 group-hover/m:opacity-100 text-[#64748B] hover:text-red-400 p-0.5 transition-opacity"
                              title="Excluir etapa"
                            >
                              <span className="material-symbols-outlined text-[13px]">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      !isAddingMilestone && (
                        <p className="text-[10px] text-[#64748B] italic">Nenhuma etapa intermediária definida ainda.</p>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: TIMELINE / HORIZONTE 2025-2027 */}
      {activeTab === 'timeline' && (
        <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 space-y-8">
          <div className="border-b border-[#1F293D] pb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">timeline</span>
              Linha do Tempo Estratégica Rumo a 2027
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Visualize suas realizações planejadas distribuídas cronologicamente até o horizonte final de 2027.
            </p>
          </div>

          {[2025, 2026, 2027, 2028].map((year) => {
            const yearGoals = goals
              .filter((g) => (Number(g.target_year) || 2027) === year)
              .sort((a, b) => (Number(a.target_month) || 12) - (Number(b.target_month) || 12));

            return (
              <div key={year} className="relative pl-6 sm:pl-8 border-l-2 border-emerald-500/30 space-y-4">
                {/* Year Marker Badge */}
                <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-[#111827] border-2 border-emerald-500 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs shadow-md">
                  {String(year).slice(-2)}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
                    Ano {year}
                    <span className="text-xs text-[#64748B] font-normal">
                      • {yearGoals.length} meta{yearGoals.length !== 1 ? 's' : ''} planejada{yearGoals.length !== 1 ? 's' : ''}
                    </span>
                  </h3>
                </div>

                {yearGoals.length === 0 ? (
                  <p className="text-xs text-[#64748B] italic">Nenhuma meta alocada para este ano.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {yearGoals.map((g) => {
                      const current = Number(g.current_value) || 0;
                      const target = Number(g.target_value) || 100;
                      const pct = Math.min(100, Math.round((current / target) * 100));
                      const isDone = g.is_completed || current >= target;
                      const themeMeta = getThemeMeta(g.theme);
                      const monthName = MONTH_NAMES[(Number(g.target_month) || 12) - 1] || 'Dezembro';

                      return (
                        <div
                          key={g.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isDone
                              ? 'bg-emerald-500/10 border-emerald-500/30'
                              : 'bg-[#1E293B]/60 border-[#334155]/60 hover:border-[#334155]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${themeMeta.bg} ${themeMeta.color}`}>
                              {themeMeta.name}
                            </span>
                            <span className="text-[10px] font-mono text-[#94A3B8]">
                              Mês {g.target_month || 12} ({monthName})
                            </span>
                          </div>

                          <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${isDone ? 'text-emerald-300 line-through' : 'text-white'}`}>
                            {g.title}
                          </h4>

                          <div className="mt-2.5 space-y-1">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-[#94A3B8]">Progresso</span>
                              <span className="font-mono font-bold text-white">{pct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#111827] overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isDone ? 'bg-emerald-400' : 'bg-cyan-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: DIAGNÓSTICO POR PILAR */}
      {activeTab === 'pilares' && (
        <div className="space-y-6">
          <div className="bg-[#111827] border border-[#1F293D] p-5 rounded-2xl">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-400">donut_large</span>
              Balanço Estratégico dos 5 Pilares
            </h2>
            <p className="text-xs text-[#94A3B8] mt-1">
              Avaliação do equilíbrio entre carreira, patrimônio financeiro, integridade física, intelectual e realizações pessoais.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {THEMES.map((th) => {
              const pillarGoals = goals.filter((g) => g.theme === th.id);
              const pillarTotal = pillarGoals.length;
              const pillarCompleted = pillarGoals.filter((g) => g.is_completed || Number(g.current_value) >= Number(g.target_value)).length;
              const pillarAvgPct = pillarTotal
                ? Math.round(pillarGoals.reduce((acc, g) => acc + (Math.min(100, (Number(g.current_value || 0) / Number(g.target_value || 100)) * 100)), 0) / pillarTotal)
                : 0;

              return (
                <div
                  key={th.id}
                  className="bg-[#111827] border border-[#1F293D] hover:border-[#334155] rounded-2xl p-5 flex flex-col justify-between space-y-4 transition-all shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${th.bg} ${th.color} border ${th.border}`}>
                          <span className="material-symbols-outlined text-[18px]">{th.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{th.name}</h3>
                          <span className="text-[10px] text-[#64748B] font-mono">{pillarTotal} OKR{pillarTotal !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-mono font-bold ${th.color}`}>{pillarAvgPct}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${th.bg.replace('/10', '')}`}
                        style={{ width: `${pillarAvgPct}%`, backgroundColor: 'currentColor' }}
                      />
                    </div>

                    <div className="text-xs text-[#94A3B8] flex items-center justify-between">
                      <span>Conclusão:</span>
                      <span className="font-semibold text-white">{pillarCompleted} de {pillarTotal} concluídas</span>
                    </div>

                    {/* List of goals in this pillar */}
                    <div className="mt-3 pt-3 border-t border-[#1F293D] space-y-1.5">
                      <span className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wider block">
                        Metas neste pilar
                      </span>
                      {pillarGoals.length === 0 ? (
                        <p className="text-xs text-[#64748B] italic">Nenhuma meta cadastrada.</p>
                      ) : (
                        pillarGoals.slice(0, 4).map((pg) => {
                          const pct = Math.min(100, Math.round(((Number(pg.current_value) || 0) / (Number(pg.target_value) || 100)) * 100));
                          return (
                            <div key={pg.id} className="flex items-center justify-between text-xs py-0.5">
                              <span className="text-slate-300 truncate max-w-[180px]">{pg.title}</span>
                              <span className="font-mono text-[11px] text-[#94A3B8]">{pct}%</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedTheme(th.id);
                      setActiveTab('cards');
                    }}
                    className="w-full py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                  >
                    Ver Metas deste Pilar →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Criar / Editar Meta */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">
                  {editingGoal ? 'edit' : 'flag'}
                </span>
                {editingGoal ? 'Editar Meta Estratégica' : 'Cadastrar Nova Meta 2027'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingGoal(null);
                }}
                className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-[#1E293B]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Título do Objetivo</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reserva de emergência, Lançar SaaS, Aprender Alemão..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm text-white placeholder-[#64748B] outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Área / Tema */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Pilar Estratégico</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                        theme === t.id
                          ? `${t.bg} ${t.color} ${t.border} ring-1 ring-emerald-500`
                          : 'bg-[#1E293B]/70 border-[#334155] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ano e Mês Alvo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Ano Alvo</label>
                  <select
                    value={targetYear}
                    onChange={(e) => setTargetYear(Number(e.target.value))}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  >
                    {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Mês Alvo</label>
                  <select
                    value={targetMonth}
                    onChange={(e) => setTargetMonth(Number(e.target.value))}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    {MONTH_NAMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {idx + 1} - {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Valor Alvo, Atual e Unidade */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Meta Alvo</label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Progresso Atual</label>
                  <input
                    type="number"
                    min="0"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Unidade</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="%, R$, livros..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Descrição / Motivação */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Motivação & Propósito (opcional)
                </label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Por que este objetivo é inegociável até 2027?"
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              {/* Foto de Inspiração / Vision Board */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Foto de Inspiração / Vision Board (opcional)
                </label>
                <div className="flex items-center gap-3">
                  {imageUrl && (
                    <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#1E293B] border border-[#334155] shrink-0">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded bg-[#1E293B] hover:bg-[#334155] text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-[#334155] transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">add_photo_alternate</span>
                        <span>Escolher Arquivo</span>
                      </button>

                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="px-2 py-1 rounded bg-red-500/15 text-red-400 text-xs hover:bg-red-500/25 transition-colors"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={imageUrl.startsWith('data:') ? '' : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="Ou cole a URL direta da imagem..."
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-lg px-2.5 py-1 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingGoal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-white text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#041F15] font-bold text-xs transition-colors shadow-sm"
                >
                  {editingGoal ? 'Salvar Alterações' : 'Cadastrar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
