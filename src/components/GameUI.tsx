import type { Plane } from '../types/game';
import { PLANES } from '../constants/planes';
import './GameUI.css';

interface GameUIProps {
  score: number;
  totalXP: number;
  currentPlane: Plane;
  nextPlane: Plane | null;
  xpToNextPlane: number;
  highScore: number;
  stage: number;
  wave: number;
  isPlaying: boolean;
  isGameOver: boolean;
  onStart: () => void;
  onReset: () => void;
}

export const GameUI = ({
  score,
  totalXP,
  currentPlane,
  nextPlane,
  xpToNextPlane,
  highScore,
  stage,
  wave,
  isPlaying,
  isGameOver,
  onStart,
  onReset,
}: GameUIProps) => {
  const progressPercent = nextPlane
    ? ((totalXP - currentPlane.requiredXP) / (nextPlane.requiredXP - currentPlane.requiredXP)) * 100
    : 100;

  return (
    <div className="game-ui pixel-ui">
      <div className="stats-panel">
        <h2>FIGHTER</h2>

        <div className="stage-info">
          <span className="stage-label">STAGE {stage}</span>
          <span className="wave-label">WAVE {wave}/5</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">SCORE</span>
          <span className="stat-value">{score}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">HIGH</span>
          <span className="stat-value highlight">{highScore}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">XP</span>
          <span className="stat-value">{totalXP}</span>
        </div>

        <div className="plane-info">
          <h3>CURRENT</h3>
          <div className="current-plane" style={{ borderColor: currentPlane.color }}>
            <span className="plane-name">{currentPlane.nameKo}</span>
            <span className="plane-stats">
              SPD:{currentPlane.speed} ATK:{currentPlane.damage}
            </span>
          </div>
        </div>

        {nextPlane && (
          <div className="upgrade-progress">
            <h3>NEXT</h3>
            <div className="next-plane">{nextPlane.nameKo}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="xp-remaining">{xpToNextPlane} XP</span>
          </div>
        )}

        <div className="plane-list">
          <h3>PLANES</h3>
          {PLANES.map((plane) => (
            <div
              key={plane.id}
              className={`plane-item ${totalXP >= plane.requiredXP ? 'unlocked' : 'locked'}`}
              style={{ borderLeftColor: plane.color }}
            >
              <span className="plane-item-name">{plane.nameKo}</span>
              <span className="plane-item-xp">
                {totalXP >= plane.requiredXP ? 'OK' : `${plane.requiredXP}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="controls">
        {!isPlaying && (
          <button className="btn btn-start pixel-btn" onClick={onStart}>
            {isGameOver ? 'RETRY' : 'START'}
          </button>
        )}
        <button className="btn btn-reset pixel-btn" onClick={onReset}>
          RESET
        </button>
      </div>

      {isGameOver && (
        <div className="game-over-message pixel-message">
          <h2>GAME OVER</h2>
          <p>SCORE: {score}</p>
          <p>XP: +{score * 5}</p>
        </div>
      )}
    </div>
  );
};
