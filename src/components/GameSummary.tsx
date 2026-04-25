'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useGame } from '@/lib/GameContext';
import { Navigation } from './Navigation';

export function GameSummary() {
  const router = useRouter();
  const { gameState, resetGame } = useGame();

  const { players, handCount, totalProfit, isVictory, config } = gameState;
  const player = players[0];

  // 计算 ROI
  const initialChips = config.playerBuyIn;
  const roi = initialChips > 0 ? ((totalProfit / initialChips) * 100).toFixed(0) : '0';

  // 计算游戏时长（假设每手2分钟）
  const durationMinutes = handCount * 2;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // 胜利时 AI 对手状态
  const opponents = players.slice(1);

  const handlePlayAgain = () => {
    resetGame();
    router.push('/setup');
  };

  const handleReturnToLobby = () => {
    resetGame();
    router.push('/');
  };

  return (
    <>
      <Navigation currentPage="tables" walletAmount={player.chips} />

      <main className="min-h-screen pt-32 pb-16 px-4 md:px-8 max-w-7xl mx-auto relative">
        {/* Victory Presentation */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"></div>
            <div className="relative w-32 h-32 md:w-48 md:h-48 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-7xl md:text-9xl" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
            </div>
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-headline text-primary tracking-tighter mb-4 uppercase">
            {isVictory ? 'You Won All Chips!' : 'Game Over'}
          </h1>
          <p className="text-on-surface-variant text-lg max-w-2xl">
            {isVictory
              ? 'The table has been cleared. Your strategic dominance has secured the entire pot and cemented your status in the VIP Lounge.'
              : 'Your chips have run out. Study your opponents and come back stronger.'}
          </p>
        </div>

        {/* Bento Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4">
          {/* Primary Chips Won Card */}
          <div className="md:col-span-2 md:row-span-2 bg-surface-container rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
            <div className="relative z-10">
              <span className="text-xs font-bold tracking-[0.2em] text-primary uppercase mb-2 block font-label">Session Profit</span>
              <h2 className="text-6xl font-black font-headline text-on-surface tracking-tighter mb-4">
                ${totalProfit.toLocaleString()}
              </h2>
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined">trending_up</span>
                <span className="font-semibold">+{roi}% ROI</span>
              </div>
            </div>
            <div className="flex gap-1 mt-8">
              {/* Visual representation of chip stacks */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-8 h-4 bg-primary rounded-sm"
                  style={{ opacity: i * 0.2 }}
                />
              ))}
              <div className="w-8 h-20 bg-primary rounded-sm"></div>
            </div>
          </div>

          {/* Duration Card */}
          <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-center border-l-4 border-primary">
            <span className="text-xs font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-1 font-label">Game Duration</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-headline">{durationStr}</span>
              <span className="text-on-surface-variant font-medium">hrs</span>
            </div>
          </div>

          {/* Hand History Card */}
          <div className="bg-surface-container-low rounded-xl p-6 flex flex-col justify-center border-l-4 border-secondary">
            <span className="text-xs font-bold tracking-[0.2em] text-on-surface-variant uppercase mb-1 font-label">Hands Played</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-headline">{handCount}</span>
              <span className="text-on-surface-variant font-medium text-xs">
                {handCount > 0 ? `${Math.round((player.chips / (config.playerBuyIn * players.length)) * 100)}% Win Rate` : ''}
              </span>
            </div>
          </div>

          {/* AI Performance Breakdown */}
          <div className="md:col-span-2 bg-secondary-container felt-texture rounded-xl p-8 relative overflow-hidden">
            <h3 className="text-xl font-bold font-headline text-on-secondary-container mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined">psychology</span>
              AI Opposition Performance
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-secondary-container">Aggressive Bots</span>
                  <span className="text-xs text-on-secondary-container/60">
                    {opponents.filter(o => o.personality === 'aggressive').map(o => o.name).join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-on-secondary-container">{isVictory ? 'Dominated' : 'Active'}</span>
                  <span className="text-xs text-secondary">{isVictory ? '100% Eliminated' : 'In Play'}</span>
                </div>
              </div>
              <div className="h-1 bg-on-secondary-container/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full"></div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-secondary-container">Strategic Bots</span>
                  <span className="text-xs text-on-secondary-container/60">
                    {opponents.filter(o => o.personality === 'opportunistic').map(o => o.name).join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-on-secondary-container">{isVictory ? 'Outplayed' : 'Active'}</span>
                  <span className="text-xs text-secondary">{isVictory ? 'Range Exploited' : 'In Play'}</span>
                </div>
              </div>
              <div className="h-1 bg-on-secondary-container/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-3/4"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="mt-16 flex flex-col md:flex-row items-center justify-center gap-6">
          <button
            onClick={handlePlayAgain}
            className="group relative px-12 py-5 rounded-lg overflow-hidden transform transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 gold-gradient"></div>
            <div className="relative flex items-center gap-3 text-on-primary font-black font-headline uppercase tracking-widest">
              <span>Play Again</span>
              <span className="material-symbols-outlined">replay</span>
            </div>
          </button>
          <button
            onClick={handleReturnToLobby}
            className="px-8 py-5 text-on-surface-variant font-bold font-headline uppercase tracking-widest hover:text-on-surface transition-colors flex items-center gap-2"
          >
            Return to Lobby
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>

        {/* Achievement Carousel */}
        {isVictory && (
          <div className="mt-20 border-t border-white/5 pt-12">
            <h4 className="text-center text-xs font-bold tracking-[0.3em] text-on-surface-variant uppercase mb-8 font-label">Achievements Unlocked</h4>
            <div className="flex flex-wrap justify-center gap-12">
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant group-hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">rocket_launch</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Speed Run</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant group-hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">shield</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Iron Defense</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant group-hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">stars</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">All In Ace</span>
              </div>
              <div className="flex flex-col items-center gap-2 group cursor-pointer">
                <div className="w-16 h-16 rounded-full bg-surface-container-highest flex items-center justify-center border border-outline-variant group-hover:border-primary transition-colors">
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary">workspace_premium</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest">Table Captain</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
