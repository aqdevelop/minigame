import { useRef, useEffect, useState, useCallback } from 'react';
import { initRunnerAudio, startRunnerBgm, stopRunnerBgm, playRunnerSound, speakRunnerCountdown } from './runnerSound';
import './RunnerGame.css';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const GROUND_Y = CANVAS_HEIGHT - 60;
const PLAYER_SIZE = 40;
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const GAME_SPEED_INITIAL = 6;
const GAME_SPEED_MAX = 15;

interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'double_spike' | 'tall_block';
}

// Draw player cube (Geometry Dash style)
const drawPlayer = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, isJumping: boolean) => {
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(rotation);

  // Main cube body
  const gradient = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
  gradient.addColorStop(0, '#00ffff');
  gradient.addColorStop(1, '#0088ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(-size / 2, -size / 2, size, size);

  // Inner square
  ctx.fillStyle = '#001133';
  ctx.fillRect(-size / 3, -size / 3, size / 1.5, size / 1.5);

  // Eye
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, -size / 4, size / 4, size / 4);
  ctx.fillStyle = '#000000';
  ctx.fillRect(size / 6, -size / 5, size / 8, size / 6);

  // Glow effect when jumping
  if (isJumping) {
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-size / 2 - 3, -size / 2 - 3, size + 6, size + 6);
  }

  ctx.restore();
};

// Draw spike obstacle
const drawSpike = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.moveTo(x, y + height);
  ctx.lineTo(x + width / 2, y);
  ctx.lineTo(x + width, y + height);
  ctx.closePath();
  ctx.fill();

  // Highlight
  ctx.fillStyle = '#ff8888';
  ctx.beginPath();
  ctx.moveTo(x + width * 0.3, y + height);
  ctx.lineTo(x + width / 2, y + height * 0.3);
  ctx.lineTo(x + width * 0.5, y + height);
  ctx.closePath();
  ctx.fill();
};

// Draw block obstacle
const drawBlock = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  // Main block
  ctx.fillStyle = '#8844ff';
  ctx.fillRect(x, y, width, height);

  // Highlight
  ctx.fillStyle = '#aa66ff';
  ctx.fillRect(x, y, width, 4);
  ctx.fillRect(x, y, 4, height);

  // Shadow
  ctx.fillStyle = '#6622cc';
  ctx.fillRect(x + width - 4, y, 4, height);
  ctx.fillRect(x, y + height - 4, width, 4);

  // Inner pattern
  ctx.fillStyle = '#7733ee';
  ctx.fillRect(x + 8, y + 8, width - 16, height - 16);
};

