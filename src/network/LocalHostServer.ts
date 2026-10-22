/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IHostTransport, Unsubscribe } from './ITransport';
import { ClientPacket, HostPacket, PROTOCOL_VERSION } from './protocol';
import { LoopbackHub } from './LoopbackTransport';
import { HostSession } from './HostSession';
import { PlayerSlot, SeatKind } from '../types/kout';

export interface LocalHostServerOptions {
  hostSession?: HostSession;
  gracePeriodMs?: number; // default 8000ms
  bridgeOverride?: any;
}

/**
 * Checks for Capacitor NodeJS plugin or react-native node bridge in window/global
 */
function getCapacitorNodeBridge(): any {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.Capacitor?.Plugins?.NodeJS) {
      return win.Capacitor.Plugins.NodeJS;
    }
    if (win.nodejs?.channel) {
      return win.nodejs.channel;
    }
    if (win.channel) {
      return win.channel;
    }
  }
  return null;
}

export class LocalHostServer implements IHostTransport {
  private bridge: any = null;
  private loopbackHub: LoopbackHub | null = null;
  private loopbackHostTransport: IHostTransport | null = null;

  private clientMessageHandlers = new Set<
    (playerToken: string, packet: ClientPacket) => void
  >();
  private clientConnectedHandlers = new Set<(playerToken: string) => void>();
  private clientDisconnectedHandlers = new Set<(playerToken: string) => void>();

  // Disconnect & 8s Grace Period Management
  private gracePeriodMs: number;
  private disconnectGraceTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private tokenToSeat = new Map<string, number>();
  private seatToToken = new Map<number, string>();
  private seatOriginalSlot = new Map<number, PlayerSlot>();
  private hostSessionRef: HostSession | null = null;

  constructor(options: LocalHostServerOptions = {}) {
    this.gracePeriodMs = options.gracePeriodMs ?? 8000;
    this.bridge = options.bridgeOverride ?? getCapacitorNodeBridge();
    this.hostSessionRef = options.hostSession ?? null;

    if (!this.bridge) {
      // Fallback to LoopbackTransport in web preview / browser / testing
      this.loopbackHub = new LoopbackHub();
      this.loopbackHostTransport = this.loopbackHub.getHostTransport();
      this.setupLoopbackPassthrough();
    } else {
      this.setupBridgeListeners();
    }
  }

  public setHostSession(session: HostSession): void {
    this.hostSessionRef = session;
  }

  public getLoopbackHub(): LoopbackHub | null {
    return this.loopbackHub;
  }

  public isUsingBridge(): boolean {
    return this.bridge !== null;
  }

  /**
   * Called when client joins/binds a seat
   */
  public registerSeatBinding(playerToken: string, seatIndex: number, slot: PlayerSlot): void {
    // If a grace timer was pending for this seat, cancel it (client reconnected!)
    const existingTimer = this.disconnectGraceTimers.get(seatIndex);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.disconnectGraceTimers.delete(seatIndex);
    }

