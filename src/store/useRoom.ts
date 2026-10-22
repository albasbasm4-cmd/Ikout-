/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback } from 'react';
import { PlayerSlot, SeatKind, Difficulty } from '../types/kout';

export type RoomPreset = 'SOLO_VS_BOTS' | 'TWO_HUMANS_COOP' | 'TWO_HUMANS_VERSUS' | 'CUSTOM';

export interface RoomConfig {
  variant: 'BO6' | 'BO4';
  targetScore: number;
  botDifficulty: Difficulty;
  players: PlayerSlot[];
}

const DEFAULT_BOT_NAMES_BO6 = ['سالم', 'جراح', 'فهد', 'مبارك', 'طلال'];
const DEFAULT_BOT_NAMES_BO4 = ['سالم', 'جراح', 'فهد'];

export function createDefaultPlayers(
  variant: 'BO6' | 'BO4',
  botDifficulty: Difficulty = 'MEDIUM'
): PlayerSlot[] {
  const seatsCount = variant === 'BO6' ? 6 : 4;
  const botNames = variant === 'BO6' ? DEFAULT_BOT_NAMES_BO6 : DEFAULT_BOT_NAMES_BO4;

  return Array.from({ length: seatsCount }, (_, i) => ({
    seatIndex: i,
    kind: i === 0 ? 'HUMAN_LOCAL' : 'AI_BOT',
    name: i === 0 ? 'أنت' : botNames[i - 1] || `بوت ${i + 1}`,
    team: (i % 2) as 0 | 1,
    connected: true,
    difficulty: i === 0 ? undefined : botDifficulty,
  }));
}

