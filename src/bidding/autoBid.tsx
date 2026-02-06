import { BID_STRAINS, POSITIONS, SUITS } from '../types';
import type {
  Bid, Card, Contract,
  HandEvaluation, Position, Suit
} from '../types';

/**
 * Smart automated bridge bidding system
 * Implements simple back and forth between partners and response to opponent's opening
 * Implements Standard American bidding with 5-card majors
 * Does not double or redouble
 */
export default function smartAutoBid(
  hand: Card[],
  biddingHistory: Bid[],
  contract: Contract,
  position: Position
): string {

  const evaluation = evaluateHand(hand);
  const contractValue = contract.value;
  const currentBidValue = contractValue !== 'None' ? contractValue : null;

  // If opening
  if (!currentBidValue) {
    return selectOpeningBid(evaluation);
  }

  const invalidBids = ['None', 'Pass', 'Double', 'Redouble'];
  const validBidHistory = biddingHistory.filter(bid => !invalidBids.includes(bid.value));

  const partnerBid = getPartnerBid(validBidHistory, position);

  //If parter has bid
  if (partnerBid) {
    return selectResponseBid(evaluation, partnerBid.value, currentBidValue);
  }

  const opponentBid = getOpponentBid(validBidHistory, position);

  // Opponents have opened, consider overcalling
  if (opponentBid) {
    return selectOvercall(evaluation, currentBidValue);
  }

  // Default
  return 'Pass';

}

/**
 * Select opening bid (first bid by partnership)
 */
function selectOpeningBid(handEval: HandEvaluation): string {
  const totalPoints = handEval.hcp + handEval.distributionPoints;

  // Less than 12 points - Pass (unless very distributional)
  if (totalPoints < 12) {
    // Weak two bid possibility (6-11 HCP, good 6-card suit)
    if (handEval.hcp >= 6 && handEval.hcp <= 11) {
      for (const index of [0, 1]) { // Spade and heart analysis
        if (handEval.suits[index].length === 6 && hasTwoOfTopThree(handEval.suits[index])) {
          return `2${SUITS[index]}`;
        }
      }
    }
    return 'Pass';
  }

  // 15-17 HCP balanced - Open 1NT
  if (handEval.hcp >= 15 && handEval.hcp <= 17 && handEval.isBalanced) {
    return '1NT';
  }

  // 20-21 HCP balanced - Open 2NT
  if (handEval.hcp >= 20 && handEval.hcp <= 21 && handEval.isBalanced) {
    return '2NT';
  }

  // 22+ HCP - Open 2♣ (strong artificial)
  if (handEval.hcp >= 22) {
    return '2♣';
  }

  // Standard opening in a suit (12-21 points)
  return selectSuitOpening(handEval);
}

/**
 * Select which suit to open at the 1-level
 */
function selectSuitOpening(handEval: HandEvaluation): string {
  const { distribution } = handEval;
  const [spades, hearts, clubs, diamonds] = distribution;

  // 5-card major system
  // Open 1♠ with 5+ spades
  if (spades >= 5) {
    return '1♠';
  }

  // Open 1♥ with 5+ hearts
  if (hearts >= 5) {
    return '1♥';
  }

  // Open longer minor
  if (diamonds > clubs) {
    return '1♦';
  }

  if (clubs > diamonds) {
    return '1♣';
  }

  // Equal length minors - open 1♦ (standard practice with 3-3)
  if (diamonds === 3) {
    return '1♦';
  }

  // Default to 1♣
  return '1♣';
}

/**
 * Select response to partner's opening bid
 */
