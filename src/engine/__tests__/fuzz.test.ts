/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { KoutGameEngine } from '../KoutGameEngine';
import { RULES } from '../../rules/config';
import { getLegalCards } from '../../rules/cards';
import { getPlayedCards } from '../KoutTricks';
import { mulberry32 } from '../../rules/deck';
import { Suit, Bid } from '../../types/kout';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

function simulateGame(variant: 'BO6' | 'BO4', seed: number, targetScore = 51) {
  const rng = mulberry32(seed);
  const config = RULES[variant];
  const numSeats = config.seats;
  const totalCards = config.totalCards;
  const cardsPerPlayer = config.cardsPerPlayer;

  const engine = new KoutGameEngine({
    variant,
    targetScore,
    seed: Math.floor(rng() * 1000000),
  });

  let safetyCounter = 0;
  const maxActions = 25000;

  // Start initial round
  engine.startRound();

  while (engine.state.phase !== 'GAME_END') {
    safetyCounter++;
    if (safetyCounter > maxActions) {
      throw new Error(
        `Game did not end within ${maxActions} actions (variant=${variant}, seed=${seed})`
      );
    }

    const state = engine.state;

    // Assert card count invariant during active round
    if (
      state.phase === 'BID' ||
      state.phase === 'TRUMP' ||
      state.phase === 'PLAY'
    ) {
      const cardsInHands = state.hands.reduce((sum, h) => sum + h.length, 0);
      const cardsInTrick = state.currentTrick.length;
      const cardsInHistory = state.trickHistory.reduce(
        (sum, t) => sum + t.length,
        0
      );
      const sumCards = cardsInHands + cardsInTrick + cardsInHistory;

      if (sumCards !== totalCards) {
        throw new Error(
          `Card count mismatch: expected ${totalCards}, got ${sumCards} (variant=${variant})`
        );
      }
    }

    if (state.phase === 'BID') {
      const currentSeat = state.currentSeat;
      const currentHigh = state.highBid ?? 0;
      const isDealer = currentSeat === state.dealer;
      const allOthersPassed =
        isDealer &&
        state.bids.length === numSeats - 1 &&
        state.bids.every((b) => b.bid === 0);

      const legalBids: Bid[] = [];

      if (allOthersPassed) {
        // Dealer is Malzom: must bid 5..cardsPerPlayer (or pass 0 which auto-forces 5)
        for (let b = 5; b <= cardsPerPlayer; b++) {
          legalBids.push(b as Bid);
        }
        legalBids.push(0);
      } else {
        legalBids.push(0); // Pass
        const minBid = Math.max(5, currentHigh + 1);
        for (let b = minBid; b <= cardsPerPlayer; b++) {
          legalBids.push(b as Bid);
        }
      }

      const chosenBid = legalBids[Math.floor(rng() * legalBids.length)];
      engine.placeBid(currentSeat, chosenBid);
    } else if (state.phase === 'TRUMP') {
      const bidder = state.bidderSeat!;
      const suit = SUITS[Math.floor(rng() * SUITS.length)];
      engine.declareTrump(bidder, suit);
    } else if (state.phase === 'PLAY') {
      const currentSeat = state.currentSeat;
      const hand = state.hands[currentSeat];
      const playedCards = getPlayedCards(
        state.trickHistory,
        state.currentTrick
      );
      const legalCards = getLegalCards(
        hand,
        state.currentTrick,
        state.trump,
        {
          playedCards,
          highBid: state.highBid,
        }
      );

      if (legalCards.length === 0) {
        throw new Error(`No legal cards available for seat ${currentSeat}`);
      }

      const card = legalCards[Math.floor(rng() * legalCards.length)];
      engine.playCard(currentSeat, card);
    } else if (state.phase === 'ROUND_END') {
      // Assert trick count and plays per trick
      expect(state.trickHistory.length).toBe(cardsPerPlayer);
      for (const trick of state.trickHistory) {
        expect(trick.length).toBe(numSeats);
      }
      expect(state.hands.every((h) => h.length === 0)).toBe(true);

      // Start next round
      engine.startRound();
    }
  }

  // Assert game end conditions
  expect(engine.state.phase).toBe('GAME_END');
  const targetReached =
    engine.state.scores[0] >= targetScore ||
    engine.state.scores[1] >= targetScore;
  const bawanOccurred =
    engine.state.roundNo === 1 &&
    engine.state.highBid === 9 &&
    (engine.state.tricksWon[0] === 9 || engine.state.tricksWon[1] === 9);

  expect(targetReached || bawanOccurred).toBe(true);
}

describe('Fuzz Testing: 1000 Full Games', () => {
  it('simulates 500 BO6 games with random legal moves and verifies all invariants', () => {
    for (let i = 0; i < 500; i++) {
      simulateGame('BO6', 100000 + i);
    }
  }, 90000);

  it('simulates 500 BO4 games with random legal moves and verifies all invariants', () => {
    for (let i = 0; i < 500; i++) {
      simulateGame('BO4', 200000 + i);
    }
  }, 90000);
});
