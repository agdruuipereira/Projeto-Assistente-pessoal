import React, { useState } from 'react';
import { UserGoalsService } from '../services/userGoals';
import { playTactileFeedback, playNotificationChime } from '../services/haptics';

export default function OnboardingModal({ isOpen, onComplete }) {
  const [step, setStep] = useState(1);
  const [userName, setUserName] = useState('Alexandre');
  const [userRole, setUserRole] = useState('Comandante');
  const [assistantName, setAssistantName] = useState('JARVIS');
  const [primaryFocus, setPrimaryFocus] = useState('Alta Produtividade');

  if (!isOpen) return null;

  const FOCUS_OPTIONS = [
    { id: 'Alta Produtividade', label: 'Alta Produtividade', icon: 'bolt', desc: 'Foco total, hábitos diários e conclusão de tarefas' },
    { id: 'Saúde & Físico', label: 'Saúde & Físico', icon: 'fitness_center', desc: 'Treinos de alta intensidade, sono regenerador e água' },
    { id: 'Blindagem Financeira', label: 'Blindagem Financeira', icon: 'account_balance_wallet', desc: 'Controle rigoroso de gastos, aportes e patrimônio' },
    { id: 'Conhecimento & Leitura', label: 'Conhecimento & Leitura', icon: 'auto_stories', desc: 'Meta de livros, cadernos de resumo e Segundo Cérebro' }
  ];

  const handleFinish = (e) => {
    if (e) e.preventDefault();
    const cleanName = userName.trim() || 'Usuário';
    const cleanRole = userRole.trim() || 'Comandante';
    const cleanAssistant = assistantName.trim().toUpperCase() || 'JARVIS';

    const profile = {
      name: cleanName,
      role: cleanRole,
      avatar: ''
    };

    localStorage.setItem('nexus_user_profile', JSON.stringify(profile));
    localStorage.setItem('projeto_onboarding_completed', 'true');
    UserGoalsService.setAssistantName(cleanAssistant);
    UserGoalsService.setAppTitle('Projeto');

    playNotificationChime('level_up');
    playTactileFeedback('level_up');

    if (onComplete) onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-[#06B6D4]/40 max-w-lg w-full rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header do Onboarding */}
        <div className="flex items-center justify-between border-b border-[#1F293D] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#06B6D4]/15 border border-[#06B6D4]/40 flex items-center justify-center text-[#06B6D4] font-mono font-bold text-sm">
              P
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">Configuração do Seu Projeto</h2>
              <p className="text-[11px] text-[#94A3B8]">Setup rápido em 3 etapas para personalizar seu centro de comando</p>
            </div>
          </div>

          <div className="flex items-center gap-1 font-mono text-xs font-bold text-[#06B6D4] bg-[#06B6D4]/10 px-2.5 py-1 rounded-full border border-[#06B6D4]/25">
            <span>Passo {step}</span>
            <span className="text-[#64748B]">/</span>
            <span className="text-[#64748B]">3</span>
          </div>
        </div>

        {/* ETAPA 1: Identidade do Operador */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <span className="text-xs font-bold text-[#06B6D4] uppercase tracking-wider block mb-1">Passo 1 de 3</span>
              <h3 className="text-lg font-bold text-white">Como você prefere ser chamado?</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                O assistente e os relatórios utilizarão esta identificação para personalizar seu briefing diário.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-medium">Seu Nome ou Apelido</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Ex: Alexandre, Lucas, Comandante..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-sm text-white font-semibold outline-none focus:border-[#06B6D4]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-medium">Cargo ou Papel Estratégico</label>
                <input
                  type="text"
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  placeholder="Ex: Fundador, Arquiteto de Software, Criador..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-sm text-white outline-none focus:border-[#06B6D4]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  playTactileFeedback('check');
                  setStep(2);
                }}
                disabled={!userName.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#06B6D4] hover:brightness-110 text-[#001F26] text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                <span>Avançar</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2: Nome do Assistente / IA */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <span className="text-xs font-bold text-[#10B981] uppercase tracking-wider block mb-1">Passo 2 de 3</span>
              <h3 className="text-lg font-bold text-white">Qual nome deseja dar ao seu assistente?</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Será a palavra de ativação por voz e como a inteligência artificial se comunicará com você.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1 font-medium">Nome da IA / Copiloto</label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => setAssistantName(e.target.value.toUpperCase())}
                  placeholder="Ex: JARVIS, FRIDAY, AURA, ATHENA, ALEXA..."
                  className="w-full bg-[#1E293B] border border-[#334155] rounded-xl p-3 text-sm font-mono font-bold text-[#10B981] outline-none focus:border-[#10B981]"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {['JARVIS', 'FRIDAY', 'AURA', 'ATHENA', 'ALEXA', 'NEXUS'].map((namePreset) => (
                  <button
                    key={namePreset}
                    type="button"
                    onClick={() => {
                      setAssistantName(namePreset);
                      playTactileFeedback('check');
                    }}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                      assistantName === namePreset
                        ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                        : 'bg-[#1E293B] border-[#334155] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {namePreset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={() => {
                  playTactileFeedback('check');
                  setStep(3);
                }}
                disabled={!assistantName.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#10B981] hover:brightness-110 text-[#06231A] text-xs font-bold transition-all disabled:opacity-40 cursor-pointer flex items-center gap-2"
              >
                <span>Avançar</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Foco Inicial */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div>
              <span className="text-xs font-bold text-[#8B5CF6] uppercase tracking-wider block mb-1">Passo 3 de 3</span>
              <h3 className="text-lg font-bold text-white">Qual seu foco principal de atuação?</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Isso ajuda a calibrar as primeiras prioridades do seu ecossistema.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {FOCUS_OPTIONS.map((f) => {
                const isSelected = primaryFocus === f.id;
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setPrimaryFocus(f.id);
                      playTactileFeedback('check');
                    }}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-[#8B5CF6]/20 border-[#8B5CF6] shadow-sm'
                        : 'bg-[#1E293B]/40 border-[#1F293D] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-white font-bold text-xs">
                      <span className={`material-symbols-outlined text-[18px] ${isSelected ? 'text-[#A78BFA]' : 'text-[#94A3B8]'}`}>
                        {f.icon}
                      </span>
                      <span>{f.label}</span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-tight">
                      {f.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 rounded-xl bg-[#06B6D4] hover:brightness-110 text-[#001F26] text-xs font-bold transition-all shadow-lg shadow-[#06B6D4]/20 cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                <span>Concluir e Iniciar Projeto</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

