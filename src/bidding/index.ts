import { BID_STRAINS, PLAYER, POSITIONS } from '../types';
import type { Bid, Contract, GameState } from '../types';
import { newHand } from '../deck';
import { getNextPlayer } from '../play';
import smartAutoBid from './autoBid';

export const canDouble = (state: GameState) => {
  //cant double if alreaady doubled or there isn't a bid to double
  if (state.currentBid.doubled || state.currentBid.value === 'None') return false;
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

export function autoBid (state: GameState, setState: Function) {
  const playingPosition = state.activePlayer;
  // if it is the player's turn, do nothing
  if (playingPosition === PLAYER) {
    return'';
  }

  const activeHand = state.hands[playingPosition];
  const bidHistory = state.bids;
  const contract = state.currentBid;
  const autoBidString = smartAutoBid(activeHand, bidHistory, contract, playingPosition);
  bidOrPass(state, setState, autoBidString);
  return '';
}

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
  const winningSuit = contractBid.value.slice(1);

  // Filter bids for bid Winning team
  const teamBids = allBids.filter(bid =>
    POSITIONS.indexOf(winnerPosition) % 2 === POSITIONS.indexOf(bid.position) % 2
  );
  // Filter team bids for bids in winning suit
  const teamBidsInSuit = teamBids.filter(bid => winningSuit === bid.value.slice(1));
  // The leading player becomes the next order player from the one that bid the winning suit first
  const leadingPlayer = getNextPlayer(teamBidsInSuit[0].position);
  const dummyPlayer = getNextPlayer(leadingPlayer);

  setState({
    ...currentGameState,
    phase: 'play',
    activePlayer: leadingPlayer,
    dummy: {
      position: dummyPlayer,
      visible: false,
    }
  });
};
