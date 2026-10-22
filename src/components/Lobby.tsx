/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useRoom, RoomConfig, RoomPreset } from '../store/useRoom';
import { SeatKind, Difficulty } from '../types/kout';
import {
  Shield,
  Play,
  Users,
  Bot,
  User,
  Wifi,
  WifiOff,
  ArrowLeftRight,
  Sparkles,
  Trophy,
  Sliders,
  CheckCircle2,
  QrCode,
  LogIn,
} from 'lucide-react';
import { QrModal } from './QrModal';
import { JoinScreen } from './JoinScreen';
import { generateRoomCode } from '../network/localIp';


export interface LobbyProps {
  initialConfig?: Partial<RoomConfig>;
  onStartGame: (config: RoomConfig) => void;
  className?: string;
}

const PRESETS: Array<{ id: RoomPreset; title: string; subtitle: string }> = [
  {
    id: 'SOLO_VS_BOTS',
    title: 'لاعب ضد ٥ بوتات',
    subtitle: 'أنت تلعب بمفردك مع وبضد ذكاء اصطناعي',
  },
  {
    id: 'TWO_HUMANS_COOP',
    title: 'لاعبان بنفس الفريق',
    subtitle: 'شريكك إنسان والخصوم بوتات',
  },
  {
    id: 'TWO_HUMANS_VERSUS',
    title: 'لاعبان ضد بعض',
    subtitle: 'أنت والخصم إنسان في فرق متنافسة',
  },
];

