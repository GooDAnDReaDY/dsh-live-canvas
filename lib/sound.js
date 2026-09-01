// dsh-live-canvas: UI Sound FX & Micro-Interactions Web Audio Synthesis Engine.

export const SOUND_PRESETS = {
  click: { freq: 800, type: 'sine', duration: 0.04, desc: 'Subtle button click' },
  tap: { freq: 280, type: 'triangle', duration: 0.05, desc: 'Tactile switch tap' },
  success: { freq: 523.25, secondFreq: 659.25, type: 'sine', duration: 0.25, desc: '2-Tone success chime' },
  error: { freq: 220, secondFreq: 180, type: 'sawtooth', duration: 0.18, desc: 'Warning error buzz' },
  modal: { freq: 350, type: 'sine', duration: 0.08, desc: 'Modal pop opening' },
  levelup: { freq: 440, secondFreq: 554.37, thirdFreq: 659.25, type: 'sine', duration: 0.35, desc: '3-Tone level up arpeggio' }
};

export function getSoundEngineScript() {
  return `
    window.__DLC_SOUND__ = (function() {
      let ctx = null;
      function getAudioContext() {
        if (!ctx) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) ctx = new AudioCtx();
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
      }

      return {
        play: function(soundType = 'click') {
          try {
            const ac = getAudioContext();
            if (!ac) return;
            const now = ac.currentTime;

            if (soundType === 'success') {
              const osc1 = ac.createOscillator();
              const osc2 = ac.createOscillator();
              const gain = ac.createGain();
              osc1.type = 'sine'; osc1.frequency.setValueAtTime(523.25, now);
              osc2.type = 'sine'; osc2.frequency.setValueAtTime(659.25, now + 0.08);
              gain.gain.setValueAtTime(0.12, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
              osc1.connect(gain); osc2.connect(gain); gain.connect(ac.destination);
              osc1.start(now); osc1.stop(now + 0.1);
              osc2.start(now + 0.08); osc2.stop(now + 0.25);
              return;
            }

            if (soundType === 'error') {
              const osc = ac.createOscillator();
              const gain = ac.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(220, now);
              osc.frequency.linearRampToValueAtTime(160, now + 0.15);
              gain.gain.setValueAtTime(0.1, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
              osc.connect(gain); gain.connect(ac.destination);
              osc.start(now); osc.stop(now + 0.18);
              return;
            }

            // Standard Click / Tap / Modal
            const osc = ac.createOscillator();
            const gain = ac.createGain();
            const freq = soundType === 'tap' ? 280 : (soundType === 'modal' ? 350 : 800);
            const dur = soundType === 'modal' ? 0.08 : 0.04;
            osc.type = soundType === 'tap' ? 'triangle' : 'sine';
            osc.frequency.setValueAtTime(freq, now);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
            osc.connect(gain); gain.connect(ac.destination);
            osc.start(now); osc.stop(now + dur);
          } catch {}
        }
      };
    })();
  `;
}

