/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { Card, Suit, TrickPlay } from '../types/kout';
import { cardStrength, trickWinner, getLegalCards, areTrumpHonorsPlayed, sortHandCards } from './cards';
import { RULES } from './config';

describe('Card Strength and Trick Winner Rules', () => {
  const trump: Suit = 'H';
  const ledSuit: Suit = 'S';

  const redJoker: Card = { id: 'JOKER-RED', joker: 'RED' };
  const blackJoker: Card = { id: 'JOKER-BLACK', joker: 'BLACK' };
  const trumpAce: Card = { id: 'H-14', suit: 'H', rank: 14 };
  const trumpKing: Card = { id: 'H-13', suit: 'H', rank: 13 };
  const trumpTwo: Card = { id: 'H-2', suit: 'H', rank: 2 };
  const ledAce: Card = { id: 'S-14', suit: 'S', rank: 14 };
  const ledTwo: Card = { id: 'S-2', suit: 'S', rank: 2 };
  const offSuitAce: Card = { id: 'C-14', suit: 'C', rank: 14 };

  describe('cardStrength hierarchy', () => {
    it('strictly satisfies: Red Joker > Trump Ace > Black Joker > trump K..2 > led suit A..2 > others 0', () => {
      const redJokerStr = cardStrength(redJoker, trump, ledSuit);
      const trumpAceStr = cardStrength(trumpAce, trump, ledSuit);
      const blackJokerStr = cardStrength(blackJoker, trump, ledSuit);
      const trumpKingStr = cardStrength(trumpKing, trump, ledSuit);
      const trumpTwoStr = cardStrength(trumpTwo, trump, ledSuit);
      const ledAceStr = cardStrength(ledAce, trump, ledSuit);
      const ledTwoStr = cardStrength(ledTwo, trump, ledSuit);
      const offSuitAceStr = cardStrength(offSuitAce, trump, ledSuit);

      // Hierarchy assertions
      expect(redJokerStr).toBeGreaterThan(trumpAceStr);
      expect(trumpAceStr).toBeGreaterThan(blackJokerStr);
      expect(blackJokerStr).toBeGreaterThan(trumpKingStr);
      expect(trumpKingStr).toBeGreaterThan(trumpTwoStr);
      expect(trumpTwoStr).toBeGreaterThan(ledAceStr);
      expect(ledAceStr).toBeGreaterThan(ledTwoStr);
      expect(ledTwoStr).toBeGreaterThan(offSuitAceStr);
      expect(offSuitAceStr).toBe(0);
    });
  });

  describe('trickWinner resolution', () => {
    it('awards trick to Red Joker over Trump Ace and Black Joker', () => {
      const plays: TrickPlay[] = [
        { seat: 0, card: ledAce },
        { seat: 1, card: trumpAce },
        { seat: 2, card: blackJoker },
        { seat: 3, card: redJoker },
      ];
      const winner = trickWinner(plays, trump);
      expect(winner.seat).toBe(3);
      expect(winner.card.id).toBe('JOKER-RED');
    });

    it('awards trick to Trump Ace over Black Joker and trump King', () => {
      const plays: TrickPlay[] = [
        { seat: 0, card: ledAce },
        { seat: 1, card: trumpKing },
        { seat: 2, card: blackJoker },
        { seat: 3, card: trumpAce },
      ];
      const winner = trickWinner(plays, trump);
      expect(winner.seat).toBe(3);
      expect(winner.card.id).toBe('H-14');
    });

    it('awards trick to Black Joker over trump King', () => {
      const plays: TrickPlay[] = [
        { seat: 0, card: ledAce },
        { seat: 1, card: trumpKing },
        { seat: 2, card: blackJoker },
      ];
      const winner = trickWinner(plays, trump);
      expect(winner.seat).toBe(2);
      expect(winner.card.id).toBe('JOKER-BLACK');
    });

    it('treats Joker lead as trump lead for following players', () => {
      const plays: TrickPlay[] = [
        { seat: 0, card: blackJoker }, // leads joker (counts as trump)
        { seat: 1, card: trumpKing },
        { seat: 2, card: trumpAce }, // beats Black Joker
      ];
      const winner = trickWinner(plays, trump);
      expect(winner.seat).toBe(2);
      expect(winner.card.id).toBe('H-14');
    });
  });
});

