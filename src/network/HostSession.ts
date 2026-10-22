/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KoutGameEngine } from '../engine/KoutGameEngine';
import { IHostTransport } from './ITransport';
import {
  PROTOCOL_VERSION,
  ClientPacket,
  HostPacket,
  filterStateForSeat,
  ClientGameState,
} from './protocol';
import { GameState, PlayerSlot, SeatKind } from '../types/kout';
import { RULES } from '../rules/config';

export interface HostSessionOptions {
  engine?: KoutGameEngine;
  variant?: 'BO6' | 'BO4';
  targetScore?: number;
  initialDealer?: number;
  seed?: number;
}

export class HostSession {
  private engine: KoutGameEngine;
  private transport: IHostTransport;
  private tokenToSeat = new Map<string, number>();
  private seatToToken = new Map<number, string>();
  private hostSeq = 0;
  private unsubscribeMessages?: () => void;

  constructor(transport: IHostTransport, options: HostSessionOptions = {}) {
    this.transport = transport;

    if (options.engine) {
      this.engine = options.engine;
    } else {
      this.engine = new KoutGameEngine({
        variant: options.variant ?? 'BO6',
        targetScore: options.targetScore ?? 51,
        initialDealer: options.initialDealer ?? 0,
        seed: options.seed ?? 12345,
      });
    }

    this.setupTransportListener();
  }

  public get state(): Readonly<GameState> {
    return this.engine.state;
  }

  public getEngine(): KoutGameEngine {
    return this.engine;
  }

  public startRound(seed?: number): void {
    this.engine.startRound(seed);
    this.broadcastState();
  }

  private setupTransportListener(): void {
    this.unsubscribeMessages = this.transport.onClientMessage(
      (playerToken: string, packet: ClientPacket) => {
        this.handleClientPacket(playerToken, packet);
      }
    );
  }

