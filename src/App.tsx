import { useState } from 'react';
import type { GameState } from './types';
import { newGameState } from './deck';
import bidPhase from './gui/bidPhase';
import playPhase from './gui/playPhase';
import cleanUpPhase from './gui/cleanUpPhase';
import banner from './gui/banner';

export default function BridgeGame() {

  const [gameState, setGameState] = useState(newGameState as GameState);

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        {banner(gameState, setGameState)}
        {gameState.phase === 'bidding' && bidPhase(gameState, setGameState)}
        {gameState.phase === 'play' && playPhase(gameState, setGameState)}
        {gameState.phase === 'cleanup' && cleanUpPhase(gameState, setGameState)}
      </div>
    </div>
  );
}