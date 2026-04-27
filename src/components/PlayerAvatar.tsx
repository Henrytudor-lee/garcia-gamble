'use client';

import { clsx } from 'clsx';

/**
 * PlayerAvatar with flowing gradient border animation
 * 
 * Animation: A gradient line segment flows counter-clockwise 
 * around the avatar container edge when waiting for player action.
 * 
 * Based on impeccable animate principles:
 * - GPU-accelerated (transform + opacity only)
 * - 60fps smooth animation
 * - prefers-reduced-motion support
 */
interface PlayerAvatarProps {
  name: string;
  isAI?: boolean;
  isFolded?: boolean;
  isAllIn?: boolean;
  isWaiting?: boolean;
  chips: number;
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean; // Show name badge (only for player, not AI opponents)
  className?: string;
}

const sizeConfig = {
  sm: { container: 'w-14 h-14', icon: 'text-lg', badge: 'text-[8px]' },
  md: { container: 'w-16 h-16', icon: 'text-xl', badge: 'text-[10px]' },
  lg: { container: 'w-20 h-20', icon: 'text-2xl', badge: 'text-xs' },
};

export function PlayerAvatar({
  name,
  isAI = false,
  isFolded = false,
  isAllIn = false,
  isWaiting = false,
  chips,
  size = 'md',
  showBadge = true,
  className,
}: PlayerAvatarProps) {
  const sizes = sizeConfig[size];
  // Approximate path length for rounded rect: 4 sides + 4 corner arcs
  // For 64x64 with rx=12: ~208px perimeter
  const PATH_LENGTH = 208;
  // Visible gradient segment length (px)
  const SEGMENT_LENGTH = 48;
  // Animation duration (slower for elegance, ~2.5s per rotation)
  const DURATION = 2.5;

  return (
    <div className={clsx('relative', className)}>
      {/* Waiting indicator glow */}
      {isWaiting && (
        <div className="absolute inset-0 rounded-2xl bg-primary/20 animate-pulse" />
      )}
      
      {/* Avatar container */}
      <div
        className={clsx(
          'relative rounded-2xl border-4 overflow-hidden',
          'flex items-center justify-center',
          'shadow-lg transition-shadow duration-200',
          isFolded
            ? 'border-surface-container-high opacity-50'
            : isWaiting
            ? 'border-primary shadow-[0_0_20px_rgba(233,195,73,0.4)]'
            : 'border-surface-container-high',
          sizes.container
        )}
      >
        {/* Avatar icon */}
        <span
          className={clsx(
            'material-symbols-outlined',
            isFolded ? 'text-on-surface-variant/50' : 'text-primary',
            sizes.icon
          )}
        >
          {isAI ? 'smart_toy' : 'person'}
        </span>

        {/* SVG flowing gradient border animation */}
        {isWaiting && (
          <svg
            className="absolute inset-[-4px] w-[calc(100%+8px)] h-[calc(100%+8px)] overflow-visible pointer-events-none"
            viewBox="0 0 64 64"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Gradient with gold/amber tones - fades at edges for elegant segment look */}
              <linearGradient
                id={`flowing-gradient-${name.replace(/\s+/g, '-')}`}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="64"
                y2="64"
              >
                <stop offset="0%" stopColor="#e9c349" stopOpacity="0" />
                <stop offset="35%" stopColor="#e9c349" stopOpacity="1" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="65%" stopColor="#e9c349" stopOpacity="1" />
                <stop offset="100%" stopColor="#e9c349" stopOpacity="0" />
              </linearGradient>

              {/* Glow filter for the gradient segment */}
              <filter id={`glow-${name.replace(/\s+/g, '-')}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* 
              Rounded rectangle path matching avatar border
              M = move to top-left corner start
              L = line to
              A = arc (rx ry x-axis-rotation large-arc-flag sweep-flag x y)
              Clockwise path starting from top-left, going clockwise
            */}
            <path
              d="M 12,2 L 52,2 A 10,10 0 0 1 62,12 L 62,52 A 10,10 0 0 1 52,62 L 12,62 A 10,10 0 0 1 2,52 L 2,12 A 10,10 0 0 1 12,2 Z"
              fill="none"
              stroke={`url(#flowing-gradient-${name.replace(/\s+/g, '-')})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              filter={`url(#glow-${name.replace(/\s+/g, '-')})`}
              strokeDasharray={`${SEGMENT_LENGTH} ${PATH_LENGTH}`}
              // Counter-clockwise: dashoffset starts at 0 (segment at path start)
              // Animating to -PATH_LENGTH moves segment backward (counter-clockwise)
              style={{
                strokeDashoffset: 0,
                animation: `flowing-border-counter-clockwise ${DURATION}s linear infinite`,
              }}
            />
          </svg>
        )}

        {/* ALL-IN badge */}
        {isAllIn && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-error text-white px-2 py-0.5 rounded font-black text-[8px]">
            ALL-IN
          </div>
        )}
      </div>

      {/* Name badge - only show for player (non-AI) or when explicitly requested */}
      {showBadge && !isFolded && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-20 glass-panel px-3 py-0.5 rounded-full border border-primary/30 shadow-lg">
          <span className={clsx(sizes.badge, 'font-headline font-black text-primary tracking-wider uppercase')}>
            {name}
          </span>
        </div>
      )}
    </div>
  );
}