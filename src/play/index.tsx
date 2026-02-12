import { PLAYER, POSITIONS, BID_STRAINS } from '../types';
import type { Position, Card, GameState } from '../types';
import { newGame, newHand } from '../deck';
import smartAutoPlay, { getWinningPosition } from './autoPlay';

export const getNextPlayer = (position: Position) => POSITIONS[(POSITIONS.indexOf(position) + 1) % 4];
export const trickProgress = (
  tricksWon: {
    northSouth: number;
    eastWest: number;
  }
) => {

  const NStricks = tricksWon.northSouth;
  const EWtricks = tricksWon.eastWest;
  const totalTricks = 13;
  const trickArray: string[] = [];
  //can use array.map to return divs


  for(let i = 0; i < totalTricks; i++) {
    if(i < NStricks) {
      trickArray[i] = 'pip won';
    } else if (i >= 13 - EWtricks){
      trickArray[i] = 'pip lost';
    } else {
      trickArray[i] = 'pip open';
    }
  };

  return (
    <div className="progress-strip">
      {trickArray.map((status, rowIdx) => (
        <div key={rowIdx} className={status}></div>
       ))}
    </div>
    );

};

export const playCard = (state: GameState, setState: Function, playedCard: Card) => {
  const currentHand = state.hands[state.activePlayer];
  const cardIndex = currentHand.findIndex(c => c.suit === playedCard.suit && c.rank === playedCard.rank);

  if (cardIndex === -1) return; //card not found on player's hand

  const thisTrick = state.currentTrick;

  if (thisTrick.length > 0) {
    const leadSuit = thisTrick[0].suit
    const hasLeadSuit = currentHand.some(c => c.suit === leadSuit);
    if (hasLeadSuit && playedCard.suit !== leadSuit) { //player has current suit but chose nonlead card
      return;
    }
  }

  const currentGameState = state;
  const updatedTrick = [...thisTrick, playedCard]; //add card to current trick
  const updatedCurrentHand = currentHand.filter((_, i) => i !== cardIndex); // remove card from player's hand
  const updatedHands = { ...currentGameState.hands };
  updatedHands[currentGameState.activePlayer] = updatedCurrentHand; //update hands

  if (updatedTrick.length === 4) {
    setState({
      ...currentGameState,
      currentTrick: updatedTrick,
      hands: updatedHands,
    });
    setTimeout(() => finishTrick(state, setState, updatedTrick, updatedHands), 1000);
    return;
  }

  setState({
    ...currentGameState,
    currentTrick: updatedTrick,
    hands: updatedHands,
    activePlayer: getNextPlayer(currentGameState.activePlayer),
    dummy: {
      ...currentGameState.dummy,
      visible: true,
    },
  });
};

export function autoPlay (state: GameState, setState: Function) {
  const isDummyPlayable = state.dummy.position === POSITIONS[(POSITIONS.indexOf(PLAYER) + 2) % 4];
  const playingPosition = state.activePlayer;
  // if its the player's turn and the player is not dummy
  if (playingPosition === PLAYER && state.dummy.position !== PLAYER) {
    return '';
  }
  // if its the player controlled dummy and dummy's turn, do nothing
  if (isDummyPlayable && playingPosition === state.dummy.position) {
    return'';
  }

  const currentTrick = state.currentTrick;
  // if trick is full, do nothing
  if (currentTrick.length === 4) {
    return '';
  }

  const currentHand = state.hands[playingPosition];
  const trump = state.currentBid.value.slice(-1);
  const cardToPlay = smartAutoPlay(currentTrick, currentHand, trump);

  playCard(state, setState, cardToPlay);
  return'';
}

