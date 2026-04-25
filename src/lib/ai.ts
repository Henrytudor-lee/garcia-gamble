// AI 决策系统

import { Card, evaluateHand, getRankValue, calculateWinRate, HandRank } from './poker';

export type AIPersonality = 'conservative' | 'aggressive' | 'opportunistic';
export type AILevel = 1 | 2 | 3;

export interface Player {
  id: string;
  name: string;
  seatIndex: number;      // 座位顺序（0 ~ n-1，顺时针）
  chips: number;
  holeCards: Card[];
  isAI: boolean;
  personality?: AIPersonality;
  level?: AILevel;
  isFolded: boolean;
  isAllIn: boolean;
  currentBet: number;     // 本轮已投入筹码
  hasActed: boolean;       // 本轮是否已行动
}

export interface AIAction {
  action: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
}

// 手牌强度评估（0-1）
function evaluateHandStrength(holeCards: Card[], communityCards: Card[]): number {
  if (holeCards.length !== 2) return 0;

  // 预计算手牌强度
  const rank1 = getRankValue(holeCards[0].rank);
  const rank2 = getRankValue(holeCards[1].rank);

  // 口袋对子
  if (rank1 === rank2) {
    const pairValue = rank1 / 14;
    return 0.5 + pairValue * 0.5;
  }

  // 同花
  const suited = holeCards[0].suit === holeCards[1].suit;

  // 连张
  const connected = Math.abs(rank1 - rank2) === 1;

  // 高牌
  const highCard = Math.max(rank1, rank2);
  const lowCard = Math.min(rank1, rank2);

  let strength = 0;

  // 基于高牌的基础强度
  if (highCard >= 14) strength += 0.3; // A
  else if (highCard >= 13) strength += 0.25; // K
  else if (highCard >= 12) strength += 0.2; // Q
  else if (highCard >= 11) strength += 0.15; // J
  else strength += highCard / 100;

  // 同花加成
  if (suited) strength += 0.1;

  // 连张加成
  if (connected) strength += 0.08;

  // 小对子加成
  if (lowCard >= 10 && lowCard === rank1) strength += 0.15;

  // 社区牌影响
  if (communityCards.length > 0) {
    const hand = evaluateHand(holeCards, communityCards);
    // 将手牌rank转换为0-1强度
    strength = hand.rank / 8 + (strength * (8 - hand.rank)) / 8;
  }

  return Math.min(1, Math.max(0, strength));
}

// 获取操作阈值（基于人格和等级）
function getThresholds(personality: AIPersonality, level: AILevel): {
  raiseThreshold: number;
  callThreshold: number;
  bluffProbability: number;
  raiseMultiplier: number;
} {
  const levelFactors = {
    1: { precision: 0.7, aggressiveness: 0.8 },
    2: { precision: 0.85, aggressiveness: 1.0 },
    3: { precision: 1.0, aggressiveness: 1.2 }
  };

  const factors = levelFactors[level];

  switch (personality) {
    case 'conservative':
      return {
        raiseThreshold: 0.7 * factors.precision,
        callThreshold: 0.5 * factors.precision,
        bluffProbability: 0.05 * factors.aggressiveness,
        raiseMultiplier: 2 + factors.aggressiveness
      };
    case 'aggressive':
      return {
        raiseThreshold: 0.45 * factors.precision,
        callThreshold: 0.3 * factors.precision,
        bluffProbability: 0.25 * factors.aggressiveness,
        raiseMultiplier: 3 + factors.aggressiveness
      };
    case 'opportunistic':
      return {
        raiseThreshold: 0.55 * factors.precision,
        callThreshold: 0.4 * factors.precision,
        bluffProbability: 0.15 * factors.aggressiveness,
        raiseMultiplier: 2.5 * factors.aggressiveness
      };
  }
}

// 保守型AI决策
function conservativeAI(
  handStrength: number,
  thresholds: ReturnType<typeof getThresholds>,
  toCall: number,
  minRaise: number,
  maxRaise: number,
  potSize: number,
  myChips: number
): AIAction {
  // 保守型：只玩好牌
  if (handStrength < thresholds.callThreshold) {
    return { action: 'fold' };
  }

  if (toCall === 0) {
    // 没人下注，可以过牌或小额加注
    if (handStrength > thresholds.raiseThreshold && minRaise <= maxRaise) {
      const raiseAmount = Math.min(
        Math.floor(potSize * 0.5),
        maxRaise,
        myChips
      );
      if (raiseAmount >= minRaise) {
        return { action: 'raise', amount: raiseAmount };
      }
    }
    return { action: 'check' };
  }

  // 需要跟注
  if (handStrength >= thresholds.callThreshold) {
    if (handStrength >= thresholds.raiseThreshold && minRaise <= maxRaise) {
      const raiseAmount = Math.min(
        Math.floor(potSize * 0.5),
        maxRaise,
        myChips
      );
      if (raiseAmount >= minRaise) {
        return { action: 'raise', amount: raiseAmount };
      }
    }
    if (toCall >= myChips) {
      return { action: 'all-in' };
    }
    return { action: 'call', amount: toCall };
  }

  return { action: 'fold' };
}

