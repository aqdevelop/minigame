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

// BGM System - Epic Space Battle Theme
let bgmInterval: number | null = null;
let isBgmPlaying = false;
let bgmGain: GainNode | null = null;

// Heroic space battle melody (inspired by classic shooters)
const melodyNotes = [
  // Main theme - heroic ascending
  659, 659, 659, 523, 784, 659, 523, 392,
  // Build up
  523, 523, 523, 440, 659, 523, 440, 349,
  // Climax
  784, 784, 880, 784, 659, 523, 659, 784,
  // Resolution
  880, 784, 659, 523, 659, 523, 440, 392,
];

// Powerful bass line
const bassNotes = [
  131, 131, 165, 131, 175, 175, 131, 131,
  110, 110, 131, 110, 147, 147, 110, 110,
  175, 175, 196, 175, 165, 165, 147, 147,
  196, 175, 165, 131, 165, 131, 110, 98,
];

// Rhythmic arpeggio
const arpeggioNotes = [
  [523, 659, 784], [523, 659, 784], [440, 523, 659], [440, 523, 659],
  [349, 440, 523], [349, 440, 523], [392, 494, 587], [392, 494, 587],
];

let noteIndex = 0;

export const startBgm = () => {
  if (isBgmPlaying) return;
  isBgmPlaying = true;
  noteIndex = 0;

  const ctx = getAudioContext();
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.12;
  bgmGain.connect(ctx.destination);

  const noteLength = 0.18;

  const playMelody = () => {
    if (!isBgmPlaying || !bgmGain) return;
    const ctx = getAudioContext();

    // Lead melody
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = melodyNotes[noteIndex % melodyNotes.length];
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + noteLength * 0.9);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + noteLength);

    noteIndex++;
    if (isBgmPlaying) {
      setTimeout(playMelody, noteLength * 1000);
    }
  };

  let bassIndex = 0;
  const playBass = () => {
    if (!isBgmPlaying || !bgmGain) return;
    const ctx = getAudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = bassNotes[bassIndex % bassNotes.length];
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);

    bassIndex++;
    if (isBgmPlaying) {
      setTimeout(playBass, 360);
    }
  };

  let arpIndex = 0;
  const playArpeggio = () => {
    if (!isBgmPlaying || !bgmGain) return;
    const ctx = getAudioContext();

    const chord = arpeggioNotes[arpIndex % arpeggioNotes.length];
    chord.forEach((freq, i) => {
      setTimeout(() => {
        if (!isBgmPlaying || !bgmGain) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(bgmGain!);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }, i * 50);
    });

    arpIndex++;
    if (isBgmPlaying) {
      setTimeout(playArpeggio, 720);
    }
  };

  // Start all tracks
  playMelody();
  setTimeout(playBass, 100);
  setTimeout(playArpeggio, 200);
};

export const stopBgm = () => {
  isBgmPlaying = false;
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
  noteIndex = 0;
};

export const initAudio = () => {
  getAudioContext();
};

// Speech synthesis for "sixseven" enemy
export const speakSixSeven = () => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance('six seven');
    utterance.rate = 0.8;
    utterance.pitch = 0.5;
    utterance.volume = 0.7;
    const voices = speechSynthesis.getVoices();
    const robotVoice = voices.find(v => v.name.includes('Google') || v.name.includes('English'));
    if (robotVoice) {
      utterance.voice = robotVoice;
    }
    speechSynthesis.speak(utterance);
  }
};