export const RunnerGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('runner-high-score');
    return saved ? parseInt(saved) : 0;
  });

  const gameRef = useRef({
    playerY: GROUND_Y - PLAYER_SIZE,
    playerVelocity: 0,
    isJumping: false,
    rotation: 0,
    obstacles: [] as Obstacle[],
    lastObstacleSpawn: 0,
    gameSpeed: GAME_SPEED_INITIAL,
    distance: 0,
    groundOffset: 0,
    bgOffset: 0,
  });

  const keysRef = useRef<Set<string>>(new Set());
  const animationRef = useRef<number | undefined>(undefined);

  // Initialize audio on first interaction
  useEffect(() => {
    const handleInteraction = () => {
      initRunnerAudio();
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

  // Handle jump
  const jump = useCallback(() => {
    const game = gameRef.current;
    if (!game.isJumping && game.playerY >= GROUND_Y - PLAYER_SIZE - 1) {
      game.playerVelocity = JUMP_FORCE;
      game.isJumping = true;
      playRunnerSound('jump');
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (gameState === 'playing') {
        if (key === ' ' || key === 'arrowup' || key === 'w') {
          e.preventDefault();
          jump();
        }
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
  }, [gameState, jump]);

  // Touch/click controls
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouch = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (gameState === 'playing') {
        jump();
      }
    };

    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('mousedown', handleTouch);

    return () => {
      canvas.removeEventListener('touchstart', handleTouch);
      canvas.removeEventListener('mousedown', handleTouch);
    };
  }, [gameState, jump]);

  const startGame = useCallback(() => {
    setGameState('countdown');

    gameRef.current = {
      playerY: GROUND_Y - PLAYER_SIZE,
      playerVelocity: 0,
      isJumping: false,
      rotation: 0,
      obstacles: [],
      lastObstacleSpawn: 0,
      gameSpeed: GAME_SPEED_INITIAL,
      distance: 0,
      groundOffset: 0,
      bgOffset: 0,
    };

    setScore(0);

    speakRunnerCountdown(() => {
      setGameState('playing');
      startRunnerBgm();
    });
  }, []);

  const endGame = useCallback(() => {
    setGameState('gameover');
    stopRunnerBgm();
    playRunnerSound('death');

    const finalScore = Math.floor(gameRef.current.distance / 10);
    setScore(finalScore);

    if (finalScore > highScore) {
      setHighScore(finalScore);
      localStorage.setItem('runner-high-score', finalScore.toString());
    }
  }, [highScore]);

  // Generate obstacle
  const spawnObstacle = useCallback(() => {
    const game = gameRef.current;
    const types: Obstacle['type'][] = ['spike', 'block', 'double_spike', 'tall_block'];
    const type = types[Math.floor(Math.random() * types.length)];

    let obstacle: Obstacle;

    switch (type) {
      case 'spike':
        obstacle = {
          id: `obs-${Date.now()}`,
          x: CANVAS_WIDTH + 50,
          y: GROUND_Y - 35,
          width: 35,
          height: 35,
          type: 'spike',
        };
        break;
      case 'double_spike':
        obstacle = {
          id: `obs-${Date.now()}`,
          x: CANVAS_WIDTH + 50,
          y: GROUND_Y - 35,
          width: 70,
          height: 35,
          type: 'double_spike',
        };
        break;
      case 'block':
        obstacle = {
          id: `obs-${Date.now()}`,
          x: CANVAS_WIDTH + 50,
          y: GROUND_Y - 40,
          width: 40,
          height: 40,
          type: 'block',
        };
        break;
      case 'tall_block':
        obstacle = {
          id: `obs-${Date.now()}`,
          x: CANVAS_WIDTH + 50,
          y: GROUND_Y - 80,
          width: 40,
          height: 80,
          type: 'tall_block',
        };
        break;
    }

    game.obstacles.push(obstacle);
  }, []);

  // Main game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gameLoop = () => {
      const game = gameRef.current;

      // Draw background gradient
      const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
      bgGradient.addColorStop(0, '#1a0033');
      bgGradient.addColorStop(0.5, '#330066');
      bgGradient.addColorStop(1, '#1a0033');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw moving background stars/particles
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 0; i < 20; i++) {
        const starX = ((i * 73 + game.bgOffset * 0.5) % (CANVAS_WIDTH + 20)) - 10;
        const starY = (i * 37) % CANVAS_HEIGHT;
        ctx.fillRect(starX, starY, 2, 2);
      }

      if (gameState === 'playing') {
        // Increase speed over time
        game.gameSpeed = Math.min(GAME_SPEED_MAX, GAME_SPEED_INITIAL + game.distance / 2000);

        // Update distance
        game.distance += game.gameSpeed;
        setScore(Math.floor(game.distance / 10));

        // Update background offset
        game.bgOffset += game.gameSpeed * 0.5;
        game.groundOffset = (game.groundOffset + game.gameSpeed) % 40;

        // Apply gravity
        game.playerVelocity += GRAVITY;
        game.playerY += game.playerVelocity;

        // Ground collision
        if (game.playerY >= GROUND_Y - PLAYER_SIZE) {
          game.playerY = GROUND_Y - PLAYER_SIZE;
          game.playerVelocity = 0;
          game.isJumping = false;
        }

        // Rotate player when jumping
        if (game.isJumping) {
          game.rotation += 0.15;
        } else {
          // Snap rotation to nearest 90 degrees
          game.rotation = Math.round(game.rotation / (Math.PI / 2)) * (Math.PI / 2);
        }

        // Spawn obstacles
        const spawnInterval = Math.max(800, 1500 - game.distance / 50);
        const now = Date.now();
        if (now - game.lastObstacleSpawn > spawnInterval) {
          game.lastObstacleSpawn = now;
          spawnObstacle();
        }

        // Move obstacles
        game.obstacles = game.obstacles
          .map(obs => ({ ...obs, x: obs.x - game.gameSpeed }))
          .filter(obs => obs.x > -100);

        // Collision detection
        const playerLeft = 80;
        const playerRight = playerLeft + PLAYER_SIZE - 10;
        const playerTop = game.playerY + 5;
        const playerBottom = game.playerY + PLAYER_SIZE - 5;

        for (const obs of game.obstacles) {
          let obsLeft = obs.x;
          let obsRight = obs.x + obs.width;
          let obsTop = obs.y;
          let obsBottom = obs.y + obs.height;

          // Adjust hitbox for spikes (triangle shape)
          if (obs.type === 'spike' || obs.type === 'double_spike') {
            obsLeft += 5;
            obsRight -= 5;
            obsTop += 10;
          }

          if (
            playerRight > obsLeft &&
            playerLeft < obsRight &&
            playerBottom > obsTop &&
            playerTop < obsBottom
          ) {
            endGame();
            break;
          }
        }
      }

      // Draw ground
      ctx.fillStyle = '#222233';
      ctx.fillRect(0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

      // Draw ground pattern
      ctx.fillStyle = '#333344';
      for (let x = -game.groundOffset; x < CANVAS_WIDTH; x += 40) {
        ctx.fillRect(x, GROUND_Y, 20, 4);
      }

      // Draw ground line
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(0, GROUND_Y - 2, CANVAS_WIDTH, 4);

      // Draw obstacles
      game.obstacles.forEach(obs => {
        if (obs.type === 'spike') {
          drawSpike(ctx, obs.x, obs.y, obs.width, obs.height);
        } else if (obs.type === 'double_spike') {
          drawSpike(ctx, obs.x, obs.y, obs.width / 2, obs.height);
          drawSpike(ctx, obs.x + obs.width / 2, obs.y, obs.width / 2, obs.height);
        } else {
          drawBlock(ctx, obs.x, obs.y, obs.width, obs.height);
        }
      });

      // Draw player
      drawPlayer(ctx, 80, game.playerY, PLAYER_SIZE, game.rotation, game.isJumping);

      // Draw UI
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`SCORE: ${Math.floor(game.distance / 10)}`, 10, 30);
      ctx.fillText(`BEST: ${highScore}`, 10, 55);

      // Speed indicator
      ctx.fillStyle = '#00ffff';
      ctx.font = '14px monospace';
      ctx.fillText(`SPEED: ${game.gameSpeed.toFixed(1)}x`, CANVAS_WIDTH - 110, 30);

      // Countdown overlay
      if (gameState === 'countdown') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#00ffff';
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
  }, [gameState, highScore, endGame, spawnObstacle]);

  // Cleanup BGM on unmount
  useEffect(() => {
    return () => {
      stopRunnerBgm();
    };
  }, []);

  return (
    <div className="runner-game">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="game-canvas runner-canvas"
      />

      {gameState === 'idle' && (
        <div className="game-overlay runner-overlay">
          <h2>GEOMETRY RUNNER</h2>
          <p>PRESS SPACE OR TAP TO JUMP</p>
          <p>AVOID OBSTACLES!</p>
          <button className="start-button pixel-button" onClick={startGame}>
            START
          </button>
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="game-overlay runner-overlay gameover">
          <h2>GAME OVER</h2>
          <p>SCORE: {score}</p>
          {score >= highScore && score > 0 && <p className="new-record">NEW BEST!</p>}
          <button className="start-button pixel-button" onClick={startGame}>
            RETRY
          </button>
        </div>
      )}
    </div>
  );
};

export default RunnerGame;
