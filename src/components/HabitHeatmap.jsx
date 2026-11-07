import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/db';

export default function HabitHeatmap({ selectedDate, onSelectDate }) {
  const [updateTick, setUpdateTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setUpdateTick(v => v + 1);
    window.addEventListener('nexus_data_updated', handleUpdate);
    return () => window.removeEventListener('nexus_data_updated', handleUpdate);
  }, []);

  const habitDefinitions = useMemo(() => db.getCustomHabits() || [], [updateTick]);

  // Gerar os últimos 84 dias (12 semanas completas)
  const heatmapData = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Encontrar o domingo da semana atual para alinhar perfeitamente a grade
    const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Segunda...
    const endGridDate = new Date(today);
    endGridDate.setDate(endGridDate.getDate() + (6 - dayOfWeek));

    const totalDays = 12 * 7; // 84 dias (12 colunas de semanas)

    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(endGridDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];

      const log = db.getDailyLog(dateStr);
      let completedCount = 0;
      habitDefinitions.forEach((h) => {
        if (log[h.id] === true || log[h.id] === 1) completedCount++;
      });

      const totalHabits = habitDefinitions.length;
      const pct = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;

      days.push({
        dateStr,
        dayOfWeek: d.getDay(),
        formattedDate: d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
        completedCount,
        totalHabits,
        pct,
        isFuture: d > today,
        isSelected: dateStr === selectedDate
      });
    }

    return days;
  }, [habitDefinitions, selectedDate, updateTick]);

  // Cálculo de Streak (Sequência de dias com ao menos 1 hábito ou 100%)
  const { currentStreak, perfectDays, avgConsistency } = useMemo(() => {
    let streak = 0;
    let perfect = 0;
    let totalPct = 0;
    let countedDays = 0;

    const todayStr = new Date().toISOString().split('T')[0];
    const pastAndToday = heatmapData.filter(d => !d.isFuture);

    // Contagem reversa para streak atual
    for (let i = pastAndToday.length - 1; i >= 0; i--) {
      const day = pastAndToday[i];
      if (day.completedCount > 0) {
        streak++;
      } else if (day.dateStr !== todayStr) {
        // Se hoje não fez nada ainda, não quebra o streak de ontem
        break;
      }
    }

    pastAndToday.forEach(d => {
      if (d.pct === 100 && d.totalHabits > 0) perfect++;
      totalPct += d.pct;
      countedDays++;
    });

    return {
      currentStreak: streak,
      perfectDays: perfect,
      avgConsistency: countedDays > 0 ? Math.round(totalPct / countedDays) : 0
    };
  }, [heatmapData]);

  // Agrupar em 12 semanas (colunas) de 7 dias (linhas: Domingo a Sábado)
  const weeks = useMemo(() => {
    const result = [];
    for (let w = 0; w < 12; w++) {
      result.push(heatmapData.slice(w * 7, (w + 1) * 7));
    }
    return result;
  }, [heatmapData]);

  const getCellColor = (day) => {
    if (day.isFuture) return 'bg-[#1E293B]/20 border-transparent cursor-not-allowed';
    if (day.completedCount === 0) return 'bg-[#1E293B]/40 hover:bg-[#1E293B] border-[#1F293D]';
    if (day.pct < 34) return 'bg-[#10B981]/25 hover:bg-[#10B981]/40 border-[#10B981]/30';
    if (day.pct < 67) return 'bg-[#10B981]/50 hover:bg-[#10B981]/65 border-[#10B981]/50';
    if (day.pct < 100) return 'bg-[#10B981]/80 hover:bg-[#10B981]/90 border-[#10B981]/70';
    return 'bg-[#10B981] hover:brightness-110 shadow-[0_0_8px_rgba(16,185,129,0.5)] border-[#10B981]';
  };

  return (
    <div className="bg-[#111827] border border-[#1F293D] p-5 rounded-2xl space-y-4">
      {/* Header com Telemetria de Consistência */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F293D] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-[#10B981]">
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Mapa de Calor de Consistência
            </h3>
            <span className="text-[11px] text-[#94A3B8]">
              Visão dos últimos 84 dias (12 semanas) • Clique no dia para inspecionar
            </span>
          </div>
        </div>

        {/* Badges de Sequência */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-2.5 py-1 rounded-lg bg-[#1E293B] border border-[#334155]/60 flex items-center gap-1.5">
            <span className="text-[#F59E0B]">🔥</span>
            <span className="text-[#94A3B8]">Sequência:</span>
            <span className="font-bold text-white font-mono">{currentStreak} dias</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#1E293B] border border-[#334155]/60 flex items-center gap-1.5">
            <span className="text-[#10B981]">⭐</span>
            <span className="text-[#94A3B8]">Dias 100%:</span>
            <span className="font-bold text-white font-mono">{perfectDays}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-[#1E293B] border border-[#334155]/60 flex items-center gap-1.5">
            <span className="text-[#06B6D4]">📊</span>
            <span className="text-[#94A3B8]">Média:</span>
            <span className="font-bold text-[#06B6D4] font-mono">{avgConsistency}%</span>
          </div>
        </div>
      </div>

      {/* Grade do Heatmap */}
      <div className="overflow-x-auto pb-1">
        <div className="flex items-center gap-1.5 min-w-[620px]">
          {/* Rótulo dos Dias da Semana */}
          <div className="flex flex-col justify-between text-[9px] text-[#64748B] pr-1 py-0.5 h-[116px] font-mono select-none">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Colunas de Semanas */}
          <div className="flex gap-1.5">
            {weeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day) => (
                  <button
                    key={day.dateStr}
                    disabled={day.isFuture}
                    onClick={() => onSelectDate && onSelectDate(day.dateStr)}
                    className={`w-3.5 h-3.5 rounded-[3px] border transition-all relative group cursor-pointer ${getCellColor(
                      day
                    )} ${day.isSelected ? 'ring-2 ring-[#06B6D4] ring-offset-1 ring-offset-[#0B0F17]' : ''}`}
                    title={`${day.formattedDate}: ${day.completedCount}/${day.totalHabits} hábitos (${day.pct}%)`}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legenda de Intensidade */}
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-[#64748B] pl-4">
            <span>Menos</span>
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#1E293B]/40 border border-[#1F293D]" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]/25 border border-[#10B981]/30" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]/50 border border-[#10B981]/50" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981]/80 border border-[#10B981]/70" />
            <div className="w-2.5 h-2.5 rounded-[2px] bg-[#10B981] border border-[#10B981]" />
            <span>Mais</span>
          </div>
        </div>
      </div>
    </div>
  );
}

