import React, { useState } from 'react';
import { UserGoalsService } from '../services/userGoals';

export default function Metas2027({ goals, onCreateGoal, onUpdateGoal, onDeleteGoal }) {
  const [selectedTheme, setSelectedTheme] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTheme, setNewTheme] = useState('Profissional');
  const [newTargetMonth, setNewTargetMonth] = useState(12);
  const [newTargetValue, setNewTargetValue] = useState(100);

  const themes = ['Todos', 'Profissional', 'Financeiro', 'Intelectual', 'Saúde e Bem-estar', 'Pessoal'];

  const filteredGoals = (goals || []).filter((g) => {
    return selectedTheme === 'Todos' || g.theme === selectedTheme;
  });

  const avgProgress = goals && goals.length
    ? Math.round(goals.reduce((acc, g) => acc + (Number(g.current_value || 0) / Number(g.target_value || 100)) * 100, 0) / goals.length)
    : 0;

  const completedCount = (goals || []).filter((g) => g.is_completed || Number(g.current_value) >= Number(g.target_value)).length;

  const handleStartEditGoal = (goal) => {
    setEditingGoal(goal);
    setNewTitle(goal.title);
    setNewTheme(goal.theme);
    setNewTargetMonth(goal.target_month || 12);
    setNewTargetValue(goal.target_value || 100);
  };

  const handleSaveGoal = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (editingGoal) {
      onUpdateGoal(editingGoal.id, {
        title: newTitle.trim(),
        theme: newTheme,
        target_month: Number(newTargetMonth),
        target_value: Number(newTargetValue)
      });
      setEditingGoal(null);
    } else {
      onCreateGoal({
        title: newTitle.trim(),
        theme: newTheme,
        target_month: Number(newTargetMonth),
        target_value: Number(newTargetValue),
        current_value: 0
      });
      setShowModal(false);
    }

    setNewTitle('');
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1600px] mx-auto">
      {/* Top Strategic Banner & Telemetry Hub */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low border border-outline-variant/20 p-space-lg shadow-xl">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 via-secondary/10 to-transparent blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg">
          <div className="space-y-space-xs max-w-3xl">
            <div className="flex items-center gap-space-sm flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm tracking-wide uppercase border border-primary/20">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Horizonte Estratégico • {UserGoalsService.getTrackingYear()}–2027
              </span>
              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm border border-outline-variant/30">
                {goals.length} OKRs Primários
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Metas 2027 — Visão Estratégica & OKRs
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Construção da fortaleza pessoal, intelectual e financeira até 31 de Dezembro de 2027. Monitoramento contínuo de métricas compostas e execução diária.
            </p>
          </div>

          <div className="flex items-center gap-space-sm shrink-0">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-primary text-on-primary font-label-lg font-semibold shadow-[0_0_18px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>+ Nova Meta Estratégica</span>
            </button>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mt-space-lg">
          <div className="p-space-md rounded-xl bg-surface-container-high/60 border border-outline-variant/20 backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Metas Ativas</div>
              <div className="font-headline-md text-headline-md text-on-surface font-bold mt-0.5">{goals.length} OKRs</div>
              <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> Cadência contínua
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">flag</span>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-high/60 border border-outline-variant/20 backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Progresso Médio</div>
              <div className="font-headline-md text-headline-md text-primary font-bold mt-0.5">{avgProgress}%</div>
              <div className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                Alinhado com a trajetória 2027
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">bolt</span>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-high/60 border border-outline-variant/20 backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Concluídas</div>
              <div className="font-headline-md text-headline-md text-on-surface font-bold mt-0.5">{completedCount} Metas</div>
              <div className="font-body-sm text-body-sm text-primary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span> Validadas
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[22px]">task_alt</span>
            </div>
          </div>

          <div className="p-space-md rounded-xl bg-surface-container-high/60 border border-outline-variant/20 backdrop-blur-md flex items-center justify-between">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Ritmo Operacional</div>
              <div className="font-headline-md text-headline-md text-on-surface font-bold mt-0.5">Implacável</div>
              <div className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-[14px]">speed</span> 94% assertividade
              </div>
            </div>
            <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">rocket_launch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {themes.map((th) => (
          <button
            key={th}
            onClick={() => setSelectedTheme(th)}
            className={`px-space-md py-2 rounded-xl font-label-md font-semibold transition-all whitespace-nowrap ${
              selectedTheme === th
                ? 'bg-primary-container text-on-primary-container shadow-sm'
                : 'bg-surface-container border border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {th}
          </button>
        ))}
      </div>

      {/* Goals Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
        {filteredGoals.map((g) => {
          const pct = Math.min(100, Math.round((g.current_value / g.target_value) * 100));
          return (
            <div
              key={g.id}
              className="p-space-lg rounded-xl bg-surface-container/70 border border-outline-variant/20 hover:border-outline-variant/50 transition-all flex flex-col justify-between gap-space-md group"
            >
              <div>
                <div className="flex items-center justify-between gap-space-sm mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-secondary/15 text-secondary border border-secondary/20">
                    {g.theme}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-on-surface-variant">
                      Mês: {g.target_month}/12
                    </span>
                    <button
                      onClick={() => handleStartEditGoal(g)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-secondary p-1 rounded transition-all"
                      title="Editar meta"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      onClick={() => onDeleteGoal(g.id)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-error p-1 rounded transition-all"
                      title="Excluir meta"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-snug">
                  {g.title}
                </h3>
              </div>

              {/* Progress Slider & Quick Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-on-surface-variant">Progresso</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onUpdateGoal(g.id, { current_value: Math.min(g.target_value, g.current_value + 10) })}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold"
                      title="Avançar 10 unidades"
                    >
                      +10
                    </button>
                    <span className="font-mono font-bold text-primary">{pct}% ({g.current_value}/{g.target_value})</span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max={g.target_value}
                  value={g.current_value}
                  onChange={(e) => onUpdateGoal(g.id, { current_value: Number(e.target.value) })}
                  className="w-full accent-primary h-1 bg-surface-container-high rounded cursor-pointer mt-2"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar / Editar Meta */}
      {(showModal || editingGoal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-space-md bg-background/80 backdrop-blur-xl">
          <div className="w-full max-w-md bg-surface-container-low border border-outline-variant/30 rounded-xl shadow-2xl p-space-lg space-y-space-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {editingGoal ? 'Editar Meta 2027' : 'Nova Meta 2027'}
              </h3>
              <button 
                onClick={() => { setShowModal(false); setEditingGoal(null); }} 
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-space-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Título da Meta</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Lançar produto digital com 1000 assinantes..."
                  className="w-full mt-1 bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface text-body-md focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant">Tema</label>
                <select
                  value={newTheme}
                  onChange={(e) => setNewTheme(e.target.value)}
                  className="w-full mt-1 bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface text-body-md focus:outline-none"
                >
                  <option value="Profissional">Profissional</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Intelectual">Intelectual</option>
                  <option value="Saúde e Bem-estar">Saúde e Bem-estar</option>
                  <option value="Relacionamentos">Relacionamentos</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-space-sm">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Mês Alvo (1 a 12)</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={newTargetMonth}
                    onChange={(e) => setNewTargetMonth(e.target.value)}
                    className="w-full mt-1 bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface text-body-md focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant">Meta Alvo (Valor)</label>
                  <input
                    type="number"
                    min="1"
                    value={newTargetValue}
                    onChange={(e) => setNewTargetValue(e.target.value)}
                    className="w-full mt-1 bg-surface-container border border-outline-variant/40 rounded-lg p-2.5 text-on-surface text-body-md focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setEditingGoal(null); }}
                  className="px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-space-md py-2 rounded-lg bg-primary-container text-on-primary-container font-label-md font-semibold hover:opacity-90 shadow-sm"
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

