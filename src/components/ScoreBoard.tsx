/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Bid } from '../types/kout';
import { Trophy, Target, Award, FileText } from 'lucide-react';

export interface ScoreBoardProps {
  scores: [number, number];
  targetScore: number;
  roundNo: number;
  currentBid: Bid | null;
  bidderSeat?: number | null;
  tricksWon?: [number, number];
  className?: string;
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scores,
  targetScore,
  roundNo,
  currentBid,
  bidderSeat,
  tricksWon = [0, 0],
  className = '',
}) => {
  const team0Score = scores[0];
  const team1Score = scores[1];

  const team0Pct = Math.min(100, Math.round((team0Score / targetScore) * 100));
  const team1Pct = Math.min(100, Math.round((team1Score / targetScore) * 100));

  const bidderTeam = bidderSeat !== null && bidderSeat !== undefined ? bidderSeat % 2 : null;

  return (
    <div
      dir="rtl"
      className={`w-full max-w-sm mx-auto bg-gradient-to-b from-[#fbf7eb] via-[#f5edd6] to-[#eee2c3] text-neutral-900 border-4 border-amber-800/80 rounded-3xl p-4 shadow-2xl select-none relative overflow-hidden ${className}`}
    >
      {/* Decorative Leather/Wood Binder Pins */}
      <div className="absolute top-2 left-3 w-3 h-3 rounded-full bg-amber-900 border border-amber-600 shadow-inner" />
      <div className="absolute top-2 right-3 w-3 h-3 rounded-full bg-amber-900 border border-amber-600 shadow-inner" />

      {/* Top Header: Traditional Diwaniya Nashrah */}
      <div className="text-center pb-2.5 mb-2.5 border-b-2 border-dashed border-amber-900/40">
        <div className="flex items-center justify-center gap-2">
          <FileText className="w-5 h-5 text-amber-900" />
          <h3 className="text-base font-black text-amber-950 tracking-wide font-serif">
            نَشْـرَة كُـوتْ بُـوسِتّـة
          </h3>
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px] font-bold text-amber-900/80 px-2">
          <span>الجولة: {roundNo}</span>
          <div className="flex items-center gap-1 bg-amber-900/10 px-2 py-0.5 rounded-full border border-amber-900/20">
            <Target className="w-3 h-3 text-amber-900" />
            <span>الهدف: {targetScore} نقطة</span>
          </div>
        </div>
      </div>

      {/* Traditional Two-Column Ledger: "لنا" (Us) vs "لهم" (Them) */}
      <div className="relative border-2 border-amber-950/60 rounded-2xl bg-white/70 shadow-inner overflow-hidden mb-3">
        {/* Central Vertical Red Ledger Divider */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-red-700/60" />

        {/* Columns Header */}
        <div className="grid grid-cols-2 text-center py-2 bg-amber-950/10 border-b-2 border-amber-950/40 font-black text-sm">
          <div className="text-emerald-800 flex items-center justify-center gap-1.5 border-l border-red-700/40">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-sm" />
            <span>لَنَـا (فريقك)</span>
          </div>
          <div className="text-rose-800 flex items-center justify-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-sm" />
            <span>لَهُـم (الخصم)</span>
          </div>
        </div>

        {/* Big Running Scores */}
        <div className="grid grid-cols-2 text-center py-3">
          {/* Team 0 (لنا) */}
          <div className="border-l border-red-700/40 px-2 flex flex-col items-center">
            <span className="text-4xl font-black text-emerald-950 tabular-nums font-serif">
              {team0Score}
            </span>
            <div className="mt-1 text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-0.5 rounded-full">
              أكلات الجولة: {tricksWon[0]}
            </div>
            {bidderTeam === 0 && currentBid && (
              <span className="mt-1 text-[9px] bg-amber-200 text-amber-900 border border-amber-400 font-black px-1.5 py-0.2 rounded">
                طلب {currentBid}
              </span>
            )}
          </div>

          {/* Team 1 (لهم) */}
          <div className="px-2 flex flex-col items-center">
            <span className="text-4xl font-black text-rose-950 tabular-nums font-serif">
              {team1Score}
            </span>
            <div className="mt-1 text-[10px] font-extrabold text-rose-800 bg-rose-100/90 border border-rose-300 px-2 py-0.5 rounded-full">
              أكلات الجولة: {tricksWon[1]}
            </div>
            {bidderTeam === 1 && currentBid && (
              <span className="mt-1 text-[9px] bg-amber-200 text-amber-900 border border-amber-400 font-black px-1.5 py-0.2 rounded">
                طلب {currentBid}
              </span>
            )}
          </div>
        </div>

        {/* Progress Bars Towards Target */}
        <div className="grid grid-cols-2 p-2 bg-amber-900/5 border-t border-amber-950/20 text-[10px] font-bold text-neutral-600">
          <div className="border-l border-red-700/40 px-2 text-center">
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden border border-neutral-300 mb-0.5">
              <div
                style={{ width: `${team0Pct}%` }}
                className="h-full bg-emerald-600 rounded-full transition-all duration-300"
              />
            </div>
            <span className="text-[9px] text-emerald-900 font-black">
              {team0Score} / {targetScore} ({team0Pct}%)
            </span>
          </div>

          <div className="px-2 text-center">
            <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden border border-neutral-300 mb-0.5">
              <div
                style={{ width: `${team1Pct}%` }}
                className="h-full bg-rose-600 rounded-full transition-all duration-300"
              />
            </div>
            <span className="text-[9px] text-rose-900 font-black">
              {team1Score} / {targetScore} ({team1Pct}%)
            </span>
          </div>
        </div>
      </div>

      {/* Diwaniya Footer Tip */}
      <div className="text-center text-[10px] text-amber-950 font-bold">
        أول فريق يصل إلى <span className="font-black text-amber-900">{targetScore}</span> نقطة يُسجل الفوز
      </div>
    </div>
  );
};

export default ScoreBoard;
