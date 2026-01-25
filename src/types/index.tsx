
export const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const POSITIONS: Position[] = ['South', 'West', 'North', 'East'];
export const BID_LEVELS = [1, 2, 3, 4, 5, 6, 7];
export const BID_STRAINS = ['♣', '♦', '♥', '♠', 'NT'];

export interface Card {
  suit: Suit;
  rank: string;
}

export type Position = 'South'| 'West'| 'North'| 'East';
export type Suit = '♠'|'♥'|'♦'|'♣';

export interface GameState {
  phase: 'bidding' | 'play' | 'cleanup';
  bids: {value: string, position: Position}[];
  currentBid: {
    value: string;
    position: Position;
    doubled: boolean;
    redoubled: boolean;
  };
  dealer: Position;
  activePlayer: Position;
  hands: {
    South: Card[];
    West: Card[];
    North: Card[];
    East: Card[];
  };
  dummy: {
    position: Position | 'None';
    visible: boolean;
  };
  currentTrick: Card[];
  lastTrick: null | {
    trick: Card[];
    winner: Position;
  };
  tricksWon: {
    northSouth: number;
    eastWest: number;
  };
  vulnerability: {
    northSouth: boolean;
    eastWest: boolean;
  };
  score: {
    northSouth: number;
    eastWest: number;
  };
}
