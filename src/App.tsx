import { useState } from 'react';

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const POSITIONS = ['South', 'West', 'North', 'East'];
const BID_LEVELS = [1, 2, 3, 4, 5, 6, 7];
const BID_STRAINS = ['♣', '♦', '♥', '♠', 'NT'];

interface Card {
  suit: string;
  rank: string;
}

const createDeck = (): Card[] => {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck;
};

const shuffleAndDeal = () => {
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

const sortCards = (a: Card, b: Card) => {
  //const suitOrder = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
  if (a.suit !== b.suit) {
    return BID_STRAINS.indexOf(a.suit) - BID_STRAINS.indexOf(b.suit);
  }
  return RANKS.indexOf(b.rank) - RANKS.indexOf(a.rank);
};

export default function BridgeGame() {
  const [hands, setHands] = useState(shuffleAndDeal());
  const [phase, setPhase] = useState('bidding');
  const [dealer, setDealer] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [bids, setBids] = useState([]);
  const [contract, setContract] = useState(null);
  const [declarer, setDeclarer] = useState(null);
  const [dummy, setDummy] = useState(null);
  const [currentTrick, setCurrentTrick] = useState([]);
  const [tricksWon, setTricksWon] = useState({ 'South-North': 0, 'East-West': 0 });
  const [leadSuit, setLeadSuit] = useState(null);
  const [trickWinner, setTrickWinner] = useState(null);
  const [vulnerability, setVulnerability] = useState({ 'South-North': false, 'East-West': false });
  const [dummyRevealed, setDummyRevealed] = useState(false);
  const [lastTrick, setLastTrick] = useState(null);
  const [score, setScore] = useState({ 'South-North': 0, 'East-West': 0 });

  const getNextPlayer = (player) => (player + 1) % 4;

  const makeBid = (level, strain) => {
    const bid = { player: POSITIONS[currentPlayer], level, strain };
    const newBids = [...bids, bid];
    setBids(newBids);
    setCurrentPlayer(getNextPlayer(currentPlayer));

    checkBiddingEnd(newBids);
  };

  const pass = () => {
    const bid = { player: POSITIONS[currentPlayer], action: 'Pass' };
    const newBids = [...bids, bid];
    setBids(newBids);
    setCurrentPlayer(getNextPlayer(currentPlayer));

    checkBiddingEnd(newBids);
  };

  const double = () => {
    const bid = { player: POSITIONS[currentPlayer], action: 'Double' };
    const newBids = [...bids, bid];
    setBids(newBids);
    setCurrentPlayer(getNextPlayer(currentPlayer));

    checkBiddingEnd(newBids);
  };

  const redouble = () => {
    const bid = { player: POSITIONS[currentPlayer], action: 'Redouble' };
    const newBids = [...bids, bid];
    setBids(newBids);
    setCurrentPlayer(getNextPlayer(currentPlayer));

    checkBiddingEnd(newBids);
  };

  const checkBiddingEnd = (allBids) => {
    if (allBids.length < 4) return;

    const lastFour = allBids.slice(-3);
    const allPass = lastFour.every(b => b.action === 'Pass');

    if (allPass) {
      const contractBids = allBids.filter(b => b.level && b.strain);

      if (contractBids.length === 0) {
        newDeal();
        return;
      }

      const finalContract = contractBids[contractBids.length - 1];

      let doubled = false;
      let redoubled = false;
      for (let i = allBids.length - 4; i < allBids.length - 3; i++) {
        if (allBids[i] && allBids[i].action === 'Double') doubled = true;
        if (allBids[i] && allBids[i].action === 'Redouble') redoubled = true;
      }

      const declarerPos = POSITIONS.indexOf(finalContract.player);
      const partnerPos = (declarerPos + 2) % 4;

      let firstBidder = declarerPos;
      for (let i = 0; i < allBids.length; i++) {
        const bid = allBids[i];
        if (bid.level && bid.strain === finalContract.strain) {
          const bidderPos = POSITIONS.indexOf(bid.player);
          if (bidderPos === declarerPos || bidderPos === partnerPos) {
            firstBidder = bidderPos;
            break;
          }
        }
      }

      setContract({ ...finalContract, doubled, redoubled });
      setDeclarer(firstBidder);
      setDummy((firstBidder + 2) % 4);
      setCurrentPlayer(getNextPlayer(firstBidder));
      setPhase('play');
    }
  };

  const playCard = (card: Card) => {
    const currentHand: Card[] = hands[POSITIONS[currentPlayer]];
    const cardIndex = currentHand.findIndex(c => c.suit === card.suit && c.rank === card.rank);

    if (cardIndex === -1) return;

    if (currentTrick.length > 0 && leadSuit) {
      const hasLeadSuit = currentHand.some(c => c.suit === leadSuit);
      if (hasLeadSuit && card.suit !== leadSuit) {
        return;
      }
    }

    const newHands = { ...hands };
    newHands[POSITIONS[currentPlayer]] = currentHand.filter((_, i) => i !== cardIndex);
    setHands(newHands);

    const newTrick = [...currentTrick, { player: currentPlayer, card }];
    setCurrentTrick(newTrick);

    if (currentTrick.length === 0) {
      setLeadSuit(card.suit);
      setDummyRevealed(true);
    }

    if (newTrick.length === 4) {
      setTimeout(() => finishTrick(newTrick), 1500);
    } else {
      setCurrentPlayer(getNextPlayer(currentPlayer));
    }
  };

  const finishTrick = (trick) => {
    const trump = contract.strain === 'NT' ? null : contract.strain;
    let winner = trick[0];

    for (let i = 1; i < trick.length; i++) {
      const current = trick[i];

      if (trump && current.card.suit === trump && winner.card.suit !== trump) {
        winner = current;
      } else if (current.card.suit === winner.card.suit) {
        if (RANKS.indexOf(current.card.rank) > RANKS.indexOf(winner.card.rank)) {
          winner = current;
        }
      } else if (winner.card.suit !== trump && current.card.suit === leadSuit && winner.card.suit !== leadSuit) {
        winner = current;
      }
    }

    setTrickWinner(winner.player);
    setLastTrick({ trick, winner: winner.player });

    const winnerTeam = winner.player === 0 || winner.player === 2 ? 'South-North' : 'East-West';
    setTricksWon(prev => ({ ...prev, [winnerTeam]: prev[winnerTeam] + 1 }));

    setTimeout(() => {
      setCurrentTrick([]);
      setLeadSuit(null);
      setTrickWinner(null);
      setCurrentPlayer(winner.player);

      const allHandsEmpty = Object.values(hands).every(h => h.length === 0);
      if (allHandsEmpty) {
        calculateScore();
        setPhase('gameOver');
        setTimeout(() => {
          newDeal();
        }, 3000);
      }
    }, 2000);
  };

  const calculateScore = () => {
    const declarerTeam = declarer === 0 || declarer === 2 ? 'South-North' : 'East-West';
    const defenderTeam = declarerTeam === 'South-North' ? 'East-West' : 'South-North';
    const tricksNeeded = 6 + contract.level;
    const tricksMade = tricksWon[declarerTeam];
    const overtricks = tricksMade - tricksNeeded;
    const undertricks = tricksNeeded - tricksMade;
    const vulnerable = vulnerability[declarerTeam];

    let points = 0;

    if (tricksMade >= tricksNeeded) {
      const basePoints = {
        '♣': 20,
        '♦': 20,
        '♥': 30,
        '♠': 30,
        'NT': 30
      };

      let contractPoints = basePoints[contract.strain] * contract.level;
      if (contract.strain === 'NT') contractPoints += 10;

      if (contract.doubled) contractPoints *= 2;
      if (contract.redoubled) contractPoints *= 4;

      let bonus = 0;
      if (contractPoints >= 100) {
        bonus = vulnerable ? 500 : 300;
      } else {
        bonus = 50;
      }

      if (contract.level === 6) {
        bonus += vulnerable ? 750 : 500;
      } else if (contract.level === 7) {
        bonus += vulnerable ? 1500 : 1000;
      }

      if (contract.doubled) bonus += 50;
      if (contract.redoubled) bonus += 100;

      let overtrickPoints = 0;
      if (overtricks > 0) {
        if (contract.doubled) {
          overtrickPoints = overtricks * (vulnerable ? 200 : 100);
        } else if (contract.redoubled) {
          overtrickPoints = overtricks * (vulnerable ? 400 : 200);
        } else {
          overtrickPoints = overtricks * basePoints[contract.strain];
        }
      }

      points = contractPoints + bonus + overtrickPoints;
      setScore(prev => ({ ...prev, [declarerTeam]: prev[declarerTeam] + points }));
    } else {
      if (contract.doubled) {
        for (let i = 0; i < undertricks; i++) {
          if (i === 0) {
            points += vulnerable ? 200 : 100;
          } else if (i <= 2) {
            points += vulnerable ? 300 : 200;
          } else {
            points += 300;
          }
        }
      } else if (contract.redoubled) {
        for (let i = 0; i < undertricks; i++) {
          if (i === 0) {
            points += vulnerable ? 400 : 200;
          } else if (i <= 2) {
            points += vulnerable ? 600 : 400;
          } else {
            points += 600;
          }
        }
      } else {
        points = undertricks * (vulnerable ? 100 : 50);
      }

      setScore(prev => ({ ...prev, [defenderTeam]: prev[defenderTeam] + points }));
    }
  };

  const newDeal = () => {
    setHands(shuffleAndDeal());
    setPhase('bidding');
    setDealer((dealer + 1) % 4);
    setCurrentPlayer((dealer + 1) % 4);
    setBids([]);
    setContract(null);
    setDeclarer(null);
    setDummy(null);
    setCurrentTrick([]);
    setTricksWon({ 'South-North': 0, 'East-West': 0 });
    setLeadSuit(null);
    setTrickWinner(null);
    setDummyRevealed(false);
    setLastTrick(null);
  };

  const newGame = () => {
    newDeal();
    setScore({ 'South-North': 0, 'East-West': 0 });
    setDealer(0);
    setCurrentPlayer(0);
  };

  const canDouble = () => {
    if (bids.length === 0) return false;
    const lastBid = bids[bids.length - 1];
    if (!lastBid.level) return false;
    const lastBidderPos = POSITIONS.indexOf(lastBid.player);
    const currentTeam = currentPlayer % 2;
    const lastBidderTeam = lastBidderPos % 2;
    return currentTeam !== lastBidderTeam && !bids.slice(-3).some(b => b.action === 'Double');
  };

  const canRedouble = () => {
    const lastDouble = bids.slice().reverse().find(b => b.action === 'Double');
    if (!lastDouble) return false;
    const doublePos = POSITIONS.indexOf(lastDouble.player);
    const currentTeam = currentPlayer % 2;
    const doubleTeam = doublePos % 2;
    return currentTeam !== doubleTeam;
  };

  const getLastContract = () => {
    const contractBids = bids.filter(b => b.level && b.strain);
    return contractBids.length > 0 ? contractBids[contractBids.length - 1] : null;
  };

  const isValidBid = (level, strain) => {
    const lastContract = getLastContract();
    if (!lastContract) return true;

    const strainValue = { '♣': 0, '♦': 1, '♥': 2, '♠': 3, 'NT': 4 };
    if (level > lastContract.level) return true;
    if (level === lastContract.level && strainValue[strain] > strainValue[lastContract.strain]) return true;
    return false;
  };

  const renderHand = (position: number, isVertical = false) => {
    const hand = hands[POSITIONS[position]];
    const isDummyPlayer = dummy === position;
    const isCurrentPlayer = currentPlayer === position;
    const shouldShowCards = (isDummyPlayer && dummyRevealed) || isCurrentPlayer;

    if (!shouldShowCards) {
      return (
        <div className="text-center">
          <div className="bg-blue-900 text-white px-3 py-1 rounded text-xs">
            {hand.length} cards
          </div>
        </div>
      );
    }

    // Group by suit
    const bySuit = { '♠': [], '♥': [], '♦': [], '♣': [] };
    hand.forEach(card => bySuit[card.suit].push(card));

    if (isVertical) {
      // For vertical (West/East), show 2 suits per row
      const rows = [
        [{ suit: '♠', cards: bySuit['♠'] }, { suit: '♥', cards: bySuit['♥'] }],
        [{ suit: '♦', cards: bySuit['♦'] }, { suit: '♣', cards: bySuit['♣'] }]
      ];

      return (
        <div className="space-y-1">
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} className="space-y-1">
              {row.map(({ suit, cards }) => {
                if (cards.length === 0) return null;
                return (
                  <div key={suit} className="flex items-center gap-1">
                    <span className={`text-base font-bold ${suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}`}>
                      {suit}
                    </span>
                    <div className="flex gap-0.5 flex-wrap">
                      {cards.map((card, i) => (
                        <button
                          key={i}
                          onClick={() => isCurrentPlayer && playCard(card)}
                          disabled={!isCurrentPlayer}
                          className={`bg-white rounded px-1.5 py-0.5 shadow-sm text-xs ${
                            isCurrentPlayer ? 'hover:bg-yellow-100 cursor-pointer' : 'cursor-not-allowed opacity-70'
                          }`}
                        >
                          <span className={suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}>
                            {card.rank}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    // Horizontal display - show 2 suits per row
    const rows = [
      [{ suit: '♠', cards: bySuit['♠'] }, { suit: '♥', cards: bySuit['♥'] }],
      [{ suit: '♦', cards: bySuit['♦'] }, { suit: '♣', cards: bySuit['♣'] }]
    ];

    return (
      <div className="space-y-1">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center justify-center gap-3">
            {row.map(({ suit, cards }) => {
              if (cards.length === 0) return null;
              return (
                <div key={suit} className="flex items-center gap-1">
                  <span className={`text-base font-bold ${suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}`}>
                    {suit}
                  </span>
                  <div className="flex gap-0.5">
                    {cards.map((card, i) => (
                      <button
                        key={i}
                        onClick={() => isCurrentPlayer && playCard(card)}
                        disabled={!isCurrentPlayer}
                        className={`bg-white rounded px-1.5 py-0.5 shadow-sm text-xs ${
                          isCurrentPlayer ? 'hover:bg-yellow-100 cursor-pointer ring-1 ring-yellow-400' : 'cursor-not-allowed opacity-70'
                        }`}
                      >
                        <span className={suit === '♥' || suit === '♦' ? 'text-red-600' : 'text-gray-800'}>
                          {card.rank}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-green-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Bridge</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-semibold">Score:</span> NS: {score['South-North']} | EW: {score['East-West']}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Dealer:</span> {POSITIONS[dealer]} |
                <span className="font-semibold ml-2">Vuln:</span>
                {vulnerability['South-North'] && ' NS'}
                {vulnerability['East-West'] && ' EW'}
                {!vulnerability['South-North'] && !vulnerability['East-West'] && ' None'}
              </div>
              <div className="flex gap-2">
                {phase !== 'bidding' && (
                  <button
                    onClick={newDeal}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm"
                  >
                    New Hand
                  </button>
                )}
                <button
                  onClick={newGame}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-semibold text-sm"
                >
                  New Game
                </button>
              </div>
            </div>
          </div>
        </div>

        {phase === 'bidding' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bidding Phase</h2>
              <div className="mb-4">
                <span className="font-semibold">Current Bidder:</span> {POSITIONS[currentPlayer]}
              </div>

              <div className="mb-6 max-h-40 overflow-y-auto">
                <h3 className="font-semibold mb-2">Bid History:</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {bids.map((bid, i) => (
                    <div key={i} className="p-2 bg-gray-100 rounded">
                      <span className="font-semibold">{bid.player}:</span>{' '}
                      {bid.action || `${bid.level}${bid.strain}`}
                      {bid.doubled && ' X'}
                      {bid.redoubled && ' XX'}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Make a Bid:</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {BID_LEVELS.map(level => (
                      <div key={level} className="space-y-2">
                        {BID_STRAINS.map(strain => (
                          <button
                            key={`${level}${strain}`}
                            onClick={() => makeBid(level, strain)}
                            disabled={!isValidBid(level, strain)}
                            className={`w-full py-2 px-1 text-sm rounded ${
                              isValidBid(level, strain)
                                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            {level}{strain}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={pass}
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white py-3 rounded font-semibold"
                  >
                    Pass
                  </button>
                  <button
                    onClick={double}
                    disabled={!canDouble()}
                    className={`flex-1 py-3 rounded font-semibold ${
                      canDouble()
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Double
                  </button>
                  <button
                    onClick={redouble}
                    disabled={!canRedouble()}
                    className={`flex-1 py-3 rounded font-semibold ${
                      canRedouble()
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Redouble
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-green-700 rounded-lg p-6">
              <h3 className="text-white font-semibold mb-3 text-center">Your Hand ({POSITIONS[currentPlayer]}):</h3>
              {renderHand(currentPlayer, false)}
            </div>
          </div>
        )}

        {phase === 'play' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">Contract:</span> {contract.level}{contract.strain}
                  {contract.doubled && ' X'}
                  {contract.redoubled && ' XX'}
                  {' by '}{POSITIONS[declarer]}
                </div>
                <div>
                  <span className="font-semibold">Tricks:</span> NS: {tricksWon['South-North']} | EW: {tricksWon['East-West']}
                </div>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Current:</span> {POSITIONS[currentPlayer]}
                {leadSuit && <span className="ml-4 font-semibold">Lead: {leadSuit}</span>}
              </div>
              {lastTrick && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="font-semibold text-sm mb-2">Last Trick (won by {POSITIONS[lastTrick.winner]}):</div>
                  <div className="flex gap-2 flex-wrap">
                    {lastTrick.trick.map((play, i) => (
                      <div key={i} className="bg-gray-100 rounded px-2 py-1 text-xs">
                        <span className="font-semibold">{POSITIONS[play.player]}:</span>{' '}
                        <span className={play.card.suit === '♥' || play.card.suit === '♦' ? 'text-red-600 font-bold' : 'text-gray-800 font-bold'}>
                          {play.card.rank}{play.card.suit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative bg-green-700 rounded-lg p-8" style={{ minHeight: '500px' }}>
              {/* North */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white font-semibold mb-2 text-center text-sm">
                  {POSITIONS[2]} {dummy === 2 && '(Dummy)'}
                </div>
                {renderHand(2, false)}
              </div>

              {/* West */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {POSITIONS[1]} {dummy === 1 && '(Dummy)'}
                </div>
                {renderHand(1, true)}
              </div>

              {/* East */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {POSITIONS[3]} {dummy === 3 && '(Dummy)'}
                </div>
                {renderHand(3, true)}
              </div>

              {/* South */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white font-semibold mb-2 text-center text-sm">
                  {POSITIONS[0]} {dummy === 0 && '(Dummy)'}
                </div>
                {renderHand(0, false)}
              </div>

              {/* Center trick area */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative" style={{ width: '200px', height: '200px' }}>
                  {currentTrick.map((play, i) => {
                    const positions = [
                      { top: '70%', left: '50%', transform: 'translate(-50%, 0)' },
                      { top: '50%', left: '0%', transform: 'translate(0, -50%)' },
                      { top: '0%', left: '50%', transform: 'translate(-50%, 0)' },
                      { top: '50%', left: '70%', transform: 'translate(0, -50%)' }
                    ];
                    return (
                      <div
                        key={i}
                        className={`absolute bg-white rounded px-3 py-3 shadow-lg ${
                          trickWinner === play.player ? 'ring-4 ring-yellow-400' : ''
                        }`}
                        style={positions[play.player]}
                      >
                        <div className={play.card.suit === '♥' || play.card.suit === '♦' ? 'text-red-600 text-lg font-bold' : 'text-gray-800 text-lg font-bold'}>
                          {play.card.rank}{play.card.suit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'gameOver' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Hand Complete!</h2>
            <div className="text-xl mb-4">
              <div>Contract: {contract.level}{contract.strain}
                {contract.doubled && ' X'}
                {contract.redoubled && ' XX'}
                {' by '}{POSITIONS[declarer]}
              </div>
              <div className="mt-2">Tricks Won:</div>
              <div>North-South: {tricksWon['South-North']}</div>
              <div>East-West: {tricksWon['East-West']}</div>
            </div>
            <div className="text-lg font-semibold mb-4">
              {(() => {
                const declarerTeam = declarer === 0 || declarer === 2 ? 'South-North' : 'East-West';
                const tricksNeeded = 6 + contract.level;
                const tricksMade = tricksWon[declarerTeam];
                const diff = tricksMade - tricksNeeded;

                if (tricksMade >= tricksNeeded) {
                  if (diff === 0) {
                    return `${POSITIONS[declarer]}'s team made the contract exactly!`;
                  } else {
                    return `${POSITIONS[declarer]}'s team made the contract with ${diff} overtrick${diff > 1 ? 's' : ''}!`;
                  }
                } else {
                  return `${POSITIONS[declarer]}'s team went down ${-diff} trick${-diff > 1 ? 's' : ''}!`;
                }
              })()}
            </div>
            <div className="text-lg mb-6 p-4 bg-gray-100 rounded">
              <div className="font-bold mb-2">Current Score:</div>
              <div>North-South: {score['South-North']}</div>
              <div>East-West: {score['East-West']}</div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Next hand starting automatically in 3 seconds...
            </div>
            <button
              onClick={newDeal}
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded font-semibold"
            >
              Start Next Hand Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}