function selectResponseBid(
  handEval: HandEvaluation,
  partnerBidValue: string,
  contractValue: string
): string {

  // Response to 1NT opening
  if (partnerBidValue === '1NT') {
    return respondTo1NT(handEval, contractValue);
  }

  // Response to 2NT opening
  if (partnerBidValue === '2NT') {
    return respondTo2NT(handEval, contractValue);
  }

  // Response to 2♣ opening (strong artificial)
  if (partnerBidValue === '2♣') {
    return respondTo2Club(handEval, contractValue);
  }

  // Response to suit opening (1♥, 1♠, 1♦, 1♣)
  if (parseInt(partnerBidValue) === 1) {
    return respondToOneLevelSuit(handEval, partnerBidValue, contractValue);
  }

  // Response to weak two bid
  if (partnerBidValue.startsWith('2') && partnerBidValue !== '2♣' && partnerBidValue !== '2NT') {
    return respondToWeakTwo(handEval, partnerBidValue, contractValue);
  }

  return 'Pass';
}

/**
 * Respond to partner's 1NT opening (15-17 HCP)
 */
function respondTo1NT(handEval: HandEvaluation, contractValue: string): string {
  // 0-7 points - Pass or sign off
  if (handEval.hcp < 8) {
    return 'Pass';
  }

  // 8-9 points - Invite to game
  if (handEval.hcp >= 8 && handEval.hcp <= 9) {
    if (isValidBid(contractValue, 2, 'NT')) {
      return '2NT';  // Invitational
    }
    return 'Pass';
  }

  // 10+ points - Bid game
  if (handEval.hcp >= 10) {
    // Check for 4-card major (Stayman would be used here in real play)
    if (handEval.distribution[0] >= 4 || handEval.distribution[1] >= 4) {
      // Simplified: just bid 3NT for now
      if (isValidBid(contractValue, 3, 'NT')) {
        return '3NT';
      }
    }

    if (isValidBid(contractValue, 3, 'NT')) {
      return '3NT';
    }
  }

  return 'Pass';
}

/**
 * Respond to partner's 2NT opening (20-21 HCP)
 */
function respondTo2NT(handEval: HandEvaluation, contractValue: string): string {
  // With any 4+ points, bid game
  if (handEval.hcp >= 4) {
    if (isValidBid(contractValue, 3, 'NT')) {
      return '3NT';
    }
  }
  return 'Pass';
}

/**
 * Respond to partner's 2♣ opening (22+ HCP, artificial)
 */
function respondTo2Club(handEval: HandEvaluation, contractValue: string): string {
  // 2♦ is negative response (0-7 HCP)
  if (handEval.hcp < 8) {
    if (isValidBid(contractValue, 2, '♦')) {
      return '2♦';
    }
  }

  // With 8+ show a suit
  if (handEval.longestSuitLength >= 5) {
    const level = 2;
    if (isValidBid(contractValue, level, handEval.longestSuit)) {
      return `${level}${handEval.longestSuit}`;
    }
  }

  return '2♦';  // Waiting bid
}

/**
 * Respond to partner's weak two bid
 */
function respondToWeakTwo(handEval: HandEvaluation, partnerBidValue: string, contractValue: string): string {
  const partnerSuit = partnerBidValue.slice(1) as Suit;
  const partnerSuitIndex = SUITS.indexOf(partnerSuit);
  if (partnerSuitIndex < 0) return 'Pass';

  const support = handEval.suits[partnerSuitIndex].length;

  // With 15+ HCP and fit, bid game
  if (handEval.hcp >= 15 && support >= 2) {
    if (isValidBid(contractValue, 4, partnerSuit)) {
      return `4${partnerSuit}`;
    }
  }

  // With 10-14 HCP and fit, invite
  if (handEval.hcp >= 10 && handEval.hcp <= 14 && support >= 3) {
    if (isValidBid(contractValue, 3, partnerSuit)) {
      return `3${partnerSuit}`;
    }
  }

  return 'Pass';
}

/**
 * Respond to partner's one-level suit opening
 */
