/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Card, Bid, Suit, Difficulty, TrickPlay } from '../types/kout';
import { KoutGameEngine } from '../engine/KoutGameEngine';
import { getLegalCards, trickWinner } from '../rules/cards';
import { getPlayedCards } from '../engine/KoutTricks';
import { getBotDecision } from '../ai/AIClient';
import { evaluateBid } from '../ai/BidEvaluator';
import {
  playCardSound,
  playTrickWinSound,
  playTrumpSound,
  playWinSound,
  playLoseSound,
} from '../utils/audio';
import { saveGameState } from '../utils/persist';
import { useHaptics } from './useSettings';

export interface UseGameOptions {
  variant?: 'BO6' | 'BO4';
  targetScore?: number;
  difficulty?: Difficulty;
  autoStart?: boolean;
  initialState?: GameState;
}

const SUIT_ARABIC: Record<Suit, string> = {
  S: 'سبيت ♠',
  H: 'هاص ♥',
  D: 'ديمن ♦',
  C: 'كلفس ♣',
};

export function useGame(options: UseGameOptions = {}) {
  const [difficulty, setDifficulty] = useState<Difficulty>(options.difficulty ?? 'MEDIUM');
  const [variant, setVariant] = useState<'BO6' | 'BO4'>(options.variant ?? 'BO6');
  const [targetScore, setTargetScore] = useState<number>(options.targetScore ?? 51);

  // Engine instance reference
  const engineRef = useRef<KoutGameEngine | null>(null);

  if (!engineRef.current) {
    engineRef.current = new KoutGameEngine(
      {
        variant,
        targetScore,
        initialDealer: 0,
        seed: Math.floor(Math.random() * 1000000),
      },
      options.initialState
    );
  }

  const [state, setState] = useState<GameState>(() => {
    const engine = engineRef.current!;
    if (options.initialState) {
      return options.initialState;
    }
    if (options.autoStart !== false) {
      return engine.startRound();
    }
    return engine.state;
  });

  const [isBotThinking, setIsBotThinking] = useState<boolean>(false);
  const isExecutingRef = useRef<boolean>(false);

  // Smooth Trick Completion & Visual Pacing
  const [displayedTrick, setDisplayedTrick] = useState<TrickPlay[]>(state.currentTrick);
  const [winningTrickPlay, setWinningTrickPlay] = useState<TrickPlay | null>(null);
  const [trickWinnerAnnouncement, setTrickWinnerAnnouncement] = useState<string | null>(null);
  const [speechBubbles, setSpeechBubbles] = useState<Record<number, string>>({});
  const isResolvingTrickRef = useRef<boolean>(false);

  const { trigger: triggerHaptic } = useHaptics(true);

  // Keep displayed trick in sync when not in resolution
  useEffect(() => {
    if (!isResolvingTrickRef.current) {
      setDisplayedTrick(state.currentTrick);
    }
  }, [state.currentTrick]);

  // Legal cards for human player (seat 0)
  const legalCardsForHuman = useMemo(() => {
    if (state.phase !== 'PLAY' || state.currentSeat !== 0 || isResolvingTrickRef.current) {
      return new Set<string>();
    }
    const myHand = state.hands[0] || [];
    const played = getPlayedCards(state.trickHistory, state.currentTrick);
    const legal = getLegalCards(myHand, state.currentTrick, state.trump, {
      playedCards: played,
      highBid: state.highBid,
    });
    return new Set(legal.map((c) => c.id));
  }, [state]);

  // Is human turn?
  const isHumanTurn =
    !isResolvingTrickRef.current &&
    ((state.phase === 'BID' && state.currentSeat === 0) ||
      (state.phase === 'TRUMP' && state.bidderSeat === 0) ||
      (state.phase === 'PLAY' && state.currentSeat === 0));

  // Plays a card with smooth trick completion delay
  const executePlayCardWithPacing = useCallback(
    (seat: number, card: Card) => {
      const engine = engineRef.current;
      if (!engine) return;

      playCardSound();
      triggerHaptic('light');

      const numSeats = engine.state.variant === 'BO6' ? 6 : 4;
      const currentTrick = engine.state.currentTrick;

      // Check if this card completes the trick
      if (currentTrick.length === numSeats - 1) {
        // Complete trick: show all cards for 1100ms before advancing
        isResolvingTrickRef.current = true;
        const fullTrick = [...currentTrick, { seat, card }];
        const winner = trickWinner(fullTrick, engine.state.trump);
        const winnerName =
          engine.state.players?.[winner.seat]?.name || `لاعب ${winner.seat + 1}`;

        setDisplayedTrick(fullTrick);
        setWinningTrickPlay(winner);
        const announceMsg =
          winner.seat === 0 ? 'أكلتها أنت! 🎉' : `أكلها ${winnerName}!`;
        setTrickWinnerAnnouncement(announceMsg);

        playTrickWinSound();
        triggerHaptic('medium');

        setTimeout(() => {
          try {
            const nextState = engine.playCard(seat, card);
            setState({ ...nextState });
            saveGameState(nextState);

            if (nextState.phase === 'ROUND_END' || nextState.phase === 'GAME_END') {
              if (nextState.scores[0] >= nextState.scores[1]) {
                playWinSound();
              } else {
                playLoseSound();
              }
            }
          } finally {
            isResolvingTrickRef.current = false;
            setWinningTrickPlay(null);
            setTrickWinnerAnnouncement(null);
            setDisplayedTrick([]);
          }
        }, 1100);
      } else {
        // Non-final card play: instant update
        const nextState = engine.playCard(seat, card);
        setState({ ...nextState });
        saveGameState(nextState);
      }
    },
    [triggerHaptic]
  );

  // Human Actions
  const humanPlayCard = useCallback(
    (card: Card) => {
      const engine = engineRef.current;
      if (!engine || isResolvingTrickRef.current) return;
      if (engine.state.phase !== 'PLAY' || engine.state.currentSeat !== 0) return;

      try {
        executePlayCardWithPacing(0, card);
      } catch (err) {
        console.error('Human playCard error:', err);
      }
    },
    [executePlayCardWithPacing]
  );

  const humanBid = useCallback((bid: Bid) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.state.phase !== 'BID' || engine.state.currentSeat !== 0) return;

    try {
      const bubble = bid === 0 ? 'طاف' : `طلب ${bid}`;
      setSpeechBubbles((prev) => ({ ...prev, 0: bubble }));

      const nextState = engine.placeBid(0, bid);
      setState({ ...nextState });
      saveGameState(nextState);
    } catch (err) {
      console.error('Human placeBid error:', err);
    }
  }, []);

  const humanDeclareTrump = useCallback((suit: Suit) => {
    const engine = engineRef.current;
    if (!engine) return;
    if (engine.state.phase !== 'TRUMP' || engine.state.bidderSeat !== 0) return;

    try {
      playTrumpSound();
      setSpeechBubbles((prev) => ({
        ...prev,
        0: `الأمر: ${SUIT_ARABIC[suit]}`,
      }));

      const nextState = engine.declareTrump(0, suit);
      setState({ ...nextState });
      saveGameState(nextState);
    } catch (err) {
      console.error('Human declareTrump error:', err);
    }
  }, []);

  const sendSpeechBubble = useCallback((message: string, seat: number = 0) => {
    setSpeechBubbles((prev) => ({ ...prev, [seat]: message }));
    setTimeout(() => {
      setSpeechBubbles((prev) => {
        const next = { ...prev };
        delete next[seat];
        return next;
      });
    }, 2800);
  }, []);

  const startNextRound = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setSpeechBubbles({});
    const nextState = engine.startRound();
    setState({ ...nextState });
    saveGameState(nextState);
  }, []);

  const startNewGame = useCallback(
    (newVariant?: 'BO6' | 'BO4', newTarget?: number, newDiff?: Difficulty) => {
      const v = newVariant ?? variant;
      const t = newTarget ?? targetScore;
      const d = newDiff ?? difficulty;
      setVariant(v);
      setTargetScore(t);
      setDifficulty(d);
      setSpeechBubbles({});
      setWinningTrickPlay(null);
      setTrickWinnerAnnouncement(null);

      const newEngine = new KoutGameEngine({
        variant: v,
        targetScore: t,
        initialDealer: 0,
        seed: Math.floor(Math.random() * 1000000),
      });
      engineRef.current = newEngine;
      const firstState = newEngine.startRound();
      setState({ ...firstState });
      saveGameState(firstState);
    },
    [variant, targetScore, difficulty]
  );

  // Human turn timeout handler (auto-plays legal move)
  const handleHumanTimeout = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || isResolvingTrickRef.current) return;
    const current = engine.state;

    if (current.phase === 'BID' && current.currentSeat === 0) {
      const isDealerForced =
        current.dealer === 0 &&
        current.bids.length === (current.variant === 'BO6' ? 5 : 3) &&
        current.bids.every((b) => b.bid === 0);
      const autoBid: Bid = isDealerForced ? 5 : 0;
      humanBid(autoBid);
    } else if (current.phase === 'TRUMP' && current.bidderSeat === 0) {
      const evalResult = evaluateBid(current.hands[0], null, false, difficulty);
      humanDeclareTrump(evalResult.bestSuit);
    } else if (current.phase === 'PLAY' && current.currentSeat === 0) {
      const hand = current.hands[0] || [];
      const played = getPlayedCards(current.trickHistory, current.currentTrick);
      const legal = getLegalCards(hand, current.currentTrick, current.trump, {
        playedCards: played,
        highBid: current.highBid,
      });
      if (legal.length > 0) {
        humanPlayCard(legal[0]);
      }
    }
  }, [difficulty, humanBid, humanDeclareTrump, humanPlayCard]);

  // Automated bot turn execution effect
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;

    let isMounted = true;
    const current = state;

    if (isResolvingTrickRef.current) return;

    const isBotTurnToBid = current.phase === 'BID' && current.currentSeat !== 0;
    const isBotTurnToTrump = current.phase === 'TRUMP' && current.bidderSeat !== 0;
    const isBotTurnToPlay = current.phase === 'PLAY' && current.currentSeat !== 0;

    if (!isBotTurnToBid && !isBotTurnToTrump && !isBotTurnToPlay) {
      setIsBotThinking(false);
      return;
    }

    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsBotThinking(true);

    const activeSeat = current.phase === 'TRUMP' ? current.bidderSeat! : current.currentSeat;

    const executeBotTurn = async () => {
      try {
        const decision = await getBotDecision(current, activeSeat, difficulty);

        if (!isMounted) return;

        const currentEngineState = engine.state;
        if (currentEngineState.version !== current.version) {
          return;
        }

        if (decision.type === 'BID' && currentEngineState.phase === 'BID') {
          const bubble = decision.bid === 0 ? 'طاف' : `طلب ${decision.bid}`;
          setSpeechBubbles((prev) => ({ ...prev, [activeSeat]: bubble }));

          const next = engine.placeBid(activeSeat, decision.bid);
          setState({ ...next });
          saveGameState(next);
        } else if (decision.type === 'TRUMP' && currentEngineState.phase === 'TRUMP') {
          playTrumpSound();
          setSpeechBubbles((prev) => ({
            ...prev,
            [activeSeat]: `الأمر: ${SUIT_ARABIC[decision.suit]}`,
          }));

          const next = engine.declareTrump(activeSeat, decision.suit);
          setState({ ...next });
          saveGameState(next);
        } else if (decision.type === 'PLAY' && currentEngineState.phase === 'PLAY') {
          executePlayCardWithPacing(activeSeat, decision.card);
        }
      } catch (err) {
        console.error('Error in bot execution:', err);
      } finally {
        if (isMounted) {
          isExecutingRef.current = false;
          setIsBotThinking(false);
        }
      }
    };

    executeBotTurn();

    return () => {
      isMounted = false;
      isExecutingRef.current = false;
    };
  }, [state, difficulty, executePlayCardWithPacing]);

  return {
    state,
    difficulty,
    setDifficulty,
    variant,
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
  };
}

export default useGame;
