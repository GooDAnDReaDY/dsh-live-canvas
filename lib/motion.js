// dsh-live-canvas: Micro-Animations & Motion Playground module.

export const MOTION_PRESETS = [
  {
    id: 'stagger-fade-up',
    name: 'Staggered Fade Up',
    category: 'Entrance',
    description: 'Smooth staggered entrance animation for cards and grid items.',
    cssKeyframes: `
@keyframes dlcFadeUp {
  0% { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.dlc-motion-fade-up {
  animation: dlcFadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.dlc-stagger-1 { animation-delay: 0.1s; }
.dlc-stagger-2 { animation-delay: 0.2s; }
.dlc-stagger-3 { animation-delay: 0.3s; }
`,
    framerProps: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}`
  },
  {
    id: 'glow-pulse',
    name: 'Ambient Glow Pulse',
    category: 'Ambient',
    description: 'Subtle breathing ambient aura for badges, cards, and CTA buttons.',
    cssKeyframes: `
@keyframes dlcGlowPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(99, 102, 241, 0.25); }
  50% { box-shadow: 0 0 35px rgba(99, 102, 241, 0.6); }
}
.dlc-motion-glow {
  animation: dlcGlowPulse 3s ease-in-out infinite;
}
`,
    framerProps: `animate={{ boxShadow: ["0 0 15px rgba(99,102,241,0.2)", "0 0 35px rgba(99,102,241,0.6)", "0 0 15px rgba(99,102,241,0.2)"] }} transition={{ duration: 3, repeat: Infinity }}`
  },
  {
    id: 'tilt-3d',
    name: '3D Hover Tilt',
    category: 'Interaction',
    description: 'Interactive depth perspective on cursor hover.',
    cssKeyframes: `
.dlc-motion-tilt {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s;
}
.dlc-motion-tilt:hover {
  transform: perspective(800px) rotateX(4deg) rotateY(-4deg) translateY(-4px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}
`,
    framerProps: `whileHover={{ scale: 1.02, rotateX: 4, rotateY: -4, transition: { duration: 0.2 } }}`
  },
  {
    id: 'float-slow',
    name: 'Floating Elements',
    category: 'Ambient',
    description: 'Gentle floating oscillation for badges and decorative spheres.',
    cssKeyframes: `
@keyframes dlcFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.dlc-motion-float {
  animation: dlcFloat 4s ease-in-out infinite;
}
`,
    framerProps: `animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}`
  }
];

export function listMotionPresets() {
  return MOTION_PRESETS;
}

export function getMotionPresetById(id) {
  return MOTION_PRESETS.find(m => m.id === id) || MOTION_PRESETS[0];
}

export function generateMotionCss() {
  return MOTION_PRESETS.map(m => m.cssKeyframes).join('\n');
}

