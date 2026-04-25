// 德州扑克核心逻辑

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface HandRank {
  name: string;
  rank: number;
  value: number; // 用于比较相同rank的手牌
  kickers?: number[]; // 踢脚牌
}

// 牌面值
const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// 创建一副牌
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }

  return deck;
}

// 洗牌
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 发牌
export function dealCards(deck: Card[], count: number): { cards: Card[]; remaining: Card[] } {
  const cards = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { cards, remaining };
}

// 获取牌面值（用于比较）
export function getRankValue(rank: Rank): number {
  return RANK_VALUES[rank];
}

// 检查是否是同花
export function isFlush(cards: Card[]): boolean {
  if (cards.length < 5) return false;
  const suit = cards[0].suit;
  return cards.every(card => card.suit === suit);
}

// 检查是否是顺子
export function isStraight(sortedValues: number[]): boolean {
  if (sortedValues.length < 5) return false;

  // 去重
  const unique = [...new Set(sortedValues)].sort((a, b) => a - b);

  if (unique.length < 5) return false;

  // 检查A-2-3-4-5特殊情况
  if (unique.length === 5) {
    const min = unique[0];
    const max = unique[4];

    // A-2-3-4-5
    if (max === 14 && min === 2) {
      const withoutAce = unique.slice(1);
      if (withoutAce[withoutAce.length - 1] - withoutAce[0] === 3) {
        return true;
      }
    }

    // 普通顺子
    if (max - min === 4) {
      return true;
    }
  }

  return false;
}

// 获取同花顺检查（需要5张牌）
export function isStraightFlush(cards: Card[]): boolean {
  return isFlush(cards) && isStraight(cards.map(c => getRankValue(c.rank)));
}

// 计算手牌强度 - 返回 HandRank
export function evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank {
  const allCards = [...holeCards, ...communityCards];

  // 枚举所有5张牌的组合
  const combinations = getCombinations(allCards, 5);
  let bestHand: HandRank = { name: 'High Card', rank: 0, value: 0 };

  for (const combo of combinations) {
    const hand = evaluateFiveCards(combo);
    if (hand.rank > bestHand.rank || (hand.rank === bestHand.rank && hand.value > bestHand.value)) {
      bestHand = hand;
    }
  }

  return bestHand;
}

// 评估5张牌的手牌强度
function evaluateFiveCards(cards: Card[]): HandRank {
  const values = cards.map(c => getRankValue(c.rank)).sort((a, b) => b - a);
  const suits = cards.map(c => c.suit);

  const flush = isFlush(cards);
  const straight = isStraight(values);
  const straightFlush = flush && straight;

  // 统计每个点数的数量
  const valueCounts: Record<number, number> = {};
  for (const v of values) {
    valueCounts[v] = (valueCounts[v] || 0) + 1;
  }
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const sortedValues = Object.keys(valueCounts).map(Number).sort((a, b) => {
    // 优先按数量排序，其次按点数排序
    const countDiff = (valueCounts[b] || 0) - (valueCounts[a] || 0);
    if (countDiff !== 0) return countDiff;
    return b - a;
  });

  // 计算手牌值（用于比较相同rank的手牌）
  const calcValue = (kickers: number[] = []): number => {
    let v = 0;
    for (let i = 0; i < sortedValues.length; i++) {
      v += sortedValues[i] * Math.pow(15, 4 - i);
    }
    for (let i = 0; i < kickers.length; i++) {
      v += kickers[i] * Math.pow(15, 3 - i);
    }
    return v;
  };

  // 同花顺
  if (straightFlush) {
    // 检查A-2-3-4-5
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
      return { name: 'Straight Flush', rank: 8, value: calcValue([5, 4, 3, 2, 1]) };
    }
    return { name: 'Straight Flush', rank: 8, value: calcValue() };
  }

  // 四条
  if (counts[0] === 4) {
    const kicker = sortedValues.find(v => valueCounts[v] === 1) || 0;
    return { name: 'Four of a Kind', rank: 7, value: calcValue([kicker]) };
  }

  // 葫芦
  if (counts[0] === 3 && counts[1] === 2) {
    return { name: 'Full House', rank: 6, value: calcValue() };
  }

  // 同花
  if (flush) {
    return { name: 'Flush', rank: 5, value: calcValue() };
  }

  // 顺子
  if (straight) {
    if (values[0] === 14 && values[1] === 5 && values[2] === 4 && values[3] === 3 && values[4] === 2) {
      return { name: 'Straight', rank: 4, value: calcValue([5, 4, 3, 2, 1]) };
    }
    return { name: 'Straight', rank: 4, value: calcValue() };
  }

  // 三条
  if (counts[0] === 3) {
    const kickers = sortedValues.filter(v => valueCounts[v] === 1);
    return { name: 'Three of a Kind', rank: 3, value: calcValue(kickers) };
  }

  // 两对
  if (counts[0] === 2 && counts[1] === 2) {
    const kicker = sortedValues.find(v => valueCounts[v] === 1) || 0;
    return { name: 'Two Pair', rank: 2, value: calcValue([kicker]) };
  }

  // 一对
  if (counts[0] === 2) {
    const kickers = sortedValues.filter(v => valueCounts[v] === 1);
    return { name: 'One Pair', rank: 1, value: calcValue(kickers) };
  }

  // 高牌
  return { name: 'High Card', rank: 0, value: calcValue() };
}

