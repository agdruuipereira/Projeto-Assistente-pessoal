/**
 * src/services/jarvisVoice.js
 * Serviço de voz que encapsula SpeechRecognition (Web Speech API) e SpeechSynthesis.
 * Suporta idioma pt-BR, eventos de estado, transcrição em tempo real, síntese de fala
 * e modo Hands-Free com detecção contínua de Wake-Word ("Jarvis" / "Ei Jarvis").
 */

import { playTactileFeedback } from './haptics.js';
import { UserGoalsService } from './userGoals.js';

const SpeechRecognition = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null;
let recognition = null;
let isMuted = false;
let isSpeaking = false;
let isContinuousWakeWord = typeof localStorage !== 'undefined' && localStorage.getItem('nexus_jarvis_wakeword') === 'true';
let shouldKeepListening = isContinuousWakeWord;

if (SpeechRecognition) {
  try {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
  } catch (e) {
    console.warn('[J.A.R.V.I.S. Voice Init]', e);
  }
}

// Listeners de eventos
const listeners = {
  state: [],        // ('idle' | 'listening' | 'processing' | 'speaking' | 'unsupported')
  transcript: [],   // (text: string, isFinal: boolean)
  error: [],
  wakeWord: []      // () => void
};

function _emit(type, payload, extra) {
  const cbs = listeners[type] || [];
  cbs.forEach(cb => {
    try {
      cb(payload, extra);
    } catch (err) {
      console.warn('[J.A.R.V.I.S. Listener]', err);
    }
  });
}

function startListening() {
  if (!recognition) {
    _emit('state', 'unsupported');
    _emit('error', 'Reconhecimento de fala não suportado neste navegador. Utilize o Google Chrome, Edge ou Brave.');
    return;
  }
  try {
    recognition.start();
    _emit('state', 'listening');
  } catch (e) {
    if (e.name === 'InvalidStateError') {
      _emit('state', 'listening');
    } else {
      _emit('error', e.message);
    }
  }
}

function stopListening() {
  shouldKeepListening = false;
  if (recognition) {
    try {
      recognition.stop();
    } catch (_) {}
  }
  _emit('state', 'idle');
}

function cancelSpeaking() {
  isSpeaking = false;
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }
  _emit('state', 'idle');
}

function speak(text) {
  if (isMuted) return;
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    _emit('error', 'Síntese de voz não disponível');
    return;
  }

  try {
    window.speechSynthesis.cancel(); // Cancela falas anteriores pendentes
    isSpeaking = true;

    // Se estiver no modo wake word, pausa temporariamente a escuta para não capturar o próprio áudio
    if (recognition && isContinuousWakeWord) {
      try { recognition.abort(); } catch (_) {}
    }

    const cleanText = text
      .replace(/```[\s\S]*?```/g, '') // Remove blocos de código/JSON das respostas faladas
      .replace(/[*_#`]/g, '')        // Remove formatação markdown simples
      .trim();

    if (!cleanText) {
      isSpeaking = false;
      return;
    }

    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = 'pt-BR';
    utter.rate = 1.05; // Velocidade dinâmica e profissional
    utter.pitch = 0.95; // Tom ligeiramente grave e analítico estilo J.A.R.V.I.S.

    const selectVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const ptBrVoice = voices.find(v => v.lang === 'pt-BR' || v.lang === 'pt_BR') ||
                        voices.find(v => /portugu[eê]s/i.test(v.name || v.lang));
      if (ptBrVoice) {
        utter.voice = ptBrVoice;
      }
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener('voiceschanged', selectVoice, { once: true });
    } else {
      selectVoice();
    }

    utter.onstart = () => _emit('state', 'speaking');
    
    const handleSpeechFinished = () => {
      isSpeaking = false;
      _emit('state', 'idle');
      // Se o modo mãos-livres estiver ativo, retoma a escuta de fundo automaticamente
      if (isContinuousWakeWord && shouldKeepListening) {
        setTimeout(() => {
          if (!isSpeaking) startListening();
        }, 400);
      }
    };

    utter.onend = handleSpeechFinished;
    utter.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        _emit('error', e.error);
      }
      handleSpeechFinished();
    };

    window.speechSynthesis.speak(utter);
  } catch (err) {
    console.warn('[J.A.R.V.I.S. TTS]', err);
    isSpeaking = false;
    _emit('state', 'idle');
  }
}

