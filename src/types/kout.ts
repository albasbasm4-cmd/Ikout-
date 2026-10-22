/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Suit = 'S' | 'H' | 'D' | 'C';

export type CardRank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  id: string;
  suit?: Suit;
  rank?: CardRank | number; // 2..14, 14=Ace
  joker?: 'RED' | 'BLACK';
}

/**
 * 0 = pass, 5..9 valid bid counts
 */
export type Bid = 0 | 5 | 6 | 7 | 8 | 9;

export type Phase =
  | 'LOBBY'
  | 'DEAL'
  | 'BID'
  | 'TRUMP'
  | 'PLAY'
  | 'ROUND_END'
  | 'GAME_END';

export type SeatKind = 'HUMAN_LOCAL' | 'HUMAN_REMOTE' | 'AI_BOT';

export type Difficulty = 'EASY' | 'MEDIUM' | 'EXPERT';

export interface PlayerSlot {
  seatIndex: number;
  kind: SeatKind;
  name: string;
  team: 0 | 1;
  connected: boolean;
  playerToken?: string;
  difficulty?: Difficulty;
}

export interface TrickPlay {
  seat: number;
  card: Card;
}

export interface SeatBid {
  seat: number;
  bid: Bid;
}

export interface GameState {
  variant: 'BO6' | 'BO4';
  hands: Card[][];
  dealer: number;
  currentSeat: number;
  bids: SeatBid[];
  highBid: Bid | null;
  bidderSeat: number | null;
  trump: Suit | null;
  currentTrick: TrickPlay[];
  trickHistory: TrickPlay[][];
  tricksWon: [number, number];
  scores: [number, number];
  phase: Phase;
  roundNo: number;
  targetScore: number;
  version: number;
  players?: PlayerSlot[];
}

export interface SyncStatePacket {
  type: 'SYNC_STATE';
  payload: {
    state: GameState;
  };
  v: number;
  seq: number;
}

export interface JoinRoomPacket {
  type: 'JOIN_ROOM';
  payload: {
    roomCode: string;
    playerToken: string;
    name: string;
  };
  v: number;
  seq: number;
}

export interface PlayerActionPacket {
  type: 'PLAYER_ACTION';
  payload: {
    seatIndex: number;
    action:
      | { type: 'BID'; bid: Bid }
      | { type: 'SELECT_TRUMP'; suit: Suit }
      | { type: 'PLAY_CARD'; cardId: string }
      | { type: 'READY' };
  };
  v: number;
  seq: number;
}

export interface HeartbeatPacket {
  type: 'HEARTBEAT';
  payload: {
    timestamp: number;
  };
  v: number;
  seq: number;
}

export interface GenericPacket {
  type: string;
  payload: unknown;
  v: number;
  seq: number;
}

export type NetworkPacket =
  | SyncStatePacket
  | JoinRoomPacket
  | PlayerActionPacket
  | HeartbeatPacket
  | GenericPacket;
