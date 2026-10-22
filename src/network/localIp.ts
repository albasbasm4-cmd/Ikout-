/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates a random 6-digit room code (e.g. '482910')
 */
export function generateRoomCode(): string {
  const code = Math.floor(100000 + Math.random() * 900000);
  return String(code);
}

/**
 * Encodes the connection payload into a QR code string or URL
 */
export function encodeRoomPayload(
  ip: string,
  port: number = 8080,
  roomCode: string
): string {
  const cleanIp = ip.trim().replace(/^ws:\/\//i, '').replace(/:\d+$/, '');
  return `ws://${cleanIp}:${port}?room=${roomCode}`;
}

/**
 * Parses a scanned QR payload or typed string into IP and room code
 */
export function parseRoomPayload(
  payload: string
): { ip: string; port: number; roomCode?: string } {
  const trimmed = payload.trim();

  try {
    if (trimmed.startsWith('ws://') || trimmed.startsWith('wss://')) {
      const url = new URL(trimmed);
      const roomParam = url.searchParams.get('room');
      return {
        ip: url.hostname,
        port: Number(url.port) || 8080,
        roomCode: roomParam || undefined,
      };
    }
  } catch {
    // Fall through to manual parsing
  }

  // Format: "192.168.1.100:8080" or "192.168.1.100"
  const parts = trimmed.split(':');
  const ip = parts[0];
  const port = parts[1] ? Number(parts[1]) : 8080;

  return { ip, port };
}

/**
 * Attempts to detect the local network IP using WebRTC candidate sniffing.
 * Falls back to hostname or standard LAN subnet address.
 */
export async function getLocalIpAddress(): Promise<string> {
  if (typeof window === 'undefined') {
    return '192.168.1.100';
  }

  // If running on a local LAN hostname or IP
  const hostname = window.location.hostname;
  if (
    hostname &&
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.endsWith('.app') &&
    !hostname.endsWith('.run.app')
  ) {
    return hostname;
  }

  // WebRTC local candidate discovery
  try {
    const RTCPC =
      (window as any).RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection;

    if (RTCPC) {
      const pc = new RTCPC({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      return new Promise<string>((resolve) => {
        const timeout = setTimeout(() => {
          pc.close();
          resolve('192.168.1.105');
        }, 800);

        pc.onicecandidate = (event: any) => {
          if (!event || !event.candidate) return;
          const candidate = event.candidate.candidate;
          const match = candidate.match(
            /([0-9]{1,3}(\.[0-9]{1,3}){3})/
          );
          if (match && match[1] && !match[1].startsWith('127.')) {
            clearTimeout(timeout);
            pc.close();
            resolve(match[1]);
          }
        };
      });
    }
  } catch {
    // Ignore WebRTC permission errors
  }

  return '192.168.1.105';
}
