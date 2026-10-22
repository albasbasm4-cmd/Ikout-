/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Card, Suit, Bid, TrickPlay } from '../types/kout';
import { RULES } from './config';

/**
 * Calculates card strength in the context of the current trick and trump suit.
 * Order:
 * Red Joker > Trump Ace > Black Joker > trump K..2 > led suit A..2 > others 0
 */
export function cardStrength(
  card: Card,
  trump: Suit | null,
  ledSuit?: Suit | null
): number {
  // Red Joker: Highest card in the game
  if (card.joker === 'RED') {
    return 1000;
  }

  // Trump Ace: Beats Black Joker and all standard trumps
  if (trump && card.suit === trump && card.rank === 14) {
    return 900;
  }

  // Black Joker: Beats all remaining trumps and all plain suits
  if (card.joker === 'BLACK') {
    return 800;
  }

  // Trump K..2 (ranks 13 down to 2)
  if (trump && card.suit === trump && typeof card.rank === 'number') {
    return 700 + card.rank;
  }

  // Led suit A..2 (ranks 14 down to 2)
  if (ledSuit && card.suit === ledSuit && typeof card.rank === 'number') {
    return 100 + card.rank;
  }

  // Others: Neither trump nor led suit
  return 0;
}

/**
 * Determines the winning TrickPlay of a completed or in-progress trick.
 * Leading a Joker counts as leading the trump suit.
 */
export function trickWinner(plays: TrickPlay[], trump: Suit | null): TrickPlay {
  if (plays.length === 0) {
    throw new Error('Cannot determine trick winner of empty trick');
  }

  const leadPlay = plays[0];
  // Jokers count as trump; if a joker is led, the led suit is trump
  const ledSuit =
    leadPlay.card.joker !== undefined ? trump : (leadPlay.card.suit ?? null);

  let bestPlay = leadPlay;
  let maxStrength = cardStrength(leadPlay.card, trump, ledSuit);

  for (let i = 1; i < plays.length; i++) {
    const play = plays[i];
    const strength = cardStrength(play.card, trump, ledSuit);
    if (strength > maxStrength) {
      maxStrength = strength;
      bestPlay = play;
    }
  }

  return bestPlay;
}

export interface LegalCardContext {
  playedCards?: Card[];
  highBid?: Bid | null;
}

/**
 * Checks if Trump A, K, Q, J have all been played previously
 */
export function areTrumpHonorsPlayed(
  trump: Suit | null,
  playedCards: Card[] = []
): boolean {
  if (!trump) return false;
  const honorRanks = new Set([14, 13, 12, 11]);
  for (const card of playedCards) {
    if (
      card.suit === trump &&
      typeof card.rank === 'number' &&
      honorRanks.has(card.rank)
    ) {
      honorRanks.delete(card.rank);
    }
  }
  return honorRanks.size === 0;
}

/**
 * Determines legal cards a player can play from hand.
 *
 * Rules:
 * - Must follow led suit if possible (jokers count as trump).
 * - If void, any card.
 * - When leading: a Joker may lead only if:
 *     (a) trump A,K,Q,J all played, or
 *     (b) bid 8 -> Red Joker only, bid 9 -> both, or
 *     (c) hand has nothing else.
 * - Read flags from RULES.
 */
export function getLegalCards(
  hand: Card[],
  trick: TrickPlay[],
  trump: Suit | null,
  ctx: LegalCardContext = {}
): Card[] {
  if (hand.length === 0) {
    return [];
  }

  // 1. Following a trick (trick has 1 or more plays)
  if (trick.length > 0) {
    const leadCard = trick[0].card;
    // Jokers count as trump
    const ledSuit =
      leadCard.joker !== undefined ? trump : (leadCard.suit ?? null);

    if (ledSuit) {
      let matchingCards: Card[];

      if (ledSuit === trump) {
        // When trump is led, trump-suited cards and jokers all follow trump
        matchingCards = hand.filter(
          (c) => c.suit === trump || c.joker !== undefined
        );
      } else {
        // Plain suit led: only cards of that suit follow
        matchingCards = hand.filter((c) => c.suit === ledSuit);
      }

      if (matchingCards.length > 0) {
        return matchingCards;
      }
    }

    // Void in led suit: any card in hand is legal
    return [...hand];
  }

  // 2. Leading a trick (trick is empty)
  const nonJokers = hand.filter((c) => c.joker === undefined);
  const handHasNothingElse = nonJokers.length === 0;

  // (a) Trump A, K, Q, J all played
  const trumpHonorsPlayed = areTrumpHonorsPlayed(trump, ctx.playedCards);

  // Read flags from RULES
  const allowFirstTrick =
    RULES.jokerLeadRules?.allowJokerLeadFirstTrick ?? true;
  const isFirstTrick = (ctx.playedCards?.length ?? 0) === 0;
  const flagAllowsLead = allowFirstTrick || !isFirstTrick;

  const bid = ctx.highBid ?? 0;

  return hand.filter((card) => {
    // Non-joker cards can always lead
    if (card.joker === undefined) {
      return true;
    }

    // (c) Hand has nothing else: Joker must lead
    if (handHasNothingElse) {
      return true;
    }

    // Check RULES flag for first trick restrictions
    if (!flagAllowsLead) {
      return false;
    }

    // (a) Trump A, K, Q, J all played allows both jokers to lead
    if (trumpHonorsPlayed) {
      return true;
    }

    // (b) bid 8 -> Red Joker only, bid 9 -> both Red & Black Joker
    if (card.joker === 'RED') {
      return bid >= 8;
    }

    if (card.joker === 'BLACK') {
      return bid >= 9;
    }

    return false;
  });
}

/**
 * Sorts cards for player hand presentation:
 * 1. Jokers first: Red Joker, then Black Joker
 * 2. Trump suit first (if trump is active), then Spades, Hearts, Clubs, Diamonds
 * 3. Inside each suit: sorted descending by rank (Ace down to 2)
 */
export function sortHandCards(cards: Card[], trump?: Suit | null): Card[] {
  const defaultSuits: Suit[] = ['S', 'H', 'C', 'D'];
  const orderedSuits: Suit[] = trump
    ? [trump, ...defaultSuits.filter((s) => s !== trump)]
    : defaultSuits;

  const suitOrderMap: Partial<Record<Suit, number>> = {
    [orderedSuits[0]]: 4000,
    [orderedSuits[1]]: 3000,
    [orderedSuits[2]]: 2000,
    [orderedSuits[3]]: 1000,
  };

  return [...cards].sort((a, b) => {
    // 1. Jokers precedence
    if (a.joker && !b.joker) return -1;
    if (!a.joker && b.joker) return 1;
    if (a.joker && b.joker) {
      if (a.joker === 'RED' && b.joker === 'BLACK') return -1;
      if (a.joker === 'BLACK' && b.joker === 'RED') return 1;
      return 0;
    }

    // 2. Suit grouping
    const weightA = a.suit ? suitOrderMap[a.suit] ?? 0 : 0;
    const weightB = b.suit ? suitOrderMap[b.suit] ?? 0 : 0;

    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // 3. Rank descending (14 down to 2)
    const rankA = a.rank ?? 0;
    const rankB = b.rank ?? 0;
    return rankB - rankA;
  });
}
