'use client';

import { Card as CardType, getCardDisplay } from '@/lib/poker';

interface CardProps {
  card: CardType | null;
  size?: 'sm' | 'md' | 'lg';
  hidden?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-16 h-24',
  md: 'w-24 h-36',
  lg: 'w-28 h-44'
};

const rankSizes = {
  sm: 'text-xs',
  md: 'text-base',
  lg: 'text-xl'
};

const suitSizes = {
  sm: 'text-sm',
  md: 'text-2xl',
  lg: 'text-4xl'
};

const cornerSuitSizes = {
  sm: 'text-[6px]',
  md: 'text-[10px]',
  lg: 'text-xs'
};

// 真正的扑克牌花色 Unicode 符号
const suitSymbols: Record<string, string> = {
  '♥': '♥',
  '♦': '♦',
  '♣': '♣',
  '♠': '♠'
};

export function Card({ card, size = 'md', hidden = false, className = '' }: CardProps) {
  if (!card) {
    // 空牌位
    return (
      <div
        className={`${sizeClasses[size]} bg-surface-container-low/60 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center ${className}`}
      >
        <span className="text-white/20 text-2xl">+</span>
      </div>
    );
  }

  if (hidden) {
    // 背面 - 简洁设计
    return (
      <div
        className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#252525] to-[#1a1a1a] border-2 border-primary/40 flex items-center justify-center shadow-xl relative overflow-hidden ${className}`}
      >
        {/* 纹理背景 */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23e9c349' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* 中心金色星星 */}
        <span className="material-symbols-outlined text-primary/50" style={{ fontVariationSettings: "'FILL' 1", fontSize: size === 'lg' ? '24px' : '18px' }}>auto_awesome</span>
      </div>
    );
  }

  const display = getCardDisplay(card);
  const isRed = display.color === 'error';
  const suitChar = suitSymbols[display.suit] || display.suit;

  // 牌面颜色：红色用于红心/方块，金色用于黑桃/梅花
  const rankColor = isRed ? '#e74c3c' : '#c9a227';
  const suitColor = isRed ? '#e74c3c' : '#c9a227';

  return (
    <div
      className={`${sizeClasses[size]} rounded-xl bg-gradient-to-br from-[#1e1e1e] to-[#141414] border-2 border-primary/40 flex flex-col p-1.5 shadow-xl relative overflow-hidden ${className}`}
      style={{
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      }}
    >
      {/* 左上角 - 牌值和小花色 */}
      <div className="relative z-10 flex flex-col items-start leading-none">
        <span className={`${rankSizes[size]} font-black font-headline`} style={{ color: rankColor }}>
          {display.rank}
        </span>
        <span className={cornerSuitSizes[size]} style={{ color: suitColor, fontFamily: 'serif' }}>
          {suitChar}
        </span>
      </div>

      {/* 中央大花色 */}
      <div className="flex-grow flex items-center justify-center relative z-10">
        <span className={`${suitSizes[size]}`} style={{ color: suitColor, fontFamily: 'serif', lineHeight: 1 }}>
          {suitChar}
        </span>
      </div>

      {/* 右下角 - 翻转的牌值和小花色 */}
      <div className="relative z-10 flex flex-col items-end justify-end leading-none self-end rotate-180">
        <span className={`${rankSizes[size]} font-black font-headline`} style={{ color: rankColor }}>
          {display.rank}
        </span>
        <span className={cornerSuitSizes[size]} style={{ color: suitColor, fontFamily: 'serif' }}>
          {suitChar}
        </span>
      </div>
    </div>
  );
}

interface CardHandProps {
  cards: [CardType | null, CardType | null];
  size?: 'md' | 'lg';
  hidden?: boolean;
  className?: string;
}

export function CardHand({ cards, size = 'md', hidden = false, className = '' }: CardHandProps) {
  return (
    <div className={`flex items-end -space-x-4 ${className}`}>
      <Card card={cards[0]} size={size} hidden={hidden} className="transform -rotate-6 hover:-translate-y-3 hover:-rotate-3 transition-all duration-300 cursor-pointer" />
      <Card card={cards[1]} size={size} hidden={hidden} className="transform rotate-6 hover:-translate-y-3 hover:-rotate-3 transition-all duration-300 cursor-pointer" />
    </div>
  );
}

interface CommunityCardsProps {
  cards: CardType[];
  size?: 'md' | 'lg';
  className?: string;
}

export function CommunityCards({ cards, size = 'md', className = '' }: CommunityCardsProps) {
  const allCards: (CardType | null)[] = [...cards];
  while (allCards.length < 5) {
    allCards.push(null);
  }

  return (
    <div className={`flex space-x-3 items-center ${className}`}>
      {allCards.map((card, index) => (
        <Card
          key={index}
          card={card}
          size={size}
          hidden={false}
        />
      ))}
    </div>
  );
}
