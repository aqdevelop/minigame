import { useRef, useEffect, useCallback, useState } from 'react';
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
  const animationRef = useRef<number | undefined>(undefined);
  const lastShotRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const [player, setPlayer] = useState<Player>({
    x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
    y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    hp: 100,
    maxHp: 100,
  });
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [enemyBullets, setEnemyBullets] = useState<Bullet[]>([]);

  // Reset game state when starting
  useEffect(() => {
    if (isPlaying) {
      setPlayer({
        x: CANVAS_WIDTH / 2 - PLAYER_WIDTH / 2,
        y: CANVAS_HEIGHT - PLAYER_HEIGHT - 20,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        hp: 100,
        maxHp: 100,
      });
      setBullets([]);
      setEnemies([]);
      setEnemyBullets([]);
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

  // Spawn enemies periodically
  useEffect(() => {
    if (!isPlaying) return;

    const spawnEnemy = () => {
      const enemyHp = Math.floor(
        ENEMY_BASE_HP * (1 + Math.floor(score / 10) * ENEMY_HP_INCREASE_RATE)
      );
      const newEnemy: Enemy = {
        id: `enemy-${Date.now()}-${Math.random()}`,
        x: Math.random() * (CANVAS_WIDTH - ENEMY_WIDTH),
        y: -ENEMY_HEIGHT,
        hp: enemyHp,
        maxHp: enemyHp,
        speed: 1 + Math.random() * 2,
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
      };
      setEnemies((prev) => [...prev, newEnemy]);
    };

    const interval = setInterval(spawnEnemy, 1500 - Math.min(score * 10, 1000));
    return () => clearInterval(interval);
  }, [isPlaying, score]);

  // Enemy shooting
  useEffect(() => {
    if (!isPlaying) return;

    const enemyShoot = () => {
      setEnemies((currentEnemies) => {
        currentEnemies.forEach((enemy) => {
          if (Math.random() < 0.3) {
            const newBullet: Bullet = {
              id: `ebullet-${Date.now()}-${Math.random()}`,
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height,
              damage: 10,
              isEnemy: true,
            };
            setEnemyBullets((prev) => [...prev, newBullet]);
          }
        });
        return currentEnemies;
      });
    };

    const interval = setInterval(enemyShoot, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Main game loop
  const gameLoop = useCallback(() => {
    if (!isPlaying) return;

    const keys = keysRef.current;
    const speed = currentPlane.speed;

    // Move player
    setPlayer((prev) => {
      let newX = prev.x;
      let newY = prev.y;

      if (keys.has('arrowleft') || keys.has('a')) newX -= speed;
      if (keys.has('arrowright') || keys.has('d')) newX += speed;
      if (keys.has('arrowup') || keys.has('w')) newY -= speed;
      if (keys.has('arrowdown') || keys.has('s')) newY += speed;

      newX = Math.max(0, Math.min(CANVAS_WIDTH - prev.width, newX));
      newY = Math.max(0, Math.min(CANVAS_HEIGHT - prev.height, newY));

      return { ...prev, x: newX, y: newY };
    });

    // Auto-fire
    const now = Date.now();
    const fireInterval = 1000 / currentPlane.fireRate;
    if (now - lastShotRef.current > fireInterval) {
      lastShotRef.current = now;
      setPlayer((currentPlayer) => {
        const newBullet: Bullet = {
          id: `bullet-${now}`,
          x: currentPlayer.x + currentPlayer.width / 2,
          y: currentPlayer.y,
          damage: currentPlane.damage,
          isEnemy: false,
        };
        setBullets((prev) => [...prev, newBullet]);
        return currentPlayer;
      });
    }

    // Move player bullets
    setBullets((prev) =>
      prev
        .map((b) => ({ ...b, y: b.y - 10 }))
        .filter((b) => b.y > -BULLET_SIZE)
    );

    // Move enemy bullets
    setEnemyBullets((prev) =>
      prev
        .map((b) => ({ ...b, y: b.y + 5 }))
        .filter((b) => b.y < CANVAS_HEIGHT + BULLET_SIZE)
    );

    // Move enemies
    setEnemies((prev) =>
      prev
        .map((e) => ({ ...e, y: e.y + e.speed }))
        .filter((e) => e.y < CANVAS_HEIGHT + ENEMY_HEIGHT)
    );

    // Collision detection - bullets hitting enemies
    setBullets((currentBullets) => {
      const remainingBullets: Bullet[] = [];
      const bulletHits = new Set<string>();

      currentBullets.forEach((bullet) => {
        let hit = false;
        setEnemies((currentEnemies) =>
          currentEnemies.map((enemy) => {
            if (
              !hit &&
              bullet.x > enemy.x &&
              bullet.x < enemy.x + enemy.width &&
              bullet.y > enemy.y &&
              bullet.y < enemy.y + enemy.height
            ) {
              hit = true;
              bulletHits.add(bullet.id);
              const newHp = enemy.hp - bullet.damage;
              if (newHp <= 0) {
                onEnemyKill();
                return { ...enemy, hp: 0 };
              }
              return { ...enemy, hp: newHp };
            }
            return enemy;
          })
        );
        if (!hit) {
          remainingBullets.push(bullet);
        }
      });

      return remainingBullets;
    });

    // Remove dead enemies
    setEnemies((prev) => prev.filter((e) => e.hp > 0));

    // Collision detection - enemy bullets hitting player
    setEnemyBullets((currentBullets) => {
      const remainingBullets: Bullet[] = [];

      currentBullets.forEach((bullet) => {
        setPlayer((currentPlayer) => {
          if (
            bullet.x > currentPlayer.x &&
            bullet.x < currentPlayer.x + currentPlayer.width &&
            bullet.y > currentPlayer.y &&
            bullet.y < currentPlayer.y + currentPlayer.height
          ) {
            const newHp = currentPlayer.hp - bullet.damage;
            if (newHp <= 0) {
              onGameOver();
              return { ...currentPlayer, hp: 0 };
            }
            return { ...currentPlayer, hp: newHp };
          }
          remainingBullets.push(bullet);
          return currentPlayer;
        });
      });

      return remainingBullets;
    });

    // Collision detection - enemies hitting player
    setEnemies((currentEnemies) => {
      currentEnemies.forEach((enemy) => {
        setPlayer((currentPlayer) => {
          if (
            enemy.x < currentPlayer.x + currentPlayer.width &&
            enemy.x + enemy.width > currentPlayer.x &&
            enemy.y < currentPlayer.y + currentPlayer.height &&
            enemy.y + enemy.height > currentPlayer.y
          ) {
            onGameOver();
            return { ...currentPlayer, hp: 0 };
          }
          return currentPlayer;
        });
      });
      return currentEnemies;
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, currentPlane, onEnemyKill, onGameOver]);

  // Start/stop game loop
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  // Draw game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw stars background
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < 50; i++) {
        const x = (i * 73) % CANVAS_WIDTH;
        const y = ((i * 47) + Date.now() * 0.02) % CANVAS_HEIGHT;
        ctx.fillRect(x, y, 1, 1);
      }

      // Draw player
      ctx.fillStyle = currentPlane.color;
      ctx.beginPath();
      ctx.moveTo(player.x + player.width / 2, player.y);
      ctx.lineTo(player.x + player.width, player.y + player.height);
      ctx.lineTo(player.x + player.width / 2, player.y + player.height - 10);
      ctx.lineTo(player.x, player.y + player.height);
      ctx.closePath();
      ctx.fill();

      // Draw player bullets
      ctx.fillStyle = '#ffff00';
      bullets.forEach((bullet) => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_SIZE, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw enemies
      enemies.forEach((enemy) => {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.moveTo(enemy.x + enemy.width / 2, enemy.y + enemy.height);
        ctx.lineTo(enemy.x + enemy.width, enemy.y);
        ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + 10);
        ctx.lineTo(enemy.x, enemy.y);
        ctx.closePath();
        ctx.fill();

        // Enemy HP bar
        const hpPercent = enemy.hp / enemy.maxHp;
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width, 4);
        ctx.fillStyle = hpPercent > 0.5 ? '#4CAF50' : hpPercent > 0.25 ? '#ff9800' : '#f44336';
        ctx.fillRect(enemy.x, enemy.y - 8, enemy.width * hpPercent, 4);
      });

      // Draw enemy bullets
      ctx.fillStyle = '#ff6666';
      enemyBullets.forEach((bullet) => {
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
      ctx.fillText(`HP: ${player.hp}/${player.maxHp}`, 15, CANVAS_HEIGHT - 13);

      if (isPlaying) {
        requestAnimationFrame(draw);
      }
    };

    draw();
  }, [isPlaying, player, bullets, enemies, enemyBullets, currentPlane]);

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
