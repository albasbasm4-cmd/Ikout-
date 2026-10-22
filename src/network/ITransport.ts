/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ClientPacket, HostPacket } from './protocol';

export type Unsubscribe = () => void;

/**
 * Interface for client-side point-to-point network communication
 */
export interface ITransport {
  send(packet: ClientPacket): void;
  onMessage(handler: (packet: HostPacket) => void): Unsubscribe;
  disconnect(): void;
  isConnected(): boolean;
}

/**
 * Interface for host/server network transport managing multiple clients
 */
export interface IHostTransport {
  sendToClient(playerToken: string, packet: HostPacket): void;
  broadcast(packet: HostPacket): void;
  onClientMessage(
    handler: (playerToken: string, packet: ClientPacket) => void
  ): Unsubscribe;
  onClientConnected?(handler: (playerToken: string) => void): Unsubscribe;
  onClientDisconnected?(handler: (playerToken: string) => void): Unsubscribe;
}
