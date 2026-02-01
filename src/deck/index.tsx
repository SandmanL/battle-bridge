import { RANKS, SUITS } from '../types';
import type { Card, GameState } from '../types';
import { getNextPlayer } from '../play';

const createDeck = (): Card[] => {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const sortCards = (a: Card, b: Card) => {
  if (a.suit !== b.suit) {
    return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
  }
  return RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank);
};

export const shuffleAndDeal = () => {
  const deck = createDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return {
    South: deck.slice(0, 13).sort((a, b) => sortCards(a, b)),
    West: deck.slice(13, 26).sort((a, b) => sortCards(a, b)),
    North: deck.slice(26, 39).sort((a, b) => sortCards(a, b)),
    East: deck.slice(39, 52).sort((a, b) => sortCards(a, b))
  };
};

export const newGame = (setState: Function) => {
  const newHands = shuffleAndDeal();
  setState({...newGameState, hands: newHands});
};

export const newHand = (state: GameState, setState: Function) => {
  const gameScore = state.score;
  const teamVulnerability = state.vulnerability;
  const newDealer = getNextPlayer(state.dealer);
  const newHands = shuffleAndDeal();
  setState({
    ...newGameState,
    dealer: newDealer,
    activePlayer: newDealer,
    hands: newHands,
    lastTrick: {
      trick: [],
      winner: newDealer,
    },
    score: gameScore,
    vulnerability: teamVulnerability,
  });
}

export const newGameState: GameState = {
  phase: 'bidding',
  bids: [],
  currentBid: {
    value: 'None',
    position: 'South',
    doubled: false,
    redoubled: false,
  },
  dealer: 'South',
  activePlayer: 'South',
  hands: shuffleAndDeal(),
  currentTrick: [],
  lastTrick: {
    trick: [],
    winner: 'South',
  },
  tricksWon: {
    northSouth: 0,
    eastWest: 0,
  },
  dummy: {
    position: 'None',
    visible: false,
  },
  vulnerability: {
    northSouth: false,
    eastWest: false,
  },
  score: {
    northSouth: [0, 0],
    eastWest: [0, 0],
  },
};