export function useRoom(initialConfig?: Partial<RoomConfig>) {
  const [variant, setVariantState] = useState<'BO6' | 'BO4'>(
    initialConfig?.variant ?? 'BO6'
  );
  const [targetScore, setTargetScore] = useState<number>(
    initialConfig?.targetScore ?? 51
  );
  const [botDifficulty, setBotDifficultyState] = useState<Difficulty>(
    initialConfig?.botDifficulty ?? 'MEDIUM'
  );
  const [activePreset, setActivePreset] = useState<RoomPreset>('SOLO_VS_BOTS');

  const [players, setPlayers] = useState<PlayerSlot[]>(() =>
    createDefaultPlayers(
      initialConfig?.variant ?? 'BO6',
      initialConfig?.botDifficulty ?? 'MEDIUM'
    )
  );

  // Set Variant (re-syncs players count)
  const setVariant = useCallback(
    (newVariant: 'BO6' | 'BO4') => {
      setVariantState(newVariant);
      setPlayers((prev) => {
        const targetCount = newVariant === 'BO6' ? 6 : 4;
        const botNames =
          newVariant === 'BO6' ? DEFAULT_BOT_NAMES_BO6 : DEFAULT_BOT_NAMES_BO4;

        if (prev.length === targetCount) return prev;

        return Array.from({ length: targetCount }, (_, i) => {
          if (i < prev.length) {
            return {
              ...prev[i],
              seatIndex: i,
              team: (i % 2) as 0 | 1,
            };
          }
          return {
            seatIndex: i,
            kind: 'AI_BOT' as SeatKind,
            name: botNames[i - 1] || `بوت ${i + 1}`,
            team: (i % 2) as 0 | 1,
            connected: true,
            difficulty: botDifficulty,
          };
        });
      });
      setActivePreset('CUSTOM');
    },
    [botDifficulty]
  );

  // Set Bot Difficulty
  const setBotDifficulty = useCallback((diff: Difficulty) => {
    setBotDifficultyState(diff);
    setPlayers((prev) =>
      prev.map((p) =>
        p.kind === 'AI_BOT' ? { ...p, difficulty: diff } : p
      )
    );
  }, []);

  // Update specific seat configuration
  const setSeatKind = useCallback(
    (seatIndex: number, kind: SeatKind, customName?: string) => {
      setPlayers((prev) =>
        prev.map((p) => {
          if (p.seatIndex !== seatIndex) return p;

          let name = customName ?? p.name;
          if (!customName) {
            if (kind === 'HUMAN_LOCAL') name = seatIndex === 0 ? 'أنت' : `لاعب محلي ${seatIndex + 1}`;
            else if (kind === 'HUMAN_REMOTE') name = `لاعب عن بعد ${seatIndex + 1}`;
            else {
              const botNames = variant === 'BO6' ? DEFAULT_BOT_NAMES_BO6 : DEFAULT_BOT_NAMES_BO4;
              name = botNames[seatIndex - 1] || `بوت ${seatIndex + 1}`;
            }
          }

          return {
            ...p,
            kind,
            name,
            difficulty: kind === 'AI_BOT' ? botDifficulty : undefined,
            connected: kind !== 'HUMAN_REMOTE', // remote starts in waiting
          };
        })
      );
      setActivePreset('CUSTOM');
    },
    [botDifficulty, variant]
  );

  // Set player name
  const setPlayerName = useCallback((seatIndex: number, name: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.seatIndex === seatIndex ? { ...p, name } : p))
    );
  }, []);

  // Swap seats (seats alternate teams: team = seatIndex % 2)
  const swapSeats = useCallback((seatA: number, seatB: number) => {
    setPlayers((prev) => {
      const copy = [...prev];
      const playerA = copy.find((p) => p.seatIndex === seatA);
      const playerB = copy.find((p) => p.seatIndex === seatB);
      if (!playerA || !playerB) return prev;

      return copy.map((p) => {
        if (p.seatIndex === seatA) {
          return {
            ...playerB,
            seatIndex: seatA,
            team: (seatA % 2) as 0 | 1,
          };
        }
        if (p.seatIndex === seatB) {
          return {
            ...playerA,
            seatIndex: seatB,
            team: (seatB % 2) as 0 | 1,
          };
        }
        return p;
      });
    });
    setActivePreset('CUSTOM');
  }, []);

  // Auto-fill empty or non-human slots with bots
  const autoFillBots = useCallback(() => {
    const botNames = variant === 'BO6' ? DEFAULT_BOT_NAMES_BO6 : DEFAULT_BOT_NAMES_BO4;
    setPlayers((prev) =>
      prev.map((p, i) => {
        if (p.kind === 'HUMAN_LOCAL' || (p.kind === 'HUMAN_REMOTE' && p.connected)) {
          return p;
        }
        return {
          ...p,
          kind: 'AI_BOT',
          name: botNames[i - 1] || `بوت ${i + 1}`,
          difficulty: botDifficulty,
          connected: true,
        };
      })
    );
  }, [variant, botDifficulty]);

  // Apply Presets
  const applyPreset = useCallback(
    (preset: RoomPreset) => {
      const seatsCount = variant === 'BO6' ? 6 : 4;
      const botNames = variant === 'BO6' ? DEFAULT_BOT_NAMES_BO6 : DEFAULT_BOT_NAMES_BO4;
      setActivePreset(preset);

      switch (preset) {
        case 'SOLO_VS_BOTS':
          // 1 Human (Seat 0) vs AI Bots
          setPlayers(
            Array.from({ length: seatsCount }, (_, i) => ({
              seatIndex: i,
              kind: i === 0 ? 'HUMAN_LOCAL' : 'AI_BOT',
              name: i === 0 ? 'أنت' : botNames[i - 1] || `بوت ${i + 1}`,
              team: (i % 2) as 0 | 1,
              connected: true,
              difficulty: i === 0 ? undefined : botDifficulty,
            }))
          );
          break;

        case 'TWO_HUMANS_COOP':
          // 2 Humans on same team (Seat 0 and Seat 2 are both Team 0)
          setPlayers(
            Array.from({ length: seatsCount }, (_, i) => {
              if (i === 0) {
                return {
                  seatIndex: 0,
                  kind: 'HUMAN_LOCAL',
                  name: 'أنت',
                  team: 0,
                  connected: true,
                };
              }
              if (i === 2) {
                return {
                  seatIndex: 2,
                  kind: 'HUMAN_REMOTE',
                  name: 'شريكك (عن بعد)',
                  team: 0,
                  connected: false, // waiting for connection
                };
              }
              return {
                seatIndex: i,
                kind: 'AI_BOT',
                name: botNames[i - 1] || `بوت ${i + 1}`,
                team: (i % 2) as 0 | 1,
                connected: true,
                difficulty: botDifficulty,
              };
            })
          );
          break;

        case 'TWO_HUMANS_VERSUS':
          // 2 Humans on opposing teams (Seat 0 is Team 0, Seat 1 is Team 1)
          setPlayers(
            Array.from({ length: seatsCount }, (_, i) => {
              if (i === 0) {
                return {
                  seatIndex: 0,
                  kind: 'HUMAN_LOCAL',
                  name: 'أنت',
                  team: 0,
                  connected: true,
                };
              }
              if (i === 1) {
                return {
                  seatIndex: 1,
                  kind: 'HUMAN_REMOTE',
                  name: 'الخصم (عن بعد)',
                  team: 1,
                  connected: false, // waiting for connection
                };
              }
              return {
                seatIndex: i,
                kind: 'AI_BOT',
                name: botNames[i - 1] || `بوت ${i + 1}`,
                team: (i % 2) as 0 | 1,
                connected: true,
                difficulty: botDifficulty,
              };
            })
          );
          break;

        default:
          break;
      }
    },
    [variant, botDifficulty]
  );

  return {
    variant,
    setVariant,
    targetScore,
    setTargetScore,
    botDifficulty,
    setBotDifficulty,
    activePreset,
    players,
    setSeatKind,
    setPlayerName,
    swapSeats,
    autoFillBots,
    applyPreset,
    getConfig: (): RoomConfig => ({
      variant,
      targetScore,
      botDifficulty,
      players,
    }),
  };
}

export default useRoom;