function toggleMute() {
  isMuted = !isMuted;
  if (isMuted && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  return isMuted;
}

function setWakeWordEnabled(enabled) {
  isContinuousWakeWord = Boolean(enabled);
  shouldKeepListening = isContinuousWakeWord;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('nexus_jarvis_wakeword', String(isContinuousWakeWord));
    }
  } catch (_) {}

  if (isContinuousWakeWord) {
    startListening();
    playTactileFeedback('jarvis_activate');
  } else {
    stopListening();
  }
  return isContinuousWakeWord;
}

function isWakeWordActive() {
  return isContinuousWakeWord;
}

function onStateChange(cb) {
  listeners.state.push(cb);
  return () => {
    listeners.state = listeners.state.filter(fn => fn !== cb);
  };
}

function onTranscript(cb) {
  listeners.transcript.push(cb);
  return () => {
    listeners.transcript = listeners.transcript.filter(fn => fn !== cb);
  };
}

function onWakeWord(cb) {
  listeners.wakeWord.push(cb);
  return () => {
    listeners.wakeWord = listeners.wakeWord.filter(fn => fn !== cb);
  };
}

function onError(cb) {
  listeners.error.push(cb);
  return () => {
    listeners.error = listeners.error.filter(fn => fn !== cb);
  };
}

// Configuração do motor de reconhecimento de fala
if (recognition) {
  recognition.onresult = (event) => {
    if (isSpeaking) return; // Evita loop acústico com o próprio TTS

    let interim = '';
    let final = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const trans = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        final += trans;
      } else {
        interim += trans;
      }
    }

    const currentText = (final || interim).trim();
    const isFinal = Boolean(final);

    if (!currentText) return;

    // Se estiver no Modo Wake-Word (Hands-Free)
    if (isContinuousWakeWord) {
      const normalized = currentText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const assistantName = UserGoalsService.getAssistantName();
      const customName = assistantName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const escapedCustom = customName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = customName && customName !== 'jarvis'
        ? new RegExp(`(?:^|\\b)(?:ei\\s+|ola\\s+|ok\\s+)?(?:jarvis|${escapedCustom})(?:\\b|\\s*[,.]?)`, 'i')
        : /(?:^|\b)(?:ei\s+|ola\s+|ok\s+)?jarvis(?:\b|\s*[,.]?)/i;

      const wakeMatch = normalized.match(pattern);

      if (wakeMatch) {
        _emit('wakeWord');
        playTactileFeedback('jarvis_activate');

        // Extrai o comando após a palavra-chave
        const commandIndex = wakeMatch.index + wakeMatch[0].length;
        const cleanCommand = currentText.slice(commandIndex).replace(/^[,\s.:;]+/, '').trim();

        if (cleanCommand) {
          // Já falou o comando junto com o nome
          _emit('transcript', cleanCommand, isFinal);
        } else if (isFinal) {
          // Apenas chamou o assistente sem comando imediato
          speak(`À sua disposição, Comandante. O que deseja planejar ou executar?`);
          _emit('state', 'listening');
        }
      }
      return;
    }

    // Modo normal (clique manual ou atalho J)
    _emit('transcript', currentText, isFinal);
  };

  recognition.onerror = (e) => {
    if (e.error !== 'no-speech' && e.error !== 'aborted') {
      _emit('error', e.error);
    }
  };

  recognition.onstart = () => _emit('state', 'listening');

  recognition.onend = () => {
    _emit('state', 'idle');
    // Reconexão automática resiliente se o modo hands-free estiver ativo e não estiver falando
    if (isContinuousWakeWord && shouldKeepListening && !isSpeaking) {
      setTimeout(() => {
        if (!isSpeaking && shouldKeepListening) {
          startListening();
        }
      }, 500);
    }
  };
}

export const jarvisVoice = {
  startListening,
  stopListening,
  cancelSpeaking,
  speak,
  toggleMute,
  isMuted: () => isMuted,
  setWakeWordEnabled,
  isWakeWordActive,
  onStateChange,
  onTranscript,
  onWakeWord,
  onError,
  setState: (newState) => _emit('state', newState)
};
