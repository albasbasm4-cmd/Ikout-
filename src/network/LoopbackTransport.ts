/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ITransport, IHostTransport, Unsubscribe } from './ITransport';
import { ClientPacket, HostPacket } from './protocol';

/**
 * In-memory hub that connects simulated client transports with a host session
 */
export class LoopbackHub {
  private clientHandlers = new Map<string, Set<(packet: HostPacket) => void>>();
  private hostMessageHandlers = new Set<
    (playerToken: string, packet: ClientPacket) => void
  >();
  private hostConnectHandlers = new Set<(playerToken: string) => void>();
  private hostDisconnectHandlers = new Set<(playerToken: string) => void>();

  /**
   * Creates a client transport tied to a specific player token
   */
  public createClientTransport(playerToken: string): ITransport {
    if (!this.clientHandlers.has(playerToken)) {
      this.clientHandlers.set(playerToken, new Set());
    }

    let connected = true;

    // Notify host of client connection
    queueMicrotask(() => {
      for (const handler of this.hostConnectHandlers) {
        handler(playerToken);
      }
    });

    const clientTransport: ITransport = {
      send: (packet: ClientPacket) => {
        if (!connected) return;
        queueMicrotask(() => {
          for (const handler of this.hostMessageHandlers) {
            handler(playerToken, packet);
          }
        });
      },

      onMessage: (handler: (packet: HostPacket) => void): Unsubscribe => {
        const set = this.clientHandlers.get(playerToken)!;
        set.add(handler);
        return () => {
          set.delete(handler);
        };
      },

      disconnect: () => {
        if (!connected) return;
        connected = false;
        this.clientHandlers.delete(playerToken);
        for (const handler of this.hostDisconnectHandlers) {
          handler(playerToken);
        }
      },

      isConnected: () => connected,
    };

    return clientTransport;
  }

  /**
   * Returns the host transport interface connected to this hub
   */
  public getHostTransport(): IHostTransport {
    return {
      sendToClient: (playerToken: string, packet: HostPacket) => {
        const handlers = this.clientHandlers.get(playerToken);
        if (handlers) {
          queueMicrotask(() => {
            for (const handler of handlers) {
              handler(packet);
            }
          });
        }
      },

      broadcast: (packet: HostPacket) => {
        queueMicrotask(() => {
          for (const handlers of this.clientHandlers.values()) {
            for (const handler of handlers) {
              handler(packet);
            }
          }
        });
      },

      onClientMessage: (
        handler: (playerToken: string, packet: ClientPacket) => void
      ): Unsubscribe => {
        this.hostMessageHandlers.add(handler);
        return () => {
          this.hostMessageHandlers.delete(handler);
        };
      },

      onClientConnected: (handler: (playerToken: string) => void): Unsubscribe => {
        this.hostConnectHandlers.add(handler);
        return () => {
          this.hostConnectHandlers.delete(handler);
        };
      },

      onClientDisconnected: (
        handler: (playerToken: string) => void
      ): Unsubscribe => {
        this.hostDisconnectHandlers.add(handler);
        return () => {
          this.hostDisconnectHandlers.delete(handler);
        };
      },
    };
  }

  public reset(): void {
    this.clientHandlers.clear();
    this.hostMessageHandlers.clear();
    this.hostConnectHandlers.clear();
    this.hostDisconnectHandlers.clear();
  }
}
