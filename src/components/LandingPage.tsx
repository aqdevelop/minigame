import './LandingPage.css';

interface LandingPageProps {
  onPlayGame: () => void;
}

export const LandingPage = ({ onPlayGame }: LandingPageProps) => {
  return (
    <div className="landing-page">
      <div className="landing-content">
        <h1 className="landing-title">
          <span className="title-junwoo">준우</span>
          <span className="title-games">GAMES</span>
        </h1>

        <div className="game-list">
          <button className="game-card" onClick={onPlayGame}>
            <div className="game-icon">✈</div>
            <div className="game-info">
              <h2>FIGHTER</h2>
              <p>전투기 슈팅 게임</p>
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
