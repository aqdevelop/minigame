import { useRef, useEffect } from 'react';
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
const ENEMY_WIDTH = 28;
const ENEMY_HEIGHT = 28;
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

interface HomingMissile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

interface HealthKit {
  id: string;
  x: number;
  y: number;
}

// Pixel art drawing helpers
const drawPixelRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
};

const drawPixelPlane = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number, color: string, isEnemy = false) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const unit = Math.floor(w / 8);

  ctx.fillStyle = color;

  if (isEnemy) {
    // Enemy plane (pointing down)
    drawPixelRect(ctx, px + unit * 3, py, unit * 2, unit * 2, color);
    drawPixelRect(ctx, px + unit * 2, py + unit * 2, unit * 4, unit * 2, color);
    drawPixelRect(ctx, px, py + unit * 4, unit * 8, unit * 2, color);
    drawPixelRect(ctx, px + unit * 3, py + unit * 6, unit * 2, unit * 2, color);
    // Cockpit
    drawPixelRect(ctx, px + unit * 3, py + unit * 2, unit * 2, unit * 2, '#333');
  } else {
    // Player plane (pointing up)
    drawPixelRect(ctx, px + unit * 3, py, unit * 2, unit * 2, color);
    drawPixelRect(ctx, px + unit * 2, py + unit * 2, unit * 4, unit * 2, color);
    drawPixelRect(ctx, px, py + unit * 4, unit * 8, unit * 2, color);
    drawPixelRect(ctx, px + unit * 3, py + unit * 6, unit * 2, unit * 2, color);
    // Cockpit
    drawPixelRect(ctx, px + unit * 3, py + unit * 4, unit * 2, unit * 2, '#66ccff');
  }
};

const drawPixelBoss = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number, hpPercent: number) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const unit = Math.floor(w / 16);

  // Main body
  ctx.fillStyle = '#8B0000';
  drawPixelRect(ctx, px + unit * 4, py, unit * 8, unit * 4, '#8B0000');
  drawPixelRect(ctx, px + unit * 2, py + unit * 4, unit * 12, unit * 4, '#8B0000');
  drawPixelRect(ctx, px, py + unit * 8, unit * 16, unit * 4, '#8B0000');

  // Wings
  drawPixelRect(ctx, px, py + unit * 4, unit * 2, unit * 8, '#660000');
  drawPixelRect(ctx, px + unit * 14, py + unit * 4, unit * 2, unit * 8, '#660000');

  // Engines
  drawPixelRect(ctx, px + unit * 3, py + unit * 12, unit * 2, unit * 3, '#ff4400');
  drawPixelRect(ctx, px + unit * 7, py + unit * 12, unit * 2, unit * 3, '#ff4400');
  drawPixelRect(ctx, px + unit * 11, py + unit * 12, unit * 2, unit * 3, '#ff4400');

  // Eyes
  ctx.fillStyle = hpPercent > 0.3 ? '#ffff00' : '#ff0000';
  drawPixelRect(ctx, px + unit * 5, py + unit * 2, unit * 2, unit * 2, ctx.fillStyle);
  drawPixelRect(ctx, px + unit * 9, py + unit * 2, unit * 2, unit * 2, ctx.fillStyle);
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
  }, [isPlaying, currentPlane, stage, wave]);

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
      };
    }
  }, [isPlaying]);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
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

      if (isPlayingRef.current && !state.gameOver) {
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
              const enemyHp = 15 + currentStage * 5 + currentWave * 2;
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

        // Move healthkits
        state.healthkits = state.healthkits
          .map((h) => ({ ...h, y: h.y + 1.5 }))
          .filter((h) => h.y < CANVAS_HEIGHT + HEALTHKIT_SIZE);

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
              state.player.hp -= bullet.damage;
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
              state.player.hp -= missile.damage;
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
              state.player.hp -= COLLISION_DAMAGE;
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

      // Draw particles
      state.particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 4, 4);
      });

      // Draw player
      const isInvincible = now < (state.player.invincible || 0);
      if (!isInvincible || Math.floor(now / 100) % 2 === 0) {
        drawPixelPlane(ctx, state.player.x, state.player.y, state.player.width, state.player.height, currentPlaneRef.current.color);
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

  return (
    <div className="fighter-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas pixel-canvas"
      />
      {!isPlaying && (
        <div className="game-overlay pixel-overlay">
          <p>WASD / ARROWS TO MOVE</p>
          <p>AUTO FIRE</p>
        </div>
      )}
    </div>
  );
};
