/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Card, Bid, Suit, Phase, SeatBid, PlayerSlot } from '../types/kout';
import { RULES } from '../rules/config';
import { deal } from '../rules/deck';
import { declareTrump as koutDeclareTrump, playCard as koutPlayCard } from './KoutTricks';
import { scoreRound } from './KoutScoring';

export interface EngineOptions {
  variant?: 'BO6' | 'BO4';
  targetScore?: number;
  initialDealer?: number;
  seed?: number;
  players?: PlayerSlot[];
}

export class KoutGameEngine {
  private _state: GameState;
  private _currentSeed: number;

  constructor(options: EngineOptions = {}, initialState?: GameState) {
    this._currentSeed = options.seed ?? 123456789;

    if (initialState) {
      this._state = { ...initialState };
      return;
    }

    const variant = options.variant ?? 'BO6';
    const numSeats = RULES[variant].seats;
    const initialDealer = options.initialDealer ?? 0;
    const targetScore = options.targetScore ?? 51;

    const defaultPlayers: PlayerSlot[] = Array.from(
      { length: numSeats },
      (_, i) => ({
        seatIndex: i,
        kind: i === 0 ? 'HUMAN_LOCAL' : 'AI_BOT',
        name: i === 0 ? 'أنت' : `لاعب ${i + 1}`,
        team: (i % 2) as 0 | 1,
        connected: true,
      })
    );

    this._state = {
      variant,
      hands: Array.from({ length: numSeats }, () => []),
      dealer: initialDealer,
      currentSeat: (initialDealer + 1) % numSeats,
      bids: [],
      highBid: null,
      bidderSeat: null,
      trump: null,
      currentTrick: [],
      trickHistory: [],
      tricksWon: [0, 0],
      scores: [0, 0],
      phase: 'LOBBY',
      roundNo: 0,
      targetScore,
      version: 1,
      players: options.players ?? defaultPlayers,
    };
  }

  public get state(): Readonly<GameState> {
    return this._state;
  }

  public getState(): Readonly<GameState> {
    return this._state;
  }

  /**
   * Starts a new round:
   * - Rotates dealer counter-clockwise on subsequent rounds
   * - Deals deck deterministically using seed
   * - Sets bidding phase and sets first bidder counter-clockwise after dealer
   * - Increments state.version and returns a new state object
   */
  public startRound(seed?: number): GameState {
    const numSeats = RULES[this._state.variant].seats;
    const effectiveSeed = seed ?? this._getNextSeed();

    // Rotate dealer counter-clockwise if this is not the first round
    const nextDealer =
      this._state.roundNo > 0
        ? (this._state.dealer + 1) % numSeats
        : this._state.dealer;

    // First bidder is the player immediately counter-clockwise after dealer
    const firstBidder = (nextDealer + 1) % numSeats;

    // Deal cards deterministically
    const { hands } = deal(this._state.variant, effectiveSeed);

    const nextState: GameState = {
      ...this._state,
      hands,
      dealer: nextDealer,
      currentSeat: firstBidder,
      bids: [],
      highBid: null,
      bidderSeat: null,
      trump: null,
      currentTrick: [],
      trickHistory: [],
      tricksWon: [0, 0],
      phase: 'BID',
      roundNo: this._state.roundNo + 1,
      version: this._state.version + 1,
    };

    this._state = nextState;
    return nextState;
  }

  /**
   * Places a bid or pass for a player:
   * - Validates phase is 'BID'
   * - Validates turn (seat === currentSeat)
   * - Validates bid is higher than current highBid (unless pass = 0)
   * - Enforces forced bid (Malzom): if all pass, dealer must bid 5
   * - Moves turn counter-clockwise or concludes auction to 'TRUMP' phase
   * - Increments version and returns new state object
   */
  public placeBid(seat: number, bid: Bid): GameState {
    if (this._state.phase !== 'BID') {
      throw new Error(`Cannot place bid during phase ${this._state.phase}`);
    }

    if (seat !== this._state.currentSeat) {
      throw new Error(
        `Not seat ${seat}'s turn to bid (expected seat ${this._state.currentSeat})`
      );
    }

    const numSeats = RULES[this._state.variant].seats;

    // Check if all players before the dealer have passed
    const isDealer = seat === this._state.dealer;
    const allOthersPassed =
      isDealer &&
      this._state.bids.length === numSeats - 1 &&
      this._state.bids.every((b) => b.bid === 0);

    let effectiveBid = bid;

    // Forced bid (Malzom): If all players passed, the dealer must bid 5
    if (allOthersPassed) {
      if (effectiveBid === 0) {
        // Automatically enforce Malzom 5 if dealer tries to pass
        effectiveBid = 5;
      } else if (effectiveBid < 5) {
        throw new Error('Dealer is Malzom and must bid at least 5');
      }
    }

    // Validate bid value
    if (effectiveBid !== 0) {
      if (effectiveBid < 5 || effectiveBid > 9) {
        throw new Error(`Invalid bid ${effectiveBid}. Valid bids are 0 (pass) or 5..9`);
      }

      if (this._state.highBid !== null && effectiveBid <= this._state.highBid) {
        throw new Error(
          `Bid ${effectiveBid} must be higher than current high bid ${this._state.highBid}`
        );
      }
    }

    const newSeatBid: SeatBid = { seat, bid: effectiveBid };
    const newBids = [...this._state.bids, newSeatBid];

    const hasNewHighBid = effectiveBid > 0;
    const newHighBid = hasNewHighBid ? effectiveBid : this._state.highBid;
    const newBidderSeat = hasNewHighBid ? seat : this._state.bidderSeat;

    // Auction concludes when all seats have placed their bid
    const isAuctionFinished = newBids.length === numSeats;

    let nextPhase: Phase = 'BID';
    let nextSeat = (seat + 1) % numSeats;

    if (isAuctionFinished) {
      nextPhase = 'TRUMP';
      // The high bidder must now choose the trump suit
      nextSeat = newBidderSeat ?? this._state.dealer;
    }

    const nextState: GameState = {
      ...this._state,
      bids: newBids,
      highBid: newHighBid,
      bidderSeat: newBidderSeat,
      currentSeat: nextSeat,
      phase: nextPhase,
      version: this._state.version + 1,
    };

    this._state = nextState;
    return nextState;
  }

  /**
   * Selects the trump suit after the auction concludes
   */
  public selectTrump(seat: number, suit: Suit): GameState {
    if (this._state.phase !== 'TRUMP') {
      throw new Error(`Cannot select trump during phase ${this._state.phase}`);
    }

    if (seat !== this._state.bidderSeat) {
      throw new Error(
        `Only the winning bidder (seat ${this._state.bidderSeat}) can choose trump`
      );
    }

    const nextState: GameState = {
      ...this._state,
      trump: suit,
      phase: 'PLAY',
      currentSeat: this._state.bidderSeat,
      version: this._state.version + 1,
    };

    this._state = nextState;
    return nextState;
  }

  private _getNextSeed(): number {
    this._currentSeed = (this._currentSeed + 0x6d2b79f5) | 0;
    return this._currentSeed;
  }

  public declareTrump(seat: number, suit: Suit): GameState {
    this._state = koutDeclareTrump(this._state, seat, suit);
    return this._state;
  }

  public playCard(seat: number, card: Card | string): GameState {
    this._state = koutPlayCard(this._state, seat, card);
    if (this._state.phase === 'ROUND_END') {
      this._state = scoreRound(this._state);
    }
    return this._state;
  }

  public scoreRound(): GameState {
    this._state = scoreRound(this._state);
    return this._state;
  }
}


