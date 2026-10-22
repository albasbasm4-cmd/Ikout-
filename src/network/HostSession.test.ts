/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LoopbackHub } from './LoopbackTransport';
import { HostSession } from './HostSession';
import { ClientPacket, HostPacket, ClientStateUpdatePacket, ErrorPacket } from './protocol';
import { Card } from '../types/kout';

describe('HostSession & Network Protocol v1', () => {
  let hub: LoopbackHub;
  let hostSession: HostSession;

  beforeEach(() => {
    hub = new LoopbackHub();
    hostSession = new HostSession(hub.getHostTransport(), {
      variant: 'BO6',
      targetScore: 51,
      seed: 42,
    });
  });

  afterEach(() => {
    hostSession.destroy();
    hub.reset();
  });

  it('strictly ensures client never receives others hands in CLIENT_STATE_UPDATE', async () => {
    const client1Token = 'token-client-1';
    const client2Token = 'token-client-2';

    const client1Transport = hub.createClientTransport(client1Token);
    const client2Transport = hub.createClientTransport(client2Token);

    let client1LastState: ClientStateUpdatePacket['payload']['state'] | null = null;
    let client2LastState: ClientStateUpdatePacket['payload']['state'] | null = null;

    client1Transport.onMessage((packet: HostPacket) => {
      if (packet.type === 'CLIENT_STATE_UPDATE') {
        client1LastState = packet.payload.state;
      }
    });

    client2Transport.onMessage((packet: HostPacket) => {
      if (packet.type === 'CLIENT_STATE_UPDATE') {
        client2LastState = packet.payload.state;
      }
    });

    // Client 1 joins seat 0
    client1Transport.send({
      v: 1,
      seq: 1,
      playerToken: client1Token,
      type: 'JOIN',
      payload: { playerName: 'لاعب ١', preferredSeat: 0 },
    });

    // Client 2 joins seat 1
    client2Transport.send({
      v: 1,
      seq: 1,
      playerToken: client2Token,
      type: 'JOIN',
      payload: { playerName: 'لاعب ٢', preferredSeat: 1 },
    });

    // Wait for microtask network deliveries
    await new Promise((r) => setTimeout(r, 10));

    // Host starts a round (deals 9 cards to each of the 6 seats)
    hostSession.startRound(9999);

    await new Promise((r) => setTimeout(r, 10));

    expect(client1LastState).not.toBeNull();
    expect(client2LastState).not.toBeNull();

    // Verification for Client 1 (Seat 0):
    // 1. Client 1 receives real cards for seat 0
    const client1OwnHand = client1LastState!.hands[0] as Card[];
    expect(client1OwnHand.length).toBe(9);
    for (const card of client1OwnHand) {
      expect(card.suit !== undefined || card.joker !== undefined).toBe(true);
      expect((card as any).isMasked).toBeUndefined();
    }

    // 2. Client 1 receives strictly masked cards for all other seats (1..5)
    for (let s = 1; s < 6; s++) {
      const otherHand = client1LastState!.hands[s];
      expect(otherHand.length).toBe(9);
      for (const maskedCard of otherHand) {
        expect((maskedCard as any).isMasked).toBe(true);
        expect((maskedCard as any).suit).toBeUndefined();
        expect((maskedCard as any).rank).toBeUndefined();
        expect((maskedCard as any).joker).toBeUndefined();
      }
    }

    // Verification for Client 2 (Seat 1):
    // 1. Client 2 receives real cards for seat 1
    const client2OwnHand = client2LastState!.hands[1] as Card[];
    expect(client2OwnHand.length).toBe(9);
    for (const card of client2OwnHand) {
      expect(card.suit !== undefined || card.joker !== undefined).toBe(true);
      expect((card as any).isMasked).toBeUndefined();
    }

    // 2. Client 2 receives strictly masked cards for Seat 0
    const seat0FromClient2 = client2LastState!.hands[0];
    for (const card of seat0FromClient2) {
      expect((card as any).isMasked).toBe(true);
      expect((card as any).suit).toBeUndefined();
      expect((card as any).rank).toBeUndefined();
    }
  });

  it('validates sender seat = current seat and rejects out-of-turn actions with ERROR', async () => {
    const token1 = 'token-seat-0';
    const token2 = 'token-seat-1';

    const client1 = hub.createClientTransport(token1);
    const client2 = hub.createClientTransport(token2);

    let client2Error: ErrorPacket['payload'] | null = null;
    client2.onMessage((packet: HostPacket) => {
      if (packet.type === 'ERROR') {
        client2Error = packet.payload;
      }
    });

    client1.send({
      v: 1,
      seq: 1,
      playerToken: token1,
      type: 'JOIN',
      payload: { playerName: 'Player 0', preferredSeat: 0 },
    });

    client2.send({
      v: 1,
      seq: 1,
      playerToken: token2,
      type: 'JOIN',
      payload: { playerName: 'Player 1', preferredSeat: 1 },
    });

    await new Promise((r) => setTimeout(r, 10));

    // Host starts round with dealer 0 -> first bidder is seat 1
    hostSession.startRound(123);
    await new Promise((r) => setTimeout(r, 10));

    expect(hostSession.state.currentSeat).toBe(1); // Seat 1's turn to bid

    // Client 1 (Seat 0) attempts to bid out of turn!
    let client1Error: ErrorPacket['payload'] | null = null;
    client1.onMessage((packet: HostPacket) => {
      if (packet.type === 'ERROR') {
        client1Error = packet.payload;
      }
    });

    client1.send({
      v: 1,
      seq: 2,
      playerToken: token1,
      type: 'BID_REQUEST',
      payload: { bid: 5 },
    });

    await new Promise((r) => setTimeout(r, 10));

    // Client 1's out-of-turn bid must be rejected
    expect(client1Error).not.toBeNull();
    expect(client1Error!.code).toBe('NOT_YOUR_TURN');

    // Client 2 (Seat 1) bids legally
    client2.send({
      v: 1,
      seq: 2,
      playerToken: token2,
      type: 'BID_REQUEST',
      payload: { bid: 5 },
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(hostSession.state.highBid).toBe(5);
    expect(hostSession.state.bidderSeat).toBe(1);
  });

  it('handles PING with PONG containing timestamp and serverTime', async () => {
    const token = 'token-ping-test';
    const client = hub.createClientTransport(token);

    let pongReceived: any = null;
    client.onMessage((packet: HostPacket) => {
      if (packet.type === 'PONG') {
        pongReceived = packet.payload;
      }
    });

    const sendTimestamp = 123456789;
    client.send({
      v: 1,
      seq: 1,
      playerToken: token,
      type: 'PING',
      payload: { timestamp: sendTimestamp },
    });

    await new Promise((r) => setTimeout(r, 10));

    expect(pongReceived).not.toBeNull();
    expect(pongReceived.timestamp).toBe(sendTimestamp);
    expect(pongReceived.serverTime).toBeGreaterThan(0);
  });
});