describe('getLegalCards & Joker Rules', () => {
  const trump: Suit = 'H';
  const redJoker: Card = { id: 'JOKER-RED', joker: 'RED' };
  const blackJoker: Card = { id: 'JOKER-BLACK', joker: 'BLACK' };
  const spadeCard: Card = { id: 'S-9', suit: 'S', rank: 9 };
  const diamondCard: Card = { id: 'D-10', suit: 'D', rank: 10 };
  const trumpSmall: Card = { id: 'H-4', suit: 'H', rank: 4 };

  const trumpA: Card = { id: 'H-14', suit: 'H', rank: 14 };
  const trumpK: Card = { id: 'H-13', suit: 'H', rank: 13 };
  const trumpQ: Card = { id: 'H-12', suit: 'H', rank: 12 };
  const trumpJ: Card = { id: 'H-11', suit: 'H', rank: 11 };

  describe('Following Led Suit and Void Rules', () => {
    it('must follow led plain suit if possible, jokers do not count as plain suit', () => {
      const hand: Card[] = [spadeCard, redJoker, diamondCard];
      const trick: TrickPlay[] = [{ seat: 0, card: { id: 'S-14', suit: 'S', rank: 14 } }];

      const legal = getLegalCards(hand, trick, trump, {});
      expect(legal.length).toBe(1);
      expect(legal[0].id).toBe('S-9');
    });

    it('allows any card (including jokers) if player is void in led suit', () => {
      const hand: Card[] = [redJoker, diamondCard, trumpSmall];
      const trick: TrickPlay[] = [{ seat: 0, card: { id: 'S-14', suit: 'S', rank: 14 } }];

      const legal = getLegalCards(hand, trick, trump, {});
      expect(legal.length).toBe(3);
    });

    it('considers Jokers as trump when trump is led', () => {
      // Player has only Red Joker and Diamond, trump is led
      const hand: Card[] = [redJoker, diamondCard];
      const trick: TrickPlay[] = [{ seat: 0, card: { id: 'H-7', suit: 'H', rank: 7 } }];

      const legal = getLegalCards(hand, trick, trump, {});
      // Must follow trump; since joker counts as trump, redJoker must be played
      expect(legal.length).toBe(1);
      expect(legal[0].id).toBe('JOKER-RED');
    });
  });

  describe('Joker Lead Rule (a): Trump A, K, Q, J all played', () => {
    it('allows both Jokers to lead when trump A, K, Q, J have all been played', () => {
      const hand: Card[] = [redJoker, blackJoker, diamondCard];
      const ctx = {
        playedCards: [trumpA, trumpK, trumpQ, trumpJ],
        highBid: 6 as const,
      };

      expect(areTrumpHonorsPlayed(trump, ctx.playedCards)).toBe(true);

      const legal = getLegalCards(hand, [], trump, ctx);
      // Both jokers and diamondCard are legal leads
      expect(legal.map((c) => c.id).sort()).toEqual(
        ['D-10', 'JOKER-BLACK', 'JOKER-RED'].sort()
      );
    });

    it('does NOT allow Jokers to lead via rule (a) if only 3 of trump honors are played', () => {
      const hand: Card[] = [redJoker, blackJoker, diamondCard];
      const ctx = {
        playedCards: [trumpA, trumpK, trumpQ], // Missing trumpJ
        highBid: 6 as const,
      };

      expect(areTrumpHonorsPlayed(trump, ctx.playedCards)).toBe(false);

      const legal = getLegalCards(hand, [], trump, ctx);
      // Only diamondCard is legal to lead
      expect(legal.length).toBe(1);
      expect(legal[0].id).toBe('D-10');
    });
  });

  describe('Joker Lead Rule (b): Bid 8 -> Red Joker only, Bid 9 -> both', () => {
    it('allows only Red Joker to lead when bid is 8', () => {
      const hand: Card[] = [redJoker, blackJoker, diamondCard];
      const ctx = {
        playedCards: [],
        highBid: 8 as const,
      };

      const legal = getLegalCards(hand, [], trump, ctx);
      const legalIds = legal.map((c) => c.id);

      expect(legalIds).toContain('JOKER-RED');
      expect(legalIds).toContain('D-10');
      expect(legalIds).not.toContain('JOKER-BLACK');
    });

    it('allows both Red Joker and Black Joker to lead when bid is 9', () => {
      const hand: Card[] = [redJoker, blackJoker, diamondCard];
      const ctx = {
        playedCards: [],
        highBid: 9 as const,
      };

      const legal = getLegalCards(hand, [], trump, ctx);
      const legalIds = legal.map((c) => c.id);

      expect(legalIds).toContain('JOKER-RED');
      expect(legalIds).toContain('JOKER-BLACK');
      expect(legalIds).toContain('D-10');
    });

    it('does not allow either joker to lead when bid is 5, 6, or 7 without honors played', () => {
      const hand: Card[] = [redJoker, blackJoker, diamondCard];
      const ctx = {
        playedCards: [],
        highBid: 7 as const,
      };

      const legal = getLegalCards(hand, [], trump, ctx);
      expect(legal.length).toBe(1);
      expect(legal[0].id).toBe('D-10');
    });
  });

  describe('Joker Lead Rule (c): Hand has nothing else', () => {
    it('allows Joker to lead when hand has only Jokers remaining', () => {
      const hand: Card[] = [redJoker, blackJoker];
      const ctx = {
        playedCards: [],
        highBid: 5 as const,
      };

      const legal = getLegalCards(hand, [], trump, ctx);
      expect(legal.length).toBe(2);
      expect(legal.map((c) => c.id).sort()).toEqual(['JOKER-BLACK', 'JOKER-RED']);
    });
  });
});

describe('sortHandCards', () => {
  it('places Red Joker then Black Joker first, then groups by suit and rank descending', () => {
    const unsortedHand: Card[] = [
      { id: 'C-7', suit: 'C', rank: 7 },
      { id: 'JOKER-BLACK', joker: 'BLACK' },
      { id: 'H-14', suit: 'H', rank: 14 },
      { id: 'S-2', suit: 'S', rank: 2 },
      { id: 'JOKER-RED', joker: 'RED' },
      { id: 'S-14', suit: 'S', rank: 14 },
      { id: 'H-10', suit: 'H', rank: 10 },
    ];

    const sorted = sortHandCards(unsortedHand, 'H');
    const ids = sorted.map((c) => c.id);

    // Red Joker, then Black Joker
    expect(ids[0]).toBe('JOKER-RED');
    expect(ids[1]).toBe('JOKER-BLACK');
    // Trump H (14 then 10)
    expect(ids[2]).toBe('H-14');
    expect(ids[3]).toBe('H-10');
    // Spades (14 then 2)
    expect(ids[4]).toBe('S-14');
    expect(ids[5]).toBe('S-2');
    // Clubs (7)
    expect(ids[6]).toBe('C-7');
  });
});
