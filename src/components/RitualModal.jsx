import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { playTactileFeedback } from '../services/haptics';

export default function RitualModal({ isOpen, onClose, ritualType = 'morning', onComplete }) {
  const [step, setStep] = useState(1);
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Form states matinal
  const [task1, setTask1] = useState('');
  const [task2, setTask2] = useState('');
  const [task3, setTask3] = useState('');
  const [intention, setIntention] = useState('');

  // Form states noturno
  const [gratitude, setGratitude] = useState('');
  const [learning, setLearning] = useState('');
  const [tomorrowTask, setTomorrowTask] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setTimerSeconds(60);
      setIsTimerRunning(false);
    }
  }, [isOpen, ritualType]);

  useEffect(() => {
    let t;
    if (isTimerRunning && timerSeconds > 0) {
      t = setInterval(() => setTimerSeconds(s => s - 1), 1000);
    } else if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      playTactileFeedback('check');
    }
    return () => clearInterval(t);
  }, [isTimerRunning, timerSeconds]);

  if (!isOpen) return null;

  const isMorning = ritualType === 'morning';

  const handleFinish = () => {
    const today = new Date().toISOString().split('T')[0];

    if (isMorning) {
      if (task1.trim()) db.createTask({ title: task1.trim(), priority: 'Alta', due_date: today, category: 'Trabalho', status: 'Não iniciado' });
      if (task2.trim()) db.createTask({ title: task2.trim(), priority: 'Média', due_date: today, category: 'Trabalho', status: 'Não iniciado' });
      if (task3.trim()) db.createTask({ title: task3.trim(), priority: 'Média', due_date: today, category: 'Pessoal', status: 'Não iniciado' });
    } else {
      const currentLog = db.getDailyLog(today);
      db.saveDailyLog({
        ...currentLog,
        log_date: today,
        reflection_gratitude: gratitude.trim() || currentLog.reflection_gratitude,
        reflection_learning: learning.trim() || currentLog.reflection_learning
      });

      if (tomorrowTask.trim()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        db.createTask({ title: tomorrowTask.trim(), priority: 'Alta', due_date: tomorrowStr, category: 'Trabalho', status: 'Não iniciado' });
      }
    }

    playTactileFeedback('level_up');
    if (onComplete) onComplete();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-[#111827] border border-[#1F293D] rounded-2xl shadow-2xl p-6 space-y-6">
        
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-[#1F293D] pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isMorning ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30' : 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30'
            }`}>
              <span className="material-symbols-outlined text-[24px]">
                {isMorning ? 'wb_sunny' : 'bedtime'}
              </span>
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8]">
                Passo {step} de 3 • {isMorning ? 'Despertar de Alta Performance' : 'Encerramento Consciente'}
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                {isMorning ? 'Ritual Matinal Nexus' : 'Fechamento Noturno Nexus'}
              </h2>
            </div>
          </div>

          <button onClick={onClose} className="text-[#94A3B8] hover:text-white p-1">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Conteúdo Passo a Passo */}
        {isMorning ? (
          <div>
            {step === 1 && (
              <div className="space-y-4 text-center py-2">
                <span className="material-symbols-outlined text-4xl text-[#06B6D4]">water_drop</span>
                <h3 className="text-base font-bold text-white">1. Hidratação Ativa & Despertar</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Beba 500ml de água imediatamente. Seu corpo passou 8 horas em desidratação; reidratar os órgãos restaura 100% da clareza sináptica e da energia motora.
                </p>
                <div className="pt-2">
                  <div className="p-3 bg-[#1E293B]/60 rounded-xl border border-[#334155] inline-block text-xs text-[#10B981] font-semibold">
                    ✓ Água consumida • Cérebro reativado
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 text-center py-2">
                <span className="material-symbols-outlined text-4xl text-[#8B5CF6]">self_improvement</span>
                <h3 className="text-base font-bold text-white">2. Silêncio & Respiração Consciente (60s)</h3>
                <p className="text-xs text-[#94A3B8] max-w-md mx-auto">
                  Inspire em 4 segundos, segure em 4, expire em 4. Zere as distrações antes de entrar no mundo exterior.
                </p>
                <div className="py-2">
                  <div className="text-4xl font-mono font-bold text-white mb-3">{timerSeconds}s</div>
                  <button
                    type="button"
                    onClick={() => setIsTimerRunning(!isTimerRunning)}
                    className="px-4 py-2 rounded-xl bg-[#8B5CF6] text-white text-xs font-bold hover:opacity-90"
                  >
                    {isTimerRunning ? 'Pausar' : 'Iniciar 1 Minuto'}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#10B981]">checklist</span>
                  3. As 3 Vitórias Indispensáveis de Hoje
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Se você fizer apenas estas 3 coisas hoje, o dia já terá sido um sucesso estrondoso:
                </p>
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={task1}
                    onChange={(e) => setTask1(e.target.value)}
                    placeholder="1ª Prioridade Absoluta..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#10B981]"
                  />
                  <input
                    type="text"
                    value={task2}
                    onChange={(e) => setTask2(e.target.value)}
                    placeholder="2ª Prioridade..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#10B981]"
                  />
                  <input
                    type="text"
                    value={task3}
                    onChange={(e) => setTask3(e.target.value)}
                    placeholder="3ª Prioridade..."
                    className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#10B981]"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {step === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8B5CF6]">favorite</span>
                  1. Pelo que sou genuinamente grato hoje?
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  O reconhecimento das pequenas vitórias treina seu cérebro para manter resiliência e foco no longo prazo.
                </p>
                <textarea
                  rows="3"
                  value={gratitude}
                  onChange={(e) => setGratitude(e.target.value)}
                  placeholder="Escreva algo pelo qual você é grato hoje..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-xs text-white outline-none focus:border-[#8B5CF6] resize-none"
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#06B6D4]">psychology</span>
                  2. Principal aprendizado do dia
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  O que você aprendeu com o dia de hoje que o tornará mais sábio amanhã?
                </p>
                <textarea
                  rows="3"
                  value={learning}
                  onChange={(e) => setLearning(e.target.value)}
                  placeholder="Seu principal insight ou lição de hoje..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-xs text-white outline-none focus:border-[#06B6D4] resize-none"
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#10B981]">event_upcoming</span>
                  3. A 1ª Tarefa que você atacará amanhã de manhã
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Ao definir o primeiro passo antes de dormir, você elimina a fadiga de decisão ao acordar.
                </p>
                <input
                  type="text"
                  value={tomorrowTask}
                  onChange={(e) => setTomorrowTask(e.target.value)}
                  placeholder="Ex: Abrir relatório financeiro e revisar primeiras 2 páginas..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#10B981]"
                />
              </div>
            )}
          </div>
        )}

        {/* Botões de Navegação entre Passos */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1F293D]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="px-3.5 py-2 rounded-xl bg-[#1E293B] text-[#94A3B8] hover:text-white text-xs font-semibold"
            >
              Voltar
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => { setStep(s => s + 1); playTactileFeedback('check'); }}
              className="px-5 py-2 rounded-xl bg-[#06B6D4] text-[#001F26] font-bold text-xs hover:opacity-90 flex items-center gap-1.5"
            >
              <span>Avançar</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 rounded-xl bg-[#10B981] text-[#06231A] font-bold text-xs hover:opacity-90 flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Concluir Ritual</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

