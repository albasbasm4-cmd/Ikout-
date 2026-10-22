/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameState, Card as CardType, Suit, TrickPlay } from '../types/kout';
import { Card, SuitSvg } from './Card';
import { Hand } from './Hand';
import { Crown, Sparkles, Trophy, MessageSquare, X } from 'lucide-react';
import { playBubbleSound, playTapSound } from '../utils/audio';

// Authentic Kuwaiti Character Avatar Portraits
import avatarGhutra from '../assets/images/ikout_character_ghutra_1792677825367.jpg';
import avatarSunglasses from '../assets/images/ikout_character_sunglasses_1792677825921.jpg';
import avatarElder from '../assets/images/ikout_character_elder_1792677825970.jpg';

export interface TableProps {
  state?: GameState;
  mySeat?: number;
  onPlayCard?: (card: CardType) => void;
  onBid?: (bid: number) => void;
  onDeclareTrump?: (suit: Suit) => void;
  displayedTrick?: TrickPlay[];
  winningTrickPlay?: TrickPlay | null;
  trickWinnerAnnouncement?: string | null;
  speechBubbles?: Record<number, string>;
  legalCardIds?: Set<string>;
  onSendSpeechBubble?: (message: string) => void;
  headerControls?: React.ReactNode;
  className?: string;
}

// Diwaniya Team Themes: "لنا" (Us - Green/Emerald) vs "لهم" (Them - Red/Ruby)
const TEAM_THEMES = {
  0: {
    bg: 'bg-emerald-950/95',
    border: 'border-emerald-400/80',
    ring: 'ring-emerald-400',
    text: 'text-emerald-300',
    badge: 'bg-emerald-700/80 text-emerald-100 border-emerald-400',
    name: 'لنا (فريقك)',
    shortName: 'لنا',
    color: '#10b981',
  },
  1: {
    bg: 'bg-rose-950/95',
    border: 'border-rose-400/80',
    ring: 'ring-rose-400',
    text: 'text-rose-300',
    badge: 'bg-rose-700/80 text-rose-100 border-rose-400',
    name: 'لهم (الخصم)',
    shortName: 'لهم',
    color: '#f43f5e',
  },
};

const SUIT_ARABIC_NAMES: Record<Suit, string> = {
  S: 'سبيت ♠',
  H: 'هاص ♥',
  D: 'ديمن ♦',
  C: 'كلفس ♣',
};

// Seat characters inspired by iconic Diwaniya Labs iKout trailer
const DIWANIYA_AVATARS: Record<
  number,
  { name: string; title: string; image: string; emoji: string }
> = {
  0: { name: 'أنت', title: 'فريقك', image: avatarGhutra, emoji: '😎' },
  1: { name: 'سالم', title: 'الخصم', image: avatarSunglasses, emoji: '🧔🏻' },
  2: { name: 'جراح', title: 'شريكك', image: avatarElder, emoji: '👳🏽' },
  3: { name: 'فهد', title: 'الخصم', image: avatarSunglasses, emoji: '🕶️' },
  4: { name: 'مبارك', title: 'شريكك', image: avatarElder, emoji: '👴🏼' },
  5: { name: 'طلال', title: 'الخصم', image: avatarGhutra, emoji: '👨🏻' },
};

// Authentic Kuwaiti Diwaniya Expressions
export const KUWAITI_PHRASES = [
  'كفو عليك يا شريكي! 👏',
  'العب يا معوّد! ⏳',
  'وين الأكة؟! ♠',
  'الشايب نزل! 👑',
  'يا ساتر! 😱',
  'كوت بوستة! 💥',
  'طاف يا رجال 😴',
  'استكانة شاي ☕',
];

