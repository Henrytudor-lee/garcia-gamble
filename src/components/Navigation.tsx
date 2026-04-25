'use client';

import Link from 'next/link';

interface NavigationProps {
  showWallet?: boolean;
  walletAmount?: number;
  currentPage?: 'lobby' | 'tables' | 'career' | 'vault';
}

export function Navigation({ showWallet = true, walletAmount = 0, currentPage = 'lobby' }: NavigationProps) {
  return (
    <>
      {/* Top Navigation */}
      <header className="fixed top-0 z-50 w-full h-20 px-8 flex justify-between items-center bg-[#131313]/90 backdrop-blur-md shadow-2xl">
        <div className="flex items-center gap-12">
          <Link href="/" className="text-xl font-black tracking-widest text-[#e9c349] uppercase font-headline">
            HIGH-STAKES DIGITAL
          </Link>
          <nav role="navigation" aria-label="Main navigation" className="hidden md:flex gap-8 items-center">
            <Link
              href="/"
              className={`font-headline text-sm tracking-tight pb-1 ${
                currentPage === 'lobby'
                  ? 'text-[#e9c349] border-b-2 border-[#e9c349]'
                  : 'text-[#e5e2e1]/60 hover:text-[#e5e2e1]'
              } transition-colors`}
            >
              Lobby
            </Link>
            <Link
              href="/setup"
              className={`font-headline text-sm tracking-tight pb-1 ${
                currentPage === 'tables'
                  ? 'text-[#e9c349] border-b-2 border-[#e9c349]'
                  : 'text-[#e5e2e1]/60 hover:text-[#e5e2e1]'
              } transition-colors`}
            >
              Tables
            </Link>
            <span className="text-[#e5e2e1]/60 hover:text-[#e5e2e1] transition-colors font-headline text-sm tracking-tight cursor-not-allowed opacity-50">
              Career
            </span>
            <span className="text-[#e5e2e1]/60 hover:text-[#e5e2e1] transition-colors font-headline text-sm tracking-tight cursor-not-allowed opacity-50">
              Vault
            </span>
          </nav>
        </div>
        {showWallet && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-outline-variant/20">
              <span className="material-symbols-outlined text-primary scale-75">account_balance_wallet</span>
              <span className="font-headline font-bold text-primary">${walletAmount.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 text-[#e5e2e1]/60 hover:bg-white/5 transition-all rounded-full scale-95 active:scale-100">
                <span className="material-symbols-outlined">settings</span>
              </button>
              <button className="p-1 border-2 border-primary/30 rounded-full scale-95 active:scale-100 transition-transform">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-sm">person</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Side Navigation */}
      <aside className="hidden lg:flex flex-col h-full bg-gradient-to-r from-[#1a1a1a] to-[#131313] w-64 fixed left-0 top-0 pt-24 shadow-[10px_0_30px_rgba(0,0,0,0.5)] border-r border-white/5 z-40">
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
            </div>
            <div>
              <div className="text-[#e9c349] font-bold font-headline text-sm">VIP Lounge</div>
              <div className="text-on-surface-variant text-xs font-medium">Elite Tier</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-4 bg-[#29513f] text-[#e9c349] rounded-r-full mr-4 pl-6 py-3 border-l-4 border-[#e9c349] transition-all font-headline text-sm font-medium"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>style</span>
            Live Tables
          </Link>
          <span className="flex items-center gap-4 text-[#e5e2e1]/40 pl-10 py-3 font-headline text-sm font-medium cursor-not-allowed opacity-50">
            <span className="material-symbols-outlined">psychology</span>
            AI Training
          </span>
          <span className="flex items-center gap-4 text-[#e5e2e1]/40 pl-10 py-3 font-headline text-sm font-medium cursor-not-allowed opacity-50">
            <span className="material-symbols-outlined">trophy</span>
            Tournaments
          </span>
          <span className="flex items-center gap-4 text-[#e5e2e1]/40 pl-10 py-3 font-headline text-sm font-medium cursor-not-allowed opacity-50">
            <span className="material-symbols-outlined">history</span>
            Hand History
          </span>
        </nav>
        <div className="p-6 mt-auto border-t border-white/5">
          <Link
            href="/setup"
            className="block w-full py-3 bg-white/5 hover:bg-white/10 text-on-surface rounded-xl font-headline text-sm font-bold transition-all mb-4 text-center"
          >
            Quick Start
          </Link>
          <div className="space-y-4">
            <span className="flex items-center gap-4 text-[#e5e2e1]/40 hover:text-[#e5e2e1] text-xs transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">help</span>
              Support
            </span>
            <span className="flex items-center gap-4 text-[#e5e2e1]/40 hover:text-[#e5e2e1] text-xs transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-sm">gavel</span>
              Legal
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
