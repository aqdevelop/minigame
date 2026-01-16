// Air Mission Sound System - Military Action BGM

let audioContext: AudioContext | null = null;
let bgmGainNode: GainNode | null = null;
let bgmPlaying = false;
let bgmInterval: ReturnType<typeof setInterval> | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

// Military march / action movie style BGM
export function startBGM(): void {
  if (bgmPlaying) return;

  const ctx = getAudioContext();
  bgmGainNode = ctx.createGain();
  bgmGainNode.gain.value = 0.15;
  bgmGainNode.connect(ctx.destination);

  bgmPlaying = true;

  // Military action melody - heroic and intense
  const melodyNotes = [
    392, 392, 523, 523, 659, 659, 523, 0,   // G G C C E E C -
    587, 587, 523, 523, 440, 440, 392, 0,   // D D C C A A G -
    523, 587, 659, 698, 784, 784, 659, 523, // C D E F G G E C
    587, 523, 440, 392, 440, 523, 392, 0,   // D C A G A C G -
    784, 784, 880, 784, 659, 659, 523, 523, // G G A G E E C C
    587, 659, 587, 523, 440, 392, 440, 0,   // D E D C A G A -
    523, 523, 659, 659, 784, 880, 784, 659, // C C E E G A G E
    523, 587, 523, 440, 392, 392, 392, 0,   // C D C A G G G -
  ];

  // Powerful bass line
  const bassNotes = [
    196, 196, 261, 261, 196, 196, 261, 261, // G G C C
    294, 294, 261, 261, 220, 220, 196, 196, // D D C C A A G G
    261, 261, 294, 294, 392, 392, 330, 261, // C C D D G G E C
    294, 261, 220, 196, 220, 261, 196, 196, // D C A G
    392, 392, 440, 392, 330, 330, 261, 261, // G G A G E E C C
    294, 330, 294, 261, 220, 196, 220, 196, // D E D C
    261, 261, 330, 330, 392, 440, 392, 330, // C C E E G A G E
    261, 294, 261, 220, 196, 196, 196, 196, // C D C A G G G G
  ];

  let noteIndex = 0;
  const tempo = 180; // BPM - fast military march
  const noteInterval = 60000 / tempo;

  bgmInterval = setInterval(() => {
    if (!bgmPlaying || !bgmGainNode) return;

    const ctx = getAudioContext();
    const time = ctx.currentTime;

    // Melody - brass-like sound
    const melodyFreq = melodyNotes[noteIndex % melodyNotes.length];
    if (melodyFreq > 0) {
      const melodyOsc = ctx.createOscillator();
      const melodyGain = ctx.createGain();

      melodyOsc.type = 'sawtooth';
      melodyOsc.frequency.setValueAtTime(melodyFreq, time);

      melodyGain.gain.setValueAtTime(0.25, time);
      melodyGain.gain.exponentialRampToValueAtTime(0.15, time + 0.1);
      melodyGain.gain.exponentialRampToValueAtTime(0.01, time + noteInterval / 1000 * 0.9);

      melodyOsc.connect(melodyGain);
      melodyGain.connect(bgmGainNode);

      melodyOsc.start(time);
      melodyOsc.stop(time + noteInterval / 1000);
    }

    // Bass - powerful low end
    const bassFreq = bassNotes[Math.floor(noteIndex / 2) % bassNotes.length];
    if (bassFreq > 0 && noteIndex % 2 === 0) {
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();

      bassOsc.type = 'square';
      bassOsc.frequency.setValueAtTime(bassFreq / 2, time);

      bassGain.gain.setValueAtTime(0.3, time);
      bassGain.gain.exponentialRampToValueAtTime(0.01, time + noteInterval / 1000 * 1.8);

      bassOsc.connect(bassGain);
      bassGain.connect(bgmGainNode);

      bassOsc.start(time);
      bassOsc.stop(time + noteInterval / 1000 * 2);
    }

    // Military drums
    if (noteIndex % 4 === 0) {
      // Kick drum
      const kickOsc = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(150, time);
      kickOsc.frequency.exponentialRampToValueAtTime(50, time + 0.1);
      kickGain.gain.setValueAtTime(0.5, time);
      kickGain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      kickOsc.connect(kickGain);
      kickGain.connect(bgmGainNode);
      kickOsc.start(time);
      kickOsc.stop(time + 0.15);
    }

    if (noteIndex % 4 === 2) {
      // Snare drum
      const snareOsc = ctx.createOscillator();
      const snareNoise = ctx.createOscillator();
      const snareGain = ctx.createGain();

      snareOsc.type = 'triangle';
      snareOsc.frequency.setValueAtTime(200, time);
      snareNoise.type = 'square';
      snareNoise.frequency.setValueAtTime(300, time);

      snareGain.gain.setValueAtTime(0.3, time);
      snareGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

      snareOsc.connect(snareGain);
      snareNoise.connect(snareGain);
      snareGain.connect(bgmGainNode);

      snareOsc.start(time);
      snareNoise.start(time);
      snareOsc.stop(time + 0.1);
      snareNoise.stop(time + 0.1);
    }

    // Hi-hat on every beat
    const hatOsc = ctx.createOscillator();
    const hatGain = ctx.createGain();
    hatOsc.type = 'square';
    hatOsc.frequency.setValueAtTime(8000, time);
    hatGain.gain.setValueAtTime(0.05, time);
    hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    hatOsc.connect(hatGain);
    hatGain.connect(bgmGainNode);
    hatOsc.start(time);
    hatOsc.stop(time + 0.05);

    noteIndex++;
  }, noteInterval);
}

