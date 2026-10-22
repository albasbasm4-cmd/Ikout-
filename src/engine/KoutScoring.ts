/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Bid } from '../types/kout';
import { RULES, SCORING } from '../rules/config';

export interface RoundScoreResult {
  bidderTeam: 0 | 1;
  defendingTeam: 0 | 1;
  highBid: number;
  bidderTricks: number;
  defendingTricks: number;
  made: boolean;
  isBawan: boolean;
  pointsAdded: number;
  awardedTeam: 0 | 1;
  gameWinner: 0 | 1 | null;
}

/**
 * Computes the scoring outcome for the completed round based on RULES.SCORING
 */
export function computeRoundResult(state: GameState): RoundScoreResult {
  const highBid = (state.highBid ?? 5) as Exclude<Bid, 0>;
  const bidderSeat = state.bidderSeat ?? 0;

  const bidderTeam: 0 | 1 =
    state.players && state.players[bidderSeat]
      ? state.players[bidderSeat].team
      : ((bidderSeat % 2) as 0 | 1);

  const defendingTeam: 0 | 1 = (1 - bidderTeam) as 0 | 1;

  const bidderTricks = state.tricksWon[bidderTeam] || 0;
  const defendingTricks = state.tricksWon[defendingTeam] || 0;
  const totalTricks = RULES[state.variant].cardsPerPlayer;

  const made = bidderTricks >= highBid;
  const scoringTable = (RULES as unknown as { SCORING?: typeof SCORING }).SCORING || SCORING;
  const scoreConfig = scoringTable[highBid] || {
    successPoints: highBid,
    failPenalty: highBid,
    kaboutBonus: highBid * 2,
    description: `طلب ${highBid}`,
  };

  // Instant win on successful 9 (Bawan / باوان) in round 1
  const isBawan = state.roundNo === 1 && highBid === 9 && made;

  let pointsAdded = 0;
  let awardedTeam: 0 | 1 = bidderTeam;

  if (made) {
    awardedTeam = bidderTeam;
    // Full sweep / Kabout bonus
    if (bidderTricks === totalTricks) {
      pointsAdded = scoreConfig.kaboutBonus;
    } else {
      pointsAdded = scoreConfig.successPoints;
    }
  } else {
    awardedTeam = defendingTeam;
    pointsAdded = scoreConfig.failPenalty;
  }

  const currentScores: [number, number] = [state.scores[0], state.scores[1]];
  const newScores: [number, number] = [
    currentScores[0] + (awardedTeam === 0 ? pointsAdded : 0),
    currentScores[1] + (awardedTeam === 1 ? pointsAdded : 0),
  ];

  const targetScore = state.targetScore ?? 51;
  let gameWinner: 0 | 1 | null = null;

  if (isBawan) {
    gameWinner = bidderTeam;
  } else if (newScores[0] >= targetScore || newScores[1] >= targetScore) {
    if (newScores[0] >= targetScore && newScores[1] >= targetScore) {
      gameWinner = newScores[0] >= newScores[1] ? 0 : 1;
    } else {
      gameWinner = newScores[0] >= targetScore ? 0 : 1;
    }
  }

  return {
    bidderTeam,
    defendingTeam,
    highBid,
    bidderTricks,
    defendingTricks,
    made,
    isBawan,
    pointsAdded,
    awardedTeam,
    gameWinner,
  };
}

/**
 * Applies the round score to the game state:
 * - Computes success / fail from RULES.SCORING
 * - Updates scores[2]
 * - Detects target reached (51/71/101) or Bawan (round 1 bid 9 success) -> GAME_END
 * - Sets phase to 'ROUND_END' or 'GAME_END'
 * - Rotates dealer counter-clockwise
 * - Increments state version
 */
export function scoreRound(state: GameState): GameState {
  const result = computeRoundResult(state);
  const numSeats = RULES[state.variant].seats;

  const newScores: [number, number] = [
    state.scores[0] + (result.awardedTeam === 0 ? result.pointsAdded : 0),
    state.scores[1] + (result.awardedTeam === 1 ? result.pointsAdded : 0),
  ];

  const nextPhase = result.gameWinner !== null ? 'GAME_END' : 'ROUND_END';

  // Rotate dealer counter-clockwise for next round
  const nextDealer = (state.dealer + 1) % numSeats;

  return {
    ...state,
    scores: newScores,
    dealer: nextDealer,
    phase: nextPhase,
    version: state.version + 1,
  };
}
