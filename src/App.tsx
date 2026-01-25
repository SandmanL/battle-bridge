import { useState } from 'react';
import {
  BID_LEVELS, BID_STRAINS,
  POSITIONS, RANKS, SUITS
} from './types';
import type { Card, GameState, Position } from './types';

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
  const newGameState: GameState = {
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
    lastTrick: null,
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
      northSouth: 0,
      eastWest: 0,
    },
  };

  const [gameState, setGameState] = useState(newGameState as GameState);

  const getNextPlayer = (position: Position) => POSITIONS[(POSITIONS.indexOf(position) + 1) % 4];

  const newGame = () => {
    const newHands = shuffleAndDeal();
    setGameState({...newGameState, hands: newHands});
  };

  const newHand = () => {
    const gameScore = gameState.score;
    const teamVulnerability = gameState.vulnerability;
    const newDealer = getNextPlayer(gameState.dealer);
    const newHands = shuffleAndDeal();
    setGameState({
      ...newGameState,
      dealer: newDealer,
      activePlayer: newDealer,
      hands: newHands,
      score: gameScore,
      vulnerability: teamVulnerability,
    });
  }

  const BidOrPass = (bidValue: string) => { // used for passing or making a new bid
    const newBid = {
      value: bidValue,
      position: gameState.activePlayer,
    };
    const newBids = [...gameState.bids, newBid];
    let winningBid = gameState.currentBid;
    if (bidValue !== 'Pass') {
      winningBid = {
        ...newBid,
        doubled: false,
        redoubled: false,
      };
      setGameState({
        ...gameState,
        bids: newBids,
        currentBid: winningBid,
        activePlayer: getNextPlayer(gameState.activePlayer),
      });
      return;
    }
    setGameState({
      ...gameState,
      bids: newBids,
      currentBid: winningBid,
      activePlayer: getNextPlayer(gameState.activePlayer),
    });
    checkBiddingEnd(newBids);

  };

  const double = () => {
    setGameState({
      ...gameState,
      bids: [...gameState.bids, {value: 'Double', position: gameState.activePlayer}],
      currentBid: {...gameState.currentBid, doubled: true},
      activePlayer: getNextPlayer(gameState.activePlayer),
    });
  };

  const redouble = () => {
    setGameState({
      ...gameState,
      bids: [...gameState.bids, {value: 'Redouble', position: gameState.activePlayer}],
      currentBid: {...gameState.currentBid, redoubled: true},
      activePlayer: getNextPlayer(gameState.activePlayer),
    });
  };

  const checkBiddingEnd = (allBids: {value: string, position: Position}[]) => {
    if (allBids.length < 4) return; // not all players have bid.

    const contractBid = gameState.currentBid;

    if (!contractBid.value) { // all players have passed, current bid is null. reshuffle and start new hand
      newHand();
      return;
    }

    const winnerPosition = contractBid.position;

    setGameState({
      ...gameState,
      phase: 'play',
      activePlayer: getNextPlayer(winnerPosition),
      dummy: {
        position: POSITIONS[(POSITIONS.indexOf(winnerPosition) + 2) % 4],
        visible: false,
      }
    });

  };

  const playCard = (playedCard: Card) => {
    const currentHand = gameState.hands[gameState.activePlayer];
    const cardIndex = currentHand.findIndex(c => c.suit === playedCard.suit && c.rank === playedCard.rank);

    if (cardIndex === -1) return; //card not found on player's hand

    const thisTrick = gameState.currentTrick;

    if (thisTrick.length > 0) {
      const leadSuit = thisTrick[0].suit
      const hasLeadSuit = currentHand.some(c => c.suit === leadSuit);
      if (hasLeadSuit && playedCard.suit !== leadSuit) { //player has current suit but chose nonlead card
        return;
      }
    }

    const updatedTrick = [...thisTrick, playedCard]; //add card to current trick
    const updatedCurrentHand = currentHand.filter((_, i) => i !== cardIndex); // remove card from player's hand
    const updatedHands = { ...gameState.hands };
    updatedHands[gameState.activePlayer] = updatedCurrentHand; //update hands

    setGameState({
      ...gameState,
      currentTrick: updatedTrick,
      hands: updatedHands,
    });

    if (updatedTrick.length === 4) {
      setTimeout(() => finishTrick(updatedTrick), 1000);
      return;
    }

    setGameState({
      ...gameState,
      activePlayer: getNextPlayer(gameState.activePlayer),
      dummy: {
        ...gameState.dummy,
        visible: true,
      },
    });

  };

  const finishTrick = (finishedTrick: Card[]) => {
    const trump = gameState.currentBid.value.slice(-1);
    const leadPosition = getNextPlayer(gameState.activePlayer);
    const leadSuit = finishedTrick[0].suit;
    let winnerIndex = 0;
    let winner = finishedTrick[winnerIndex];

    for (let i = 1; i < finishedTrick.length; i++) {
      const current = finishedTrick[i];

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
    const winningPositionIndex = (POSITIONS.indexOf(leadPosition) + winnerIndex) % 4;
    const winningPosition = POSITIONS[winningPositionIndex];
    const currentTricksWon = gameState.tricksWon;

    setGameState({
      ...gameState,
      currentTrick: [],
      activePlayer: winningPosition,
      lastTrick: {
        trick: finishedTrick,
        winner: winningPosition,
      },
      tricksWon: {
        northSouth: currentTricksWon.northSouth + (winningPositionIndex % 2 ? 1 : 0),
        eastWest: currentTricksWon.eastWest + (winningPositionIndex % 2 ? 0 : 1),
      }
    });

    //Check if end of hand
    const allHandsEmpty = gameState.hands.South.length === 0;
    if (allHandsEmpty) {
      const currentGameState = gameState;
      setGameState({
        ...currentGameState,
        phase: 'cleanup',
      })
      //calculateScore();
      setTimeout(() => {
        newHand();
      }, 5000);
    }
  };

  // const calculateScore = () => {
  //   const declarerTeam = declarer === 0 || declarer === 2 ? 'South-North' : 'East-West';
  //   const defenderTeam = declarerTeam === 'South-North' ? 'East-West' : 'South-North';
  //   const tricksNeeded = 6 + contract.level;
  //   const tricksMade = tricksWon[declarerTeam];
  //   const overtricks = tricksMade - tricksNeeded;
  //   const undertricks = tricksNeeded - tricksMade;
  //   const vulnerable = vulnerability[declarerTeam];

  //   let points = 0;

  //   if (tricksMade >= tricksNeeded) {
  //     const basePoints = {
  //       '♣': 20,
  //       '♦': 20,
  //       '♥': 30,
  //       '♠': 30,
  //       'NT': 30
  //     };

  //     let contractPoints = basePoints[contract.strain] * contract.level;
  //     if (contract.strain === 'NT') contractPoints += 10;

  //     if (contract.doubled) contractPoints *= 2;
  //     if (contract.redoubled) contractPoints *= 4;

  //     let bonus = 0;
  //     if (contractPoints >= 100) {
  //       bonus = vulnerable ? 500 : 300;
  //     } else {
  //       bonus = 50;
  //     }

  //     if (contract.level === 6) {
  //       bonus += vulnerable ? 750 : 500;
  //     } else if (contract.level === 7) {
  //       bonus += vulnerable ? 1500 : 1000;
  //     }

  //     if (contract.doubled) bonus += 50;
  //     if (contract.redoubled) bonus += 100;

  //     let overtrickPoints = 0;
  //     if (overtricks > 0) {
  //       if (contract.doubled) {
  //         overtrickPoints = overtricks * (vulnerable ? 200 : 100);
  //       } else if (contract.redoubled) {
  //         overtrickPoints = overtricks * (vulnerable ? 400 : 200);
  //       } else {
  //         overtrickPoints = overtricks * basePoints[contract.strain];
  //       }
  //     }

  //     points = contractPoints + bonus + overtrickPoints;
  //     setScore(prev => ({ ...prev, [declarerTeam]: prev[declarerTeam] + points }));
  //   } else {
  //     if (contract.doubled) {
  //       for (let i = 0; i < undertricks; i++) {
  //         if (i === 0) {
  //           points += vulnerable ? 200 : 100;
  //         } else if (i <= 2) {
  //           points += vulnerable ? 300 : 200;
  //         } else {
  //           points += 300;
  //         }
  //       }
  //     } else if (contract.redoubled) {
  //       for (let i = 0; i < undertricks; i++) {
  //         if (i === 0) {
  //           points += vulnerable ? 400 : 200;
  //         } else if (i <= 2) {
  //           points += vulnerable ? 600 : 400;
  //         } else {
  //           points += 600;
  //         }
  //       }
  //     } else {
  //       points = undertricks * (vulnerable ? 100 : 50);
  //     }

  //     setScore(prev => ({ ...prev, [defenderTeam]: prev[defenderTeam] + points }));
  //   }
  // };

  const canDouble = () => {
    //cant double if alreaady doubled
    if (gameState.currentBid.doubled) return false;
    //only opposing team can double
    const currentBidWinner = gameState.currentBid.position;
    const bidWinningTeam = POSITIONS.indexOf(currentBidWinner) % 2;
    const biddingTeam = POSITIONS.indexOf(gameState.activePlayer) % 2;
    return biddingTeam !== bidWinningTeam;
  };

  const canRedouble = () => {
    //cant redouble if alreaady redoubled or not dobuled to begin with
    if (gameState.currentBid.redoubled || !gameState.currentBid.doubled) return false;
    // only currenet bid winning team can redouble
    const currentBidWinner = gameState.currentBid.position;
    const bidWinningTeam = POSITIONS.indexOf(currentBidWinner) % 2;
    const biddingTeam = POSITIONS.indexOf(gameState.activePlayer) % 2;
    return biddingTeam === bidWinningTeam;
  };

  const isValidBid = (level: number, strain: string) => {
    // if no active bid, all bids are valid
    if (gameState.currentBid.value === 'None') return true;
    // if active bid, any higher level bid is valid
    const currentBidLevel = parseInt(gameState.currentBid.value);
    if (level > currentBidLevel) return true;
    // if active bid, must have higher strain on same level bids
    const currentBidStrain = gameState.currentBid.value.slice(1);
    if (level === currentBidLevel && BID_STRAINS.indexOf(strain) > BID_STRAINS.indexOf(currentBidStrain)) return true;
    return false;
  };

  const renderHand = (position: Position, isVertical = false) => {
    const hand = gameState.hands[position];
    const isDummyPlayer = gameState.dummy.position === position;
    const isCurrentPlayer = gameState.activePlayer === position;
    const shouldShowCards = (isDummyPlayer && gameState.dummy.visible) || isCurrentPlayer;

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
    const bySuit: Card[][] = [[]]; // 2d array of cards, in Spade, heart, club, diamond order
    hand.forEach(card => bySuit[SUITS.indexOf(card.suit)].push(card));

    if (isVertical) {
      // For vertical (West/East), show 2 suits per row
      const rows = [
        [{ suit: '♠', cards: bySuit[SUITS.indexOf('♠')] }, { suit: '♥', cards: bySuit[SUITS.indexOf('♥')] }],
        [{ suit: '♦', cards: bySuit[SUITS.indexOf('♦')] }, { suit: '♣', cards: bySuit[SUITS.indexOf('♣')] }]
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
      [{ suit: '♠', cards: bySuit[SUITS.indexOf('♠')] }, { suit: '♥', cards: bySuit[SUITS.indexOf('♥')] }],
      [{ suit: '♦', cards: bySuit[SUITS.indexOf('♦')] }, { suit: '♣', cards: bySuit[SUITS.indexOf('♣')] }]
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
                <span className="font-semibold">Score:</span> NS: {gameState.score.northSouth} | EW: {gameState.score.eastWest}
              </div>
              <div className="text-sm">
                <span className="font-semibold">Dealer:</span> {gameState.dealer} |
                <span className="font-semibold ml-2">Vuln:</span>
                {gameState.vulnerability.northSouth && ' NS'}
                {gameState.vulnerability.eastWest && ' EW'}
                {!gameState.vulnerability.northSouth && !gameState.vulnerability.eastWest && ' None'}
              </div>
              <div className="flex gap-2">
                {gameState.phase !== 'bidding' && (
                  <button
                    onClick={newHand}
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

        {gameState.phase === 'bidding' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">Bidding Phase</h2>
              <div className="mb-4">
                <span className="font-semibold">Current Bidder:</span> {gameState.activePlayer}
              </div>

              <div className="mb-6 max-h-40 overflow-y-auto">
                <h3 className="font-semibold mb-2">Bid History:</h3>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {gameState.bids.map((bid, i) => (
                    <div key={i} className="p-2 bg-gray-100 rounded">
                      <span className="font-semibold">{bid.position}:</span>{' '}
                      {bid.value}
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
                            onClick={() => BidOrPass(`${level}${strain}`)}
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
                    onClick={() => BidOrPass('Pass')}
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
              <h3 className="text-white font-semibold mb-3 text-center">Your Hand ({gameState.activePlayer}):</h3>
              {renderHand(gameState.activePlayer, false)}
            </div>
          </div>
        )}

        {gameState.phase === 'play' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-semibold">Contract:</span> {gameState.currentBid.value}
                  {gameState.currentBid.doubled && ' X'}
                  {gameState.currentBid.redoubled && ' XX'}
                  {' by '}{gameState.currentBid.position}
                </div>
                <div>
                  <span className="font-semibold">Tricks:</span>
                  NS: {gameState.tricksWon.northSouth} | EW: {gameState.tricksWon.eastWest}
                </div>
              </div>
              <div className="mt-2">
                <span className="font-semibold">Current:</span> {gameState.activePlayer}
                {gameState.currentTrick.length && <span className="ml-4 font-semibold">Lead: {gameState.currentTrick[0].suit}</span>}
              </div>
              {gameState.lastTrick && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="font-semibold text-sm mb-2">Last Trick (won by {gameState.lastTrick.winner}):</div>
                  <div className="flex gap-2 flex-wrap">
                    {gameState.lastTrick.trick.map((card, i) => (
                      <div key={i} className="bg-gray-100 rounded px-2 py-1 text-xs">
                        <span className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600 font-bold' : 'text-gray-800 font-bold'}>
                          {card.rank}{card.suit}
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
                  {'North'} {gameState.dummy.position === 'North' && '(Dummy)'}
                </div>
                {renderHand('North', false)}
              </div>

              {/* West */}
              <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {'West'} {gameState.dummy.position === 'West' && '(Dummy)'}
                </div>
                {renderHand('West', true)}
              </div>

              {/* East */}
              <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                <div className="text-white font-semibold mb-2 text-sm">
                  {'East'} {gameState.dummy.position === 'East' && '(Dummy)'}
                </div>
                {renderHand('East', true)}
              </div>

              {/* South */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white font-semibold mb-2 text-center text-sm">
                  {'South'} {gameState.dummy.position === 'South' && '(Dummy)'}
                </div>
                {renderHand('South', false)}
              </div>

              {/* Center trick area */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative" style={{ width: '200px', height: '200px' }}>
                  {gameState.currentTrick.map((card, i) => {
                    const positions = [
                      { top: '70%', left: '50%', transform: 'translate(-50%, 0)' }, //South
                      { top: '50%', left: '0%', transform: 'translate(0, -50%)' }, //West
                      { top: '0%', left: '50%', transform: 'translate(-50%, 0)' }, //North
                      { top: '50%', left: '70%', transform: 'translate(0, -50%)' } //East
                    ];
                    return (
                      <div
                        key={i}
                        className={"absolute bg-white rounded px-3 py-3 shadow-lg"}
                        style={positions[i]}
                      >
                        <div className={card.suit === '♥' || card.suit === '♦' ? 'text-red-600 text-lg font-bold' : 'text-gray-800 text-lg font-bold'}>
                          {card.rank}{card.suit}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState.phase === 'cleanup' && (
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h2 className="text-2xl font-bold mb-4">Hand Complete!</h2>
            <div className="text-xl mb-4">
              <div>Contract: {gameState.currentBid.value}
                {gameState.currentBid.doubled && ' X'}
                {gameState.currentBid.redoubled && ' XX'}
                {' by '}{gameState.currentBid.position}
              </div>
              <div className="mt-2">Tricks Won:</div>
              <div>North-South: {gameState.tricksWon.northSouth}</div>
              <div>East-West: {gameState.tricksWon.eastWest}</div>
            </div>
            <div className="text-lg font-semibold mb-4">
              {(() => {
                const declarerTeam = POSITIONS.indexOf(gameState.currentBid.position) % 2 ? 'northSouth' : 'eastWest';
                const tricksNeeded = 6 + parseInt(gameState.currentBid.value);
                const tricksMade = gameState.tricksWon[declarerTeam];
                const diff = tricksMade - tricksNeeded;

                if (tricksMade >= tricksNeeded) {
                  if (diff === 0) {
                    return `${gameState.currentBid.position}'s team made the contract exactly!`;
                  } else {
                    return `${gameState.currentBid.position}'s team made the contract with ${diff} overtrick${diff > 1 ? 's' : ''}!`;
                  }
                } else {
                  return `${gameState.currentBid.position}'s team was set by ${-diff} trick${-diff > 1 ? 's' : ''}!`;
                }
              })()}
            </div>
            <div className="text-lg mb-6 p-4 bg-gray-100 rounded">
              <div className="font-bold mb-2">Current Score:</div>
              <div>North-South: {gameState.score.northSouth}</div>
              <div>East-West: {gameState.score.eastWest}</div>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Next hand starting automatically in 5 seconds...
            </div>
            <button
              onClick={newHand}
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