/**
 * src/services/haptics.js
 * Feedback auditivo suave e tátil gerado via Web Audio API.
 * Proporciona satisfação sensorial ao concluir hábitos, tarefas e subir de nível.
 */

export function playTactileFeedback(type = 'check') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    if (type === 'check') {
      // Som harmônico curto e brilhante (pop de conquista)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(987.77, now + 0.07); // B5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === 'uncheck') {
      // Som suave descendente
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'level_up') {
      // Fanfarra curta de recompensa (acorde maior rápido)
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const noteOsc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        noteOsc.type = 'sine';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.06);
        noteGain.gain.setValueAtTime(0.18, now + idx * 0.06);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
        noteOsc.connect(noteGain);
        noteGain.connect(ctx.destination);
        noteOsc.start(now + idx * 0.06);
        noteOsc.stop(now + idx * 0.06 + 0.25);
      });
    } else if (type === 'jarvis_activate') {
      // Tom tático futurista de inicialização do HUD J.A.R.V.I.S. (Chirp rápido 880Hz -> 1760Hz)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08); // A6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'jarvis_confirm') {
      // Confirmação harmônica sutil de comando executado
      const tones = [880, 1318.51]; // A5, E6
      tones.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(f, now + i * 0.04);
        g.gain.setValueAtTime(0.1, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.08);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now + i * 0.04);
        o.stop(now + i * 0.04 + 0.08);
      });
    }
  } catch (_) {
    // Silencioso caso o áudio não seja permitido
  }
}

/**
 * Toca chimes sonoros e futuristas para a Central de Notificações via Web Audio API.
 * Sem dependências de arquivos MP3 externos.
 * @param {'default'|'task'|'urgent'|'finance'|'chime'} style
 */
export function playNotificationChime(style = 'default') {
  try {
    if (typeof window === 'undefined') return;
    const soundEnabled = localStorage.getItem('nexus_notification_sound') !== 'false';
    if (!soundEnabled) return;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;

    if (style === 'task') {
      // Dois tons elegantes para compromissos e time-blocking (D5 -> A5)
      const freqs = [587.33, 880.00];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);
        gain.gain.setValueAtTime(0.12, now + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.09 + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.18);
      });
    } else if (style === 'urgent') {
      // Três tons harmônicos para streaks e urgência (E5 -> G#5 -> B5)
      const freqs = [659.25, 830.61, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.14, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.22);
      });
    } else if (style === 'finance') {
      // Chime metálico/cristalino suave (A5 -> E6)
      const freqs = [880.0, 1318.5];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.11, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } else {
      // Padrão: Ping cristalino duplo suave (C6 -> E6)
      const freqs = [1046.50, 1318.51];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    }
  } catch (_) {
    // Silencioso se áudio não suportado
  }
}


