/**
 * src/views/HubDiario.jsx
 * Central Tática e Hub Diário de Alta Performance — Design Minimalista & Foco Zen
 * Reduz a fadiga de cliques através de abas segmentadas limpas:
 * - 📌 Foco do Dia (Tarefas & Time-Blocking 06h-23h + Mini-Player Binaural)
 * - ⚡ Hábitos & Streaks (Checklist com contadores de sequência ininterrupta 🔥)
 * - 🧘 Diário & Reflexões (Journaling sem distrações)
 * - 📊 Telemetria (Heatmap anual de consistência e Radar dos 6 Pilares)
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import HabitHeatmap from '../components/HabitHeatmap';
import RitualModal from '../components/RitualModal';
import PillarsRadar from '../components/PillarsRadar';
import { playTactileFeedback } from '../services/haptics';
import { StreakService } from '../services/streaks';
import { ambientAudio } from '../services/ambientAudio';
import { ObsidianVaultExportService } from '../services/obsidianVaultExport';

const HABIT_ICONS = [
  { id: 'task_alt', label: 'Geral' },
  { id: 'fitness_center', label: 'Treino' },
  { id: 'directions_run', label: 'Corrida' },
  { id: 'wb_sunny', label: 'Manhã' },
  { id: 'bedtime', label: 'Sono' },
  { id: 'water_drop', label: 'Água' },
  { id: 'menu_book', label: 'Leitura' },
  { id: 'restaurant', label: 'Dieta' },
  { id: 'self_improvement', label: 'Meditação' },
  { id: 'bolt', label: 'Foco' },
  { id: 'psychology', label: 'Estudo' },
  { id: 'code', label: 'Dev' },
  { id: 'event_upcoming', label: 'Planejamento' },
  { id: 'account_balance_wallet', label: 'Finanças' }
];

export default function HubDiario({ currentDate, isUltraClean }) {
  const initialDate = currentDate || new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(initialDate);

  // Abas limpas: 'tarefas' | 'habitos' | 'diario' | 'telemetria'
  const [activeTab, setActiveTab] = useState('tarefas');

  // Modo de visualização de tarefas: 'lista' | 'timeblock'
  const [taskViewMode, setTaskViewMode] = useState('lista');

  // Estado de Tarefas
  const [tasks, setTasks] = useState([]);
  const [taskFilter, setTaskFilter] = useState('Todas'); // 'Todas' | 'Pendentes' | 'Concluidas'
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Trabalho');
  const [newTaskPriority, setNewTaskPriority] = useState('Média');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [availableGoals, setAvailableGoals] = useState([]);

  // Edição inline de tarefa
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskCategory, setEditingTaskCategory] = useState('Trabalho');

  // Hábitos & Streaks
  const [habitDefinitions, setHabitDefinitions] = useState([]);
  const [dailyHabitsStatus, setDailyHabitsStatus] = useState({});
  const [habitStreaks, setHabitStreaks] = useState({});
  const [globalStreak, setGlobalStreak] = useState(0);
  const [isManagingHabits, setIsManagingHabits] = useState(false);
  const [newCustomHabitLabel, setNewCustomHabitLabel] = useState('');
  const [editingHabitId, setEditingHabitId] = useState(null);
  const [editingHabitLabel, setEditingHabitLabel] = useState('');
  const [editingHabitIcon, setEditingHabitIcon] = useState('task_alt');
  const [newCustomHabitIcon, setNewCustomHabitIcon] = useState('task_alt');

  // Reflexões & Diário
  const [reflections, setReflections] = useState({
    reflection_gratitude: '',
    reflection_better: '',
    reflection_learning: '',
    journal_richtext: ''
  });
  const [dailyPhoto, setDailyPhoto] = useState('');
  const photoInputRef = useRef(null);

  // Mini-Player de Áudio Binaural
  const [ambientPlaying, setAmbientPlaying] = useState(ambientAudio.getIsPlaying());
  const [ambientType, setAmbientType] = useState(ambientAudio.getCurrentType());

  // Rituais Guiados & Menu Secundário
  const [activeRitual, setActiveRitual] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const saveTimeoutRef = useRef(null);

  // Inicialização e sincronização
  useEffect(() => {
    setHabitDefinitions(db.getCustomHabits());
    setAvailableGoals(db.getGoals());

    const handleDataUpdate = () => {
      setHabitDefinitions(db.getCustomHabits());
      setAvailableGoals(db.getGoals());
      loadDailyData(selectedDate);
      refreshTasks();
      updateStreaks();
    };

    window.addEventListener('nexus_data_updated', handleDataUpdate);
    const unsubAudio = ambientAudio.onStateChange((playing, type) => {
      setAmbientPlaying(playing);
      setAmbientType(type);
    });

    return () => {
      window.removeEventListener('nexus_data_updated', handleDataUpdate);
      unsubAudio();
    };
  }, [selectedDate]);

  useEffect(() => {
    loadDailyData(selectedDate);
    refreshTasks();
    updateStreaks();

    const handleExportDailyNote = () => {
      ObsidianVaultExportService.exportSingleDailyNote(selectedDate);
    };
    window.addEventListener('nexus_export_daily_note', handleExportDailyNote);
    return () => window.removeEventListener('nexus_export_daily_note', handleExportDailyNote);
  }, [selectedDate, habitDefinitions]);

  const updateStreaks = () => {
    setHabitStreaks(StreakService.getAllHabitsStreaks());
    setGlobalStreak(StreakService.getGlobalConsistencyStreak());
  };

  const loadDailyData = (date) => {
    const log = db.getDailyLog(date);
    const statusMap = {};
    habitDefinitions.forEach(h => {
      statusMap[h.id] = log[h.id] ? 1 : 0;
    });
    setDailyHabitsStatus(statusMap);

    setReflections({
      reflection_gratitude: log.reflection_gratitude || '',
      reflection_better: log.reflection_better || '',
      reflection_learning: log.reflection_learning || '',
      journal_richtext: log.journal_richtext || ''
    });
    setDailyPhoto(log.daily_photo || '');
  };

  const refreshTasks = () => {
    const allTasks = db.getTasks();
    const filtered = allTasks.filter(t => t.due_date === selectedDate || t.status !== 'Feito');
    setTasks(filtered);
  };

  const triggerSaveFeedback = () => {
    setSaveStatus('Salvo');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  // Contadores & Scores
  const completedHabitsCount = Object.values(dailyHabitsStatus).filter(v => v === 1).length;
  const totalHabitsCount = habitDefinitions.length;
  const habitPercentage = totalHabitsCount > 0 ? Math.round((completedHabitsCount / totalHabitsCount) * 100) : 0;

  // Toggle de Hábito
  const handleHabitToggle = (habitId) => {
    const isCurrentlyChecked = dailyHabitsStatus[habitId] === 1;
    const willBeChecked = !isCurrentlyChecked;
    playTactileFeedback(willBeChecked ? 'check' : 'uncheck');

    const updated = { ...dailyHabitsStatus, [habitId]: willBeChecked ? 1 : 0 };
    setDailyHabitsStatus(updated);

    const booleanLog = {
      log_date: selectedDate,
      ...updated,
      ...reflections,
      daily_photo: dailyPhoto
    };

    db.saveDailyLog(booleanLog);
    updateStreaks();
    triggerSaveFeedback();
  };

  // Gerenciamento de Hábitos: Editar e Excluir
  const handleStartEditHabit = (e, habit) => {
    e.stopPropagation();
    setEditingHabitId(habit.id);
    setEditingHabitLabel(habit.label);
    setEditingHabitIcon(habit.icon || 'task_alt');
  };

  const handleSaveEditHabit = (e, habitId) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanLabel = editingHabitLabel.trim();
    if (!cleanLabel) return;
    const updated = habitDefinitions.map(h =>
      h.id === habitId ? { ...h, label: cleanLabel, icon: editingHabitIcon } : h
    );
    setHabitDefinitions(updated);
    db.saveCustomHabits(updated);
    setEditingHabitId(null);
    playTactileFeedback('check');
    triggerSaveFeedback();
  };

  const handleCancelEditHabit = (e) => {
    if (e) e.stopPropagation();
    setEditingHabitId(null);
  };

  const handleDeleteHabit = (e, habit) => {
    e.stopPropagation();
    if (window.confirm(`Deseja realmente excluir o hábito "${habit.label}" da sua rotina diária?`)) {
      const updated = habitDefinitions.filter(h => h.id !== habit.id);
      setHabitDefinitions(updated);
      db.deleteCustomHabit(habit.id);
      playTactileFeedback('uncheck');
      triggerSaveFeedback();
      updateStreaks();
    }
  };

  // Criação de Tarefa
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    db.createTask({
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      due_date: selectedDate,
      start_time: newTaskTime || null,
      status: 'Não iniciado'
    });

    playTactileFeedback('check');
    setNewTaskTitle('');
    setNewTaskTime('');
    refreshTasks();
    triggerSaveFeedback();
  };

  // Toggle de Status de Tarefa
  const handleToggleTaskStatus = (task) => {
    const isBecomingDone = task.status !== 'Feito';
    playTactileFeedback(isBecomingDone ? 'check' : 'uncheck');
    const newStatus = isBecomingDone ? 'Feito' : 'Não iniciado';
    db.updateTask(task.id, { status: newStatus });
    refreshTasks();
  };

  const handleDeleteTask = (id) => {
    db.deleteTask(id);
    playTactileFeedback('uncheck');
    refreshTasks();
  };

  const handleStartEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskCategory(task.category);
  };

  const handleSaveEditTask = (id) => {
    if (!editingTaskTitle.trim()) return;
    db.updateTask(id, {
      title: editingTaskTitle.trim(),
      category: editingTaskCategory
    });
    setEditingTaskId(null);
    refreshTasks();
  };

  const handleRescheduleTaskTomorrow = (task) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + 1);
    const tomorrowStr = current.toISOString().split('T')[0];
    db.updateTask(task.id, { due_date: tomorrowStr });
    playTactileFeedback('check');
    refreshTasks();
    triggerSaveFeedback();
  };

  // Alternar todos os hábitos (Marcar / Desmarcar todos)
  const handleToggleAllHabits = () => {
    const allChecked = habitDefinitions.length > 0 && habitDefinitions.every(h => dailyHabitsStatus[h.id] === 1);
    const nextVal = allChecked ? 0 : 1;
    playTactileFeedback(allChecked ? 'uncheck' : 'level_up');
    const updated = {};
    habitDefinitions.forEach(h => { updated[h.id] = nextVal; });
    setDailyHabitsStatus(updated);
    db.saveDailyLog({
      log_date: selectedDate,
      ...updated,
      ...reflections,
      daily_photo: dailyPhoto
    });
    updateStreaks();
    triggerSaveFeedback();
  };

  // Diário: Auto-save com debounce
  const handleReflectionChange = (field, value) => {
    const updated = { ...reflections, [field]: value };
    setReflections(updated);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      db.saveDailyLog({
        log_date: selectedDate,
        ...dailyHabitsStatus,
        ...updated,
        daily_photo: dailyPhoto
      });
      triggerSaveFeedback();
    }, 600);
  };

  // Navegação de Dias
  const changeDateBy = (days) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Formatação de data em português
  const displayDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date(selectedDate + 'T12:00:00'));
  const capitalizedDisplayDate = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

  const todayStr = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;
  const diffDays = Math.round(
    (new Date(selectedDate + 'T12:00:00') - new Date(todayStr + 'T12:00:00')) / (1000 * 60 * 60 * 24)
  );
  const relativeDateLabel = isToday
    ? null
    : diffDays === -1
    ? 'Ontem'
    : diffDays === 1
    ? 'Amanhã'
    : diffDays < 0
    ? `${Math.abs(diffDays)}d atrás`
    : `+${diffDays}d à frente`;

  const getWordCount = (text) => (text ? text.trim().split(/\s+/).filter(Boolean).length : 0);

  // Grade de Horários para Time-Blocking (06:00 às 23:00)
  const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0') + ':00');

  const filteredTasks = tasks.filter((t) => {
    if (taskFilter === 'Pendentes') return t.status !== 'Feito';
    if (taskFilter === 'Concluidas') return t.status === 'Feito';
    return true;
  });

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* 1. BARRA SUPERIOR CLEAN: DATA, PROGRESSO E AÇÕES */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d131f]/90 border border-white/5 p-3.5 rounded-2xl backdrop-blur-xl shadow-lg">
        {/* Navegação de Data */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDateBy(-1)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-colors cursor-pointer"
            title="Dia anterior"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>

          <button
            onClick={() => setSelectedDate(todayStr)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              isToday
                ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                : 'bg-white/5 hover:bg-white/10 text-white/70'
            }`}
            title="Ir para o dia de hoje"
          >
            Hoje
          </button>

          <button
            onClick={() => changeDateBy(1)}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 flex items-center justify-center transition-colors cursor-pointer"
            title="Próximo dia"
          >
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>

          {/* Seletor de Data Interativo (Abre calendário nativo ao clicar) */}
          <div className="relative flex items-center ml-1 group cursor-pointer">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) setSelectedDate(e.target.value);
              }}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              title="Clique para escolher qualquer data no calendário"
            />
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.03] group-hover:bg-white/[0.08] border border-transparent group-hover:border-white/10 transition-colors">
              <span className="material-symbols-outlined text-[16px] text-[#06B6D4]">calendar_today</span>
              <span className="text-sm font-semibold text-white">
                {capitalizedDisplayDate}
              </span>
              <span className="material-symbols-outlined text-[14px] text-white/40 group-hover:text-white/80 transition-colors">
                expand_more
              </span>
            </div>
          </div>

          {/* Badge Relativo (Ontem / Amanhã / X dias atrás) */}
          {relativeDateLabel && (
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono font-medium">
              {relativeDateLabel}
            </span>
          )}

          {isUltraClean && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 text-[10px] font-mono font-bold ml-1">
              <span>✨ Essencial</span>
            </span>
          )}
        </div>

        {/* Badges de Consistência & Ações */}
        <div className="flex items-center gap-2.5">
          {saveStatus && (
            <span className="text-[#10B981] text-xs font-mono font-medium flex items-center gap-1 animate-pulse">
              <span className="material-symbols-outlined text-[14px]">check</span>
              {saveStatus}
            </span>
          )}

          {/* Streak de Consistência Global */}
          {globalStreak > 0 && (
            <div 
              className="px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-bold font-mono flex items-center gap-1"
              title="Sequência ininterrupta de alta consistência"
            >
              <span>🔥</span>
              <span>{globalStreak}d streak</span>
            </div>
          )}

          {/* Pílula de Hábitos Diários */}
          <div 
            onClick={() => setActiveTab('habitos')}
            className="px-3 py-1 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-bold font-mono cursor-pointer flex items-center gap-1.5 hover:bg-[#10B981]/25 transition-colors"
            title="Clique para abrir os Hábitos de Hoje"
          >
            <span className="material-symbols-outlined text-[14px]">task_alt</span>
            <span>{completedHabitsCount}/{totalHabitsCount} • {habitPercentage}%</span>
          </div>

          {/* Menu Secundário com Menos Cliques */}
          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(prev => !prev)}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 flex items-center justify-center transition-colors cursor-pointer"
              title="Mais ações e rituais"
            >
              <span className="material-symbols-outlined text-[18px]">more_vert</span>
            </button>

            {isMenuOpen && (
              <div 
                className="absolute right-0 top-10 w-56 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5 animate-fade-in"
                onClick={() => setIsMenuOpen(false)}
              >
                <button
                  onClick={() => setActiveRitual('morning')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-amber-300 hover:bg-amber-500/15 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
                  <span>☀️ Iniciar Ritual Matinal</span>
                </button>
                <button
                  onClick={() => setActiveRitual('evening')}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-purple-300 hover:bg-purple-500/15 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">nights_stay</span>
                  <span>🌙 Iniciar Ritual Noturno</span>
                </button>
                <div className="border-t border-white/10 my-1" />
                <button
                  onClick={() => ObsidianVaultExportService.exportFullVaultZip()}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-emerald-300 hover:bg-emerald-500/15 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_zip</span>
                  <span>📦 Exportar Obsidian Vault (.ZIP)</span>
                </button>
                <button
                  onClick={() => ObsidianVaultExportService.exportSingleDailyNote(selectedDate)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-cyan-300 hover:bg-cyan-500/15 transition-colors text-left"
                  title="Baixar apenas a Daily Note deste dia em arquivo Markdown (.md)"
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  <span>📄 Baixar Daily Note do Dia (.md)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. ABAS SEGMENTADAS LIMPAS (LINEAR / OBSIDIAN MINIMAL) */}
      <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-2xl border border-white/5">
        <button
          onClick={() => setActiveTab('tarefas')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'tarefas'
              ? 'bg-[#1e293b] text-white shadow-sm border border-white/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">check_box</span>
          <span>Foco do Dia</span>
          {tasks.filter(t => t.status !== 'Feito').length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#06B6D4]/20 text-[#06B6D4] text-[10px] flex items-center justify-center font-mono font-bold">
              {tasks.filter(t => t.status !== 'Feito').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('habitos')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'habitos'
              ? 'bg-[#1e293b] text-white shadow-sm border border-white/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bolt</span>
          <span>Hábitos & Streaks</span>
          <span className="text-[10px] text-[#10B981] font-mono">
            {completedHabitsCount}/{totalHabitsCount}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('diario')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'diario'
              ? 'bg-[#1e293b] text-white shadow-sm border border-white/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">edit_note</span>
          <span>Diário & Reflexão</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetria')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'telemetria'
              ? 'bg-[#1e293b] text-white shadow-sm border border-white/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">insights</span>
          <span>Telemetria</span>
        </button>
      </div>

      {/* 3. ABA: TAREFAS & TIME-BLOCKING */}
      {activeTab === 'tarefas' && (
        <div className="space-y-4">
          {/* Mini-Player de Áudio Binaural Puro de Foco Integrado */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#090D16]/90 border border-white/5 shadow-sm text-xs">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => ambientAudio.toggle(ambientType || 'gamma')}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                  ambientPlaying 
                    ? 'bg-[#06B6D4] text-[#090D16] shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                    : 'bg-white/5 hover:bg-white/10 text-white/70'
                }`}
                title={ambientPlaying ? 'Pausar frequência binaural' : 'Iniciar frequência binaural de foco'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {ambientPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[#94A3B8]">Foco Binaural:</span>
                <span className="text-white font-medium capitalize font-mono">
                  {ambientType === 'gamma'
                    ? '⚡ Gamma 40Hz (Hiperfoco)'
                    : ambientType === 'beta'
                    ? '🧠 Beta 18Hz (Concentração)'
                    : ambientType === 'alpha'
                    ? '🌊 Alpha 10Hz (Flow)'
                    : ambientType === 'theta'
                    ? '🧘 Theta 6Hz (Criatividade)'
                    : '⚡ Gamma 40Hz'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'gamma', label: 'GAMMA 40Hz' },
                { id: 'beta', label: 'BETA 18Hz' },
                { id: 'alpha', label: 'ALPHA 10Hz' },
                { id: 'theta', label: 'THETA 6Hz' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => ambientAudio.start(id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition-all cursor-pointer ${
                    ambientType === id && ambientPlaying
                      ? 'bg-[#06B6D4]/25 text-[#67E8F9] border border-[#06B6D4]/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                      : 'text-[#94A3B8] hover:text-white bg-white/[0.03] hover:bg-white/[0.08] border border-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Form de Criação Rápida de 1 Linha */}
          <form onSubmit={handleCreateTask} className="flex items-center gap-2 bg-[#111827] border border-white/10 p-2 rounded-2xl focus-within:border-[#06B6D4] transition-all">
            <span className="material-symbols-outlined text-[20px] text-[#06B6D4] ml-2">add_task</span>
            <input
              type="text"
              placeholder="Adicionar tarefa para hoje... (Pressione Enter)"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-white/30 outline-none px-2"
            />
            {/* Horário Opcional */}
            <input
              type="time"
              value={newTaskTime}
              onChange={(e) => setNewTaskTime(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2 py-1 text-xs text-white/80 outline-none font-mono"
              title="Horário do Time-Blocking (Opcional)"
            />
            {/* Categoria */}
            <select
              value={newTaskCategory}
              onChange={(e) => setNewTaskCategory(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white/80 outline-none"
            >
              <option value="Trabalho">Trabalho</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Saúde">Saúde</option>
              <option value="Pessoal">Pessoal</option>
            </select>
            {/* Prioridade */}
            <select
              value={newTaskPriority}
              onChange={(e) => setNewTaskPriority(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white/80 outline-none"
            >
              <option value="Alta">Alta</option>
              <option value="Média">Média</option>
              <option value="Baixa">Baixa</option>
            </select>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-[#06B6D4] hover:bg-[#0891b2] text-[#001F26] text-xs font-bold transition-all cursor-pointer"
            >
              Criar
            </button>
          </form>

          {/* Barra de Filtros & Modo de Visualização */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              {['Todas', 'Pendentes', 'Concluidas'].map((f) => {
                const count =
                  f === 'Todas'
                    ? tasks.length
                    : f === 'Pendentes'
                    ? tasks.filter((t) => t.status !== 'Feito').length
                    : tasks.filter((t) => t.status === 'Feito').length;
                return (
                  <button
                    key={f}
                    onClick={() => setTaskFilter(f)}
                    className={`px-3 py-1 rounded-xl font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      taskFilter === f
                        ? 'bg-white/15 text-white font-semibold'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{f === 'Concluidas' ? 'Concluídas' : f}</span>
                    <span className="text-[10px] font-mono opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 bg-[#111827] p-0.5 rounded-xl border border-white/5">
              <button
                onClick={() => setTaskViewMode('lista')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  taskViewMode === 'lista' ? 'bg-[#1E293B] text-white font-semibold' : 'text-[#94A3B8]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">view_list</span>
                <span>Lista</span>
              </button>
              <button
                onClick={() => setTaskViewMode('timeblock')}
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  taskViewMode === 'timeblock' ? 'bg-[#1E293B] text-white font-semibold' : 'text-[#94A3B8]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>Time-Blocking (24h)</span>
              </button>
            </div>
          </div>

          {/* MODO LISTA CLEAN */}
          {taskViewMode === 'lista' && (
            <div className="space-y-2">
              {filteredTasks.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-[#64748B] text-sm">
                  Nenhuma tarefa nesta visualização. Use o campo acima ou peça ao J.A.R.V.I.S.!
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-3 rounded-2xl bg-[#0d131f]/60 hover:bg-[#111827] border border-white/5 hover:border-white/15 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={t.status === 'Feito'}
                        onChange={() => handleToggleTaskStatus(t)}
                        className="w-4 h-4 accent-[#10B981] rounded cursor-pointer shrink-0"
                      />
                      {editingTaskId === t.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingTaskTitle}
                            onChange={(e) => setEditingTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEditTask(t.id);
                              if (e.key === 'Escape') setEditingTaskId(null);
                            }}
                            className="bg-[#111827] border border-[#06B6D4] rounded-xl px-2.5 py-1 text-sm text-white outline-none flex-1 font-medium"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveEditTask(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#10B981] text-[#090D16] text-xs font-bold hover:brightness-110 cursor-pointer"
                          >
                            Salvar
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 text-white/70 hover:bg-white/10 text-xs font-medium cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <span
                          onDoubleClick={() => handleStartEditTask(t)}
                          className={`text-sm truncate cursor-pointer ${
                            t.status === 'Feito' ? 'line-through text-[#64748B]' : 'text-white'
                          }`}
                          title="Duplo clique para editar"
                        >
                          {t.title}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-3">
                      {t.start_time && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#06B6D4]/15 text-[#67E8F9] font-mono border border-[#06B6D4]/30 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">schedule</span>
                          {t.start_time}
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        t.priority === 'Alta' 
                          ? 'bg-red-500/15 text-red-300 border-red-500/30' 
                          : t.priority === 'Média' 
                          ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
                          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {t.priority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-[#94A3B8] border border-white/10">
                        {t.category}
                      </span>

                      {/* Botões de Ação Rápida */}
                      <button
                        type="button"
                        onClick={() => handleRescheduleTaskTomorrow(t)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-[#06B6D4] transition-all cursor-pointer rounded hover:bg-white/5"
                        title="Adiar tarefa para amanhã"
                      >
                        <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStartEditTask(t)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-[#06B6D4] transition-all cursor-pointer rounded hover:bg-white/5"
                        title="Editar tarefa"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#64748B] hover:text-red-400 transition-all cursor-pointer rounded hover:bg-white/5"
                        title="Excluir tarefa permanentemente"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MODO TIME-BLOCKING (LINHA DO TEMPO 06:00 ÀS 23:00) */}
          {taskViewMode === 'timeblock' && (
            <div className="space-y-1.5 bg-[#090D16] border border-white/5 p-4 rounded-3xl">
              <div className="text-xs text-[#94A3B8] mb-3 flex items-center justify-between">
                <span>Cronograma Diário (06h às 23h) • Clique em um horário para agendar</span>
                <span className="font-mono text-[#06B6D4]">{tasks.filter(t => t.start_time).length} blocos marcados</span>
              </div>
              <div className="divide-y divide-white/5">
                {HOURS.map((hour) => {
                  const hourTasks = tasks.filter(t => t.start_time && t.start_time.startsWith(hour.slice(0, 2)));
                  const currentHourStr = String(new Date().getHours()).padStart(2, '0') + ':00';
                  const isCurrentHour = isToday && hour === currentHourStr;

                  return (
                    <div 
                      key={hour} 
                      className={`py-2 px-2.5 rounded-xl flex items-start gap-3 group transition-all ${
                        isCurrentHour 
                          ? 'bg-[#06B6D4]/10 border border-[#06B6D4]/30 shadow-[0_0_15px_rgba(6,182,212,0.08)]' 
                          : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="w-16 shrink-0 pt-1 flex items-center gap-1.5">
                        <span className={`text-xs font-mono font-medium ${isCurrentHour ? 'text-[#06B6D4] font-bold' : 'text-[#64748B]'}`}>
                          {hour}
                        </span>
                        {isCurrentHour && (
                          <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" title="Horário Atual" />
                        )}
                      </div>
                      <div className="flex-1 min-h-[36px] rounded-xl bg-white/[0.02] group-hover:bg-white/[0.05] p-1.5 transition-colors flex flex-wrap items-center gap-2">
                        {hourTasks.map((t) => (
                          <div
                            key={t.id}
                            className={`px-3 py-1 rounded-xl text-xs flex items-center gap-2 border transition-all ${
                              t.status === 'Feito'
                                ? 'bg-white/5 text-[#64748B] border-white/5 line-through'
                                : 'bg-[#06B6D4]/15 border-[#06B6D4]/30 text-[#67E8F9] font-medium shadow-sm'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={t.status === 'Feito'}
                              onChange={() => handleToggleTaskStatus(t)}
                              className="accent-[#10B981] w-3 h-3 cursor-pointer"
                            />
                            <span>{t.title}</span>
                          </div>
                        ))}
                        {hourTasks.length === 0 && (
                          <button
                            onClick={() => {
                              setNewTaskTime(hour);
                              const title = prompt(`Adicionar compromisso para às ${hour}:`);
                              if (title && title.trim()) {
                                db.createTask({
                                  title: title.trim(),
                                  due_date: selectedDate,
                                  start_time: hour,
                                  status: 'Não iniciado',
                                  priority: 'Média',
                                  category: 'Trabalho'
                                });
                                playTactileFeedback('check');
                                refreshTasks();
                                triggerSaveFeedback();
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 text-[11px] text-[#06B6D4] hover:underline cursor-pointer flex items-center gap-1 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[13px]">add</span>
                            <span>Agendar às {hour}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ABA: HÁBITOS & STREAKS (COM FOGO 🔥) */}
      {activeTab === 'habitos' && (
        <div className="space-y-4">
          {/* Card de Progresso e Ações de Hábitos */}
          <div className="bg-[#0d131f]/90 border border-white/5 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span>Execução da Rotina Diária</span>
                    <span className="text-[10px] text-[#10B981] font-mono font-bold bg-[#10B981]/15 px-2 py-0.5 rounded-full border border-[#10B981]/30">
                      {completedHabitsCount}/{totalHabitsCount} • {habitPercentage}%
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    {habitPercentage === 100 
                      ? '🔥 100% de consistência atingida hoje! Mente blindada.' 
                      : habitPercentage >= 50 
                        ? 'Excelente progresso! Continue até consolidar todos os rituais.' 
                        : 'Execute seus rituais fundamentais para elevar sua telemetria diária.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleAllHabits}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                  title={completedHabitsCount === totalHabitsCount && totalHabitsCount > 0 ? 'Desmarcar todos os hábitos de hoje' : 'Marcar todos os hábitos como concluídos'}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {completedHabitsCount === totalHabitsCount && totalHabitsCount > 0 ? 'remove_done' : 'done_all'}
                  </span>
                  <span>{completedHabitsCount === totalHabitsCount && totalHabitsCount > 0 ? 'Desmarcar Todos' : 'Marcar Todos Feitos'}</span>
                </button>
              </div>
            </div>

            {/* Barra de Progresso Animada */}
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                style={{ width: `${habitPercentage}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {habitDefinitions.map((habit) => {
              const isChecked = dailyHabitsStatus[habit.id] === 1;
              const streak = habitStreaks[habit.id] || { currentStreak: 0, bestStreak: 0 };
              const isEditing = editingHabitId === habit.id;

              if (isEditing) {
                return (
                  <form
                    key={habit.id}
                    onSubmit={(e) => handleSaveEditHabit(e, habit.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="p-4 rounded-2xl border border-[#06B6D4]/50 bg-[#111827] shadow-xl space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#06B6D4] flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                        Editar Hábito
                      </span>
                      <button
                        type="button"
                        onClick={handleCancelEditHabit}
                        className="text-[#94A3B8] hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                        title="Cancelar edição"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>

                    <input
                      type="text"
                      value={editingHabitLabel}
                      onChange={(e) => setEditingHabitLabel(e.target.value)}
                      placeholder="Nome do hábito..."
                      className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white font-semibold outline-none focus:border-[#06B6D4]"
                      autoFocus
                    />

                    {/* Seletor Rápido de Ícones */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-[#94A3B8] font-medium block">Escolher Ícone:</span>
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                        {HABIT_ICONS.map((ico) => (
                          <button
                            key={ico.id}
                            type="button"
                            onClick={() => setEditingHabitIcon(ico.id)}
                            title={ico.label}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                              editingHabitIcon === ico.id
                                ? 'bg-[#06B6D4]/25 border-[#06B6D4] text-[#06B6D4]'
                                : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">{ico.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-white/5">
                      <button
                        type="button"
                        onClick={handleCancelEditHabit}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!editingHabitLabel.trim()}
                        className="px-4 py-1.5 rounded-xl bg-[#10B981] text-[#06231A] text-xs font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        <span>Salvar</span>
                      </button>
                    </div>
                  </form>
                );
              }

              return (
                <div
                  key={habit.id}
                  onClick={() => handleHabitToggle(habit.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group relative ${
                    isChecked
                      ? 'bg-[#10B981]/10 border-[#10B981]/30 text-white'
                      : 'bg-[#0d131f]/70 border-white/5 hover:border-white/15 text-[#94A3B8]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isChecked ? 'bg-[#10B981]/25 text-[#10B981]' : 'bg-white/5 text-[#94A3B8]'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">{habit.icon || 'task_alt'}</span>
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={`text-sm font-semibold truncate ${isChecked ? 'text-white' : 'text-[#E2E8F0]'}`}>
                        {habit.label}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        {streak.currentStreak > 0 ? (
                          <span className="text-[11px] font-mono text-orange-400 font-bold flex items-center gap-0.5">
                            <span>🔥</span>
                            <span>{streak.currentStreak}d seguidos</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#64748B]">Iniciar sequência hoje</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botões de Ação Rápidos: Editar e Excluir */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleStartEditHabit(e, habit)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#06B6D4]/20 hover:text-[#06B6D4] text-[#94A3B8] flex items-center justify-center transition-colors cursor-pointer"
                        title="Editar nome e ícone deste hábito"
                      >
                        <span className="material-symbols-outlined text-[15px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteHabit(e, habit)}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-[#EF4444]/20 hover:text-[#EF4444] text-[#94A3B8] flex items-center justify-center transition-colors cursor-pointer"
                        title="Excluir hábito da rotina"
                      >
                        <span className="material-symbols-outlined text-[15px]">delete</span>
                      </button>
                    </div>

                    {/* Checkbox Circular de Conclusão */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all shrink-0 ${
                      isChecked 
                        ? 'bg-[#10B981] border-[#10B981] text-[#090D16]' 
                        : 'border-white/20 group-hover:border-white/40'
                    }`}>
                      {isChecked && <span className="material-symbols-outlined text-[18px] font-bold">check</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Adicionar Novo Hábito Discreto e Completo */}
          <div className="pt-2">
            {isManagingHabits ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCustomHabitLabel.trim()) return;
                  const newHabit = {
                    id: 'h_custom_' + Date.now(),
                    label: newCustomHabitLabel.trim(),
                    icon: newCustomHabitIcon || 'task_alt'
                  };
                  const updated = [...habitDefinitions, newHabit];
                  setHabitDefinitions(updated);
                  db.saveCustomHabits(updated);
                  setNewCustomHabitLabel('');
                  setNewCustomHabitIcon('task_alt');
                  setIsManagingHabits(false);
                  playTactileFeedback('check');
                  triggerSaveFeedback();
                }}
                className="bg-[#111827] border border-white/10 p-3.5 rounded-2xl space-y-3 shadow-lg animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#10B981] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px]">add_task</span>
                    Novo Hábito na Rotina
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsManagingHabits(false)}
                    className="text-[#94A3B8] hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Nome do novo hábito (ex: Meditar 10 minutos, Estudar IA...)"
                    value={newCustomHabitLabel}
                    onChange={(e) => setNewCustomHabitLabel(e.target.value)}
                    className="flex-1 bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-sm text-white font-medium outline-none focus:border-[#10B981]"
                    autoFocus
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!newCustomHabitLabel.trim()}
                      className="px-4 py-2 rounded-xl bg-[#10B981] text-[#06231A] text-xs font-bold hover:brightness-110 disabled:opacity-40 transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Criar Hábito</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsManagingHabits(false)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-medium cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>

                {/* Seletor de Ícones para o Novo Hábito */}
                <div className="space-y-1">
                  <span className="text-[10px] text-[#94A3B8] font-medium block">Ícone Representativo:</span>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {HABIT_ICONS.map((ico) => (
                      <button
                        key={ico.id}
                        type="button"
                        onClick={() => setNewCustomHabitIcon(ico.id)}
                        title={ico.label}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                          newCustomHabitIcon === ico.id
                            ? 'bg-[#10B981]/25 border-[#10B981] text-[#10B981]'
                            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[15px]">{ico.id}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsManagingHabits(true)}
                className="text-xs text-[#06B6D4] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                <span>Adicionar outro hábito à rotina</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. ABA: DIÁRIO & REFLEXÃO (ZEN JOURNALING) */}
      {activeTab === 'diario' && (
        <div className="space-y-4">
          {/* Header de Ação do Diário */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0d131f]/70 border border-white/5 p-3.5 rounded-2xl">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
                <span className="material-symbols-outlined text-[18px]">edit_note</span>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Journaling Zen & Reflexões Táticas</span>
                  {saveStatus && (
                    <span className="text-[#10B981] text-[10px] font-mono font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      Sincronizado
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-[#64748B]">
                  Auto-salvamento em tempo real no banco local. Zero perda de dados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => ObsidianVaultExportService.exportSingleDailyNote(selectedDate)}
              className="px-3.5 py-1.5 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] text-xs font-semibold border border-[#06B6D4]/30 transition-all cursor-pointer flex items-center gap-1.5"
              title="Baixar nota deste dia em Markdown (.md)"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Exportar Nota Diária (.md)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#0d131f]/70 border border-white/5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px]">favorite</span>
                  Pelo que sou grato hoje?
                </span>
                <textarea
                  rows={4}
                  value={reflections.reflection_gratitude}
                  onChange={(e) => handleReflectionChange('reflection_gratitude', e.target.value)}
                  placeholder="Três coisas pelas quais sou profundamente grato..."
                  className="w-full bg-transparent border-none text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-white/5 font-mono">
                <span>{getWordCount(reflections.reflection_gratitude)} palavras</span>
                <span>{reflections.reflection_gratitude?.length || 0} caracteres</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d131f]/70 border border-white/5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#06B6D4] flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  O que poderia ter sido melhor?
                </span>
                <textarea
                  rows={4}
                  value={reflections.reflection_better}
                  onChange={(e) => handleReflectionChange('reflection_better', e.target.value)}
                  placeholder="Ajustes táticos para refinar no dia seguinte..."
                  className="w-full bg-transparent border-none text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-white/5 font-mono">
                <span>{getWordCount(reflections.reflection_better)} palavras</span>
                <span>{reflections.reflection_better?.length || 0} caracteres</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d131f]/70 border border-white/5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  Principal aprendizado do dia
                </span>
                <textarea
                  rows={4}
                  value={reflections.reflection_learning}
                  onChange={(e) => handleReflectionChange('reflection_learning', e.target.value)}
                  placeholder="Uma lição, insight de livro ou princípio assimilado..."
                  className="w-full bg-transparent border-none text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-white/5 font-mono">
                <span>{getWordCount(reflections.reflection_learning)} palavras</span>
                <span>{reflections.reflection_learning?.length || 0} caracteres</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d131f]/70 border border-white/5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-[#10B981] flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[16px]">note_alt</span>
                  Brain Dump & Notas Livres
                </span>
                <textarea
                  rows={4}
                  value={reflections.journal_richtext}
                  onChange={(e) => handleReflectionChange('journal_richtext', e.target.value)}
                  placeholder="Pensamentos rápidos, ideias ou registros livres..."
                  className="w-full bg-transparent border-none text-sm text-white placeholder-white/20 outline-none resize-none leading-relaxed"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-2 border-t border-white/5 font-mono">
                <span>{getWordCount(reflections.journal_richtext)} palavras</span>
                <span>{reflections.journal_richtext?.length || 0} caracteres</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. ABA: TELEMETRIA (HEATMAP ANUAL & RADAR) */}
      {activeTab === 'telemetria' && (
        <div className="space-y-5">
          <HabitHeatmap
            selectedDate={selectedDate}
            onSelectDate={(d) => setSelectedDate(d)}
          />
          <PillarsRadar
            selectedDate={selectedDate}
            dailyLog={db.getDailyLog(selectedDate)}
            habits={habitDefinitions}
          />
        </div>
      )}

      {/* Modal de Rituais Guiados */}
      {activeRitual && (
        <RitualModal
          ritualType={activeRitual}
          onClose={() => setActiveRitual(null)}
          onComplete={() => {
            setActiveRitual(null);
            loadDailyData(selectedDate);
            refreshTasks();
          }}
        />
      )}
    </div>
  );
}
