'use client';

import Link from 'next/link';
import { Navigation } from './Navigation';

export function Lobby() {
  return (
    <>
      <Navigation currentPage="lobby" showWallet={false} />

      {/* Main Content Canvas */}
      <main role="main" className="lg:pl-64 pt-20 min-h-screen relative overflow-hidden">
        {/* Hero Background Section */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10"></div>
          <div
            className="w-full h-full object-cover opacity-40 scale-105 blur-sm"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800'%3E%3Crect fill='%231a1a1a'/%3E%3C/svg%3E")`,
              backgroundSize: 'cover'
            }}
          />
        </div>

        <div className="relative z-20 px-8 lg:px-16 py-12 flex flex-col justify-center min-h-[calc(100vh-80px)]">
          {/* Animated Hero Content */}
          <div className="max-w-4xl space-y-8">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary font-headline text-xs font-bold tracking-widest uppercase">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                High Roller Season IV
              </span>
              <h1 className="text-6xl md:text-8xl font-black font-headline tracking-tighter text-on-surface leading-none">
                OWN THE <br /> <span className="text-primary italic">TABLE.</span>
              </h1>
            </div>
            <p className="text-xl text-on-surface-variant max-w-xl font-body leading-relaxed">
              Step into the world's most exclusive digital arena. Master the art of the bluff across ultra-stakes tables and global tournaments.
            </p>
            <div className="flex flex-wrap items-center gap-6 pt-4">
              <Link
                href="/setup"
                className="group relative px-10 py-5 rounded-xl gold-gradient text-on-primary font-headline font-extrabold text-xl shadow-[0_10px_40px_rgba(233,195,73,0.3)] hover:shadow-[0_15px_50px_rgba(233,195,73,0.5)] transition-all active:scale-95 flex items-center gap-3"
              >
                Play Now
                <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
              </Link>
              <div className="flex gap-4">
                <button className="px-8 py-5 rounded-xl bg-surface-container-high/40 backdrop-blur-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all font-headline font-bold text-on-surface flex items-center gap-3 cursor-not-allowed opacity-50">
                  <span className="material-symbols-outlined text-primary">school</span>
                  Tutorial
                </button>
                <button className="px-8 py-5 rounded-xl bg-surface-container-high/40 backdrop-blur-xl border border-outline-variant/20 hover:bg-surface-container-highest transition-all font-headline font-bold text-on-surface flex items-center gap-3 cursor-not-allowed opacity-50">
                  <span className="material-symbols-outlined text-primary">analytics</span>
                  Stats
                </button>
              </div>
            </div>
          </div>

          {/* Bento Grid - Lobby Status */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Live Tables Card */}
            <div className="relative overflow-hidden group p-8 bg-surface-container-low rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <div className="noise-overlay absolute inset-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary">dashboard</span>
                  <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">LIVE NOW</span>
                </div>
                <h3 className="font-headline font-bold text-2xl mb-2">Texas Hold'em</h3>
                <p className="text-on-surface-variant text-sm mb-6">142 Active tables currently playing. Entry from $50 to $10,000.</p>
                <div className="flex -space-x-3 mb-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-surface-container-low bg-surface-variant flex items-center justify-center text-[10px] font-bold">
                      {String.fromCharCode(65 + i)}
                    </div>
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-surface-container-low bg-surface-variant flex items-center justify-center text-[10px] font-bold">+89</div>
                </div>
                <Link
                  href="/setup"
                  className="block w-full py-3 bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 rounded-lg font-headline font-bold text-sm transition-all text-center"
                >
                  Browse Tables
                </Link>
              </div>
            </div>

            {/* Daily Challenge Card */}
            <div className="relative overflow-hidden group p-8 bg-surface-container-low rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <div className="noise-overlay absolute inset-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="material-symbols-outlined text-4xl text-secondary">military_tech</span>
                  <span className="text-xs font-bold text-secondary px-2 py-1 bg-secondary/10 rounded">DAILY</span>
                </div>
                <h3 className="font-headline font-bold text-2xl mb-2">The Royal Quest</h3>
                <p className="text-on-surface-variant text-sm mb-6">Win 5 hands with a Flush or better to unlock the Gold Card back.</p>
                <div className="w-full bg-surface-variant h-2 rounded-full mb-2 overflow-hidden">
                  <div className="bg-secondary h-full w-3/5"></div>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-on-surface-variant mb-6 uppercase tracking-widest">
                  <span>Progress: 3/5</span>
                  <span>6h Remaining</span>
                </div>
                <button className="w-full py-3 bg-secondary/5 hover:bg-secondary/10 text-secondary border border-secondary/20 rounded-lg font-headline font-bold text-sm transition-all cursor-not-allowed opacity-50">
                  View Missions
                </button>
              </div>
            </div>

            {/* Pro Circuit Card */}
            <div className="relative overflow-hidden group p-8 bg-surface-container-low rounded-2xl border border-white/5 hover:border-primary/30 transition-all bg-gradient-to-br from-surface-container-low to-primary-container/10">
              <div className="noise-overlay absolute inset-0"></div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                </div>
                <h3 className="font-headline font-bold text-2xl mb-2">Monte Carlo Cup</h3>
                <p className="text-on-surface-variant text-sm mb-6">Register for the biggest tournament of the week. $2M Guaranteed.</p>
                <div className="py-4 border-y border-white/5 flex justify-between items-center mb-6">
                  <div className="text-center">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-tighter">Buy-in</div>
                    <div className="font-headline font-black text-primary">$1,500</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-on-surface-variant uppercase font-bold tracking-tighter">Players</div>
                    <div className="font-headline font-black text-on-surface">842/1000</div>
                  </div>
                </div>
                <button className="w-full py-3 bg-primary text-on-primary rounded-lg font-headline font-extrabold text-sm transition-all cursor-not-allowed opacity-50">
                  Register Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FAB for Quick Actions */}
      <Link
        href="/setup"
        className="fixed bottom-10 right-10 z-50 w-16 h-16 bg-primary rounded-full shadow-[0_10px_30px_rgba(233,195,73,0.4)] flex items-center justify-center text-on-primary group hover:scale-110 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
        <span className="absolute right-full mr-4 px-3 py-1 bg-surface-container-highest text-on-surface text-xs font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Create Private Table</span>
      </Link>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 h-14 bg-[#131313]/90 backdrop-blur-md border-t border-white/5 flex items-center justify-center z-30">
        <div className="flex items-center gap-6 text-[#e5e2e1]/40">
          <span className="font-headline text-xs">© 2026 High-Stakes Digital</span>
          <span className="font-headline text-xs">|</span>
          <span className="font-headline text-xs cursor-pointer hover:text-[#e5e2e1]/60 transition-colors">Terms</span>
          <span className="font-headline text-xs">|</span>
          <span className="font-headline text-xs cursor-pointer hover:text-[#e5e2e1]/60 transition-colors">Privacy</span>
          <span className="font-headline text-xs">|</span>
          <span className="font-headline text-xs cursor-pointer hover:text-[#e5e2e1]/60 transition-colors">Support</span>
        </div>
      </footer>
    </>
  );
}
