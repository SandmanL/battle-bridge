import { RANKS, BID_STRAINS } from '../types';
import type { Card } from '../types';

/**
 * Smart automated bridge player that considers:
 * - Trump suits and ruffing opportunities
 * - Card rank strength
 * - Whether to win or lose the trick
 * - High card placement (third hand high, second hand low)
 * - Void suits for potential ruffs
 */
export default function smartAutoPlay(
  trick: Card[],
  hand: Card[],
  trump: string
): Card {

  // Leading to the trick (first card)
  if (trick.length === 0) {
    return selectLead(hand, trump);
  }

  const leadSuit = trick[0].suit;
  const position = trick.length; // 0=lead, 1=second, 2=third, 3=fourth

  // Check if we can follow suit
  const suitCards = hand.filter(c => c.suit === leadSuit);

  if (suitCards.length > 0) {
    // We must follow suit
    return selectFollowCard(trick, suitCards, trump, position);
  }

  // We're void in the lead suit - can trump or discard
  return selectDiscardOrTrump(trick, hand, trump, position);
}

/**
 * Select which card to lead with
 */
function selectLead(hand: Card[], trump: string): Card {

  // Group cards by suit
  const suitGroups = groupBySuit(hand);

  // Strategy: Lead from longest/strongest suit (avoid trump unless strong)
  const nonTrumpSuits = Object.entries(suitGroups)
    .filter(([suit]) => suit !== trump)
    .sort((a, b) => b[1].length - a[1].length);

  if (nonTrumpSuits.length > 0) {
    const cards = nonTrumpSuits[0][1];
    // Lead top of sequence or 4th best from long suits
    return selectLeadFromSuit(cards);
  }

  // Only have trump, lead lowest
  return getLowestCard(hand);
}

/**
 * Select which card to play when following suit
 */
function selectFollowCard(
  trick: Card[],
  suitCards: Card[],
  trump: string,
  position: number
): Card {

  const partnerWinning = isPartnerWinning(trick, trump, position);
  const highestInTrick = getHighestCard(trick.filter(c => c.suit === trick[0].suit));

  if (!partnerWinning){
    const winningCard = findLowestWinningCard(suitCards, highestInTrick);
    // Third hand high (try to win if partner hasn't already won)
    if (position === 2) {
      // Try to win the trick
      return winningCard || getHighestCard(suitCards);
    }
    // Fourth hand - we see all cards, make optimal decision
    if (position === 3) {
      // Try to win if possible
      return winningCard ? winningCard : getLowestCard(suitCards);
    }
  }
  // Default: play lowest
  return getLowestCard(suitCards);
}

/**
 * Select card when void in lead suit (discard or trump)
 */
function selectDiscardOrTrump(
  trick: Card[],
  hand: Card[],
  trump: string,
  position: number
): Card {
  const trumpSuit = BID_STRAINS.indexOf(trump); // -1 is no trump
  const partnerWinning = isPartnerWinning(trick, trump, position);
  const nonTrumpCards = hand.filter(c => c.suit !== trump);

  if (trumpSuit < 0 || partnerWinning) {
    // No-trump contract, discard lowest from longest/weakest suit
    // Partner is winning, don't waste a trump
    return selectDiscard(nonTrumpCards);
  }

  // Check if trick has been trumped already
  const trickHasTrump = trick.some(c => c.suit === trump);
  const trumpCards = hand.filter(c => c.suit === trump);

  if (trickHasTrump && trumpCards.length > 0) {
    const highestTrumpInTrick = getHighestCard(trick.filter(c => c.suit === trump));
    const winningTrump = findLowestWinningCard(trumpCards, highestTrumpInTrick);

    return winningTrump ? winningTrump : selectDiscard(nonTrumpCards);
  }

  // Trick not yet trumped, use our lowest trump
  if (trumpCards.length > 0) {
    return getLowestCard(trumpCards);
  }

  // No trumps in hand, discard
  return selectDiscard(hand);
}

/**
 * Select a card to discard (when void and not trumping)
 */
function selectDiscard(hand: Card[]): Card {
  // Discard from longest suit, lowest card
  const suitGroups = groupBySuit(hand);
  const longestSuit = Object.entries(suitGroups)
    .sort((a, b) => b[1].length - a[1].length)[0];

  return getLowestCard(longestSuit[1]);
}

/**
 * Select best card to lead from a particular suit
 */
function selectLeadFromSuit(cards: Card[]): Card {
  // Check for sequences (KQJ, QJT, etc.)
  const ranks = cards.map(c => c.rank);
  const hasTopSequence = hasSequenceFromTop(ranks);

  if (hasTopSequence) {
    // Lead top of sequence
    return getHighestCard(cards);
  }

  // Lead 4th highest from long suits (4+ cards)
  if (cards.length >= 4) {
    const sorted = [...cards].sort((a, b) => compareRank(b.rank, a.rank));
    return sorted[3];
  }

  // Short suit, lead lowest
  return getLowestCard(cards);
}

// ============================================================================
// Utility Functions
// ============================================================================

function groupBySuit(cards: Card[]): Record<string, Card[]> {
  return cards.reduce((acc, card) => {
    if (!acc[card.suit]) acc[card.suit] = [];
    acc[card.suit].push(card);
    return acc;
  }, {} as Record<string, Card[]>);
}

function getHighestCard(cards: Card[]): Card {
  return cards.reduce((highest, card) =>
    compareRank(card.rank, highest.rank) > 0 ? card : highest
  );
}

function getLowestCard(cards: Card[]): Card {
  return cards.reduce((lowest, card) =>
    compareRank(card.rank, lowest.rank) < 0 ? card : lowest
  );
}

function findLowestWinningCard(hand: Card[], cardToBeat: Card): Card | null {
  const winningCards = hand.filter(c => compareRank(c.rank, cardToBeat.rank) > 0);
  return winningCards.length > 0 ? getLowestCard(winningCards) : null;
}

function compareRank(rank1: string, rank2: string): number {
  return RANKS.indexOf(rank1) - RANKS.indexOf(rank2);
}
//uses position in trick, not nsew position
function isPartnerWinning(trick: Card[], trump: string, position: number): boolean {
  if (trick.length === 0) return false;

  // In bridge: positions 0 & 2 are partners, 1 & 3 are partners
  const partnerPositions = position % 2 === 0 ? [0, 2] : [1, 3];
  const currentWinningPosition = getWinningPosition(trick, trump);

  // Check if a partner position is currently winning
  return partnerPositions.some(p => p < trick.length && p === currentWinningPosition);
}

export function getWinningPosition(trick: Card[], trump: string): number {
  const leadSuit = trick[0].suit;
  let winnerIndex = 0;
  let winner = trick[winnerIndex];

  for (let i = 1; i < trick.length; i++) {
    const current = trick[i];

    if (current.suit === trump && winner.suit !== trump) {
      winner = current;
      winnerIndex = i;
    } else if (current.suit === winner.suit) {
      if (RANKS.indexOf(current.rank) > RANKS.indexOf(winner.rank)) {
        winner = current;
        winnerIndex = i;
      }
    } else if (winner.suit !== trump && current.suit === leadSuit && winner.suit !== leadSuit) {
      winner = current;
      winnerIndex = i;
    }
  }

  return winnerIndex;
}

function hasSequenceFromTop(ranks: string[]): boolean {
  //const rankOrder = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
  const indices = ranks.map(r => RANKS.indexOf(r)).sort((a, b) => b - a);

  // Check if top 2-3 cards form a sequence
  if (indices.length >= 2) {
    return indices[0] - indices[1] === 1;
  }

  return false;
}