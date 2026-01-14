import { useRef, useEffect, useState } from 'react';
import type { Bullet, Enemy, Player, Plane } from '../../types/game';
import { playSound, startBgm, stopBgm, initAudio } from '../../utils/sound';
import './FighterGame.css';

interface FighterGameProps {
  isPlaying: boolean;
  currentPlane: Plane;
  score: number;
  stage: number;
  wave: number;
  onEnemyKill: () => void;
  onBossKill: () => void;
  onNextWave: () => void;
  onNextStage: () => void;
  onGameOver: () => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 32;
const PLAYER_HEIGHT = 32;
const BULLET_SIZE = 4;
const ENEMY_WIDTH = 56;
const ENEMY_HEIGHT = 56;
const BOSS_WIDTH = 80;
const BOSS_HEIGHT = 60;
const COLLISION_DAMAGE = 20;
const ENEMIES_PER_WAVE = 10;
const WAVES_PER_STAGE = 5;
const INVINCIBILITY_TIME = 1500;
const HEALTHKIT_DROP_CHANCE = 0.4;
const HEALTHKIT_HEAL_AMOUNT = 50;
const HEALTHKIT_SIZE = 16;
const HOMING_MISSILE_INTERVAL = 10000; // 10 seconds
const HOMING_MISSILE_SPEED = 3;
const HOMING_MISSILE_TURN_RATE = 0.03;
const PLAYER_HOMING_INTERVAL = 10000; // 10 seconds
const PLAYER_HOMING_SPEED = 5;
const PLAYER_HOMING_DAMAGE = 50;
const SHIELD_DROP_CHANCE = 0.4;
const SHIELD_DURATION = 5000; // 5 seconds of shield
const SHIELD_SIZE = 18;

interface HomingMissile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

interface PlayerHomingMissile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetId: string | null;
}

interface HealthKit {
  id: string;
  x: number;
  y: number;
}

interface ShieldItem {
  id: string;
  x: number;
  y: number;
}

interface BackgroundDecor {
  id: string;
  type: 'blackhole' | 'planet' | 'spacecity' | 'asteroid' | 'nebula' | 'giantblackhole';
  x: number;
  y: number;
  size: number;
  speed: number;
  color?: string;
  hasRing?: boolean; // For planets
}

// Pixel art drawing helpers
const drawPixelRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
};

const drawPixelPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number, color: string, isEnemy = false) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const u = Math.floor(w / 16); // Smaller unit for more detail

  // Darker shade for depth
  const darkerColor = adjustBrightness(color, -30);
  const lighterColor = adjustBrightness(color, 30);

  if (isEnemy) {
    // Detailed enemy plane (pointing down)
    // Nose
    drawPixelRect(ctx, px + u * 7, py, u * 2, u * 2, color);
    drawPixelRect(ctx, px + u * 6, py + u * 2, u * 4, u * 2, color);
    // Cockpit
    drawPixelRect(ctx, px + u * 6, py + u * 4, u * 4, u * 3, '#1a1a2e');
    drawPixelRect(ctx, px + u * 7, py + u * 4, u * 2, u * 1, '#333355');
    // Body
    drawPixelRect(ctx, px + u * 5, py + u * 7, u * 6, u * 4, color);
    drawPixelRect(ctx, px + u * 4, py + u * 9, u * 8, u * 2, darkerColor);
    // Wings
    drawPixelRect(ctx, px, py + u * 8, u * 5, u * 3, color);
    drawPixelRect(ctx, px + u * 11, py + u * 8, u * 5, u * 3, color);
    drawPixelRect(ctx, px + u * 1, py + u * 9, u * 3, u * 1, darkerColor);
    drawPixelRect(ctx, px + u * 12, py + u * 9, u * 3, u * 1, darkerColor);
    // Tail
    drawPixelRect(ctx, px + u * 6, py + u * 11, u * 4, u * 3, color);
    drawPixelRect(ctx, px + u * 7, py + u * 14, u * 2, u * 2, darkerColor);
    // Engine glow
    drawPixelRect(ctx, px + u * 7, py + u * 14, u * 2, u * 1, '#ff6600');
    drawPixelRect(ctx, px + u * 7, py + u * 15, u * 2, u * 1, '#ffaa00');
  } else {
    // Detailed player plane (pointing up)
    // Nose
    drawPixelRect(ctx, px + u * 7, py, u * 2, u * 2, lighterColor);
    drawPixelRect(ctx, px + u * 6, py + u * 2, u * 4, u * 2, color);
    // Body front
    drawPixelRect(ctx, px + u * 5, py + u * 4, u * 6, u * 3, color);
    // Cockpit
    drawPixelRect(ctx, px + u * 6, py + u * 5, u * 4, u * 3, '#1a3a5c');
    drawPixelRect(ctx, px + u * 7, py + u * 6, u * 2, u * 1, '#66ccff');
    // Body main
    drawPixelRect(ctx, px + u * 5, py + u * 7, u * 6, u * 4, color);
    drawPixelRect(ctx, px + u * 4, py + u * 9, u * 8, u * 2, darkerColor);
    // Wings
    drawPixelRect(ctx, px, py + u * 8, u * 5, u * 3, color);
    drawPixelRect(ctx, px + u * 11, py + u * 8, u * 5, u * 3, color);
    drawPixelRect(ctx, px + u * 1, py + u * 8, u * 3, u * 1, lighterColor);
    drawPixelRect(ctx, px + u * 12, py + u * 8, u * 3, u * 1, lighterColor);
    // Wing tips
    drawPixelRect(ctx, px, py + u * 9, u * 2, u * 2, darkerColor);
    drawPixelRect(ctx, px + u * 14, py + u * 9, u * 2, u * 2, darkerColor);
    // Tail
    drawPixelRect(ctx, px + u * 6, py + u * 11, u * 4, u * 3, color);
    drawPixelRect(ctx, px + u * 7, py + u * 14, u * 2, u * 2, darkerColor);
    // Tail fins
    drawPixelRect(ctx, px + u * 5, py + u * 12, u * 2, u * 2, color);
    drawPixelRect(ctx, px + u * 9, py + u * 12, u * 2, u * 2, color);
    // Engine glow
    drawPixelRect(ctx, px + u * 7, py + u * 14, u * 2, u * 1, '#ff4400');
    drawPixelRect(ctx, px + u * 7, py + u * 15, u * 2, u * 1, '#ffcc00');
  }
};

// Helper to adjust color brightness
const adjustBrightness = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

