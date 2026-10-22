/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useGame } from '../store/useGame';
import { Table } from './Table';
import { BidPanel } from './BidPanel';
import { TrumpPicker } from './TrumpPicker';
import { ScoreBoard } from './ScoreBoard';
import { TurnTimer } from './TurnTimer';
import { Card as CardType, Difficulty, Suit } from '../types/kout';
import { strings } from '../i18n/ar';
import { useSettings } from '../store/useSettings';
import { playWinSound, playLoseSound, playTrickWinSound, playTapSound } from '../utils/audio';
import {
  Trophy,
  RotateCcw,
  Sparkles,
  Settings,
  X,
  Volume2,
  VolumeX,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Play,
  Zap,
  BookOpen,
  Maximize,
  Minimize,
  Users,
} from 'lucide-react';
import { RulesModal } from './RulesModal';
import { RotatePrompt } from './RotatePrompt';

export interface GameScreenProps {
  initialDifficulty?: Difficulty;
  initialVariant?: 'BO6' | 'BO4';
  onGoToLobby?: () => void;
  className?: string;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  initialDifficulty = 'MEDIUM',
  initialVariant = 'BO6',
  onGoToLobby,
  className = '',
}) => {
  const {
    state,
    difficulty,
    setDifficulty,
    isHumanTurn,
    isBotThinking,
    legalCardsForHuman,
    displayedTrick,
    winningTrickPlay,
    trickWinnerAnnouncement,
    speechBubbles,
    sendSpeechBubble,
    humanPlayCard,
    humanBid,
    humanDeclareTrump,
    startNextRound,
    startNewGame,
    handleHumanTimeout,
  } = useGame({
    difficulty: initialDifficulty,
    variant: initialVariant,
    autoStart: true,
  });

  const { settings, toggleSound, setBotSpeed } = useSettings();
  const [showScoreboardModal, setShowScoreboardModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Monitor browser fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    playTapSound();
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        if (screen.orientation && 'lock' in screen.orientation) {
          (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  const isBO6 = state.variant === 'BO6';
  const numSeats = isBO6 ? 6 : 4;
  const isDealerForced =
    state.phase === 'BID' &&
    state.currentSeat === 0 &&
    state.dealer === 0 &&
    state.bids.length === numSeats - 1 &&
    state.bids.every((b) => b.bid === 0);

  // Winning team in GAME_END
  const targetScore = state.targetScore;
  const isTeam0Winner =
    state.scores[0] >= targetScore ||
    (state.roundNo === 1 && state.highBid === 9 && state.tricksWon[0] === 9);

  // Play audio on round end and game end
  useEffect(() => {
    if (state.phase === 'ROUND_END') {
      playTrickWinSound(settings.soundEnabled);
    } else if (state.phase === 'GAME_END') {
      if (isTeam0Winner) {
        playWinSound(settings.soundEnabled);
      } else {
        playLoseSound(settings.soundEnabled);
      }
    }
  }, [state.phase, isTeam0Winner, settings.soundEnabled]);

  // Integrated Top Controls for Table Header
  const headerControls = (
    <div className="flex items-center gap-1 sm:gap-1.5 pointer-events-auto">
      {/* Turn Timer when it's Human's Turn */}
      {isHumanTurn && (
        <div className="bg-black/85 p-0.5 rounded-full border border-amber-400/60 shadow-lg backdrop-blur-md flex items-center animate-pulse">
          <TurnTimer
            key={`${state.phase}-${state.currentSeat}-${state.version}`}
            durationSeconds={20}
            onTimeout={handleHumanTimeout}
            size={30}
          />
        </div>
      )}

      {/* Fullscreen Toggle Button */}
      <button
        type="button"
        onClick={handleToggleFullscreen}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
        aria-label={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
        title={isFullscreen ? 'تصغير الشاشة' : 'ملء الشاشة'}
      >
        {isFullscreen ? (
          <Minimize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
        ) : (
          <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
        )}
      </button>

      {/* Rules Modal Button */}
      <button
        type="button"
        onClick={() => {
          playTapSound();
          setShowRulesModal(true);
        }}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
        aria-label="قوانين اللعبة"
        title="قوانين اللعبة"
      >
        <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* Scoreboard Drawer */}
      <button
        type="button"
        onClick={() => {
          playTapSound();
          setShowScoreboardModal(true);
        }}
        className="px-2 sm:px-2.5 h-7 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 text-[10px] sm:text-xs font-black flex items-center gap-1 shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
        aria-label="النشرة"
        title="النشرة والتفاصيل"
      >
        <Trophy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-current" />
        <span className="hidden sm:inline">النشرة</span>
      </button>

      {/* Quick Mute Toggle */}
      <button
        type="button"
        onClick={() => {
          playTapSound();
          toggleSound();
        }}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
        aria-label="كتم/تشغيل الصوت"
        title="كتم/تشغيل الصوت"
      >
        {settings.soundEnabled ? (
          <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        ) : (
          <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
        )}
      </button>

      {/* Settings button */}
      <button
        type="button"
        onClick={() => {
          playTapSound();
          setShowSettingsModal(true);
        }}
        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
        aria-label="الإعدادات"
        title="الإعدادات"
      >
        <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      {/* Return to Lobby Button */}
      {onGoToLobby && (
        <button
          type="button"
          onClick={() => {
            playTapSound();
            onGoToLobby();
          }}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/75 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-lg backdrop-blur-md active:scale-95 cursor-pointer hover:bg-black/90 hover:border-amber-300"
          aria-label="غرفة اللعب"
          title="غرفة اللعب (Lobby)"
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300" />
        </button>
      )}
    </div>
  );

  return (
    <div
      dir="rtl"
      className={`w-screen h-[100dvh] bg-neutral-950 text-amber-50 select-none overflow-hidden ${className}`}
    >
      {/* Mobile Orientation Request Prompt */}
      <RotatePrompt />

      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Main Interactive Table Component with Integrated Header Controls */}
        <Table
          state={state}
          mySeat={0}
          onPlayCard={humanPlayCard}
          displayedTrick={displayedTrick}
          winningTrickPlay={winningTrickPlay}
          trickWinnerAnnouncement={trickWinnerAnnouncement}
          speechBubbles={speechBubbles}
          legalCardIds={legalCardsForHuman}
          onSendSpeechBubble={sendSpeechBubble}
          headerControls={headerControls}
          className="w-full h-full"
        />

        {/* Floating Bid Panel when in BID phase and it's human turn */}
        {state.phase === 'BID' && state.currentSeat === 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <BidPanel
              currentHighBid={state.highBid}
              isDealerForced={isDealerForced}
              maxBid={isBO6 ? 9 : 8}
              onBid={humanBid}
            />
          </div>
        )}

        {/* Floating Trump Picker when in TRUMP phase and human won the bid */}
        {state.phase === 'TRUMP' && state.bidderSeat === 0 && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <TrumpPicker
              currentTrump={state.trump}
              onSelectTrump={humanDeclareTrump}
            />
          </div>
        )}

        {/* Round End Modal */}
        {state.phase === 'ROUND_END' && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-neutral-950 border-2 border-amber-500/60 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black mb-2 shadow-xl">
                <Flame className="w-6 h-6 fill-current" />
              </div>

              <h2 className="text-base sm:text-lg font-black text-amber-300">
                نهاية الجولة {state.roundNo}
              </h2>
              <p className="text-xs text-amber-200/70 mt-0.5 font-medium">
                طلب {state.highBid} بواسطة{' '}
                <span className="font-bold text-white">
                  {state.bidderSeat === 0 ? 'أنت' : state.players?.[state.bidderSeat ?? 0]?.name || `لاعب ${(state.bidderSeat ?? 0) + 1}`}
                </span>
              </p>

              {/* Round Trick Counts */}
              <div className="w-full grid grid-cols-2 gap-2 my-3">
                <div className="bg-gradient-to-b from-emerald-950/90 to-emerald-900/60 border border-emerald-500/40 rounded-2xl p-2 sm:p-2.5">
                  <span className="text-[10px] text-emerald-300 block font-black">
                    أكلات فريقك (لنا)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                    {state.tricksWon[0]}
                  </span>
                  <span className="text-[10px] text-emerald-300/80 block mt-0.5 font-bold">
                    مجموع النقاط: {state.scores[0]}
                  </span>
                </div>

                <div className="bg-gradient-to-b from-rose-950/90 to-rose-900/60 border border-rose-500/40 rounded-2xl p-2 sm:p-2.5">
                  <span className="text-[10px] text-rose-300 block font-black">
                    أكلات الخصم (لهم)
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white tabular-nums">
                    {state.tricksWon[1]}
                  </span>
                  <span className="text-[10px] text-rose-300/80 block mt-0.5 font-bold">
                    مجموع النقاط: {state.scores[1]}
                  </span>
                </div>
              </div>

              {/* Next Round Button */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  startNextRound();
                }}
                className="w-full py-2.5 sm:py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs sm:text-sm border border-emerald-300/40 shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>الجولة التالية ({state.roundNo + 1})</span>
              </button>
            </div>
          </div>
        )}

        {/* Game End Modal */}
        {state.phase === 'GAME_END' && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-lg flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-neutral-950 border-2 border-amber-400 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl flex items-center justify-center mb-2.5 shadow-2xl ${
                  isTeam0Winner
                    ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black border-2 border-amber-200'
                    : 'bg-gradient-to-br from-rose-700 to-rose-900 text-white border-2 border-rose-400'
                }`}
              >
                <Trophy className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-amber-300">
                {isTeam0Winner ? 'كفو يا ذيب! مبروك الفوز 🏆' : 'حظ أوفر للجولة القادمة!'}
              </h2>
              <p className="text-xs text-amber-200/80 mt-1 font-medium">
                {isTeam0Winner
                  ? 'فاز فريقك بالمباراة وبلغ الهدف بنجاح!'
                  : 'فاز الفريق الخصم بهذه المباراة.'}
              </p>

              {/* Final Scores */}
              <div className="w-full bg-black/60 border border-amber-400/30 rounded-2xl p-3 my-3 flex items-center justify-around">
                <div className="text-center">
                  <span className="text-[11px] text-emerald-300 block font-bold">لنا (فريقك)</span>
                  <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{state.scores[0]}</span>
                </div>
                <span className="text-xl font-black text-amber-400/60">:</span>
                <div className="text-center">
                  <span className="text-[11px] text-rose-300 block font-bold">لهم (الخصم)</span>
                  <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{state.scores[1]}</span>
                </div>
              </div>

              {/* New Game Button */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  startNewGame();
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-xs sm:text-sm shadow-xl active:scale-98 cursor-pointer flex items-center justify-center gap-2 border border-amber-200"
              >
                <RotateCcw className="w-4 h-4" />
                <span>لعبة جديدة</span>
              </button>
            </div>
          </div>
        )}

        {/* Scoreboard Drawer Modal */}
        {showScoreboardModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto relative">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setShowScoreboardModal(false);
                }}
                className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-neutral-800 text-white border border-neutral-600 flex items-center justify-center shadow-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <ScoreBoard
                scores={state.scores}
                targetScore={state.targetScore}
                roundNo={state.roundNo}
                currentBid={state.highBid}
                bidderSeat={state.bidderSeat}
                tricksWon={state.tricksWon}
              />
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-neutral-950 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl relative text-amber-50">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setShowSettingsModal(false);
                }}
                className="absolute top-4 left-4 w-7 h-7 rounded-full bg-neutral-800 text-white border border-neutral-700 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <h3 className="text-sm font-black text-amber-300 mb-4 pb-2 border-b border-amber-500/25">
                إعدادات اللعبة
              </h3>

              {/* Difficulty Selector */}
              <div className="mb-4">
                <label className="text-xs text-amber-200/80 block mb-1.5 font-bold">
                  مستوى ذكاء البوتات (AI):
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['EASY', 'MEDIUM', 'EXPERT'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setDifficulty(d);
                      }}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        difficulty === d
                          ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {d === 'EASY' ? 'سهل' : d === 'MEDIUM' ? 'متوسط' : 'خبير'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Speed Selector */}
              <div className="mb-4">
                <label className="text-xs text-amber-200/80 block mb-1.5 font-bold">
                  سرعة اللعب:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'SLOW', label: 'هادئ' },
                    { id: 'NORMAL', label: 'عادي' },
                    { id: 'FAST', label: 'سريع' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setBotSpeed(s.id as any);
                      }}
                      className={`py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        settings.botSpeed === s.id
                          ? 'bg-amber-400 text-black border-amber-300 shadow-md'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between py-2.5 border-t border-neutral-800">
                <span className="text-xs text-amber-200/80 font-bold">المؤثرات الصوتية</span>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    toggleSound();
                  }}
                  className="p-2 rounded-xl bg-neutral-900 text-amber-300 border border-neutral-700 cursor-pointer"
                >
                  {settings.soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-neutral-500" />
                  )}
                </button>
              </div>

              {/* Restart Game Option */}
              <div className="mt-4 pt-3 border-t border-neutral-800 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    startNewGame('BO6');
                    setShowSettingsModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-black text-amber-200 border border-amber-400/40 cursor-pointer"
                >
                  إعادة تشغيل (كوت بوستة - ٦ لاعبين)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    startNewGame('BO4');
                    setShowSettingsModal(false);
                  }}
                  className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-xs font-black text-amber-200 border border-amber-400/40 cursor-pointer"
                >
                  إعادة تشغيل (كوت بوأربعة - ٤ لاعبين)
                </button>
                {onGoToLobby && (
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setShowSettingsModal(false);
                      onGoToLobby();
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-xs font-black text-amber-300 border border-amber-400/50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-4 h-4" />
                    <span>الذهاب إلى غرفة اللعب (Lobby)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rules & Guide Modal */}
        <RulesModal
          isOpen={showRulesModal}
          onClose={() => setShowRulesModal(false)}
        />

      </div>
    </div>
  );
};

export default GameScreen;