const finishTrick = (
  state: GameState,
  setState: Function,
  finishedTrick: Card[],
  updatedHands: {
    South: Card[];
    West: Card[];
    North: Card[];
    East: Card[];
  },
) => {
  const trump = state.currentBid.value.slice(-1);
  const leadPosition = getNextPlayer(state.activePlayer);
  const winnerIndex = getWinningPosition(finishedTrick, trump);
  const winningPositionIndex = (POSITIONS.indexOf(leadPosition) + winnerIndex) % 4;
  const winningPosition = POSITIONS[winningPositionIndex];
  const currentTricksWon = state.tricksWon;
  const currentGameState = {
    ...state,
    hands: updatedHands,
    currentTrick: [],
    activePlayer: winningPosition,
    lastTrick: {
      trick: finishedTrick,
      winner: winningPosition,
    },
    tricksWon: {
      northSouth: currentTricksWon.northSouth + (winningPositionIndex + 1) % 2, // if position index is even, +1 NS trick
      eastWest: currentTricksWon.eastWest + winningPositionIndex % 2, // if position index is odd, +1 EW trick
    }
  };

  setState(currentGameState);

  //Check if end of hand
  const allHandsEmpty = currentGameState.hands.South.length === 0;
  if (allHandsEmpty) {
    const scoringResults = calculateScore(currentGameState);
    currentGameState.score = scoringResults.newScore;
    currentGameState.vulnerability = scoringResults.newVulnerability;
    setState({
      ...currentGameState,
      phase: 'cleanup',
    });
    setTimeout(() => {
      scoringResults.gameEnd ? newGame(setState) : newHand(currentGameState, setState);
    }, 5000);
  }
};

const calculateScore = (state: GameState) => {
  const contract = state.currentBid;
  const contractPositionIndex = POSITIONS.indexOf(contract.position);
  const contractTeam = contractPositionIndex % 2 === 0 ? 'northSouth' : 'eastWest';
  const defendingTeam = contractPositionIndex % 2 === 1 ? 'northSouth' : 'eastWest';
  const dblMultiplier = (contract.doubled ? 2 : 1) * (contract.redoubled ? 2 : 1);
  const contractLevel = parseInt(contract.value);
  const contractSuitIndex = BID_STRAINS.indexOf(contract.value.slice(1));
  const tricksMade = state.tricksWon[contractTeam];
  const overtricks = tricksMade - (6 + contractLevel);
  const updatedVulnerability = state.vulnerability;
  const vulnerable = updatedVulnerability[contractTeam];
  const currentScore = state.score;
  let pointsOverLine = 0;
  let pointsUnderLine = 0; //[points over the line, points under the line]

  // display score as overLine/firstGame/secondGame/ThirdGame

  if (overtricks >= 0) { // team made their contract

    if (contractSuitIndex < 0) { //invalid Bid suit
      console.warn('Invalid bid suit');
      return {newScore: state.score, newVulnerability: state.vulnerability, gameEnd: true};
    } else {
      const extraNTPoints = contractSuitIndex === 4 ? 10 : 0; //extra 10 points if 'NT' bid
      const trickWorth = contractSuitIndex < 2 ? 20 : 30; //BIDSUITS = [club,diamond,heart,spade,nt]
      pointsUnderLine += (contractLevel * trickWorth + extraNTPoints) * dblMultiplier; //adding to points under line
      pointsOverLine += overtricks * trickWorth * dblMultiplier; // adding to points over line
    }

    //Adding points to winning team's score
    const updatedTeamScore = [...currentScore[contractTeam]];
    updatedTeamScore[0] += pointsOverLine;
    updatedTeamScore[updatedTeamScore.length - 1] += pointsUnderLine;
    const updatedScore = {
      northSouth: contractPositionIndex % 2 === 0 ? updatedTeamScore : currentScore.northSouth,
      eastWest: contractPositionIndex % 2 === 1 ? updatedTeamScore : currentScore.eastWest
    };

    const gameWon = updatedTeamScore[updatedTeamScore.length - 1] >= 100; //check current game score is 100+
    if (gameWon) {
      if(vulnerable) { //if winning team is vulnerable, play is over
        return {newScore: updatedScore, newVulnerability: updatedVulnerability, gameEnd: true};
      } // else set vulnerability to true and add a new score element to each team's array for the new game
      updatedVulnerability[contractTeam] = true;
      updatedScore.northSouth.push(0);
      updatedScore.eastWest.push(0);
    }

    return {newScore: updatedScore, newVulnerability: updatedVulnerability, gameEnd: false};
  }

  // team got set
  const setAmount = Math.abs(overtricks);
  const setPoints = setAmount * 50 * dblMultiplier * (vulnerable ? 2 : 1);
  const updatedTeamScore = [...currentScore[defendingTeam]];
  updatedTeamScore[0] += setPoints;
  const updatedScore = {
    northSouth: contractPositionIndex % 2 === 1 ? updatedTeamScore : currentScore.northSouth,
    eastWest: contractPositionIndex % 2 === 0 ? updatedTeamScore : currentScore.eastWest
  };

  return {newScore: updatedScore, newVulnerability: updatedVulnerability, gameEnd: false};
};
