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
  isPlaying,
  isGameOver,
  onStart,
  onReset,
}: GameUIProps) => {
  const progressPercent = nextPlane
    ? ((totalXP - currentPlane.requiredXP) / (nextPlane.requiredXP - currentPlane.requiredXP)) * 100
    : 100;

  return (
    <div className="game-ui">
      <div className="stats-panel">
        <h2>전투기 슈팅</h2>

        <div className="stat-item">
          <span className="stat-label">점수</span>
          <span className="stat-value">{score}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">최고 점수</span>
          <span className="stat-value highlight">{highScore}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label">총 XP</span>
          <span className="stat-value">{totalXP}</span>
        </div>

        <div className="plane-info">
          <h3>현재 전투기</h3>
          <div className="current-plane" style={{ borderColor: currentPlane.color }}>
            <span className="plane-name">{currentPlane.nameKo}</span>
            <span className="plane-stats">
              속도: {currentPlane.speed} | 공격력: {currentPlane.damage}
            </span>
          </div>
        </div>

        {nextPlane && (
          <div className="upgrade-progress">
            <h3>다음 전투기</h3>
            <div className="next-plane">{nextPlane.nameKo}</div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="xp-remaining">{xpToNextPlane} XP 필요</span>
          </div>
        )}

        <div className="plane-list">
          <h3>전투기 목록</h3>
          {PLANES.map((plane) => (
            <div
              key={plane.id}
              className={`plane-item ${totalXP >= plane.requiredXP ? 'unlocked' : 'locked'}`}
              style={{ borderLeftColor: plane.color }}
            >
              <span className="plane-item-name">{plane.nameKo}</span>
              <span className="plane-item-xp">
                {totalXP >= plane.requiredXP ? '해금됨' : `${plane.requiredXP} XP`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="controls">
        {!isPlaying && (
          <button className="btn btn-start" onClick={onStart}>
            {isGameOver ? '다시 시작' : '게임 시작'}
          </button>
        )}
        <button className="btn btn-reset" onClick={onReset}>
          진행 초기화
        </button>
      </div>

      {isGameOver && (
        <div className="game-over-message">
          <h2>게임 오버!</h2>
          <p>획득 점수: {score}</p>
          <p>획득 XP: {score * 5}</p>
        </div>
      )}
    </div>
  );
};
