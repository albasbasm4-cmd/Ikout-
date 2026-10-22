/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { KoutGameEngine } from './KoutGameEngine';

describe('KoutGameEngine', () => {
  describe('startRound & Dealer Rotation', () => {
    it('initializes round 1 with dealer 0 and first bidder counter-clockwise at seat 1', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 100 });
      const initialVersion = engine.state.version;

      const state = engine.startRound();

      expect(state.roundNo).toBe(1);
      expect(state.dealer).toBe(0);
      expect(state.currentSeat).toBe(1); // Counter-clockwise immediately after dealer
      expect(state.phase).toBe('BID');
      expect(state.hands.length).toBe(6);
      expect(state.hands[0].length).toBe(9);
      expect(state.version).toBe(initialVersion + 1);
    });

    it('rotates dealer counter-clockwise on subsequent rounds', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0, seed: 200 });

      const stateRound1 = engine.startRound();
      expect(stateRound1.dealer).toBe(0);
      expect(stateRound1.currentSeat).toBe(1);

      const stateRound2 = engine.startRound();
      expect(stateRound2.roundNo).toBe(2);
      expect(stateRound2.dealer).toBe(1); // Rotated to seat 1
      expect(stateRound2.currentSeat).toBe(2); // First bidder is seat 2

      const stateRound3 = engine.startRound();
      expect(stateRound3.roundNo).toBe(3);
      expect(stateRound3.dealer).toBe(2);
      expect(stateRound3.currentSeat).toBe(3);
    });

    it('is deterministic when provided with the same seed', () => {
      const engineA = new KoutGameEngine({ variant: 'BO6', seed: 999 });
      const engineB = new KoutGameEngine({ variant: 'BO6', seed: 999 });

      const stateA = engineA.startRound(777);
      const stateB = engineB.startRound(777);

      expect(stateA.hands).toEqual(stateB.hands);
    });
  });

  describe('placeBid validation & Auction Flow', () => {
    it('validates turn and throws if out-of-turn seat attempts to bid', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      // currentSeat is 1; seat 2 tries to bid
      expect(() => engine.placeBid(2, 5)).toThrowError(/Not seat 2's turn/);
    });

    it('validates that bids must be higher than current highBid', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      engine.placeBid(1, 6);
      expect(engine.state.highBid).toBe(6);
      expect(engine.state.currentSeat).toBe(2);

      // Seat 2 tries to bid 5 or 6 (not higher than 6)
      expect(() => engine.placeBid(2, 5)).toThrowError(/must be higher than current high bid 6/);
      expect(() => engine.placeBid(2, 6)).toThrowError(/must be higher than current high bid 6/);

      // Seat 2 outbidding with 7 succeeds
      const stateAfter7 = engine.placeBid(2, 7);
      expect(stateAfter7.highBid).toBe(7);
      expect(stateAfter7.bidderSeat).toBe(2);
      expect(stateAfter7.currentSeat).toBe(3);
    });

    it('allows passing with bid = 0 without changing highBid or bidderSeat', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      engine.placeBid(1, 6);
      const prevHighBid = engine.state.highBid;
      const prevBidder = engine.state.bidderSeat;

      // Seat 2 passes
      const stateAfterPass = engine.placeBid(2, 0);
      expect(stateAfterPass.highBid).toBe(prevHighBid);
      expect(stateAfterPass.bidderSeat).toBe(prevBidder);
      expect(stateAfterPass.currentSeat).toBe(3);
      expect(stateAfterPass.bids[1]).toEqual({ seat: 2, bid: 0 });
    });

    it('increments state version and returns a new state object on each action', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      const s0 = engine.startRound();
      const s1 = engine.placeBid(1, 5);

      expect(s1).not.toBe(s0);
      expect(s1.version).toBe(s0.version + 1);
    });
  });

  describe('Forced Bid (Malzom) Rules', () => {
    it('forces dealer to bid 5 (Malzom) when all other 5 players pass', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound(); // dealer is 0, first bidder is 1

      // Seats 1, 2, 3, 4, 5 all pass
      engine.placeBid(1, 0);
      engine.placeBid(2, 0);
      engine.placeBid(3, 0);
      engine.placeBid(4, 0);
      engine.placeBid(5, 0);

      expect(engine.state.currentSeat).toBe(0); // Dealer's turn
      expect(engine.state.highBid).toBeNull();

      // Dealer attempts to pass (0) -> forced bid converts to 5 (Malzom)
      const finalAuctionState = engine.placeBid(0, 0);

      expect(finalAuctionState.highBid).toBe(5);
      expect(finalAuctionState.bidderSeat).toBe(0);
      expect(finalAuctionState.phase).toBe('TRUMP');
      expect(finalAuctionState.currentSeat).toBe(0); // Winning bidder must select trump
      expect(finalAuctionState.bids.find((b) => b.seat === 0)?.bid).toBe(5);
    });

    it('allows dealer to explicitly bid 5 or higher when all passed', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      // Seats 1..5 pass
      for (let s = 1; s <= 5; s++) {
        engine.placeBid(s, 0);
      }

      const finalState = engine.placeBid(0, 6);
      expect(finalState.highBid).toBe(6);
      expect(finalState.bidderSeat).toBe(0);
      expect(finalState.phase).toBe('TRUMP');
    });

    it('allows dealer to pass normally if someone else placed a bid', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      engine.placeBid(1, 5); // Seat 1 bids 5
      engine.placeBid(2, 0); // Seat 2 passes
      engine.placeBid(3, 0); // Seat 3 passes
      engine.placeBid(4, 0); // Seat 4 passes
      engine.placeBid(5, 0); // Seat 5 passes

      // Dealer can pass normally because not all passed
      const finalState = engine.placeBid(0, 0);
      expect(finalState.highBid).toBe(5);
      expect(finalState.bidderSeat).toBe(1);
      expect(finalState.phase).toBe('TRUMP');
      expect(finalState.currentSeat).toBe(1); // Seat 1 won the auction
    });
  });

  describe('selectTrump transition', () => {
    it('transitions from TRUMP to PLAY when winning bidder chooses trump', () => {
      const engine = new KoutGameEngine({ variant: 'BO6', initialDealer: 0 });
      engine.startRound();

      engine.placeBid(1, 6);
      for (let s = 2; s <= 5; s++) engine.placeBid(s, 0);
      engine.placeBid(0, 0);

      expect(engine.state.phase).toBe('TRUMP');
      expect(engine.state.bidderSeat).toBe(1);

      // Seat 1 chooses Spades
      const playState = engine.selectTrump(1, 'S');
      expect(playState.phase).toBe('PLAY');
      expect(playState.trump).toBe('S');
    });
  });
});
