/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Card as CardType, Suit } from '../types/kout';

export interface CardProps {
  card: CardType;
  faceUp?: boolean;
  isLegal?: boolean;
  isSelected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const SUIT_COLORS: Record<Suit, { text: string; fill: string; name: string }> = {
  S: { text: 'text-neutral-900', fill: '#171717', name: 'سبيت' },
  H: { text: 'text-rose-600', fill: '#e11d48', name: 'هاص' },
  D: { text: 'text-rose-600', fill: '#e11d48', name: 'ديمن' },
  C: { text: 'text-neutral-900', fill: '#171717', name: 'كلفس' },
};

export function SuitSvg({ suit, className = 'w-4 h-4' }: { suit: Suit; className?: string }) {
  if (suit === 'H') {
    // Heart (هاص)
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#dc2626" aria-label="هاص">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    );
  }
  if (suit === 'D') {
    // Diamond (ديمن)
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#dc2626" aria-label="ديمن">
        <path d="M12 2L3 12l9 10 9-10L12 2z" />
      </svg>
    );
  }
  if (suit === 'C') {
    // Club (كلفس)
    return (
      <svg viewBox="0 0 24 24" className={className} fill="#18181b" aria-label="كلفس">
        <path d="M19.5 9.5c0-2-1.6-3.5-3.5-3.5-.4 0-.7.1-1 .2C14.7 4.5 13.5 3.5 12 3.5s-2.7 1-3 2.7c-.3-.1-.6-.2-1-.2-2 0-3.5 1.6-3.5 3.5 0 1.6 1 3 2.5 3.4-.2.5-.3 1.1-.3 1.6 0 1.4.7 2.6 1.8 3.3L7 21h10l-1.5-3.2c1.1-.7 1.8-1.9 1.8-3.3 0-.6-.1-1.1-.3-1.6 1.5-.4 2.5-1.8 2.5-3.4z" />
      </svg>
    );
  }
  // Spade (سبيت)
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#18181b" aria-label="سبيت">
      <path d="M12 2C8.5 6 4 9 4 13.5 4 16 6 18 8.5 18c1.3 0 2.5-.5 3.5-1.5V21h0l-2 1h4l-2-1v-4.5c1 1 2.2 1.5 3.5 1.5 2.5 0 4.5-2 4.5-4.5C20 9 15.5 6 12 2z" />
    </svg>
  );
}

export function JokerSvg({ isRed, className = 'w-8 h-8' }: { isRed: boolean; className?: string }) {
  const primaryColor = isRed ? '#dc2626' : '#18181b';
  const secondaryColor = isRed ? '#f59e0b' : '#94a3b8';

  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Jester Hat */}
      <path
        d="M32 12c-4 0-12 8-16 16 0 0 6-2 10 2 3-5 5-9 6-9s3 4 6 9c4-4 10-2 10-2-4-8-12-16-16-16z"
        fill={primaryColor}
      />
      {/* Bells */}
      <circle cx="15" cy="29" r="3.5" fill={secondaryColor} stroke="#fff" strokeWidth="0.5" />
      <circle cx="49" cy="29" r="3.5" fill={secondaryColor} stroke="#fff" strokeWidth="0.5" />
      <circle cx="32" cy="11" r="3.5" fill={secondaryColor} stroke="#fff" strokeWidth="0.5" />
      {/* Face */}
      <path
        d="M23 32c0 6 4 12 9 12s9-6 9-12H23z"
        fill="#fef3c7"
        stroke={primaryColor}
        strokeWidth="1.5"
      />
      {/* Eyes */}
      <circle cx="28" cy="35" r="1.5" fill={primaryColor} />
      <circle cx="36" cy="35" r="1.5" fill={primaryColor} />
      {/* Smile */}
      <path
        d="M27 38c1.5 2.5 4 3.5 5 3.5s3.5-1 5-3.5"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Jester Collar Points */}
      <path
        d="M20 46l6-4 6 4 6-4 6 4-3 5H23l-3-5z"
        fill={primaryColor}
      />
    </svg>
  );
}

