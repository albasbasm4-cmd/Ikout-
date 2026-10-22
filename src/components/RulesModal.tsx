/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, X, Award, Shield, Crown, Sparkles } from 'lucide-react';
import { playTapSound } from '../utils/audio';

export interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md max-h-[85vh] bg-neutral-950 border-2 border-amber-500/50 rounded-3xl flex flex-col shadow-2xl text-amber-50 overflow-hidden">
        
        {/* Header */}
        <header className="px-4 py-3 border-b border-amber-500/20 bg-gradient-to-r from-neutral-900 to-black flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black shadow-md">
              <BookOpen className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h2 className="text-sm font-black text-amber-300">قوانين كوت بوستة والديوانية</h2>
              <p className="text-[10px] text-amber-200/70 font-semibold">الدليل الرسمي لقواعد اللعبة</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center border border-neutral-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3.5 space-y-3.5 text-xs">
          
          {/* Section 1: الأنواع وتوزيع اللاعبين */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black">الفرق واللاعبين</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              • <strong className="text-white">كوت بوستة (٦ لاعبين):</strong> تلعب بـ ٥٤ ورقة (شاملة الجيكر الأحمر والميكر الأسود)، يتوزع اللاعبون بالتناوب في فريقين (فريق لنا مقابل فريق لهم).
              <br />
              • <strong className="text-white">كوت بوأربعة (٤ لاعبين):</strong> تلعب بـ ٣٢ ورقة (من ورقة ٧ إلى الآكة، بدون جياكر).
            </p>
          </section>

          {/* Section 2: قوة الأوراق والجياكر */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black">ترتيب قوة الأوراق</span>
            </div>
            <div className="text-[11px] text-neutral-300 space-y-1">
              <div>
                <span className="text-rose-400 font-bold">١. الجيكر الأحمر:</span> أقوى ورقة في اللعبة مطلقاً، يأكل أي ورقة حتى الحكم.
              </div>
              <div>
                <span className="text-neutral-200 font-bold">٢. الميكر الأسود:</span> ثاني أقوى ورقة ويأتي مباشرة بعد الجيكر.
              </div>
              <div>
                <span className="text-amber-300 font-bold">٣. أوراق الحكم:</span> الآكة (A) ثم الشايب (K) ثم البنت (Q) ثم الولد (J) ثم الأرقام التنازلية.
              </div>
              <div>
                <span className="text-neutral-400">٤. الأوراق العادية:</span> A, K, Q, J, 10, 9, 8, 7, ...
              </div>
            </div>
          </section>

          {/* Section 3: المزايدة والحكم (الأمر) */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black">المزايدة (الطلب) والملزوم</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              • يبدأ المزاد من <strong className="text-white">٥ أكلات</strong> وحتى ٩ أكلات (أو كوت).
              <br />
              • إذا قال جميع اللاعبين <strong className="text-white">طاف (Pass)</strong>، يصبح الموزع <strong className="text-rose-400">ملزوماً (Forced)</strong> بطلب ٥ أكلات.
              <br />
              • الفائز بالمزاد يحدد لون <strong className="text-amber-300">الحكم (الأمر)</strong> ويبدأ اللعب.
            </p>
          </section>

          {/* Section 4: النشرة واحتساب النقاط */}
          <section className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold mb-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-black">احتساب نقاط النشرة والفوز</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              • إذا أحرز الفريق الطالب عدد الأكلات المطلوبة أو أكثر، تُحسب له النقاط.
              <br />
              • إذا فشل الفريق الطالب (انكسر)، تذهب النقاط للخصم مضاعفة!
              <br />
              • <strong className="text-amber-300">الفوز بالمباراة:</strong> أول فريق يبلغ مجموع نقاطه الهدف المحدد (٥١ أو ١٠١ نقطة) في النشرة.
            </p>
          </section>
        </div>

        {/* Footer */}
        <footer className="px-4 py-3 border-t border-amber-500/20 bg-black/90 flex items-center justify-end">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-black font-black text-xs shadow-md active:scale-95 cursor-pointer"
          >
            فهمت، لنلعب الآن!
          </button>
        </footer>
      </div>
    </div>
  );
};

export default RulesModal;