export function stopBGM(): void {
  bgmPlaying = false;
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (bgmGainNode) {
    bgmGainNode.disconnect();
    bgmGainNode = null;
  }
}

// Sound effects
export function playShootSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(800, time);
  osc.frequency.exponentialRampToValueAtTime(200, time + 0.1);

  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.1);
}

export function playMissileSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Whoosh sound
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(400, time);
  osc.frequency.exponentialRampToValueAtTime(1200, time + 0.3);

  gain.gain.setValueAtTime(0.15, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.3);
}

export function playExplosionSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Low boom
  const boomOsc = ctx.createOscillator();
  const boomGain = ctx.createGain();

  boomOsc.type = 'sine';
  boomOsc.frequency.setValueAtTime(100, time);
  boomOsc.frequency.exponentialRampToValueAtTime(30, time + 0.3);

  boomGain.gain.setValueAtTime(0.5, time);
  boomGain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

  boomOsc.connect(boomGain);
  boomGain.connect(ctx.destination);

  boomOsc.start(time);
  boomOsc.stop(time + 0.3);

  // Noise burst
  const noiseOsc = ctx.createOscillator();
  const noiseGain = ctx.createGain();

  noiseOsc.type = 'square';
  noiseOsc.frequency.setValueAtTime(200, time);
  noiseOsc.frequency.linearRampToValueAtTime(50, time + 0.2);

  noiseGain.gain.setValueAtTime(0.3, time);
  noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

  noiseOsc.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseOsc.start(time);
  noiseOsc.stop(time + 0.2);
}

export function playBossExplosionSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Multiple explosions
  for (let i = 0; i < 5; i++) {
    const delay = i * 0.1;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150 - i * 20, time + delay);
    osc.frequency.exponentialRampToValueAtTime(20, time + delay + 0.4);

    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.4, time + delay);
    gain.gain.exponentialRampToValueAtTime(0.01, time + delay + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time + delay);
    osc.stop(time + delay + 0.4);
  }
}

export function playHitSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(300, time);
  osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.05);
}

export function playMissionStartSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Fanfare
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time + i * 0.15);

    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.2, time + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.15 + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time + i * 0.15);
    osc.stop(time + i * 0.15 + 0.3);
  });
}

export function playMissionCompleteSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Victory fanfare
  const notes = [523, 659, 784, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time + i * 0.2);

    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.25, time + i * 0.2);
    gain.gain.setValueAtTime(0.2, time + i * 0.2 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.2 + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time + i * 0.2);
    osc.stop(time + i * 0.2 + 0.4);
  });
}

export function playGameOverSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  // Sad descending notes
  const notes = [392, 349, 330, 294, 262];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time + i * 0.3);

    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.2, time + i * 0.3);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.3 + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time + i * 0.3);
    osc.stop(time + i * 0.3 + 0.5);
  });
}

export function playFuelWarningSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(880, time + i * 0.2);

    gain.gain.setValueAtTime(0, time);
    gain.gain.setValueAtTime(0.15, time + i * 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.2 + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time + i * 0.2);
    osc.stop(time + i * 0.2 + 0.1);
  }
}

export function playPowerUpSound(): void {
  const ctx = getAudioContext();
  const time = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(400, time);
  osc.frequency.exponentialRampToValueAtTime(1200, time + 0.2);

  gain.gain.setValueAtTime(0.2, time);
  gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + 0.2);
}
