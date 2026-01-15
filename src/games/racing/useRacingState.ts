import { useState, useEffect, useCallback } from 'react';
import { RACING_CARS, COIN_PER_SCORE } from './cars';

const STORAGE_KEY = 'racing-game-state';

interface RacingState {
  coins: number;
  totalCoins: number;
  currentCarIndex: number;
  unlockedCars: string[];
  highScore: number;
}

const getInitialState = (): RacingState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      coins: parsed.coins || 0,
      totalCoins: parsed.totalCoins || 0,
      currentCarIndex: parsed.currentCarIndex || 0,
      unlockedCars: parsed.unlockedCars || ['basic'],
      highScore: parsed.highScore || 0,
    };
  }
  return {
    coins: 0,
    totalCoins: 0,
    currentCarIndex: 0,
    unlockedCars: ['basic'],
    highScore: 0,
  };
};

export const useRacingState = () => {
  const [state, setState] = useState<RacingState>(getInitialState);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addCoins = useCallback((score: number) => {
    const coinsEarned = Math.floor(score * COIN_PER_SCORE);
    setState(prev => ({
      ...prev,
      coins: prev.coins + coinsEarned,
      totalCoins: prev.totalCoins + coinsEarned,
    }));
    return coinsEarned;
  }, []);

  const updateHighScore = useCallback((score: number) => {
    setState(prev => ({
      ...prev,
      highScore: Math.max(prev.highScore, score),
    }));
  }, []);

  const buyCar = useCallback((carId: string): boolean => {
    const car = RACING_CARS.find(c => c.id === carId);
    if (!car) return false;
    if (state.unlockedCars.includes(carId)) return false;
    if (state.coins < car.price) return false;

    setState(prev => ({
      ...prev,
      coins: prev.coins - car.price,
      unlockedCars: [...prev.unlockedCars, carId],
    }));
    return true;
  }, [state.coins, state.unlockedCars]);

  const selectCar = useCallback((carIndex: number) => {
    const car = RACING_CARS[carIndex];
    if (!car) return;
    if (!state.unlockedCars.includes(car.id)) return;

    setState(prev => ({
      ...prev,
      currentCarIndex: carIndex,
    }));
  }, [state.unlockedCars]);

  const resetProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      coins: 0,
      totalCoins: 0,
      currentCarIndex: 0,
      unlockedCars: ['basic'],
      highScore: 0,
    });
  }, []);

  const currentCar = RACING_CARS[state.currentCarIndex];

  return {
    state,
    currentCar,
    addCoins,
    updateHighScore,
    buyCar,
    selectCar,
    resetProgress,
  };
};
