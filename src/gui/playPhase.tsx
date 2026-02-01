import { POSITIONS } from '../types';
import type { GameState } from '../types';
import renderHand from './hand';

export default function playPhase (state: GameState, setState: Function){
  const contract = state.currentBid;
  const dummy = state.dummy.position;
  const currentTrick = state.currentTrick;
  const lastTrick = state.lastTrick;
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold">Contract:</span> {contract.value}
            {contract.redoubled && ' XX'}
            {!contract.redoubled && contract.doubled && ' X'}
            {' by '}{contract.position}
          </div>
          <div>
            <span className="font-semibold">Tricks: </span>
            NS: {state.tricksWon.northSouth} | EW: {state.tricksWon.eastWest}
          </div>
        </div>
        <div className="mt-2">
          <span className="font-semibold">Current Player:</span> {state.activePlayer}
        </div>
        <div className="mt-2">
          {currentTrick.length > 0 && <span className="ml-4 font-semibold">Lead: {currentTrick[0].suit}</span>}
        </div>
        {lastTrick.trick.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="font-semibold text-sm mb-2">Last Trick (won by {lastTrick.winner}):</div>
            <div className="flex gap-2 flex-wrap">
              {lastTrick.trick.map((card, i) => (
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
            {'North'} {dummy === 'North' && '(Dummy)'}
          </div>
          {renderHand(state, setState, 'North', false)}
        </div>

        {/* West */}
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
          <div className="text-white font-semibold mb-2 text-sm">
            {'West'} {dummy === 'West' && '(Dummy)'}
          </div>
          {renderHand(state, setState, 'West', true)}
        </div>

        {/* East */}
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <div className="text-white font-semibold mb-2 text-sm">
            {'East'} {dummy === 'East' && '(Dummy)'}
          </div>
          {renderHand(state, setState, 'East', true)}
        </div>

        {/* South */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <div className="text-white font-semibold mb-2 text-center text-sm">
            {'South'} {dummy === 'South' && '(Dummy)'}
          </div>
          {renderHand(state, setState, 'South', false)}
        </div>

        {/* Center trick area */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative" style={{ width: '200px', height: '200px' }}>
            {currentTrick.map((card, i) => {
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
                  style={positions[POSITIONS.indexOf(lastTrick.winner) + i % 4]}
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
  );
}