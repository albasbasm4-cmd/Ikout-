/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const strings = {
  // Game & Navigation
  appName: 'آي كوت',
  gameSubtitle: 'كوت بوستة كويتية',
  round: 'جولة',
  roundNo: 'الجولة',
  target: 'الهدف',
  targetScore: 'نقطة الهدف',
  points: 'نقطة',
  tricks: 'أكْلات',
  tricksWon: 'الأكلات المحرزة',

  // Teams
  team0: 'فريق ١ (فريقك)',
  team1: 'فريق ٢ (الخصوم)',
  team0Short: 'فريق ١',
  team1Short: 'فريق ٢',
  me: 'أنت',
  dealer: 'الموزع',

  // Bidding (BidPanel)
  biddingTitle: 'المزاد',
  pass: 'طاف',
  bid: 'طلب',
  currentHighBid: 'أعلى طلب حالي',
  noBidsYet: 'لا يوجد طلب حتى الآن',
  mustBidHigher: 'يجب أن يكون الطلب أعلى من الحالي',
  forcedMalzom: 'أنت ملزوم بالطلب (٥ على الأقل)',
  dealerIsMalzom: 'ملزوم',

  // Trump Picker (TrumpPicker)
  chooseTrumpTitle: 'اختر ورقة الحكم (الأمر)',
  trumpDeclared: 'الأمر الحالي',
  spades: 'سبيت',
  hearts: 'هاص',
  diamonds: 'ديمن',
  clubs: 'كلفس',

  // Turn Timer
  timeRemaining: 'الوقت المتبقي',
  seconds: 'ثانية',
  yourTurn: 'دورك للعب!',
  thinking: 'يفكّر...',

  // ScoreBoard
  scoreboardTitle: 'لوحة النتائج',
  tricksProgress: 'الأكلات',
  winningBid: 'المزاد الفائز',
} as const;

export type StringKey = keyof typeof strings;

export default strings;