export const MOCK_TABLE_STATE: GameState = {
  variant: 'BO6',
  hands: [
    [
      { id: 'JOKER-RED', joker: 'RED' },
      { id: 'H-14', suit: 'H', rank: 14 },
      { id: 'H-13', suit: 'H', rank: 13 },
      { id: 'S-14', suit: 'S', rank: 14 },
      { id: 'D-10', suit: 'D', rank: 10 },
      { id: 'C-7', suit: 'C', rank: 7 },
    ],
    [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }, { id: 'c4' }, { id: 'c5' }],
    [{ id: 'c6' }, { id: 'c7' }, { id: 'c8' }, { id: 'c9' }, { id: 'c10' }],
    [{ id: 'c11' }, { id: 'c12' }, { id: 'c13' }, { id: 'c14' }, { id: 'c15' }],
    [{ id: 'c16' }, { id: 'c17' }, { id: 'c18' }, { id: 'c19' }, { id: 'c20' }],
    [{ id: 'c21' }, { id: 'c22' }, { id: 'c23' }, { id: 'c24' }, { id: 'c25' }],
  ],
  dealer: 3,
  currentSeat: 0,
  bids: [
    { seat: 4, bid: 0 },
    { seat: 5, bid: 0 },
    { seat: 0, bid: 6 },
    { seat: 1, bid: 0 },
    { seat: 2, bid: 0 },
    { seat: 3, bid: 0 },
  ],
  highBid: 6,
  bidderSeat: 0,
  trump: 'H',
  currentTrick: [
    { seat: 1, card: { id: 'H-8', suit: 'H', rank: 8 } },
    { seat: 2, card: { id: 'H-12', suit: 'H', rank: 12 } },
  ],
  trickHistory: Array.from({ length: 3 }, () => []),
  tricksWon: [2, 1],
  scores: [24, 18],
  phase: 'PLAY',
  roundNo: 2,
  targetScore: 51,
  version: 42,
  players: [
    { seatIndex: 0, kind: 'HUMAN_LOCAL', name: 'أنت', team: 0, connected: true },
    { seatIndex: 1, kind: 'AI_BOT', name: 'سالم', team: 1, connected: true },
    { seatIndex: 2, kind: 'AI_BOT', name: 'جراح (شريكك)', team: 0, connected: true },
    { seatIndex: 3, kind: 'AI_BOT', name: 'فهد', team: 1, connected: true },
    { seatIndex: 4, kind: 'AI_BOT', name: 'مبارك (شريكك)', team: 0, connected: true },
    { seatIndex: 5, kind: 'AI_BOT', name: 'طلال', team: 1, connected: true },
  ],
};

