import './App.css';
import { FighterGame } from './games/fighter';
import { GameUI } from './components/GameUI';
import { VersionBadge } from './components/VersionBadge';
import { useGameState } from './hooks/useGameState';

function App() {
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>FIGHTER MINIGAME</h1>
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
