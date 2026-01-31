import { BID_STRAINS, POSITIONS } from '../types';
import type { Bid, Contract, GameState } from '../types';
import { newHand } from '../deck';
import { getNextPlayer } from '../play';

export const canDouble = (state: GameState) => {
  //cant double if alreaady doubled
  if (state.currentBid.doubled) return false;
  //only opposing team can double
  const currentBidWinner = state.currentBid.position;
  const bidWinningTeam = POSITIONS.indexOf(currentBidWinner) % 2;
  const biddingTeam = POSITIONS.indexOf(state.activePlayer) % 2;
  return biddingTeam !== bidWinningTeam;
};

export const canRedouble = (state: GameState) => {
  // cant redouble if alreaady redoubled or not dobuled to begin with
  if (state.currentBid.redoubled || !state.currentBid.doubled) return false;
  // only currenet bid winning team can redouble
  const currentBidWinner = state.currentBid.position;
  const bidWinningTeam = POSITIONS.indexOf(currentBidWinner) % 2;
  const biddingTeam = POSITIONS.indexOf(state.activePlayer) % 2;
  return biddingTeam === bidWinningTeam;
};

export const isValidBid = (contract: Contract, level: number, strain: string) => {
  // if no active bid, all bids are valid
  if (contract.value === 'None') return true;
  // if active bid, any higher level bid is valid
  const currentBidLevel = parseInt(contract.value);
  if (level > currentBidLevel) return true;
  // if active bid, must have higher strain on same level bids
  const currentBidStrain = contract.value.slice(1);
  return (level === currentBidLevel && BID_STRAINS.indexOf(strain) > BID_STRAINS.indexOf(currentBidStrain));
};

export const bidOrPass = (state: GameState, setState: Function, bidValue: string) => { // used for passing or making a new bid
  const currentGameState = state;
  const newBid = {
    value: bidValue,
    position: currentGameState.activePlayer,
  };
  const newBids = [...currentGameState.bids, newBid];
  let winningBid = currentGameState.currentBid;

  if (bidValue !== 'Pass') {
    winningBid = {
      ...newBid,
      doubled: false,
      redoubled: false,
    };
  }

  setState({
    ...currentGameState,
    bids: newBids,
    currentBid: winningBid,
    activePlayer: getNextPlayer(currentGameState.activePlayer),
  });

  checkBiddingEnd(state, setState, newBids);

};

export const double = (state: GameState, setState: Function) => {
  const currentGameState = state;
  setState({
    ...currentGameState,
    bids: [...currentGameState.bids, {value: 'Double', position: currentGameState.activePlayer}],
    currentBid: {...currentGameState.currentBid, doubled: true},
    activePlayer: getNextPlayer(currentGameState.activePlayer),
  });
};

export const redouble = (state: GameState, setState: Function) => {
  const currentGameState = state;
  setState({
    ...currentGameState,
    bids: [...currentGameState.bids, {value: 'Redouble', position: currentGameState.activePlayer}],
    currentBid: {...currentGameState.currentBid, redoubled: true},
    activePlayer: getNextPlayer(currentGameState.activePlayer),
  });
};

const checkBiddingEnd = (state: GameState, setState: Function, allBids: Bid[]) => {
  const currentGameState = state;
  if (allBids.length < 4) return; // not all players have bid.

  const contractBid = currentGameState.currentBid;

  if (contractBid.value === 'None') { // all players have passed, current bid is null. reshuffle and start new hand
    newHand(state, setState);
    // show message that all players have passe and new hand has started?
    return;
  }

  // Bidding ends with 3 passes
  const lastThreeBids = allBids.slice(-3);
  if (!lastThreeBids.every(bid => bid.value === 'Pass')) return; // last 3 bids have not been passes

  const winnerPosition = contractBid.position;

  setState({
    ...currentGameState,
    phase: 'play',
    activePlayer: getNextPlayer(winnerPosition),
    dummy: {
      position: POSITIONS[(POSITIONS.indexOf(winnerPosition) + 2) % 4],
      visible: false,
    }
  });
};