export const Lobby: React.FC<LobbyProps> = ({
  initialConfig,
  onStartGame,
  className = '',
}) => {
  const {
    variant,
    setVariant,
    targetScore,
    setTargetScore,
    botDifficulty,
    setBotDifficulty,
    activePreset,
    applyPreset,
    players,
    setSeatKind,
    setPlayerName,
    swapSeats,
    autoFillBots,
    getConfig,
  } = useRoom(initialConfig);

  const [selectedSeatForSwap, setSelectedSeatForSwap] = useState<number | null>(
    null
  );
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showJoinScreen, setShowJoinScreen] = useState<boolean>(false);
  const [roomCode] = useState<string>(() => generateRoomCode());

  const isBO6 = variant === 'BO6';

  const handleSeatClickForSwap = (seatIdx: number) => {
    if (selectedSeatForSwap === null) {
      setSelectedSeatForSwap(seatIdx);
    } else if (selectedSeatForSwap === seatIdx) {
      setSelectedSeatForSwap(null);
    } else {
      swapSeats(selectedSeatForSwap, seatIdx);
      setSelectedSeatForSwap(null);
    }
  };

  if (showJoinScreen) {
    return (
      <JoinScreen
        onBack={() => setShowJoinScreen(false)}
        onConnected={() => {
          setShowJoinScreen(false);
        }}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className={`min-h-screen w-full bg-neutral-950 flex justify-center items-center p-0 sm:p-4 text-amber-50 select-none ${className}`}
    >
      {/* Landscape and desktop responsive container */}
      <div className="relative w-full max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[95vh] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col wood-rail border border-amber-900/40">
        
        {/* Top Header */}
        <header className="relative z-10 px-4 py-3 flex items-center justify-between border-b border-amber-500/20 bg-gradient-to-b from-black/80 to-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-900/80 border border-amber-400/40 flex items-center justify-center shadow-inner">
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-base font-bold text-amber-300 leading-none">
                غرفة اللعب
              </h1>
              <p className="text-[11px] text-amber-200/60 font-medium">
                لوحة المضيف وإعداد المقاعد
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-500/30">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>كوت كويتية</span>
          </div>
        </header>

        {/* Scrollable Configuration Body */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 text-xs">
          
          {/* Quick Action Buttons: QR Room Code & Join Room */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              className="py-2.5 px-3 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer transition-all"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>رمز QR للغرفة</span>
            </button>

            <button
              type="button"
              onClick={() => setShowJoinScreen(true)}
              className="py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 cursor-pointer transition-all"
            >
              <LogIn className="w-4 h-4 text-amber-400" />
              <span>الانضمام إلى غرفة</span>
            </button>
          </div>

          {/* Quick Presets Section */}
          <section className="bg-black/40 border border-amber-500/20 rounded-2xl p-3 shadow-md backdrop-blur-xs">
            <div className="flex items-center gap-1.5 mb-2 text-amber-300 font-bold">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>النماذج الجاهزة (Presets)</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400/60 ring-1 ring-amber-400/40 shadow'
                        : 'bg-neutral-900/60 border-neutral-700/40 hover:bg-neutral-800/60 text-neutral-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-amber-200 text-xs flex items-center gap-1.5">
                        <span>{preset.title}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        )}
                      </div>
                      <div className="text-[10px] text-amber-200/50 mt-0.5">
                        {preset.subtitle}
                      </div>
                    </div>
                    {isActive && (
                      <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Game Rules: Variant & Target */}
          <section className="bg-black/40 border border-amber-500/20 rounded-2xl p-3 shadow-md backdrop-blur-xs space-y-3">
            {/* Variant Switcher */}
            <div>
              <label className="block text-[11px] font-bold text-amber-200/80 mb-1.5">
                نوع اللعبة:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVariant('BO6')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                    isBO6
                      ? 'bg-emerald-800/80 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/30'
                      : 'bg-neutral-900/50 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-extrabold text-sm">كوت بوستة</span>
                  <span className="text-[10px] opacity-75">٦ لاعبين • ٥٤ ورقة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVariant('BO4')}
                  className={`py-2 px-3 rounded-xl border font-bold text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                    !isBO6
                      ? 'bg-emerald-800/80 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/30'
                      : 'bg-neutral-900/50 border-neutral-700 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span className="font-extrabold text-sm">كوت بوأربعة</span>
                  <span className="text-[10px] opacity-75">٤ لاعبين • ٣٢ ورقة</span>
                </button>
              </div>
            </div>

            {/* Target Score & Difficulty */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800">
              {/* Target Score */}
              <div>
                <label className="block text-[11px] font-bold text-amber-200/80 mb-1">
                  نقطة الفوز (الهدف):
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {[51, 71, 101].map((pts) => (
                    <button
                      key={pts}
                      type="button"
                      onClick={() => setTargetScore(pts)}
                      className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer transition-colors ${
                        targetScore === pts
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                      }`}
                    >
                      {pts}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bot Difficulty */}
              <div>
                <label className="block text-[11px] font-bold text-amber-200/80 mb-1">
                  مستوى البوتات:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['EASY', 'MEDIUM', 'EXPERT'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setBotDifficulty(d)}
                      className={`py-1.5 rounded-lg font-bold text-xs border cursor-pointer transition-colors ${
                        botDifficulty === d
                          ? 'bg-amber-400 text-black border-amber-300'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:bg-neutral-800'
                      }`}
                    >
                      {d === 'EASY' ? 'سهل' : d === 'MEDIUM' ? 'متوسط' : 'خبير'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Seats & Team Assignment Section */}
          <section className="bg-black/40 border border-amber-500/20 rounded-2xl p-3 shadow-md backdrop-blur-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span>توزيع المقاعد والفرق (بالتناوب)</span>
              </div>

              <button
                type="button"
                onClick={autoFillBots}
                className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 hover:bg-emerald-900/80 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Bot className="w-3 h-3" />
                <span>تعبئة الشاغر ببوتات</span>
              </button>
            </div>

            <p className="text-[10px] text-amber-200/50 mb-3">
              المقاعد الزوجية تتبع فريق ١، والفردية فريق ٢. اضغط على مقعدين للتبديل بينهما.
            </p>

            {/* Seats Grid */}
            <div className="grid grid-cols-2 gap-2">
              {players.map((slot) => {
                const isSelected = selectedSeatForSwap === slot.seatIndex;
                const isTeam0 = slot.team === 0;

                return (
                  <div
                    key={slot.seatIndex}
                    className={`relative p-2.5 rounded-xl border transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'ring-2 ring-amber-400 border-amber-300 bg-amber-500/10'
                        : isTeam0
                        ? 'bg-emerald-950/50 border-emerald-500/30'
                        : 'bg-rose-950/50 border-rose-500/30'
                    }`}
                  >
                    {/* Top Row: Seat Index & Team Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-black text-[11px] text-white">
                        مقعد {slot.seatIndex + 1}
                      </span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                          isTeam0
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-400/30'
                            : 'bg-rose-600/30 text-rose-300 border border-rose-400/30'
                        }`}
                      >
                        {isTeam0 ? 'فريق ١' : 'فريق ٢'}
                      </span>
                    </div>

                    {/* Middle Row: Name Input */}
                    <input
                      type="text"
                      value={slot.name}
                      onChange={(e) =>
                        setPlayerName(slot.seatIndex, e.target.value)
                      }
                      className="w-full bg-black/40 border border-neutral-700/60 rounded px-1.5 py-1 text-xs text-white font-semibold mb-2 focus:outline-none focus:border-amber-400"
                      placeholder="اسم اللاعب"
                    />

                    {/* Bottom Row: Kind Selector & Swap Button */}
                    <div className="flex items-center justify-between gap-1">
                      <select
                        value={slot.kind}
                        onChange={(e) =>
                          setSeatKind(
                            slot.seatIndex,
                            e.target.value as SeatKind
                          )
                        }
                        className="bg-neutral-900 border border-neutral-700 text-amber-200 text-[10px] rounded px-1.5 py-1 focus:outline-none cursor-pointer flex-1"
                      >
                        <option value="HUMAN_LOCAL">لاعب محلي</option>
                        <option value="HUMAN_REMOTE">لاعب عن بعد (انتظار)</option>
                        <option value="AI_BOT">بوت ذكي</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSeatClickForSwap(slot.seatIndex)}
                        title="تبديل المقعد"
                        className={`p-1 rounded border text-[10px] cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400 text-black border-amber-300'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                        }`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Remote Status Badge */}
                    {slot.kind === 'HUMAN_REMOTE' && (
                      <div className="mt-1 flex items-center gap-1 text-[9px] text-amber-300/70">
                        <WifiOff className="w-2.5 h-2.5" />
                        <span>بانتظار انضمام اللاعب...</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Bottom Launch Button Bar */}
        <footer className="relative z-10 px-4 py-3 border-t border-amber-500/20 bg-gradient-to-t from-black/90 to-black/60 flex items-center justify-between gap-3">
          <div className="text-[11px] text-amber-200/70 leading-tight">
            <div>
              {isBO6 ? '٦ لاعبين (بوستة)' : '٤ لاعبين (بوأربعة)'} • الهدف {targetScore}
            </div>
            <div className="text-[10px] text-amber-400/60 font-medium">
              مستوى البوتات: {botDifficulty === 'EASY' ? 'سهل' : botDifficulty === 'MEDIUM' ? 'متوسط' : 'خبير'}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartGame(getConfig())}
            className="py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-black text-sm shadow-xl active:scale-98 cursor-pointer flex items-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>ابدأ اللعبة</span>
          </button>
        </footer>

        {/* QR Code Modal for Room Sharing */}
        <QrModal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          roomCode={roomCode}
        />

      </div>
    </div>
  );
};


export default Lobby;