// Royal Court Card Vector Art (King, Queen, Jack)
function CourtCardArt({ rank, suit }: { rank: number; suit: Suit }) {
  const isRed = suit === 'H' || suit === 'D';
  const color = isRed ? '#dc2626' : '#18181b';

  if (rank === 13) {
    // King (الشايب / K)
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-0.5">
        <svg viewBox="0 0 48 48" className="w-full h-full max-h-12" fill="none">
          {/* Crown */}
          <path d="M12 18l4 6 8-10 8 10 4-6v10H12V18z" fill="#f59e0b" stroke="#78350f" strokeWidth="1" />
          <circle cx="12" cy="18" r="1.5" fill="#ef4444" />
          <circle cx="24" cy="14" r="2" fill="#ef4444" />
          <circle cx="36" cy="18" r="1.5" fill="#ef4444" />
          {/* Face & Beard */}
          <path d="M16 28c0 5 3.5 10 8 10s8-5 8-10H16z" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
          <path d="M18 33c2 3 4 4 6 4s4-1 6-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="20" cy="30" r="1" fill="#18181b" />
          <circle cx="28" cy="30" r="1" fill="#18181b" />
          {/* Royal Beard */}
          <path d="M18 35c2 4 4 5 6 5s4-1 6-5" fill="#d97706" />
        </svg>
        <span className="text-[8px] font-black leading-none mt-0.5" style={{ color }}>
          الشايب
        </span>
      </div>
    );
  }

  if (rank === 12) {
    // Queen (البنت / Q)
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-0.5">
        <svg viewBox="0 0 48 48" className="w-full h-full max-h-12" fill="none">
          {/* Tiara */}
          <path d="M16 19l4 4 4-7 4 7 4-4v7H16V19z" fill="#fbbf24" stroke="#b45309" strokeWidth="1" />
          <circle cx="24" cy="16" r="1.5" fill="#ec4899" />
          {/* Hair & Face */}
          <path d="M15 26c0 6 3 11 9 11s9-5 9-11c0-4-3-6-9-6s-9 2-9 6z" fill="#fde68a" stroke="#b45309" strokeWidth="1" />
          <path d="M14 24c2 6 2 12 4 14" stroke="#d97706" strokeWidth="1.5" />
          <path d="M34 24c-2 6-2 12-4 14" stroke="#d97706" strokeWidth="1.5" />
          {/* Face details */}
          <circle cx="20" cy="28" r="1" fill="#18181b" />
          <circle cx="28" cy="28" r="1" fill="#18181b" />
          <path d="M22 33c1 1 3 1 4 0" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="text-[8px] font-black leading-none mt-0.5" style={{ color }}>
          البنت
        </span>
      </div>
    );
  }

  if (rank === 11) {
    // Jack (الولد / J)
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center p-0.5">
        <svg viewBox="0 0 48 48" className="w-full h-full max-h-12" fill="none">
          {/* Cap & Feather */}
          <path d="M14 22c4-3 14-4 20-1l-2-5c-7-2-12-1-18 6z" fill={color} />
          <path d="M30 14c3-4 7-6 10-6-2 4-3 8-4 10" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
          {/* Face */}
          <path d="M17 24c0 6 3.5 10 7 10s7-4 7-10H17z" fill="#fde68a" stroke="#78350f" strokeWidth="1" />
          <circle cx="21" cy="27" r="1" fill="#18181b" />
          <circle cx="27" cy="27" r="1" fill="#18181b" />
          <path d="M22 31c1 1 3 1 4 0" stroke="#b45309" strokeWidth="1" strokeLinecap="round" />
        </svg>
        <span className="text-[8px] font-black leading-none mt-0.5" style={{ color }}>
          الولد
        </span>
      </div>
    );
  }

  // Ace (الكه / A)
  if (rank === 14) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center">
        <SuitSvg suit={suit} className="w-8 h-8 drop-shadow-sm transition-transform duration-200" />
      </div>
    );
  }

  return null;
}

function getRankDisplay(rank?: number): string {
  if (!rank) return '';
  switch (rank) {
    case 14:
      return 'A';
    case 13:
      return 'K';
    case 12:
      return 'Q';
    case 11:
      return 'J';
    default:
      return String(rank);
  }
}

