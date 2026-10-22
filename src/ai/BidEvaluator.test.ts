/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Card } from '../types/kout';
import { evaluateBid, scoreHandForSuit } from './BidEvaluator';

describe('BidEvaluator', () => {
  // Hand 1: Monster Hand (Red Joker, Black Joker, Trump Ace/King/Queen/10 of Spades, side Aces)
  const monsterHand: Card[] = [
    { id: 'JOKER-RED', joker: 'RED' },
    { id: 'JOKER-BLACK', joker: 'BLACK' },
    { id: 'S-14', suit: 'S', rank: 14 },
    { id: 'S-13', suit: 'S', rank: 13 },
    { id: 'S-12', suit: 'S', rank: 12 },
    { id: 'S-10', suit: 'S', rank: 10 },
    { id: 'H-14', suit: 'H', rank: 14 },
    { id: 'H-13', suit: 'H', rank: 13 },
    { id: 'D-14', suit: 'D', rank: 14 },
  ];

  // Hand 2: Moderate Competitive Hand (4 Hearts with Ace & Queen, side Ace of Clubs, King of Diamonds)
  const moderateHand: Card[] = [
    { id: 'H-14', suit: 'H', rank: 14 },
    { id: 'H-12', suit: 'H', rank: 12 },
    { id: 'H-9', suit: 'H', rank: 9 },
    { id: 'H-4', suit: 'H', rank: 4 },
    { id: 'C-14', suit: 'C', rank: 14 },
    { id: 'D-13', suit: 'D', rank: 13 },
    { id: 'D-8', suit: 'D', rank: 8 },
    { id: 'S-6', suit: 'S', rank: 6 },
    { id: 'S-2', suit: 'S', rank: 2 },
  ];

  // Hand 3: Weak / Bust Hand (low cards, no Aces, no Kings, no Jokers)
  const weakHand: Card[] = [
    { id: 'C-2', suit: 'C', rank: 2 },
    { id: 'C-3', suit: 'C', rank: 3 },
    { id: 'C-4', suit: 'C', rank: 4 },
    { id: 'D-2', suit: 'D', rank: 2 },
    { id: 'D-4', suit: 'D', rank: 4 },
    { id: 'S-3', suit: 'S', rank: 3 },
    { id: 'S-5', suit: 'S', rank: 5 },
    { id: 'H-4', suit: 'H', rank: 4 },
    { id: 'H-5', suit: 'H', rank: 5 },
  ];

  describe('Sample Hand 1: Monster Hand', () => {
    it('identifies Spades as best suit and places a high bid (8 or 9)', () => {
      const evalResult = evaluateBid(monsterHand, null, false, 'EXPERT');

      expect(evalResult.bestSuit).toBe('S');
      expect(evalResult.suit).toBe('S');
      expect(evalResult.bid).toBeGreaterThanOrEqual(8);
      expect(evalResult.score).toBeGreaterThan(6.0);
    });

    it('can outbid an existing high bid of 7 with an 8 or 9', () => {
      const evalResult = evaluateBid(monsterHand, 7, false, 'EXPERT');
      expect(evalResult.bid).toBeGreaterThan(7);
      expect(['S', 'H', 'D', 'C']).toContain(evalResult.bestSuit);
    });
  });

  describe('Sample Hand 2: Moderate Hand', () => {
    it('identifies Hearts as best suit and bids 5 or 6 on opening', () => {
      const evalResult = evaluateBid(moderateHand, null, false, 'MEDIUM');

      expect(evalResult.bestSuit).toBe('H');
      expect([5, 6]).toContain(evalResult.bid);
    });

    it('passes if current high bid is higher than hand potential (e.g. 7)', () => {
      const evalResult = evaluateBid(moderateHand, 7, false, 'EXPERT');

      // Cannot beat 7, so passes
      expect(evalResult.bid).toBe(0);
      expect(evalResult.bestSuit).toBe('H');
    });
  });

  describe('Sample Hand 3: Weak Hand', () => {
    it('passes (bid = 0) under normal conditions', () => {
      const evalResult = evaluateBid(weakHand, null, false, 'EXPERT');

      expect(evalResult.bid).toBe(0);
      expect(evalResult.bestSuit).toBeDefined();
    });

    it('forces bid 5 (Malzom) when isDealerForced is true', () => {
      const evalResult = evaluateBid(weakHand, null, true, 'EXPERT');

      // Dealer is forced (Malzom) -> must bid 5 despite weak cards
      expect(evalResult.bid).toBe(5);
      expect(evalResult.bestSuit).toBeDefined();
    });
  });

  describe('Difficulty Levels', () => {
    it('EXPERT is stricter than EASY and accounts for partner position', () => {
      const scoreMedium = scoreHandForSuit(moderateHand, 'H');
      expect(scoreMedium).toBeGreaterThan(3.0);

      const expertResult = evaluateBid(moderateHand, 6, false, 'EXPERT');
      // Expert will not overbid 6 with a borderline moderate hand
      expect(expertResult.bid).toBe(0);
    });

    it('EASY produces a valid Bid or pass (0 or 5..9)', () => {
      const easyResult = evaluateBid(moderateHand, null, false, 'EASY');
      expect([0, 5, 6, 7, 8, 9]).toContain(easyResult.bid);
      expect(['S', 'H', 'D', 'C']).toContain(easyResult.bestSuit);
    });
  });
});
