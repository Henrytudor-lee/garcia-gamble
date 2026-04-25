'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  GameState,
  GameConfig,
  GameAction,
  initGame,
  startNewHand,
  executePlayerAction,
  executeAIAction,
  getAvailableActions,
  getOpponentInfo,
  DEFAULT_CONFIG
} from './gameState';

interface GameContextType {
  gameState: GameState;
  config: GameConfig;
  setConfig: (config: GameConfig) => void;
  startGame: (overrideConfig?: GameConfig) => void;
  startNextHand: () => void;
  playerAction: (action: GameAction) => void;
  runAIAction: () => void;
  availableActions: ReturnType<typeof getAvailableActions> | null;
  opponentInfo: ReturnType<typeof getOpponentInfo>;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState>(() => initGame(DEFAULT_CONFIG));
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const startGame = useCallback((overrideConfig?: GameConfig) => {
    const cfg = overrideConfig || config;
    const newState = initGame(cfg);
    setGameState(startNewHand(newState));
  }, [config]);

  const startNextHand = useCallback(() => {
    setGameState(prev => {
      // Deep clone to avoid players array reference sharing
      const deepCopy = JSON.parse(JSON.stringify(prev));
      return startNewHand({ ...deepCopy, config });
    });
  }, [config]);

  const playerAction = useCallback((action: GameAction) => {
    setGameState(prev => {
      const newState = executePlayerAction({ ...prev }, action);
      return { ...newState };
    });
  }, []);

  const runAIAction = useCallback(() => {
    setGameState(prev => {
      if (prev.isPlayerTurn || prev.phase === 'END' || prev.phase === 'SETUP') {
        return prev;
      }
      return executeAIAction({ ...prev });
    });
  }, []);

  const resetGame = useCallback(() => {
    setGameState(initGame(DEFAULT_CONFIG));
    setConfig(DEFAULT_CONFIG);
  }, []);

  const opponentInfo = getOpponentInfo(gameState);
  const availableActions = gameState.phase !== 'SETUP' && gameState.phase !== 'END' && gameState.phase !== 'SHOWDOWN'
    ? getAvailableActions(gameState)
    : null;

  return (
    <GameContext.Provider value={{
      gameState,
      config,
      setConfig,
      startGame,
      startNextHand,
      playerAction,
      runAIAction,
      availableActions,
      opponentInfo,
      resetGame
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