function respondToOneLevelSuit(
  handEval: HandEvaluation,
  partnerBidValue: string,
  contractValue: string
): string {

  // Less than 6 points - Pass
  if (handEval.hcp < 6) {
    return 'Pass';
  }

  const partnerSuit = partnerBidValue.slice(1) as Suit;
  const partnerSuitIndex = SUITS.indexOf(partnerSuit);
  const support = handEval.suits[partnerSuitIndex].length;

  // 6-9 points - Minimum response
  if (handEval.hcp >= 6 && handEval.hcp <= 9) {
    // Raise partner's major with 3+ card support
    if ((partnerSuit === '♠' || partnerSuit === '♥') && support >= 3) {
      if (isValidBid(contractValue, 2, partnerSuit)) {
        return `2${partnerSuit}`;
      }
    }

    // Bid a new suit at 1-level if possible
    if (handEval.longestSuitLength >= 4 && handEval.longestSuit !== partnerSuit) {
      if (isValidBid(contractValue, 1, handEval.longestSuit)) {
        return `1${handEval.longestSuit}`;
      }
    }

    // 1NT response (6-9 HCP, no fit, can't bid new suit)
    if (isValidBid(contractValue, 1, 'NT')) {
      return '1NT';
    }
  }

  // 10-12 points - Invitational range
  if (handEval.hcp >= 10 && handEval.hcp <= 12) {
    // Jump raise with 4-card support
    if ((partnerSuit === '♠' || partnerSuit === '♥') && support >= 4) {
      if (isValidBid(contractValue, 3, partnerSuit)) {
        return `3${partnerSuit}`;
      }
    }

    // Bid new suit
    if (handEval.longestSuitLength >= 4) {
      const level = canBidAtOne(contractValue, handEval.longestSuit) ? 1 : 2;
      if (isValidBid(contractValue, level, handEval.longestSuit)) {
        return `${level}${handEval.longestSuit}`;
      }
    }

    // 2NT response (balanced, stoppers)
    if (handEval.isBalanced && isValidBid(contractValue, 2, 'NT')) {
      return '2NT';
    }
  }

  // 13+ points - Game forcing
  if (handEval.hcp >= 13) {
    // With major suit fit, bid game
    if ((partnerSuit === '♠' || partnerSuit === '♥') && support >= 3) {
      if (isValidBid(contractValue, 4, partnerSuit)) {
        return `4${partnerSuit}`;
      }
    }

    // Bid 3NT with balanced hand
    if (handEval.isBalanced && isValidBid(contractValue, 3, 'NT')) {
      return '3NT';
    }

    // Show new suit
    if (handEval.longestSuitLength >= 5) {
      const level = 2;
      if (isValidBid(contractValue, level, handEval.longestSuit)) {
        return `${level}${handEval.longestSuit}`;
      }
    }
  }

  return 'Pass';
}

/**
 * Consider overcalling opponent's bid
 */
function selectOvercall(
  handEval: HandEvaluation,
  contractValue: string
): string {

  // Need 10+ HCP and good suit to overcall
  // Simple overcall with 10-16 HCP and good 5+ card suit
  if (handEval.hcp >= 10 && handEval.hcp <= 16 && handEval.longestSuitLength >= 5) {
    if (hasTwoOfTopFour(handEval.suits[SUITS.indexOf(handEval.longestSuit)])) {
      const level = contractValue !== 'None' ? parseInt(contractValue) : 0;
      const overcallLevel = level + 1;

      if (overcallLevel <= 2 && isValidBid(contractValue, overcallLevel, handEval.longestSuit)) {
        return `${overcallLevel}${handEval.longestSuit}`;
      }
    }
  }

  return 'Pass';
}

// ============================================================================
// Hand Evaluation Functions
// ============================================================================

/**
 * Evaluate a bridge hand for bidding
 */
