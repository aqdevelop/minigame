// Retro sound generator using Web Audio API
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

export const playSound = (type: 'shoot' | 'hit' | 'explosion' | 'damage' | 'powerup' | 'boss' | 'wave') => {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'shoot':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(880, now);
      oscillator.frequency.exponentialRampToValueAtTime(440, now + 0.1);
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;

    case 'hit':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(200, now);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      oscillator.start(now);
      oscillator.stop(now + 0.1);
      break;

    case 'explosion':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(150, now);
      oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case 'damage':
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.2);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      oscillator.start(now);
      oscillator.stop(now + 0.2);
      break;

    case 'powerup':
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(660, now + 0.1);
      oscillator.frequency.setValueAtTime(880, now + 0.2);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      oscillator.start(now);
      oscillator.stop(now + 0.3);
      break;

    case 'boss':
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.setValueAtTime(80, now + 0.2);
      oscillator.frequency.setValueAtTime(100, now + 0.4);
      oscillator.frequency.setValueAtTime(60, now + 0.6);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      oscillator.start(now);
      oscillator.stop(now + 0.8);
      break;

    case 'wave':
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(330, now);
      oscillator.frequency.setValueAtTime(440, now + 0.15);
      oscillator.frequency.setValueAtTime(550, now + 0.3);
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
      break;
  }
};

// BGM System
let bgmOscillators: OscillatorNode[] = [];
let bgmGains: GainNode[] = [];
let bgmInterval: number | null = null;
let isBgmPlaying = false;

const bgmNotes = [
  [130.81, 164.81, 196.00], // C3, E3, G3
  [146.83, 185.00, 220.00], // D3, F#3, A3
  [130.81, 164.81, 196.00], // C3, E3, G3
  [123.47, 155.56, 185.00], // B2, Eb3, F#3
  [110.00, 138.59, 164.81], // A2, C#3, E3
  [123.47, 146.83, 185.00], // B2, D3, F#3
  [130.81, 164.81, 196.00], // C3, E3, G3
  [146.83, 185.00, 220.00], // D3, F#3, A3
];

let currentNoteIndex = 0;

export const startBgm = () => {
  if (isBgmPlaying) return;
  isBgmPlaying = true;

  const playNote = () => {
    const ctx = getAudioContext();
    const notes = bgmNotes[currentNoteIndex % bgmNotes.length];

    // Clear previous
    bgmOscillators.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    bgmOscillators = [];
    bgmGains = [];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = i === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.45);

      bgmOscillators.push(osc);
      bgmGains.push(gain);
    });

    currentNoteIndex++;
  };

  playNote();
  bgmInterval = window.setInterval(playNote, 500);
};

export const stopBgm = () => {
  isBgmPlaying = false;
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  bgmOscillators.forEach((osc) => {
    try { osc.stop(); } catch {}
  });
  bgmOscillators = [];
  bgmGains = [];
  currentNoteIndex = 0;
};

export const initAudio = () => {
  getAudioContext();
};
