/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Card, Suit, TrickPlay, Difficulty } from '../types/kout';
import { RULES } from '../rules/config';
import { buildDeck, shuffle } from '../rules/deck';
import { getLegalCards, trickWinner, cardStrength } from '../rules/cards';
import { getPlayedCards } from '../engine/KoutTricks';

export interface ChooseCardOptions {
  iterations?: number;
  timeBudgetMs?: number;
  difficulty?: Difficulty;
}

/**
 * Infers suits in which other players are void based on previous tricks
 * where they failed to follow the led suit.
 */
export function inferPlayerVoids(
  trickHistory: TrickPlay[][],
  numSeats: number,
  trump: Suit | null
): Map<number, Set<Suit>> {
  const voids = new Map<number, Set<Suit>>();
  for (let s = 0; s < numSeats; s++) {
    voids.set(s, new Set<Suit>());
  }

  for (const trick of trickHistory) {
    if (trick.length === 0) continue;
    const leadCard = trick[0].card;
    const ledSuit =
      leadCard.joker !== undefined ? trump : (leadCard.suit ?? null);
    if (!ledSuit) continue;

    for (let i = 1; i < trick.length; i++) {
      const play = trick[i];
      const card = play.card;
      const isJoker = card.joker !== undefined;

      if (ledSuit === trump) {
        // When trump is led, playing non-trump and non-joker implies void in trump
        if (card.suit !== trump && !isJoker) {
          if (trump) voids.get(play.seat)?.add(trump);
        }
      } else {
        // Plain suit led: playing any other suit implies void in that plain suit
        if (card.suit !== ledSuit) {
          voids.get(play.seat)?.add(ledSuit);
        }
      }
    }
  }

  return voids;
}

/**
 * Determinizes hidden hands of opponents by distributing unseen cards
 * while respecting inferred void constraints whenever possible.
 */
export function determinizeHands(
  state: GameState,
  observerSeat: number
): Card[][] {
  const numSeats = RULES[state.variant].seats;
  const voids = inferPlayerVoids(state.trickHistory, numSeats, state.trump);

  const playedCards = getPlayedCards(state.trickHistory, state.currentTrick);
  const visibleIds = new Set<string>();

  for (const c of state.hands[observerSeat] || []) {
    visibleIds.add(c.id);
  }
  for (const c of playedCards) {
    visibleIds.add(c.id);
  }

  const fullDeck = buildDeck(state.variant);
  const unseenCards = fullDeck.filter((c) => !visibleIds.has(c.id));

  // Target hand lengths for each player
  const neededCounts = state.hands.map((h) => h.length);

  // Attempt constrained assignment up to 10 times; fallback to unconstrained shuffle
  for (let attempt = 0; attempt < 10; attempt++) {
    const shuffled = shuffle(unseenCards);
    const candidateHands: Card[][] = Array.from({ length: numSeats }, () => []);
    candidateHands[observerSeat] = [...(state.hands[observerSeat] || [])];

    let valid = true;
    const remainingCards = [...shuffled];

    for (let s = 0; s < numSeats; s++) {
      if (s === observerSeat) continue;
      const countNeeded = neededCounts[s];
      const playerVoids = voids.get(s) || new Set<Suit>();

      for (let i = 0; i < countNeeded; i++) {
        // Find a card from remainingCards that does not violate player's void
        const validIdx = remainingCards.findIndex((c) => {
          if (c.joker !== undefined) {
            return !state.trump || !playerVoids.has(state.trump);
          }
          return c.suit ? !playerVoids.has(c.suit) : true;
        });

        if (validIdx !== -1) {
          candidateHands[s].push(remainingCards[validIdx]);
          remainingCards.splice(validIdx, 1);
        } else {
          valid = false;
          break;
        }
      }

      if (!valid) break;
    }

    if (valid) {
      return candidateHands;
    }
  }

  // Fallback: unconstrained shuffle distribution
  const fallbackShuffled = shuffle(unseenCards);
  const fallbackHands: Card[][] = Array.from({ length: numSeats }, () => []);
  fallbackHands[observerSeat] = [...(state.hands[observerSeat] || [])];

  let cardIdx = 0;
  for (let s = 0; s < numSeats; s++) {
    if (s === observerSeat) continue;
    const countNeeded = neededCounts[s];
    for (let i = 0; i < countNeeded; i++) {
      if (cardIdx < fallbackShuffled.length) {
        fallbackHands[s].push(fallbackShuffled[cardIdx++]);
      }
    }
  }

  return fallbackHands;
}

