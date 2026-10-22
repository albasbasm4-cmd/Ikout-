/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Card as CardType, Suit } from '../types/kout';
import { Card } from './Card';
import { playCardSound, playTapSound } from '../utils/audio';
import { sortHandCards } from '../rules/cards';

export interface HandProps {
  cards: CardType[];
  trump?: Suit | null;
  legalCardIds?: Set<string> | string[];
  selectedCardId?: string | null;
  onPlayCard?: (card: CardType) => void;
  onSelectCard?: (card: CardType) => void;
  isMyTurn?: boolean;
  className?: string;
  cardSize?: 'sm' | 'md' | 'lg';
  autoSort?: boolean;
}

export const Hand: React.FC<HandProps> = ({
  cards,
  trump,
  legalCardIds,
  selectedCardId: controlledSelectedId,
  onPlayCard,
  onSelectCard,
  isMyTurn = true,
  className = '',
  cardSize = 'md',
  autoSort = true,
}) => {
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [shakingCardId, setShakingCardId] = useState<string | null>(null);
  const [warningTip, setWarningTip] = useState<string | null>(null);

  // Auto-sort player cards: Jokers first, then grouped by suit (trump first) and rank descending
  const displayCards = useMemo(() => {
    if (autoSort === false) return cards;
    return sortHandCards(cards, trump);
  }, [cards, trump, autoSort]);

  const selectedId =
    controlledSelectedId !== undefined ? controlledSelectedId : internalSelectedId;

  // Pre-calculate set of legal card IDs
  const legalSet = React.useMemo(() => {
    if (!legalCardIds) return null;
    if (legalCardIds instanceof Set) return legalCardIds;
    return new Set(legalCardIds);
  }, [legalCardIds]);

  const count = displayCards.length;
  if (count === 0) {
    return (
      <div className={`flex items-center justify-center p-3 text-xs text-amber-200/50 ${className}`}>
        لا توجد أوراق في اليد
      </div>
    );
  }

  // Calculate fan angle and horizontal overlap based on card count
  const maxAngleSpread = Math.min(24, count * 3.2);
  const angleStep = count > 1 ? (maxAngleSpread * 2) / (count - 1) : 0;
  const horizontalOverlap = count > 7 ? -26 : count > 5 ? -20 : -12;

  const handleCardClick = (card: CardType) => {
    const isLegal = legalSet ? legalSet.has(card.id) && isMyTurn : isMyTurn;

    if (!isMyTurn) {
      setWarningTip('ليس دورك الآن!');
      setTimeout(() => setWarningTip(null), 1200);
      return;
    }

    if (!isLegal) {
      setShakingCardId(card.id);
      setWarningTip('يجب عليك اتباع لون اللعب!');
      playTapSound();
      setTimeout(() => setShakingCardId(null), 400);
      setTimeout(() => setWarningTip(null), 1400);
      return;
    }

    // Legal move: play card with snap sound
    playCardSound();
    if (onPlayCard) {
      onPlayCard(card);
    }
    if (onSelectCard) {
      onSelectCard(card);
    }
    setInternalSelectedId(card.id);
  };

  return (
    <div
      dir="rtl"
      className={`relative w-full flex flex-col items-center justify-center pt-3 pb-2 px-1 select-none overflow-visible ${className}`}
    >
      {/* Floating Warning Tip */}
      {warningTip && (
        <div className="absolute -top-7 z-50 bg-rose-900/90 text-rose-100 border border-rose-400 text-[11px] font-bold px-3 py-1 rounded-full shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-150">
          {warningTip}
        </div>
      )}

      {/* Fan Area */}
      <div className="relative flex items-end justify-center h-28 sm:h-32">
        {displayCards.map((card, index) => {
          const isLegal = legalSet ? legalSet.has(card.id) && isMyTurn : isMyTurn;
          const isSelected = selectedId === card.id;
          const isShaking = shakingCardId === card.id;

          // Natural parabolic fan geometry
          const normalizedIdx = index - (count - 1) / 2;
          const rotateDeg = normalizedIdx * (angleStep * 0.65);
          const translateY = Math.abs(normalizedIdx) * 2.2;

          return (
            <div
              key={card.id}
              style={{
                marginRight: index === 0 ? 0 : `${horizontalOverlap}px`,
                transform: isSelected
                  ? `translateY(-22px) rotate(0deg) scale(1.08)`
                  : `rotate(${rotateDeg}deg) translateY(${translateY}px)`,
                zIndex: isSelected ? 40 : index + 10,
                animationDelay: `${index * 45}ms`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), margin 0.2s ease-out',
              }}
              className={`origin-bottom will-change-transform animate-deal-card ${isShaking ? 'animate-card-shake' : ''}`}
            >
              <Card
                card={card}
                faceUp={true}
                isLegal={isLegal}
                isSelected={isSelected}
                size={cardSize}
                onClick={() => handleCardClick(card)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Hand;
