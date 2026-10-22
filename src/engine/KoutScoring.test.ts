/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { GameState } from '../types/kout';
import { SCORING } from '../rules/config';
import { getLegalCards } from '../rules/cards';
import { getPlayedCards } from './KoutTricks';
import { computeRoundResult, scoreRound } from './KoutScoring';
import { KoutGameEngine } from './KoutGameEngine';

function createMockCompletedRound(overrides: Partial<GameState> = {}): GameState {
  return {
    variant: 'BO6',
    hands: [[], [], [], [], [], []],
    dealer: 0,
    currentSeat: 1,
    bids: [{ seat: 1, bid: 6 }],
    highBid: 6,
    bidderSeat: 1, // Team 1 (seat 1 % 2 === 1)
    trump: 'H',
    currentTrick: [],
    trickHistory: Array.from({ length: 9 }, () => []),
    tricksWon: [3, 6], // Team 0 won 3, Team 1 won 6
    scores: [10, 20],
    phase: 'ROUND_END',
    roundNo: 2,
    targetScore: 51,
    version: 15,
    players: Array.from({ length: 6 }, (_, i) => ({
      seatIndex: i,
      kind: 'HUMAN_LOCAL',
      name: `Player ${i}`,
      team: (i % 2) as 0 | 1,
      connected: true,
    })),
    ...overrides,
  };
}

describe('KoutScoring', () => {
  describe('Successful Bid Scoring', () => {
    it('awards success points to bidding team when bid is made', () => {
      // Seat 1 (Team 1) bid 6 and won 6 tricks
      const state = createMockCompletedRound({
        highBid: 6,
        bidderSeat: 1,
        tricksWon: [3, 6], // Team 0: 3, Team 1: 6
        scores: [0, 0],
      });

      const result = computeRoundResult(state);
      expect(result.made).toBe(true);
      expect(result.awardedTeam).toBe(1);
      expect(result.pointsAdded).toBe(SCORING[6].successPoints); // 6
      expect(result.isBawan).toBe(false);

      const nextState = scoreRound(state);
      expect(nextState.scores).toEqual([0, 6]);
      expect(nextState.phase).toBe('ROUND_END');
      expect(nextState.dealer).toBe(1); // 0 rotated to 1
    });

    it('awards kabout bonus when bidding team wins all 9 tricks', () => {
      const state = createMockCompletedRound({
        highBid: 7,
        bidderSeat: 0, // Team 0
        tricksWon: [9, 0],
        scores: [10, 10],
      });

      const result = computeRoundResult(state);
      expect(result.made).toBe(true);
      expect(result.awardedTeam).toBe(0);
      expect(result.pointsAdded).toBe(SCORING[7].kaboutBonus); // 14

      const nextState = scoreRound(state);
      expect(nextState.scores).toEqual([24, 10]);
    });
  });

  describe('Failed Bid Scoring', () => {
    it('awards fail penalty to defending team when bidding team fails', () => {
      // Seat 1 (Team 1) bid 7 but won only 5 tricks; defending team (Team 0) won 4
      const state = createMockCompletedRound({
        highBid: 7,
        bidderSeat: 1,
        tricksWon: [4, 5],
        scores: [10, 10],
      });

      const result = computeRoundResult(state);
      expect(result.made).toBe(false);
      expect(result.awardedTeam).toBe(0); // Defending team receives points
      expect(result.pointsAdded).toBe(SCORING[7].failPenalty); // 7

      const nextState = scoreRound(state);
      expect(nextState.scores).toEqual([17, 10]);
      expect(nextState.phase).toBe('ROUND_END');
      expect(nextState.dealer).toBe(1);
    });
  });

  describe('Bawan (باوان) Instant Win', () => {
    it('triggers instant game win on successful bid 9 in round 1', () => {
      // Round 1: Seat 0 bids 9 and wins all 9 tricks
      const state = createMockCompletedRound({
        roundNo: 1,
        highBid: 9,
        bidderSeat: 0, // Team 0
        tricksWon: [9, 0],
        scores: [0, 0], // Target is 51, current is 0
        targetScore: 51,
      });

      const result = computeRoundResult(state);
      expect(result.made).toBe(true);
      expect(result.isBawan).toBe(true);
      expect(result.gameWinner).toBe(0);

      const nextState = scoreRound(state);
      expect(nextState.phase).toBe('GAME_END'); // Instant win!
      expect(nextState.scores[0]).toBe(SCORING[9].kaboutBonus);
    });

    it('does NOT trigger Bawan if bid 9 is made in round 2 or later (standard score instead)', () => {
      const state = createMockCompletedRound({
        roundNo: 2, // Not round 1
        highBid: 9,
        bidderSeat: 0,
        tricksWon: [9, 0],
        scores: [0, 0],
        targetScore: 51,
      });

      const result = computeRoundResult(state);
      expect(result.made).toBe(true);
      expect(result.isBawan).toBe(false);
      expect(result.gameWinner).toBeNull(); // Target 51 not reached (score is 18)

      const nextState = scoreRound(state);
      expect(nextState.phase).toBe('ROUND_END');
    });
  });

  describe('Target Score Detection', () => {
    it('transitions to GAME_END when a team reaches the target score (e.g. 51)', () => {
      const state = createMockCompletedRound({
        highBid: 6,
        bidderSeat: 0, // Team 0
        tricksWon: [6, 3],
        scores: [46, 30],
        targetScore: 51,
      });

      const nextState = scoreRound(state);
      expect(nextState.scores[0]).toBe(52); // 46 + 6 >= 51
      expect(nextState.phase).toBe('GAME_END');
    });
  });

  describe('Engine Integration', () => {
    it('automatically triggers scoreRound and updates score when the last card of a round is played', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 12345 });
      engine.startRound(12345);
      engine.placeBid(1, 5);
      for (let s = 2; s <= 5; s++) engine.placeBid(s, 0);
      engine.placeBid(0, 0);
      engine.declareTrump(1, 'H');

      // Play all 9 tricks (54 cards) using legal cards
      for (let t = 0; t < 9; t++) {
        for (let p = 0; p < 6; p++) {
          const seat = engine.state.currentSeat;
          const hand = engine.state.hands[seat];
          const playedCards = getPlayedCards(engine.state.trickHistory, engine.state.currentTrick);
          const legal = getLegalCards(hand, engine.state.currentTrick, engine.state.trump, {
            playedCards,
            highBid: engine.state.highBid,
          });
          engine.playCard(seat, legal[0]);
        }
      }

      // At end of trick 9, phase should be ROUND_END or GAME_END, and scores updated
      expect(['ROUND_END', 'GAME_END']).toContain(engine.state.phase);
      const totalScore = engine.state.scores[0] + engine.state.scores[1];
      expect(totalScore).toBeGreaterThan(0);
    });
  });
});
