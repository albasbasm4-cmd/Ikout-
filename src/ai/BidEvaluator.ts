/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suit, Bid, Difficulty } from '../types/kout';

export const ALL_SUITS: Suit[] = ['S', 'H', 'D', 'C'];

export interface BidEvaluation {
  bid: Bid;
  bestSuit: Suit;
  suit: Suit; // Alias for bestSuit
  score: number;
  expectedTricks: number;
}

export interface BidContext {
  seat?: number;
  partnerSeat?: number;
  seed?: number;
}

/**
 * Evaluates the strength of a hand for a potential trump suit:
 * - Scores trump suit length
 * - Scores Jokers (Red Joker = +1.1 tricks, Black Joker = +0.95 tricks)
 * - Scores trump honors (Ace = +1.0, King = +0.8, Queen = +0.6)
 * - Scores side honors (side Aces = +0.8, side Kings = +0.4)
 * - Scores suit distribution (short suit ruffing potential)
 */
export function scoreHandForSuit(hand: Card[], trumpCandidate: Suit): number {
  let score = 0;

  // 1. Jokers
  const hasRedJoker = hand.some((c) => c.joker === 'RED');
  const hasBlackJoker = hand.some((c) => c.joker === 'BLACK');
  if (hasRedJoker) score += 1.1;
  if (hasBlackJoker) score += 0.95;

  // 2. Trump length and trump honors
  const trumpCards = hand.filter((c) => c.suit === trumpCandidate);
  const trumpLength = trumpCards.length;

  // Trump length points
  if (trumpLength >= 6) score += 2.8;
  else if (trumpLength === 5) score += 2.0;
  else if (trumpLength === 4) score += 1.3;
  else if (trumpLength === 3) score += 0.7;
  else if (trumpLength === 2) score += 0.2;

  // Trump honors
  const hasTrumpAce = trumpCards.some((c) => c.rank === 14);
  const hasTrumpKing = trumpCards.some((c) => c.rank === 13);
  const hasTrumpQueen = trumpCards.some((c) => c.rank === 12);
  const hasTrumpJack = trumpCards.some((c) => c.rank === 11);

  if (hasTrumpAce) score += 1.0;
  if (hasTrumpKing) score += 0.8;
  if (hasTrumpQueen) score += 0.6;
  if (hasTrumpJack) score += 0.4;

  // Synergy bonus: holding Red Joker + Trump Ace/King gives supreme control
  if (hasRedJoker && (hasTrumpAce || hasTrumpKing)) {
    score += 0.5;
  }

  // 3. Side suit honors and distribution
  for (const suit of ALL_SUITS) {
    if (suit === trumpCandidate) continue;

    const sideCards = hand.filter((c) => c.suit === suit);
    const hasSideAce = sideCards.some((c) => c.rank === 14);
    const hasSideKing = sideCards.some((c) => c.rank === 13);

    if (hasSideAce) score += 0.8;
    if (hasSideKing && sideCards.length >= 2) score += 0.4;

    // Void or singleton in side suit provides ruffing power if player has trumps
    if (sideCards.length === 0 && trumpLength >= 3) {
      score += 0.6;
    } else if (sideCards.length === 1 && trumpLength >= 3) {
      score += 0.3;
    }
  }

  return score;
}

/**
 * Evaluates the best bid and trump suit for a player's hand:
 * - Scores each suit by trump length, jokers, Aces, and Kings
 * - Adapts thresholds based on difficulty:
 *     - EASY: Adds randomness and less disciplined bid thresholds
 *     - MEDIUM: Standard balanced bidding
 *     - EXPERT: Stricter thresholds (risk-averse) and accounts for partner position
 * - Enforces forced dealer bid (Malzom: minimum 5) if isDealerForced is true
 * - Returns Bid (0 for pass, 5..9) and bestSuit
 */
export function evaluateBid(
  hand: Card[],
  currentHighBid: Bid | null,
  isDealerForced: boolean,
  difficulty: Difficulty = 'MEDIUM',
  context: BidContext = {}
): BidEvaluation {
  // Score every suit and pick the best one
  let bestSuit: Suit = 'S';
  let bestScore = -1;

  for (const suit of ALL_SUITS) {
    const score = scoreHandForSuit(hand, suit);
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }

  let expectedTricks = bestScore;

  // Difficulty adjustments
  if (difficulty === 'EASY') {
    // Add random noise between -1.2 and +1.2
    const noise = (Math.random() - 0.5) * 2.4;
    expectedTricks += noise;
  } else if (difficulty === 'EXPERT') {
    // Expert adjustment:
    // Partner position: in a 6-player team, partner is directly opposite (3 seats away)
    // Partner contributes expected ~0.8 tricks
    const partnerBonus = 0.8;
    // Conservative penalty to avoid failing bid (fail gives opponents full points!)
    const safetyMargin = -0.5;

    expectedTricks += partnerBonus + safetyMargin;
  } else {
    // MEDIUM: standard moderate partner contribution
    expectedTricks += 0.5;
  }

  // Derive bid from expected tricks
  let rawBid: Bid = 0;

  if (difficulty === 'EXPERT') {
    // Strict thresholds for Expert
    if (expectedTricks >= 8.8) rawBid = 9;
    else if (expectedTricks >= 7.8) rawBid = 8;
    else if (expectedTricks >= 6.8) rawBid = 7;
    else if (expectedTricks >= 5.8) rawBid = 6;
    else if (expectedTricks >= 4.9) rawBid = 5;
    else rawBid = 0;
  } else if (difficulty === 'EASY') {
    // Looser thresholds for Easy
    const rounded = Math.round(expectedTricks);
    if (rounded >= 9) rawBid = 9;
    else if (rounded >= 8) rawBid = 8;
    else if (rounded >= 7) rawBid = 7;
    else if (rounded >= 6) rawBid = 6;
    else if (rounded >= 5) rawBid = 5;
    else rawBid = 0;
  } else {
    // Medium thresholds
    if (expectedTricks >= 8.5) rawBid = 9;
    else if (expectedTricks >= 7.5) rawBid = 8;
    else if (expectedTricks >= 6.5) rawBid = 7;
    else if (expectedTricks >= 5.5) rawBid = 6;
    else if (expectedTricks >= 4.7) rawBid = 5;
    else rawBid = 0;
  }

  // Enforce auction rules:
  // Non-pass bid must be strictly higher than currentHighBid
  const high = currentHighBid ?? 0;
  let finalBid: Bid = rawBid;

  if (finalBid <= high) {
    finalBid = 0; // Pass if cannot outbid
  }

  // Forced bid (Malzom): If dealer is forced because all others passed, must bid at least 5
  if (isDealerForced && finalBid === 0) {
    finalBid = 5;
  }

  return {
    bid: finalBid,
    bestSuit,
    suit: bestSuit,
    score: bestScore,
    expectedTricks,
  };
}
