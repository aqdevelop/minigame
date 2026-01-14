export interface Plane {
  id: string;
  name: string;
  nameKo: string;
  speed: number;
  fireRate: number; // shots per second
  damage: number;
  requiredXP: number;
  color: string;
}

export interface Position {
  x: number;
  y: number;
}

export interface Bullet extends Position {
  id: string;
  damage: number;
  isEnemy: boolean;
}

export interface Enemy extends Position {
  id: string;
  hp: number;
  maxHp: number;
  speed: number;
  width: number;
  height: number;
  isBoss?: boolean;
}

export interface Player extends Position {
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  invincible?: number; // timestamp when invincibility ends
}

export interface GameState {
  score: number;
  xp: number;
  totalXP: number;
  currentPlaneIndex: number;
  isPlaying: boolean;
  isGameOver: boolean;
  highScore: number;
  stage: number;
  wave: number;
}
