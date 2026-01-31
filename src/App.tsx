import { useState } from 'react';
import {
  BID_LEVELS, BID_STRAINS,
  POSITIONS, SUITS
} from './types';
import type { Card, GameState, Position } from './types';
import { newGame, newGameState, newHand } from './deck';
import {
  bidOrPass, canDouble, canRedouble,
  double, isValidBid, redouble,
} from './bidding';
import { playCard } from './play';

export default function BridgeGame() {

  const [gameState, setGameState] = useState(newGameState as GameState);

  const renderHand = (position: Position, isVertical = false) => {
    const hand = gameState.hands[position];
    const isDummyPlayer = gameState.dummy.position === position;
    const isCurrentPlayer = gameState.activePlayer === position;
    const shouldShowCards = (isDummyPlayer && gameState.dummy.visible) || isCurrentPlayer;

    if (!shouldShowCards) {
      return (
        <div className="text-center">
          <div className="bg-blue-900 text-white px-3 py-1 rounded text-xs">
            {hand.length} cards
          </div>
        </div>
      );
    }

    // Group by suit
    const bySuit: Card[][] = [[], [], [], []]; // 2d array of cards, in Spade, heart, club, diamond order
    hand.forEach(card => bySuit[SUITS.indexOf(card.suit)].push(card));

    if (isVertical) {
      // For vertical (West/East), show 2 suits per row
      const rows = [
        [{ suit: '♠', cards: bySuit[SUITS.indexOf('♠')] }, { suit: '♥', cards: bySuit[SUITS.indexOf('♥')] }],
        [{ suit: '♦', cards: bySuit[SUITS.indexOf('♦')] }, { suit: '♣', cards: bySuit[SUITS.indexOf('♣')] }]
      ];

      return (
        <div className="space-y-1">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="space-y-1">
              {row.map(({ suit, cards }) => {
                if (cards.length === 0) return null;
                return (
                  <div key={suit} className="flex items-center gap-1">
                    <span className={`text-base font-bold ${suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}`}>
                      {suit}
                    </span>
                    <div className="flex gap-0.5 flex-wrap">
                      {cards.map((card, i) => (
                        <button
                          key={i}
                          onClick={() => isCurrentPlayer && playCard(gameState, setGameState, card)}
                          disabled={!isCurrentPlayer}
                          className={`bg-white rounded px-1.5 py-0.5 shadow-sm text-xs ${
                            isCurrentPlayer ? 'hover:bg-yellow-100 cursor-pointer' : 'cursor-not-allowed opacity-70'
                          }`}
                        >
                          <span className={suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}>
                            {card.rank}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    // Horizontal display - show 2 suits per row
    const rows = [
      [{ suit: '♠', cards: bySuit[SUITS.indexOf('♠')] }, { suit: '♥', cards: bySuit[SUITS.indexOf('♥')] }],
      [{ suit: '♦', cards: bySuit[SUITS.indexOf('♦')] }, { suit: '♣', cards: bySuit[SUITS.indexOf('♣')] }]
    ];

    return (
      <div className="space-y-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-3">
            {row.map(({ suit, cards }) => {
              if (cards.length === 0) return null;
              return (
                <div key={suit} className="flex items-center gap-1">
                  <span className={`text-base font-bold ${suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}`}>
                    {suit}
                  </span>
                  <div className="flex gap-0.5">
                    {cards.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => isCurrentPlayer && playCard(gameState, setGameState, card)}
                        disabled={!isCurrentPlayer}
                        className={`bg-white rounded px-1.5 py-0.5 shadow-sm text-xs ${
                          isCurrentPlayer ? 'hover:bg-yellow-100 cursor-pointer ring-1 ring-yellow-400' : 'cursor-not-allowed opacity-70'
                        }`}
                      >
                        <span className={suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}>
                          {card.rank}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Bridge</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-semibold">Score:</span>
              </div>
              <div className="text-sm">NS: {gameState.score.northSouth.join('/')}</div>
              <div className="text-sm">EW: {gameState.score.eastWest.join('/')}</div>
              <div className="text-sm">
                <span className="font-semibold">Dealer:</span> {gameState.dealer}
              </div>
              <div className="text-sm">
                <span className="font-semibold ml-2">Vuln:</span>
                {gameState.vulnerability.northSouth && ' NS'}
                {gameState.vulnerability.eastWest && ' EW'}
                {!gameState.vulnerability.northSouth && !gameState.vulnerability.eastWest && ' None'}
              </div>
              <div className="flex gap-2">
                {gameState.phase !== 'bidding' && (
                  <button
                    onClick={() => newHand(gameState, setGameState)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm"
                  >
                    New Hand
                  </button>
                )}
                <button
                  onClick={() => newGame(setGameState)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        </div>

        {gameState.phase === 'bidding' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bidding Phase</h2>
              <div className="mb-4">
                <span className="font-semibold">Current Bidder:</span> {gameState.activePlayer}
              </div>

              <div className="mb-6 max-h-40 overflow-y-auto">
                <h3 className="font-semibold mb-2">Bid History:</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {gameState.bids.map((bid, i) => (
                    <div key={i} className="p-2 bg-gray-100 rounded">
                      <span className="font-semibold">{bid.position}:</span>{' '}
                      {bid.value}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Make a Bid:</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {BID_LEVELS.map(level => (
                      <div key={level} className="space-y-2">
                        {BID_STRAINS.map(strain => (
                          <button
                            key={`${level}${strain}`}
                            onClick={() => bidOrPass(gameState, setGameState, `${level}${strain}`)}
                            disabled={!isValidBid(gameState.currentBid, level, strain)}
                            className={`w-full py-2 px-1 text-sm rounded ${
                              isValidBid(gameState.currentBid, level, strain)
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {level}{strain}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => bidOrPass(gameState, setGameState, 'Pass')}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded font-semibold"
                  >
                    Pass
                  </button>
                  <button
                    onClick={() => double(gameState, setGameState)}
                    disabled={!canDouble(gameState)}
                    className={`flex-1 py-3 rounded font-semibold ${
                      canDouble(gameState)
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Double
                  </button>
                  <button
                    onClick={() => redouble(gameState, setGameState)}
                    disabled={!canRedouble(gameState)}
                    className={`flex-1 py-3 rounded font-semibold ${
                      canRedouble(gameState)
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Redouble
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-green-700 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-3 text-center">Your Hand ({gameState.activePlayer}):</h3>
              {renderHand(gameState.activePlayer, false)}
            </div>
          </div>
        )}

        {gameState.phase === 'play' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">Contract:</span> {gameState.currentBid.value}
                  {gameState.currentBid.redoubled && ' XX'}
                  {!gameState.currentBid.redoubled && gameState.currentBid.doubled && ' X'}
                  {' by '}{gameState.currentBid.position}
                </div>
                <div>
                  <span className="font-semibold">Tricks: </span>
                  NS: {gameState.tricksWon.northSouth} | EW: {gameState.tricksWon.eastWest}
                </div>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Current Player:</span> {gameState.activePlayer}
              </div>
              <div className="mt-2">
                {gameState.currentTrick.length > 0 && <span className="ml-4 font-semibold">Lead: {gameState.currentTrick[0].suit}</span>}
              </div>
              {gameState.lastTrick.trick.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="font-semibold text-sm mb-2">Last Trick (won by {gameState.lastTrick.winner}):</div>
                  <div className="flex gap-2 flex-wrap">
                    {gameState.lastTrick.trick.map((card, i) => (
                      <div key={i} className="bg-gray-100 rounded px-2 py-1 text-xs">
                        <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600 font-bold' : 'text-gray-800 font-bold'}>
                          {card.rank}{card.suit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative bg-green-700 rounded-lg p-8" style={{ minHeight: '500px' }}>
              {/* North */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white font-semibold mb-2 text-center text-sm">
                  {'North'} {gameState.dummy.position === 'North' && '(Dummy)'}
                </div>
                {renderHand('North', false)}
              </div>

              {/* West */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {'West'} {gameState.dummy.position === 'West' && '(Dummy)'}
                </div>
                {renderHand('West', true)}
              </div>

              {/* East */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {'East'} {gameState.dummy.position === 'East' && '(Dummy)'}
                </div>
                {renderHand('East', true)}
              </div>

              {/* South */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white font-semibold mb-2 text-center text-sm">
                  {'South'} {gameState.dummy.position === 'South' && '(Dummy)'}
                </div>
                {renderHand('South', false)}
              </div>

              {/* Center trick area */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative" style={{ width: '200px', height: '200px' }}>
                  {gameState.currentTrick.map((card, i) => {
                    const positions = [
                      { top: '70%', left: '50%', transform: 'translate(-50%, 0)' }, //South
                      { top: '50%', left: '0%', transform: 'translate(0, -50%)' }, //West
                      { top: '0%', left: '50%', transform: 'translate(-50%, 0)' }, //North
                      { top: '50%', left: '70%', transform: 'translate(0, -50%)' } //East
                    ];
                    return (
                      <div
                        key={i}
                        className={"absolute bg-white rounded px-3 py-3 shadow-lg"}
                        style={positions[POSITIONS.indexOf(gameState.lastTrick.winner) + i % 4]}
                      >
                        <div className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600 text-lg font-bold' : 'text-gray-800 text-lg font-bold'}>
                          {card.rank}{card.suit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState.phase === 'cleanup' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Hand Complete!</h2>
            <div className="text-xl mb-4">
              <div>Contract: {gameState.currentBid.value}
                {gameState.currentBid.redoubled && ' XX'}
                {!gameState.currentBid.redoubled && gameState.currentBid.doubled && ' X'}
                {' by '}{gameState.currentBid.position}
              </div>
              <div className="mt-2">Tricks Won:</div>
              <div>North-South: {gameState.tricksWon.northSouth}</div>
              <div>East-West: {gameState.tricksWon.eastWest}</div>
            </div>
            <div className="text-lg font-semibold mb-4">
              {(() => {
                const declarerTeam = POSITIONS.indexOf(gameState.currentBid.position) % 2 ? 'northSouth' : 'eastWest';
                const tricksNeeded = 6 + parseInt(gameState.currentBid.value);
                const tricksMade = gameState.tricksWon[declarerTeam];
                const diff = tricksMade - tricksNeeded;

                if (tricksMade >= tricksNeeded) {
                  if (diff === 0) {
                    return `${gameState.currentBid.position}'s team made the contract exactly!`;
                  } else {
                    return `${gameState.currentBid.position}'s team made the contract with ${diff} overtrick${diff > 1 ? 's' : ''}!`;
                  }
                } else {
                  return `${gameState.currentBid.position}'s team was set by ${-diff} trick${-diff > 1 ? 's' : ''}!`;
                }
              })()}
            </div>
            <div className="text-lg mb-6 p-4 bg-gray-100 rounded">
              <div className="font-bold mb-2">Current Score:</div>
              <div>North-South: {gameState.score.northSouth}</div>
              <div>East-West: {gameState.score.eastWest}</div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Next hand starting automatically in 5 seconds...
            </div>
            <button
              onClick={() => newHand(gameState, setGameState)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded font-semibold"
            >
              Start Next Hand Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}