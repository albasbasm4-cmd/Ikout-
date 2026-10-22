/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { buildDeck, deal, shuffle, mulberry32 } from './deck';
import { RULES } from './config';

describe('Deck and Dealing Rules', () => {
  describe('BO6 Variant', () => {
    it('should build exactly 54 cards including 2 jokers', () => {
      const deck = buildDeck('BO6');
      expect(deck.length).toBe(54);
      expect(deck.length).toBe(RULES.BO6.totalCards);

      const jokers = deck.filter((c) => c.joker !== undefined);
      expect(jokers.length).toBe(2);
      expect(jokers.map((j) => j.joker).sort()).toEqual(['BLACK', 'RED']);

      const standardCards = deck.filter((c) => c.joker === undefined);
      expect(standardCards.length).toBe(52);

      // Verify unique IDs
      const uniqueIds = new Set(deck.map((c) => c.id));
      expect(uniqueIds.size).toBe(54);
    });

    it('should deal 9 cards to each of the 6 players', () => {
      const { hands, deck } = deal('BO6', 12345);
      expect(hands.length).toBe(6);
      expect(deck.length).toBe(54);

      hands.forEach((hand, idx) => {
        expect(hand.length).toBe(9);
        expect(hand.length).toBe(RULES.BO6.cardsPerPlayer);
      });

      // All dealt cards combined should equal 54 unique cards
      const allDealtCards = hands.flat();
      expect(allDealtCards.length).toBe(54);
      const uniqueDealtIds = new Set(allDealtCards.map((c) => c.id));
      expect(uniqueDealtIds.size).toBe(54);
    });
  });

  describe('BO4 Variant', () => {
    it('should build exactly 32 cards with ranks 7..14 and no jokers', () => {
      const deck = buildDeck('BO4');
      expect(deck.length).toBe(32);
      expect(deck.length).toBe(RULES.BO4.totalCards);

      const jokers = deck.filter((c) => c.joker !== undefined);
      expect(jokers.length).toBe(0);

      // Ensure all ranks are between 7 and 14
      deck.forEach((card) => {
        expect(card.rank).toBeGreaterThanOrEqual(7);
        expect(card.rank).toBeLessThanOrEqual(14);
      });

      const uniqueIds = new Set(deck.map((c) => c.id));
      expect(uniqueIds.size).toBe(32);
    });

    it('should deal 8 cards to each of the 4 players', () => {
      const { hands, deck } = deal('BO4', 67890);
      expect(hands.length).toBe(4);
      expect(deck.length).toBe(32);

      hands.forEach((hand) => {
        expect(hand.length).toBe(8);
        expect(hand.length).toBe(RULES.BO4.cardsPerPlayer);
      });

      const allDealtCards = hands.flat();
      expect(allDealtCards.length).toBe(32);
      const uniqueDealtIds = new Set(allDealtCards.map((c) => c.id));
      expect(uniqueDealtIds.size).toBe(32);
    });
  });

  describe('Deterministic RNG and Shuffling', () => {
    it('should produce identical shuffle results for identical seeds', () => {
      const deckA = buildDeck('BO6');
      const deckB = buildDeck('BO6');

      const shuffled1 = shuffle(deckA, 42);
      const shuffled2 = shuffle(deckB, 42);

      expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
    });

    it('should produce different order with different seeds', () => {
      const deckA = buildDeck('BO6');
      const deckB = buildDeck('BO6');

      const shuffled1 = shuffle(deckA, 100);
      const shuffled2 = shuffle(deckB, 9999);

      expect(shuffled1.map((c) => c.id)).not.toEqual(shuffled2.map((c) => c.id));
    });

    it('mulberry32 should produce deterministic numbers between 0 and 1', () => {
      const rng1 = mulberry32(777);
      const rng2 = mulberry32(777);

      const seq1 = [rng1(), rng1(), rng1()];
      const seq2 = [rng2(), rng2(), rng2()];

      expect(seq1).toEqual(seq2);
      seq1.forEach((num) => {
        expect(num).toBeGreaterThanOrEqual(0);
        expect(num).toBeLessThan(1);
      });
    });
  });
});
