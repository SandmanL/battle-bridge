import { BID_LEVELS, BID_STRAINS, PLAYER } from '../types';
import type { GameState } from '../types';
import {
  autoBid, bidOrPass, canDouble, canRedouble,
  double, isValidBid, redouble,
} from '../bidding';
import renderHand from './hand';

export default function bidPhase (state: GameState, setState: Function){
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4">Bidding Phase</h2>
        <div className="mb-4">
          <span className="font-semibold">Current Bidder:</span> {state.activePlayer}
        </div>
        <div>
          {(() => {
            setTimeout(() => {
              autoBid(state, setState);
            }, 1000);
            return'';
          })()}
        </div>
        <div className="mb-6 max-h-40 overflow-y-auto">
          <h3 className="font-semibold mb-2">Bid History:</h3>
          <div className="grid grid-cols-4 gap-2 text-sm">
            {state.bids.map((bid, i) => (
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
                      onClick={() => bidOrPass(state, setState, `${level}${strain}`)}
                      disabled={!isValidBid(state.currentBid, level, strain) || state.activePlayer !== PLAYER}
                      className={`w-full py-2 px-1 text-sm rounded ${
                        isValidBid(state.currentBid, level, strain)
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
              onClick={() => bidOrPass(state, setState, 'Pass')}
              disabled={state.activePlayer !== PLAYER}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded font-semibold"
            >
              Pass
            </button>
            <button
              onClick={() => double(state, setState)}
              disabled={!canDouble(state) || state.activePlayer !== PLAYER}
              className={`flex-1 py-3 rounded font-semibold ${
                canDouble(state)
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Double
            </button>
            <button
              onClick={() => redouble(state, setState)}
              disabled={!canRedouble(state) || state.activePlayer !== PLAYER}
              className={`flex-1 py-3 rounded font-semibold ${
                canRedouble(state)
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
        <h3 className="text-white font-semibold mb-3 text-center">Your Hand ({state.activePlayer}):</h3>
        {renderHand(state, setState, state.activePlayer, false)}
      </div>
    </div>
  );
}