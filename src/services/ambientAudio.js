/**
 * src/services/ambientAudio.js
 * Gerenciador de Áudio Nativo Web Audio API para Foco e Relaxamento.
 * Suporta:
 * - Música Lo-Fi Beats (acordes quentes jazz/neo-soul, textura analógica de vinil e sub-bass)
 * - Rhythm & Blues - R&B (progressões suaves neo-soul com modulação aveludada)
 * - Binaural Gamma 40Hz (hiperfoco cognitivo)
 * - Binaural Alpha 10Hz (flow & criatividade)
 * Zero dependências externas de MP3 ou servidores. 100% offline e procedural.
 */

let audioCtx = null;
let masterGain = null;
let activeNodes = [];
let chordTimer = null;
let currentType = 'gamma';
let isPlaying = false;
const listeners = new Set();

function notifyChange() {
  listeners.forEach(cb => {
    try { cb(isPlaying, currentType); } catch (_) {}
  });
}

// Acordes Lo-Fi (Cm9, Fm9, Bb13, Ebmaj7)
const LOFI_CHORDS = [
  [130.81, 155.56, 196.00, 233.08, 293.66], // Cm9
  [87.31, 174.61, 207.65, 261.63, 311.13],  // Fm9
  [116.54, 146.83, 174.61, 233.08, 293.66], // Bb9
  [77.78, 155.56, 196.00, 233.08, 293.66]   // Ebmaj7
];

// Acordes R&B Neo-Soul (Fmaj9, Em7, Dm9, Cmaj9)
const RNB_CHORDS = [
  [87.31, 174.61, 220.00, 261.63, 329.63], // Fmaj9
  [82.41, 164.81, 196.00, 246.94, 293.66], // Em7
  [73.42, 146.83, 174.61, 220.00, 293.66], // Dm9
  [65.41, 130.81, 196.00, 246.94, 293.66]  // Cmaj9
];

export const ambientAudio = {
  getIsPlaying() {
    return isPlaying;
  },

  getCurrentType() {
    return currentType;
  },

  onStateChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },

  stop() {
    if (chordTimer) {
      clearInterval(chordTimer);
      chordTimer = null;
    }
    if (audioCtx) {
      try {
        activeNodes.forEach(node => {
          try { if (node.stop) node.stop(); } catch (_) {}
          try { node.disconnect(); } catch (_) {}
        });
        activeNodes = [];
        audioCtx.close();
      } catch (_) {}
      audioCtx = null;
    }
    isPlaying = false;
    notifyChange();
  },

  start(type = 'lofi', volume = 0.25) {
    this.stop();
    if (typeof window === 'undefined') {
      isPlaying = true;
      currentType = type;
      notifyChange();
      return;
    }
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtx = ctx;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.connect(ctx.destination);
      masterGain = gain;
      currentType = type;

      if (type === 'gamma' || type === 'beta' || type === 'alpha' || type === 'theta') {
        // Ondas Binaurais Web Audio com Carrier Stereo Separado
        let beatFreq = 40;
        let carrier = 200;
        if (type === 'gamma') {
          beatFreq = 40;
          carrier = 200;
        } else if (type === 'beta') {
          beatFreq = 18;
          carrier = 220;
        } else if (type === 'alpha') {
          beatFreq = 10;
          carrier = 194;
        } else if (type === 'theta') {
          beatFreq = 6;
          carrier = 144;
        }

        const merger = ctx.createChannelMerger(2);

        const oscL = ctx.createOscillator();
        oscL.type = 'sine';
        oscL.frequency.setValueAtTime(carrier, ctx.currentTime);
        oscL.connect(merger, 0, 0);

        const oscR = ctx.createOscillator();
        oscR.type = 'sine';
        oscR.frequency.setValueAtTime(carrier + beatFreq, ctx.currentTime);
        oscR.connect(merger, 0, 1);

        merger.connect(gain);
        oscL.start();
        oscR.start();

        activeNodes = [oscL, oscR];
      } else if (type === 'lofi' || type === 'rnb') {
        // Sintetizador Procedural de Lo-Fi Beats ou R&B
        const chords = type === 'lofi' ? LOFI_CHORDS : RNB_CHORDS;
        const chordDuration = type === 'lofi' ? 3.6 : 4.0; // segundos por acorde
        let chordIndex = 0;

        // Filtro quente low-pass (estilo fita cassete analógica)
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(type === 'lofi' ? 700 : 950, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);
        filter.connect(gain);

        // LFO sutil para efeito de chorus/tape-flutter analógico
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(type === 'lofi' ? 0.35 : 0.8, ctx.currentTime);
        lfoGain.gain.setValueAtTime(type === 'lofi' ? 8 : 12, ctx.currentTime);
        lfo.connect(lfoGain);
        lfo.start();
        activeNodes.push(lfo);

        // Textura sutil de vinil (apenas no Lo-Fi)
        if (type === 'lofi') {
          const bufferSize = ctx.sampleRate * 2;
          const vinylBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
          const data = vinylBuffer.getChannelData(0);
          for (let i = 0; i < bufferSize; i++) {
            // Estalidos e ruído rosa muito sutil
            const crackle = Math.random() < 0.0008 ? (Math.random() * 0.4 - 0.2) : 0;
            data[i] = (Math.random() * 0.03 - 0.015) + crackle;
          }
          const vinylSource = ctx.createBufferSource();
          vinylSource.buffer = vinylBuffer;
          vinylSource.loop = true;
          const vinylGain = ctx.createGain();
          vinylGain.gain.setValueAtTime(0.06, ctx.currentTime);
          vinylSource.connect(vinylGain);
          vinylGain.connect(gain);
          vinylSource.start();
          activeNodes.push(vinylSource);
        }

        const playChord = (frequencies) => {
          if (!audioCtx || audioCtx.state === 'closed') return;
          const now = ctx.currentTime;

          frequencies.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc.type = idx === 0 ? 'sine' : (type === 'lofi' ? 'triangle' : 'sine');
            osc.frequency.setValueAtTime(freq, now);
            lfoGain.connect(osc.frequency);

            // Envelope ADSR suave
            const isBass = idx === 0;
            const targetGain = isBass ? 0.35 : 0.18;
            noteGain.gain.setValueAtTime(0.001, now);
            noteGain.gain.exponentialRampToValueAtTime(targetGain, now + 0.4);
            noteGain.gain.exponentialRampToValueAtTime(targetGain * 0.7, now + (chordDuration * 0.7));
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + chordDuration - 0.05);

            osc.connect(noteGain);
            noteGain.connect(filter);

            osc.start(now);
            osc.stop(now + chordDuration);

            activeNodes.push(osc);
          });
        };

        // Toca o primeiro acorde imediatamente
        playChord(chords[chordIndex]);

        // Cicla acordes a cada chordDuration segundos
        chordTimer = setInterval(() => {
          chordIndex = (chordIndex + 1) % chords.length;
          playChord(chords[chordIndex]);
        }, chordDuration * 1000);
      }

      isPlaying = true;
      notifyChange();
    } catch (e) {
      console.warn('[Ambient Audio]', e);
      isPlaying = false;
      notifyChange();
    }
  },

  toggle(type = currentType, volume = 0.25) {
    if (isPlaying) {
      if (type === currentType) {
        this.stop();
      } else {
        this.start(type, volume);
      }
    } else {
      this.start(type, volume);
    }
  }
};

