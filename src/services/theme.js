// Sistema de Temas de Cores de Acento para o Nexus Command Center

export const ACCENT_THEMES = {
  esmeralda: {
    id: 'esmeralda',
    name: 'Esmeralda Minimalista',
    primary: '#4edea3',
    primaryContainer: '#10b981',
    onPrimaryContainer: '#00422b',
    border: '#10b981',
    glow: 'rgba(16, 185, 129, 0.25)'
  },
  ciano: {
    id: 'ciano',
    name: 'Ciano Cibernético',
    primary: '#22d3ee',
    primaryContainer: '#06b6d4',
    onPrimaryContainer: '#083344',
    border: '#06b6d4',
    glow: 'rgba(6, 182, 212, 0.25)'
  },
  violeta: {
    id: 'violeta',
    name: 'Violeta Nexus',
    primary: '#a78bfa',
    primaryContainer: '#8b5cf6',
    onPrimaryContainer: '#2e1065',
    border: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.25)'
  },
  ambar: {
    id: 'ambar',
    name: 'Âmbar Solar',
    primary: '#fbbf24',
    primaryContainer: '#f59e0b',
    onPrimaryContainer: '#451a03',
    border: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.25)'
  },
  rose: {
    id: 'rose',
    name: 'Rosé / Crimson',
    primary: '#f472b6',
    primaryContainer: '#ec4899',
    onPrimaryContainer: '#500724',
    border: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.25)'
  }
};

export function getActiveThemeId() {
  try {
    return localStorage.getItem('nexus_accent_theme') || 'esmeralda';
  } catch (e) {
    return 'esmeralda';
  }
}

export function applyAccentTheme(themeId) {
  const theme = ACCENT_THEMES[themeId] || ACCENT_THEMES.esmeralda;
  
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.style.setProperty('--nexus-primary', theme.primary);
    root.style.setProperty('--nexus-primary-container', theme.primaryContainer);
    root.style.setProperty('--nexus-on-primary-container', theme.onPrimaryContainer);
    root.style.setProperty('--nexus-border', theme.border);
    root.style.setProperty('--nexus-glow', theme.glow);
    root.setAttribute('data-accent', theme.id);
  }

  try {
    localStorage.setItem('nexus_accent_theme', theme.id);
  } catch (e) {}

  return theme;
}

