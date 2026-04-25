'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/GameContext';
import { Navigation } from './Navigation';
import { AIPersonality, AILevel } from '@/lib/ai';

export function GameSetup() {
  const router = useRouter();
  const { config, setConfig, startGame } = useGame();

  const [opponentCount, setOpponentCount] = useState(config.opponentCount);
  const [playerBuyIn, setPlayerBuyIn] = useState(config.playerBuyIn);
  const [aiBuyIn, setAiBuyIn] = useState(config.aiBuyIn);
  const [bettingType, setBettingType] = useState<'limit' | 'no-limit'>(config.bettingType);
  const [smallBlind, setSmallBlind] = useState(config.smallBlind);
  const [aiPersonalities, setAiPersonalities] = useState<AIPersonality[]>(config.aiPersonalities);
  const [aiLevels, setAiLevels] = useState<AILevel[]>(config.aiLevels);

  const handleStartGame = () => {
    console.log('[GameSetup] handleStartGame called');
    const newConfig = {
      ...config,
      opponentCount,
      playerBuyIn,
      aiBuyIn,
      bettingType,
      smallBlind,
      bigBlind: smallBlind * 2,
      aiPersonalities: aiPersonalities.slice(0, opponentCount),
      aiLevels: aiLevels.slice(0, opponentCount)
    };
    console.log('[GameSetup] calling startGame with config:', newConfig);
    startGame(newConfig);
    // Delay navigation to allow React state to update
    setTimeout(() => router.push('/game'), 100);
  };

  const personalities: AIPersonality[] = ['conservative', 'aggressive', 'opportunistic'];
  const levels: AILevel[] = [1, 2, 3];

  const personalityLabels = {
    conservative: 'Conservative',
    aggressive: 'Aggressive',
    opportunistic: 'Opportunistic'
  };

  const personalityDescriptions = {
    conservative: 'Tight-Passive strategy. Only plays premium hands and avoids large pots without the nuts.',
    aggressive: 'Loose-Aggressive strategy. High 3-bet frequency and frequent bluffs to apply maximum pressure.',
    opportunistic: 'Adaptive strategy. Exploits player tendencies and calculates GTO-based decisions dynamically.'
  };

  return (
    <>
      <Navigation currentPage="tables" walletAmount={playerBuyIn} />

      <main className="lg:pl-64 pt-20 pb-20 px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Configuration Canvas */}
        <section className="lg:col-span-8 space-y-8">
          <header>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-background mb-2">New Simulation</h1>
            <p className="text-on-surface-variant font-light tracking-wide uppercase text-xs">Table Configuration & AI Parameters</p>
          </header>

          {/* Table Setup Card */}
          <div className="bg-surface-container-low rounded-xl p-8 relative overflow-hidden group">
            <div className="felt-texture absolute inset-0 opacity-[0.03]"></div>
            <div className="relative z-10 space-y-10">
              <div className="flex items-center gap-4 border-l-2 border-primary pl-4">
                <span className="material-symbols-outlined text-primary">analytics</span>
                <h2 className="font-headline text-xl font-semibold">Environment Settings</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Opponents Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-end">
                    <label className="uppercase tracking-widest text-[10px] font-bold text-on-surface-variant">Robot Opponents</label>
                    <span className="text-primary font-headline text-2xl font-black">{opponentCount.toString().padStart(2, '0')}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="8"
                    value={opponentCount}
                    onChange={(e) => setOpponentCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-primary-container rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #e9c349 0%, #e9c349 ${(opponentCount - 1) / 7 * 100}%, #433400 ${(opponentCount - 1) / 7 * 100}%, #433400 100%)`
                    }}
                  />
                  <div className="flex justify-between text-[10px] text-outline uppercase tracking-tighter">
                    <span>Heads Up</span>
                    <span>Full Ring</span>
                  </div>
                </div>

                {/* Betting Type */}
                <div className="space-y-6">
                  <label className="uppercase tracking-widest text-[10px] font-bold text-on-surface-variant">Betting Type</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setBettingType('limit')}
                      className={`py-3 rounded-lg text-sm font-bold transition-all ${
                        bettingType === 'limit'
                          ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(233,195,73,0.3)]'
                          : 'bg-surface-container-highest hover:bg-surface-bright text-on-surface'
                      }`}
                    >
                      Limit
                    </button>
                    <button
                      onClick={() => setBettingType('no-limit')}
                      className={`py-3 rounded-lg text-sm font-bold transition-all ${
                        bettingType === 'no-limit'
                          ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(233,195,73,0.3)]'
                          : 'bg-surface-container-highest hover:bg-surface-bright text-on-surface'
                      }`}
                    >
                      No-Limit
                    </button>
                  </div>
                </div>

                {/* Starting Chips */}
                <div className="space-y-6">
                  <label className="uppercase tracking-widest text-[10px] font-bold text-on-surface-variant">Standard Buy-In</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-lowest p-4 rounded-lg flex flex-col items-center gap-2 border border-white/5">
                      <span className="text-[10px] text-outline">PLAYER</span>
                      <input
                        type="text"
                        value={playerBuyIn.toLocaleString()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/,/g, ''));
                          if (!isNaN(val)) setPlayerBuyIn(val);
                        }}
                        className="bg-transparent border-none text-center font-headline text-lg text-primary focus:ring-0 w-full"
                      />
                    </div>
                    <div className="bg-surface-container-lowest p-4 rounded-lg flex flex-col items-center gap-2 border border-white/5">
                      <span className="text-[10px] text-outline">EACH AI</span>
                      <input
                        type="text"
                        value={aiBuyIn.toLocaleString()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/,/g, ''));
                          if (!isNaN(val)) setAiBuyIn(val);
                        }}
                        className="bg-transparent border-none text-center font-headline text-lg text-primary focus:ring-0 w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* Blinds */}
                <div className="space-y-6">
                  <label className="uppercase tracking-widest text-[10px] font-bold text-on-surface-variant">Blind Level</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-container-lowest p-4 rounded-lg flex flex-col items-center gap-2 border border-white/5">
                      <span className="text-[10px] text-outline">SMALL</span>
                      <input
                        type="text"
                        value={smallBlind.toLocaleString()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value.replace(/,/g, ''));
                          if (!isNaN(val)) setSmallBlind(val);
                        }}
                        className="bg-transparent border-none text-center font-headline text-lg text-secondary focus:ring-0 w-full"
                      />
                    </div>
                    <div className="bg-surface-container-lowest p-4 rounded-lg flex flex-col items-center gap-2 border border-white/5">
                      <span className="text-[10px] text-outline">BIG</span>
                      <div className="font-headline text-lg text-secondary">${(smallBlind * 2).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Personalities Bento */}
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-l-2 border-primary pl-4">
              <span className="material-symbols-outlined text-primary">psychology</span>
              <h2 className="font-headline text-xl font-semibold">AI Archetype Distribution</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {personalities.map((personality) => (
                <div
                  key={personality}
                  className="bg-surface-container-low p-6 rounded-xl border border-white/5 hover:border-primary/20 transition-all duration-500 group relative"
                >
                  <div className="absolute top-4 right-4">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">
                      {personality === 'conservative' ? 'shield' : personality === 'aggressive' ? 'flash_on' : 'visibility'}
                    </span>
                  </div>
                  <h3 className="font-headline text-lg font-bold mb-1">{personalityLabels[personality]}</h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">{personalityDescriptions[personality]}</p>

                  {/* AI Level Selection for each personality slot */}
                  <div className="space-y-4">
                    <label className="text-[10px] text-outline uppercase font-bold tracking-widest">Logic Grade</label>
                    <div className="flex gap-2">
                      {levels.map((level) => {
                        const slotIndex = aiPersonalities.indexOf(personality);
                        const isActive = slotIndex >= 0 && slotIndex < opponentCount && aiLevels[slotIndex] === level && aiPersonalities[slotIndex] === personality;

                        return (
                          <button
                            key={level}
                            onClick={() => {
                              const newPersonalities = [...aiPersonalities];
                              const newLevels = [...aiLevels];

                              // 找到或创建这个 personality 的位置
                              let targetIndex = newPersonalities.indexOf(personality);
                              if (targetIndex === -1 || targetIndex >= opponentCount) {
                                targetIndex = opponentCount - 1;
                              }

                              newPersonalities[targetIndex] = personality;
                              newLevels[targetIndex] = level;

                              setAiPersonalities(newPersonalities);
                              setAiLevels(newLevels);
                            }}
                            className={`flex-1 py-2 rounded text-xs font-bold transition-all ${
                              isActive
                                ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(233,195,73,0.3)]'
                                : 'bg-surface-container-highest hover:bg-primary hover:text-on-primary'
                            }`}
                          >
                            G{level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preview & Summary Column */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="sticky top-32 space-y-6">
            {/* Visual Preview Card */}
            <div className="bg-secondary-container rounded-xl aspect-[4/5] relative overflow-hidden flex items-center justify-center border border-white/5 shadow-2xl">
              <div className="felt-texture absolute inset-0 opacity-[0.03]"></div>
              <div className="absolute inset-0 bg-gradient-to-t from-secondary-container/80 to-transparent"></div>
              <div className="relative z-10 text-center space-y-8 p-8">
                <div className="w-32 h-32 mx-auto rounded-full border-4 border-primary/20 p-2">
                  <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center shadow-[0_0_30px_rgba(233,195,73,0.15)]">
                    <span className="material-symbols-outlined text-4xl text-primary">playing_cards</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-headline text-2xl font-extrabold text-on-secondary">{opponentCount + 1}-Player Ring</h3>
                  <p className="text-xs text-on-secondary-container/80 tracking-[0.2em] uppercase font-semibold">Simulation Pending</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 text-left">
                    <p className="text-[9px] text-secondary-fixed opacity-60 uppercase font-bold tracking-widest">Blind Level</p>
                    <p className="text-sm font-bold text-secondary-fixed">{smallBlind} / {smallBlind * 2}</p>
                  </div>
                  <div className="bg-black/20 backdrop-blur-md rounded-lg p-3 text-left">
                    <p className="text-[9px] text-secondary-fixed opacity-60 uppercase font-bold tracking-widest">Min Buy-In</p>
                    <p className="text-sm font-bold text-secondary-fixed">${aiBuyIn >= 1000 ? `${aiBuyIn / 1000}k` : aiBuyIn}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="space-y-3">
              <button
                onClick={handleStartGame}
                className="w-full py-4 gold-gradient text-on-primary rounded-lg font-headline font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                INITIALIZE SESSION
                <span className="material-symbols-outlined text-xl">play_arrow</span>
              </button>
              <button className="w-full py-4 bg-transparent border border-outline-variant/30 text-on-surface-variant rounded-lg font-headline font-semibold text-sm hover:bg-white/5 transition-all cursor-not-allowed opacity-50">
                SAVE AS TEMPLATE
              </button>
            </div>

            {/* System Readiness */}
            <div className="p-6 bg-surface-container-lowest rounded-xl border border-white/5">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary text-sm">info</span>
                <p className="text-[10px] text-outline uppercase font-black tracking-widest">System Readiness</p>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant">Neural Engine</span>
                  <span className="text-primary font-bold">OPTIMIZED</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-on-surface-variant">Latency Expectation</span>
                  <span className="text-secondary font-bold">&lt; 14ms</span>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </>
  );
}