    this.tokenToSeat.set(playerToken, seatIndex);
    this.seatToToken.set(seatIndex, playerToken);
    this.seatOriginalSlot.set(seatIndex, { ...slot });
  }

  /**
   * Called when a client disconnects:
   * Starts 8s grace period, after which seat is played by a bot.
   */
  public handleClientDisconnected(playerToken: string): void {
    const seatIndex = this.tokenToSeat.get(playerToken);

    for (const handler of this.clientDisconnectedHandlers) {
      handler(playerToken);
    }

    if (seatIndex === undefined) return;

    // Start 8s grace period timer
    const existingTimer = this.disconnectGraceTimers.get(seatIndex);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      this.disconnectGraceTimers.delete(seatIndex);
      this.takeoverSeatWithBot(seatIndex);
    }, this.gracePeriodMs);

    this.disconnectGraceTimers.set(seatIndex, timer);
  }

  /**
   * On client reconnect with token: cancels grace timer and returns seat to human
   */
  public handleClientReconnected(playerToken: string): number | null {
    const seatIndex = this.tokenToSeat.get(playerToken);
    if (seatIndex === undefined) return null;

    const timer = this.disconnectGraceTimers.get(seatIndex);
    if (timer) {
      clearTimeout(timer);
      this.disconnectGraceTimers.delete(seatIndex);
    }

    // Restore human player to seat if bot had taken over
    if (this.hostSessionRef) {
      const state = this.hostSessionRef.getEngine().state;
      if (state.players && state.players[seatIndex]) {
        state.players[seatIndex].kind = 'HUMAN_REMOTE';
        state.players[seatIndex].connected = true;

        this.hostSessionRef.broadcastState();
      }
    }

    return seatIndex;
  }

  private takeoverSeatWithBot(seatIndex: number): void {
    if (!this.hostSessionRef) return;

    const engine = this.hostSessionRef.getEngine();
    const state = engine.state;

    if (state.players && state.players[seatIndex]) {
      // Convert seat to AI_BOT to keep gameplay proceeding
      state.players[seatIndex].kind = 'AI_BOT';
      state.players[seatIndex].connected = true;

      // Broadcast updated seat status
      this.hostSessionRef.broadcastState();
    }
  }

  // --- Bridge Listeners ---
  private setupBridgeListeners(): void {
    const handleBridgeMessage = (raw: any) => {
      let msg = raw;
      if (typeof raw === 'string') {
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
      }

      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'CLIENT_CONNECTED':
          for (const handler of this.clientConnectedHandlers) {
            handler(msg.clientId);
          }
          break;

        case 'CLIENT_DISCONNECTED':
          this.handleClientDisconnected(msg.clientId);
          break;

        case 'CLIENT_MESSAGE':
          for (const handler of this.clientMessageHandlers) {
            handler(msg.clientId, msg.data);
          }
          break;

        default:
          break;
      }
    };

    if (this.bridge.addListener) {
      this.bridge.addListener('message', handleBridgeMessage);
    } else if (this.bridge.on) {
      this.bridge.on('message', handleBridgeMessage);
    }
  }

  // --- Loopback Passthrough ---
  private setupLoopbackPassthrough(): void {
    if (!this.loopbackHostTransport) return;

    this.loopbackHostTransport.onClientMessage((token, packet) => {
      for (const handler of this.clientMessageHandlers) {
        handler(token, packet);
      }
    });

    if (this.loopbackHostTransport.onClientConnected) {
      this.loopbackHostTransport.onClientConnected((token) => {
        for (const handler of this.clientConnectedHandlers) {
          handler(token);
        }
      });
    }

    if (this.loopbackHostTransport.onClientDisconnected) {
      this.loopbackHostTransport.onClientDisconnected((token) => {
        this.handleClientDisconnected(token);
      });
    }
  }

  // --- IHostTransport Implementation ---
  public sendToClient(playerToken: string, packet: HostPacket): void {
    if (this.bridge) {
      const payload = {
        type: 'SEND_TO_CLIENT',
        clientId: playerToken,
        data: packet,
      };
      if (this.bridge.send) {
        this.bridge.send(payload);
      } else if (this.bridge.postMessage) {
        this.bridge.postMessage(payload);
      }
    } else if (this.loopbackHostTransport) {
      this.loopbackHostTransport.sendToClient(playerToken, packet);
    }
  }

  public broadcast(packet: HostPacket): void {
    if (this.bridge) {
      const payload = {
        type: 'BROADCAST',
        data: packet,
      };
      if (this.bridge.send) {
        this.bridge.send(payload);
      } else if (this.bridge.postMessage) {
        this.bridge.postMessage(payload);
      }
    } else if (this.loopbackHostTransport) {
      this.loopbackHostTransport.broadcast(packet);
    }
  }

  public onClientMessage(
    handler: (playerToken: string, packet: ClientPacket) => void
  ): Unsubscribe {
    this.clientMessageHandlers.add(handler);
    return () => {
      this.clientMessageHandlers.delete(handler);
    };
  }

  public onClientConnected(handler: (playerToken: string) => void): Unsubscribe {
    this.clientConnectedHandlers.add(handler);
    return () => {
      this.clientConnectedHandlers.delete(handler);
    };
  }

  public onClientDisconnected(handler: (playerToken: string) => void): Unsubscribe {
    this.clientDisconnectedHandlers.add(handler);
    return () => {
      this.clientDisconnectedHandlers.delete(handler);
    };
  }

  public destroy(): void {
    for (const timer of this.disconnectGraceTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectGraceTimers.clear();
    this.clientMessageHandlers.clear();
    this.clientConnectedHandlers.clear();
    this.clientDisconnectedHandlers.clear();
    if (this.loopbackHub) {
      this.loopbackHub.reset();
    }
  }
}
