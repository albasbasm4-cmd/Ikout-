/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { KoutGameEngine } from './KoutGameEngine';
import { getLegalCards } from '../rules/cards';
import { getPlayedCards } from './KoutTricks';

describe('KoutTricks & Trick Playing Engine', () => {
  describe('Trump Declaration', () => {
    it('allows only the winning bidder to declare trump and makes them lead the first trick', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 1234 });
      engine.startRound();

      // Bidding: Seat 1 bids 5, all others pass
      engine.placeBid(1, 5);
      for (let s = 2; s <= 5; s++) engine.placeBid(s, 0);
      engine.placeBid(0, 0);

      expect(engine.state.phase).toBe('TRUMP');
      expect(engine.state.bidderSeat).toBe(1);

      // Other player tries to declare trump -> throws
      expect(() => engine.declareTrump(2, 'H')).toThrowError(/Only the winning bidder/);

      // Winning bidder declares trump
      const playState = engine.declareTrump(1, 'H');
      expect(playState.phase).toBe('PLAY');
      expect(playState.trump).toBe('H');
      expect(playState.currentSeat).toBe(1); // Bid winner leads first trick
    });
  });

  describe('playCard Validation', () => {
    it('validates turn and throws if out-of-turn seat plays', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 5678 });
      engine.startRound();
      engine.placeBid(1, 5);
      for (let s = 2; s <= 5; s++) engine.placeBid(s, 0);
      engine.placeBid(0, 0);
      engine.declareTrump(1, 'S');

      // Current seat is 1, seat 2 tries to play
      const cardSeat2 = engine.state.hands[2][0];
      expect(() => engine.playCard(2, cardSeat2)).toThrowError(/Not seat 2's turn/);
    });

    it('rejects illegal card plays when player fails to follow led suit', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 9999 });
      engine.startRound();
      engine.placeBid(1, 5);
      for (let s = 2; s <= 5; s++) engine.placeBid(s, 0);
      engine.placeBid(0, 0);
      engine.declareTrump(1, 'C');

      // Seat 1 leads a card
      const hand1 = engine.state.hands[1];
      const leadCard = hand1[0];
      engine.playCard(1, leadCard);

      // Now seat 2 must play
      const hand2 = engine.state.hands[2];
      const ledSuit = leadCard.joker !== undefined ? 'C' : leadCard.suit;

      // Find if seat 2 has cards of ledSuit and also cards of another suit
      const matchingCards = hand2.filter((c) => c.suit === ledSuit);
      const nonMatchingCards = hand2.filter(
        (c) => c.suit !== ledSuit && c.joker === undefined
      );

      if (matchingCards.length > 0 && nonMatchingCards.length > 0) {
        // Trying to play non-matching card when holding matching cards must throw
        expect(() => engine.playCard(2, nonMatchingCards[0])).toThrowError(
          /Illegal card play/
        );
      }
    });
  });

  describe('Full Round Simulation with Fixed Seed', () => {
    it('plays an entire 9-trick round to completion deterministically', () => {
      const FIXED_SEED = 424242;
      const engine = new KoutGameEngine({
        variant: 'BO6',
        initialDealer: 0,
        seed: FIXED_SEED,
      });

      // 1. Start round
      engine.startRound(FIXED_SEED);
      expect(engine.state.phase).toBe('BID');
      expect(engine.state.roundNo).toBe(1);

      // 2. Bidding auction
      // Seat 1 bids 6, seats 2..5 pass, dealer passes
      engine.placeBid(1, 6);
      engine.placeBid(2, 0);
      engine.placeBid(3, 0);
      engine.placeBid(4, 0);
      engine.placeBid(5, 0);
      engine.placeBid(0, 0);

      expect(engine.state.phase).toBe('TRUMP');
      expect(engine.state.highBid).toBe(6);
      expect(engine.state.bidderSeat).toBe(1);

      // 3. Declare trump
      engine.declareTrump(1, 'D');
      expect(engine.state.phase).toBe('PLAY');
      expect(engine.state.trump).toBe('D');
      expect(engine.state.currentSeat).toBe(1);

      // 4. Play all 9 tricks (54 total card plays)
      const TOTAL_TRICKS = 9;
      const PLAYERS_COUNT = 6;

      for (let trickIdx = 0; trickIdx < TOTAL_TRICKS; trickIdx++) {
        const trickLeader = engine.state.currentSeat;

        for (let playIdx = 0; playIdx < PLAYERS_COUNT; playIdx++) {
          const seat = engine.state.currentSeat;
          const hand = engine.state.hands[seat];
          expect(hand.length).toBe(TOTAL_TRICKS - trickIdx);

          const playedCards = getPlayedCards(
            engine.state.trickHistory,
            engine.state.currentTrick
          );

          const legalCards = getLegalCards(
            hand,
            engine.state.currentTrick,
            engine.state.trump,
            { playedCards, highBid: engine.state.highBid }
          );

          expect(legalCards.length).toBeGreaterThan(0);

          // Play the first legal card
          const cardToPlay = legalCards[0];
          engine.playCard(seat, cardToPlay);
        }

        // After 6 plays, trick should be resolved and added to trickHistory
        expect(engine.state.trickHistory.length).toBe(trickIdx + 1);
        expect(engine.state.currentTrick.length).toBe(0);

        // Tricks won total must equal number of completed tricks
        const totalWon = engine.state.tricksWon[0] + engine.state.tricksWon[1];
        expect(totalWon).toBe(trickIdx + 1);
      }

      // 5. Verification after full round completion
      expect(engine.state.phase).toBe('ROUND_END');
      expect(engine.state.trickHistory.length).toBe(9);
      expect(engine.state.tricksWon[0] + engine.state.tricksWon[1]).toBe(9);

      // Every player's hand must be completely exhausted
      for (let s = 0; s < PLAYERS_COUNT; s++) {
        expect(engine.state.hands[s].length).toBe(0);
      }
    });
  });
});
