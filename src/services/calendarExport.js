/**
 * src/services/calendarExport.js
 * Gerador de arquivo padrão iCalendar (.ics - RFC 5545) para sincronização de tarefas
 * e metas do Projeto 2027 com Google Calendar, Apple Calendar, Outlook e Windows Calendar.
 */

import { playTactileFeedback } from './haptics.js';

function formatDateToICS(dateStr) {
  if (!dateStr) return '';
  const clean = dateStr.replace(/-/g, '');
  return clean.length === 8 ? clean : '';
}

function getNextDayICS(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0].replace(/-/g, '');
}

export function generateICSContent(tasks = [], goals = []) {
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Projeto 2027//Obsidian Nexus Command Center//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Projeto • Calendário Tático',
    'X-WR-TIMEZONE:America/Sao_Paulo'
  ];

  // Adiciona cada tarefa com data definida
  tasks.forEach((t) => {
    if (!t.due_date) return;
    const dtDate = formatDateToICS(t.due_date);
    const dtEnd = getNextDayICS(t.due_date);
    const uid = `task-${t.id || Date.now()}@projeto2027.nexus`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${dtDate}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${t.title.replace(/[,\n]/g, ' ')}`);
    lines.push(`DESCRIPTION:Prioridade: ${t.priority || 'Normal'} | Categoria: ${t.category || 'Geral'} | Status: ${t.status || 'Pendente'}`);
    lines.push(`STATUS:${t.status === 'Feito' ? 'COMPLETED' : 'CONFIRMED'}`);
    lines.push('CATEGORIES:Projeto 2027,Tarefas');
    lines.push('END:VEVENT');
  });

  // Adiciona marcos das metas 2027
  goals.forEach((g) => {
    const targetYear = g.target_year || 2027;
    const targetMonth = String(g.target_month || 12).padStart(2, '0');
    const milestoneDate = `${targetYear}${targetMonth}01`;
    const milestoneEnd = `${targetYear}${targetMonth}02`;
    const uid = `goal-${g.id || Date.now()}@projeto2027.nexus`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART;VALUE=DATE:${milestoneDate}`);
    lines.push(`DTEND;VALUE=DATE:${milestoneEnd}`);
    lines.push(`SUMMARY:[Meta 2027] ${g.title.replace(/[,\n]/g, ' ')}`);
    lines.push(`DESCRIPTION:Tema: ${g.theme || 'Geral'} | Meta: ${g.target_value} | Atual: ${g.current_value || 0}`);
    lines.push('CATEGORIES:Projeto 2027,Metas');
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadCalendarICS(tasks = [], goals = []) {
  try {
    const icsString = generateICSContent(tasks, goals);
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Projeto_Calendario_${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    playTactileFeedback('check');
    return true;
  } catch (err) {
    console.error('[Calendar Export Error]', err);
    return false;
  }
}