export const Card: React.FC<CardProps> = ({
  card,
  faceUp = true,
  isLegal = true,
  isSelected = false,
  size = 'md',
  onClick,
  className = '',
  style,
}) => {
  const isJoker = card.joker !== undefined;
  const isRedJoker = card.joker === 'RED';

  // Size configurations
  const sizeClasses = {
    sm: 'w-11 h-16 text-xs rounded-lg',
    md: 'w-16 h-24 text-sm rounded-xl',
    lg: 'w-20 h-30 text-base rounded-2xl',
  }[size];

  // Face down presentation (Authentic Kuwaiti / Arabesque playing card back)
  if (!faceUp) {
    return (
      <div
        onClick={onClick}
        style={style}
        className={`relative ${sizeClasses} select-none transition-all duration-200 cursor-pointer shadow-lg bg-gradient-to-br from-blue-950 via-indigo-950 to-blue-900 border-2 border-amber-400/80 p-1 flex items-center justify-center overflow-hidden ${className}`}
      >
        {/* Arabesque geometric lattice back */}
        <div className="w-full h-full rounded border border-amber-300/40 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:6px_6px] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-amber-400/60 flex items-center justify-center bg-black/40">
            <span className="text-[9px] font-black text-amber-300">كوت</span>
          </div>
        </div>
      </div>
    );
  }

  // Face Up: Jokers (الجيكر / الميكر)
  if (isJoker) {
    const bannerColor = isRedJoker
      ? 'from-rose-600 to-red-700 text-white'
      : 'from-neutral-900 to-neutral-800 text-amber-300';
    const borderColor = isRedJoker ? 'border-red-500' : 'border-neutral-700';

    return (
      <div
        onClick={onClick}
        style={style}
        className={`relative ${sizeClasses} select-none transition-all duration-200 cursor-pointer bg-gradient-to-b from-white via-amber-50/40 to-neutral-100 border-2 ${borderColor} shadow-md flex flex-col justify-between p-1 overflow-hidden ${
          !isLegal ? 'opacity-40 grayscale-40 cursor-not-allowed' : 'hover:-translate-y-1'
        } ${isSelected ? 'ring-3 ring-amber-400 -translate-y-2 shadow-2xl brightness-105' : ''} ${className}`}
      >
        {/* Top-Right Index */}
        <div className="flex flex-col items-center leading-none">
          <span className="text-[10px] font-black text-amber-600">★</span>
          <span className={`text-[8px] font-black ${isRedJoker ? 'text-red-600' : 'text-neutral-900'}`}>
            {isRedJoker ? 'جيكر' : 'ميكر'}
          </span>
        </div>

        {/* Center Illustration */}
        <div className="flex flex-col items-center justify-center my-auto">
          <JokerSvg isRed={isRedJoker} className={size === 'sm' ? 'w-6 h-6' : 'w-10 h-10'} />
          <div
            className={`mt-0.5 px-1 py-0.2 rounded text-[7px] font-black bg-gradient-to-r ${bannerColor} shadow-sm tracking-wider`}
          >
            {isRedJoker ? 'الجيكر' : 'الميكر'}
          </div>
        </div>

        {/* Bottom-Left Index */}
        <div className="flex flex-col items-center leading-none transform rotate-180">
          <span className="text-[10px] font-black text-amber-600">★</span>
          <span className={`text-[8px] font-black ${isRedJoker ? 'text-red-600' : 'text-neutral-900'}`}>
            {isRedJoker ? 'جيكر' : 'ميكر'}
          </span>
        </div>
      </div>
    );
  }

  // Standard Suit Card (2 to Ace)
  const suit = card.suit!;
  const rank = card.rank!;
  const isRed = suit === 'H' || suit === 'D';
  const rankColor = isRed ? 'text-rose-600' : 'text-neutral-900';
  const rankText = getRankDisplay(rank);
  const isCourt = rank >= 11;

  return (
    <div
      onClick={onClick}
      style={style}
      className={`relative ${sizeClasses} select-none transition-all duration-200 cursor-pointer bg-gradient-to-b from-white via-slate-50 to-neutral-100 border border-neutral-300 shadow-md flex flex-col justify-between p-1 overflow-hidden ${
        !isLegal ? 'opacity-40 grayscale-40 cursor-not-allowed' : 'hover:-translate-y-1'
      } ${isSelected ? 'ring-3 ring-amber-400 -translate-y-2.5 shadow-2xl brightness-105' : ''} ${className}`}
    >
      {/* Top-Right Index */}
      <div className="flex flex-col items-center leading-tight self-start">
        <span className={`font-black text-xs ${rankColor}`}>{rankText}</span>
        <SuitSvg suit={suit} className="w-3 h-3" />
      </div>

      {/* Center Zone */}
      <div className="flex-1 flex items-center justify-center">
        {isCourt ? (
          <CourtCardArt rank={rank} suit={suit} />
        ) : (
          <div className="flex flex-col items-center justify-center">
            <SuitSvg suit={suit} className={size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'} />
            {rank >= 7 && (
              <span className={`text-[9px] font-bold ${rankColor} opacity-70 mt-0.5`}>
                {rank}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom-Left Inverted Index */}
      <div className="flex flex-col items-center leading-tight self-end transform rotate-180">
        <span className={`font-black text-xs ${rankColor}`}>{rankText}</span>
        <SuitSvg suit={suit} className="w-3 h-3" />
      </div>
    </div>
  );
};

export default Card;
