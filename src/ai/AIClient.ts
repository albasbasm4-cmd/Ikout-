/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Difficulty, Bid, Suit, Card } from '../types/kout';
import { RULES } from '../rules/config';
import { getLegalCards } from '../rules/cards';
import { getPlayedCards } from '../engine/KoutTricks';
import { evaluateBid } from './BidEvaluator';
import { chooseCard } from './ISMCTS';
import type { WorkerDecision, WorkerResponse, WorkerRequest } from './kout-ai.worker';

export type { WorkerDecision, WorkerResponse, WorkerRequest };

export const AI_TIMEOUT_MS = 1500;

/**
 * Generates an instantaneous random legal move as a safety fallback
 * if the AI worker times out or fails.
 */
export function generateFallbackDecision(
  state: GameState,
  seat: number
): WorkerDecision {
  const numSeats = RULES[state.variant].seats;
  const cardsPerPlayer = RULES[state.variant].cardsPerPlayer;
  const suits: Suit[] = ['S', 'H', 'D', 'C'];
  const randomSuit = suits[Math.floor(Math.random() * suits.length)];

  if (state.phase === 'BID') {
    const isDealer = seat === state.dealer;
    const isDealerForced =
      isDealer &&
      state.bids.length === numSeats - 1 &&
      state.bids.every((b) => b.bid === 0);

    if (isDealerForced) {
      return { type: 'BID', bid: 5, bestSuit: randomSuit };
    }

    const legalBids: Bid[] = [0]; // Pass
    const minBid = Math.max(5, (state.highBid ?? 4) + 1);
    for (let b = minBid; b <= cardsPerPlayer; b++) {
      legalBids.push(b as Bid);
    }

    const chosenBid = legalBids[Math.floor(Math.random() * legalBids.length)];
    return { type: 'BID', bid: chosenBid, bestSuit: randomSuit };
  }

  if (state.phase === 'TRUMP') {
    return { type: 'TRUMP', suit: randomSuit };
  }

  // PLAY phase
  const hand = state.hands[seat] || [];
  const playedCards = getPlayedCards(state.trickHistory, state.currentTrick);
  const legalCards = getLegalCards(hand, state.currentTrick, state.trump, {
    playedCards,
    highBid: state.highBid,
  });

  const chosenCard =
    legalCards.length > 0
      ? legalCards[Math.floor(Math.random() * legalCards.length)]
      : hand[0];

  return { type: 'PLAY', card: chosenCard };
}

export interface DecisionOptions {
  skipDelay?: boolean;
  customDelayMs?: number;
}

export class AIClient {
  private worker: Worker | null = null;
  private pendingRequests = new Map<
    string | number,
    {
      resolve: (decision: WorkerDecision) => void;
      reject: (reason?: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();
  private requestCounter = 0;

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(
          new URL('./kout-ai.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          const { requestId, decision, success, error } = e.data;
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timer);
            this.pendingRequests.delete(requestId);
            if (success && decision) {
              pending.resolve(decision);
            } else {
              pending.reject(new Error(error || 'Worker execution error'));
            }
          }
        };

        this.worker.onerror = () => {
          for (const pending of this.pendingRequests.values()) {
            clearTimeout(pending.timer);
            pending.reject(new Error('Worker error'));
          }
          this.pendingRequests.clear();
        };
      } catch {
        this.worker = null;
      }
    }
  }

  /**
   * Requests a move decision from the background AI worker:
   * - Enforces a 1500ms timeout
   * - Automatically falls back to a random legal move on timeout or error
   * - Adds an artificial humanizing delay (400-900ms) unless skipDelay is true
   */
  public async requestDecision(
    state: GameState,
    seat: number,
    difficulty: Difficulty = 'MEDIUM',
    options: DecisionOptions = {}
  ): Promise<WorkerDecision> {
    // Artificial delay (400-900ms) so bots feel natural and human
    const delayMs = options.skipDelay
      ? 0
      : (options.customDelayMs ??
        Math.floor(400 + Math.random() * 500));

    const delayPromise =
      delayMs > 0
        ? new Promise<void>((r) => setTimeout(r, delayMs))
        : Promise.resolve();

    const workerPromise = new Promise<WorkerDecision>((resolve) => {
      // Direct in-process execution fallback if Worker is unavailable (e.g. Node / test runner)
      if (!this.worker) {
        try {
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
            resolve({
              type: 'BID',
              bid: evalResult.bid,
              bestSuit: evalResult.bestSuit,
            });
          } else if (state.phase === 'TRUMP') {
            const evalResult = evaluateBid(
              state.hands[seat] || [],
              null,
              false,
              difficulty
            );
            resolve({ type: 'TRUMP', suit: evalResult.bestSuit });
          } else if (state.phase === 'PLAY') {
            const card = chooseCard(state, seat, { difficulty });
            resolve({ type: 'PLAY', card });
          } else {
            resolve(generateFallbackDecision(state, seat));
          }
        } catch {
          resolve(generateFallbackDecision(state, seat));
        }
        return;
      }

      const reqId = ++this.requestCounter;
      const timer = setTimeout(() => {
        this.pendingRequests.delete(reqId);
        // Timeout (1500ms) -> return random legal move
        resolve(generateFallbackDecision(state, seat));
      }, AI_TIMEOUT_MS);

      this.pendingRequests.set(reqId, {
        resolve,
        reject: () => {
          // Error -> fallback to random legal move
          resolve(generateFallbackDecision(state, seat));
        },
        timer,
      });

      const message: WorkerRequest = {
        state,
        seat,
        difficulty,
        requestId: reqId,
      };

      this.worker.postMessage(message);
    });

    try {
      const [decision] = await Promise.all([workerPromise, delayPromise]);
      return decision;
    } catch {
      return generateFallbackDecision(state, seat);
    }
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timer);
    }
    this.pendingRequests.clear();
  }
}

/**
 * Singleton instance helper
 */
let defaultClient: AIClient | null = null;

export function getAIClient(): AIClient {
  if (!defaultClient) {
    defaultClient = new AIClient();
  }
  return defaultClient;
}

export async function getBotDecision(
  state: GameState,
  seat: number,
  difficulty: Difficulty = 'MEDIUM',
  options: DecisionOptions = {}
): Promise<WorkerDecision> {
  return getAIClient().requestDecision(state, seat, difficulty, options);
}