/**
 * Fast rollout simulation of the remainder of the round
 */
function simulateRollout(
  initialHands: Card[][],
  currentTrick: TrickPlay[],
  currentSeat: number,
  trump: Suit | null,
  initialTricksWon: [number, number],
  allPlayedCards: Card[],
  highBid: number | null,
  numSeats: number
): [number, number] {
  const hands = initialHands.map((h) => [...h]);
  let trick = [...currentTrick];
  let seat = currentSeat;
  const tricksWon: [number, number] = [
    initialTricksWon[0],
    initialTricksWon[1],
  ];
  const played = [...allPlayedCards];

  while (hands.some((h) => h.length > 0)) {
    const hand = hands[seat];
    if (hand.length === 0) break;

    const legal = getLegalCards(hand, trick, trump, {
      playedCards: played,
      highBid: (highBid as any) ?? 5,
    });

    const chosenCard = legal[Math.floor(Math.random() * legal.length)];
    const cIdx = hand.findIndex((c) => c.id === chosenCard.id);
    if (cIdx !== -1) hand.splice(cIdx, 1);

    trick.push({ seat, card: chosenCard });
    played.push(chosenCard);

    if (trick.length === numSeats) {
      const winner = trickWinner(trick, trump);
      const winnerTeam = (winner.seat % 2) as 0 | 1;
      tricksWon[winnerTeam]++;
      seat = winner.seat;
      trick = [];
    } else {
      seat = (seat + 1) % numSeats;
    }
  }

  return tricksWon;
}

/**
 * Heuristic selection for EASY mode or zero iterations
 */
function chooseHeuristicCard(
  legalCards: Card[],
  trick: TrickPlay[],
  trump: Suit | null,
  seat: number
): Card {
  if (legalCards.length === 1) return legalCards[0];

  const myTeam = seat % 2;

  // Leading a trick
  if (trick.length === 0) {
    // Prefer leading non-trump low cards to probe suits
    const nonTrumps = legalCards.filter(
      (c) => c.suit !== trump && c.joker === undefined
    );
    if (nonTrumps.length > 0) {
      nonTrumps.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
      return nonTrumps[0];
    }
    legalCards.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    return legalCards[0];
  }

  // Following a trick
  const currentWinningPlay = trickWinner(trick, trump);
  const partnerSeat = (seat + 3) % 6; // In BO6 partner is opposite
  const partnerIsWinning = currentWinningPlay.seat % 2 === myTeam;

  if (partnerIsWinning) {
    // Partner is winning: duck with lowest legal card
    const sorted = [...legalCards].sort(
      (a, b) =>
        cardStrength(a, trump, trick[0].card.suit) -
        cardStrength(b, trump, trick[0].card.suit)
    );
    return sorted[0];
  }

  // Opponent is winning: try to take with lowest winning card
  const winningStrength = cardStrength(
    currentWinningPlay.card,
    trump,
    trick[0].card.suit
  );
  const winningCards = legalCards.filter(
    (c) =>
      cardStrength(c, trump, trick[0].card.suit) > winningStrength
  );

  if (winningCards.length > 0) {
    winningCards.sort(
      (a, b) =>
        cardStrength(a, trump, trick[0].card.suit) -
        cardStrength(b, trump, trick[0].card.suit)
    );
    return winningCards[0];
  }

  // Cannot win: discard lowest card
  const sorted = [...legalCards].sort(
    (a, b) =>
      cardStrength(a, trump, trick[0].card.suit) -
      cardStrength(b, trump, trick[0].card.suit)
  );
  return sorted[0];
}

/**
 * Selects the best card to play using Information Set Monte Carlo Tree Search (ISMCTS):
 * - Determinizes hidden hands from unseen cards respecting void inferences
 * - Evaluates candidate actions using UCT selection and random playout
 * - Respects timeBudgetMs or max iterations
 * - Easy = 0 (heuristic), Medium = 150, Expert = 500+
 */
