/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suit } from '../types/kout';
import { RULES } from './config';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];

/**
 * 32-bit mulberry32 seeded pseudo-random number generator
 * Returns a function producing floats in [0, 1)
 */
export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Builds the complete deck for either BO6 (54 cards) or BO4 (32 cards)
 */
export function buildDeck(variant: 'BO6' | 'BO4'): Card[] {
  const cards: Card[] = [];
  const config = RULES[variant];

  // Standard suit cards
  for (const suit of SUITS) {
    for (let rank = config.minRank; rank <= config.maxRank; rank++) {
      cards.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
      });
    }
  }

  // Jokers for BO6
  if (config.hasJokers) {
    cards.push({
      id: 'JOKER-RED',
      joker: 'RED',
    });
    cards.push({
      id: 'JOKER-BLACK',
      joker: 'BLACK',
    });
  }

  return cards;
}

/**
 * Shuffles an array deterministically using Fisher-Yates with mulberry32 (if seed is provided)
 * or Math.random (if seed is omitted).
 * Returns a new shuffled copy.
 */
export function shuffle<T>(array: readonly T[], seed?: number): T[] {
  const result = [...array];
  const rng = seed !== undefined ? mulberry32(seed) : Math.random;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

export interface DealResult {
  hands: Card[][];
  deck: Card[];
}

/**
 * Shuffles the deck and deals cards to each player seat round-robin
 * For BO6: 6 seats, 9 cards each = 54 cards
 * For BO4: 4 seats, 8 cards each = 32 cards
 */
export function deal(variant: 'BO6' | 'BO4', seed?: number): DealResult {
  const config = RULES[variant];
  const unshuffled = buildDeck(variant);
  const shuffledDeck = shuffle(unshuffled, seed);

  const hands: Card[][] = Array.from({ length: config.seats }, () => []);

  // Distribute cards round-robin
  for (let i = 0; i < shuffledDeck.length; i++) {
    const playerIndex = i % config.seats;
    hands[playerIndex].push(shuffledDeck[i]);
  }

  return {
    hands,
    deck: shuffledDeck,
  };
}
