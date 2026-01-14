import { useState, useEffect, useCallback } from 'react';
import type { GameState } from '../types/game';
import { PLANES, XP_PER_KILL } from '../constants/planes';

const STORAGE_KEY = 'fighter-game-state';

const getInitialState = (): GameState => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    return {
      score: 0,
      xp: 0,
      totalXP: parsed.totalXP || 0,
      currentPlaneIndex: parsed.currentPlaneIndex || 0,
      isPlaying: false,
      isGameOver: false,
      highScore: parsed.highScore || 0,
      stage: parsed.stage || 1,
      wave: parsed.wave || 1,
    };
  }
  return {
    score: 0,
    xp: 0,
    totalXP: 0,
    currentPlaneIndex: 0,
    isPlaying: false,
    isGameOver: false,
    highScore: 0,
    stage: 1,
    wave: 1,
  };
};

export const useGameState = () => {
  const [state, setState] = useState<GameState>(getInitialState);

  useEffect(() => {
    const toSave = {
      totalXP: state.totalXP,
      currentPlaneIndex: state.currentPlaneIndex,
      highScore: state.highScore,
      stage: state.stage,
      wave: state.wave,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [state.totalXP, state.currentPlaneIndex, state.highScore, state.stage, state.wave]);

  const addXP = useCallback((amount: number = XP_PER_KILL) => {
    setState((prev) => {
      const newTotalXP = prev.totalXP + amount;
      let newPlaneIndex = prev.currentPlaneIndex;

      // Check for plane upgrades
      for (let i = prev.currentPlaneIndex + 1; i < PLANES.length; i++) {
        if (newTotalXP >= PLANES[i].requiredXP) {
          newPlaneIndex = i;
        } else {
          break;
        }
      }

      return {
        ...prev,
        xp: prev.xp + amount,
        totalXP: newTotalXP,
        currentPlaneIndex: newPlaneIndex,
        score: prev.score + 1,
      };
    });
  }, []);

  const addBossXP = useCallback(() => {
    const amount = XP_PER_KILL * 20; // Boss gives 100 XP
    setState((prev) => {
      const newTotalXP = prev.totalXP + amount;
      let newPlaneIndex = prev.currentPlaneIndex;

      for (let i = prev.currentPlaneIndex + 1; i < PLANES.length; i++) {
        if (newTotalXP >= PLANES[i].requiredXP) {
          newPlaneIndex = i;
        } else {
          break;
        }
      }

      return {
        ...prev,
        xp: prev.xp + amount,
        totalXP: newTotalXP,
        currentPlaneIndex: newPlaneIndex,
        score: prev.score + 10,
      };
    });
  }, []);

  const nextWave = useCallback(() => {
    setState((prev) => ({
      ...prev,
      wave: prev.wave + 1,
    }));
  }, []);

  const nextStage = useCallback(() => {
    setState((prev) => ({
      ...prev,
      stage: prev.stage + 1,
      wave: 1,
    }));
  }, []);

  const startGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      score: 0,
      xp: 0,
      // stage와 wave는 저장된 값 유지 (게임 오버 후에도 같은 스테이지에서 재시작)
      isPlaying: true,
      isGameOver: false,
    }));
  }, []);

  const endGame = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isGameOver: true,
      highScore: Math.max(prev.highScore, prev.score),
    }));
  }, []);

  const resetProgress = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      score: 0,
      xp: 0,
      totalXP: 0,
      currentPlaneIndex: 0,
      isPlaying: false,
      isGameOver: false,
      highScore: 0,
      stage: 1,
      wave: 1,
    });
  }, []);

  const currentPlane = PLANES[state.currentPlaneIndex];
  const nextPlane = PLANES[state.currentPlaneIndex + 1] || null;
  const xpToNextPlane = nextPlane ? nextPlane.requiredXP - state.totalXP : 0;

  return {
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
  };
};
