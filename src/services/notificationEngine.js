/**
 * src/services/notificationEngine.js
 * Motor Autônomo de Monitoramento e Agendamento de Alertas
 * Monitora em background:
 * 1. Time-blocking (alarmes 10 min antes do compromisso)
 * 2. Radar Financeiro (assinaturas 48h antes e no dia)
 * 3. Guardião de Streaks (loss aversion noturno às 20h30)
 * 4. Hidratação e Postura (intervalos de 90 min)
 */

import { db } from './db.js';
import { StreakService } from './streaks.js';
import { NotificationCenterService } from './notificationCenter.js';

let intervalId = null;
let isStarted = false;

export const NotificationEngine = {
  start() {
    if (isStarted || typeof window === 'undefined') return;
    isStarted = true;

    // Primeiro ciclo após 3 segundos
    setTimeout(() => {
      this.checkAll();
    }, 3000);

    // Verificação contínua a cada 30 segundos
    intervalId = setInterval(() => {
      this.checkAll();
    }, 30 * 1000);
  },

  stop() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    isStarted = false;
  },

  checkAll() {
    try {
      const prefs = NotificationCenterService.getPreferences();
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      if (prefs.taskAlarms) {
        this.checkTaskAlarms(now, today);
      }

      if (prefs.financeRadar) {
        this.checkFinanceRadar(now, today);
      }

      if (prefs.habitGuardian) {
        this.checkHabitStreaksGuardian(now, today);
      }

      if (prefs.hydration) {
        this.checkHydrationInterval(now);
      }
    } catch (err) {
      console.warn('[Notification Engine Error]', err);
    }
  },

  // 1. Alarme de Tarefas e Time-Blocking (10 min antes)
  checkTaskAlarms(now, today) {
    const tasks = db.getTasks() || [];
    const currentMins = now.getHours() * 60 + now.getMinutes();

    tasks.forEach((task) => {
      // Tarefas não concluídas de hoje com horário agendado
      if (task.status === 'Feito' || !task.start_time) return;

      const isToday = !task.due_date || task.due_date === today;
      if (!isToday) return;

      const [th, tm] = task.start_time.split(':').map(Number);
      if (isNaN(th) || isNaN(tm)) return;

      const taskMins = th * 60 + tm;
      const diff = taskMins - currentMins;

      // Dispara se faltar entre 0 e 10 minutos
      if (diff >= 0 && diff <= 10) {
        const alertKey = `nexus_alert_task_${task.id}_${today}`;
        const alreadyAlerted = localStorage.getItem(alertKey);

        if (!alreadyAlerted) {
          localStorage.setItem(alertKey, '1');
          const timeText = diff === 0 ? 'agora' : `em ${diff} minuto${diff > 1 ? 's' : ''}`;

          NotificationCenterService.send({
            type: 'task',
            title: `🔔 Tarefa Agendada: ${task.title}`,
            message: `Inicia ${timeText} (${task.start_time}). Prepare seu ambiente para máxima produtividade.`,
            actionView: 'hub-diario',
            urgency: 'high',
            tag: `task-${task.id}`
          });
        }
      }
    });
  },

  // 2. Radar Financeiro (Assinaturas e Recorrências com 48h de antecedência)
  checkFinanceRadar(now, today) {
    const subscriptions = db.getSubscriptions() || [];
    const todayMidnight = new Date(today + 'T00:00:00').getTime();

    subscriptions.forEach((sub) => {
      if (sub.status === 'Inativa' || !sub.next_payment_date) return;

      const payDate = new Date(sub.next_payment_date + 'T00:00:00').getTime();
      const diffDays = Math.round((payDate - todayMidnight) / (1000 * 60 * 60 * 24));

      // Notifica se vencer hoje, amanhã ou em 2 dias
      if (diffDays >= 0 && diffDays <= 2) {
        const alertKey = `nexus_alert_sub_${sub.id}_${today}_d${diffDays}`;
        const alreadyAlerted = localStorage.getItem(alertKey);

        if (!alreadyAlerted) {
          localStorage.setItem(alertKey, '1');

          let title = '';
          if (diffDays === 0) {
            title = `💳 Vence HOJE: ${sub.service_name}`;
          } else if (diffDays === 1) {
            title = `💳 Vence AMANHÃ: ${sub.service_name}`;
          } else {
            title = `💳 Vence em 2 dias: ${sub.service_name}`;
          }

          const priceFormatted = Number(sub.price || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
          });

          NotificationCenterService.send({
            type: 'finance',
            title,
            message: `Previsão de cobrança recorrente no valor de ${priceFormatted}. Verifique o saldo disponível.`,
            actionView: 'financas',
            urgency: diffDays === 0 ? 'high' : 'medium',
            tag: `sub-${sub.id}`
          });
        }
      }
    });
  },

  // 3. Guardião de Streaks Noturno (20h30 — Proteção contra quebra de disciplina)
  checkHabitStreaksGuardian(now, today) {
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Dispara a partir das 20h30
    if (hours < 20 || (hours === 20 && minutes < 30)) return;

    const alertKey = `nexus_alert_streak_guardian_${today}`;
    if (localStorage.getItem(alertKey)) return;

    const habits = db.getCustomHabits() || [];
    const dailyLog = db.getDailyLog(today) || {};

    const inDanger = [];
    habits.forEach((habit) => {
      const isDone = Boolean(dailyLog[habit.id]);
      if (!isDone) {
        const streakData = StreakService.calculateHabitStreak(habit.id);
        if (streakData && streakData.currentStreak >= 2) {
          inDanger.push({
            habit,
            streak: streakData.currentStreak
          });
        }
      }
    });

    if (inDanger.length > 0) {
      localStorage.setItem(alertKey, '1');
      inDanger.sort((a, b) => b.streak - a.streak);
      const top = inDanger[0];

      NotificationCenterService.send({
        type: 'habit',
        title: `🔥 Guardião de Streaks: ${top.streak} dias em risco!`,
        message: `Você possui uma sequência ativa no hábito "${top.habit.label}". Conclua antes de dormir para não perder sua consistência.`,
        actionView: 'hub-diario',
        urgency: 'high',
        tag: 'streak-guardian'
      });
    }
  },

  // 4. Lembrete de Hidratação & Postura (Intervalo de 90 min em horário útil)
  checkHydrationInterval(now) {
    const hours = now.getHours();
    // Apenas entre 08:00 e 19:00
    if (hours < 8 || hours >= 19) return;

    const lastAlert = Number(localStorage.getItem('nexus_last_hydration_alert') || 0);
    const intervalMs = 90 * 60 * 1000; // 90 minutos

    if (Date.now() - lastAlert >= intervalMs) {
      localStorage.setItem('nexus_last_hydration_alert', String(Date.now()));

      NotificationCenterService.send({
        type: 'system',
        title: '💧 Hidratação & Postura',
        message: 'Faça uma pausa de 30 segundos, beba água e relaxe a cervical para manter o foco elevado.',
        actionView: null,
        urgency: 'low',
        tag: 'hydration'
      });
    }
  }
};

