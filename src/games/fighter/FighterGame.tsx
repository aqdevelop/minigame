import { useRef, useEffect } from 'react';
import type { Bullet, Enemy, Player, Plane } from '../../types/game';
import { ENEMY_BASE_HP, ENEMY_HP_INCREASE_RATE } from '../../constants/planes';
import './FighterGame.css';

interface FighterGameProps {
  isPlaying: boolean;
  currentPlane: Plane;
  score: number;
  onEnemyKill: () => void;
  onGameOver: () => void;
}

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 50;
const BULLET_SIZE = 5;
const ENEMY_WIDTH = 35;
const ENEMY_HEIGHT = 40;

export const FighterGame = ({
  isPlaying,
  currentPlane,
  score,
  onEnemyKill,
  onGameOver,
}: FighterGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameStateRef = useRef({
    player: {
      x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
      y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      hp: 100,
      maxHp: 100,
    } as Player,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    enemyBullets: [] as Bullet[],
    lastShot: 0,
    lastEnemySpawn: 0,
    lastEnemyShoot: 0,
    gameOver: false,
  });
  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | undefined>(undefined);
  const isPlayingRef = useRef(isPlaying);
  const currentPlaneRef = useRef(currentPlane);
  const scoreRef = useRef(score);

  // Keep refs in sync with props
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentPlaneRef.current = currentPlane;
    scoreRef.current = score;
  }, [isPlaying, currentPlane, score]);

  // Reset game state when starting
  useEffect(() => {
    if (isPlaying) {
      gameStateRef.current = {
        player: {
          x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
          y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
          width: PLAYER_WIDTH,
          height: PLAYER_HEIGHT,
          hp: 100,
          maxHp: 100,
        },
        bullets: [],
        enemies: [],
        enemyBullets: [],
        lastShot: 0,
        lastEnemySpawn: 0,
        lastEnemyShoot: 0,
        gameOver: false,
      };
    }
  }, [isPlaying]);

  // Keyboard event handlers
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

  // Main game loop - combined update and draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const plane = currentPlaneRef.current;
      const currentScore = scoreRef.current;
      const now = Date.now();

      if (isPlayingRef.current && !state.gameOver) {
        // === UPDATE LOGIC ===
        const keys = keysRef.current;
        const speed = plane.speed;

        // Move player
        if (keys.has('arrowleft') || keys.has('a')) state.player.x -= speed;
        if (keys.has('arrowright') || keys.has('d')) state.player.x += speed;
        if (keys.has('arrowup') || keys.has('w')) state.player.y -= speed;
        if (keys.has('arrowdown') || keys.has('s')) state.player.y += speed;

        state.player.x = Math.max(0, Math.min(CANVAS_WIDTH - state.player.width, state.player.x));
        state.player.y = Math.max(0, Math.min(CANVAS_HEIGHT - state.player.height, state.player.y));

        // Auto-fire
        const fireInterval = 1000 / plane.fireRate;
        if (now - state.lastShot > fireInterval) {
          state.lastShot = now;
          state.bullets.push({
            id: `bullet-${now}`,
            x: state.player.x + state.player.width / 2,
            y: state.player.y,
            damage: plane.damage,
            isEnemy: false,
          });
        }

        // Spawn enemies
        const spawnInterval = Math.max(500, 1500 - currentScore * 10);
        if (now - state.lastEnemySpawn > spawnInterval) {
          state.lastEnemySpawn = now;
          const enemyHp = Math.floor(
            ENEMY_BASE_HP * (1 + Math.floor(currentScore / 10) * ENEMY_HP_INCREASE_RATE)
          );
          state.enemies.push({
            id: `enemy-${now}-${Math.random()}`,
            x: Math.random() * (CANVAS_WIDTH - ENEMY_WIDTH),
            y: -ENEMY_HEIGHT,
            hp: enemyHp,
            maxHp: enemyHp,
            speed: 1 + Math.random() * 2,
            width: ENEMY_WIDTH,
            height: ENEMY_HEIGHT,
          });
        }

        // Enemy shooting
        if (now - state.lastEnemyShoot > 1000) {
          state.lastEnemyShoot = now;
          state.enemies.forEach((enemy) => {
            if (Math.random() < 0.3) {
              state.enemyBullets.push({
                id: `ebullet-${now}-${Math.random()}`,
                x: enemy.x + enemy.width / 2,
                y: enemy.y + enemy.height,
                damage: 10,
                isEnemy: true,
              });
            }
          });
        }

        // Move bullets
        state.bullets = state.bullets
          .map((b) => ({ ...b, y: b.y - 10 }))
          .filter((b) => b.y > -BULLET_SIZE);

        state.enemyBullets = state.enemyBullets
          .map((b) => ({ ...b, y: b.y + 5 }))
          .filter((b) => b.y < CANVAS_HEIGHT + BULLET_SIZE);

        // Move enemies
        state.enemies = state.enemies
          .map((e) => ({ ...e, y: e.y + e.speed }))
          .filter((e) => e.y < CANVAS_HEIGHT + ENEMY_HEIGHT);

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
              if (enemy.hp <= 0) {
                onEnemyKill();
              }
            }
          });
          if (!hit) remainingBullets.push(bullet);
        });
        state.bullets = remainingBullets;
        state.enemies = state.enemies.filter((e) => e.hp > 0);

        // Collision: enemy bullets vs player
        const remainingEnemyBullets: Bullet[] = [];
        state.enemyBullets.forEach((bullet) => {
          if (
            bullet.x > state.player.x &&
            bullet.x < state.player.x + state.player.width &&
            bullet.y > state.player.y &&
            bullet.y < state.player.y + state.player.height
          ) {
            state.player.hp -= bullet.damage;
            if (state.player.hp <= 0) {
              state.gameOver = true;
              onGameOver();
            }
          } else {
            remainingEnemyBullets.push(bullet);
          }
        });
        state.enemyBullets = remainingEnemyBullets;

        // Collision: enemies vs player
        state.enemies.forEach((enemy) => {
          if (
            enemy.x < state.player.x + state.player.width &&
            enemy.x + enemy.width > state.player.x &&
            enemy.y < state.player.y + state.player.height &&
            enemy.y + enemy.height > state.player.y
          ) {
            state.gameOver = true;
            onGameOver();
          }
        });
      }

      // === DRAW LOGIC ===
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Stars background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73) % CANVAS_WIDTH;
        const y = ((i * 47) + now * 0.02) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 1, 1);
      }

      // Draw player
      const player = state.player;
      ctx.fillStyle = plane.color;
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // Draw player bullets
      ctx.fillStyle = '#ffff00';
      state.bullets.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw enemies
      state.enemies.forEach((enemy) => {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + 10);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.closePath();
        ctx.fill();

        // HP bar
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
        ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * hpPercent, 4);
      });

      // Draw enemy bullets
      ctx.fillStyle = '#ff6666';
      state.enemyBullets.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player HP bar
      const playerHpPercent = player.hp / player.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(10, CANVAS_HEIGHT - 25, 100, 15);
      ctx.fillStyle = playerHpPercent > 0.5 ? '#4CAF50' : playerHpPercent > 0.25 ? '#ff9800' : '#f44336';
      ctx.fillRect(10, CANVAS_HEIGHT - 25, 100 * playerHpPercent, 15);
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.fillText(`HP: ${Math.max(0, player.hp)}/${player.maxHp}`, 15, CANVAS_HEIGHT - 13);

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [onEnemyKill, onGameOver]);

  return (
    <div className="fighter-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas"
      />
      {!isPlaying && (
        <div className="game-overlay">
          <p>WASD 또는 방향키로 이동</p>
          <p>자동 발사</p>
        </div>
      )}
    </div>
  );
};
