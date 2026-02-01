import type { GameState } from '../types';
import { newGame, newHand } from '../deck';

export default function banner (state: GameState, setState: Function) {
  const vulnerability = state.vulnerability;
  const currentScore = state.score;
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bridge</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-semibold">Score:</span>
          </div>
          <div className="text-sm">NS: {currentScore.northSouth.join('/')}</div>
          <div className="text-sm">EW: {currentScore.eastWest.join('/')}</div>
          <div className="text-sm">
            <span className="font-semibold">Dealer:</span> {state.dealer}
          </div>
          <div className="text-sm">
            <span className="font-semibold ml-2">Vuln:</span>
            {vulnerability.northSouth && ' NS'}
            {vulnerability.eastWest && ' EW'}
            {!vulnerability.northSouth && !vulnerability.eastWest && ' None'}
          </div>
          <div className="flex gap-2">
            {state.phase !== 'bidding' && (
              <button
                onClick={() => newHand(state, setState)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm"
              >
                New Hand
              </button>
            )}
            <button
              onClick={() => newGame(setState)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm"
            >
              New Game
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}