  public destroy(): void {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
      this.unsubscribeMessages = undefined;
    }
  }

  private handleClientPacket(playerToken: string, packet: ClientPacket): void {
    switch (packet.type) {
      case 'JOIN': {
        this.handleJoin(playerToken, packet);
        break;
      }
      case 'BID_REQUEST': {
        this.handleBidRequest(playerToken, packet);
        break;
      }
      case 'TRUMP_REQUEST': {
        this.handleTrumpRequest(playerToken, packet);
        break;
      }
      case 'PLAY_CARD_REQUEST': {
        this.handlePlayCardRequest(playerToken, packet);
        break;
      }
      case 'PING': {
        this.sendPacket(playerToken, {
          type: 'PONG',
          payload: {
            timestamp: packet.payload.timestamp,
            serverTime: Date.now(),
          },
        });
        break;
      }
      default: {
        this.sendError(
          playerToken,
          'UNKNOWN_PACKET',
          `Unknown packet type: ${(packet as any).type}`,
          (packet as any).seq
        );
      }
    }
  }

  private handleJoin(
    playerToken: string,
    packet: Extract<ClientPacket, { type: 'JOIN' }>
  ): void {
    const numSeats = RULES[this.engine.state.variant].seats;
    const preferred = packet.payload.preferredSeat;

    // Check if token already assigned
    let assignedSeat = this.tokenToSeat.get(playerToken);

    if (assignedSeat === undefined) {
      // Find open seat
      if (
        preferred !== undefined &&
        preferred >= 0 &&
        preferred < numSeats &&
        !this.seatToToken.has(preferred)
      ) {
        assignedSeat = preferred;
      } else {
        for (let s = 0; s < numSeats; s++) {
          if (!this.seatToToken.has(s)) {
            assignedSeat = s;
            break;
          }
        }
      }
    }

    if (assignedSeat === undefined) {
      this.sendError(
        playerToken,
        'ROOM_FULL',
        'No available seats in this room',
        packet.seq
      );
      return;
    }

    // Register mapping
    this.tokenToSeat.set(playerToken, assignedSeat);
    this.seatToToken.set(assignedSeat, playerToken);

    // Update player slot in state
    const currentPlayers = [...(this.engine.state.players || [])];
    const updatedSlot: PlayerSlot = {
      seatIndex: assignedSeat,
      kind: 'HUMAN_REMOTE' as SeatKind,
      name: packet.payload.playerName || `لاعب ${assignedSeat + 1}`,
      team: (assignedSeat % 2) as 0 | 1,
      connected: true,
      playerToken,
    };
    currentPlayers[assignedSeat] = updatedSlot;

    // Inform client of assigned seat
    this.sendPacket(playerToken, {
      type: 'SEAT_UPDATE',
      payload: {
        seatIndex: assignedSeat,
        player: updatedSlot,
        players: currentPlayers,
      },
    });

    // Send individual filtered state snapshot
    this.sendFilteredStateToSeat(assignedSeat);
  }

  private handleBidRequest(
    playerToken: string,
    packet: Extract<ClientPacket, { type: 'BID_REQUEST' }>
  ): void {
    const senderSeat = this.tokenToSeat.get(playerToken);
    if (senderSeat === undefined) {
      this.sendError(playerToken, 'NOT_JOINED', 'Must join before taking actions', packet.seq);
      return;
    }

    if (this.engine.state.phase !== 'BID') {
      this.sendError(
        playerToken,
        'INVALID_PHASE',
        `Current phase is ${this.engine.state.phase}, expected BID`,
        packet.seq
      );
      return;
    }

    // Authoritative check: sender seat = current seat
    if (senderSeat !== this.engine.state.currentSeat) {
      this.sendError(
        playerToken,
        'NOT_YOUR_TURN',
        `Not seat ${senderSeat}'s turn to bid (current seat is ${this.engine.state.currentSeat})`,
        packet.seq
      );
      return;
    }

    try {
      this.engine.placeBid(senderSeat, packet.payload.bid);
      this.broadcastState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(playerToken, 'BID_REJECTED', msg, packet.seq);
    }
  }

  private handleTrumpRequest(
    playerToken: string,
    packet: Extract<ClientPacket, { type: 'TRUMP_REQUEST' }>
  ): void {
    const senderSeat = this.tokenToSeat.get(playerToken);
    if (senderSeat === undefined) {
      this.sendError(playerToken, 'NOT_JOINED', 'Must join before taking actions', packet.seq);
      return;
    }

    if (this.engine.state.phase !== 'TRUMP') {
      this.sendError(
        playerToken,
        'INVALID_PHASE',
        `Current phase is ${this.engine.state.phase}, expected TRUMP`,
        packet.seq
      );
      return;
    }

    // Authoritative check: only winning bidder can declare trump
    if (senderSeat !== this.engine.state.bidderSeat) {
      this.sendError(
        playerToken,
        'NOT_BIDDER',
        `Only the winning bidder (seat ${this.engine.state.bidderSeat}) can declare trump`,
        packet.seq
      );
      return;
    }

    try {
      this.engine.declareTrump(senderSeat, packet.payload.suit);
      this.broadcastState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(playerToken, 'TRUMP_REJECTED', msg, packet.seq);
    }
  }

  private handlePlayCardRequest(
    playerToken: string,
    packet: Extract<ClientPacket, { type: 'PLAY_CARD_REQUEST' }>
  ): void {
    const senderSeat = this.tokenToSeat.get(playerToken);
    if (senderSeat === undefined) {
      this.sendError(playerToken, 'NOT_JOINED', 'Must join before taking actions', packet.seq);
      return;
    }

    if (this.engine.state.phase !== 'PLAY') {
      this.sendError(
        playerToken,
        'INVALID_PHASE',
        `Current phase is ${this.engine.state.phase}, expected PLAY`,
        packet.seq
      );
      return;
    }

    // Authoritative check: sender seat = current seat
    if (senderSeat !== this.engine.state.currentSeat) {
      this.sendError(
        playerToken,
        'NOT_YOUR_TURN',
        `Not seat ${senderSeat}'s turn to play (current seat is ${this.engine.state.currentSeat})`,
        packet.seq
      );
      return;
    }

    try {
      this.engine.playCard(senderSeat, packet.payload.cardId);
      this.broadcastState();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.sendError(playerToken, 'PLAY_REJECTED', msg, packet.seq);
    }
  }

  /**
   * Broadcasts individual filtered snapshots to all connected clients
   */
  public broadcastState(): void {
    for (const [seatIndex, token] of this.seatToToken.entries()) {
      this.sendFilteredStateToSeat(seatIndex, token);
    }
  }

  public sendFilteredStateToSeat(seatIndex: number, playerToken?: string): void {
    const token = playerToken ?? this.seatToToken.get(seatIndex);
    if (!token) return;

    const filtered: ClientGameState = filterStateForSeat(
      this.engine.state,
      seatIndex
    );

    this.sendPacket(token, {
      type: 'CLIENT_STATE_UPDATE',
      payload: {
        state: filtered,
        seatIndex,
      },
    });
  }

  private sendPacket<T extends HostPacket['type']>(
    playerToken: string,
    packetData: { type: T; payload: Extract<HostPacket, { type: T }>['payload'] }
  ): void {
    const packet: HostPacket = {
      v: PROTOCOL_VERSION,
      seq: ++this.hostSeq,
      playerToken,
      type: packetData.type,
      payload: packetData.payload,
    } as HostPacket;

    this.transport.sendToClient(playerToken, packet);
  }

  private sendError(
    playerToken: string,
    code: string,
    message: string,
    originalSeq?: number
  ): void {
    this.sendPacket(playerToken, {
      type: 'ERROR',
      payload: {
        code,
        message,
        originalSeq,
      },
    });
  }
}
