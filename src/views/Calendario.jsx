/**
 * src/views/Calendario.jsx
 * Central de Agenda & Cronograma Tático — Design Minimalista Cyber-Obsidian
 * 
 * Funcionalidades completas:
 * - 🗓️ 3 Modos de Visualização: Mês (35/42 células), Semana (7 colunas táticas) e Dia (Timeline 24h)
 * - 🎯 Arrastar e Soltar Nativo (Drag & Drop): reagende qualquer tarefa entre dias ou horários
 * - 🔍 Filtros de Tarefas por Categoria e Status (Pendentes / Concluídas)
 * - 🔥 Telemetria de Hábitos diários integrada com micro-indicadores visuais
 * - ⚡ Agendamento com Categoria, Prioridade, Horário e ações rápidas (Adiar, Editar, Excluir)
 * - 📥 Exportação padrão .ICS para Google Calendar, Outlook e Apple Calendar
 */

import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { downloadCalendarICS } from '../services/calendarExport';
import { playTactileFeedback } from '../services/haptics';

export default function Calendario({ onOpenDayInHub, isUltraClean }) {
  // Modos de Visualização: 'mes' | 'semana' | 'dia'
  const [viewMode, setViewMode] = useState('mes');

  // Data focal e data selecionada
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Dados do ecossistema
  const [tasks, setTasks] = useState([]);
  const [habitDefinitions, setHabitDefinitions] = useState([]);

  // Filtros
  const [categoryFilter, setCategoryFilter] = useState('Todas'); // 'Todas' | 'Trabalho' | 'Financeiro' | 'Saúde' | 'Pessoal'
  const [statusFilter, setStatusFilter] = useState('Todas'); // 'Todas' | 'Pendentes' | 'Concluidas'

  // Drag & Drop
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  // Formulário de Nova Tarefa
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Trabalho');
  const [newTaskPriority, setNewTaskPriority] = useState('Média');
  const [newTaskTime, setNewTaskTime] = useState('');

  // Edição Inline de Tarefa
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');
  const [editingTaskCategory, setEditingTaskCategory] = useState('Trabalho');
  const [editingTaskPriority, setEditingTaskPriority] = useState('Média');
  const [editingTaskTime, setEditingTaskTime] = useState('');

  // Feedback Toast
  const [feedbackToast, setFeedbackToast] = useState('');
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    refreshData();
    const handleUpdate = () => refreshData();
    window.addEventListener('nexus_data_updated', handleUpdate);
    return () => window.removeEventListener('nexus_data_updated', handleUpdate);
  }, []);

  const refreshData = () => {
    setTasks(db.getTasks());
    setHabitDefinitions(db.getCustomHabits());
  };

  const triggerFeedback = (msg) => {
    setFeedbackToast(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setFeedbackToast(''), 2600);
  };

  // Nomes de meses e dias da semana
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const weekDayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const fullWeekDayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  // Horários para time-blocking (06:00 às 23:00)
  const HOURS = Array.from({ length: 18 }, (_, i) => String(i + 6).padStart(2, '0') + ':00');

  const todayStr = new Date().toISOString().split('T')[0];

  // ==========================================
  // NAVEGAÇÃO ENTRE PERÍODOS
  // ==========================================
  const handlePrevPeriod = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 7);
      setCurrentDate(d);
      setSelectedDateStr(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      const newStr = d.toISOString().split('T')[0];
      setSelectedDateStr(newStr);
      setCurrentDate(d);
    }
  };

  const handleNextPeriod = () => {
    if (viewMode === 'mes') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'semana') {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 7);
      setCurrentDate(d);
      setSelectedDateStr(d.toISOString().split('T')[0]);
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      d.setDate(d.getDate() + 1);
      const newStr = d.toISOString().split('T')[0];
      setSelectedDateStr(newStr);
      setCurrentDate(d);
    }
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(todayStr);
  };

  // Helper para início da semana (Domingo)
  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };

  // Título dinâmico do cabeçalho
  const getHeaderTitle = () => {
    if (viewMode === 'mes') {
      return `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`;
    } else if (viewMode === 'semana') {
      const start = getStartOfWeek(currentDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${start.getDate()} a ${end.getDate()} de ${monthNames[start.getMonth()]} de ${start.getFullYear()}`;
      } else {
        return `${start.getDate()} de ${monthNames[start.getMonth()].slice(0, 3)} a ${end.getDate()} de ${monthNames[end.getMonth()].slice(0, 3)} de ${end.getFullYear()}`;
      }
    } else {
      const d = new Date(selectedDateStr + 'T12:00:00');
      const dayName = fullWeekDayNames[d.getDay()];
      return `${dayName}, ${d.getDate()} de ${monthNames[d.getMonth()]} de ${d.getFullYear()}`;
    }
  };

  // ==========================================
  // CÁLCULOS DE CÉLULAS DO CALENDÁRIO
  // ==========================================
  // Mês
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const totalDaysInPrevMonth = new Date(year, month, 0).getDate();

  const monthCalendarCells = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = totalDaysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, dayNum);
    monthCalendarCells.push({
      dayNumber: dayNum,
      dateStr: prevDate.toISOString().split('T')[0],
      isCurrentMonth: false
    });
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    monthCalendarCells.push({
      dayNumber: d,
      dateStr: dStr,
      isCurrentMonth: true
    });
  }
  const remainingCells = (7 - (monthCalendarCells.length % 7)) % 7;
  for (let nextD = 1; nextD <= remainingCells; nextD++) {
    const nextDate = new Date(year, month + 1, nextD);
    monthCalendarCells.push({
      dayNumber: nextD,
      dateStr: nextDate.toISOString().split('T')[0],
      isCurrentMonth: false
    });
  }

  // Semana (7 dias)
  const startOfWeek = getStartOfWeek(currentDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const dStr = d.toISOString().split('T')[0];
    return {
      date: d,
      dateStr: dStr,
      dayName: weekDayNames[i],
      fullDayName: fullWeekDayNames[i],
      dayNumber: d.getDate(),
      isToday: dStr === todayStr,
      isSelected: dStr === selectedDateStr
    };
  });

  // Hábitos para uma data
  const getHabitProgressForDate = (dateStr) => {
    if (!habitDefinitions || habitDefinitions.length === 0) return { total: 0, done: 0, pct: 0 };
    const log = db.getDailyLog(dateStr);
    let done = 0;
    habitDefinitions.forEach(h => {
      if (log[h.id] === 1 || log[h.id] === true) done++;
    });
    return {
      total: habitDefinitions.length,
      done,
      pct: Math.round((done / habitDefinitions.length) * 100)
    };
  };

  // Filtragem de tarefas para uma data
  const getFilteredTasksForDate = (dateStr) => {
    return tasks.filter(t => {
      if (t.due_date !== dateStr) return false;
      if (categoryFilter !== 'Todas' && t.category !== categoryFilter) return false;
      if (statusFilter === 'Pendentes' && t.status === 'Feito') return false;
      if (statusFilter === 'Concluidas' && t.status !== 'Feito') return false;
      return true;
    });
  };

  // ==========================================
  // ARRASTAR E SOLTAR (DRAG & DROP)
  // ==========================================
  const handleDragStart = (e, task) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(task.id);
  };

  const handleDragOver = (e, targetKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTarget !== targetKey) {
      setDragOverTarget(targetKey);
    }
  };

  const handleDragLeave = (e, targetKey) => {
    if (dragOverTarget === targetKey) {
      setDragOverTarget(null);
    }
  };

  const handleDropTask = (e, targetDateStr, targetHour = null) => {
    e.preventDefault();
    setDragOverTarget(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (!taskId) return;

    const taskToMove = tasks.find(t => t.id === taskId);
    if (!taskToMove) return;

    const updates = { due_date: targetDateStr };
    if (targetHour !== null) {
      updates.start_time = targetHour;
    }

    db.updateTask(taskId, updates);
    playTactileFeedback('check');

    const formattedTarget = new Date(targetDateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'short'
    });
    triggerFeedback(`"${taskToMove.title}" movida para ${formattedTarget}${targetHour ? ` às ${targetHour}` : ''}`);
    refreshData();
    setDraggedTaskId(null);
  };

  // ==========================================
  // GESTÃO DE TAREFAS
  // ==========================================
  const handleToggleTask = (task) => {
    const isBecomingDone = task.status !== 'Feito';
    playTactileFeedback(isBecomingDone ? 'check' : 'uncheck');
    const newStatus = isBecomingDone ? 'Feito' : 'Não iniciado';
    db.updateTask(task.id, { status: newStatus });
    refreshData();
  };

  const handleCreateTaskForSelectedDay = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    db.createTask({
      title: newTaskTitle.trim(),
      category: newTaskCategory,
      priority: newTaskPriority,
      start_time: newTaskTime || null,
      due_date: selectedDateStr,
      status: 'Não iniciado'
    });

    playTactileFeedback('check');
    triggerFeedback('Compromisso agendado com sucesso!');
    setNewTaskTitle('');
    setNewTaskTime('');
    refreshData();
  };

  const handleStartEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
    setEditingTaskCategory(task.category);
    setEditingTaskPriority(task.priority || 'Média');
    setEditingTaskTime(task.start_time || '');
  };

  const handleSaveEditTask = (id) => {
    if (!editingTaskTitle.trim()) return;
    db.updateTask(id, {
      title: editingTaskTitle.trim(),
      category: editingTaskCategory,
      priority: editingTaskPriority,
      start_time: editingTaskTime || null
    });
    playTactileFeedback('check');
    setEditingTaskId(null);
    refreshData();
    triggerFeedback('Tarefa atualizada!');
  };

  const handleDeleteTask = (id) => {
    db.deleteTask(id);
    playTactileFeedback('uncheck');
    refreshData();
    triggerFeedback('Tarefa excluída da agenda.');
  };

  const handleRescheduleTomorrow = (task) => {
    const d = new Date(task.due_date ? task.due_date + 'T12:00:00' : selectedDateStr + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const tomorrowStr = d.toISOString().split('T')[0];
    db.updateTask(task.id, { due_date: tomorrowStr });
    playTactileFeedback('check');
    refreshData();
    triggerFeedback(`Tarefa adiada para amanhã (${tomorrowStr})`);
  };

  // Tarefas para o dia selecionado
  const selectedDayTasks = getFilteredTasksForDate(selectedDateStr);
  const selectedDayHabitScore = getHabitProgressForDate(selectedDateStr);
  const selectedDayLog = db.getDailyLog(selectedDateStr);

  return (
    <div className="space-y-5 max-w-[1500px] mx-auto">
      {/* 1. BARRA SUPERIOR: NAVEGAÇÃO, MODOS E EXPORTAÇÃO */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl backdrop-blur-xl shadow-lg">
        {/* Título & Navegação do Período */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4] shrink-0">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-[#06B6D4] flex items-center gap-1.5">
              <span>Agenda Tática</span>
              {feedbackToast && (
                <span className="text-[#10B981] font-mono font-medium animate-pulse">
                  • {feedbackToast}
                </span>
              )}
            </div>

            {/* Seletor de Data Interativo (Abre calendário nativo em 1 clique) */}
            <div className="relative group cursor-pointer flex items-center gap-1.5">
              <input
                type="date"
                value={selectedDateStr}
                onChange={(e) => {
                  if (e.target.value) {
                    setSelectedDateStr(e.target.value);
                    setCurrentDate(new Date(e.target.value + 'T12:00:00'));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                title="Clique para saltar diretamente para qualquer data"
              />
              <h1 className="text-xl font-bold text-white tracking-tight group-hover:text-[#67E8F9] transition-colors flex items-center gap-1">
                {getHeaderTitle()}
                <span className="material-symbols-outlined text-[16px] text-white/40 group-hover:text-white/80">
                  expand_more
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Controles Centrais: Navegação de Dias & Seletor de Modo */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Navegação Anterior / Hoje / Próximo */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-white/5">
            <button
              onClick={handlePrevPeriod}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Período anterior"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              onClick={handleGoToday}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedDateStr === todayStr
                  ? 'bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30'
                  : 'bg-white/5 hover:bg-white/10 text-white/70'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={handleNextPeriod}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Próximo período"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Seletor de Modo de Visualização (Mês / Semana / Dia) */}
          <div className="flex items-center gap-1 bg-[#111827] p-1 rounded-xl border border-white/5">
            {[
              { id: 'mes', label: 'Mês', icon: 'calendar_view_month' },
              { id: 'semana', label: 'Semana', icon: 'view_week' },
              { id: 'dia', label: 'Dia (24h)', icon: 'schedule' }
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => {
                  setViewMode(id);
                  playTactileFeedback('check');
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === id
                    ? 'bg-[#1E293B] text-white shadow-sm border border-white/10'
                    : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Exportar .ICS */}
          <button
            type="button"
            onClick={() => {
              const goals = db.getGoals();
              downloadCalendarICS(tasks, goals);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Sincronizar com Google Calendar, Apple Calendar ou Outlook (.ICS)"
          >
            <span className="material-symbols-outlined text-[16px]">event_upcoming</span>
            <span className="hidden md:inline">Exportar .ICS</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS RÁPIDOS */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#090D16] border border-white/5 rounded-2xl text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#94A3B8] font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">filter_alt</span>
            Categoria:
          </span>
          {['Todas', 'Trabalho', 'Financeiro', 'Saúde', 'Pessoal'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/5'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#94A3B8] font-medium">Status:</span>
          {['Todas', 'Pendentes', 'Concluidas'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#06B6D4]/20 text-[#67E8F9] border border-[#06B6D4]/30 font-semibold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              {st === 'Concluidas' ? 'Concluídas' : st}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL (DEPENDENDO DO MODO ATIVO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ÁREA PRINCIPAL DA GRADE / TIMELINE (2 COLUNAS OU FULL) */}
        <div className={`space-y-4 ${viewMode === 'dia' ? 'lg:col-span-3' : 'lg:col-span-2'}`}>

          {/* MODO 1: VISÃO MENSAL (35/42 CÉLULAS COM DRAG & DROP) */}
          {viewMode === 'mes' && (
            <div className="bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl shadow-lg">
              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
                {weekDayNames.map((d, idx) => (
                  <div
                    key={d}
                    className={`text-xs font-semibold py-1 uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? 'text-[#8B5CF6]' : 'text-[#94A3B8]'
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grade de Células */}
              <div className="grid grid-cols-7 gap-1.5">
                {monthCalendarCells.map((cell) => {
                  const dayTasks = getFilteredTasksForDate(cell.dateStr);
                  const isToday = cell.dateStr === todayStr;
                  const isSelected = cell.dateStr === selectedDateStr;
                  const habitScore = getHabitProgressForDate(cell.dateStr);
                  const isDragTarget = dragOverTarget === cell.dateStr;

                  return (
                    <div
                      key={cell.dateStr}
                      onClick={() => setSelectedDateStr(cell.dateStr)}
                      onDoubleClick={() => {
                        setSelectedDateStr(cell.dateStr);
                        setCurrentDate(new Date(cell.dateStr + 'T12:00:00'));
                        setViewMode('dia');
                      }}
                      onDragOver={(e) => handleDragOver(e, cell.dateStr)}
                      onDragLeave={(e) => handleDragLeave(e, cell.dateStr)}
                      onDrop={(e) => handleDropTask(e, cell.dateStr)}
                      className={`min-h-[102px] p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between relative group ${
                        isDragTarget
                          ? 'bg-[#06B6D4]/20 border-[#06B6D4] shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02] z-10'
                          : isSelected
                          ? 'bg-[#1E293B] border-[#06B6D4] shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                          : isToday
                          ? 'bg-[#10B981]/10 border-[#10B981]/40'
                          : cell.isCurrentMonth
                          ? 'bg-[#0f172a]/60 border-white/5 hover:border-white/20'
                          : 'bg-[#0B0F17]/40 border-transparent text-[#475569] opacity-35 hover:opacity-70'
                      }`}
                      title="Clique para selecionar. Duplo clique para abrir a Visão Diária 24h. Arraste tarefas para este dia."
                    >
                      {/* Topo da Célula: Dia & Micro-telemetria de Hábitos */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            isToday
                              ? 'bg-[#10B981] text-[#06231A]'
                              : isSelected
                              ? 'bg-[#06B6D4] text-[#001F26]'
                              : cell.isCurrentMonth
                              ? 'text-white'
                              : 'text-[#64748B]'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        <div className="flex items-center gap-1">
                          {/* Indicador de Hábitos 100% ou Parcial */}
                          {habitScore.done > 0 && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1 rounded flex items-center ${
                                habitScore.pct === 100
                                  ? 'text-amber-400 bg-amber-500/15'
                                  : 'text-[#10B981] bg-[#10B981]/15'
                              }`}
                              title={`${habitScore.done}/${habitScore.total} hábitos concluídos (${habitScore.pct}%)`}
                            >
                              {habitScore.pct === 100 ? '🔥' : `${habitScore.done}/${habitScore.total}`}
                            </span>
                          )}

                          {dayTasks.length > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#1E293B] text-[#94A3B8] border border-white/5">
                              {dayTasks.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lista resumida de tarefas arrastáveis */}
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {dayTasks.slice(0, 2).map((t) => (
                          <div
                            key={t.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, t)}
                            className={`text-[10px] truncate px-1.5 py-0.5 rounded flex items-center gap-1 cursor-grab active:cursor-grabbing border ${
                              t.status === 'Feito'
                                ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 line-through opacity-60'
                                : t.priority === 'Alta'
                                ? 'bg-red-500/10 text-red-300 border-red-500/20'
                                : 'bg-[#1E293B] text-[#E2E8F0] border-white/5'
                            }`}
                            title={`[${t.category}] ${t.title} ${t.start_time ? `às ${t.start_time}` : ''} • Arraste para reagendar`}
                          >
                            {t.start_time && (
                              <span className="text-[9px] font-mono text-[#06B6D4] shrink-0">
                                {t.start_time}
                              </span>
                            )}
                            <span className="truncate">{t.title}</span>
                          </div>
                        ))}

                        {dayTasks.length > 2 && (
                          <div className="text-[9px] text-[#64748B] text-center font-medium">
                            +{dayTasks.length - 2} mais
                          </div>
                        )}
                      </div>

                      {/* Overlay sutil de Dropzone ao arrastar */}
                      {isDragTarget && (
                        <div className="absolute inset-0 bg-[#06B6D4]/15 rounded-xl border-2 border-dashed border-[#06B6D4] flex items-center justify-center text-[10px] font-bold text-[#67E8F9] pointer-events-none animate-pulse">
                          Soltar aqui
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 2: VISÃO SEMANAL (7 COLUNAS TÁTICAS COM DRAG & DROP) */}
          {viewMode === 'semana' && (
            <div className="bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl shadow-lg space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {weekDays.map((day) => {
                  const dayTasks = getFilteredTasksForDate(day.dateStr);
                  const habitScore = getHabitProgressForDate(day.dateStr);
                  const isDragTarget = dragOverTarget === day.dateStr;

                  return (
                    <div
                      key={day.dateStr}
                      onClick={() => setSelectedDateStr(day.dateStr)}
                      onDragOver={(e) => handleDragOver(e, day.dateStr)}
                      onDragLeave={(e) => handleDragLeave(e, day.dateStr)}
                      onDrop={(e) => handleDropTask(e, day.dateStr)}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between min-h-[360px] relative ${
                        isDragTarget
                          ? 'bg-[#06B6D4]/20 border-[#06B6D4] shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                          : day.isSelected
                          ? 'bg-[#1E293B] border-[#06B6D4] shadow-md'
                          : day.isToday
                          ? 'bg-[#10B981]/10 border-[#10B981]/40'
                          : 'bg-[#111827]/70 border-white/5 hover:border-white/20'
                      }`}
                    >
                      {/* Topo da Coluna Semanal */}
                      <div>
                        <div className="flex items-center justify-between pb-2 border-b border-white/5">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">
                              {day.dayName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-base font-bold ${day.isToday ? 'text-[#10B981]' : 'text-white'}`}>
                                {day.dayNumber}
                              </span>
                              {day.isToday && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#10B981]/20 text-[#10B981] font-mono font-bold">
                                  Hoje
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-mono text-[#06B6D4] font-bold">
                              {dayTasks.length} tarefas
                            </span>
                            {habitScore.total > 0 && (
                              <div className="text-[9px] font-mono text-[#10B981]">
                                {habitScore.done}/{habitScore.total} ({habitScore.pct}%)
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Lista de tarefas do dia da semana */}
                        <div className="space-y-1.5 mt-3">
                          {dayTasks.length === 0 ? (
                            <div className="text-center py-8 text-[#64748B] text-[11px] border border-dashed border-white/5 rounded-xl">
                              Sem tarefas
                            </div>
                          ) : (
                            dayTasks.map((t) => (
                              <div
                                key={t.id}
                                draggable={true}
                                onDragStart={(e) => handleDragStart(e, t)}
                                className={`p-2 rounded-xl border text-xs cursor-grab active:cursor-grabbing transition-all flex flex-col gap-1 ${
                                  t.status === 'Feito'
                                    ? 'bg-white/5 border-white/5 text-[#64748B] line-through'
                                    : t.priority === 'Alta'
                                    ? 'bg-red-500/10 border-red-500/25 text-red-200'
                                    : 'bg-[#1E293B]/70 border-white/10 text-white hover:border-[#06B6D4]/40'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <input
                                      type="checkbox"
                                      checked={t.status === 'Feito'}
                                      onChange={() => handleToggleTask(t)}
                                      className="accent-[#10B981] w-3 h-3 cursor-pointer shrink-0"
                                    />
                                    <span className="truncate font-medium">{t.title}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-[#94A3B8]">
                                  {t.start_time ? (
                                    <span className="font-mono text-[#06B6D4] flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[11px]">schedule</span>
                                      {t.start_time}
                                    </span>
                                  ) : (
                                    <span className="text-white/30">• Sem hora</span>
                                  )}
                                  <span className="px-1 py-0.2 rounded bg-white/5">{t.category}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Botão de adicionar tarefa rápida nesta data */}
                      <button
                        onClick={() => {
                          setSelectedDateStr(day.dateStr);
                          const title = prompt(`Adicionar tarefa para ${day.fullDayName} (${day.dayNumber}):`);
                          if (title && title.trim()) {
                            db.createTask({
                              title: title.trim(),
                              due_date: day.dateStr,
                              priority: 'Média',
                              category: 'Trabalho',
                              status: 'Não iniciado'
                            });
                            playTactileFeedback('check');
                            refreshData();
                            triggerFeedback('Tarefa agendada na semana!');
                          }
                        }}
                        className="mt-3 w-full py-1.5 rounded-xl border border-dashed border-white/10 hover:border-[#06B6D4]/40 text-[#06B6D4] text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">add</span>
                        <span>Adicionar</span>
                      </button>

                      {isDragTarget && (
                        <div className="absolute inset-0 bg-[#06B6D4]/15 rounded-2xl border-2 border-dashed border-[#06B6D4] flex items-center justify-center text-xs font-bold text-[#67E8F9] pointer-events-none animate-pulse">
                          Mover para este dia
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODO 3: VISÃO DIÁRIA PROFUNDA (TIMELINE 24H 06H-23H COM DRAG & DROP POR HORA) */}
          {viewMode === 'dia' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Timeline Principal de Horários */}
              <div className="lg:col-span-2 bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl shadow-lg space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#06B6D4]">schedule</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">Cronograma Diário (06:00 às 23:00)</h3>
                      <p className="text-[11px] text-[#64748B]">
                        Arraste tarefas para os horários abaixo para organizar seu dia em time-blocking.
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-[#06B6D4] font-bold">
                    {selectedDayTasks.filter(t => t.start_time).length} horários marcados
                  </span>
                </div>

                <div className="divide-y divide-white/5">
                  {HOURS.map((hour) => {
                    const hourTasks = selectedDayTasks.filter(t => t.start_time && t.start_time.startsWith(hour.slice(0, 2)));
                    const isToday = selectedDateStr === todayStr;
                    const currentHourStr = String(new Date().getHours()).padStart(2, '0') + ':00';
                    const isCurrentHour = isToday && hour === currentHourStr;
                    const targetKey = `${selectedDateStr}-${hour}`;
                    const isDragTarget = dragOverTarget === targetKey;

                    return (
                      <div
                        key={hour}
                        onDragOver={(e) => handleDragOver(e, targetKey)}
                        onDragLeave={(e) => handleDragLeave(e, targetKey)}
                        onDrop={(e) => handleDropTask(e, selectedDateStr, hour)}
                        className={`py-2 px-2.5 rounded-xl flex items-start gap-3 transition-all ${
                          isDragTarget
                            ? 'bg-[#06B6D4]/20 border border-[#06B6D4]'
                            : isCurrentHour
                            ? 'bg-[#06B6D4]/10 border border-[#06B6D4]/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
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
                              draggable={true}
                              onDragStart={(e) => handleDragStart(e, t)}
                              className={`px-3 py-1 rounded-xl text-xs flex items-center gap-2 border cursor-grab active:cursor-grabbing transition-all ${
                                t.status === 'Feito'
                                  ? 'bg-white/5 text-[#64748B] border-white/5 line-through'
                                  : 'bg-[#06B6D4]/15 border-[#06B6D4]/30 text-[#67E8F9] font-medium shadow-sm'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={t.status === 'Feito'}
                                onChange={() => handleToggleTask(t)}
                                className="accent-[#10B981] w-3 h-3 cursor-pointer"
                              />
                              <span>{t.title}</span>
                            </div>
                          ))}

                          {hourTasks.length === 0 && (
                            <button
                              onClick={() => {
                                const title = prompt(`Adicionar compromisso para às ${hour}:`);
                                if (title && title.trim()) {
                                  db.createTask({
                                    title: title.trim(),
                                    due_date: selectedDateStr,
                                    start_time: hour,
                                    status: 'Não iniciado',
                                    priority: 'Média',
                                    category: 'Trabalho'
                                  });
                                  playTactileFeedback('check');
                                  refreshData();
                                  triggerFeedback(`Compromisso agendado para às ${hour}!`);
                                }
                              }}
                              className="text-[11px] text-[#64748B] hover:text-[#06B6D4] hover:underline cursor-pointer flex items-center gap-1 transition-colors"
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

              {/* Coluna Lateral do Dia: Tarefas Sem Horário (Permite arrastar para a timeline!) */}
              <div className="bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-400">pending_actions</span>
                    Tarefas Sem Horário Fixo
                  </span>
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    {selectedDayTasks.filter(t => !t.start_time).length}
                  </span>
                </div>

                <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                  {selectedDayTasks.filter(t => !t.start_time).length === 0 ? (
                    <div className="text-center py-8 text-[#64748B] text-xs">
                      Todas as tarefas deste dia têm horário definido!
                    </div>
                  ) : (
                    selectedDayTasks.filter(t => !t.start_time).map((t) => (
                      <div
                        key={t.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, t)}
                        className="p-2.5 rounded-xl bg-[#111827] border border-white/5 hover:border-[#06B6D4]/40 cursor-grab active:cursor-grabbing text-xs flex items-center justify-between gap-2 shadow-sm"
                        title="Arraste para um horário da timeline para agendar"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={t.status === 'Feito'}
                            onChange={() => handleToggleTask(t)}
                            className="accent-[#10B981] w-3.5 h-3.5 cursor-pointer shrink-0"
                          />
                          <span className={`truncate ${t.status === 'Feito' ? 'line-through text-[#64748B]' : 'text-white'}`}>
                            {t.title}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#94A3B8]">
                          {t.category}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Formulário Rápido de Agendamento */}
                <form onSubmit={handleCreateTaskForSelectedDay} className="pt-2 border-t border-white/5 space-y-2">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Adicionar tarefa para este dia..."
                    className="w-full bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#06B6D4]"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="bg-[#111827] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white/80 outline-none font-mono"
                    />
                    <select
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                      className="bg-[#111827] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-[#94A3B8] outline-none flex-1"
                    >
                      <option value="Trabalho">Trabalho</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Pessoal">Pessoal</option>
                    </select>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#06B6D4] text-[#001F26] text-xs font-bold rounded-xl hover:brightness-110 cursor-pointer"
                    >
                      Criar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>

        {/* PAINEL LATERAL: DETALHES DO DIA SELECIONADO & AGENDAMENTO RÁPIDO */}
        {viewMode !== 'dia' && (
          <div className="bg-[#0d131f]/90 border border-white/5 p-4 rounded-2xl flex flex-col justify-between shadow-lg space-y-4">
            <div>
              {/* Cabeçalho do Dia Selecionado */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <span className="text-[10px] text-[#06B6D4] font-semibold uppercase tracking-wider">
                    Dia Selecionado
                  </span>
                  <h3 className="text-base font-bold text-white capitalize">
                    {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long'
                    })}
                  </h3>
                </div>

                {onOpenDayInHub && (
                  <button
                    onClick={() => onOpenDayInHub(selectedDateStr)}
                    className="px-3 py-1.5 bg-[#06B6D4]/15 hover:bg-[#06B6D4]/25 text-[#06B6D4] border border-[#06B6D4]/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    title="Abrir este dia no Hub Diário"
                  >
                    <span>Hub</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                )}
              </div>

              {/* Status de Hábitos no Dia Selecionado */}
              <div className="my-3 p-3 rounded-xl bg-[#111827] border border-white/5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#94A3B8] font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-[#10B981]">task_alt</span>
                    Hábitos Diários:
                  </span>
                  <span className="font-mono font-bold text-[#10B981]">
                    {selectedDayHabitScore.done}/{selectedDayHabitScore.total} ({selectedDayHabitScore.pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#06B6D4] to-[#10B981] rounded-full transition-all"
                    style={{ width: `${selectedDayHabitScore.pct}%` }}
                  />
                </div>
              </div>

              {/* Formulário de Criação Rápida */}
              <form onSubmit={handleCreateTaskForSelectedDay} className="space-y-2 mb-4">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Agendar tarefa para este dia..."
                  className="w-full bg-[#111827] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#06B6D4]"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input
                    type="time"
                    value={newTaskTime}
                    onChange={(e) => setNewTaskTime(e.target.value)}
                    className="bg-[#111827] border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 outline-none font-mono"
                    title="Horário opcional"
                  />
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="bg-[#111827] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#94A3B8] outline-none flex-1"
                  >
                    <option value="Trabalho">Trabalho</option>
                    <option value="Financeiro">Financeiro</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Pessoal">Pessoal</option>
                  </select>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="bg-[#111827] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#94A3B8] outline-none"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#10B981] text-[#06231A] font-bold rounded-lg text-xs hover:brightness-110 cursor-pointer shadow-sm"
                  >
                    + Agendar
                  </button>
                </div>
              </form>

              {/* Lista de Tarefas do Dia Selecionado */}
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                <div className="text-xs text-[#94A3B8] font-semibold mb-1 flex items-center justify-between">
                  <span>Tarefas ({selectedDayTasks.length})</span>
                  <span>{selectedDayTasks.filter(t => t.status === 'Feito').length} concluídas</span>
                </div>

                {selectedDayTasks.length === 0 ? (
                  <div className="text-center py-8 text-[#64748B] text-xs border border-dashed border-white/5 rounded-xl">
                    Nenhuma tarefa agendada para esta data.
                  </div>
                ) : (
                  selectedDayTasks.map((t) => (
                    <div
                      key={t.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, t)}
                      className="group p-2.5 bg-[#111827]/70 border border-white/5 rounded-xl hover:border-white/15 transition-all space-y-1.5 cursor-grab active:cursor-grabbing"
                    >
                      {editingTaskId === t.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editingTaskTitle}
                            onChange={(e) => setEditingTaskTitle(e.target.value)}
                            className="w-full bg-[#1E293B] border border-[#06B6D4] rounded-lg px-2 py-1 text-xs text-white outline-none"
                            autoFocus
                          />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={editingTaskTime}
                              onChange={(e) => setEditingTaskTime(e.target.value)}
                              className="bg-[#1E293B] border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white/80 font-mono outline-none"
                            />
                            <select
                              value={editingTaskCategory}
                              onChange={(e) => setEditingTaskCategory(e.target.value)}
                              className="bg-[#1E293B] border border-white/10 rounded px-1.5 py-0.5 text-[11px] text-white/80 outline-none flex-1"
                            >
                              <option value="Trabalho">Trabalho</option>
                              <option value="Financeiro">Financeiro</option>
                              <option value="Saúde">Saúde</option>
                              <option value="Pessoal">Pessoal</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveEditTask(t.id)}
                              className="px-2 py-0.5 rounded bg-[#10B981] text-[#090D16] text-[11px] font-bold cursor-pointer"
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTaskId(null)}
                              className="px-2 py-0.5 rounded bg-white/5 text-white/70 text-[11px] cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={t.status === 'Feito'}
                              onChange={() => handleToggleTask(t)}
                              className="w-3.5 h-3.5 accent-[#10B981] rounded cursor-pointer shrink-0"
                            />
                            <span
                              onDoubleClick={() => handleStartEditTask(t)}
                              className={`text-xs truncate ${
                                t.status === 'Feito' ? 'line-through text-[#64748B]' : 'text-white'
                              }`}
                              title="Duplo clique para editar"
                            >
                              {t.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {t.start_time && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#06B6D4]/15 text-[#67E8F9] border border-[#06B6D4]/30">
                                {t.start_time}
                              </span>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                              t.priority === 'Alta'
                                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                                : 'bg-white/5 text-[#94A3B8] border-white/10'
                            }`}>
                              {t.priority}
                            </span>

                            {/* Ações em Hover */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleRescheduleTomorrow(t)}
                                className="p-1 text-[#64748B] hover:text-[#06B6D4] transition-colors cursor-pointer"
                                title="Adiar para amanhã"
                              >
                                <span className="material-symbols-outlined text-[14px]">event_upcoming</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditTask(t)}
                                className="p-1 text-[#64748B] hover:text-[#06B6D4] transition-colors cursor-pointer"
                                title="Editar tarefa"
                              >
                                <span className="material-symbols-outlined text-[14px]">edit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(t.id)}
                                className="p-1 text-[#64748B] hover:text-red-400 transition-colors cursor-pointer"
                                title="Excluir tarefa"
                              >
                                <span className="material-symbols-outlined text-[14px]">delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Rodapé do Painel Lateral: Registro Diário */}
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-[#94A3B8]">
              <span>Diário & Reflexão:</span>
              <span className={`font-semibold ${selectedDayLog.reflection_gratitude ? 'text-[#10B981]' : 'text-white/40'}`}>
                {selectedDayLog.reflection_gratitude ? 'Preenchido ✓' : 'Pendente'}
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