// 激进型AI决策
function aggressiveAI(
  handStrength: number,
  thresholds: ReturnType<typeof getThresholds>,
  toCall: number,
  minRaise: number,
  maxRaise: number,
  potSize: number,
  myChips: number,
  isPreFlop: boolean
): AIAction {
  // 激进型：松凶，喜欢3-bet和诈唬

  // 诈唬检测
  const shouldBluff = Math.random() < thresholds.bluffProbability;

  if (toCall === 0) {
    // 没人下注
    if (shouldBluff || handStrength >= thresholds.raiseThreshold * 0.7) {
      const raiseAmount = Math.min(
        Math.floor(potSize * thresholds.raiseMultiplier * (shouldBluff ? 0.5 : 1)),
        maxRaise,
        myChips
      );
      if (raiseAmount >= minRaise) {
        return { action: 'raise', amount: raiseAmount };
      }
    }
    return { action: 'check' };
  }

  // 需要跟注
  if (shouldBluff && toCall < potSize * 0.3) {
    return { action: 'call', amount: toCall }; // 便宜跟注然后诈唬
  }

  if (handStrength >= thresholds.callThreshold * 0.8) {
    // 3-bet 倾向
    if (minRaise <= maxRaise) {
      const raiseAmount = Math.min(
        Math.floor(potSize * thresholds.raiseMultiplier),
        maxRaise,
        myChips
      );
      if (raiseAmount >= minRaise) {
        return { action: 'raise', amount: raiseAmount };
      }
    }
    if (toCall >= myChips) {
      return { action: 'all-in' };
    }
    return { action: 'call', amount: toCall };
  }

  // 差牌但便宜也可能跟
  if (toCall < potSize * 0.2 && myChips > toCall * 2) {
    return { action: 'call', amount: toCall };
  }

  return { action: 'fold' };
}

// 机会型AI决策
function opportunisticAI(
  handStrength: number,
  thresholds: ReturnType<typeof getThresholds>,
  toCall: number,
  minRaise: number,
  maxRaise: number,
  potSize: number,
  myChips: number,
  communityCards: Card[],
  holeCards: Card[],
  opponentCount: number
): AIAction {
  // 机会型：自适应，根据实际情况调整

  // 计算实际胜率
  const winRate = calculateWinRate(holeCards, communityCards, opponentCount);

  // 基于胜率决策
  const potOdds = toCall / (potSize + toCall);

  // 机会型会考虑底池赔率
  if (winRate > potOdds && winRate > 0.4) {
    // 有底池赔率支持
    if (toCall === 0) {
      const raiseAmount = Math.min(
        Math.floor(potSize * (0.5 + winRate)),
        maxRaise,
        myChips
      );
      if (raiseAmount >= minRaise) {
        return { action: 'raise', amount: raiseAmount };
      }
      return { action: 'check' };
    }

    if (toCall >= myChips) {
      return { action: 'all-in' };
    }
    return { action: 'call', amount: toCall };
  }

  // 中等强度
  if (handStrength >= thresholds.callThreshold) {
    if (toCall === 0) {
      if (handStrength >= thresholds.raiseThreshold && minRaise <= maxRaise) {
        const raiseAmount = Math.min(
          Math.floor(potSize * 0.75),
          maxRaise,
          myChips
        );
        if (raiseAmount >= minRaise) {
          return { action: 'raise', amount: raiseAmount };
        }
      }
      return { action: 'check' };
    }

    if (toCall >= myChips) {
      return { action: 'all-in' };
    }
    return { action: 'call', amount: toCall };
  }

  // 弱牌处理
  if (toCall === 0) {
    return { action: 'check' };
  }

  // 考虑诈唬（转牌/河牌）
  if (communityCards.length >= 3 && handStrength < 0.3) {
    if (Math.random() < thresholds.bluffProbability * (communityCards.length / 5)) {
      if (minRaise <= maxRaise && minRaise < potSize) {
        return { action: 'raise', amount: minRaise };
      }
    }
  }

  return { action: 'fold' };
}

// 主AI决策函数
export function getAIDecision(
  player: Player,
  communityCards: Card[],
  toCall: number,
  minRaise: number,
  maxRaise: number,
  potSize: number,
  isPreFlop: boolean,
  opponentCount: number
): AIAction {
  if (!player.isAI || !player.personality || !player.level) {
    return { action: 'fold' };
  }

  const handStrength = evaluateHandStrength(player.holeCards, communityCards);
  const thresholds = getThresholds(player.personality, player.level);

  switch (player.personality) {
    case 'conservative':
      return conservativeAI(
        handStrength, thresholds, toCall, minRaise, maxRaise, potSize, player.chips
      );
    case 'aggressive':
      return aggressiveAI(
        handStrength, thresholds, toCall, minRaise, maxRaise, potSize, player.chips, isPreFlop
      );
    case 'opportunistic':
      return opportunisticAI(
        handStrength, thresholds, toCall, minRaise, maxRaise, potSize, player.chips,
        communityCards, player.holeCards, opponentCount
      );
  }
}

// 获取AI人格描述
export function getPersonalityDescription(personality: AIPersonality, level: AILevel): string {
  const descriptions = {
    conservative: {
      1: 'Tight-Passive Lv.1',
      2: 'Tight-Passive Lv.2',
      3: 'Tight-Passive Lv.3'
    },
    aggressive: {
      1: 'Loose-Aggressive Lv.1',
      2: 'Loose-Aggressive Lv.2',
      3: 'Loose-Aggressive Lv.3'
    },
    opportunistic: {
      1: 'Adaptive Lv.1',
      2: 'Adaptive Lv.2',
      3: 'Adaptive Lv.3'
    }
  };

  return descriptions[personality][level];
}

// 获取AI名字
const AI_NAMES = {
  conservative: ['ZENITH_v4', 'IRON_WALL', 'STONE_FACE', 'NOVA_PRIME', 'GUARDIAN'],
  aggressive: ['BLAZER', 'STORM_ACE', 'WILD_CARD', 'THUNDER_BOLT', 'RAGE_QUIT'],
  opportunistic: ['ORACLE', 'SHADOW_PRO', 'THEORY_X', 'ADAPT_MASTER', 'GTO_SOLVER']
};

export function getAIName(personality: AIPersonality, index: number): string {
  const names = AI_NAMES[personality];
  return names[index % names.length];
}
