import './LandingPage.css';

interface LandingPageProps {
  onSelectGame: (game: 'fighter' | 'racing' | 'runner' | 'airmission') => void;
}

export const LandingPage = ({ onSelectGame }: LandingPageProps) => {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1 className="landing-title">
          <span className="title-junwoo">준우</span>
          <span className="title-games">GAMES</span>
        </h1>

        <div className="game-list">
          <button className="game-card" onClick={() => onSelectGame('fighter')}>
            <div className="game-icon">✈</div>
            <div className="game-info">
              <h2>FIGHTER</h2>
              <p>전투기 슈팅 게임</p>
            </div>
            <div className="play-arrow">▶</div>
          </button>

          <button className="game-card racing-card" onClick={() => onSelectGame('racing')}>
            <div className="game-icon">🏎</div>
            <div className="game-info">
              <h2>RACING</h2>
              <p>레트로 레이싱 게임</p>
            </div>
            <div className="play-arrow">▶</div>
          </button>

          <button className="game-card runner-card" onClick={() => onSelectGame('runner')}>
            <div className="game-icon">🟦</div>
            <div className="game-info">
              <h2>RUNNER</h2>
              <p>지오메트리 점프 게임</p>
            </div>
            <div className="play-arrow">▶</div>
          </button>

          <button className="game-card airmission-card" onClick={() => onSelectGame('airmission')}>
            <div className="game-icon">🎯</div>
            <div className="game-info">
              <h2>AIR MISSION</h2>
              <p>전투기 미션 슈팅 게임</p>
            </div>
            <div className="play-arrow">▶</div>
          </button>
        </div>

        <div className="landing-footer">
          <p>MORE GAMES COMING SOON...</p>
        </div>
      </div>
    </div>
  );
};
