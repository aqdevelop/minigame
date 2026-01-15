import { RACING_CARS } from './cars';
import type { RacingCar } from './cars';
import './RacingUI.css';

interface RacingUIProps {
  coins: number;
  totalCoins: number;
  currentCar: RacingCar;
  unlockedCars: string[];
  highScore: number;
  onBuyCar: (carId: string) => boolean;
  onSelectCar: (index: number) => void;
  onReset: () => void;
}

export const RacingUI = ({
  coins,
  totalCoins,
  currentCar,
  unlockedCars,
  highScore,
  onBuyCar,
  onSelectCar,
  onReset,
}: RacingUIProps) => {
  return (
    <div className="racing-ui pixel-ui">
      <h2>SHOP</h2>

      <div className="racing-stats">
        <div className="stat-row">
          <span className="stat-label">COINS</span>
          <span className="stat-value coins">🪙 {coins}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">HIGH SCORE</span>
          <span className="stat-value">{highScore}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">TOTAL EARNED</span>
          <span className="stat-value">{totalCoins}</span>
        </div>
      </div>

      <div className="current-car-section">
        <h3>CURRENT CAR</h3>
        <div className="current-car-display" style={{ borderColor: currentCar.color }}>
          <div className="car-color-box" style={{ backgroundColor: currentCar.color }} />
          <div className="car-details">
            <span className="car-name">{currentCar.nameKo}</span>
            <span className="car-stats">
              SPD: {currentCar.speed.toFixed(1)}x | HND: {currentCar.handling.toFixed(1)}x
            </span>
          </div>
        </div>
      </div>

      <div className="shop-section">
        <h3>CARS</h3>
        <div className="car-list">
          {RACING_CARS.map((car, index) => {
            const isUnlocked = unlockedCars.includes(car.id);
            const isSelected = currentCar.id === car.id;
            const canAfford = coins >= car.price;

            return (
              <div
                key={car.id}
                className={`car-item ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`}
                style={{ borderLeftColor: car.color }}
              >
                <div className="car-item-info">
                  <span className="car-item-name">{car.nameKo}</span>
                  <span className="car-item-stats">
                    SPD:{car.speed.toFixed(1)} HND:{car.handling.toFixed(1)}
                  </span>
                </div>
                <div className="car-item-action">
                  {isUnlocked ? (
                    isSelected ? (
                      <span className="equipped-badge">EQUIPPED</span>
                    ) : (
                      <button
                        className="select-btn"
                        onClick={() => onSelectCar(index)}
                      >
                        SELECT
                      </button>
                    )
                  ) : (
                    <button
                      className={`buy-btn ${canAfford ? '' : 'disabled'}`}
                      onClick={() => canAfford && onBuyCar(car.id)}
                      disabled={!canAfford}
                    >
                      🪙 {car.price}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button className="reset-btn" onClick={onReset}>
        RESET ALL
      </button>
    </div>
  );
};