// Background decoration drawing functions
const drawPixelBlackHole = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) => {
  const u = Math.floor(size / 12);
  const rotation = time * 0.001;

  // Accretion disk - outer ring
  for (let i = 0; i < 8; i++) {
    const angle = rotation + (Math.PI * 2 * i) / 8;
    const rx = x + Math.cos(angle) * size * 0.4;
    const ry = y + Math.sin(angle) * size * 0.15;
    const alpha = 0.3 + Math.sin(time * 0.005 + i) * 0.2;
    ctx.fillStyle = `rgba(255, ${100 + i * 20}, 50, ${alpha})`;
    drawPixelRect(ctx, rx - u, ry - u, u * 2, u * 2, ctx.fillStyle);
  }

  // Event horizon (black center)
  drawPixelRect(ctx, x - u * 3, y - u * 2, u * 6, u * 4, '#000000');
  drawPixelRect(ctx, x - u * 2, y - u * 3, u * 4, u * 6, '#000000');

  // Gravitational lensing effect
  ctx.fillStyle = 'rgba(100, 50, 150, 0.3)';
  drawPixelRect(ctx, x - u * 4, y - u * 1, u * 8, u * 2, ctx.fillStyle);
};

// Giant black hole - much larger and more dramatic
const drawGiantBlackHole = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) => {
  const u = Math.floor(size / 24);
  const rotation = time * 0.0005;

  // Outer gravitational distortion rings
  for (let ring = 0; ring < 3; ring++) {
    const ringRadius = size * (0.8 + ring * 0.15);
    for (let i = 0; i < 16; i++) {
      const angle = rotation * (1 + ring * 0.3) + (Math.PI * 2 * i) / 16;
      const rx = x + Math.cos(angle) * ringRadius * 0.5;
      const ry = y + Math.sin(angle) * ringRadius * 0.2;
      const alpha = 0.15 + Math.sin(time * 0.003 + i + ring) * 0.1;
      const r = 150 + ring * 50;
      const g = 50 + ring * 30;
      ctx.fillStyle = `rgba(${r}, ${g}, 100, ${alpha})`;
      drawPixelRect(ctx, rx - u, ry - u, u * 2, u * 2, ctx.fillStyle);
    }
  }

  // Accretion disk - bright inner ring
  for (let i = 0; i < 24; i++) {
    const angle = rotation * 2 + (Math.PI * 2 * i) / 24;
    const rx = x + Math.cos(angle) * size * 0.35;
    const ry = y + Math.sin(angle) * size * 0.12;
    const alpha = 0.4 + Math.sin(time * 0.008 + i) * 0.2;
    ctx.fillStyle = `rgba(255, ${150 + i * 4}, 50, ${alpha})`;
    drawPixelRect(ctx, rx - u * 1.5, ry - u * 1.5, u * 3, u * 3, ctx.fillStyle);
  }

  // Event horizon (massive black center)
  drawPixelRect(ctx, x - u * 8, y - u * 5, u * 16, u * 10, '#000000');
  drawPixelRect(ctx, x - u * 6, y - u * 7, u * 12, u * 14, '#000000');
  drawPixelRect(ctx, x - u * 10, y - u * 3, u * 20, u * 6, '#000000');

  // Inner void with slight purple haze
  ctx.fillStyle = 'rgba(30, 0, 50, 0.8)';
  drawPixelRect(ctx, x - u * 5, y - u * 4, u * 10, u * 8, ctx.fillStyle);

  // Photon sphere glow
  ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
  drawPixelRect(ctx, x - u * 9, y - u * 1, u * 18, u * 2, ctx.fillStyle);
};

const drawPixelPlanet = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const u = Math.floor(size / 10);
  const dark = adjustBrightness(color, -40);
  const light = adjustBrightness(color, 40);

  // Main sphere
  drawPixelRect(ctx, x - u * 3, y - u * 2, u * 6, u * 4, color);
  drawPixelRect(ctx, x - u * 2, y - u * 3, u * 4, u * 6, color);
  drawPixelRect(ctx, x - u * 4, y - u * 1, u * 8, u * 2, color);

  // Highlight
  drawPixelRect(ctx, x - u * 2, y - u * 2, u * 2, u * 2, light);
  drawPixelRect(ctx, x - u * 1, y - u * 3, u * 1, u * 1, light);

  // Shadow
  drawPixelRect(ctx, x + u * 1, y + u * 1, u * 2, u * 2, dark);
  drawPixelRect(ctx, x + u * 2, y, u * 1, u * 3, dark);

  // Surface features (craters/continents)
  drawPixelRect(ctx, x - u * 1, y, u * 2, u * 1, dark);
  drawPixelRect(ctx, x + u * 1, y - u * 1, u * 1, u * 1, dark);
};

const drawPixelRingedPlanet = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const u = Math.floor(size / 12);

  // Ring (behind planet)
  ctx.fillStyle = 'rgba(200, 180, 150, 0.5)';
  drawPixelRect(ctx, x - u * 6, y - u * 1, u * 3, u * 1, ctx.fillStyle);
  drawPixelRect(ctx, x - u * 5, y, u * 2, u * 1, ctx.fillStyle);

  // Planet
  drawPixelPlanet(ctx, x, y, size * 0.7, color);

  // Ring (in front of planet)
  ctx.fillStyle = 'rgba(200, 180, 150, 0.6)';
  drawPixelRect(ctx, x + u * 3, y, u * 3, u * 1, ctx.fillStyle);
  drawPixelRect(ctx, x + u * 4, y + u * 1, u * 2, u * 1, ctx.fillStyle);
};

const drawPixelSpaceCity = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, time: number) => {
  const u = Math.floor(size / 16);

  // Main structure - ring station
  drawPixelRect(ctx, x - u * 6, y - u * 1, u * 12, u * 2, '#445566');
  drawPixelRect(ctx, x - u * 7, y, u * 14, u * 1, '#334455');

  // Central hub
  drawPixelRect(ctx, x - u * 2, y - u * 3, u * 4, u * 6, '#556677');
  drawPixelRect(ctx, x - u * 1, y - u * 4, u * 2, u * 1, '#667788');

  // Docking arms
  drawPixelRect(ctx, x - u * 5, y - u * 2, u * 2, u * 1, '#445566');
  drawPixelRect(ctx, x + u * 3, y - u * 2, u * 2, u * 1, '#445566');

  // Lights (blinking)
  const blink = Math.floor(time / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = '#ff0000';
    drawPixelRect(ctx, x - u * 6, y - u * 1, u * 1, u * 1, ctx.fillStyle);
    drawPixelRect(ctx, x + u * 5, y - u * 1, u * 1, u * 1, ctx.fillStyle);
  }
  ctx.fillStyle = '#00ffff';
  drawPixelRect(ctx, x, y - u * 4, u * 1, u * 1, ctx.fillStyle);

  // Windows
  ctx.fillStyle = '#aaccff';
  for (let i = 0; i < 4; i++) {
    drawPixelRect(ctx, x - u * 5 + i * u * 3, y, u * 1, u * 1, ctx.fillStyle);
  }
};

