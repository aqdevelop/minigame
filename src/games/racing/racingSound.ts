// Racing Game Sound System - Outrun/Arcade Style BGM
let audioContext: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let isBgmPlaying = false;

export const initRacingAudio = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Energetic Outrun-style racing melody
const melodyNotes = [
  // Intro hook - exciting start
  880, 880, 784, 880, 1047, 880, 784, 659,
  // Main verse - driving energy
  784, 784, 659, 784, 880, 784, 659, 523,
  // Bridge - building tension
  659, 784, 880, 1047, 880, 784, 659, 784,
  // Chorus - triumphant feel
  1047, 1047, 880, 1047, 1175, 1047, 880, 784,
];

// Punchy bass for speed feel
const bassNotes = [
  165, 165, 196, 220, 165, 165, 196, 247,
  147, 147, 175, 196, 147, 147, 175, 220,
  196, 196, 220, 247, 196, 196, 220, 294,
  220, 220, 262, 294, 220, 220, 262, 330,
];

// Rhythm pattern (drums simulation)
const drumPattern = [1, 0, 0.5, 0, 1, 0, 0.5, 0.5];

export const startRacingBgm = () => {
  if (isBgmPlaying) return;
  const ctx = initRacingAudio();
  if (!ctx) return;

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.15;
  bgmGain.connect(ctx.destination);

  isBgmPlaying = true;

  let melodyIndex = 0;
  const noteLength = 0.14;

  const playMelody = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = melodyNotes[melodyIndex % melodyNotes.length];
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + noteLength * 0.85);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + noteLength);

    melodyIndex++;
    if (isBgmPlaying) {
      setTimeout(playMelody, noteLength * 1000);
    }
  };

  let bassIndex = 0;
  const playBass = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = bassNotes[bassIndex % bassNotes.length];
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.28);

    bassIndex++;
    if (isBgmPlaying) {
      setTimeout(playBass, 280);
    }
  };

  let drumIndex = 0;
  const playDrum = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const intensity = drumPattern[drumIndex % drumPattern.length];
    if (intensity > 0) {
      // Kick drum (low noise burst)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(intensity === 1 ? 150 : 100, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.3 * intensity, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.connect(gain);
      gain.connect(bgmGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);

      // Hi-hat on off-beats
      if (intensity === 0.5) {
        const noise = ctx.createOscillator();
        const noiseGain = ctx.createGain();
        noise.type = 'square';
        noise.frequency.value = 8000;
        noiseGain.gain.setValueAtTime(0.05, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        noise.connect(noiseGain);
        noiseGain.connect(bgmGain);
        noise.start();
        noise.stop(ctx.currentTime + 0.05);
      }
    }

    drumIndex++;
    if (isBgmPlaying) {
      setTimeout(playDrum, 140);
    }
  };

  // Start all tracks with slight offsets for groove
  playMelody();
  setTimeout(playBass, 50);
  setTimeout(playDrum, 0);
};

export const stopRacingBgm = () => {
  isBgmPlaying = false;
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
};

// Sound effects
export const playRacingSound = (type: 'engine' | 'crash' | 'coin' | 'boost' | 'beep') => {
  const ctx = initRacingAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;

  switch (type) {
    case 'engine':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'crash':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
      break;

    case 'coin':
      osc.type = 'square';
      osc.frequency.setValueAtTime(988, now);
      osc.frequency.setValueAtTime(1319, now + 0.1);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'boost':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'beep':
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;
  }
};

// Countdown voice using TTS
export const speakCountdown = (onComplete: () => void) => {
  if (!('speechSynthesis' in window)) {
    onComplete();
    return;
  }

  const speak = (text: string, delay: number, callback?: () => void) => {
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;

      const voices = speechSynthesis.getVoices();
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) {
        utterance.voice = englishVoice;
      }

      if (callback) {
        utterance.onend = callback;
      }

      speechSynthesis.speak(utterance);
      playRacingSound('beep');
    }, delay);
  };

  speak('3', 0);
  speak('2', 1000);
  speak('1', 2000);
  speak('Start!', 3000, onComplete);
};
