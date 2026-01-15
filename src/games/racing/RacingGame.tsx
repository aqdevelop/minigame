import { useRef, useEffect, useState, useCallback } from 'react';
import { initRacingAudio, startRacingBgm, stopRacingBgm, playRacingSound, speakCountdown } from './racingSound';
import type { RacingCar } from './cars';
import './RacingGame.css';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const ROAD_WIDTH = 300;
const LANE_COUNT = 4;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;

interface EnemyCar {
  id: string;
  x: number;
  y: number;
  lane: number;
  speed: number;
  color: string;
}

interface Coin {
  id: string;
  x: number;
  y: number;
  lane: number;
}

interface RacingGameProps {
  currentCar: RacingCar;
  highScore: number;
  onGameEnd: (score: number) => void;
}

// Pixel art drawing helpers
const drawPixelRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
};

// Draw pixel car
const drawPixelCar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, _h: number, color: string, isPlayer = false) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const u = Math.floor(w / 10);

  const darker = adjustBrightness(color, -40);
  const lighter = adjustBrightness(color, 40);

  // Car body main
  drawPixelRect(ctx, px + u * 2, py + u * 1, u * 6, u * 13, color);
  drawPixelRect(ctx, px + u * 1, py + u * 3, u * 8, u * 9, color);

  // Front/Back bumpers
  drawPixelRect(ctx, px + u * 3, py, u * 4, u * 1, darker);
  drawPixelRect(ctx, px + u * 3, py + u * 14, u * 4, u * 1, darker);

  // Windows
  const windowColor = isPlayer ? '#66ccff' : '#333344';
  drawPixelRect(ctx, px + u * 3, py + u * 2, u * 4, u * 3, windowColor);
  drawPixelRect(ctx, px + u * 3, py + u * 10, u * 4, u * 2, windowColor);

  // Roof
  drawPixelRect(ctx, px + u * 3, py + u * 5, u * 4, u * 4, lighter);

  // Wheels
  drawPixelRect(ctx, px, py + u * 2, u * 2, u * 3, '#222');
  drawPixelRect(ctx, px + u * 8, py + u * 2, u * 2, u * 3, '#222');
  drawPixelRect(ctx, px, py + u * 10, u * 2, u * 3, '#222');
  drawPixelRect(ctx, px + u * 8, py + u * 10, u * 2, u * 3, '#222');

  // Wheel details
  drawPixelRect(ctx, px + u * 0.5, py + u * 3, u * 1, u * 1, '#444');
  drawPixelRect(ctx, px + u * 8.5, py + u * 3, u * 1, u * 1, '#444');
  drawPixelRect(ctx, px + u * 0.5, py + u * 11, u * 1, u * 1, '#444');
  drawPixelRect(ctx, px + u * 8.5, py + u * 11, u * 1, u * 1, '#444');

  // Headlights (front for player, back for enemies)
  if (isPlayer) {
    drawPixelRect(ctx, px + u * 2, py, u * 1, u * 1, '#ffff00');
    drawPixelRect(ctx, px + u * 7, py, u * 1, u * 1, '#ffff00');
  } else {
    drawPixelRect(ctx, px + u * 2, py + u * 14, u * 1, u * 1, '#ff0000');
    drawPixelRect(ctx, px + u * 7, py + u * 14, u * 1, u * 1, '#ff0000');
  }
};

// Draw pixel coin
const drawPixelCoin = (ctx: CanvasRenderingContext2D, x: number, y: number, time: number) => {
  const px = Math.floor(x);
  const py = Math.floor(y);
  const pulse = Math.sin(time / 100) * 2;

  // Outer glow
  ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(px + 10, py + 10, 14 + pulse, 0, Math.PI * 2);
  ctx.fill();

  // Coin body
  ctx.fillStyle = '#FFD700';
  ctx.beginPath();
  ctx.arc(px + 10, py + 10, 10, 0, Math.PI * 2);
  ctx.fill();

  // Inner shine
  ctx.fillStyle = '#FFEC8B';
  ctx.beginPath();
  ctx.arc(px + 8, py + 8, 4, 0, Math.PI * 2);
  ctx.fill();

  // Dollar sign
  ctx.fillStyle = '#B8860B';
  ctx.font = 'bold 12px monospace';
  ctx.fillText('$', px + 6, py + 14);
};

const adjustBrightness = (hex: string, amount: number): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

const ENEMY_COLORS = ['#ff4444', '#44ff44', '#4444ff', '#ff44ff', '#44ffff', '#ffff44'];

