// Racing Game Sound System
let audioContext: AudioContext | null = null;
let bgmOscillator: OscillatorNode | null = null;
let bgmGain: GainNode | null = null;
let isBgmPlaying = false;

export const initRacingAudio = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
};

// Retro racing BGM - upbeat chiptune style
export const startRacingBgm = () => {
  if (isBgmPlaying) return;

  const ctx = initRacingAudio();
  if (!ctx) return;

  isBgmPlaying = true;

  const playBgmLoop = () => {
    if (!isBgmPlaying || !audioContext) return;

    // Racing melody pattern - energetic and fast
    const melody = [
      { freq: 440, dur: 0.1 },   // A
      { freq: 523, dur: 0.1 },   // C
      { freq: 659, dur: 0.1 },   // E
      { freq: 523, dur: 0.1 },   // C
      { freq: 440, dur: 0.1 },   // A
      { freq: 523, dur: 0.1 },   // C
      { freq: 587, dur: 0.2 },   // D
      { freq: 523, dur: 0.1 },   // C
      { freq: 494, dur: 0.1 },   // B
      { freq: 440, dur: 0.1 },   // A
      { freq: 392, dur: 0.1 },   // G
      { freq: 440, dur: 0.2 },   // A
      { freq: 523, dur: 0.1 },   // C
      { freq: 587, dur: 0.1 },   // D
      { freq: 659, dur: 0.2 },   // E
      { freq: 587, dur: 0.1 },   // D
    ];

    let time = audioContext.currentTime;

    melody.forEach(({ freq, dur }) => {
      if (!audioContext || !isBgmPlaying) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();

      osc.type = 'square';
      osc.frequency.value = freq;

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + dur * 0.9);

      osc.connect(gain);
      gain.connect(audioContext.destination);

      osc.start(time);
      osc.stop(time + dur);

      time += dur;
    });

    // Loop the BGM
    setTimeout(playBgmLoop, melody.reduce((acc, n) => acc + n.dur * 1000, 0));
  };

  playBgmLoop();
};

export const stopRacingBgm = () => {
  isBgmPlaying = false;
  if (bgmOscillator) {
    bgmOscillator.stop();
    bgmOscillator = null;
  }
  if (bgmGain) {
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

      // Try to get an English voice
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

  // 3... 2... 1... START!
  speak('3', 0);
  speak('2', 1000);
  speak('1', 2000);
  speak('Start!', 3000, onComplete);
};
