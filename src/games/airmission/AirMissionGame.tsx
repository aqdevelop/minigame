import React, { useEffect, useRef, useState, useCallback } from 'react';
import './AirMissionGame.css';
import {
  startBGM,
  stopBGM,
  playShootSound,
  playMissileSound,
  playExplosionSound,
  playBossExplosionSound,
  playHitSound,
  playMissionStartSound,
  playMissionCompleteSound,
  playGameOverSound,
  playFuelWarningSound,
  playPowerUpSound,
} from './airMissionSound';

interface Position {
  x: number;
  y: number;
}

interface Bullet {
  x: number;
  y: number;
  isEnemy: boolean;
  speed: number;
}

interface Missile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface Enemy {
  x: number;
  y: number;
  type: 'jet' | 'helicopter' | 'bomber';
  health: number;
  maxHealth: number;
  speed: number;
  shootTimer: number;
}

interface Boss {
  x: number;
  y: number;
  type: 'cargo' | 'carrier' | 'fortress';
  health: number;
  maxHealth: number;
  weakPointX: number;
  weakPointY: number;
  phase: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'fuel' | 'missile' | 'health' | 'score';
}

interface Explosion {
  x: number;
  y: number;
  frame: number;
  maxFrame: number;
  size: number;
}

interface Mission {
  id: number;
  name: string;
  description: string;
  targetName: string;
  targetType: 'cargo' | 'carrier' | 'fortress';
  commanderMessage: string;
  background: string;
}

const MISSIONS: Mission[] = [
  {
    id: 1,
    name: 'OPERATION THUNDER',
    description: 'Destroy the enemy cargo plane carrying supplies',
    targetName: 'C-130 CARGO PLANE',
    targetType: 'cargo',
    commanderMessage: 'Pilot, enemy supplies must not reach the front line. Destroy that cargo plane!',
    background: 'sky',
  },
  {
    id: 2,
    name: 'OPERATION STORM',
    description: 'Sink the enemy aircraft carrier',
    targetName: 'AIRCRAFT CARRIER',
    targetType: 'carrier',
    commanderMessage: 'The enemy carrier is launching attacks on our fleet. Take it down!',
    background: 'ocean',
  },
  {
    id: 3,
    name: 'OPERATION EAGLE',
    description: 'Destroy the enemy aerial fortress',
    targetName: 'SKY FORTRESS',
    targetType: 'fortress',
    commanderMessage: 'This is our final mission. Destroy the sky fortress and end this war!',
    background: 'sunset',
  },
];

interface AirMissionGameProps {
  onGameEnd: (score: number, coins: number) => void;
}

