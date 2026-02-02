import { PLAYER, SUITS } from '../types';
import type { Card, GameState, Position } from '../types';
import { playCard } from '../play';

export default function renderHand (state: GameState, setState: Function, position: Position, isVertical = false) {
  const hand = state.hands[position];
  const isDummyPlayer = state.dummy.position === position;
  const isCurrentPlayer = state.activePlayer === position;
  const shouldShowCards = (isDummyPlayer && state.dummy.visible) || position === PLAYER;

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
                        onClick={() => isCurrentPlayer && playCard(state, setState, card)}
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
                      onClick={() => isCurrentPlayer && playCard(state, setState, card)}
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