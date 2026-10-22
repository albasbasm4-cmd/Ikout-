/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GameState } from '../types/kout';

export const SAVED_GAME_KEY = 'ikout_saved_game_v1';

/**
 * Persists the current GameState to localStorage after every move
 */
export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return;

  try {
    // If the game ended, don't persist an unresumable completed state
    if (state.phase === 'GAME_END') {
      clearSavedGameState();
      return;
    }

    const serialized = JSON.stringify({
      state,
      savedAt: Date.now(),
    });
    localStorage.setItem(SAVED_GAME_KEY, serialized);
  } catch (err) {
    console.warn('Failed to save game state to localStorage:', err);
  }
}

/**
 * Loads a previously saved GameState if present and valid
 */
export function loadSavedGameState(): GameState | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(SAVED_GAME_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.state) return null;

    const state = parsed.state as GameState;

    // Validate essential properties
    if (
      state.variant &&
      Array.isArray(state.hands) &&
      Array.isArray(state.scores) &&
      state.phase !== 'GAME_END'
    ) {
      return state;
    }
  } catch (err) {
    console.warn('Failed to load saved game state:', err);
  }

  return null;
}

/**
 * Checks whether an active, resumable saved game is present in localStorage
 */
export function hasSavedGame(): boolean {
  return loadSavedGameState() !== null;
}

/**
 * Clears saved game from localStorage
 */
export function clearSavedGameState(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SAVED_GAME_KEY);
  } catch (err) {
    console.warn('Failed to clear saved game state:', err);
  }
}