const AirMissionGame: React.FC<AirMissionGameProps> = ({ onGameEnd }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<{
    player: Position & { health: number; maxHealth: number };
    bullets: Bullet[];
    missiles: Missile[];
    enemies: Enemy[];
    boss: Boss | null;
    powerUps: PowerUp[];
    explosions: Explosion[];
    score: number;
    fuel: number;
    maxFuel: number;
    missileCount: number;
    lives: number;
    scrollY: number;
    spawnTimer: number;
    fuelWarningTimer: number;
    bossSpawned: boolean;
    enemiesDefeated: number;
    enemiesToBoss: number;
    keys: Set<string>;
  } | null>(null);

  const [gameState, setGameState] = useState<'briefing' | 'playing' | 'missionComplete' | 'gameover'>('briefing');
  const [currentMission, setCurrentMission] = useState(0);
  const [score, setScore] = useState(0);
  const [, setFuel] = useState(100);
  const [, setMissileCount] = useState(3);
  const [, setLives] = useState(3);
  const [collectedCoins, setCollectedCoins] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('airmission_highscore');
    return saved ? parseInt(saved) : 0;
  });

  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 600;

  const initGame = useCallback(() => {
    gameRef.current = {
      player: { x: CANVAS_WIDTH / 2 - 20, y: CANVAS_HEIGHT - 80, health: 100, maxHealth: 100 },
      bullets: [],
      missiles: [],
      enemies: [],
      boss: null,
      powerUps: [],
      explosions: [],
      score: 0,
      fuel: 100,
      maxFuel: 100,
      missileCount: 3,
      lives: 3,
      scrollY: 0,
      spawnTimer: 0,
      fuelWarningTimer: 0,
      bossSpawned: false,
      enemiesDefeated: 0,
      enemiesToBoss: 15 + currentMission * 5,
      keys: new Set(),
    };
  }, [currentMission]);

  const startMission = useCallback(() => {
    initGame();
    setGameState('playing');
    playMissionStartSound();
    startBGM();
  }, [initGame]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const game = gameRef.current;
    if (!game) return;

    game.keys.add(e.key.toLowerCase());

    // Shoot with space
    if (e.key === ' ' && gameState === 'playing') {
      e.preventDefault();
      // Add bullet
      game.bullets.push({
        x: game.player.x + 18,
        y: game.player.y,
        isEnemy: false,
        speed: 10,
      });
      playShootSound();
    }

    // Missile with M or Shift
    if ((e.key.toLowerCase() === 'm' || e.key === 'Shift') && gameState === 'playing') {
      if (game.missileCount > 0) {
        // Find target (boss or nearest enemy)
        let targetX = game.player.x + 20;
        let targetY = 0;

        if (game.boss) {
          targetX = game.boss.weakPointX;
          targetY = game.boss.weakPointY;
        } else if (game.enemies.length > 0) {
          const nearest = game.enemies.reduce((a, b) =>
            Math.hypot(a.x - game.player.x, a.y - game.player.y) <
            Math.hypot(b.x - game.player.x, b.y - game.player.y) ? a : b
          );
          targetX = nearest.x + 20;
          targetY = nearest.y + 15;
        }

        game.missiles.push({
          x: game.player.x + 18,
          y: game.player.y,
          targetX,
          targetY,
        });
        game.missileCount--;
        setMissileCount(game.missileCount);
        playMissileSound();
      }
    }
  }, [gameState]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const game = gameRef.current;
    if (!game) return;
    game.keys.delete(e.key.toLowerCase());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const spawnEnemy = () => {
      const game = gameRef.current;
      if (!game || game.bossSpawned) return;

      const types: Array<'jet' | 'helicopter' | 'bomber'> = ['jet', 'helicopter', 'bomber'];
      const type = types[Math.floor(Math.random() * (currentMission + 1)) % types.length];

      const enemy: Enemy = {
        x: Math.random() * (CANVAS_WIDTH - 40),
        y: -50,
        type,
        health: type === 'bomber' ? 50 : type === 'helicopter' ? 30 : 20,
        maxHealth: type === 'bomber' ? 50 : type === 'helicopter' ? 30 : 20,
        speed: type === 'bomber' ? 1 : type === 'helicopter' ? 2 : 3,
        shootTimer: Math.random() * 60,
      };

      game.enemies.push(enemy);
    };

    const spawnBoss = () => {
      const game = gameRef.current;
      if (!game) return;

      const mission = MISSIONS[currentMission];
      const bossType = mission.targetType;

      let bossHealth = 200;
      let bossWidth = 120;

      if (bossType === 'carrier') {
        bossHealth = 300;
        bossWidth = 150;
      } else if (bossType === 'fortress') {
        bossHealth = 400;
        bossWidth = 180;
      }

      game.boss = {
        x: CANVAS_WIDTH / 2 - bossWidth / 2,
        y: -100,
        type: bossType,
        health: bossHealth,
        maxHealth: bossHealth,
        weakPointX: CANVAS_WIDTH / 2,
        weakPointY: 80,
        phase: 0,
      };

      game.bossSpawned = true;
    };

    const spawnPowerUp = (x: number, y: number) => {
      const game = gameRef.current;
      if (!game) return;

      const types: Array<'fuel' | 'missile' | 'health' | 'score'> = ['fuel', 'missile', 'health', 'score'];
      const type = types[Math.floor(Math.random() * types.length)];

      game.powerUps.push({ x, y, type });
    };

    const drawBackground = () => {
      const game = gameRef.current;
      if (!game) return;

      const mission = MISSIONS[currentMission];

      // Sky gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);

      if (mission.background === 'sky') {
        gradient.addColorStop(0, '#1a1a4e');
        gradient.addColorStop(1, '#4a90c2');
      } else if (mission.background === 'ocean') {
        gradient.addColorStop(0, '#1a3a5c');
        gradient.addColorStop(1, '#0a2a4c');
      } else {
        gradient.addColorStop(0, '#4a1a1a');
        gradient.addColorStop(1, '#c27a30');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Scrolling clouds/waves
      const scrollOffset = game.scrollY % 200;

      if (mission.background === 'ocean') {
        // Draw waves
        ctx.fillStyle = '#0a4a6c';
        for (let y = -200 + scrollOffset; y < CANVAS_HEIGHT + 200; y += 100) {
          for (let x = 0; x < CANVAS_WIDTH; x += 80) {
            ctx.beginPath();
            ctx.arc(x + 40, y, 60, 0, Math.PI);
            ctx.fill();
          }
        }
      } else {
        // Draw clouds
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        for (let y = -200 + scrollOffset; y < CANVAS_HEIGHT + 200; y += 150) {
          ctx.beginPath();
          ctx.arc(50, y, 30, 0, Math.PI * 2);
          ctx.arc(80, y - 10, 25, 0, Math.PI * 2);
          ctx.arc(110, y, 35, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(300, y + 50, 25, 0, Math.PI * 2);
          ctx.arc(330, y + 40, 30, 0, Math.PI * 2);
          ctx.arc(360, y + 50, 20, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const drawPlayer = () => {
      const game = gameRef.current;
      if (!game) return;

      const { x, y } = game.player;

      // Fighter jet shape
      ctx.fillStyle = '#2196F3';

      // Body
      ctx.fillRect(x + 15, y, 10, 45);

      // Wings
      ctx.fillRect(x, y + 20, 40, 8);

      // Tail
      ctx.fillRect(x + 10, y + 35, 20, 10);

      // Cockpit
      ctx.fillStyle = '#64B5F6';
      ctx.fillRect(x + 17, y + 5, 6, 12);

      // Engine glow
      ctx.fillStyle = '#FF9800';
      ctx.fillRect(x + 17, y + 43, 6, 4 + Math.random() * 3);
    };

    const drawEnemy = (enemy: Enemy) => {
      const { x, y, type, health, maxHealth } = enemy;

      if (type === 'jet') {
        // Enemy jet (red)
        ctx.fillStyle = '#F44336';
        ctx.fillRect(x + 15, y, 10, 35);
        ctx.fillRect(x, y + 10, 40, 6);
        ctx.fillRect(x + 10, y, 20, 8);

        ctx.fillStyle = '#FFCDD2';
        ctx.fillRect(x + 17, y + 25, 6, 8);
      } else if (type === 'helicopter') {
        // Helicopter
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(x + 10, y + 10, 20, 25);
        ctx.fillRect(x + 5, y + 20, 30, 8);

        // Rotor
        ctx.fillStyle = '#81C784';
        ctx.fillRect(x - 5, y + 5, 50, 3);
        ctx.fillRect(x + 18, y, 4, 10);

        // Tail
        ctx.fillRect(x + 25, y + 15, 20, 4);
      } else {
        // Bomber (larger)
        ctx.fillStyle = '#9C27B0';
        ctx.fillRect(x + 10, y, 30, 50);
        ctx.fillRect(x, y + 15, 50, 10);

        ctx.fillStyle = '#CE93D8';
        ctx.fillRect(x + 20, y + 35, 10, 10);
      }

      // Health bar
      ctx.fillStyle = '#333';
      ctx.fillRect(x, y - 8, 40, 4);
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(x, y - 8, 40 * (health / maxHealth), 4);
    };

    const drawBoss = () => {
      const game = gameRef.current;
      if (!game || !game.boss) return;

      const { x, y, type, health, maxHealth, weakPointX, weakPointY } = game.boss;

      if (type === 'cargo') {
        // Cargo plane
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(x + 30, y, 60, 90);
        ctx.fillRect(x, y + 25, 120, 20);
        ctx.fillRect(x + 20, y + 70, 80, 20);

        ctx.fillStyle = '#90A4AE';
        ctx.fillRect(x + 45, y + 10, 30, 20);

        // Engines
        ctx.fillStyle = '#455A64';
        ctx.fillRect(x + 10, y + 30, 15, 25);
        ctx.fillRect(x + 95, y + 30, 15, 25);
      } else if (type === 'carrier') {
        // Aircraft carrier
        ctx.fillStyle = '#455A64';
        ctx.fillRect(x, y + 20, 150, 60);

        // Deck
        ctx.fillStyle = '#607D8B';
        ctx.fillRect(x + 10, y + 10, 130, 15);

        // Tower
        ctx.fillStyle = '#78909C';
        ctx.fillRect(x + 110, y, 30, 25);

        // Mini planes on deck
        ctx.fillStyle = '#F44336';
        for (let i = 0; i < 3; i++) {
          ctx.fillRect(x + 20 + i * 30, y + 12, 15, 8);
        }
      } else {
        // Sky fortress
        ctx.fillStyle = '#37474F';
        ctx.fillRect(x + 40, y, 100, 80);
        ctx.fillRect(x, y + 20, 180, 40);
        ctx.fillRect(x + 60, y + 60, 60, 30);

        // Guns
        ctx.fillStyle = '#546E7A';
        ctx.fillRect(x + 10, y + 50, 20, 30);
        ctx.fillRect(x + 150, y + 50, 20, 30);

        // Core
        ctx.fillStyle = '#FF5722';
        ctx.fillRect(x + 80, y + 30, 20, 20);
      }

      // Weak point indicator (flashing)
      if (Math.floor(Date.now() / 200) % 2 === 0) {
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(weakPointX, weakPointY, 15, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(weakPointX - 20, weakPointY);
        ctx.lineTo(weakPointX + 20, weakPointY);
        ctx.moveTo(weakPointX, weakPointY - 20);
        ctx.lineTo(weakPointX, weakPointY + 20);
        ctx.stroke();
      }

      // Boss health bar
      ctx.fillStyle = '#333';
      ctx.fillRect(50, 10, 300, 15);
      ctx.fillStyle = '#F44336';
      ctx.fillRect(50, 10, 300 * (health / maxHealth), 15);
      ctx.strokeStyle = '#FFF';
      ctx.strokeRect(50, 10, 300, 15);

      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.fillText('TARGET', 50, 35);
    };

    const drawBullet = (bullet: Bullet) => {
      ctx.fillStyle = bullet.isEnemy ? '#FF5722' : '#FFEB3B';
      ctx.fillRect(bullet.x - 2, bullet.y, 4, bullet.isEnemy ? 8 : 12);
    };

    const drawMissile = (missile: Missile) => {
      ctx.fillStyle = '#FF9800';
      ctx.fillRect(missile.x - 3, missile.y, 6, 15);

      // Missile trail
      ctx.fillStyle = '#FFC107';
      ctx.fillRect(missile.x - 2, missile.y + 15, 4, 5 + Math.random() * 5);
    };

    const drawPowerUp = (powerUp: PowerUp) => {
      const { x, y, type } = powerUp;

      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 20, 20);

      if (type === 'fuel') {
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(x + 2, y + 2, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.fillText('F', x + 5, y + 15);
      } else if (type === 'missile') {
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(x + 2, y + 2, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.fillText('M', x + 4, y + 15);
      } else if (type === 'health') {
        ctx.fillStyle = '#F44336';
        ctx.fillRect(x + 2, y + 2, 16, 16);
        ctx.fillStyle = '#FFF';
        ctx.font = '12px monospace';
        ctx.fillText('+', x + 5, y + 15);
      } else {
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(x + 2, y + 2, 16, 16);
        ctx.fillStyle = '#000';
        ctx.font = '12px monospace';
        ctx.fillText('$', x + 5, y + 15);
      }
    };

    const drawExplosion = (explosion: Explosion) => {
      const { x, y, frame, maxFrame, size } = explosion;
      const progress = frame / maxFrame;

      const colors = ['#FF5722', '#FF9800', '#FFEB3B', '#FFF'];
      const colorIndex = Math.floor(progress * colors.length);

      ctx.fillStyle = colors[Math.min(colorIndex, colors.length - 1)];
      ctx.globalAlpha = 1 - progress;

      ctx.beginPath();
      ctx.arc(x, y, size * (0.5 + progress * 0.5), 0, Math.PI * 2);
      ctx.fill();

      // Particles
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const dist = size * progress;
        ctx.beginPath();
        ctx.arc(x + Math.cos(angle) * dist, y + Math.sin(angle) * dist, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
    };

    const drawHUD = () => {
      const game = gameRef.current;
      if (!game) return;

      // Fuel bar
      ctx.fillStyle = '#333';
      ctx.fillRect(10, CANVAS_HEIGHT - 30, 100, 15);

      const fuelColor = game.fuel > 30 ? '#4CAF50' : game.fuel > 15 ? '#FF9800' : '#F44336';
      ctx.fillStyle = fuelColor;
      ctx.fillRect(10, CANVAS_HEIGHT - 30, game.fuel, 15);

      ctx.strokeStyle = '#FFF';
      ctx.strokeRect(10, CANVAS_HEIGHT - 30, 100, 15);

      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.fillText('FUEL', 12, CANVAS_HEIGHT - 18);

      // Score
      ctx.fillStyle = '#FFF';
      ctx.font = '14px monospace';
      ctx.fillText(`SCORE: ${game.score}`, 10, 25);

      // Lives
      ctx.fillText(`LIVES: ${game.lives}`, 10, 45);

      // Missiles
      ctx.fillStyle = '#FF9800';
      ctx.fillText(`MISSILES: ${game.missileCount}`, CANVAS_WIDTH - 100, 25);

      // Mission
      ctx.fillStyle = '#FFF';
      ctx.font = '10px monospace';
      ctx.fillText(`MISSION ${currentMission + 1}`, CANVAS_WIDTH - 80, CANVAS_HEIGHT - 18);

      // Enemies to boss
      if (!game.bossSpawned) {
        ctx.fillText(`ENEMIES: ${game.enemiesDefeated}/${game.enemiesToBoss}`, CANVAS_WIDTH - 100, 45);
      }
    };

    const update = () => {
      const game = gameRef.current;
      if (!game) return;

      // Player movement
      const speed = 5;
      if (game.keys.has('arrowleft') || game.keys.has('a')) {
        game.player.x = Math.max(0, game.player.x - speed);
      }
      if (game.keys.has('arrowright') || game.keys.has('d')) {
        game.player.x = Math.min(CANVAS_WIDTH - 40, game.player.x + speed);
      }
      if (game.keys.has('arrowup') || game.keys.has('w')) {
        game.player.y = Math.max(0, game.player.y - speed);
      }
      if (game.keys.has('arrowdown') || game.keys.has('s')) {
        game.player.y = Math.min(CANVAS_HEIGHT - 60, game.player.y + speed);
      }

      // Scroll background
      game.scrollY += 2;

      // Fuel consumption
      game.fuel -= 0.03;
      setFuel(Math.max(0, game.fuel));

      // Fuel warning
      if (game.fuel < 20 && game.fuel > 0) {
        game.fuelWarningTimer++;
        if (game.fuelWarningTimer >= 120) {
          playFuelWarningSound();
          game.fuelWarningTimer = 0;
        }
      }

      // Out of fuel
      if (game.fuel <= 0) {
        game.lives--;
        setLives(game.lives);

        if (game.lives <= 0) {
          stopBGM();
          playGameOverSound();
          setGameState('gameover');
          return;
        }

        game.fuel = game.maxFuel;
        game.player.x = CANVAS_WIDTH / 2 - 20;
        game.player.y = CANVAS_HEIGHT - 80;
        playHitSound();
      }

      // Spawn enemies
      if (!game.bossSpawned) {
        game.spawnTimer++;
        if (game.spawnTimer >= 60 - currentMission * 10) {
          spawnEnemy();
          game.spawnTimer = 0;
        }
      }

      // Check if boss should spawn
      if (game.enemiesDefeated >= game.enemiesToBoss && !game.bossSpawned) {
        spawnBoss();
      }

      // Update bullets
      game.bullets = game.bullets.filter((bullet) => {
        bullet.y += bullet.isEnemy ? bullet.speed : -bullet.speed;
        return bullet.y > -20 && bullet.y < CANVAS_HEIGHT + 20;
      });

      // Update missiles
      game.missiles = game.missiles.filter((missile) => {
        const dx = missile.targetX - missile.x;
        const dy = missile.targetY - missile.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 5) {
          missile.x += (dx / dist) * 8;
          missile.y += (dy / dist) * 8;
        }

        return missile.y > -20 && missile.y < CANVAS_HEIGHT + 20;
      });

      // Update enemies
      game.enemies = game.enemies.filter((enemy) => {
        enemy.y += enemy.speed;

        // Enemy shooting
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
          game.bullets.push({
            x: enemy.x + 20,
            y: enemy.y + 40,
            isEnemy: true,
            speed: 5,
          });
          enemy.shootTimer = 90 - currentMission * 15;
        }

        return enemy.y < CANVAS_HEIGHT + 50 && enemy.health > 0;
      });

      // Update boss
      if (game.boss) {
        // Move boss down to position
        if (game.boss.y < 50) {
          game.boss.y += 1;
        }

        // Update weak point position
        game.boss.weakPointX = game.boss.x + (game.boss.type === 'cargo' ? 60 : game.boss.type === 'carrier' ? 75 : 90);
        game.boss.weakPointY = game.boss.y + (game.boss.type === 'cargo' ? 40 : game.boss.type === 'carrier' ? 40 : 40);

        // Boss shooting pattern
        game.boss.phase++;
        if (game.boss.phase % (60 - currentMission * 10) === 0) {
          // Spread shot
          for (let i = -2; i <= 2; i++) {
            game.bullets.push({
              x: game.boss.weakPointX + i * 20,
              y: game.boss.y + 80,
              isEnemy: true,
              speed: 4,
            });
          }
        }
      }

      // Update power-ups
      game.powerUps = game.powerUps.filter((powerUp) => {
        powerUp.y += 2;
        return powerUp.y < CANVAS_HEIGHT + 20;
      });

      // Update explosions
      game.explosions = game.explosions.filter((explosion) => {
        explosion.frame++;
        return explosion.frame < explosion.maxFrame;
      });

      // Collision detection - player bullets vs enemies
      game.bullets.forEach((bullet, bulletIndex) => {
        if (bullet.isEnemy) return;

        game.enemies.forEach((enemy) => {
          if (
            bullet.x > enemy.x &&
            bullet.x < enemy.x + 40 &&
            bullet.y > enemy.y &&
            bullet.y < enemy.y + 40
          ) {
            enemy.health -= 10;
            game.bullets.splice(bulletIndex, 1);
            playHitSound();

            if (enemy.health <= 0) {
              game.explosions.push({
                x: enemy.x + 20,
                y: enemy.y + 20,
                frame: 0,
                maxFrame: 20,
                size: 30,
              });
              playExplosionSound();

              game.score += enemy.type === 'bomber' ? 300 : enemy.type === 'helicopter' ? 200 : 100;
              game.enemiesDefeated++;
              setScore(game.score);

              // Chance to drop power-up
              if (Math.random() < 0.3) {
                spawnPowerUp(enemy.x, enemy.y);
              }
            }
          }
        });

        // Bullets vs boss
        if (game.boss) {
          const bossWidth = game.boss.type === 'cargo' ? 120 : game.boss.type === 'carrier' ? 150 : 180;
          const bossHeight = game.boss.type === 'cargo' ? 90 : game.boss.type === 'carrier' ? 80 : 90;

          if (
            bullet.x > game.boss.x &&
            bullet.x < game.boss.x + bossWidth &&
            bullet.y > game.boss.y &&
            bullet.y < game.boss.y + bossHeight
          ) {
            // Check if hitting weak point
            const weakPointDist = Math.hypot(bullet.x - game.boss.weakPointX, bullet.y - game.boss.weakPointY);
            const damage = weakPointDist < 20 ? 15 : 5;

            game.boss.health -= damage;
            game.bullets.splice(bulletIndex, 1);
            playHitSound();

            if (game.boss.health <= 0) {
              // Boss destroyed
              for (let i = 0; i < 10; i++) {
                setTimeout(() => {
                  if (game.boss) {
                    game.explosions.push({
                      x: game.boss.x + Math.random() * 120,
                      y: game.boss.y + Math.random() * 80,
                      frame: 0,
                      maxFrame: 30,
                      size: 40,
                    });
                  }
                }, i * 100);
              }
              playBossExplosionSound();

              game.score += 1000 * (currentMission + 1);
              setScore(game.score);

              // Coins based on mission
              const earnedCoins = (currentMission + 1) * 500;
              setCollectedCoins((prev) => prev + earnedCoins);

              game.boss = null;

              // Mission complete
              stopBGM();
              playMissionCompleteSound();

              setTimeout(() => {
                if (currentMission < MISSIONS.length - 1) {
                  setCurrentMission((prev) => prev + 1);
                  setGameState('briefing');
                } else {
                  // All missions complete
                  setGameState('missionComplete');
                }
              }, 2000);
            }
          }
        }
      });

      // Missiles vs enemies/boss
      game.missiles.forEach((missile, missileIndex) => {
        game.enemies.forEach((enemy) => {
          if (
            missile.x > enemy.x &&
            missile.x < enemy.x + 40 &&
            missile.y > enemy.y &&
            missile.y < enemy.y + 40
          ) {
            enemy.health -= 50;
            game.missiles.splice(missileIndex, 1);

            game.explosions.push({
              x: enemy.x + 20,
              y: enemy.y + 20,
              frame: 0,
              maxFrame: 25,
              size: 40,
            });
            playExplosionSound();

            if (enemy.health <= 0) {
              game.score += enemy.type === 'bomber' ? 300 : enemy.type === 'helicopter' ? 200 : 100;
              game.enemiesDefeated++;
              setScore(game.score);

              if (Math.random() < 0.5) {
                spawnPowerUp(enemy.x, enemy.y);
              }
            }
          }
        });

        // Missiles vs boss (high damage)
        if (game.boss) {
          const bossWidth = game.boss.type === 'cargo' ? 120 : game.boss.type === 'carrier' ? 150 : 180;
          const bossHeight = game.boss.type === 'cargo' ? 90 : game.boss.type === 'carrier' ? 80 : 90;

          if (
            missile.x > game.boss.x &&
            missile.x < game.boss.x + bossWidth &&
            missile.y > game.boss.y &&
            missile.y < game.boss.y + bossHeight
          ) {
            game.boss.health -= 50;
            game.missiles.splice(missileIndex, 1);

            game.explosions.push({
              x: missile.x,
              y: missile.y,
              frame: 0,
              maxFrame: 25,
              size: 45,
            });
            playExplosionSound();
          }
        }
      });

      // Enemy bullets vs player
      game.bullets.forEach((bullet, bulletIndex) => {
        if (!bullet.isEnemy) return;

        if (
          bullet.x > game.player.x &&
          bullet.x < game.player.x + 40 &&
          bullet.y > game.player.y &&
          bullet.y < game.player.y + 45
        ) {
          game.player.health -= 20;
          game.bullets.splice(bulletIndex, 1);
          playHitSound();

          if (game.player.health <= 0) {
            game.lives--;
            setLives(game.lives);

            game.explosions.push({
              x: game.player.x + 20,
              y: game.player.y + 22,
              frame: 0,
              maxFrame: 30,
              size: 50,
            });
            playExplosionSound();

            if (game.lives <= 0) {
              stopBGM();
              playGameOverSound();
              setGameState('gameover');
              return;
            }

            // Respawn
            game.player.health = game.player.maxHealth;
            game.player.x = CANVAS_WIDTH / 2 - 20;
            game.player.y = CANVAS_HEIGHT - 80;
          }
        }
      });

      // Player vs power-ups
      game.powerUps.forEach((powerUp, index) => {
        if (
          powerUp.x < game.player.x + 40 &&
          powerUp.x + 20 > game.player.x &&
          powerUp.y < game.player.y + 45 &&
          powerUp.y + 20 > game.player.y
        ) {
          game.powerUps.splice(index, 1);
          playPowerUpSound();

          switch (powerUp.type) {
            case 'fuel':
              game.fuel = Math.min(game.maxFuel, game.fuel + 30);
              setFuel(game.fuel);
              break;
            case 'missile':
              game.missileCount += 2;
              setMissileCount(game.missileCount);
              break;
            case 'health':
              game.player.health = Math.min(game.player.maxHealth, game.player.health + 30);
              break;
            case 'score':
              game.score += 500;
              setScore(game.score);
              break;
          }
        }
      });

      // Player collision with enemies
      game.enemies.forEach((enemy) => {
        if (
          game.player.x < enemy.x + 40 &&
          game.player.x + 40 > enemy.x &&
          game.player.y < enemy.y + 40 &&
          game.player.y + 45 > enemy.y
        ) {
          game.player.health -= 50;
          enemy.health = 0;

          game.explosions.push({
            x: enemy.x + 20,
            y: enemy.y + 20,
            frame: 0,
            maxFrame: 25,
            size: 40,
          });
          playExplosionSound();

          if (game.player.health <= 0) {
            game.lives--;
            setLives(game.lives);

            if (game.lives <= 0) {
              stopBGM();
              playGameOverSound();
              setGameState('gameover');
              return;
            }

            game.player.health = game.player.maxHealth;
            game.player.x = CANVAS_WIDTH / 2 - 20;
            game.player.y = CANVAS_HEIGHT - 80;
          }
        }
      });
    };

    const gameLoop = () => {
      if (gameState !== 'playing') return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      update();

      drawBackground();

      const game = gameRef.current;
      if (game) {
        game.powerUps.forEach(drawPowerUp);
        game.bullets.forEach(drawBullet);
        game.missiles.forEach(drawMissile);
        game.enemies.forEach(drawEnemy);

        if (game.boss) {
          drawBoss();
        }

        drawPlayer();

        game.explosions.forEach(drawExplosion);
      }

      drawHUD();

      animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [gameState, currentMission]);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('airmission_highscore', score.toString());
    }
  }, [score, highScore]);

  const handleGameEnd = useCallback(() => {
    stopBGM();
    onGameEnd(score, collectedCoins);
  }, [onGameEnd, score, collectedCoins]);

  const renderBriefing = () => {
    const mission = MISSIONS[currentMission];

    return (
      <div className="airmission-briefing">
        <h1 className="briefing-title">MISSION</h1>

        <div className="briefing-content">
          <div className="commander-panel">
            <div className="commander-portrait">
              <div className="commander-head"></div>
              <div className="commander-body"></div>
            </div>
          </div>

          <div className="target-panel">
            <h3>TARGET's WEAK POINT</h3>
            <div className={`target-image target-${mission.targetType}`}>
              <div className="weak-point-marker"></div>
            </div>
          </div>
        </div>

        <div className="mission-info">
          <h2>{mission.name}</h2>
          <p className="target-name">{mission.targetName}</p>
          <p className="mission-desc">{mission.description}</p>
          <p className="commander-message">"{mission.commanderMessage}"</p>
        </div>

        <div className="briefing-controls">
          <p>SPACE: 발사 | M/SHIFT: 미사일 | 방향키: 이동</p>
          <button onClick={startMission} className="start-button">
            START MISSION
          </button>
        </div>
      </div>
    );
  };

  const renderMissionComplete = () => (
    <div className="airmission-result">
      <h1>MISSION COMPLETE!</h1>
      <h2>ALL TARGETS DESTROYED</h2>
      <p className="final-score">FINAL SCORE: {score}</p>
      <p className="coins-earned">COINS EARNED: {collectedCoins}</p>
      {score >= highScore && <p className="new-record">NEW HIGH SCORE!</p>}
      <button onClick={handleGameEnd} className="result-button">
        RETURN TO BASE
      </button>
    </div>
  );

  const renderGameOver = () => (
    <div className="airmission-result gameover">
      <h1>MISSION FAILED</h1>
      <p className="final-score">SCORE: {score}</p>
      <p className="high-score">HIGH SCORE: {highScore}</p>
      <p className="coins-earned">COINS EARNED: {collectedCoins}</p>
      <div className="gameover-buttons">
        <button
          onClick={() => {
            setCurrentMission(0);
            setScore(0);
            setCollectedCoins(0);
            setLives(3);
            setFuel(100);
            setMissileCount(3);
            setGameState('briefing');
          }}
          className="result-button"
        >
          TRY AGAIN
        </button>
        <button onClick={handleGameEnd} className="result-button secondary">
          RETURN TO BASE
        </button>
      </div>
    </div>
  );

  return (
    <div className="airmission-container">
      {gameState === 'briefing' && renderBriefing()}
      {gameState === 'playing' && (
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="airmission-canvas"
        />
      )}
      {gameState === 'missionComplete' && renderMissionComplete()}
      {gameState === 'gameover' && renderGameOver()}
    </div>
  );
};

export default AirMissionGame;
