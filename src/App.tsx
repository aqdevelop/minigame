import { useState } from 'react';
import './App.css';
import { FighterGame } from './games/fighter';
import { RacingGame, RacingUI, useRacingState } from './games/racing';
import { GameUI } from './components/GameUI';
import { VersionBadge } from './components/VersionBadge';
import { LandingPage } from './components/LandingPage';
import { useGameState } from './hooks/useGameState';

type PageType = 'landing' | 'fighter' | 'racing';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');

  const {
    state,
    currentPlane,
    nextPlane,
    xpToNextPlane,
    addXP,
    addBossXP,
    nextWave,
    nextStage,
    startGame,
    endGame,
    resetProgress,
  } = useGameState();

  const {
    state: racingState,
    currentCar,
    addCoins,
    updateHighScore,
    buyCar,
    selectCar,
    resetProgress: resetRacingProgress,
  } = useRacingState();

  const handleBackToHome = () => {
    setCurrentPage('landing');
  };

  const handleSelectGame = (game: 'fighter' | 'racing') => {
    setCurrentPage(game);
  };

  const handleRacingGameEnd = (score: number) => {
    addCoins(score);
    updateHighScore(score);
  };

  if (currentPage === 'landing') {
    return (
      <>
        <LandingPage onSelectGame={handleSelectGame} />
        <VersionBadge />
      </>
    );
  }

  if (currentPage === 'racing') {
    return (
      <div className="app">
        <header className="app-header racing-header">
          <button className="back-button" onClick={handleBackToHome}>
            ← HOME
          </button>
          <h1>RACING</h1>
        </header>

        <main className="app-main">
          <RacingGame
            currentCar={currentCar}
            highScore={racingState.highScore}
            onGameEnd={handleRacingGameEnd}
          />

          <RacingUI
            coins={racingState.coins}
            totalCoins={racingState.totalCoins}
            currentCar={currentCar}
            unlockedCars={racingState.unlockedCars}
            highScore={racingState.highScore}
            onBuyCar={buyCar}
            onSelectCar={selectCar}
            onReset={resetRacingProgress}
          />
        </main>

        <VersionBadge />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <button className="back-button" onClick={handleBackToHome}>
          ← HOME
        </button>
        <h1>FIGHTER</h1>
      </header>

      <main className="app-main">
        <FighterGame
          isPlaying={state.isPlaying}
          currentPlane={currentPlane}
          score={state.score}
          stage={state.stage}
          wave={state.wave}
          onEnemyKill={addXP}
          onBossKill={addBossXP}
          onNextWave={nextWave}
          onNextStage={nextStage}
          onGameOver={endGame}
        />

        <GameUI
          score={state.score}
          totalXP={state.totalXP}
          currentPlane={currentPlane}
          nextPlane={nextPlane}
          xpToNextPlane={xpToNextPlane}
          highScore={state.highScore}
          stage={state.stage}
          wave={state.wave}
          isPlaying={state.isPlaying}
          isGameOver={state.isGameOver}
          onStart={startGame}
          onReset={resetProgress}
        />
      </main>

      <VersionBadge />
    </div>
  );
}

export default App;
