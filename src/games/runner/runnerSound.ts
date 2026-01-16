// Runner Game Sound System - Geometry Dash Style Intense Electronic BGM
let audioContext: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let isBgmPlaying = false;

export const initRunnerAudio = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Intense electronic melody (Geometry Dash inspired)
const melodyNotes = [
  // Drop section - intense and catchy
  659, 659, 784, 659, 523, 659, 784, 880,
  784, 784, 880, 784, 659, 784, 880, 1047,
  // Build-up
  880, 880, 1047, 880, 784, 880, 1047, 1175,
  1047, 880, 784, 659, 784, 880, 784, 659,
  // Climax
  1175, 1175, 1319, 1175, 1047, 1175, 1319, 1397,
  1319, 1175, 1047, 880, 1047, 1175, 1047, 880,
];

// Heavy electronic bass
const bassNotes = [
  165, 165, 165, 165, 196, 196, 196, 196,
  220, 220, 220, 220, 247, 247, 247, 247,
  262, 262, 262, 262, 294, 294, 294, 294,
  330, 330, 294, 294, 262, 262, 220, 196,
];

// EDM-style drum pattern
const drumPattern = [
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: true, snare: false, hat: true },
  { kick: false, snare: false, hat: true },
  { kick: false, snare: true, hat: true },
  { kick: true, snare: false, hat: true },
];

export const startRunnerBgm = () => {
  if (isBgmPlaying) return;
  const ctx = initRunnerAudio();

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.12;
  bgmGain.connect(ctx.destination);

  isBgmPlaying = true;

  let melodyIndex = 0;
  const noteLength = 0.11; // Fast tempo

  const playMelody = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    // Alternate between square and sawtooth for variety
    osc.type = melodyIndex % 8 < 4 ? 'square' : 'sawtooth';
    osc.frequency.value = melodyNotes[melodyIndex % melodyNotes.length];
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + noteLength * 0.8);
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

    // Sub bass
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = bassNotes[bassIndex % bassNotes.length];
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.02, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(bgmGain);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);

    // Mid bass layer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'square';
    osc2.frequency.value = bassNotes[bassIndex % bassNotes.length] * 2;
    gain2.gain.setValueAtTime(0.08, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc2.connect(gain2);
    gain2.connect(bgmGain);
    osc2.start();
    osc2.stop(ctx.currentTime + 0.12);

    bassIndex++;
    if (isBgmPlaying) {
      setTimeout(playBass, 220);
    }
  };

  let drumIndex = 0;
  const playDrum = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const pattern = drumPattern[drumIndex % drumPattern.length];

    // Kick drum
    if (pattern.kick) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = 'sine';
      kick.frequency.setValueAtTime(150, ctx.currentTime);
      kick.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
      kickGain.gain.setValueAtTime(0.5, ctx.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      kick.connect(kickGain);
      kickGain.connect(bgmGain);
      kick.start();
      kick.stop(ctx.currentTime + 0.15);
    }

    // Snare
    if (pattern.snare) {
      const snare = ctx.createOscillator();
      const snareGain = ctx.createGain();
      snare.type = 'triangle';
      snare.frequency.setValueAtTime(200, ctx.currentTime);
      snare.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);
      snareGain.gain.setValueAtTime(0.3, ctx.currentTime);
      snareGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      snare.connect(snareGain);
      snareGain.connect(bgmGain);
      snare.start();
      snare.stop(ctx.currentTime + 0.12);

      // Snare noise layer
      const noise = ctx.createOscillator();
      const noiseGain = ctx.createGain();
      noise.type = 'square';
      noise.frequency.value = 5000 + Math.random() * 2000;
      noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      noise.connect(noiseGain);
      noiseGain.connect(bgmGain);
      noise.start();
      noise.stop(ctx.currentTime + 0.1);
    }

    // Hi-hat
    if (pattern.hat) {
      const hat = ctx.createOscillator();
      const hatGain = ctx.createGain();
      hat.type = 'square';
      hat.frequency.value = 8000 + Math.random() * 3000;
      hatGain.gain.setValueAtTime(0.06, ctx.currentTime);
      hatGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
      hat.connect(hatGain);
      hatGain.connect(bgmGain);
      hat.start();
      hat.stop(ctx.currentTime + 0.05);
    }

    drumIndex++;
    if (isBgmPlaying) {
      setTimeout(playDrum, 110);
    }
  };

  // Synth pad for atmosphere
  let padIndex = 0;
  const padChords = [
    [523, 659, 784], // C major
    [587, 740, 880], // D major
    [659, 831, 988], // E major
    [523, 659, 784], // C major
  ];

  const playPad = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const chord = padChords[padIndex % padChords.length];
    chord.forEach((freq) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(bgmGain!);
      osc.start();
      osc.stop(ctx.currentTime + 0.9);
    });

    padIndex++;
    if (isBgmPlaying) {
      setTimeout(playPad, 880);
    }
  };

  // Start all tracks
  playMelody();
  setTimeout(playBass, 55);
  setTimeout(playDrum, 0);
  setTimeout(playPad, 200);
};

export const stopRunnerBgm = () => {
  isBgmPlaying = false;
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
};

export const playRunnerSound = (type: 'jump' | 'death' | 'score') => {
  const ctx = initRunnerAudio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  gain.connect(ctx.destination);
  osc.connect(gain);

  switch (type) {
    case 'jump':
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
      break;

    case 'death':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
      break;

    case 'score':
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.2);
      break;
  }
};

// TTS countdown
export const speakRunnerCountdown = (onComplete: () => void) => {
  const synth = window.speechSynthesis;

  const speak = (text: string, delay: number) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.2;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;
        utterance.onend = () => resolve();
        synth.speak(utterance);
      }, delay);
    });
  };

  (async () => {
    await speak('3', 0);
    await speak('2', 600);
    await speak('1', 600);
    await speak('GO!', 600);
    onComplete();
  })();
};
