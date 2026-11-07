import React from 'react';
import { getHabitsSummary } from '../services/backend_logic';

export default function HabitChecklist({ dailyLog, onToggleHabit }) {
  const habitsConfig = [
    { key: 'h_sleep_8h', label: 'Dormir 8h', desc: 'Descanso reparador', icon: 'bedtime' },
    { key: 'h_morning_routine', label: 'Rotina matinal', desc: 'Banho frio & hidratação', icon: 'wb_sunny' },
    { key: 'h_exercise_1h', label: 'Exercício 1h', desc: 'Musculação & cardio', icon: 'fitness_center' },
    { key: 'h_read_30m', label: 'Ler 30m', desc: 'Leitura técnica ou estratégica', icon: 'menu_book' },
    { key: 'h_healthy_diet', label: 'Dieta saudável', desc: '100% no plano nutricional', icon: 'restaurant' },
    { key: 'h_water_2l', label: 'Água 2L', desc: 'Meta de hidratação atingida', icon: 'water_drop' },
    { key: 'h_plan_tomorrow', label: 'Planejar amanhã', desc: 'Agenda e prioridades definidas', icon: 'calendar_today' }
  ];

  const summary = getHabitsSummary(dailyLog);

  return (
    <div className="flex flex-col gap-space-md">
      {/* Header */}
      <div className="p-space-lg rounded-xl bg-surface-container/70 border border-outline-variant/20 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">Hábitos & Rituais</h2>
        </div>
        <div className="flex items-center gap-1 px-space-sm py-1 rounded-full bg-secondary-container/20 text-secondary font-label-md text-label-md font-bold">
          <span>{summary.score} de 7 ativos</span>
        </div>
      </div>

      {/* 7 Habits Checklist */}
      <div className="p-space-md rounded-xl bg-surface-container/80 border border-outline-variant/20 shadow-sm flex flex-col gap-space-xs">
        {habitsConfig.map((h) => {
          const isChecked = !!dailyLog[h.key];
          return (
            <div
              key={h.key}
              onClick={() => onToggleHabit(h.key)}
              className={`flex items-center justify-between p-space-sm rounded-lg hover:bg-surface-container-high transition-colors cursor-pointer group ${
                !isChecked ? 'opacity-70' : ''
              }`}
            >
              <div className="flex items-center gap-space-sm">
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-primary-container text-on-primary-container shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                      : 'border border-outline bg-surface-container-high'
                  }`}
                >
                  {isChecked && <span className="material-symbols-outlined text-[16px] font-bold">check</span>}
                </div>
                <div className="flex flex-col">
                  <span className="font-body-md text-body-md text-on-surface font-medium leading-none">
                    {h.label}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                    {h.desc}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-primary text-[18px] opacity-70 group-hover:opacity-100">
                {h.icon}
              </span>
            </div>
          );
        })}
      </div>

      {/* Dynamic Score & Celebration Banner */}
      <div className="p-space-lg rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container border border-outline-variant/20 shadow-md flex flex-col gap-space-md relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-primary/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between z-10">
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Desempenho Diário
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-display-hero text-headline-lg font-bold text-primary">
                {summary.score}
              </span>
              <span className="font-headline-md text-headline-md text-on-surface-variant font-medium">
                / 7
              </span>
            </div>
          </div>

          {/* Circular Graphic Gauge */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-surface-container-highest"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.5"
              />
              <path
                className="text-primary transition-all duration-500 ease-out"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${summary.percentage}, 100`}
                strokeLinecap="round"
                strokeWidth="3.5"
              />
            </svg>
            <span className="absolute font-label-sm text-label-sm font-bold text-primary">
              {summary.percentage}%
            </span>
          </div>
        </div>

        {/* Dynamic Contextual Feedback Banner */}
        <div
          className={`p-space-md rounded-xl flex flex-col gap-1 z-10 transition-all ${
            summary.isAllCompleted
              ? 'bg-primary/15 border border-primary/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : summary.score >= 4
              ? 'bg-secondary/10 border border-secondary/30'
              : 'bg-surface-container border border-outline-variant/30'
          }`}
        >
          {summary.isAllCompleted ? (
            <>
              <div className="flex items-center gap-1.5 text-primary font-headline-sm text-label-lg font-bold">
                <span>🎉</span>
                <span>Parabéns! Todos os 7 hábitos concluídos!</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Sequência impecável. Você está construindo ativamente sua versão de 2027 com disciplina de elite!
              </p>
            </>
          ) : summary.score >= 4 ? (
            <>
              <div className="flex items-center gap-1.5 text-secondary font-headline-sm text-label-lg font-bold">
                <span>🔥</span>
                <span>{summary.score} de 7 hábitos concluídos ({summary.percentage}%)</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Bom ritmo de execução! Mantenha a cadência para fechar o dia com pontuação máxima.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-on-surface font-headline-sm text-label-lg font-bold">
                <span>⚡</span>
                <span>{summary.score} de 7 hábitos concluídos ({summary.percentage}%)</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                Dia em andamento. Foque no próximo ritual para manter o avanço diário.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

