# iKout - Project Notes

## DONE
- (empty)
- Added src/types/kout.ts core game and network types
- Added src/rules/config.ts, src/rules/deck.ts, and vitest for deck sizes
- Added src/rules/cards.ts (cardStrength, trickWinner, getLegalCards with joker rules) and vitest suite
- Added src/engine/KoutGameEngine.ts (dealer rotation, bidding flow, Malzom forced bid, versioning) and vitest suite
- Added src/engine/KoutTricks.ts (declareTrump, playCard, trick resolution, round completion) and full round vitest
- Added src/engine/KoutScoring.ts (scoreRound, target detection, Bawan instant win) and vitest suite
- Added src/engine/__tests__/fuzz.test.ts (1000 full games fuzz testing BO6 and BO4 with all invariants)
- Added src/ai/BidEvaluator.ts (suit scoring, Jokers, Aces/Kings, difficulty levels, Malzom) and vitest suite
- Added src/ai/ISMCTS.ts (void inference, determinization, UCT, EASY/MEDIUM/EXPERT chooseCard) and vitest suite
- Added src/ai/kout-ai.worker.ts and src/ai/AIClient.ts (web worker, 1500ms timeout fallback, 400-900ms delay)
- Added src/components/Card.tsx, Hand.tsx, Table.tsx (SVG cards, fanned hand, 6/4-seat table, demo mode)
- Added src/components/BidPanel.tsx, TrumpPicker.tsx, ScoreBoard.tsx, TurnTimer.tsx, and ar.ts strings
- Added src/store/useGame.ts and src/components/GameScreen.tsx, mounted in App.tsx (full playable game loop)
- Added src/components/Lobby.tsx and src/store/useRoom.ts, and added Lobby navigation in App.tsx
- Added src/network/protocol.ts, ITransport.ts, LoopbackTransport.ts, HostSession.ts and vitest suite
- Added nodejs-project/main.js, package.json, src/network/LocalHostServer.ts, src/network/LocalClientSocket.ts
- Added src/components/QrModal.tsx, JoinScreen.tsx, src/network/localIp.ts, and QR/Join buttons in Lobby.tsx
- Fixed TurnTimer side-effect in setState: decoupled onTimeout callback execution from state updater
- Added src/store/useSettings.ts, src/utils/audio.ts, src/utils/persist.ts, src/components/ErrorBoundary.tsx
- Upgraded visual styling, animations, and gameplay smoothness to match premium Kuwaiti Diwaniya mobile Kout (authentic cards, court vector art, realistic felt/wood rail, card throw & shake physics, character avatars, and audio effects)
