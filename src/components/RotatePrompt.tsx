/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, X, Play } from 'lucide-react';
import { playTapSound } from '../utils/audio';

export interface RotatePromptProps {
  onDismiss?: () => void;
}

export const RotatePrompt: React.FC<RotatePromptProps> = ({ onDismiss }) => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      if (typeof window === 'undefined') return;
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  const handleLockLandscape = async () => {
    playTapSound();
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape');
      }
    } catch (err) {
      console.log('Orientation lock not supported or user gesture needed:', err);
    }
  };

  const handleDismiss = () => {
    playTapSound();
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (!isPortrait || isDismissed) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300"
    >
      <div className="relative w-full max-w-sm bg-neutral-950 border-2 border-amber-400/80 rounded-3xl p-6 shadow-[0_0_50px_rgba(251,191,36,0.25)] flex flex-col items-center">
        
        {/* Animated Phone Rotation Graphic */}
        <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-amber-400/40 animate-spin [animation-duration:8s]" />
          <div className="relative w-14 h-22 rounded-2xl border-3 border-amber-300 bg-gradient-to-b from-emerald-950 to-neutral-900 shadow-2xl flex flex-col items-center justify-between p-1.5 animate-device-rotate">
            <div className="w-4 h-1 rounded-full bg-amber-400/60" />
            <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
              <span className="text-[10px] text-amber-300 font-black">كوت</span>
            </div>
            <div className="w-2 h-2 rounded-full border border-amber-400/40" />
          </div>
        </div>

        {/* Text Instructions */}
        <h3 className="text-lg font-black text-amber-300 mb-1.5">
          يرجى تدوير جهازك للوضع الأفقي
        </h3>
        <p className="text-xs text-amber-200/80 leading-relaxed mb-5 font-medium">
          لعبة كوت بوستة صُممت لتعمل بكامل الشاشة في الوضع العرضي (Landscape) لتمنحك تجربة جلسة الديوانية الحقيقية وتوزيع الأوراق بوضوح تام.
        </p>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleLockLandscape}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-sm shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 border border-amber-200"
          >
            <RefreshCw className="w-4 h-4 animate-spin [animation-duration:3s]" />
            <span>تدوير وملء الشاشة</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 px-3 text-xs text-amber-300/60 hover:text-amber-200 font-semibold cursor-pointer transition-colors"
          >
            متابعة بالعرض الحالي (للتجربة)
          </button>
        </div>
      </div>
    </div>
  );
};
