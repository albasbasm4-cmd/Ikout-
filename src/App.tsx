/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { GameScreen } from './components/GameScreen';
import { Lobby } from './components/Lobby';
import { RoomConfig } from './store/useRoom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { hasSavedGame, loadSavedGameState, clearSavedGameState } from './utils/persist';
import { useKeepAwake } from './store/useSettings';
import { RotateCcw, Play, X } from 'lucide-react';

export default function App() {
  const [activeView, setActiveView] = useState<'lobby' | 'game'>('game');
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState<boolean>(false);
  const [resumedState, setResumedState] = useState<any>(null);

  // Keep screen awake while playing
  useKeepAwake(true);

  useEffect(() => {
    if (hasSavedGame()) {
      setShowResumePrompt(true);
    }
  }, []);

  const handleStartGame = (config: RoomConfig) => {
    clearSavedGameState();
    setRoomConfig(config);
    setResumedState(null);
    setActiveView('game');
  };

  const handleResumeGame = () => {
    const saved = loadSavedGameState();
    if (saved) {
      setResumedState(saved);
      setActiveView('game');
    }
    setShowResumePrompt(false);
  };

  const handleDismissResume = () => {
    clearSavedGameState();
    setShowResumePrompt(false);
  };

  return (
    <ErrorBoundary>
      <div className="relative w-full min-h-screen">
        {/* Top Floating Menu Bar for easy switching when in Lobby */}
        {activeView === 'lobby' && (
          <nav
            dir="rtl"
            aria-label="القائمة الرئيسية"
            className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 flex items-center gap-1.5 bg-black/85 border border-amber-400/40 rounded-full px-2 py-1 shadow-2xl backdrop-blur-md text-xs font-bold"
          >
            <button
              type="button"
              onClick={() => setActiveView('game')}
              className="px-3 py-1 rounded-full transition-all cursor-pointer text-amber-200/70 hover:text-white"
            >
              طاولة اللعب
            </button>
            <button
              type="button"
              onClick={() => setActiveView('lobby')}
              className="px-3 py-1 rounded-full transition-all cursor-pointer bg-amber-400 text-black shadow-md font-extrabold"
            >
              غرفة اللعب (Lobby)
            </button>
          </nav>
        )}

        {/* Resume Saved Game Banner / Notification on Start */}
        {showResumePrompt && (
          <div
            dir="rtl"
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-neutral-900 border-2 border-amber-400/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-amber-50 animate-in slide-in-from-bottom duration-300"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-300">استئناف اللعبة السابقة</h4>
                  <p className="text-[10px] text-amber-200/70">
                    توجد جولة غير مكتملة محفوظة في جهازك.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDismissResume}
                className="text-neutral-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleResumeGame}
                className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-extrabold text-xs shadow active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>استئناف الآن</span>
              </button>

              <button
                type="button"
                onClick={handleDismissResume}
                className="py-1.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-200/80 text-xs font-semibold border border-neutral-700 active:scale-95 cursor-pointer"
              >
                تجاهل وبدء جديدة
              </button>
            </div>
          </div>
        )}

        {activeView === 'lobby' ? (
          <Lobby
            onStartGame={handleStartGame}
            initialConfig={roomConfig ?? undefined}
          />
        ) : (
          <GameScreen
            key={`${roomConfig?.variant}-${roomConfig?.targetScore}-${roomConfig?.botDifficulty}-${resumedState ? 'resumed' : 'new'}`}
            initialVariant={roomConfig?.variant}
            initialDifficulty={roomConfig?.botDifficulty}
            onGoToLobby={() => setActiveView('lobby')}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
