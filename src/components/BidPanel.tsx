/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bid } from '../types/kout';
import { strings } from '../i18n/ar';
import { Gavel, AlertCircle, ShieldAlert } from 'lucide-react';
import { playTapSound } from '../utils/audio';

export interface BidPanelProps {
  currentHighBid: Bid | null;
  isDealerForced?: boolean;
  maxBid?: number; // 9 for BO6, 8 for BO4
  onBid: (bid: Bid) => void;
  className?: string;
}

export const BidPanel: React.FC<BidPanelProps> = ({
  currentHighBid,
  isDealerForced = false,
  maxBid = 9,
  onBid,
  className = '',
}) => {
  const currentHigh = currentHighBid ?? 0;
  const bidOptions: Bid[] = [5, 6, 7, 8, 9].filter((b) => b <= maxBid) as Bid[];

  const ARABIC_DIGITS: Record<number, string> = {
    5: '٥',
    6: '٦',
    7: '٧',
    8: '٨',
    9: '٩',
  };

  const handleSelectBid = (bid: Bid) => {
    playTapSound();
    onBid(bid);
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full max-w-sm mx-auto bg-neutral-950/95 border-2 border-amber-500/50 rounded-3xl p-4 shadow-2xl backdrop-blur-xl select-none text-amber-50 animate-in slide-in-from-bottom duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-lg">
            <Gavel className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-300">{strings.biddingTitle}</h3>
            <p className="text-[11px] text-amber-200/70 font-medium">
              {currentHighBid ? `أعلى طلب حالي: ${currentHighBid}` : 'لا يوجد طلب بعد'}
            </p>
          </div>
        </div>

        {isDealerForced && (
          <div className="flex items-center gap-1.5 bg-rose-950/90 border border-rose-500/60 px-2.5 py-1 rounded-full text-[10px] text-rose-300 font-black animate-pulse shadow-md">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ملزوم!</span>
          </div>
        )}
      </div>

      {/* Forced Malzom Notice */}
      {isDealerForced && (
        <div className="mb-3 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/40 text-[11px] text-amber-200 font-bold text-center">
          {strings.forcedMalzom}
        </div>
      )}

      {/* Bid Buttons Grid (5 to 9) */}
      <div className="grid grid-cols-5 gap-2 mb-3">
        {bidOptions.map((bid) => {
          const isDisabled = bid <= currentHigh;

          return (
            <button
              key={bid}
              type="button"
              disabled={isDisabled}
              onClick={() => handleSelectBid(bid)}
              className={`h-14 rounded-2xl font-black flex flex-col items-center justify-center transition-all duration-150 active:scale-95 ${
                isDisabled
                  ? 'bg-neutral-900/60 text-neutral-600 border border-neutral-800/40 cursor-not-allowed opacity-35'
                  : 'bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-black border border-amber-200 shadow-[0_4px_12px_rgba(251,191,36,0.3)] hover:brightness-110 cursor-pointer hover:-translate-y-0.5'
              }`}
            >
              <span className="text-xl leading-tight font-black">
                {ARABIC_DIGITS[bid] || bid}
              </span>
              <span className="text-[9px] text-black/80 font-bold">
                {bid === 9 ? 'باطوف' : bid}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pass (طاف) Button */}
      <button
        type="button"
        disabled={isDealerForced}
        onClick={() => handleSelectBid(0)}
        className={`w-full py-2.5 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 transition-all duration-150 shadow-md ${
          isDealerForced
            ? 'bg-neutral-900/50 text-neutral-600 border border-neutral-800 cursor-not-allowed opacity-40'
            : 'bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 hover:from-neutral-700 hover:to-neutral-600 text-amber-100 border border-amber-500/40 active:scale-98 cursor-pointer'
        }`}
      >
        <span>طاف (Pass)</span>
      </button>
    </div>
  );
};

export default BidPanel;