export function chooseCard(
  state: GameState,
  seat: number,
  opts: ChooseCardOptions = {}
): Card {
  const hand = state.hands[seat] || [];
  const playedCards = getPlayedCards(state.trickHistory, state.currentTrick);
  const legalCards = getLegalCards(hand, state.currentTrick, state.trump, {
    playedCards,
    highBid: state.highBid,
  });

  if (legalCards.length === 0) {
    throw new Error(`Seat ${seat} has no legal cards to play.`);
  }

  if (legalCards.length === 1) {
    return legalCards[0];
  }

  // Resolve iterations based on difficulty or explicit option
  let iterations = opts.iterations;
  if (iterations === undefined) {
    if (opts.difficulty === 'EASY') iterations = 0;
    else if (opts.difficulty === 'EXPERT') iterations = 500;
    else iterations = 150;
  }

  // If 0 iterations (EASY), use rule-based heuristic
  if (iterations === 0) {
    return chooseHeuristicCard(legalCards, state.currentTrick, state.trump, seat);
  }

  const timeBudgetMs = opts.timeBudgetMs ?? 200;
  const startTime = performance.now();
  const myTeam = seat % 2;
  const numSeats = RULES[state.variant].seats;

  // Root action statistics: visits and total rewards
  const actionVisits = new Map<string, number>();
  const actionRewards = new Map<string, number>();

  for (const card of legalCards) {
    actionVisits.set(card.id, 0);
    actionRewards.set(card.id, 0);
  }

  const C = 1.414; // UCT exploration constant
  let iterCount = 0;

  while (iterCount < iterations) {
    // Check time budget every 10 iterations
    if (iterCount % 10 === 0 && performance.now() - startTime >= timeBudgetMs) {
      break;
    }
    iterCount++;

    // 1. Determinization
    const determinizedHands = determinizeHands(state, seat);

    // 2. Select root action via UCT
    let selectedAction = legalCards[0];
    let bestUct = -Infinity;
    const totalRootVisits = iterCount;

    for (const card of legalCards) {
      const visits = actionVisits.get(card.id) || 0;
      if (visits === 0) {
        selectedAction = card;
        bestUct = Infinity;
        break;
      }
      const meanReward = (actionRewards.get(card.id) || 0) / visits;
      const uct = meanReward + C * Math.sqrt(Math.log(totalRootVisits) / visits);
      if (uct > bestUct) {
        bestUct = uct;
        selectedAction = card;
      }
    }

    // 3. Apply selected card to root state copy
    const simHands = determinizedHands.map((h, s) =>
      s === seat ? h.filter((c) => c.id !== selectedAction.id) : [...h]
    );
    const simTrick: TrickPlay[] = [
      ...state.currentTrick,
      { seat, card: selectedAction },
    ];
    const simPlayed = [...playedCards, selectedAction];
    const simTricksWon: [number, number] = [
      state.tricksWon[0],
      state.tricksWon[1],
    ];

    let nextSeat = (seat + 1) % numSeats;
    let nextTrick = simTrick;

    if (simTrick.length === numSeats) {
      const winner = trickWinner(simTrick, state.trump);
      const winnerTeam = (winner.seat % 2) as 0 | 1;
      simTricksWon[winnerTeam]++;
      nextSeat = winner.seat;
      nextTrick = [];
    }

    // 4. Playout / Rollout
    const finalTricks = simulateRollout(
      simHands,
      nextTrick,
      nextSeat,
      state.trump,
      simTricksWon,
      simPlayed,
      state.highBid,
      numSeats
    );

    // 5. Reward: tricks won by player's team
    const teamTricks = finalTricks[myTeam];
    const totalTricks = RULES[state.variant].cardsPerPlayer;
    const normalizedReward = teamTricks / totalTricks;

    // 6. Backpropagation
    actionVisits.set(
      selectedAction.id,
      (actionVisits.get(selectedAction.id) || 0) + 1
    );
    actionRewards.set(
      selectedAction.id,
      (actionRewards.get(selectedAction.id) || 0) + normalizedReward
    );
  }

  // Choose the card with the highest number of visits (most robust move)
  let bestCard = legalCards[0];
  let maxVisits = -1;

  for (const card of legalCards) {
    const visits = actionVisits.get(card.id) || 0;
    if (visits > maxVisits) {
      maxVisits = visits;
      bestCard = card;
    }
  }

  return bestCard;
}
