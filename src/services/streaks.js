/**
 * src/services/streaks.js
 * Cálculo e Telemetria de Streaks (Sequências Consecutivas de Disciplina)
 * Implementa o princípio "Don't Break the Chain" com multiplicador de consistência.
 */

import { db } from './db.js';

export class StreakService {
  /**
   * Calcula a sequência ininterrupta de dias para um hábito específico
   * @param {string} habitId
   * @param {Array} dailyLogs
   * @returns {{ currentStreak: number, bestStreak: number, isDoneToday: boolean }}
   */
  static calculateHabitStreak(habitId, dailyLogs = null) {
    const logs = dailyLogs || db.getDailyLogs() || [];
    if (!logs.length) return { currentStreak: 0, bestStreak: 0, isDoneToday: false };

    // Mapear logs por data YYYY-MM-DD
    const dateMap = {};
    for (const log of logs) {
      if (log.log_date && log[habitId] === 1) {
        dateMap[log.log_date] = true;
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isDoneToday = Boolean(dateMap[todayStr]);

    // Começa a contagem de hoje ou de ontem (caso hoje ainda não tenha sido marcado)
    let currentStreak = 0;
    let checkDate = new Date(today);
    
    // Se hoje ainda não fez, checa a partir de ontem
    if (!isDoneToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (dateMap[dStr]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Best streak histórico
    const dates = Object.keys(dateMap).sort();
    let bestStreak = 0;
    let tempStreak = 0;
    let prevTime = null;

    for (const d of dates) {
      const curTime = new Date(d + 'T00:00:00').getTime();
      if (prevTime === null) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((curTime - prevTime) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevTime = curTime;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    }

    return {
      currentStreak,
      bestStreak: Math.max(bestStreak, currentStreak),
      isDoneToday
    };
  }

  /**
   * Retorna um mapa com o streak de todos os hábitos ativos
   */
  static getAllHabitsStreaks() {
    const habits = db.getCustomHabits() || [];
    const logs = db.getDailyLogs() || [];
    const result = {};

    for (const h of habits) {
      result[h.id] = this.calculateHabitStreak(h.id, logs);
    }
    return result;
  }

  /**
   * Sequência global de dias com ao menos 60% dos hábitos concluídos
   */
  static getGlobalConsistencyStreak() {
    const habits = db.getCustomHabits() || [];
    const logs = db.getDailyLogs() || [];
    if (!habits.length || !logs.length) return 0;

    const threshold = Math.max(1, Math.ceil(habits.length * 0.6));
    const qualifiedDates = {};

    for (const l of logs) {
      if (!l.log_date) continue;
      let completedCount = 0;
      for (const h of habits) {
        if (l[h.id] === 1) completedCount++;
      }
      if (completedCount >= threshold) {
        qualifiedDates[l.log_date] = true;
      }
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isDoneToday = Boolean(qualifiedDates[todayStr]);

    let streak = 0;
    let checkDate = new Date(today);
    if (!isDoneToday) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().split('T')[0];
      if (qualifiedDates[dStr]) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }
}