const drawPixelAsteroid = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  const u = Math.floor(size / 6);

  drawPixelRect(ctx, x - u * 2, y - u * 1, u * 4, u * 2, '#665544');
  drawPixelRect(ctx, x - u * 1, y - u * 2, u * 2, u * 4, '#554433');
  drawPixelRect(ctx, x - u * 2, y, u * 1, u * 1, '#443322');
  drawPixelRect(ctx, x + u * 1, y - u * 1, u * 1, u * 1, '#776655');
};

const drawPixelNebula = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  const u = Math.floor(size / 8);

  // Cloud layers with transparency
  for (let i = 0; i < 5; i++) {
    const offsetX = (i * 17) % 7 - 3;
    const offsetY = (i * 13) % 5 - 2;
    ctx.fillStyle = color.replace(')', `, ${0.1 + i * 0.05})`).replace('rgb', 'rgba');
    drawPixelRect(ctx, x + offsetX * u - u * 2, y + offsetY * u - u, u * 4, u * 2, ctx.fillStyle);
  }
};

const drawPixelBoss = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number, hpPercent: number) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const u = Math.floor(w / 20); // Smaller unit for more detail

  // Main body
  drawPixelRect(ctx, px + u * 6, py, u * 8, u * 3, '#8B0000');
  drawPixelRect(ctx, px + u * 4, py + u * 3, u * 12, u * 4, '#8B0000');
  drawPixelRect(ctx, px + u * 2, py + u * 7, u * 16, u * 5, '#660000');
  drawPixelRect(ctx, px + u * 3, py + u * 8, u * 14, u * 3, '#8B0000');

  // Cockpit/Bridge
  drawPixelRect(ctx, px + u * 8, py + u * 2, u * 4, u * 3, '#1a1a2e');
  drawPixelRect(ctx, px + u * 9, py + u * 2, u * 2, u * 1, '#333355');

  // Wings - more detailed
  drawPixelRect(ctx, px, py + u * 6, u * 4, u * 6, '#8B0000');
  drawPixelRect(ctx, px + u * 16, py + u * 6, u * 4, u * 6, '#8B0000');
  drawPixelRect(ctx, px, py + u * 8, u * 3, u * 2, '#660000');
  drawPixelRect(ctx, px + u * 17, py + u * 8, u * 3, u * 2, '#660000');

  // Wing cannons
  drawPixelRect(ctx, px + u * 1, py + u * 10, u * 2, u * 4, '#444444');
  drawPixelRect(ctx, px + u * 17, py + u * 10, u * 2, u * 4, '#444444');

  // Tail section
  drawPixelRect(ctx, px + u * 5, py + u * 12, u * 10, u * 3, '#8B0000');
  drawPixelRect(ctx, px + u * 6, py + u * 15, u * 8, u * 2, '#660000');

  // Engines with glow
  drawPixelRect(ctx, px + u * 4, py + u * 14, u * 3, u * 4, '#333333');
  drawPixelRect(ctx, px + u * 8, py + u * 15, u * 4, u * 4, '#333333');
  drawPixelRect(ctx, px + u * 13, py + u * 14, u * 3, u * 4, '#333333');
  // Engine flames
  const flicker = Math.random() > 0.5 ? 1 : 0;
  drawPixelRect(ctx, px + u * 5, py + u * 17 + flicker, u * 1, u * 2, '#ff6600');
  drawPixelRect(ctx, px + u * 9, py + u * 18 + flicker, u * 2, u * 2, '#ff6600');
  drawPixelRect(ctx, px + u * 14, py + u * 17 + flicker, u * 1, u * 2, '#ff6600');

  // Eyes - angry when low HP
  const eyeColor = hpPercent > 0.3 ? '#ffff00' : '#ff0000';
  const eyeGlow = hpPercent > 0.3 ? '#ffaa00' : '#ff6600';
  drawPixelRect(ctx, px + u * 6, py + u * 4, u * 3, u * 2, eyeGlow);
  drawPixelRect(ctx, px + u * 11, py + u * 4, u * 3, u * 2, eyeGlow);
  drawPixelRect(ctx, px + u * 7, py + u * 4, u * 1, u * 1, eyeColor);
  drawPixelRect(ctx, px + u * 12, py + u * 4, u * 1, u * 1, eyeColor);

  // Armor details
  drawPixelRect(ctx, px + u * 5, py + u * 9, u * 2, u * 1, '#aa0000');
  drawPixelRect(ctx, px + u * 13, py + u * 9, u * 2, u * 1, '#aa0000');
};

