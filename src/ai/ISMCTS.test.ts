/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { GameState, Card, TrickPlay } from '../types/kout';
import { getLegalCards } from '../rules/cards';
import { getPlayedCards } from '../engine/KoutTricks';
import { chooseCard, inferPlayerVoids, determinizeHands } from './ISMCTS';

function createMockGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    variant: 'BO6',
    hands: [
      [
        { id: 'S-14', suit: 'S', rank: 14 },
        { id: 'S-10', suit: 'S', rank: 10 },
        { id: 'H-13', suit: 'H', rank: 13 },
        { id: 'D-8', suit: 'D', rank: 8 },
        { id: 'C-7', suit: 'C', rank: 7 },
      ],
      [
        { id: 'S-13', suit: 'S', rank: 13 },
        { id: 'H-14', suit: 'H', rank: 14 },
        { id: 'D-9', suit: 'D', rank: 9 },
        { id: 'C-8', suit: 'C', rank: 8 },
        { id: 'C-9', suit: 'C', rank: 9 },
      ],
      [
        { id: 'S-12', suit: 'S', rank: 12 },
        { id: 'H-12', suit: 'H', rank: 12 },
        { id: 'D-10', suit: 'D', rank: 10 },
        { id: 'D-11', suit: 'D', rank: 11 },
        { id: 'C-10', suit: 'C', rank: 10 },
      ],
      [
        { id: 'S-11', suit: 'S', rank: 11 },
        { id: 'H-11', suit: 'H', rank: 11 },
        { id: 'D-12', suit: 'D', rank: 12 },
        { id: 'C-11', suit: 'C', rank: 11 },
        { id: 'C-12', suit: 'C', rank: 12 },
      ],
      [
        { id: 'S-9', suit: 'S', rank: 9 },
        { id: 'H-10', suit: 'H', rank: 10 },
        { id: 'D-13', suit: 'D', rank: 13 },
        { id: 'D-14', suit: 'D', rank: 14 },
        { id: 'C-13', suit: 'C', rank: 13 },
      ],
      [
        { id: 'S-8', suit: 'S', rank: 8 },
        { id: 'H-9', suit: 'H', rank: 9 },
        { id: 'H-8', suit: 'H', rank: 8 },
        { id: 'D-7', suit: 'D', rank: 7 },
        { id: 'C-14', suit: 'C', rank: 14 },
      ],
    ],
    dealer: 0,
    currentSeat: 0,
    bids: [{ seat: 0, bid: 6 }],
    highBid: 6,
    bidderSeat: 0,
    trump: 'H',
    currentTrick: [],
    trickHistory: [],
    tricksWon: [0, 0],
    scores: [0, 0],
    phase: 'PLAY',
    roundNo: 1,
    targetScore: 51,
    version: 1,
    ...overrides,
  };
}

describe('ISMCTS chooseCard', () => {
  it('always returns a legal card when leading a trick (EASY mode / 0 iterations)', () => {
    const state = createMockGameState({ currentTrick: [], currentSeat: 0 });
    const hand = state.hands[0];
    const played = getPlayedCards(state.trickHistory, state.currentTrick);
    const legal = getLegalCards(hand, state.currentTrick, state.trump, {
      playedCards: played,
      highBid: state.highBid,
    });

    const chosen = chooseCard(state, 0, { difficulty: 'EASY', iterations: 0 });

    expect(legal.map((c) => c.id)).toContain(chosen.id);
  });

  it('always returns a legal card when following a trick (MEDIUM mode / 150 iterations)', () => {
    const state = createMockGameState({
      currentTrick: [{ seat: 5, card: { id: 'S-14', suit: 'S', rank: 14 } }],
      currentSeat: 0,
    });

    const hand = state.hands[0];
    const played = getPlayedCards(state.trickHistory, state.currentTrick);
    const legal = getLegalCards(hand, state.currentTrick, state.trump, {
      playedCards: played,
      highBid: state.highBid,
    });

    // Spades were led, player 0 has Spades, must return a Spade
    const chosen = chooseCard(state, 0, { difficulty: 'MEDIUM', iterations: 150 });

    expect(legal.map((c) => c.id)).toContain(chosen.id);
    expect(chosen.suit).toBe('S');
  });

  it('always returns a legal card under EXPERT mode within time budget', () => {
    const state = createMockGameState({
      currentTrick: [{ seat: 4, card: { id: 'C-2', suit: 'C', rank: 2 } }],
      currentSeat: 0,
    });

    const hand = state.hands[0];
    const played = getPlayedCards(state.trickHistory, state.currentTrick);
    const legal = getLegalCards(hand, state.currentTrick, state.trump, {
      playedCards: played,
      highBid: state.highBid,
    });

    const startTime = performance.now();
    const chosen = chooseCard(state, 0, {
      difficulty: 'EXPERT',
      iterations: 500,
      timeBudgetMs: 150,
    });
    const elapsed = performance.now() - startTime;

    expect(legal.map((c) => c.id)).toContain(chosen.id);
    expect(elapsed).toBeLessThan(1000);
  });

  it('immediately returns the single legal card if only one is available', () => {
    const singleCard: Card = { id: 'H-14', suit: 'H', rank: 14 };
    const state = createMockGameState({
      hands: [[singleCard], [], [], [], [], []],
      currentTrick: [],
      currentSeat: 0,
    });

    const chosen = chooseCard(state, 0, { iterations: 500 });
    expect(chosen.id).toBe('H-14');
  });

  it('correctly infers player void suits from earlier non-following tricks', () => {
    // In trick 0: Spades led by seat 0, seat 1 played Diamonds (void in Spades)
    const trickHistory: TrickPlay[][] = [
      [
        { seat: 0, card: { id: 'S-14', suit: 'S', rank: 14 } },
        { seat: 1, card: { id: 'D-2', suit: 'D', rank: 2 } }, // void in 'S'
        { seat: 2, card: { id: 'S-7', suit: 'S', rank: 7 } },
      ],
    ];

    const voids = inferPlayerVoids(trickHistory, 6, 'H');
    expect(voids.get(1)?.has('S')).toBe(true);
    expect(voids.get(2)?.has('S')).toBe(false);
  });

  it('determinizes hidden hands without giving void suits to players when possible', () => {
    const trickHistory: TrickPlay[][] = [
      [
        { seat: 0, card: { id: 'S-14', suit: 'S', rank: 14 } },
        { seat: 1, card: { id: 'D-2', suit: 'D', rank: 2 } }, // seat 1 void in 'S'
        { seat: 2, card: { id: 'S-7', suit: 'S', rank: 7 } },
      ],
    ];

    const state = createMockGameState({
      trickHistory,
      currentTrick: [],
      currentSeat: 0,
    });

    const determinized = determinizeHands(state, 0);

    expect(determinized.length).toBe(6);
    // Player 0 hand matches original
    expect(determinized[0].length).toBe(state.hands[0].length);
    // Other players have matching card counts
    for (let s = 1; s < 6; s++) {
      expect(determinized[s].length).toBe(state.hands[s].length);
    }
  });
});