function evaluateHand(hand: Card[]): HandEvaluation {
  const suits: Card[][] = [[],[],[],[]]; // follows order of SUITS ['♠', '♥', '♣', '♦']

  hand.forEach(card => suits[SUITS.indexOf(card.suit)].push(card));

  const distribution = suits.map(s => s.length);

  const sortedLengths = [...distribution].sort((a, b) => b - a);
  const longestLength = sortedLengths[0];
  const longestSuitIndex = distribution.indexOf(longestLength);
  const longestSuit = SUITS[longestSuitIndex];
  const isBalanced = isBalancedDistribution(distribution);
  const distributionPoints = getDistributionPoints(distribution) - Number(isBalanced);

  return {
    hcp: calculateHCP(hand),
    distribution,
    distributionPoints,
    longestSuit,
    longestSuitLength: longestLength,
    secondLongestLength: sortedLengths[1], // unused
    isBalanced,
    suits
  };
}

/**
 * Calculate High Card Points
 * A=4, K=3, Q=2, J=1
 */
export function calculateHCP(hand: Card[]): number {
  const points: { [key: string]: number } = {
    'A': 4, 'K': 3, 'Q': 2, 'J': 1
  };

  return hand.reduce((total, card) => {
    return total + (points[card.rank] || 0);
  }, 0);
}

/**
 * Calculate distribution points for suit contracts
 * Void=3, Singleton=2, Doubleton=1
 */
function getDistributionPoints(distribution: number[]): number {
  let points = 0;

  distribution.forEach(length => {
    if (length === 0) points += 3;      // void
    else if (length === 1) points += 2;  // singleton
    else if (length === 2) points += 1;  // doubleton
  });

  return points;
}

/**
 * Check if distribution is balanced
 * Balanced: 4-3-3-3, 4-4-3-2, 5-3-3-2
 */
function isBalancedDistribution(dist: number[]): boolean {
  const sorted = [...dist].sort((a, b) => b - a);

  // No singletons or voids
  if (sorted[3] < 2) return false;

  // No suit longer than 5
  if (sorted[0] > 5) return false;

  // If longest suit is 5, must be 5-3-3-2
  if (sorted[0] === 5) {
    return sorted[1] === 3 && sorted[2] === 3 && sorted[3] === 2;
  }

  return true;
}

/**
 * Check if suit has 2 of top 3 honors (A, K, Q)
 */
function hasTwoOfTopThree(cards: Card[]): boolean {
  const honors = cards.filter(c => ['A', 'K', 'Q'].includes(c.rank));
  return honors.length >= 2;
}

/**
 * Check if suit has 2 of top 4 honors (A, K, Q, J)
 */
function hasTwoOfTopFour(cards: Card[]): boolean {
  const honors = cards.filter(c => ['A', 'K', 'Q', 'J'].includes(c.rank));
  return honors.length >= 2;
}

// ============================================================================
// Bidding Helper Functions
// ============================================================================

function getPartnerBid(bids: Bid[], position: Position): Bid | undefined {
  const myIndex = POSITIONS.indexOf(position);
  const partnerIndex = (myIndex + 2) % 4;
  const partner = POSITIONS[partnerIndex];
  const partnerBids = bids.filter(bid => bid.position === partner);

  return partnerBids.pop();
}

function getOpponentBid(bids: Bid[], position: Position): Bid | undefined {
  const myIndex = POSITIONS.indexOf(position);
  const partnerIndex = (myIndex + 2) % 4;
  const partner = POSITIONS[partnerIndex];
  const opponentBids = bids.filter(
    bid => bid.position !== position && bid.position !== partner
  );

  return opponentBids.pop();
}

function isValidBid(contractValue: string, level: number, strain: string): boolean {
  // if no active bid, all bids are valid
  if (contractValue === 'None') return true;
  // if active bid, any higher level bid is valid
  const currentBidLevel = parseInt(contractValue);
  if (level > currentBidLevel) return true;
  // if active bid, must have higher strain on same level bids
  const currentBidStrain = contractValue.slice(1);
  return (level === currentBidLevel && BID_STRAINS.indexOf(strain) > BID_STRAINS.indexOf(currentBidStrain));
};

function canBidAtOne(contractValue: string, suit: Suit): boolean {
  if (contractValue === 'None' || contractValue === 'Pass') return true;
  return isValidBid(contractValue, 1, suit);
}