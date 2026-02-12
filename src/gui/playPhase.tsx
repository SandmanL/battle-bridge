import type { GameState } from '../types';
import renderHand from './hand';
import { autoPlay, trickProgress } from '../play';

export default function playPhase (state: GameState, setState: Function){
  const dummy = state.dummy.position;
  const currentTrick = state.currentTrick;
  const lastTrick = state.lastTrick;
  return (
    <div>
      {(() => {
        setTimeout(() => {
          autoPlay(state, setState);
        }, 1000);
        return'';
      })()}

      {trickProgress(state.tricksWon)}

      <div className="north">
          <span className="label">
            {'North'} {dummy === 'North' && '(Dummy)'}
          </span>
          {renderHand(state, setState, 'North')}
      </div>

      <div className="middle-row">
        <div className="west">
          <span className="label">
            {'West'} {dummy === 'West' && '(Dummy)'}
          </span>
          <div>
            {renderHand(state, setState, 'West')}
          </div>
        </div>
        <div className="center-trick">
          <span className="label">Current Trick</span><div className="mt-2">
          <span className="font-semibold">On Play: {state.activePlayer}</span>
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
        {currentTrick.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="font-semibold text-sm mb-2">This trick:</div>
            <div className="flex gap-2 flex-wrap">
              {currentTrick.map((card, i) => (
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
        <div className="east">
          <span className="label">
            {'East'} {dummy === 'East' && '(Dummy)'}
          </span>
          <div>
            {renderHand(state, setState, 'East')}
          </div>
        </div>
      </div>

      <div className="south">
          <span className="label">
            {'South'} {dummy === 'South' && '(Dummy)'}
          </span>
          {renderHand(state, setState, 'South')}
      </div>

    </div>
  );
}
