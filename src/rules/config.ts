/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bid, Suit } from '../types/kout';

export type TurnDirection = 'COUNTER_CLOCKWISE' | 'CLOCKWISE';

export interface VariantRules {
  variant: 'BO6' | 'BO4';
  seats: number;
  totalCards: number;
  cardsPerPlayer: number;
  hasJokers: boolean;
  minRank: number; // 2 for BO6, 7 for BO4
  maxRank: number; // 14 (Ace)
  turnDirection: TurnDirection;
  teams: 2;
  seatsPerTeam: number;
}

export interface JokerLeadRules {
  allowJokerLeadFirstTrick: boolean;
  leaderNamesSuitOnJokerLead: boolean;
  highestJokerBeatsLowerJoker: boolean;
}

export const TARGET_SCORES = [51, 71, 101] as const;

export const RULES = {
  turnDirection: 'COUNTER_CLOCKWISE' as TurnDirection,
  targets: TARGET_SCORES,
  BO6: {
    variant: 'BO6' as const,
    seats: 6,
    totalCards: 54, // 52 standard cards + 2 jokers
    cardsPerPlayer: 9,
    hasJokers: true,
    minRank: 2,
    maxRank: 14,
    turnDirection: 'COUNTER_CLOCKWISE' as TurnDirection,
    teams: 2,
    seatsPerTeam: 3,
  },
  BO4: {
    variant: 'BO4' as const,
    seats: 4,
    totalCards: 32, // Ranks 7..14 in 4 suits
    cardsPerPlayer: 8,
    hasJokers: false,
    minRank: 7,
    maxRank: 14,
    turnDirection: 'COUNTER_CLOCKWISE' as TurnDirection,
    teams: 2,
    seatsPerTeam: 2,
  },
  jokerLeadRules: {
    allowJokerLeadFirstTrick: true,
    leaderNamesSuitOnJokerLead: true,
    highestJokerBeatsLowerJoker: true,
  } as JokerLeadRules,
};

/**
 * Scoring chart for Kout (success vs failure points per bid).
 * TODO: verify with user - exact regional Kuwaiti tournament scoring rules vs casual variants
 * In traditional Kout:
 * - If bidding team makes at least their bid: they receive points equal to the bid (or trick difference).
 * - If bidding team fails (e.g., gets stopped or opponents take majority/undermine bid):
 *   defending team receives the bid value (or penalty multiplier).
 * - Winning all tricks (Kabout / كبوت) doubles or awards bonus score.
 */
export const SCORING: Record<
  Exclude<Bid, 0>,
  {
    successPoints: number;
    failPenalty: number;
    kaboutBonus: number;
    description: string;
  }
> = {
  5: {
    successPoints: 5,
    failPenalty: 5,
    kaboutBonus: 10,
    description: 'طلب ٥ أكَلات',
  },
  6: {
    successPoints: 6,
    failPenalty: 6,
    kaboutBonus: 12,
    description: 'طلب ٦ أكَلات',
  },
  7: {
    successPoints: 7,
    failPenalty: 7,
    kaboutBonus: 14,
    description: 'طلب ٧ أكَلات',
  },
  8: {
    successPoints: 8,
    failPenalty: 8,
    kaboutBonus: 16,
    description: 'طلب ٨ أكَلات',
  },
  9: {
    successPoints: 9,
    failPenalty: 9,
    kaboutBonus: 18,
    description: 'طلب ٩ أكَلات (كبوت كامل)',
  },
};
