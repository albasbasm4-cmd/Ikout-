/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Suit } from '../types/kout';
import { SuitSvg } from './Card';
import { strings } from '../i18n/ar';
import { Crown } from 'lucide-react';
import { playTrumpSound } from '../utils/audio';

export interface TrumpPickerProps {
  onSelectTrump: (suit: Suit) => void;
  currentTrump?: Suit | null;
  className?: string;
}

const SUIT_DATA: Array<{
  suit: Suit;
  name: string;
  arabicLabel: string;
  cardColor: string;
  bgColor: string;
  borderColor: string;
}> = [
  {
    suit: 'H',
    name: 'هاص ♥',
    arabicLabel: 'هاص',
    cardColor: 'text-rose-600',
    bgColor: 'from-rose-950/90 to-red-900/60',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
  },
  {
    suit: 'S',
    name: 'سبيت ♠',
    arabicLabel: 'سبيت',
    cardColor: 'text-neutral-100',
    bgColor: 'from-neutral-900 to-neutral-800',
    borderColor: 'border-amber-400/40 hover:border-amber-300',
  },
  {
    suit: 'D',
    name: 'ديمن ♦',
    arabicLabel: 'ديمن',
    cardColor: 'text-rose-600',
    bgColor: 'from-rose-950/90 to-red-900/60',
    borderColor: 'border-rose-500/50 hover:border-rose-400',
  },
  {
    suit: 'C',
    name: 'كلفس ♣',
    arabicLabel: 'كلفس',
    cardColor: 'text-neutral-100',
    bgColor: 'from-neutral-900 to-neutral-800',
    borderColor: 'border-amber-400/40 hover:border-amber-300',
  },
];

export const TrumpPicker: React.FC<TrumpPickerProps> = ({
  onSelectTrump,
  currentTrump,
  className = '',
}) => {
  const handleSelect = (suit: Suit) => {
    playTrumpSound();
    onSelectTrump(suit);
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full max-w-sm mx-auto bg-neutral-950/95 border-2 border-amber-500/50 rounded-3xl p-4 shadow-2xl backdrop-blur-xl select-none text-amber-50 animate-in slide-in-from-bottom duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-amber-500/30">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg">
          <Crown className="w-5 h-5 fill-current" />
        </div>
        <div>
          <h3 className="text-sm font-black text-amber-300">{strings.chooseTrumpTitle}</h3>
          <p className="text-[11px] text-amber-200/70 font-medium">حدد لون الحكم المناسب لأوراقك</p>
        </div>
      </div>

      {/* 4 Suits Grid */}
      <div className="grid grid-cols-2 gap-3">
        {SUIT_DATA.map(({ suit, name, bgColor, borderColor }) => {
          const isSelected = currentTrump === suit;

          return (
            <button
              key={suit}
              type="button"
              onClick={() => handleSelect(suit)}
              className={`p-3.5 rounded-2xl border ${borderColor} bg-gradient-to-br ${bgColor} flex flex-col items-center justify-center gap-2 transition-all duration-150 active:scale-95 cursor-pointer shadow-xl hover:-translate-y-1 ${
                isSelected
                  ? 'ring-4 ring-amber-400 ring-offset-2 ring-offset-neutral-950 brightness-110'
                  : ''
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg">
                <SuitSvg suit={suit} className="w-7 h-7" />
              </div>
              <span className="text-sm font-black text-white tracking-wide">
                {name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TrumpPicker;