export const RacingGame = ({ currentCar, highScore, onGameEnd }: RacingGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const currentCarRef = useRef(currentCar);

  // Keep car ref updated
  useEffect(() => {
    currentCarRef.current = currentCar;
  }, [currentCar]);

  const gameRef = useRef({
    playerLane: 1,
    playerX: 0,
    targetX: 0,
    enemies: [] as EnemyCar[],
    coins: [] as Coin[],
    lastEnemySpawn: 0,
    lastCoinSpawn: 0,
    speed: 5,
    distance: 0,
    roadOffset: 0,
    score: 0,
  });

  const keysRef = useRef<Set<string>>(new Set());
  const touchRef = useRef<{ startX: number | null }>({ startX: null });
  const animationRef = useRef<number | undefined>(undefined);

  const getRoadX = () => (CANVAS_WIDTH - ROAD_WIDTH) / 2;
  const getLaneX = (lane: number) => getRoadX() + lane * LANE_WIDTH + LANE_WIDTH / 2 - PLAYER_WIDTH / 2;

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initRacingAudio();
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

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (gameState === 'playing') {
        if ((key === 'arrowleft' || key === 'a') && gameRef.current.playerLane > 0) {
          gameRef.current.playerLane--;
          gameRef.current.targetX = getLaneX(gameRef.current.playerLane);
        }
        if ((key === 'arrowright' || key === 'd') && gameRef.current.playerLane < LANE_COUNT - 1) {
          gameRef.current.playerLane++;
          gameRef.current.targetX = getLaneX(gameRef.current.playerLane);
        }
      }

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
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
  }, [gameState]);

  // Touch controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      touchRef.current.startX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (touchRef.current.startX === null || gameState !== 'playing') return;

      const currentX = e.touches[0].clientX;
      const diff = currentX - touchRef.current.startX;

      if (Math.abs(diff) > 30) {
        if (diff > 0 && gameRef.current.playerLane < LANE_COUNT - 1) {
          gameRef.current.playerLane++;
          gameRef.current.targetX = getLaneX(gameRef.current.playerLane);
        } else if (diff < 0 && gameRef.current.playerLane > 0) {
          gameRef.current.playerLane--;
          gameRef.current.targetX = getLaneX(gameRef.current.playerLane);
        }
        touchRef.current.startX = currentX;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      touchRef.current.startX = null;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('countdown');

    gameRef.current = {
      playerLane: 1,
      playerX: getLaneX(1),
      targetX: getLaneX(1),
      enemies: [],
      coins: [],
      lastEnemySpawn: 0,
      lastCoinSpawn: 0,
      speed: 5,
      distance: 0,
      roadOffset: 0,
      score: 0,
    };

    setScore(0);

    // Start countdown
    speakCountdown(() => {
      setGameState('playing');
      startRacingBgm();
    });
  }, []);

  const endGame = useCallback(() => {
    setGameState('gameover');
    stopRacingBgm();
    playRacingSound('crash');

    const finalScore = gameRef.current.score;
    onGameEnd(finalScore);
  }, [onGameEnd]);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const gameLoop = () => {
      const game = gameRef.current;
      const car = currentCarRef.current;
      const now = Date.now();

      // Clear canvas
      ctx.fillStyle = '#228B22'; // Green grass
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const roadX = getRoadX();

      // Update game logic when playing
      if (gameState === 'playing') {
        // Increase speed over time, multiplied by car's speed stat
        game.speed = (5 + game.distance / 5000) * car.speed;

        // Update road animation
        game.roadOffset = (game.roadOffset + game.speed) % 40;
        game.distance += game.speed;

        // Update score
        game.score = Math.floor(game.distance / 10);
        setScore(game.score);

        // Smooth player movement (affected by handling)
        const moveSpeed = 8 * car.handling;
        if (Math.abs(game.playerX - game.targetX) > moveSpeed) {
          game.playerX += game.playerX < game.targetX ? moveSpeed : -moveSpeed;
        } else {
          game.playerX = game.targetX;
        }

        // Spawn enemies
        const spawnInterval = Math.max(800, 1500 - game.distance / 100);
        if (now - game.lastEnemySpawn > spawnInterval) {
          game.lastEnemySpawn = now;
          const lane = Math.floor(Math.random() * LANE_COUNT);
          game.enemies.push({
            id: `enemy-${now}`,
            x: getLaneX(lane),
            y: -PLAYER_HEIGHT,
            lane,
            speed: game.speed * 0.7,
            color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)],
          });
        }

        // Spawn coins
        if (now - game.lastCoinSpawn > 2000) {
          game.lastCoinSpawn = now;
          const lane = Math.floor(Math.random() * LANE_COUNT);
          game.coins.push({
            id: `coin-${now}`,
            x: getLaneX(lane) + PLAYER_WIDTH / 2 - 10,
            y: -20,
            lane,
          });
        }

        // Move enemies
        game.enemies = game.enemies
          .map(e => ({ ...e, y: e.y + game.speed - e.speed }))
          .filter(e => e.y < CANVAS_HEIGHT + PLAYER_HEIGHT);

        // Move coins
        game.coins = game.coins
          .map(c => ({ ...c, y: c.y + game.speed }))
          .filter(c => c.y < CANVAS_HEIGHT + 20);

        // Collision with enemies
        const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 50;
        game.enemies.forEach(enemy => {
          if (
            game.playerX < enemy.x + PLAYER_WIDTH - 10 &&
            game.playerX + PLAYER_WIDTH - 10 > enemy.x &&
            playerY < enemy.y + PLAYER_HEIGHT - 10 &&
            playerY + PLAYER_HEIGHT - 10 > enemy.y
          ) {
            endGame();
          }
        });

        // Collect coins
        const remainingCoins: Coin[] = [];
        game.coins.forEach(coin => {
          if (
            game.playerX < coin.x + 20 &&
            game.playerX + PLAYER_WIDTH > coin.x &&
            playerY < coin.y + 20 &&
            playerY + PLAYER_HEIGHT > coin.y
          ) {
            game.score += 50;
            setScore(game.score);
            playRacingSound('coin');
          } else {
            remainingCoins.push(coin);
          }
        });
        game.coins = remainingCoins;
      }

      // Draw road
      ctx.fillStyle = '#333333';
      ctx.fillRect(roadX, 0, ROAD_WIDTH, CANVAS_HEIGHT);

      // Draw road edges
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(roadX - 5, 0, 5, CANVAS_HEIGHT);
      ctx.fillRect(roadX + ROAD_WIDTH, 0, 5, CANVAS_HEIGHT);

      // Draw lane markings
      ctx.fillStyle = '#ffffff';
      for (let i = 1; i < LANE_COUNT; i++) {
        const laneX = roadX + i * LANE_WIDTH - 2;
        for (let y = -40 + game.roadOffset; y < CANVAS_HEIGHT; y += 40) {
          ctx.fillRect(laneX, y, 4, 20);
        }
      }

      // Draw coins
      game.coins.forEach(coin => {
        drawPixelCoin(ctx, coin.x, coin.y, now);
      });

      // Draw enemies
      game.enemies.forEach(enemy => {
        drawPixelCar(ctx, enemy.x, enemy.y, PLAYER_WIDTH, PLAYER_HEIGHT, enemy.color, false);
      });

      // Draw player with current car color
      const playerY = CANVAS_HEIGHT - PLAYER_HEIGHT - 50;
      drawPixelCar(ctx, game.playerX, playerY, PLAYER_WIDTH, PLAYER_HEIGHT, car.color, true);

      // Draw UI
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`SCORE: ${game.score}`, 10, 25);
      ctx.fillText(`HIGH: ${highScore}`, 10, 45);

      // Speed indicator
      ctx.fillStyle = '#ffff00';
      ctx.font = '12px monospace';
      ctx.fillText(`SPEED: ${Math.floor(game.speed * 10)} km/h`, CANVAS_WIDTH - 120, 25);

      // Car name
      ctx.fillStyle = car.color;
      ctx.font = '10px monospace';
      ctx.fillText(car.nameKo, CANVAS_WIDTH - 120, 40);

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('GET READY!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        ctx.textAlign = 'left';
      }

      animationRef.current = requestAnimationFrame(gameLoop);
    };

    animationRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, highScore, endGame]);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      stopRacingBgm();
    };
  }, []);

  return (
    <div className="racing-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas racing-canvas"
      />

      {gameState === 'idle' && (
        <div className="game-overlay racing-overlay">
          <h2>RETRO RACING</h2>
          <p>← → OR SWIPE TO MOVE</p>
          <p>AVOID CARS & COLLECT COINS</p>
          <button className="start-button pixel-button" onClick={startGame}>
            START
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="game-overlay racing-overlay gameover">
          <h2>GAME OVER</h2>
          <p>SCORE: {score}</p>
          <p>+ 🪙 {score} COINS</p>
          {score >= highScore && score > 0 && <p className="new-record">NEW RECORD!</p>}
          <button className="start-button pixel-button" onClick={startGame}>
            RETRY
          </button>
        </div>
      )}
    </div>
  );
};

export default RacingGame;
