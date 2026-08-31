// dsh-live-canvas: AI Theme Tokens Engine & 1-Click Design System Switcher.

export const THEME_PRESETS = [
  {
    id: 'linear-dark',
    name: 'Linear Dark',
    category: 'Modern SaaS',
    description: 'Deep graphite background with subtle violet glow and crisp dark borders.',
    colors: {
      bg: '#090a0f',
      surface: '#12141c',
      surfaceHover: '#1a1d29',
      border: '#26293b',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
      accent: '#6366f1',
      accentHover: '#4f46e5'
    },
    radius: '12px',
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  {
    id: 'vercel-clean',
    name: 'Vercel Clean',
    category: 'Minimal Monochrome',
    description: 'High-contrast monochrome palette with strict borders and sharp geometry.',
    colors: {
      bg: '#000000',
      surface: '#0a0a0a',
      surfaceHover: '#141414',
      border: '#262626',
      textPrimary: '#ffffff',
      textSecondary: '#888888',
      accent: '#ffffff',
      accentHover: '#eaeaea'
    },
    radius: '8px',
    fontFamily: "Geist, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
  },
  {
    id: 'swiss-editorial',
    name: 'Swiss Editorial',
    category: 'Brutalism & Print',
    description: 'Bold asymmetric typography with international safety orange accents.',
    colors: {
      bg: '#0d0d0d',
      surface: '#171717',
      surfaceHover: '#212121',
      border: '#333333',
      textPrimary: '#f5f5f5',
      textSecondary: '#a3a3a3',
      accent: '#ff4400',
      accentHover: '#e63d00'
    },
    radius: '4px',
    fontFamily: "'Space Grotesk', -apple-system, sans-serif"
  },
  {
    id: 'glassmorphism',
    name: 'Glassmorphism Neon',
    category: 'Creative Studio',
    description: 'Frosted glass surfaces with glowing ambient blur backdrops.',
    colors: {
      bg: '#030712',
      surface: 'rgba(17, 24, 39, 0.7)',
      surfaceHover: 'rgba(31, 41, 55, 0.8)',
      border: 'rgba(255, 255, 255, 0.12)',
      textPrimary: '#f9fafb',
      textSecondary: '#9ca3af',
      accent: '#06b6d4',
      accentHover: '#0891b2'
    },
    radius: '16px',
    fontFamily: "Outfit, -apple-system, BlinkMacSystemFont, sans-serif"
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Terminal',
    category: 'Futuristic',
    description: 'Electric neon cyan and hot magenta over pitch-black grid.',
    colors: {
      bg: '#050508',
      surface: '#0e0e17',
      surfaceHover: '#181824',
      border: '#2a2a3c',
      textPrimary: '#00f0ff',
      textSecondary: '#ff0055',
      accent: '#00f0ff',
      accentHover: '#ffe600'
    },
    radius: '2px',
    fontFamily: "'JetBrains Mono', monospace"
  }
];

export function listThemePresets() {
  return THEME_PRESETS;
}

export function getThemeById(id) {
  return THEME_PRESETS.find(t => t.id === id) || THEME_PRESETS[0];
}

export function generateCssVariables(themeId) {
  const t = getThemeById(themeId);
  return `
    :root {
      --dlc-theme-id: "${t.id}";
      --dlc-bg: ${t.colors.bg};
      --dlc-surface: ${t.colors.surface};
      --dlc-surface-hover: ${t.colors.surfaceHover};
      --dlc-border: ${t.colors.border};
      --dlc-text-primary: ${t.colors.textPrimary};
      --dlc-text-secondary: ${t.colors.textSecondary};
      --dlc-accent: ${t.colors.accent};
      --dlc-accent-hover: ${t.colors.accentHover};
      --dlc-radius: ${t.radius};
      --dlc-font: ${t.fontFamily};
    }
    body {
      background-color: var(--dlc-bg) !important;
      color: var(--dlc-text-primary) !important;
      font-family: var(--dlc-font) !important;
    }
  `.trim();
}

export function generateTailwindConfig(themeId) {
  const t = getThemeById(themeId);
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        theme: {
          bg: '${t.colors.bg}',
          surface: '${t.colors.surface}',
          border: '${t.colors.border}',
          primary: '${t.colors.textPrimary}',
          secondary: '${t.colors.textSecondary}',
          accent: '${t.colors.accent}'
        }
      },
      borderRadius: {
        theme: '${t.radius}'
      }
    }
  },
  plugins: []
};
`;
}

