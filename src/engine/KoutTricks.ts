/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Card, Suit, TrickPlay, Phase } from '../types/kout';
import { RULES } from '../rules/config';
import { getLegalCards, trickWinner } from '../rules/cards';

/**
 * Returns all cards that have been played in past tricks and the current trick
 */
export function getPlayedCards(
  trickHistory: TrickPlay[][],
  currentTrick: TrickPlay[] = []
): Card[] {
  const cards: Card[] = [];
  for (const trick of trickHistory) {
    for (const play of trick) {
      cards.push(play.card);
    }
  }
  for (const play of currentTrick) {
    cards.push(play.card);
  }
  return cards;
}

/**
 * Declares the trump suit:
 * - Winning bidder declares trump
 * - Phase transitions to 'PLAY'
 * - Bid winner leads the first trick
 */
export function declareTrump(
  state: GameState,
  seat: number,
  suit: Suit
): GameState {
  if (state.phase !== 'TRUMP') {
    throw new Error(`Cannot declare trump during phase ${state.phase}`);
  }

  if (seat !== state.bidderSeat) {
    throw new Error(
      `Only the winning bidder (seat ${state.bidderSeat}) can declare trump (received seat ${seat})`
    );
  }

  return {
    ...state,
    trump: suit,
    phase: 'PLAY',
    currentSeat: state.bidderSeat, // Bid winner leads the first trick
    version: state.version + 1,
  };
}

/**
 * Plays a card for a player seat:
 * - Validates phase is 'PLAY'
 * - Validates player turn (seat === currentSeat)
 * - Validates card is held in hand and is legal according to getLegalCards
 * - Resolves trick with trickWinner when all players have played
 * - Trick winner leads next trick
 * - Round ends after all tricks are completed (phase = 'ROUND_END')
 */
export function playCard(
  state: GameState,
  seat: number,
  cardOrId: Card | string
): GameState {
  if (state.phase !== 'PLAY') {
    throw new Error(`Cannot play card during phase ${state.phase}`);
  }

  if (seat !== state.currentSeat) {
    throw new Error(
      `Not seat ${seat}'s turn to play (expected seat ${state.currentSeat})`
    );
  }

  const cardId = typeof cardOrId === 'string' ? cardOrId : cardOrId.id;
  const playerHand = state.hands[seat] || [];
  const cardIndex = playerHand.findIndex((c) => c.id === cardId);

  if (cardIndex === -1) {
    throw new Error(`Player ${seat} does not hold card ${cardId}`);
  }

  const playedCard = playerHand[cardIndex];

  // Validate legality using rules
  const allPlayedCards = getPlayedCards(state.trickHistory, state.currentTrick);
  const legalCards = getLegalCards(playerHand, state.currentTrick, state.trump, {
    playedCards: allPlayedCards,
    highBid: state.highBid,
  });

  const isLegal = legalCards.some((c) => c.id === cardId);
  if (!isLegal) {
    throw new Error(
      `Illegal card play for card ${cardId}. Must follow suit or obey joker lead rules.`
    );
  }

  // Remove card from player hand
  const nextHands = state.hands.map((hand, idx) =>
    idx === seat ? hand.filter((_, i) => i !== cardIndex) : hand
  );

  const nextPlay: TrickPlay = { seat, card: playedCard };
  const nextTrick = [...state.currentTrick, nextPlay];

  const numSeats = RULES[state.variant].seats;
  const cardsPerPlayer = RULES[state.variant].cardsPerPlayer;

  // Trick still in progress
  if (nextTrick.length < numSeats) {
    const nextSeat = (seat + 1) % numSeats;
    return {
      ...state,
      hands: nextHands,
      currentTrick: nextTrick,
      currentSeat: nextSeat,
      version: state.version + 1,
    };
  }

  // Trick is full: resolve trick winner
  const winningPlay = trickWinner(nextTrick, state.trump);
  const winnerSeat = winningPlay.seat;

  const winnerTeam: 0 | 1 =
    state.players && state.players[winnerSeat]
      ? state.players[winnerSeat].team
      : ((winnerSeat % 2) as 0 | 1);

  const nextTricksWon: [number, number] = [
    state.tricksWon[0],
    state.tricksWon[1],
  ];
  nextTricksWon[winnerTeam] = (nextTricksWon[winnerTeam] || 0) + 1;

  const nextTrickHistory = [...state.trickHistory, nextTrick];
  const isRoundOver = nextTrickHistory.length === cardsPerPlayer;

  let nextPhase: Phase = 'PLAY';
  let nextSeat = winnerSeat; // Winner leads next trick

  if (isRoundOver) {
    nextPhase = 'ROUND_END';
  }

  return {
    ...state,
    hands: nextHands,
    currentTrick: [],
    trickHistory: nextTrickHistory,
    tricksWon: nextTricksWon,
    currentSeat: nextSeat,
    phase: nextPhase,
    version: state.version + 1,
  };
}
