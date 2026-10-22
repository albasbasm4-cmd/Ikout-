/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ITransport, Unsubscribe } from './ITransport';
import { ClientPacket, HostPacket, PROTOCOL_VERSION } from './protocol';

export type ClientSocketStatus =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'HOST_DROPPED';

export interface LocalClientSocketOptions {
  url?: string; // default ws://localhost:8080
  playerToken: string;
  playerName: string;
  preferredSeat?: number;
  maxReconnectAttempts?: number; // default 5
  initialBackoffMs?: number; // default 500ms
  maxBackoffMs?: number; // default 6000ms
  transportOverride?: ITransport;
}

export class LocalClientSocket implements ITransport {
  private url: string;
  private playerToken: string;
  private playerName: string;
  private preferredSeat?: number;

  private ws: WebSocket | null = null;
  private status: ClientSocketStatus = 'DISCONNECTED';
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private initialBackoffMs: number;
  private maxBackoffMs: number;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private messageHandlers = new Set<(packet: HostPacket) => void>();
  private statusHandlers = new Set<(status: ClientSocketStatus) => void>();
  private hostLeftHandlers = new Set<() => void>();

  private seqCounter = 0;
  private manualDisconnect = false;
  private transportOverride: ITransport | null = null;

  constructor(options: LocalClientSocketOptions) {
    this.url = options.url ?? 'ws://localhost:8080';
    this.playerToken = options.playerToken;
    this.playerName = options.playerName;
    this.preferredSeat = options.preferredSeat;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.initialBackoffMs = options.initialBackoffMs ?? 500;
    this.maxBackoffMs = options.maxBackoffMs ?? 6000;

    if (options.transportOverride) {
      this.transportOverride = options.transportOverride;
      this.setupTransportOverride();
    } else {
      this.connect();
    }
  }

  public getStatus(): ClientSocketStatus {
    return this.status;
  }

  public isConnected(): boolean {
    if (this.transportOverride) {
      return this.transportOverride.isConnected();
    }
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public isHostDropped(): boolean {
    return this.status === 'HOST_DROPPED';
  }

  private setStatus(newStatus: ClientSocketStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const handler of this.statusHandlers) {
      handler(newStatus);
    }
    if (newStatus === 'HOST_DROPPED') {
      for (const handler of this.hostLeftHandlers) {
        handler();
      }
    }
  }

  private connect(): void {
    if (this.manualDisconnect) return;

    if (typeof WebSocket === 'undefined') {
      // In testing environments without WebSocket, stay disconnected
      this.setStatus('DISCONNECTED');
      return;
    }

    this.setStatus(this.reconnectAttempts > 0 ? 'RECONNECTING' : 'CONNECTING');

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('CONNECTED');
        // Resend JOIN on every connect / reconnect with playerToken
        this.sendJoin();
      };

      this.ws.onmessage = (event) => {
        try {
          const packet: HostPacket = JSON.parse(event.data.toString());
          for (const handler of this.messageHandlers) {
            handler(packet);
          }
        } catch (err) {
          console.error('[LocalClientSocket] Parse error:', err);
        }
      };

      this.ws.onclose = () => {
        this.handleDisconnectOrError();
      };

      this.ws.onerror = () => {
        // Handled in onclose
      };
    } catch {
      this.handleDisconnectOrError();
    }
  }

  private handleDisconnectOrError(): void {
    this.ws = null;
    if (this.manualDisconnect) {
      this.setStatus('DISCONNECTED');
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      // Max attempts exceeded: host has left / dropped
      this.setStatus('HOST_DROPPED');
      return;
    }

    this.reconnectAttempts++;
    this.setStatus('RECONNECTING');

    // Exponential backoff
    const delay = Math.min(
      this.initialBackoffMs * Math.pow(2, this.reconnectAttempts - 1),
      this.maxBackoffMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private sendJoin(): void {
    this.send({
      v: PROTOCOL_VERSION,
      seq: ++this.seqCounter,
      playerToken: this.playerToken,
      type: 'JOIN',
      payload: {
        playerName: this.playerName,
        preferredSeat: this.preferredSeat,
      },
    });
  }

  private setupTransportOverride(): void {
    if (!this.transportOverride) return;
    this.setStatus('CONNECTED');

    this.transportOverride.onMessage((packet) => {
      for (const handler of this.messageHandlers) {
        handler(packet);
      }
    });

    this.sendJoin();
  }

  // --- ITransport implementation ---
  public send(packet: ClientPacket): void {
    if (this.transportOverride) {
      this.transportOverride.send(packet);
      return;
    }

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(packet));
    }
  }

  public onMessage(handler: (packet: HostPacket) => void): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onStatusChange(handler: (status: ClientSocketStatus) => void): Unsubscribe {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  public onHostLeft(handler: () => void): Unsubscribe {
    this.hostLeftHandlers.add(handler);
    return () => {
      this.hostLeftHandlers.delete(handler);
    };
  }

  public disconnect(): void {
    this.manualDisconnect = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.transportOverride) {
      this.transportOverride.disconnect();
    }
    this.setStatus('DISCONNECTED');
  }
}