export const FighterGame = ({
  isPlaying,
  currentPlane,
  stage,
  wave,
  onEnemyKill,
  onBossKill,
  onNextWave,
  onNextStage,
  onGameOver,
}: FighterGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const gameStateRef = useRef({
    player: {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - 40,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      hp: 100,
      maxHp: 100,
      invincible: 0,
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    enemyBullets: [] as Bullet[],
    lastShot: 0,
    lastEnemySpawn: 0,
    lastEnemyShoot: 0,
    gameOver: false,
    enemiesKilledInWave: 0,
    bossActive: false,
    waveComplete: false,
    waveTransition: 0,
    particles: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
    healthkits: [] as HealthKit[],
    homingMissiles: [] as HomingMissile[],
    lastHomingMissile: 0,
    playerHomingMissiles: [] as PlayerHomingMissile[],
    lastPlayerHoming: 0,
    shields: [] as ShieldItem[],
    playerShieldActive: 0, // timestamp when shield expires
    backgroundDecors: [] as BackgroundDecor[],
    gameStartTime: Date.now(),
    lastDecorSpawn: 0,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | undefined>(undefined);
  const isPlayingRef = useRef(isPlaying);
  const currentPlaneRef = useRef(currentPlane);
  const stageRef = useRef(stage);
  const waveRef = useRef(wave);

  // Keep refs in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentPlaneRef.current = currentPlane;
    stageRef.current = stage;
    waveRef.current = wave;
    isPausedRef.current = isPaused;
  }, [isPlaying, currentPlane, stage, wave, isPaused]);

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // BGM control
  useEffect(() => {
    if (isPlaying) {
      startBgm();
    } else {
      stopBgm();
    }
    return () => stopBgm();
  }, [isPlaying]);

  // Reset game state
  useEffect(() => {
    if (isPlaying) {
      setIsPaused(false); // Reset pause state when game starts
      gameStateRef.current = {
        player: {
          x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
          y: CANVAS_HEIGHT - PLAYER_HEIGHT - 40,
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          hp: 100,
          maxHp: 100,
          invincible: 0,
        },
        bullets: [],
        enemies: [],
        enemyBullets: [],
        lastShot: 0,
        lastEnemySpawn: 0,
        lastEnemyShoot: 0,
        gameOver: false,
        enemiesKilledInWave: 0,
        bossActive: false,
        waveComplete: false,
        waveTransition: 0,
        particles: [],
        healthkits: [],
        homingMissiles: [],
        lastHomingMissile: 0,
        playerHomingMissiles: [],
        lastPlayerHoming: 0,
        shields: [],
        playerShieldActive: 0,
        backgroundDecors: [],
        gameStartTime: Date.now(),
        lastDecorSpawn: 0,
      };
    }
  }, [isPlaying]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
      // Pause toggle with Escape or P
      if ((key === 'escape' || key === 'p') && isPlayingRef.current && !gameStateRef.current.gameOver) {
        setIsPaused(prev => !prev);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const spawnExplosion = (x: number, y: number, color: string) => {
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        gameStateRef.current.particles.push({
          x,
          y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 20,
          color,
        });
      }
    };

    const gameLoop = () => {
      const state = gameStateRef.current;
      const plane = currentPlaneRef.current;
      const currentStage = stageRef.current;
      const currentWave = waveRef.current;
      const now = Date.now();
      const isBossWave = currentWave >= WAVES_PER_STAGE;

      if (isPlayingRef.current && !state.gameOver && !isPausedRef.current) {
        // Wave transition
        if (state.waveTransition > 0) {
          state.waveTransition--;
          if (state.waveTransition === 0) {
            state.waveComplete = false;
          }
        }

        // Player movement
        const keys = keysRef.current;
        const speed = plane.speed;
        const isInvincible = now < (state.player.invincible || 0);
        const hasShield = now < (state.playerShieldActive || 0);
        // Shield now only reduces damage by 50%, not full immunity
        const damageMultiplier = hasShield ? 0.5 : 1.0;

        if (keys.has('arrowleft') || keys.has('a')) state.player.x -= speed;
        if (keys.has('arrowright') || keys.has('d')) state.player.x += speed;
        if (keys.has('arrowup') || keys.has('w')) state.player.y -= speed;
        if (keys.has('arrowdown') || keys.has('s')) state.player.y += speed;

        state.player.x = Math.max(0, Math.min(CANVAS_WIDTH - state.player.width, state.player.x));
        state.player.y = Math.max(0, Math.min(CANVAS_HEIGHT - state.player.height, state.player.y));

        // Auto-fire
        const fireInterval = 1000 / plane.fireRate;
        if (now - state.lastShot > fireInterval && state.waveTransition === 0) {
          state.lastShot = now;
          state.bullets.push({
            id: `bullet-${now}`,
            x: state.player.x + state.player.width / 2,
            y: state.player.y,
            damage: plane.damage,
            isEnemy: false,
          });
          playSound('shoot');
        }

        // Spawn enemies / boss
        if (!state.waveComplete && state.waveTransition === 0) {
          if (isBossWave && !state.bossActive && state.enemies.length === 0) {
            // Spawn boss
            const bossHp = 200 * currentStage;
            state.enemies.push({
              id: `boss-${now}`,
              x: CANVAS_WIDTH / 2 - BOSS_WIDTH / 2,
              y: -BOSS_HEIGHT,
              hp: bossHp,
              maxHp: bossHp,
              speed: 0.5,
              width: BOSS_WIDTH,
              height: BOSS_HEIGHT,
              isBoss: true,
            });
            state.bossActive = true;
            playSound('boss');
          } else if (!isBossWave && state.enemiesKilledInWave < ENEMIES_PER_WAVE) {
            const spawnInterval = Math.max(800, 1500 - currentStage * 100 - currentWave * 50);
            if (now - state.lastEnemySpawn > spawnInterval && state.enemies.length < 6) {
              state.lastEnemySpawn = now;
              const enemyHp = (30 + currentStage * 10 + currentWave * 4); // 2x HP
              state.enemies.push({
                id: `enemy-${now}-${Math.random()}`,
                x: Math.random() * (CANVAS_WIDTH - ENEMY_WIDTH),
                y: -ENEMY_HEIGHT,
                hp: enemyHp,
                maxHp: enemyHp,
                speed: 0.5 + Math.random() * 0.7 + currentStage * 0.1,
                width: ENEMY_WIDTH,
                height: ENEMY_HEIGHT,
              });
            }
          }
        }

        // Enemy shooting
        if (now - state.lastEnemyShoot > 800) {
          state.lastEnemyShoot = now;
          state.enemies.forEach((enemy) => {
            const shootChance = enemy.isBoss ? 0.8 : 0.25;
            if (Math.random() < shootChance) {
              if (enemy.isBoss) {
                // Boss shoots 3 bullets
                for (let i = -1; i <= 1; i++) {
                  state.enemyBullets.push({
                    id: `ebullet-${now}-${Math.random()}`,
                    x: enemy.x + enemy.width / 2 + i * 20,
                    y: enemy.y + enemy.height,
                    damage: 15,
                    isEnemy: true,
                  });
                }
              } else {
                state.enemyBullets.push({
                  id: `ebullet-${now}-${Math.random()}`,
                  x: enemy.x + enemy.width / 2,
                  y: enemy.y + enemy.height,
                  damage: 10,
                  isEnemy: true,
                });
              }
            }
          });
        }

        // Homing missiles - every 10 seconds
        if (now - state.lastHomingMissile > HOMING_MISSILE_INTERVAL && state.enemies.length > 0) {
          state.lastHomingMissile = now;
          // Random enemy fires homing missile
          const shooter = state.enemies[Math.floor(Math.random() * state.enemies.length)];
          const dx = state.player.x + state.player.width / 2 - (shooter.x + shooter.width / 2);
          const dy = state.player.y + state.player.height / 2 - (shooter.y + shooter.height);
          const dist = Math.sqrt(dx * dx + dy * dy);
          state.homingMissiles.push({
            id: `homing-${now}`,
            x: shooter.x + shooter.width / 2,
            y: shooter.y + shooter.height,
            vx: (dx / dist) * HOMING_MISSILE_SPEED,
            vy: (dy / dist) * HOMING_MISSILE_SPEED,
            damage: 25,
          });
          playSound('boss'); // Warning sound
        }

        // Player homing missiles - every 10 seconds
        if (now - state.lastPlayerHoming > PLAYER_HOMING_INTERVAL && state.enemies.length > 0) {
          state.lastPlayerHoming = now;
          // Find nearest enemy
          let nearestEnemy = state.enemies[0];
          let nearestDist = Infinity;
          state.enemies.forEach((enemy) => {
            const dx = enemy.x + enemy.width / 2 - (state.player.x + state.player.width / 2);
            const dy = enemy.y + enemy.height / 2 - (state.player.y);
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearestEnemy = enemy;
            }
          });

          const dx = nearestEnemy.x + nearestEnemy.width / 2 - (state.player.x + state.player.width / 2);
          const dy = nearestEnemy.y + nearestEnemy.height / 2 - state.player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          state.playerHomingMissiles.push({
            id: `phoming-${now}`,
            x: state.player.x + state.player.width / 2,
            y: state.player.y,
            vx: (dx / dist) * PLAYER_HOMING_SPEED,
            vy: (dy / dist) * PLAYER_HOMING_SPEED,
            targetId: nearestEnemy.id,
          });
          playSound('powerup');
        }

        // Move bullets
        state.bullets = state.bullets
          .map((b) => ({ ...b, y: b.y - 12 }))
          .filter((b) => b.y > -BULLET_SIZE);

        state.enemyBullets = state.enemyBullets
          .map((b) => ({ ...b, y: b.y + 6 }))
          .filter((b) => b.y < CANVAS_HEIGHT + BULLET_SIZE);

        // Move enemies
        state.enemies = state.enemies.map((e) => {
          if (e.isBoss) {
            // Boss moves slowly and stops
            if (e.y < 30) {
              return { ...e, y: e.y + e.speed };
            }
            return e;
          }
          return { ...e, y: e.y + e.speed };
        }).filter((e) => e.y < CANVAS_HEIGHT + (e.isBoss ? BOSS_HEIGHT : ENEMY_HEIGHT));

        // Update particles
        state.particles = state.particles
          .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, life: p.life - 1 }))
          .filter((p) => p.life > 0);

        // Background decorations based on survival time
        const survivalTime = now - state.gameStartTime;
        const decorSpawnInterval = 8000; // New decoration every 8 seconds

        if (now - state.lastDecorSpawn > decorSpawnInterval) {
          state.lastDecorSpawn = now;

          // Determine what type of decoration to spawn based on survival time
          let decorType: BackgroundDecor['type'] = 'asteroid';
          let decorColor = '#886655';
          const decorSize = 20 + Math.random() * 30;

          if (survivalTime > 180000) { // 3+ minutes: Space cities + Giant black holes
            const roll = Math.random();
            if (roll < 0.1) {
              decorType = 'giantblackhole';
            } else if (roll < 0.25) {
              decorType = 'spacecity';
            } else if (roll < 0.4) {
              decorType = 'blackhole';
            } else if (roll < 0.7) {
              decorType = 'planet';
              decorColor = ['#cc8866', '#66aacc', '#88cc66', '#cc6688'][Math.floor(Math.random() * 4)];
            } else {
              decorType = 'nebula';
              decorColor = 'rgb(150, 100, 200)';
            }
          } else if (survivalTime > 90000) { // 1.5+ minutes: Black holes appear
            const roll = Math.random();
            if (roll < 0.25) {
              decorType = 'blackhole';
            } else if (roll < 0.6) {
              decorType = 'planet';
              decorColor = ['#cc8866', '#66aacc', '#88cc66'][Math.floor(Math.random() * 3)];
            } else {
              decorType = 'asteroid';
            }
          } else if (survivalTime > 30000) { // 30+ seconds: Planets appear
            const roll = Math.random();
            if (roll < 0.4) {
              decorType = 'planet';
              decorColor = ['#cc8866', '#66aacc', '#88cc66'][Math.floor(Math.random() * 3)];
            } else {
              decorType = 'asteroid';
            }
          }

          // Giant black holes are much larger
          const finalSize = decorType === 'giantblackhole' ? 120 + Math.random() * 80 : decorSize;
          const finalSpeed = decorType === 'giantblackhole' ? 0.15 + Math.random() * 0.1 : 0.3 + Math.random() * 0.3;

          state.backgroundDecors.push({
            id: `decor-${now}-${Math.random()}`,
            type: decorType,
            x: decorType === 'giantblackhole' ? CANVAS_WIDTH / 2 : Math.random() * CANVAS_WIDTH,
            y: -finalSize,
            size: finalSize,
            speed: finalSpeed,
            color: decorColor,
            hasRing: decorType === 'planet' && Math.random() > 0.6,
          });
        }

        // Move background decorations
        state.backgroundDecors = state.backgroundDecors
          .map((d) => ({ ...d, y: d.y + d.speed }))
          .filter((d) => d.y < CANVAS_HEIGHT + d.size);

        // Move and track homing missiles
        state.homingMissiles = state.homingMissiles
          .map((m) => {
            // Calculate direction to player
            const targetX = state.player.x + state.player.width / 2;
            const targetY = state.player.y + state.player.height / 2;
            const dx = targetX - m.x;
            const dy = targetY - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Desired velocity
            const desiredVx = (dx / dist) * HOMING_MISSILE_SPEED;
            const desiredVy = (dy / dist) * HOMING_MISSILE_SPEED;

            // Gradually turn towards target
            const newVx = m.vx + (desiredVx - m.vx) * HOMING_MISSILE_TURN_RATE;
            const newVy = m.vy + (desiredVy - m.vy) * HOMING_MISSILE_TURN_RATE;

            // Normalize speed
            const speed = Math.sqrt(newVx * newVx + newVy * newVy);
            const normalizedVx = (newVx / speed) * HOMING_MISSILE_SPEED;
            const normalizedVy = (newVy / speed) * HOMING_MISSILE_SPEED;

            return {
              ...m,
              x: m.x + normalizedVx,
              y: m.y + normalizedVy,
              vx: normalizedVx,
              vy: normalizedVy,
            };
          })
          .filter((m) => m.x > -20 && m.x < CANVAS_WIDTH + 20 && m.y > -20 && m.y < CANVAS_HEIGHT + 20);

        // Move and track player homing missiles
        state.playerHomingMissiles = state.playerHomingMissiles
          .map((m) => {
            // Find target enemy or nearest enemy
            let target = state.enemies.find(e => e.id === m.targetId);
            if (!target && state.enemies.length > 0) {
              // Find new target
              target = state.enemies[0];
              let nearestDist = Infinity;
              state.enemies.forEach((enemy) => {
                const dx = enemy.x + enemy.width / 2 - m.x;
                const dy = enemy.y + enemy.height / 2 - m.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < nearestDist) {
                  nearestDist = dist;
                  target = enemy;
                }
              });
            }

            if (target) {
              const targetX = target.x + target.width / 2;
              const targetY = target.y + target.height / 2;
              const dx = targetX - m.x;
              const dy = targetY - m.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              const desiredVx = (dx / dist) * PLAYER_HOMING_SPEED;
              const desiredVy = (dy / dist) * PLAYER_HOMING_SPEED;

              const newVx = m.vx + (desiredVx - m.vx) * 0.05;
              const newVy = m.vy + (desiredVy - m.vy) * 0.05;

              const speed = Math.sqrt(newVx * newVx + newVy * newVy);
              const normalizedVx = (newVx / speed) * PLAYER_HOMING_SPEED;
              const normalizedVy = (newVy / speed) * PLAYER_HOMING_SPEED;

              return {
                ...m,
                x: m.x + normalizedVx,
                y: m.y + normalizedVy,
                vx: normalizedVx,
                vy: normalizedVy,
                targetId: target.id,
              };
            }

            // No target, just move straight
            return {
              ...m,
              x: m.x + m.vx,
              y: m.y + m.vy,
            };
          })
          .filter((m) => m.x > -20 && m.x < CANVAS_WIDTH + 20 && m.y > -20 && m.y < CANVAS_HEIGHT + 20);

        // Move healthkits
        state.healthkits = state.healthkits
          .map((h) => ({ ...h, y: h.y + 1.5 }))
          .filter((h) => h.y < CANVAS_HEIGHT + HEALTHKIT_SIZE);

        // Move shields
        state.shields = state.shields
          .map((s) => ({ ...s, y: s.y + 1.5 }))
          .filter((s) => s.y < CANVAS_HEIGHT + SHIELD_SIZE);

        // Collision: player vs healthkits
        const remainingHealthkits: HealthKit[] = [];
        state.healthkits.forEach((healthkit) => {
          if (
            healthkit.x < state.player.x + state.player.width &&
            healthkit.x + HEALTHKIT_SIZE > state.player.x &&
            healthkit.y < state.player.y + state.player.height &&
            healthkit.y + HEALTHKIT_SIZE > state.player.y
          ) {
            // Heal player
            state.player.hp = Math.min(state.player.maxHp, state.player.hp + HEALTHKIT_HEAL_AMOUNT);
            playSound('powerup');
          } else {
            remainingHealthkits.push(healthkit);
          }
        });
        state.healthkits = remainingHealthkits;

        // Collision: player vs shields
        const remainingShields: ShieldItem[] = [];
        state.shields.forEach((shield) => {
          if (
            shield.x < state.player.x + state.player.width &&
            shield.x + SHIELD_SIZE > state.player.x &&
            shield.y < state.player.y + state.player.height &&
            shield.y + SHIELD_SIZE > state.player.y
          ) {
            // Activate shield
            state.playerShieldActive = now + SHIELD_DURATION;
            playSound('powerup');
          } else {
            remainingShields.push(shield);
          }
        });
        state.shields = remainingShields;

        // Collision: bullets vs enemies
        const remainingBullets: Bullet[] = [];
        state.bullets.forEach((bullet) => {
          let hit = false;
          state.enemies.forEach((enemy) => {
            if (
              !hit &&
              bullet.x > enemy.x &&
              bullet.x < enemy.x + enemy.width &&
              bullet.y > enemy.y &&
              bullet.y < enemy.y + enemy.height
            ) {
              hit = true;
              enemy.hp -= bullet.damage;
              playSound('hit');

              if (enemy.hp <= 0) {
                spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.isBoss ? '#ff0000' : '#ffaa00');
                playSound('explosion');

                if (enemy.isBoss) {
                  onBossKill();
                  state.bossActive = false;
                  state.waveComplete = true;
                  state.waveTransition = 120;
                  onNextStage();
                  playSound('powerup');
                } else {
                  // Drop healthkit with 40% chance
                  if (Math.random() < HEALTHKIT_DROP_CHANCE) {
                    state.healthkits.push({
                      id: `healthkit-${now}-${Math.random()}`,
                      x: enemy.x + enemy.width / 2 - HEALTHKIT_SIZE / 2,
                      y: enemy.y + enemy.height / 2,
                    });
                  }
                  // Drop shield with 40% chance (separate roll)
                  if (Math.random() < SHIELD_DROP_CHANCE) {
                    state.shields.push({
                      id: `shield-${now}-${Math.random()}`,
                      x: enemy.x + enemy.width / 2 - SHIELD_SIZE / 2,
                      y: enemy.y + enemy.height / 2,
                    });
                  }
                  onEnemyKill();
                  state.enemiesKilledInWave++;

                  if (state.enemiesKilledInWave >= ENEMIES_PER_WAVE) {
                    state.waveComplete = true;
                    state.waveTransition = 60;
                    state.enemiesKilledInWave = 0;
                    onNextWave();
                    playSound('wave');
                  }
                }
              }
            }
          });
          if (!hit) remainingBullets.push(bullet);
        });
        state.bullets = remainingBullets;
        state.enemies = state.enemies.filter((e) => e.hp > 0);

        // Collision: player homing missiles vs enemies
        const remainingPlayerMissiles: PlayerHomingMissile[] = [];
        state.playerHomingMissiles.forEach((missile) => {
          let hit = false;
          const missileSize = 12;
          state.enemies.forEach((enemy) => {
            if (
              !hit &&
              missile.x - missileSize / 2 < enemy.x + enemy.width &&
              missile.x + missileSize / 2 > enemy.x &&
              missile.y - missileSize / 2 < enemy.y + enemy.height &&
              missile.y + missileSize / 2 > enemy.y
            ) {
              hit = true;
              enemy.hp -= PLAYER_HOMING_DAMAGE;
              spawnExplosion(missile.x, missile.y, '#00ff00');
              playSound('hit');

              if (enemy.hp <= 0) {
                spawnExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.isBoss ? '#ff0000' : '#ffaa00');
                playSound('explosion');

                if (enemy.isBoss) {
                  onBossKill();
                  state.bossActive = false;
                  state.waveComplete = true;
                  state.waveTransition = 120;
                  onNextStage();
                  playSound('powerup');
                } else {
                  if (Math.random() < HEALTHKIT_DROP_CHANCE) {
                    state.healthkits.push({
                      id: `healthkit-${now}-${Math.random()}`,
                      x: enemy.x + enemy.width / 2 - HEALTHKIT_SIZE / 2,
                      y: enemy.y + enemy.height / 2,
                    });
                  }
                  if (Math.random() < SHIELD_DROP_CHANCE) {
                    state.shields.push({
                      id: `shield-${now}-${Math.random()}`,
                      x: enemy.x + enemy.width / 2 - SHIELD_SIZE / 2,
                      y: enemy.y + enemy.height / 2,
                    });
                  }
                  onEnemyKill();
                  state.enemiesKilledInWave++;

                  if (state.enemiesKilledInWave >= ENEMIES_PER_WAVE) {
                    state.waveComplete = true;
                    state.waveTransition = 60;
                    state.enemiesKilledInWave = 0;
                    onNextWave();
                    playSound('wave');
                  }
                }
              }
            }
          });
          if (!hit) remainingPlayerMissiles.push(missile);
        });
        state.playerHomingMissiles = remainingPlayerMissiles;
        state.enemies = state.enemies.filter((e) => e.hp > 0);

        // Collision: enemy bullets vs player
        if (!isInvincible) {
          const remainingEnemyBullets: Bullet[] = [];
          state.enemyBullets.forEach((bullet) => {
            if (
              bullet.x > state.player.x &&
              bullet.x < state.player.x + state.player.width &&
              bullet.y > state.player.y &&
              bullet.y < state.player.y + state.player.height
            ) {
              // Shield absorbs 50% damage
              state.player.hp -= Math.floor(bullet.damage * damageMultiplier);
              state.player.invincible = now + INVINCIBILITY_TIME;
              playSound('damage');

              if (state.player.hp <= 0) {
                state.gameOver = true;
                spawnExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#00ffff');
                playSound('explosion');
                onGameOver();
              }
            } else {
              remainingEnemyBullets.push(bullet);
            }
          });
          state.enemyBullets = remainingEnemyBullets;

          // Collision: homing missiles vs player
          const remainingMissiles: HomingMissile[] = [];
          state.homingMissiles.forEach((missile) => {
            const missileSize = 10;
            if (
              missile.x - missileSize / 2 < state.player.x + state.player.width &&
              missile.x + missileSize / 2 > state.player.x &&
              missile.y - missileSize / 2 < state.player.y + state.player.height &&
              missile.y + missileSize / 2 > state.player.y
            ) {
              // Shield absorbs 50% damage
              state.player.hp -= Math.floor(missile.damage * damageMultiplier);
              state.player.invincible = now + INVINCIBILITY_TIME;
              spawnExplosion(missile.x, missile.y, '#ff00ff');
              playSound('explosion');

              if (state.player.hp <= 0) {
                state.gameOver = true;
                spawnExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#00ffff');
                onGameOver();
              }
            } else {
              remainingMissiles.push(missile);
            }
          });
          state.homingMissiles = remainingMissiles;
        }

        // Collision: enemies vs player (damage instead of instant death)
        if (!isInvincible) {
          state.enemies.forEach((enemy) => {
            if (
              enemy.x < state.player.x + state.player.width &&
              enemy.x + enemy.width > state.player.x &&
              enemy.y < state.player.y + state.player.height &&
              enemy.y + enemy.height > state.player.y
            ) {
              // Shield absorbs 50% damage
              state.player.hp -= Math.floor(COLLISION_DAMAGE * damageMultiplier);
              state.player.invincible = now + INVINCIBILITY_TIME;
              playSound('damage');

              if (state.player.hp <= 0) {
                state.gameOver = true;
                spawnExplosion(state.player.x + state.player.width / 2, state.player.y + state.player.height / 2, '#00ffff');
                playSound('explosion');
                onGameOver();
              }
            }
          });
        }
      }

      // === DRAW ===
      // Background - space with stars
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Animated stars
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 60; i++) {
        const x = (i * 67) % CANVAS_WIDTH;
        const y = ((i * 43) + now * 0.03 * (1 + (i % 3))) % CANVAS_HEIGHT;
        const size = (i % 3) === 0 ? 2 : 1;
        ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
      }

      // Draw background decorations (non-attackable, just visuals)
      state.backgroundDecors.forEach((decor) => {
        switch (decor.type) {
          case 'blackhole':
            drawPixelBlackHole(ctx, decor.x, decor.y, decor.size, now);
            break;
          case 'planet':
            if (decor.hasRing) {
              drawPixelRingedPlanet(ctx, decor.x, decor.y, decor.size, decor.color || '#cc8866');
            } else {
              drawPixelPlanet(ctx, decor.x, decor.y, decor.size, decor.color || '#cc8866');
            }
            break;
          case 'spacecity':
            drawPixelSpaceCity(ctx, decor.x, decor.y, decor.size, now);
            break;
          case 'asteroid':
            drawPixelAsteroid(ctx, decor.x, decor.y, decor.size);
            break;
          case 'nebula':
            drawPixelNebula(ctx, decor.x, decor.y, decor.size, decor.color || 'rgb(150, 100, 200)');
            break;
          case 'giantblackhole':
            drawGiantBlackHole(ctx, decor.x, decor.y, decor.size, now);
            break;
        }
      });

      // Draw particles
      state.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 4, 4);
      });

      // Draw player
      const isInvincible = now < (state.player.invincible || 0);
      const hasShield = now < (state.playerShieldActive || 0);
      if (!isInvincible || Math.floor(now / 100) % 2 === 0) {
        drawPixelPlane(ctx, state.player.x, state.player.y, state.player.width, state.player.height, currentPlaneRef.current.color);
      }

      // Draw shield effect around player
      if (hasShield) {
        const centerX = state.player.x + state.player.width / 2;
        const centerY = state.player.y + state.player.height / 2;
        const shieldRadius = Math.max(state.player.width, state.player.height) * 0.8;
        const pulse = Math.sin(now / 100) * 0.2 + 0.8;

        // Outer glow
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.3 * pulse})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius + 4, 0, Math.PI * 2);
        ctx.stroke();

        // Inner shield
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.7 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, shieldRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Shield timer bar
        const remaining = state.playerShieldActive - now;
        const percent = remaining / SHIELD_DURATION;
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(state.player.x, state.player.y - 10, state.player.width * percent, 3);
      }

      // Draw player bullets
      ctx.fillStyle = '#ffff00';
      state.bullets.forEach((bullet) => {
        ctx.fillRect(Math.floor(bullet.x) - 2, Math.floor(bullet.y), 4, 8);
      });

      // Draw enemies
      state.enemies.forEach((enemy) => {
        if (enemy.isBoss) {
          drawPixelBoss(ctx, enemy.x, enemy.y, enemy.width, enemy.height, enemy.hp / enemy.maxHp);
          // Boss HP bar
          const barWidth = 100;
          const barX = CANVAS_WIDTH / 2 - barWidth / 2;
          ctx.fillStyle = '#333';
          ctx.fillRect(barX, 10, barWidth, 8);
          ctx.fillStyle = enemy.hp / enemy.maxHp > 0.3 ? '#ff0000' : '#ff6600';
          ctx.fillRect(barX, 10, barWidth * (enemy.hp / enemy.maxHp), 8);
          // Boss label
          ctx.fillStyle = '#fff';
          ctx.font = '8px monospace';
          ctx.fillText('BOSS', barX + barWidth / 2 - 12, 8);
        } else {
          drawPixelPlane(ctx, enemy.x, enemy.y, enemy.width, enemy.height, '#ff4444', true);
          // Enemy HP bar
          const hpPercent = enemy.hp / enemy.maxHp;
          ctx.fillStyle = '#333';
          ctx.fillRect(Math.floor(enemy.x), Math.floor(enemy.y) - 6, enemy.width, 3);
          ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
          ctx.fillRect(Math.floor(enemy.x), Math.floor(enemy.y) - 6, Math.floor(enemy.width * hpPercent), 3);
        }
      });

      // Draw enemy bullets
      ctx.fillStyle = '#ff6666';
      state.enemyBullets.forEach((bullet) => {
        ctx.fillRect(Math.floor(bullet.x) - 2, Math.floor(bullet.y), 4, 6);
      });

      // Draw homing missiles (purple diamond shape with trail)
      state.homingMissiles.forEach((missile) => {
        const mx = Math.floor(missile.x);
        const my = Math.floor(missile.y);

        // Trail effect
        ctx.fillStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.fillRect(mx - missile.vx * 3 - 3, my - missile.vy * 3 - 3, 6, 6);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
        ctx.fillRect(mx - missile.vx * 1.5 - 2, my - missile.vy * 1.5 - 2, 4, 4);

        // Missile body (diamond shape)
        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(mx, my - 6);
        ctx.lineTo(mx + 4, my);
        ctx.lineTo(mx, my + 6);
        ctx.lineTo(mx - 4, my);
        ctx.closePath();
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 1, my - 1, 2, 2);
      });

      // Draw player homing missiles (green diamond shape with trail)
      state.playerHomingMissiles.forEach((missile) => {
        const mx = Math.floor(missile.x);
        const my = Math.floor(missile.y);

        // Trail effect (green)
        ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
        ctx.fillRect(mx - missile.vx * 2 - 3, my - missile.vy * 2 - 3, 6, 6);
        ctx.fillStyle = 'rgba(0, 255, 100, 0.5)';
        ctx.fillRect(mx - missile.vx - 2, my - missile.vy - 2, 4, 4);

        // Missile body (diamond shape)
        ctx.fillStyle = '#00ff66';
        ctx.beginPath();
        ctx.moveTo(mx, my - 8);
        ctx.lineTo(mx + 5, my);
        ctx.lineTo(mx, my + 8);
        ctx.lineTo(mx - 5, my);
        ctx.closePath();
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(mx - 1, my - 1, 3, 3);
      });

      // Draw healthkits (pixel cross/medkit style)
      state.healthkits.forEach((healthkit) => {
        const hx = Math.floor(healthkit.x);
        const hy = Math.floor(healthkit.y);
        // White box
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx, hy, HEALTHKIT_SIZE, HEALTHKIT_SIZE);
        // Red cross
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(hx + 6, hy + 2, 4, 12);  // Vertical
        ctx.fillRect(hx + 2, hy + 6, 12, 4);  // Horizontal
      });

      // Draw shield items (cyan hexagon style)
      state.shields.forEach((shield) => {
        const sx = Math.floor(shield.x) + SHIELD_SIZE / 2;
        const sy = Math.floor(shield.y) + SHIELD_SIZE / 2;
        // Outer glow
        ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(sx, sy, SHIELD_SIZE / 2 + 4, 0, Math.PI * 2);
        ctx.fill();
        // Shield shape (hexagon)
        ctx.fillStyle = '#00ffff';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 2;
          const px = sx + Math.cos(angle) * (SHIELD_SIZE / 2);
          const py = sy + Math.sin(angle) * (SHIELD_SIZE / 2);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Inner highlight
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx - 2, sy - 2, 4, 4);
      });

      // Player HP bar (pixel style)
      const hpBarWidth = 80;
      const hpPercent = Math.max(0, state.player.hp) / state.player.maxHp;
      ctx.fillStyle = '#222';
      ctx.fillRect(8, CANVAS_HEIGHT - 20, hpBarWidth + 4, 12);
      ctx.fillStyle = '#444';
      ctx.fillRect(10, CANVAS_HEIGHT - 18, hpBarWidth, 8);
      ctx.fillStyle = hpPercent > 0.5 ? '#00ff00' : hpPercent > 0.25 ? '#ffff00' : '#ff0000';
      ctx.fillRect(10, CANVAS_HEIGHT - 18, Math.floor(hpBarWidth * hpPercent), 8);
      ctx.fillStyle = '#fff';
      ctx.font = '8px monospace';
      ctx.fillText(`HP:${Math.max(0, state.player.hp)}`, 12, CANVAS_HEIGHT - 11);

      // Wave/Stage display
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.fillText(`STAGE ${stageRef.current}`, CANVAS_WIDTH - 70, 20);
      ctx.fillText(`WAVE ${Math.min(waveRef.current, WAVES_PER_STAGE)}/${WAVES_PER_STAGE}`, CANVAS_WIDTH - 70, 32);

      // Wave transition message
      if (state.waveTransition > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, CANVAS_HEIGHT / 2 - 30, CANVAS_WIDTH, 60);
        ctx.fillStyle = '#ffff00';
        ctx.font = '16px monospace';
        const message = waveRef.current > WAVES_PER_STAGE ? `STAGE ${stageRef.current} CLEAR!` : `WAVE ${waveRef.current}`;
        ctx.fillText(message, CANVAS_WIDTH / 2 - message.length * 4, CANVAS_HEIGHT / 2 + 6);
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onEnemyKill, onBossKill, onNextWave, onNextStage, onGameOver]);

  const togglePause = () => {
    if (isPlaying && !gameStateRef.current.gameOver) {
      setIsPaused(prev => !prev);
    }
  };

  return (
    <div className="fighter-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas pixel-canvas"
      />
      {/* Pause Button */}
      {isPlaying && !gameStateRef.current.gameOver && (
        <button
          className="pause-button pixel-button"
          onClick={togglePause}
          title="Pause (P or ESC)"
        >
          {isPaused ? '▶' : '❚❚'}
        </button>
      )}
      {/* Pause Overlay */}
      {isPaused && (
        <div className="game-overlay pause-overlay pixel-overlay">
          <h2>PAUSED</h2>
          <p>Press P or ESC to resume</p>
          <button className="resume-button pixel-button" onClick={togglePause}>
            RESUME
          </button>
        </div>
      )}
      {!isPlaying && (
        <div className="game-overlay pixel-overlay">
          <p>WASD / ARROWS TO MOVE</p>
          <p>AUTO FIRE</p>
        </div>
      )}
    </div>
  );
};
