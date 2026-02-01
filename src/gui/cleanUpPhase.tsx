import { POSITIONS } from '../types';
import type { GameState } from '../types';
import { newHand } from '../deck';

export default function cleanUpPhase (state: GameState, setState: Function) {
  const contract = state.currentBid;
  const tricksWon = state.tricksWon;
  const currentScore = state.score;
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 text-center">
      <h2 className="text-2xl font-bold mb-4">Hand Complete!</h2>
      <div className="text-xl mb-4">
        <div>Contract: {contract.value}
          {contract.redoubled && ' XX'}
          {!contract.redoubled && contract.doubled && ' X'}
          {' by '}{contract.position}
        </div>
        <div className="mt-2">Tricks Won:</div>
        <div>North-South: {tricksWon.northSouth}</div>
        <div>East-West: {tricksWon.eastWest}</div>
      </div>
      <div className="text-lg font-semibold mb-4">
        {(() => {
          const declarerTeam = POSITIONS.indexOf(contract.position) % 2 ? 'northSouth' : 'eastWest';
          const tricksNeeded = 6 + parseInt(contract.value);
          const tricksMade = state.tricksWon[declarerTeam];
          const diff = tricksMade - tricksNeeded;

          if (tricksMade >= tricksNeeded) {
            if (diff === 0) {
              return `${contract.position}'s team made the contract exactly!`;
            } else {
              return `${contract.position}'s team made the contract with ${diff} overtrick${diff > 1 ? 's' : ''}!`;
            }
          } else {
            return `${contract.position}'s team was set by ${-diff} trick${-diff > 1 ? 's' : ''}!`;
          }
        })()}
      </div>
      <div className="text-lg mb-6 p-4 bg-gray-100 rounded">
        <div className="font-bold mb-2">Current Score:</div>
        <div>North-South: {currentScore.northSouth}</div>
        <div>East-West: {currentScore.eastWest}</div>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Next hand starting automatically in 5 seconds...
      </div>
      <button
        onClick={() => newHand(state, setState)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded font-semibold"
      >
        Start Next Hand Now
      </button>
    </div>
  );
}