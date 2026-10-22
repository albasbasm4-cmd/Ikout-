/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState, Card, Suit, Bid, PlayerSlot } from '../types/kout';

export const PROTOCOL_VERSION = 1;

/**
 * Filtered GameState snapshot sent to a client.
 * Strictly guarantees that only the recipient's hand contains card identities.
 * All other seats' hands have masked cards with no suit or rank.
 */
export interface MaskedCard {
  id: string;
  isMasked: true;
}

export type ClientHandCard = Card | MaskedCard;

export interface ClientGameState extends Omit<GameState, 'hands'> {
  hands: ClientHandCard[][];
  mySeat: number;
}

// -------------------------------------------------------------
// Client Intent Packets (Client -> Host)
// -------------------------------------------------------------

export interface JoinPayload {
  playerName: string;
  preferredSeat?: number;
  roomCode?: string;
}

export interface BidRequestPayload {
  bid: Bid;
}

export interface TrumpRequestPayload {
  suit: Suit;
}

export interface PlayCardRequestPayload {
  cardId: string;
}

export interface PingPayload {
  timestamp: number;
}

export type ClientPacketType =
  | 'JOIN'
  | 'BID_REQUEST'
  | 'TRUMP_REQUEST'
  | 'PLAY_CARD_REQUEST'
  | 'PING';

export interface BaseClientPacket<TType extends ClientPacketType, TPayload> {
  v: number;
  seq: number;
  playerToken: string;
  type: TType;
  payload: TPayload;
}

export type JoinPacket = BaseClientPacket<'JOIN', JoinPayload>;
export type BidRequestPacket = BaseClientPacket<'BID_REQUEST', BidRequestPayload>;
export type TrumpRequestPacket = BaseClientPacket<'TRUMP_REQUEST', TrumpRequestPayload>;
export type PlayCardRequestPacket = BaseClientPacket<'PLAY_CARD_REQUEST', PlayCardRequestPayload>;
export type PingPacket = BaseClientPacket<'PING', PingPayload>;

export type ClientPacket =
  | JoinPacket
  | BidRequestPacket
  | TrumpRequestPacket
  | PlayCardRequestPacket
  | PingPacket;

// -------------------------------------------------------------
// Host Message Packets (Host -> Client)
// -------------------------------------------------------------

export interface ClientStateUpdatePayload {
  state: ClientGameState;
  seatIndex: number;
}

export interface SeatUpdatePayload {
  seatIndex: number;
  player: PlayerSlot;
  players: PlayerSlot[];
}

export interface ErrorPayload {
  code: string;
  message: string;
  originalSeq?: number;
}

export interface PongPayload {
  timestamp: number;
  serverTime: number;
}

export type HostPacketType =
  | 'CLIENT_STATE_UPDATE'
  | 'SEAT_UPDATE'
  | 'ERROR'
  | 'PONG';

export interface BaseHostPacket<TType extends HostPacketType, TPayload> {
  v: number;
  seq: number;
  playerToken: string;
  type: TType;
  payload: TPayload;
}

export type ClientStateUpdatePacket = BaseHostPacket<'CLIENT_STATE_UPDATE', ClientStateUpdatePayload>;
export type SeatUpdatePacket = BaseHostPacket<'SEAT_UPDATE', SeatUpdatePayload>;
export type ErrorPacket = BaseHostPacket<'ERROR', ErrorPayload>;
export type PongPacket = BaseHostPacket<'PONG', PongPayload>;

export type HostPacket =
  | ClientStateUpdatePacket
  | SeatUpdatePacket
  | ErrorPacket
  | PongPacket;

/**
 * Filters a GameState snapshot for a specific seat:
 * - Only seat's own hand contains full Card objects
 * - All other seats' hands contain masked cards (revealing only hand size)
 */
export function filterStateForSeat(state: GameState, seat: number): ClientGameState {
  const filteredHands: ClientHandCard[][] = state.hands.map((hand, idx) => {
    if (idx === seat) {
      // Recipient's own hand: full card details
      return [...hand];
    }
    // Opponent/Partner hand: card identities masked
    return hand.map((_, cardIdx) => ({
      id: `masked-${idx}-${cardIdx}`,
      isMasked: true as const,
    }));
  });

  return {
    ...state,
    hands: filteredHands,
    mySeat: seat,
  };
}
