import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { UserGoalsService } from '../services/userGoals';
import { playTactileFeedback } from '../services/haptics';

const WORKOUT_TYPES = [
  { id: 'Musculação', label: 'Musculação', icon: 'fitness_center', color: '#10B981' },
  { id: 'Corrida', label: 'Corrida', icon: 'directions_run', color: '#06B6D4' },
  { id: 'Ciclismo', label: 'Ciclismo', icon: 'directions_bike', color: '#8B5CF6' },
  { id: 'Caminhada', label: 'Caminhada', icon: 'hiking', color: '#3B82F6' },
  { id: 'Natação', label: 'Natação', icon: 'pool', color: '#0EA5E9' },
  { id: 'Luta / Artes Marciais', label: 'Luta', icon: 'sports_mma', color: '#EF4444' },
  { id: 'Funcional / Cross', label: 'Funcional', icon: 'sports_gymnastics', color: '#F59E0B' },
  { id: 'Yoga / Alongamento', label: 'Yoga & Alongamento', icon: 'self_improvement', color: '#EC4899' },
  { id: 'Descanso Ativo', label: 'Descanso Ativo', icon: 'hotel', color: '#64748B' }
];

const WORKOUT_INTENSITIES = [
  { id: 'Leve', label: 'Leve (Aquecimento/Regenerativo)', factor: 0.8 },
  { id: 'Moderado', label: 'Moderado (Ritmo Constante)', factor: 1.0 },
  { id: 'Intenso', label: 'Intenso (Cargas Altas/Frequência Alta)', factor: 1.25 },
  { id: 'Alta Performance', label: 'Alta Performance (Até a Falha)', factor: 1.5 }
];

const WORKOUT_FOCUS_OPTIONS = [
  'Full Body',
  'Peito & Tríceps',
  'Costas & Bíceps',
  'Pernas & Glúteos',
  'Ombros & Trapézio',
  'Abdômen & Core',
  'Cardio / HIIT'
];

