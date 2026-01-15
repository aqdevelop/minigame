// Runner Game Sound System
let audioContext: AudioContext | null = null;
let bgmGain: GainNode | null = null;
let isBgmPlaying = false;

export const initRunnerAudio = () => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
};

// Retro chiptune BGM for runner
export const startRunnerBgm = () => {
  if (isBgmPlaying) return;
  const ctx = initRunnerAudio();

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.08;
  bgmGain.connect(ctx.destination);

  // Fast-paced runner melody
  const melody = [
    523, 659, 784, 659, 523, 659, 784, 880,
    698, 880, 1047, 880, 698, 880, 1047, 784,
    587, 698, 880, 698, 587, 698, 880, 1047,
    784, 659, 523, 659, 784, 880, 784, 659
  ];

  let noteIndex = 0;
  const noteLength = 0.12;

  const playNote = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const osc = ctx.createOscillator();
    const noteGain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = melody[noteIndex % melody.length];

    noteGain.gain.setValueAtTime(0.15, ctx.currentTime);
    noteGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + noteLength * 0.9);

    osc.connect(noteGain);
    noteGain.connect(bgmGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + noteLength);

    noteIndex++;

    if (isBgmPlaying) {
      setTimeout(playNote, noteLength * 1000);
    }
  };

  // Bass line
  const bassNotes = [131, 165, 175, 147];
  let bassIndex = 0;

  const playBass = () => {
    if (!isBgmPlaying || !bgmGain) return;

    const osc = ctx.createOscillator();
    const bassGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.value = bassNotes[bassIndex % bassNotes.length];

    bassGain.gain.setValueAtTime(0.2, ctx.currentTime);
    bassGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc.connect(bassGain);
    bassGain.connect(bgmGain);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);

    bassIndex++;

    if (isBgmPlaying) {
      setTimeout(playBass, 480);
    }
  };

  isBgmPlaying = true;
  playNote();
  playBass();
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

// TTS countdown like racing game
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
