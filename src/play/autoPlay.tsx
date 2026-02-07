import { RANKS, BID_STRAINS, SUITS } from '../types';
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

  // Check if we can follow suit
  const suitCards = hand.filter(c => c.suit === leadSuit);

  if (suitCards.length > 0) {
    // We must follow suit
    return selectFollowCard(trick, suitCards, trump);
  }

  // We're void in the lead suit - can trump or discard
  return selectDiscardOrTrump(trick, hand, trump);
}

/**
 * Select which card to lead with
 */
function selectLead(hand: Card[], trump: string): Card {

  // Group cards by suit
  const suitGroups = groupBySuit(hand);

  // Strategy: Lead from longest/strongest suit (avoid trump unless strong)
  const nonTrumpSuits = suitGroups.filter(suitCards =>
    suitCards.length > 0 && suitCards[0].suit !== trump
  );

  if (nonTrumpSuits.length > 0) {
    const suitLengths = nonTrumpSuits.map(s => s.length);
    const longestSuitIndex = suitLengths.indexOf(Math.max(...suitLengths));
    const longestSuit = nonTrumpSuits[longestSuitIndex];
    // Lead top of sequence or 4th best from long suits
    return selectLeadFromSuit(longestSuit);
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
): Card {

  const partnerWinning = isPartnerWinning(trick, trump);
  const highestInTrick = getHighestCard(trick.filter(c => c.suit === trick[0].suit));

  if (!partnerWinning){
    const winningCard = findLowestWinningCard(suitCards, highestInTrick);
    // Third hand high (try to win if partner hasn't already won)
    if (trick.length === 2) {
      // Try to win the trick
      return winningCard || getHighestCard(suitCards);
    }
    // Fourth hand - we see all cards, make optimal decision
    if (trick.length === 3) {
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
): Card {
  const trumpSuit = BID_STRAINS.indexOf(trump); // -1 is no trump
  const partnerWinning = isPartnerWinning(trick, trump);
  const nonTrumpCards = hand.filter(c => c.suit !== trump);

  if (partnerWinning) {
    // Partner is winning, don't waste a trump if trump if you have other cards
    if (trumpSuit >= 0 && nonTrumpCards.length !== 0) {
      return selectDiscard(nonTrumpCards);
    }
    return selectDiscard(hand);
  }

  // Check if trick has been trumped already
  const trickHasTrump = trick.some(c => c.suit === trump);
  const trumpCards = hand.filter(c => c.suit === trump);

  if (trickHasTrump && trumpCards.length > 0) {
    const highestTrumpInTrick = getHighestCard(trick.filter(c => c.suit === trump));
    const winningTrump = findLowestWinningCard(trumpCards, highestTrumpInTrick);

    if (winningTrump) return winningTrump;

    return nonTrumpCards.length === 0 ? selectDiscard(hand) : selectDiscard(nonTrumpCards);
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
  if (hand.length === 0) {
    throw new Error('Cannot select discard from empty array');
  }
  // Discard from longest suit, lowest card
  const suitGroups = groupBySuit(hand);
  const suitLengths = suitGroups.map(s => s.length);
  const longestSuitIndex = suitLengths.indexOf(Math.max(...suitLengths));
  const longestSuit = suitGroups[longestSuitIndex];

  return getLowestCard(longestSuit);
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

function groupBySuit(hand: Card[]): Card[][] {
  // Group by suit
  const bySuit: Card[][] = [[], [], [], []]; // 2d array of cards, in Spade, heart, club, diamond order
  hand.forEach(card => bySuit[SUITS.indexOf(card.suit)].push(card));
  return bySuit;
}

function getHighestCard(cards: Card[]): Card {
  const cardIndexes = cards.map(c => RANKS.indexOf(c.rank));
  const highestIndex = Math.max(...cardIndexes);
  const highestCard = cards[cardIndexes.indexOf(highestIndex)];
  return highestCard;
}

function getLowestCard(cards: Card[]): Card {
  const cardIndexes = cards.map(c => RANKS.indexOf(c.rank));
  const lowestIndex = Math.min(...cardIndexes);
  const lowestCard = cards[cardIndexes.indexOf(lowestIndex)];
  return lowestCard;
}

function findLowestWinningCard(hand: Card[], cardToBeat: Card): Card | null {
  const winningCards = hand.filter(c => compareRank(c.rank, cardToBeat.rank) > 0);
  return winningCards.length > 0 ? getLowestCard(winningCards) : null;
}

function compareRank(rank1: string, rank2: string): number {
  return RANKS.indexOf(rank1) - RANKS.indexOf(rank2);
}
//uses position in trick (aka trick.length)
function isPartnerWinning(trick: Card[], trump: string): boolean {
  // False when playing first or second in trick
  if (trick.length < 2) return false;

  // In bridge: positions 0 & 2 are partners, 1 & 3 are partners
  const partnerPositions = trick.length % 2 === 0 ? [0, 2] : [1, 3];
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