export default function SaudeMetricas({ isUltraClean }) {
  // Abas exclusivas: 'treinos' | 'emagrecimento'
  const [activeTab, setActiveTab] = useState('treinos');

  const [metrics, setMetrics] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [feedback, setFeedback] = useState('');

  // Metas do usuário (peso e treinos)
  const [workoutsTarget, setWorkoutsTarget] = useState(() => UserGoalsService.getWorkoutsTarget());
  const [targetWeight, setTargetWeight] = useState(() => UserGoalsService.getTargetWeight());
  const [initialWeight, setInitialWeight] = useState(() => UserGoalsService.getInitialWeight());

  // Modal de Metas
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [formWorkouts, setFormWorkouts] = useState(() => String(UserGoalsService.getWorkoutsTarget()));
  const [formWeight, setFormWeight] = useState(() => String(UserGoalsService.getTargetWeight()));
  const [formInitWeight, setFormInitWeight] = useState(() => String(UserGoalsService.getInitialWeight()));

  // Registro de Treino para a data selecionada
  const [workoutType, setWorkoutType] = useState('Musculação');
  const [workoutMinutes, setWorkoutMinutes] = useState('50');
  const [workoutIntensity, setWorkoutIntensity] = useState('Moderado');
  const [workoutFocus, setWorkoutFocus] = useState('Full Body');
  const [workoutNotes, setWorkoutNotes] = useState('');

  // Registro de Pesagem
  const [inputWeight, setInputWeight] = useState('');
  const [chartPeriodFilter, setChartPeriodFilter] = useState('30d'); // '14d' | '30d' | 'todos'

  // Histórico de Treinos
  const [historyFilter, setHistoryFilter] = useState('Todos');

  useEffect(() => {
    refreshData();

    const handleUpdate = () => refreshData();
    const handleGoalsUpdate = () => {
      setWorkoutsTarget(UserGoalsService.getWorkoutsTarget());
      setTargetWeight(UserGoalsService.getTargetWeight());
      setInitialWeight(UserGoalsService.getInitialWeight());
    };

    window.addEventListener('nexus_data_updated', handleUpdate);
    window.addEventListener('nexus_user_goals_updated', handleGoalsUpdate);

    return () => {
      window.removeEventListener('nexus_data_updated', handleUpdate);
      window.removeEventListener('nexus_user_goals_updated', handleGoalsUpdate);
    };
  }, [selectedDate]);

  const refreshData = () => {
    const data = db.getHealthMetrics();
    data.sort((a, b) => new Date(b.date) - new Date(a.date));
    setMetrics(data);

    const currentEntry = data.find((m) => m.date === selectedDate);
    if (currentEntry) {
      if (currentEntry.weight) setInputWeight(String(currentEntry.weight));
      if (currentEntry.workout_type) setWorkoutType(currentEntry.workout_type);
      if (currentEntry.workout_minutes) setWorkoutMinutes(String(currentEntry.workout_minutes));
      if (currentEntry.workout_intensity) setWorkoutIntensity(currentEntry.workout_intensity);
      if (currentEntry.workout_focus) setWorkoutFocus(currentEntry.workout_focus);
      if (currentEntry.notes) setWorkoutNotes(currentEntry.notes);
    } else {
      setInputWeight('');
      setWorkoutNotes('');
    }
  };

  const triggerFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // Entrada do dia selecionado
  const currentDayEntry = metrics.find((m) => m.date === selectedDate) || {};
  const hasTrainedOnSelectedDate = Boolean(currentDayEntry.workout_minutes && currentDayEntry.workout_minutes > 0);
  const currentDayWeight = Number(currentDayEntry.weight) || 0;

  // Navegação de Datas
  const changeDateBy = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    const newDateStr = current.toISOString().split('T')[0];
    setSelectedDate(newDateStr);
    playTactileFeedback('check');
  };

  // Cálculo de Calorias Estimadas
  const estimateCalories = (type, mins, intensity) => {
    const w = currentDayWeight || targetWeight || 75;
    const m = Number(mins) || 0;
    if (m <= 0) return 0;
    let baseMET = 6.0;
    if (type === 'Corrida') baseMET = 9.5;
    else if (type === 'Ciclismo') baseMET = 8.0;
    else if (type === 'Natação') baseMET = 8.5;
    else if (type === 'Caminhada') baseMET = 4.0;
    else if (type === 'Luta / Artes Marciais') baseMET = 10.0;
    else if (type === 'Funcional / Cross') baseMET = 8.0;
    else if (type === 'Yoga / Alongamento') baseMET = 3.5;
    else if (type === 'Descanso Ativo') baseMET = 2.5;

    const intensityObj = WORKOUT_INTENSITIES.find((i) => i.id === intensity) || WORKOUT_INTENSITIES[1];
    return Math.round((m / 60) * baseMET * w * intensityObj.factor * 0.95);
  };

  const currentEstimatedCalories = estimateCalories(workoutType, workoutMinutes, workoutIntensity);

  // Marcar / Salvar Treino
  const handleSaveWorkout = (e) => {
    if (e) e.preventDefault();
    const mins = Number(workoutMinutes) || 45;
    const cals = currentEstimatedCalories;

    db.saveHealthMetric({
      date: selectedDate,
      workout_type: workoutType,
      workout_minutes: mins,
      workout_intensity: workoutIntensity,
      workout_focus: workoutFocus,
      calories_burned: cals,
      notes: workoutNotes.trim()
    });

    playTactileFeedback('level_up');
    triggerFeedback(`✓ Treino de ${selectedDate} registrado com sucesso! (~${cals} kcal)`);
    refreshData();
  };

  // Desmarcar Treino do Dia
  const handleRemoveWorkoutToday = () => {
    db.saveHealthMetric({
      date: selectedDate,
      workout_type: '',
      workout_minutes: 0,
      calories_burned: 0,
      notes: ''
    });
    setWorkoutNotes('');
    playTactileFeedback('uncheck');
    triggerFeedback(`Treino de ${selectedDate} desmarcado.`);
    refreshData();
  };

  // Salvar Peso do Dia
  const handleSaveWeight = (e) => {
    if (e) e.preventDefault();
    const num = parseFloat(inputWeight);
    if (!isNaN(num) && num > 20 && num < 300) {
      db.saveHealthMetric({
        date: selectedDate,
        weight: num
      });
      playTactileFeedback('level_up');
      triggerFeedback(`⚖️ Peso de ${num} kg registrado para ${selectedDate}!`);
      refreshData();
    } else {
      triggerFeedback('⚠️ Insira um peso válido (ex: 78.5)');
    }
  };

  // Excluir registro
  const handleDeleteMetric = (id) => {
    db.deleteHealthMetric(id);
    playTactileFeedback('uncheck');
    triggerFeedback('Registro removido.');
    refreshData();
  };

  // Salvar Metas (Peso & Treinos)
  const handleSaveHealthGoals = (e) => {
    e.preventDefault();
    const woTarget = parseInt(formWorkouts, 10) || 16;
    const wtTarget = parseFloat(formWeight) || 75.0;
    const initW = parseFloat(formInitWeight) || 82.0;

    UserGoalsService.setWorkoutsTarget(woTarget);
    UserGoalsService.setTargetWeight(wtTarget);
    UserGoalsService.setInitialWeight(initW);

    setWorkoutsTarget(woTarget);
    setTargetWeight(wtTarget);
    setInitialWeight(initW);

    setIsGoalsModalOpen(false);
    playTactileFeedback('level_up');
    triggerFeedback('✓ Metas de peso e treinos atualizadas!');
  };

  // Estatísticas de Emagrecimento
  const weightEntries = metrics
    .filter((m) => m.weight > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const startWeight = initialWeight || (weightEntries.length > 0 ? weightEntries[0].weight : 82);
  const latestWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : startWeight;

  const totalWeightDifference = (startWeight - latestWeight).toFixed(1);
  const isLosing = Number(totalWeightDifference) >= 0;
  const targetDifference = Math.abs(startWeight - targetWeight);
  const weightLossProgress = targetDifference > 0
    ? Math.min(100, Math.max(0, Math.round((Math.abs(startWeight - latestWeight) / targetDifference) * 100)))
    : 100;
  const remainingWeightToTarget = Math.max(0, latestWeight - targetWeight).toFixed(1);

  // Estatísticas Gerais de Treino
  const currentMonth = new Date().toISOString().slice(0, 7);
  const workoutsThisMonth = metrics.filter(
    (m) => m.workout_type && m.workout_minutes > 0 && m.date.startsWith(currentMonth)
  ).length;
  const workoutsPct = Math.min(100, Math.round((workoutsThisMonth / workoutsTarget) * 100));

  const sevenDaysAgoDate = new Date();
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 7);
  const last7DaysMetrics = metrics.filter((m) => new Date(m.date) >= sevenDaysAgoDate);
  const weeklyWorkoutMinutes = last7DaysMetrics.reduce((acc, m) => acc + (m.workout_minutes || 0), 0);
  const weeklyBurnedCalories = last7DaysMetrics.reduce((acc, m) => acc + (m.calories_burned || 0), 0);
  const weeklyDaysTrained = new Set(last7DaysMetrics.filter((m) => m.workout_minutes > 0).map((m) => m.date)).size;

  // Histórico de Treinos Filtrado
  const filteredHistory = metrics.filter((m) => {
    if (!m.workout_type || !m.workout_minutes) return false;
    if (historyFilter !== 'Todos' && m.workout_type !== historyFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-[1440px] mx-auto pb-12">
      {/* 1. CABEÇALHO COM DATA, PESO RÁPIDO E ATALHO DE METAS */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#0A0E17] border border-[#1F293D] p-6 rounded-2xl shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-xs font-mono font-semibold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Saúde & Treinos
              </span>
              <span className="text-xs text-[#64748B]">• Acompanhamento Diário</span>
              {feedback && (
                <span className="text-cyan-400 font-mono text-xs font-semibold animate-pulse">
                  • {feedback}
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Treinos & Evolução de Peso
            </h1>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
              Controle objetivo e direto: confirme se realizou seu treino no dia e registre suas pesagens para acompanhar a progressão contínua rumo à meta 2027.
            </p>
          </div>

          {/* Navegação de Data & Metas */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Seletor de Data */}
            <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-[#1F293D]">
              <button
                onClick={() => changeDateBy(-1)}
                className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Dia anterior"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedDate === new Date().toISOString().split('T')[0]
                    ? 'bg-emerald-500 text-[#041F15] font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white hover:bg-[#1E293B]'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => changeDateBy(1)}
                className="w-8 h-8 rounded-lg bg-[#1E293B] hover:bg-[#334155] text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Próximo dia"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Input Data Nativo */}
            <div className="relative group cursor-pointer">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                title="Escolher data"
              />
              <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#111827] border border-[#1F293D] text-xs text-white font-medium group-hover:border-emerald-500/50 transition-colors">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">calendar_today</span>
                <span>{selectedDate}</span>
              </div>
            </div>

            {/* Botão de Metas */}
            <button
              onClick={() => {
                setFormWorkouts(String(workoutsTarget));
                setFormWeight(String(targetWeight));
                setFormInitWeight(String(initialWeight));
                setIsGoalsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              title="Ajustar metas de peso e treinos"
            >
              <span className="material-symbols-outlined text-[16px] text-emerald-400">tune</span>
              <span>Metas</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. ABAS DE NAVEGAÇÃO: TREINO DO DIA vs EVOLUÇÃO DE PESO */}
      <div className="flex items-center gap-2 border-b border-[#1F293D] pb-3">
        <button
          onClick={() => {
            setActiveTab('treinos');
            playTactileFeedback('check');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'treinos'
              ? 'bg-emerald-500 text-[#041F15] shadow-sm'
              : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#1F293D]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">fitness_center</span>
          <span>Treino do Dia</span>
          {hasTrainedOnSelectedDate && (
            <span className="ml-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-400/40">
              Concluído ✔
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('emagrecimento');
            playTactileFeedback('check');
          }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'emagrecimento'
              ? 'bg-cyan-500 text-[#022129] shadow-sm'
              : 'text-[#94A3B8] hover:text-white bg-[#111827] border border-[#1F293D]'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">show_chart</span>
          <span>Evolução de Peso ({latestWeight} kg)</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* ABA 1: TREINO DO DIA (CONFIRMAÇÃO & PARÂMETROS SIMPLES) */}
      {/* ======================================================== */}
      {activeTab === 'treinos' && (
        <div className="space-y-6">
          {/* Telemetria Rápida de Consistência */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Treinos no Mês</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {workoutsThisMonth} <span className="text-xs text-[#94A3B8] font-normal">/ {workoutsTarget}</span>
              </div>
              <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden mt-2">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${workoutsPct}%` }} />
              </div>
              <span className="text-[10px] text-[#64748B] block mt-1">{workoutsPct}% da meta mensal</span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Frequência (7 dias)</span>
              <div className="text-xl font-bold font-mono text-white">
                {weeklyDaysTrained} <span className="text-xs text-[#94A3B8] font-normal">dias ativos</span>
              </div>
              <span className="text-[10px] text-cyan-400 block mt-1">Consistência semanal</span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Minutos Treinados (7d)</span>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {weeklyWorkoutMinutes} <span className="text-xs text-[#94A3B8] font-normal">min</span>
              </div>
              <span className="text-[10px] text-[#64748B] block mt-1">Tempo total sob esforço</span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl space-y-1">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Gasto Estimado (7d)</span>
              <div className="text-xl font-bold font-mono text-amber-400">
                ~{weeklyBurnedCalories} <span className="text-xs text-[#94A3B8] font-normal">kcal</span>
              </div>
              <span className="text-[10px] text-[#64748B] block mt-1">Déficit físico acumulado</span>
            </div>
          </div>

          {/* CARD DE STATUS & REGISTRO DO TREINO DE HOJE */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-5">
            {/* Status Visual do Dia */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F293D]">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold ${
                    hasTrainedOnSelectedDate
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-[#1E293B] text-[#94A3B8] border border-[#334155]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[26px]">
                    {hasTrainedOnSelectedDate ? 'check_circle' : 'fitness_center'}
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Treino em {selectedDate}</span>
                    {hasTrainedOnSelectedDate ? (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        ✓ Concluído
                      </span>
                    ) : (
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-800 text-[#94A3B8] border border-slate-700">
                        Não registrado
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    {hasTrainedOnSelectedDate
                      ? `${currentDayEntry.workout_type} • ${currentDayEntry.workout_minutes} minutos • ~${currentDayEntry.calories_burned || 0} kcal`
                      : 'Diga se realizou seu treino hoje e preencha os parâmetros abaixo.'}
                  </p>
                </div>
              </div>

              {/* Botão de Desmarcar ou Confirmar */}
              {hasTrainedOnSelectedDate && (
                <button
                  type="button"
                  onClick={handleRemoveWorkoutToday}
                  className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Desmarcar Treino do Dia
                </button>
              )}
            </div>

            {/* FORMULÁRIO RÁPIDO DO TREINO */}
            <form onSubmit={handleSaveWorkout} className="space-y-5">
              {/* Seletor de Tipo / Modalidade */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-2">
                  Modalidade do Treino:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {WORKOUT_TYPES.map((wt) => {
                    const isSelected = workoutType === wt.id;
                    return (
                      <button
                        key={wt.id}
                        type="button"
                        onClick={() => setWorkoutType(wt.id)}
                        className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#1E293B] text-white border-emerald-500 shadow-sm ring-1 ring-emerald-500/50'
                            : 'bg-[#0C121E] border-[#1F293D] text-[#94A3B8] hover:text-white hover:border-[#334155]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]" style={{ color: wt.color }}>
                          {wt.icon}
                        </span>
                        <span className="truncate">{wt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duração & Foco */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Duração */}
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                    Duração da Sessão (minutos)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="300"
                      step="5"
                      value={workoutMinutes}
                      onChange={(e) => setWorkoutMinutes(e.target.value)}
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-emerald-500"
                    />
                  </div>
                  {/* Pills de minutos rápidos */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {['30', '45', '60', '90'].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setWorkoutMinutes(mins)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          workoutMinutes === mins
                            ? 'bg-emerald-500 text-[#041F15] font-bold'
                            : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                        }`}
                      >
                        {mins}m
                      </button>
                    ))}
                  </div>
                </div>

                {/* Intensidade */}
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                    Intensidade / Esforço
                  </label>
                  <select
                    value={workoutIntensity}
                    onChange={(e) => setWorkoutIntensity(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    {WORKOUT_INTENSITIES.map((wi) => (
                      <option key={wi.id} value={wi.id}>
                        {wi.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#64748B] mt-2 block">
                    Gasto estimado: ~{currentEstimatedCalories} kcal
                  </span>
                </div>

                {/* Foco Muscular / Região */}
                <div>
                  <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                    Foco / Parte do Corpo
                  </label>
                  <select
                    value={workoutFocus}
                    onChange={(e) => setWorkoutFocus(e.target.value)}
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    {WORKOUT_FOCUS_OPTIONS.map((foc) => (
                      <option key={foc} value={foc}>
                        {foc}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-[#64748B] mt-2 block">
                    Para distribuição de estímulos semanais
                  </span>
                </div>
              </div>

              {/* Anotações do Treino */}
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Observações / Sensações (opcional)
                </label>
                <input
                  type="text"
                  value={workoutNotes}
                  onChange={(e) => setWorkoutNotes(e.target.value)}
                  placeholder="Ex: Treino pesado de pernas, corrida com ritmo constante, boa recuperação..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2.5 text-xs text-white placeholder-[#64748B] outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#1F293D]">
                <div className="text-xs font-mono text-amber-400 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                  <span>Estimativa: ~{currentEstimatedCalories} kcal gastas</span>
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#041F15] font-bold text-xs shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>Salvar Treino de Hoje</span>
                </button>
              </div>
            </form>
          </div>

          {/* HISTÓRICO RECENTE DE TREINOS */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">history</span>
                <h3 className="text-sm font-bold text-white">Histórico de Treinos Realizados</h3>
                <span className="text-xs text-[#64748B]">({filteredHistory.length})</span>
              </div>

              {/* Filtro por Modalidade */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Todos', 'Musculação', 'Corrida', 'Ciclismo', 'Caminhada'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      historyFilter === f
                        ? 'bg-emerald-500 text-[#041F15] font-bold'
                        : 'bg-[#1E293B] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {filteredHistory.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  Nenhum treino registrado com os filtros selecionados.
                </div>
              ) : (
                filteredHistory.map((m) => (
                  <div
                    key={m.id}
                    className="p-3.5 bg-[#0C121E] border border-[#1F293D] hover:border-[#334155] rounded-xl flex items-center justify-between gap-3 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 shrink-0">
                        <span className="material-symbols-outlined text-[18px]">
                          {WORKOUT_TYPES.find((w) => w.id === m.workout_type)?.icon || 'fitness_center'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white">{m.workout_type}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-bold">
                            {m.workout_minutes} min
                          </span>
                          {m.workout_focus && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400">
                              {m.workout_focus}
                            </span>
                          )}
                          {m.calories_burned > 0 && (
                            <span className="text-[10px] font-mono text-amber-400 font-bold">
                              ~{m.calories_burned} kcal
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#64748B] font-mono mt-0.5 flex items-center gap-2">
                          <span>Data: {m.date}</span>
                          {m.notes && <span className="text-slate-300 italic">• "{m.notes}"</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDate(m.date);
                          playTactileFeedback('check');
                        }}
                        className="text-[11px] text-cyan-400 hover:text-white px-2 py-1 rounded hover:bg-[#1E293B] transition-colors"
                      >
                        Ver no Dia
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMetric(m.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-red-400 transition-opacity"
                        title="Excluir treino"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: EVOLUÇÃO DE PESO & EMAGRECIMENTO */}
      {/* ======================================================== */}
      {activeTab === 'emagrecimento' && (
        <div className="space-y-6">
          {/* Telemetria de Composição Corporal */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Peso Inicial</span>
              <div className="text-2xl font-bold font-mono text-white mt-1">{startWeight} kg</div>
              <span className="text-[10px] text-[#64748B] mt-1">Ponto de partida da jornada</span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Peso Atual</span>
              <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{latestWeight} kg</div>
              <span className="text-[10px] text-[#64748B] mt-1">Última aferição registrada</span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Evolução Total</span>
              <div className={`text-2xl font-bold font-mono mt-1 ${isLosing ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isLosing ? `-${totalWeightDifference} kg` : `+${Math.abs(totalWeightDifference)} kg`}
              </div>
              <span className="text-[10px] text-[#64748B] mt-1">
                {isLosing ? 'Redução de peso acumulada' : 'Aumento de peso'}
              </span>
            </div>

            <div className="bg-[#111827] border border-[#1F293D] p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-semibold text-[#94A3B8] tracking-wider">Meta Alvo</span>
              <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{targetWeight} kg</div>
              <span className="text-[10px] text-[#64748B] mt-1">Faltam {remainingWeightToTarget} kg para atingir</span>
            </div>
          </div>

          {/* Barra de Progresso até a Meta */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">trending_down</span>
                Progresso Rumo ao Peso Ideal
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
                {weightLossProgress}% Concluído
              </span>
            </div>

            <div className="w-full h-2.5 bg-[#1E293B] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 via-emerald-400 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${weightLossProgress}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono">
              <span>Início: {startWeight} kg</span>
              <span className="text-cyan-400 font-bold">Atual: {latestWeight} kg</span>
              <span className="text-amber-400">Alvo: {targetWeight} kg</span>
            </div>
          </div>

          {/* REGISTRO RÁPIDO DE PESAGEM DO DIA */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">scale</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Registrar Pesagem ({selectedDate})</h3>
                <p className="text-xs text-[#94A3B8]">
                  {currentDayWeight > 0
                    ? `Pesagem nesta data: ${currentDayWeight} kg`
                    : 'Nenhuma pesagem anotada para esta data.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveWeight} className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                placeholder="Ex: 77.5"
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className="w-32 bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
              />
              <span className="text-xs text-[#94A3B8] font-mono">kg</span>
              <button
                type="submit"
                disabled={!inputWeight}
                className="px-5 py-2 rounded-xl bg-cyan-500 text-[#022129] font-bold text-xs hover:bg-cyan-400 disabled:opacity-40 transition-all cursor-pointer shadow-sm shrink-0"
              >
                Salvar Peso
              </button>
            </form>
          </div>

          {/* GRÁFICO DE LINHAS SVG DE TRAJETÓRIA DO PESO */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-[20px]">show_chart</span>
                <h3 className="text-sm font-bold text-white">Curva de Progressão de Peso</h3>
              </div>

              {/* Filtro de Período & Legenda */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-[#1E293B] p-1 rounded-xl text-xs font-mono">
                  {[
                    { id: '14d', label: '14d' },
                    { id: '30d', label: '30d' },
                    { id: 'todos', label: 'Todos' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setChartPeriodFilter(p.id)}
                      className={`px-2.5 py-0.5 rounded-lg transition-colors cursor-pointer text-[11px] ${
                        chartPeriodFilter === p.id
                          ? 'bg-cyan-500 text-[#022129] font-bold'
                          : 'text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="hidden sm:flex items-center gap-3 text-xs font-mono text-[#94A3B8]">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                    <span>Peso Real</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-amber-400" />
                    <span className="text-amber-400 font-bold">Meta: {targetWeight} kg</span>
                  </span>
                </div>
              </div>
            </div>

            {weightEntries.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#64748B]">
                Nenhuma pesagem cadastrada ainda. Registre seu peso acima para iniciar o gráfico!
              </div>
            ) : (
              <div className="w-full h-60 sm:h-72 relative">
                {(() => {
                  let sorted = [...weightEntries];
                  if (chartPeriodFilter === '14d') sorted = sorted.slice(-14);
                  else if (chartPeriodFilter === '30d') sorted = sorted.slice(-30);

                  const allWeights = sorted.map((e) => e.weight);
                  if (targetWeight) allWeights.push(targetWeight);
                  if (startWeight) allWeights.push(startWeight);
                  const minW = Math.floor(Math.min(...allWeights) - 1);
                  const maxW = Math.ceil(Math.max(...allWeights) + 1);
                  const range = maxW - minW || 1;

                  const width = 700;
                  const height = 240;
                  const padLeft = 45;
                  const padRight = 35;
                  const padTop = 30;
                  const padBottom = 35;
                  const plotWidth = width - padLeft - padRight;
                  const plotHeight = height - padTop - padBottom;

                  const getX = (i) => {
                    if (sorted.length <= 1) return padLeft + plotWidth / 2;
                    return padLeft + (i / (sorted.length - 1)) * plotWidth;
                  };
                  const getY = (val) => {
                    return padTop + plotHeight - ((val - minW) / range) * plotHeight;
                  };

                  const points = sorted.map((entry, idx) => ({
                    x: getX(idx),
                    y: getY(entry.weight),
                    weight: entry.weight,
                    date: entry.date,
                    isSelected: entry.date === selectedDate
                  }));

                  const lineD = points.reduce((acc, p, idx) => {
                    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  const areaD =
                    points.length > 0
                      ? `${lineD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`
                      : '';

                  const targetY = getY(targetWeight);

                  const yTicks = [
                    minW,
                    Math.round(minW + range * 0.33),
                    Math.round(minW + range * 0.66),
                    maxW
                  ];

                  return (
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="weightGradArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grade horizontal */}
                      {yTicks.map((tickVal) => {
                        const yPos = getY(tickVal);
                        return (
                          <g key={tickVal}>
                            <line
                              x1={padLeft}
                              y1={yPos}
                              x2={width - padRight}
                              y2={yPos}
                              stroke="rgba(255,255,255,0.06)"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={padLeft - 8}
                              y={yPos + 4}
                              textAnchor="end"
                              fill="#64748B"
                              fontSize="10"
                              fontFamily="monospace"
                            >
                              {tickVal}kg
                            </text>
                          </g>
                        );
                      })}

                      {/* Linha Meta Tracejada */}
                      {targetY >= padTop && targetY <= padTop + plotHeight && (
                        <g>
                          <line
                            x1={padLeft}
                            y1={targetY}
                            x2={width - padRight}
                            y2={targetY}
                            stroke="#F59E0B"
                            strokeWidth="1.5"
                            strokeDasharray="4 4"
                          />
                          <text
                            x={width - padRight + 5}
                            y={targetY + 3}
                            fill="#F59E0B"
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            Meta
                          </text>
                        </g>
                      )}

                      {/* Área Preenchida com Gradiente */}
                      {areaD && <path d={areaD} fill="url(#weightGradArea)" />}

                      {/* Linha do Gráfico */}
                      {lineD && (
                        <path
                          d={lineD}
                          fill="none"
                          stroke="#06B6D4"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Pontos de Pesagem */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={p.isSelected ? 6 : 4}
                            fill={p.isSelected ? '#10B981' : '#06B6D4'}
                            stroke="#0F172A"
                            strokeWidth="2"
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedDate(p.date);
                              playTactileFeedback('check');
                            }}
                          >
                            <title>{`${p.date}: ${p.weight} kg`}</title>
                          </circle>
                          <text
                            x={p.x}
                            y={p.y - 10}
                            textAnchor="middle"
                            fill={p.isSelected ? '#10B981' : '#E2E8F0'}
                            fontSize="9"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {p.weight}
                          </text>
                        </g>
                      ))}
                    </svg>
                  );
                })()}
              </div>
            )}
          </div>

          {/* HISTÓRICO DAS ÚLTIMAS PESAGENS */}
          <div className="bg-[#111827] border border-[#1F293D] rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-[#1F293D] pb-3">
              <span className="material-symbols-outlined text-cyan-400 text-[18px]">list_alt</span>
              Últimas Pesagens Registradas ({weightEntries.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[...weightEntries].reverse().map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 bg-[#0C121E] border border-[#1F293D] rounded-xl flex items-center justify-between"
                >
                  <div>
                    <span className="text-[10px] text-[#64748B] font-mono block">{entry.date}</span>
                    <span className="text-base font-bold font-mono text-cyan-400">{entry.weight} kg</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDate(entry.date);
                      playTactileFeedback('check');
                    }}
                    className="text-[11px] text-[#94A3B8] hover:text-white px-2 py-1 rounded bg-[#1E293B]"
                  >
                    Ver Data
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PERSONALIZAR METAS (PESO & TREINOS) */}
      {isGoalsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">tune</span>
                Metas de Saúde & Treinos
              </h3>
              <button
                type="button"
                onClick={() => setIsGoalsModalOpen(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveHealthGoals} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Meta de Treinos no Mês
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formWorkouts}
                  onChange={(e) => setFormWorkouts(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm font-mono font-bold text-white outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-[#64748B]">Sessões físicas alvo por mês</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Peso Inicial (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={formInitWeight}
                  onChange={(e) => setFormInitWeight(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm font-mono font-bold text-white outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-[#64748B]">Ponto de partida da jornada</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#94A3B8] block mb-1">
                  Peso Alvo (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="250"
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-2.5 text-sm font-mono font-bold text-amber-400 outline-none focus:border-amber-400"
                />
                <span className="text-[10px] text-[#64748B]">Seu peso ideal rumo a 2027</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1F293D]">
                <button
                  type="button"
                  onClick={() => setIsGoalsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-[#041F15] font-bold text-xs hover:bg-emerald-400 transition-all shadow-sm"
                >
                  Salvar Metas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