export const Table: React.FC<TableProps> = ({
  state: propState,
  mySeat = 0,
  onPlayCard,
  displayedTrick: propDisplayedTrick,
  winningTrickPlay,
  trickWinnerAnnouncement,
  speechBubbles = {},
  legalCardIds,
  onSendSpeechBubble,
  headerControls,
  className = '',
}) => {
  const isDemo =
    !propState ||
    (typeof window !== 'undefined' &&
      (window.location.hash.includes('demo') ||
        window.location.pathname.includes('demo') ||
        window.location.search.includes('demo')));

  const [demoState, setDemoState] = useState<GameState>(propState || MOCK_TABLE_STATE);
  const [showChatTray, setShowChatTray] = useState<boolean>(false);
  const [localBubbles, setLocalBubbles] = useState<Record<number, string>>({});
  const [imageErrorMap, setImageErrorMap] = useState<Record<number, boolean>>({});

  const state = propState || demoState;
  const currentTrickCards = propDisplayedTrick ?? state.currentTrick;
  const isBO6 = state.variant === 'BO6';
  const seatsCount = isBO6 ? 6 : 4;
  const currentSeat = state.currentSeat;
  const isMyTurn = currentSeat === mySeat;

  // Active bubbles combines props and local
  const activeBubbles = { ...localBubbles, ...speechBubbles };

  const handlePlayCard = (card: CardType) => {
    if (onPlayCard) {
      onPlayCard(card);
    } else if (isDemo) {
      setDemoState((prev) => ({
        ...prev,
        hands: prev.hands.map((h, i) =>
          i === mySeat ? h.filter((c) => c.id !== card.id) : h
        ),
        currentTrick: [...prev.currentTrick, { seat: mySeat, card }],
        currentSeat: (prev.currentSeat + 1) % seatsCount,
      }));
    }
  };

  const handleSendTaunt = (phrase: string) => {
    playBubbleSound();
    if (onSendSpeechBubble) {
      onSendSpeechBubble(phrase);
    } else {
      setLocalBubbles((prev) => ({ ...prev, [mySeat]: phrase }));
      setTimeout(() => {
        setLocalBubbles((prev) => {
          const next = { ...prev };
          delete next[mySeat];
          return next;
        });
      }, 2500);
    }
    setShowChatTray(false);
  };

  // Landscape-optimized seat coordinates relative to local player at bottom center (seat 0)
  const getSeatCoords = (seatIdx: number) => {
    const relIdx = (seatIdx - mySeat + seatsCount) % seatsCount;

    if (seatsCount === 4) {
      switch (relIdx) {
        case 0:
          return 'bottom-1 left-1/2 -translate-x-1/2'; // Me (bottom center)
        case 1:
          return 'right-3 sm:right-6 md:right-10 top-1/2 -translate-y-1/2'; // Salem (right)
        case 2:
          return 'top-1 sm:top-2 left-1/2 -translate-x-1/2'; // Partner (top center)
        case 3:
          return 'left-3 sm:left-6 md:left-10 top-1/2 -translate-y-1/2'; // Opponent (left)
      }
    }

    // 6 Seats horizontally arranged around wide Diwaniya oval table:
    switch (relIdx) {
      case 0:
        return 'bottom-1 left-1/2 -translate-x-1/2'; // Me (bottom center)
      case 1:
        return 'bottom-16 sm:bottom-20 md:bottom-24 right-2 sm:right-6 md:right-10'; // Salem (lower right)
      case 2:
        return 'top-10 sm:top-12 md:top-14 right-2 sm:right-6 md:right-10'; // Jarrah (upper right - partner)
      case 3:
        return 'top-1 sm:top-2 left-1/2 -translate-x-1/2'; // Fahad (top center)
      case 4:
        return 'top-10 sm:top-12 md:top-14 left-2 sm:left-6 md:left-10'; // Mubarak (upper left - partner)
      case 5:
        return 'bottom-16 sm:bottom-20 md:bottom-24 left-2 sm:left-6 md:left-10'; // Talal (lower left)
      default:
        return 'bottom-0 left-0';
    }
  };

  // Center trick card displacement towards throwing seat in landscape geometry
  const getCenterTrickTransform = (playSeat: number) => {
    const relIdx = (playSeat - mySeat + seatsCount) % seatsCount;

    if (seatsCount === 4) {
      switch (relIdx) {
        case 0:
          return 'translateY(24px) rotate(0deg)';
        case 1:
          return 'translateX(34px) rotate(-15deg)';
        case 2:
          return 'translateY(-24px) rotate(180deg)';
        case 3:
          return 'translateX(-34px) rotate(15deg)';
      }
    }

    switch (relIdx) {
      case 0:
        return 'translateY(24px) rotate(0deg)';
      case 1:
        return 'translate(34px, 14px) rotate(-18deg)';
      case 2:
        return 'translate(34px, -14px) rotate(-35deg)';
      case 3:
        return 'translateY(-24px) rotate(180deg)';
      case 4:
        return 'translate(-34px, -14px) rotate(35deg)';
      case 5:
        return 'translate(-34px, 14px) rotate(18deg)';
      default:
        return 'translate(0px, 0px)';
    }
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full h-[100dvh] overflow-hidden flex flex-col wood-rail select-none ${className}`}
    >
      {/* Top Header: Kuwaiti Diwaniya Score Plaque (النشرة) & Controls */}
      <header className="relative z-20 px-safe pt-safe px-3.5 py-1.5 sm:py-2 flex items-center justify-between border-b border-amber-500/30 bg-gradient-to-b from-black/95 via-neutral-950/90 to-transparent backdrop-blur-md">
        {/* Right side in RTL: Logo & Variant */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 border border-amber-300/80 flex items-center justify-center shadow-md">
            <Trophy className="w-4 h-4 text-neutral-950 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-amber-300 tracking-wide">آي كوت</span>
              <span className="text-[10px] font-black text-amber-100 px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-400/50">
                {isBO6 ? 'بوستة' : 'بوأربعة'}
              </span>
            </div>
            <div className="text-[11px] text-amber-200/70 font-semibold">
              الهدف: <span className="text-white font-bold">{state.targetScore}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Scoreboard (لنا vs لهم) */}
        <div className="flex items-center gap-2 sm:gap-3 bg-gradient-to-r from-emerald-950/95 via-neutral-900/90 to-rose-950/95 px-3 py-1 rounded-2xl border border-amber-400/50 shadow-xl">
          {/* Team 0 (لنا) */}
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
            <div className="text-right leading-none">
              <span className="text-[9px] block text-emerald-300 font-black">لنا</span>
              <span className="text-sm sm:text-base font-black text-white tabular-nums">{state.scores[0]}</span>
            </div>
          </div>

          <span className="text-xs text-amber-400 font-black px-0.5">:</span>

          {/* Team 1 (لهم) */}
          <div className="flex items-center gap-1.5">
            <div className="text-left leading-none">
              <span className="text-[9px] block text-rose-300 font-black">لهم</span>
              <span className="text-sm sm:text-base font-black text-white tabular-nums">{state.scores[1]}</span>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_8px_#f43f5e]" />
          </div>

          {/* Round & Tricks summary pill */}
          <div className="hidden sm:flex items-center gap-1.5 border-r border-amber-400/40 pr-2 mr-0.5 text-[11px] text-amber-300 font-bold">
            <span>جولة {state.roundNo}</span>
            <span className="text-white font-black">({state.tricksWon[0]}/{state.highBid ?? 5})</span>
          </div>
        </div>

        {/* Left side: Header Controls (Settings, Sound, Rules, Scoreboard, Fullscreen) */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {headerControls ? (
            headerControls
          ) : (
            <div className="text-left leading-tight">
              <div className="text-xs text-amber-200 font-bold">جولة {state.roundNo}</div>
              <div className="text-[11px] text-amber-300 font-extrabold mt-0.5">
                الأكلات: <span className="text-white font-black">{state.tricksWon[0]}</span>
                <span className="text-amber-200/60 font-normal">/{state.highBid ?? 5}</span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Oval Table Felt Arena */}
      <section
        aria-label="طاولة كوت بوستة"
        className="relative flex-1 table-felt overflow-hidden flex flex-col justify-between"
      >
        {/* Intricate Gold Arabesque Filigree Border */}
        <div
          aria-hidden="true"
          className="absolute inset-2 sm:inset-3 rounded-[50px] sm:rounded-[70px] border-2 border-amber-500/20 pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-3.5 sm:inset-5 rounded-[44px] sm:rounded-[62px] border border-dashed border-amber-400/15 pointer-events-none"
        />

        {/* Subtle Watermark Suits and Central Diwaniya Seal */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-[0.05] select-none"
        >
          <div className="w-64 h-36 sm:w-80 sm:h-44 rounded-[80px] border-2 border-amber-400 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl text-amber-300 font-serif font-black">iKout</span>
            <span className="text-sm sm:text-base text-amber-200 font-extrabold mt-1">كوت بوستة</span>
          </div>
        </div>

        {/* Central Playfield & Trick Arena */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-64 h-40 sm:w-80 sm:h-48 md:w-96 md:h-52 rounded-[70px] sm:rounded-[90px] border border-amber-500/40 bg-[radial-gradient(ellipse,_#0f583e_0%,_#093725_65%,_#041d13_100%)] shadow-2xl flex items-center justify-center">
            
            {/* Trump (الحكم / الأمر) & High Bid Plaque */}
            <div className="absolute top-2.5 flex items-center gap-2 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 px-3.5 py-1 rounded-full border border-amber-400/60 shadow-[0_4px_16px_rgba(0,0,0,0.8)] pointer-events-auto">
              {state.trump && (
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-300">
                  <span className="text-[10px] text-amber-200/70 font-bold">الحكم:</span>
                  <SuitSvg suit={state.trump} className="w-4 h-4" />
                  <span className="text-amber-200 font-extrabold">{SUIT_ARABIC_NAMES[state.trump]}</span>
                </div>
              )}
              {state.highBid && (
                <div className="text-[11px] font-black text-emerald-300 border-r border-amber-400/40 pr-2 mr-0.5">
                  طلب {state.highBid}
                </div>
              )}
            </div>

            {/* Trick Winner Announcement Floating Banner */}
            {trickWinnerAnnouncement && (
              <div className="absolute -top-8 z-40 animate-in zoom-in-95 duration-200 pointer-events-auto">
                <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 text-black px-4 py-1.5 rounded-full font-black text-xs shadow-[0_0_24px_rgba(251,191,36,0.9)] border border-amber-100 flex items-center gap-1.5 animate-bounce">
                  <Crown className="w-3.5 h-3.5 fill-current" />
                  <span>{trickWinnerAnnouncement}</span>
                </div>
              </div>
            )}

            {/* Central Trick Cards Area */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              {currentTrickCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-3">
                  <div className="w-11 h-11 rounded-full border border-amber-400/40 bg-emerald-900/60 flex items-center justify-center mb-1 text-amber-300 shadow-inner">
                    <Sparkles className="w-5 h-5 fill-current opacity-80" />
                  </div>
                  <span className="text-xs text-amber-200 font-bold">ساحة الأكْلة</span>
                  <span className="text-[10px] text-emerald-300/80 font-medium mt-0.5">
                    {isMyTurn ? 'دورك! اضغط ورقة للعب' : `دور ${state.players?.[currentSeat]?.name || `لاعب ${currentSeat + 1}`}`}
                  </span>
                </div>
              ) : (
                <div className="relative w-full h-full flex items-center justify-center">
                  {currentTrickCards.map((play, idx) => {
                    const playSeat = play.seat;
                    const team = playSeat % 2;
                    const isWinningCard =
                      winningTrickPlay?.card.id === play.card.id;
                    const transformStyle = getCenterTrickTransform(playSeat);

                    return (
                      <div
                        key={play.card.id}
                        style={{
                          transform: transformStyle,
                          zIndex: isWinningCard ? 35 : idx + 10,
                        }}
                        className={`absolute animate-card-throw pointer-events-auto flex flex-col items-center ${
                          isWinningCard
                            ? 'scale-110 drop-shadow-[0_0_25px_rgba(251,191,36,0.95)]'
                            : 'shadow-2xl'
                        }`}
                      >
                        <div
                          className={`relative rounded-lg ${
                            isWinningCard
                              ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-emerald-950'
                              : ''
                          }`}
                        >
                          <Card card={play.card} size="sm" />
                          {isWinningCard && (
                            <div className="absolute -top-3 -right-3 bg-amber-400 text-black p-0.5 rounded-full shadow-lg border border-amber-100 animate-pulse">
                              <Crown className="w-3.5 h-3.5 fill-current" />
                            </div>
                          )}
                        </div>

                        <span
                          className={`text-[8px] font-black px-1.5 py-0.2 rounded-full mt-0.5 shadow-md ${
                            team === 0
                              ? 'bg-emerald-900 text-emerald-200 border border-emerald-400/60'
                              : 'bg-rose-900 text-rose-200 border border-rose-400/60'
                          }`}
                        >
                          {state.players?.[playSeat]?.name || `لاعب ${playSeat + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Other Players Seats Around Table */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: seatsCount }).map((_, seatIdx) => {
            if (seatIdx === mySeat) return null;

            const isTurn = seatIdx === currentSeat;
            const team = (seatIdx % 2) as 0 | 1;
            const theme = TEAM_THEMES[team];
            const isDealer = seatIdx === state.dealer;
            const isBidder = seatIdx === state.bidderSeat;
            const cardsInHand = state.hands[seatIdx]?.length ?? 0;
            const playerName =
              state.players?.[seatIdx]?.name || `لاعب ${seatIdx + 1}`;
            const posClass = getSeatCoords(seatIdx);
            const speechBubble = activeBubbles[seatIdx];
            const avatarInfo = DIWANIYA_AVATARS[seatIdx] || {
              emoji: '👤',
              image: avatarGhutra,
            };
            const hasImgError = imageErrorMap[seatIdx];

            return (
              <div
                key={seatIdx}
                className={`absolute ${posClass} pointer-events-auto transition-all duration-300 z-10 flex flex-col items-center`}
              >
                {/* Dynamic Speech Bubble */}
                {speechBubble && (
                  <div className="mb-1.5 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 text-neutral-950 font-black text-[10px] px-2.5 py-1 rounded-2xl shadow-xl border border-amber-100 animate-in zoom-in-95 duration-150 relative">
                    <span>{speechBubble}</span>
                    <div className="w-2 h-2 bg-amber-300 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                )}

                {/* Circular Diwaniya Seat Avatar */}
                <div
                  className={`relative p-1.5 rounded-2xl flex items-center gap-2 border shadow-2xl backdrop-blur-md transition-all duration-300 ${
                    theme.bg
                  } ${theme.border} ${
                    isTurn
                      ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-emerald-950 scale-105 animate-turn-pulse'
                      : 'opacity-95'
                  }`}
                >
                  {/* High Quality Illustrated Kuwaiti Avatar */}
                  <div
                    className={`w-10 h-10 rounded-full overflow-hidden border-2 shadow-inner bg-gradient-to-br flex items-center justify-center shrink-0 ${
                      team === 0
                        ? 'border-emerald-400 from-emerald-800 to-teal-950'
                        : 'border-rose-400 from-rose-800 to-red-950'
                    }`}
                  >
                    {!hasImgError && avatarInfo.image ? (
                      <img
                        src={avatarInfo.image}
                        alt={playerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setImageErrorMap((prev) => ({ ...prev, [seatIdx]: true }))
                        }
                      />
                    ) : (
                      <span className="text-base select-none">{avatarInfo.emoji}</span>
                    )}
                  </div>

                  {/* Player Info */}
                  <div className="flex flex-col text-right leading-tight min-w-[58px]">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-black text-white truncate max-w-[70px]">
                        {playerName}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-amber-200/80 mt-0.5">
                      <span className="font-extrabold">{theme.shortName}</span>
                      <span className="font-bold text-amber-300 flex items-center gap-0.5">
                        <span className="text-[9px]">🂠</span>
                        <span>{cardsInHand}</span>
                      </span>
                    </div>
                  </div>

                  {/* Dealer Token Button */}
                  {isDealer && (
                    <div
                      title="الموزع (Dealer)"
                      className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-100 text-black font-black text-[9px] flex items-center justify-center shadow-md"
                    >
                      D
                    </div>
                  )}

                  {/* High Bidder Crown */}
                  {isBidder && (
                    <div
                      title="صاحب الأمر"
                      className="absolute -top-3 -left-1.5 bg-gradient-to-r from-amber-400 to-amber-500 text-black p-1 rounded-full shadow-lg border border-amber-100 animate-bounce"
                    >
                      <Crown className="w-3.5 h-3.5 fill-current" />
                    </div>
                  )}
                </div>

                {/* Thinking Pulse Badge */}
                {isTurn && (
                  <span className="mt-1 text-[9px] font-black bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-black px-2 py-0.5 rounded-full shadow-md animate-pulse">
                    يفكّر...
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Area: Local Human Player Hand (Center), Avatar Plaque (Right), Taunts & Turn Prompt (Left) */}
        <div className="relative z-30 w-full mt-auto pb-safe">
          
          {/* Human Speech Bubble */}
          {activeBubbles[mySeat] && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 text-neutral-950 font-black text-xs px-3.5 py-1 rounded-2xl shadow-xl border border-amber-100 animate-in zoom-in-95 duration-150">
              <span>{activeBubbles[mySeat]}</span>
              <div className="w-2 h-2 bg-amber-300 transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
            </div>
          )}

          {/* Interactive Kuwaiti Taunts & Reactions Drawer (Floats bottom-left above chat button) */}
          {showChatTray && (
            <div className="absolute bottom-16 left-3 sm:left-6 md:left-8 z-50 w-72 max-w-[calc(100vw-2rem)] animate-in slide-in-from-bottom duration-200 pointer-events-auto">
              <div className="bg-neutral-950/95 border-2 border-amber-400/80 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-amber-500/20 text-[11px] text-amber-300 font-bold">
                  <span>قطّات وتعليقات الديوانية:</span>
                  <button
                    type="button"
                    onClick={() => setShowChatTray(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {KUWAITI_PHRASES.map((phrase) => (
                    <button
                      key={phrase}
                      type="button"
                      onClick={() => handleSendTaunt(phrase)}
                      className="py-1.5 px-2 rounded-xl bg-neutral-900 hover:bg-amber-500/20 text-right text-xs font-bold text-amber-100 border border-neutral-700/60 hover:border-amber-400/60 transition-colors active:scale-95 cursor-pointer truncate"
                    >
                      {phrase}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bottom Controls Flank: Right (Avatar) and Left (Taunts & Prompt) */}
          <div className="absolute bottom-1.5 inset-x-2 sm:inset-x-6 md:inset-x-8 flex items-end justify-between pointer-events-none z-30">
            {/* Left Flank: Quick Chat Taunt Button & Turn Prompt */}
            <div className="flex flex-col items-start gap-1.5 pointer-events-auto">
              {/* Turn Prompt */}
              {isMyTurn ? (
                <div className="bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-black font-black text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1 rounded-full shadow-xl animate-pulse flex items-center gap-1.5 border border-amber-100">
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden xs:inline sm:inline">دورك! اضغط ورقة للعب</span>
                  <span className="inline xs:hidden sm:hidden">دورك!</span>
                </div>
              ) : (
                <div className="bg-black/80 text-amber-200/90 font-bold text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 rounded-full border border-amber-400/40 backdrop-blur-md shadow-md">
                  دور {state.players?.[currentSeat]?.name || `لاعب ${currentSeat + 1}`}
                </div>
              )}

              {/* Chat Button */}
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setShowChatTray((prev) => !prev);
                }}
                className="px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-neutral-900 to-neutral-950 border border-amber-400/60 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer hover:border-amber-300"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>قطّات الديوانية</span>
              </button>
            </div>

            {/* Right Flank: Local Human Player Avatar Plaque */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-2xl border backdrop-blur-md shadow-xl pointer-events-auto ${
                TEAM_THEMES[0].bg
              } ${TEAM_THEMES[0].border} ${
                isMyTurn
                  ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-emerald-950'
                  : ''
              }`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden border-2 border-emerald-400 shadow-inner shrink-0 bg-emerald-900">
                {!imageErrorMap[0] ? (
                  <img
                    src={avatarGhutra}
                    alt="أنت"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() =>
                      setImageErrorMap((prev) => ({ ...prev, [0]: true }))
                    }
                  />
                ) : (
                  <span className="text-base">😎</span>
                )}
              </div>
              <div className="flex flex-col text-right leading-tight">
                <div className="flex items-center gap-1 text-[11px] sm:text-xs font-black text-white">
                  <span>أنت</span>
                  {state.dealer === mySeat && (
                    <span className="text-[8px] font-black bg-amber-400 text-black px-1 rounded-full shadow-sm">
                      D
                    </span>
                  )}
                  {state.bidderSeat === mySeat && (
                    <span className="text-[9px] text-amber-300 font-extrabold">
                      (الأمر)
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] text-emerald-300 font-extrabold">
                  {TEAM_THEMES[0].shortName} (فريقك)
                </span>
              </div>
            </div>
          </div>

          {/* Fanned Hand of Cards (Centered at Bottom) */}
          <div className="relative z-20 flex justify-center w-full overflow-visible pointer-events-auto">
            <Hand
              cards={state.hands[mySeat] || []}
              trump={state.trump}
              legalCardIds={legalCardIds}
              isMyTurn={isMyTurn}
              onPlayCard={handlePlayCard}
              cardSize="md"
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Table;
