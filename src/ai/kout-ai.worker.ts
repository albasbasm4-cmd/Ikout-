/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { evaluateBid } from './BidEvaluator';
import { chooseCard } from './ISMCTS';
import { RULES } from '../rules/config';
import { GameState, Difficulty, Bid, Suit, Card } from '../types/kout';

export interface WorkerRequest {
  state: GameState;
  seat: number;
  difficulty: Difficulty;
  requestId: string | number;
}

export type WorkerDecision =
  | { type: 'BID'; bid: Bid; bestSuit: Suit }
  | { type: 'TRUMP'; suit: Suit }
  | { type: 'PLAY'; card: Card };

export interface WorkerResponse {
  requestId: string | number;
  decision?: WorkerDecision;
  success: boolean;
  error?: string;
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { state, seat, difficulty, requestId } = e.data;

  try {
    let decision: WorkerDecision;

    if (state.phase === 'BID') {
      const numSeats = RULES[state.variant].seats;
      const isDealer = seat === state.dealer;
      const isDealerForced =
        isDealer &&
        state.bids.length === numSeats - 1 &&
        state.bids.every((b) => b.bid === 0);

      const evalResult = evaluateBid(
        state.hands[seat] || [],
        state.highBid,
        isDealerForced,
        difficulty
      );

      decision = {
        type: 'BID',
        bid: evalResult.bid,
        bestSuit: evalResult.bestSuit,
      };
    } else if (state.phase === 'TRUMP') {
      const evalResult = evaluateBid(
        state.hands[seat] || [],
        null,
        false,
        difficulty
      );

      decision = {
        type: 'TRUMP',
        suit: evalResult.bestSuit,
      };
    } else if (state.phase === 'PLAY') {
      const card = chooseCard(state, seat, { difficulty });
      decision = {
        type: 'PLAY',
        card,
      };
    } else {
      throw new Error(`Unsupported game phase for AI decision: ${state.phase}`);
    }

    const response: WorkerResponse = {
      requestId,
      decision,
      success: true,
    };
    self.postMessage(response);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const response: WorkerResponse = {
      requestId,
      success: false,
      error: errorMsg,
    };
    self.postMessage(response);
  }
};
