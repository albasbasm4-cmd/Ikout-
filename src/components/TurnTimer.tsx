/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { strings } from '../i18n/ar';

export interface TurnTimerProps {
  durationSeconds?: number;
  onTimeout?: () => void;
  isActive?: boolean;
  size?: number;
  className?: string;
}

export const TurnTimer: React.FC<TurnTimerProps> = ({
  durationSeconds = 20,
  onTimeout,
  isActive = true,
  size = 56,
  className = '',
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(durationSeconds);
  const timeoutTriggeredRef = useRef<boolean>(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Reset timer when duration changes or becomes active
  useEffect(() => {
    if (isActive) {
      setTimeLeft(durationSeconds);
      timeoutTriggeredRef.current = false;
    }
  }, [durationSeconds, isActive]);

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      if (!timeoutTriggeredRef.current) {
        timeoutTriggeredRef.current = true;
        const timeoutId = setTimeout(() => {
          if (onTimeoutRef.current) {
            onTimeoutRef.current();
          }
        }, 0);
        return () => clearTimeout(timeoutId);
      }
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);


  const strokeWidth = 4;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressRatio = durationSeconds > 0 ? timeLeft / durationSeconds : 0;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const isLowTime = timeLeft <= 5;
  const ringColor = isLowTime ? '#ef4444' : timeLeft <= 10 ? '#f59e0b' : '#10b981';

  return (
    <div
      dir="rtl"
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center select-none ${className}`}
      aria-label={`${strings.timeRemaining}: ${timeLeft} ${strings.seconds}`}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background Track Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{ transition: 'stroke-dashoffset 0.95s linear, stroke 0.3s ease' }}
        />
      </svg>

      {/* Center Countdown Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-black text-sm leading-none ${
            isLowTime ? 'text-red-400 animate-pulse font-extrabold' : 'text-white'
          }`}
        >
          {timeLeft}
        </span>
        <span className="text-[8px] text-amber-200/60 leading-none mt-0.5">ث</span>
      </div>
    </div>
  );
};

export default TurnTimer;