// 获取组合
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === 1) return arr.map(el => [el]);
  if (k === arr.length) return [arr];
  if (k > arr.length) return [];

  const result: T[][] = [];

  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i];
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1);
    for (const combo of tailCombos) {
      result.push([head, ...combo]);
    }
  }

  return result;
}

// 比较两手牌 返回 1表示hand1赢，-1表示hand2赢，0表示平手
export function compareHands(hand1: HandRank, hand2: HandRank): number {
  if (hand1.rank !== hand2.rank) {
    return hand1.rank > hand2.rank ? 1 : -1;
  }
  if (hand1.value !== hand2.value) {
    return hand1.value > hand2.value ? 1 : -1;
  }
  return 0;
}

// 计算胜率（简化版）
export function calculateWinRate(holeCards: Card[], communityCards: Card[], opponentCount: number): number {
  // Monte Carlo 模拟
  const simulations = 500;
  let wins = 0;

  const deck = createDeck();

  // 移除已知的牌
  const knownCards = [...holeCards, ...communityCards];
  const remainingDeck = deck.filter(c =>
    !knownCards.some(kc => kc.suit === c.suit && kc.rank === c.rank)
  );

  for (let i = 0; i < simulations; i++) {
    const simDeck = shuffleDeck([...remainingDeck]);
    const simCommunity = [...communityCards];

    // 补全公共牌
    while (simCommunity.length < 5) {
      simCommunity.push(simDeck.pop()!);
    }

    // 为对手生成手牌
    const opponents: Card[][] = [];
    for (let j = 0; j < opponentCount; j++) {
      opponents.push([simDeck.pop()!, simDeck.pop()!]);
    }

    // 评估玩家手牌
    const playerHand = evaluateHand(holeCards, simCommunity);

    // 检查是否是最强的
    let isWin = true;
    for (const opp of opponents) {
      const oppHand = evaluateHand(opp, simCommunity);
      if (compareHands(oppHand, playerHand) > 0) {
        isWin = false;
        break;
      }
    }

    if (isWin) wins++;
  }

  return wins / simulations;
}

// 获取手牌描述
export function getHandDescription(hand: HandRank): string {
  switch (hand.name) {
    case 'Straight Flush': return 'Straight Flush';
    case 'Four of a Kind': return 'Four of a Kind';
    case 'Full House': return 'Full House';
    case 'Flush': return 'Flush';
    case 'Straight': return 'Straight';
    case 'Three of a Kind': return 'Three of a Kind';
    case 'Two Pair': return 'Two Pair';
    case 'One Pair': return 'One Pair';
    default: return 'High Card';
  }
}

// 牌面显示
export function getCardDisplay(card: Card): { rank: string; suit: string; color: string } {
  const suitSymbols: Record<Suit, string> = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  };

  // 转换内部记号为显示字符
  const rankDisplay: Record<Rank, string> = {
    '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8',
    '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'
  };

  const color = card.suit === 'hearts' || card.suit === 'diamonds' ? 'error' : 'on-surface';

  return {
    rank: rankDisplay[card.rank],
    suit: suitSymbols[card.suit],
    color
  };
}
