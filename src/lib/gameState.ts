// 德州扑克游戏状态管理 - 按照 game_logic.md 规范实现

import { Card, createDeck, shuffleDeck, evaluateHand, compareHands } from './poker';
import { Player, AIPersonality, AILevel, getAIDecision, getAIName, getPersonalityDescription } from './ai';

export type BettingType = 'limit' | 'no-limit';
export type GamePhase = 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'END' | 'SETUP';

export interface GameConfig {
  opponentCount: number;
  playerBuyIn: number;
  aiBuyIn: number;
  bettingType: BettingType;
  smallBlind: number;
  bigBlind: number;
  aiPersonalities: AIPersonality[];
  aiLevels: AILevel[];
}

export interface GameState {
  config: GameConfig;
  players: Player[];
  dealerIndex: number;        // 庄家按钮位置
  smallBlindIndex: number;     // 小盲注位置
  bigBlindIndex: number;       // 大盲注位置

  deck: Card[];
  communityCards: Card[];      // 公共牌（0~5张）
  burnedCards: Card[];         // 已丢弃的牌

  pot: number;                 // 主池
  sidePots: number[];          // 边池

  currentBet: number;         // 当前轮最高下注
  minRaise: number;            // 最小加注额

  phase: GamePhase;
  actionIndex: number;         // 当前行动玩家 seatIndex
  isPlayerTurn: boolean;

  winner: Player | null;
  isGameOver: boolean;
  isVictory: boolean;
  handCount: number;
  totalProfit: number;
  lastPotWon: number;
  showdownHands: { player: Player; hand: ReturnType<typeof evaluateHand>; holeCards: Card[] }[];
}

export interface GameAction {
  type: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
}

// 初始配置
export const DEFAULT_CONFIG: GameConfig = {
  opponentCount: 5,
  playerBuyIn: 10000,
  aiBuyIn: 10000,
  bettingType: 'no-limit',
  smallBlind: 50,
  bigBlind: 100,
  aiPersonalities: ['conservative', 'aggressive', 'opportunistic', 'conservative', 'aggressive', 'opportunistic', 'conservative', 'aggressive'],
  aiLevels: [2, 2, 2, 1, 3, 1, 2, 3]
};

// 创建玩家
function createPlayers(config: GameConfig): Player[] {
  const players: Player[] = [];

  // 玩家（位置0）
  players.push({
    id: 'player',
    name: 'You',
    seatIndex: 0,
    chips: config.playerBuyIn,
    holeCards: [],
    isAI: false,
    isFolded: false,
    isAllIn: false,
    currentBet: 0,
    hasActed: false
  });

  // AI玩家
  for (let i = 0; i < config.opponentCount; i++) {
    players.push({
      id: `ai_${i}`,
      name: getAIName(config.aiPersonalities[i], i),
      seatIndex: i + 1,
      chips: config.aiBuyIn,
      holeCards: [],
      isAI: true,
      personality: config.aiPersonalities[i],
      level: config.aiLevels[i],
      isFolded: false,
      isAllIn: false,
      currentBet: 0,
      hasActed: false
    });
  }

  return players;
}

// 初始化游戏
export function initGame(config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    config,
    players: createPlayers(config),
    dealerIndex: -1,
    smallBlindIndex: -1,
    bigBlindIndex: -1,
    deck: [],
    communityCards: [],
    burnedCards: [],
    pot: 0,
    sidePots: [],
    currentBet: 0,
    minRaise: config.bigBlind,
    phase: 'SETUP',
    actionIndex: 0,
    isPlayerTurn: false,
    winner: null,
    isGameOver: false,
    isVictory: false,
    handCount: 0,
    totalProfit: 0,
    lastPotWon: 0,
    showdownHands: []
  };
}

// 发牌 - 从庄家左手边开始，顺时针发牌
function dealCardsInOrder(state: GameState, count: number): void {
  // 从庄家左手边开始（庄家后第一位）
  const startIndex = (state.dealerIndex + 1) % state.players.length;

  for (let c = 0; c < count; c++) {
    for (let i = 0; i < state.players.length; i++) {
      const playerIndex = (startIndex + i) % state.players.length;
      if (state.deck.length > 0) {
        state.players[playerIndex].holeCards.push(state.deck.pop()!);
      }
    }
  }
}

// 下盲注
function postBlinds(state: GameState): void {
  const sb = state.config.smallBlind;
  const bb = state.config.bigBlind;

  // 小盲
  const sbPlayer = state.players[state.smallBlindIndex];
  const sbAmount = Math.min(sb, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;

  // 大盲
  const bbPlayer = state.players[state.bigBlindIndex];
  const bbAmount = Math.min(bb, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;

  state.pot += sbAmount + bbAmount;
  state.currentBet = bbAmount; // 大盲下注为当前最高
}

// 获取需要跟注的金额
function getToCall(state: GameState, player: Player): number {
  return Math.max(0, state.currentBet - player.currentBet);
}

// 获取最小加注额（至少是 currentBet + minRaise）
function getMinRaiseAmount(state: GameState): number {
  if (state.config.bettingType === 'limit') {
    return state.currentBet > 0 ? state.currentBet * 2 : state.config.bigBlind;
  } else {
    // 无限注：至少是当前下注的两倍
    return state.currentBet > 0 ? state.currentBet * 2 : state.config.bigBlind * 2;
  }
}

// 获取最大加注额
function getMaxRaiseAmount(state: GameState, player: Player): number {
  return player.chips;
}

// 检查下注轮是否结束
function isBettingRoundComplete(state: GameState): boolean {
  // 获取所有未弃牌玩家（包括全下的 - 全下玩家也算活跃）
  const activePlayers = state.players.filter(p => !p.isFolded);

  // 只有1人或0人，轮次结束
  if (activePlayers.length <= 1) {
    return true;
  }

  // 获取还能继续下注的玩家（未弃牌且未全下）
  const canStillBetPlayers = state.players.filter(p => !p.isFolded && !p.isAllIn);
  // 获取所有活跃玩家（包括全下的）- 用于检测是否还有人需要下注
  const allActivePlayers = state.players.filter(p => !p.isFolded);

  // 所有还能下注的玩家的 currentBet 都相等
  // 注意：all-in 玩家的 bet 不会重置（resetBettingRound 时不重置他们的 bet），
  // 所以不能把他们算进 allHaveEqualBet 检查
  const allHaveEqualBet = canStillBetPlayers.length === 0 ||
    canStillBetPlayers.every(p => p.currentBet === state.currentBet);

  // 所有还能下注的玩家都已行动（已行动或已全下）
  const allCanBetPlayersActed = canStillBetPlayers.length === 0 ||
    canStillBetPlayers.every(p => p.hasActed || p.isAllIn);

  // 全下玩家也算已行动
  const allActivePlayersActed = allActivePlayers.length <= 1 ||
    allActivePlayers.every(p => p.hasActed || p.isAllIn);

  return allHaveEqualBet && (allCanBetPlayersActed || allActivePlayersActed);
}

// 获取下一个未弃牌且有筹码的玩家索引
function getNextActivePlayerIndex(state: GameState, fromIndex: number): number {
  const n = state.players.length;

  for (let i = 1; i <= n; i++) {
    const nextIndex = (fromIndex + i) % n;
    const player = state.players[nextIndex];
    if (!player.isFolded && player.chips > 0) {
      return nextIndex;
    }
  }

  return -1; // 没有活跃玩家
}

// 获取第一个行动玩家（庄家左手边未弃牌玩家）
function getFirstActorIndex(state: GameState): number {
  return getNextActivePlayerIndex(state, state.dealerIndex);
}

// 重置本轮下注状态
function resetBettingRound(state: GameState): void {
  for (const player of state.players) {
    player.currentBet = 0;
    player.hasActed = false;
  }
  state.currentBet = 0;
  state.minRaise = state.config.bigBlind;
}

// 开始新手牌
export function startNewHand(state: GameState): GameState {
  // 庄家移位
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;

  // 确定盲注位置
  state.smallBlindIndex = (state.dealerIndex + 1) % state.players.length;
  state.bigBlindIndex = (state.dealerIndex + 2) % state.players.length;

  // 重置玩家状态（保留筹码）
  for (const player of state.players) {
    player.holeCards = [];
    player.isFolded = false;
    player.isAllIn = false;
    player.currentBet = 0;
    player.hasActed = false;
  }

  // 重置公共牌
  state.communityCards = [];
  state.burnedCards = [];
  state.showdownHands = [];

  // 重置下注状态
  state.pot = 0;
  state.sidePots = [];
  state.currentBet = 0;

  // 洗牌并发牌
  state.deck = shuffleDeck(createDeck());
  dealCardsInOrder(state, 2); // 每人2张底牌

  // 下盲注
  postBlinds(state);

  // 确定第一个行动玩家（大盲左手边）
  state.actionIndex = getNextActivePlayerIndex(state, state.bigBlindIndex);

  // 设置玩家回合状态
  const currentPlayer = state.players[state.actionIndex];
  state.isPlayerTurn = !currentPlayer.isAI;

  state.phase = 'PRE_FLOP';

  return state;
}

// 执行玩家动作
export function executePlayerAction(state: GameState, action: GameAction): GameState {
  const player = state.players[state.actionIndex];

  // 标记玩家已行动
  player.hasActed = true;

  switch (action.type) {
    case 'fold':
      player.isFolded = true;
      break;

    case 'check':
      // 过牌，不下注（必须当前下注等于最高下注）
      // 已由前端保证 toCall === 0
      break;

    case 'call':
      const callAmount = Math.min(getToCall(state, player), player.chips);
      player.chips -= callAmount;
      player.currentBet += callAmount;
      state.pot += callAmount;
      if (player.chips === 0) {
        player.isAllIn = true;
      }
      break;

    case 'raise':
      const raiseAmount = action.amount || getMinRaiseAmount(state);
      const totalBet = player.currentBet + raiseAmount;

      if (totalBet > player.chips) {
        // 全下
        const allInAmount = player.chips;
        player.chips = 0;
        player.isAllIn = true;
        player.currentBet += allInAmount;
        state.pot += allInAmount;
      } else {
        player.chips -= raiseAmount;
        player.currentBet += raiseAmount;
        state.pot += raiseAmount;
      }

      state.currentBet = player.currentBet;
      state.minRaise = getMinRaiseAmount(state);

      // 重新设置其他玩家的 hasActed = false（因为有人加注，需要再次表态）
      for (const p of state.players) {
        if (!p.isFolded && !p.isAllIn && p.currentBet < state.currentBet) {
          p.hasActed = false;
        }
      }
      break;

    case 'all-in':
      const allInAmount = player.chips;
      player.chips = 0;
      player.isAllIn = true;
      player.currentBet += allInAmount;
      state.pot += allInAmount;

      if (player.currentBet > state.currentBet) {
        state.currentBet = player.currentBet;
        state.minRaise = getMinRaiseAmount(state);

        // 有人全下且超过当前最高注，重新设置其他玩家的 hasActed
        for (const p of state.players) {
          if (!p.isFolded && !p.isAllIn && p.currentBet < state.currentBet) {
            p.hasActed = false;
          }
        }
      }
      break;
  }

  // 移动到下一个玩家或结束下注轮
  moveToNextPlayer(state);

  return state;
}

// AI执行动作
export function executeAIAction(state: GameState): GameState {
  const ai = state.players[state.actionIndex];

  if (!ai.isAI || ai.isFolded) {
    moveToNextPlayer(state);
    return state;
  }

  const activeOpponents = state.players.filter(p => !p.isFolded && p.id !== ai.id).length;

  const minRaise = getMinRaiseAmount(state);
  const maxRaise = getMaxRaiseAmount(state, ai);
  const isPreFlop = state.phase === 'PRE_FLOP';

  const action = getAIDecision(
    ai,
    state.communityCards,
    getToCall(state, ai),
    minRaise,
    maxRaise,
    state.pot,
    isPreFlop,
    activeOpponents
  );

  const gameAction: GameAction = {
    type: action.action,
    amount: action.amount
  };

  return executePlayerAction(state, gameAction);
}

// 移动到下一个玩家
function moveToNextPlayer(state: GameState): void {
  console.log('[moveToNextPlayer] actionIndex=', state.actionIndex, 'phase=', state.phase);
  // 获取所有未弃牌玩家（包括全下的）
  const activePlayers = state.players.filter(p => !p.isFolded);
  console.log('[moveToNextPlayer] activePlayers count=', activePlayers.length);

  // 检查是否只剩一人
  if (activePlayers.length === 1) {
    // 只有一个玩家了，赢得底池
    const winner = activePlayers[0];
    winner.chips += state.pot;
    state.lastPotWon = winner.isAI ? 0 : state.pot;
    state.pot = 0;
    endHand(state, winner);
    return;
  }

  // 检查下注轮是否结束
  if (isBettingRoundComplete(state)) {
    advancePhase(state);
    return;
  }

  // 移动到下一个未弃牌玩家
  const nextIndex = getNextActivePlayerIndex(state, state.actionIndex);
  if (nextIndex === -1) {
    // 没有更多玩家，检查是否应该结束本轮
    if (isBettingRoundComplete(state)) {
      advancePhase(state);
    }
    return;
  }

  state.actionIndex = nextIndex;
  const currentPlayer = state.players[nextIndex];
  state.isPlayerTurn = !currentPlayer.isAI;
}

// 进入下一阶段
function advancePhase(state: GameState): void {
  console.log('[advancePhase] called, current phase:', state.phase, 'communityCards:', state.communityCards.length);
  // 重置下注状态
  resetBettingRound(state);

  // 检查是否只剩一名未弃牌玩家（只有这种情况下才能提前结束）
  const activePlayers = state.players.filter(p => !p.isFolded);
  if (activePlayers.length <= 1) {
    // 只有一个人了，直接到摊牌，确保发完所有5张公共牌
    while (state.communityCards.length < 5) {
      // Burn 一张
      if (state.deck.length > 0) {
        state.burnedCards.push(state.deck.pop()!);
      }
      // 发公共牌
      if (state.deck.length > 0) {
        state.communityCards.push(state.deck.pop()!);
      }
    }
    state.phase = 'SHOWDOWN';
    determineWinner(state);
    return;
  }

  switch (state.phase) {
    case 'PRE_FLOP':
      state.phase = 'FLOP';
      // Burn 1 张
      if (state.deck.length > 0) state.burnedCards.push(state.deck.pop()!);
      // 发3张公共牌
      for (let i = 0; i < 3; i++) {
        if (state.deck.length > 0) state.communityCards.push(state.deck.pop()!);
      }
      break;

    case 'FLOP':
      state.phase = 'TURN';
      // Burn 1 张
      if (state.deck.length > 0) state.burnedCards.push(state.deck.pop()!);
      // 发1张公共牌
      if (state.deck.length > 0) state.communityCards.push(state.deck.pop()!);
      break;

    case 'TURN':
      state.phase = 'RIVER';
      // Burn 1 张
      if (state.deck.length > 0) state.burnedCards.push(state.deck.pop()!);
      // 发1张公共牌
      if (state.deck.length > 0) state.communityCards.push(state.deck.pop()!);
      break;

    case 'RIVER':
      state.phase = 'SHOWDOWN';
      determineWinner(state);
      return;

    default:
      return;
  }

  // 设置第一个行动玩家（庄家左手边未弃牌玩家）
  // 注意：全下玩家 chips=0，会被 getNextActivePlayerIndex 跳过
  // 如果所有玩家都是全下（返回-1），说明所有玩家都等待摊牌
  const firstActor = getFirstActorIndex(state);

  if (firstActor === -1) {
    // 所有活跃玩家都是全下，没有人有筹码继续下注
    // 直接进入SHOWDOWN比较手牌
    // 确保发完所有公共牌
    while (state.communityCards.length < 5) {
      if (state.deck.length > 0) state.burnedCards.push(state.deck.pop()!);
      if (state.deck.length > 0) state.communityCards.push(state.deck.pop()!);
    }
    state.phase = 'SHOWDOWN';
    determineWinner(state);
    return;
  }

  state.actionIndex = firstActor;
  state.isPlayerTurn = !state.players[firstActor].isAI;
}

// 判定获胜者
function determineWinner(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isFolded);

  // 计算每个玩家的手牌强度（无论有多少活跃玩家都要填充showdownHands）
  state.showdownHands = activePlayers.map(player => ({
    player,
    hand: evaluateHand(player.holeCards, state.communityCards),
    holeCards: player.holeCards
  }));

  // 排序找最强手牌
  state.showdownHands.sort((a, b) => compareHands(b.hand, a.hand));

  const winner = state.showdownHands[0].player;

  if (activePlayers.length === 1) {
    // 单玩家时仍然调用endHand，但showdownHands已经被填充
    endHand(state, winner);
    return;
  }

  endHand(state, winner);
}

// 结束手牌
function endHand(state: GameState, winner: Player): void {
  state.phase = 'END';

  // 如果有人赢得了底池
  if (state.pot > 0) {
    winner.chips += state.pot;
    state.lastPotWon = winner.isAI ? 0 : state.pot;
    state.pot = 0;
  }

  // 更新统计
  state.handCount++;
  if (!winner.isAI) {
    state.totalProfit += state.lastPotWon;
    state.isVictory = true;
  }

  // 检查游戏是否结束（玩家破产）
  const player = state.players[0];
  if (player.chips <= 0) {
    state.isGameOver = true;
    state.isVictory = false;
    state.winner = state.players.find(p => !p.isFolded && p.isAI) || null;
  } else {
    state.isPlayerTurn = false;
  }
}

// 获取玩家可用的动作
export function getAvailableActions(state: GameState): {
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  canAllIn: boolean;
  minRaise: number;
  maxRaise: number;
  callAmount: number;
} | null {
  const player = state.players[0]; // 玩家总是索引0

  // 玩家已弃牌，无可用操作
  if (player.isFolded) {
    return null;
  }

  const toCall = getToCall(state, player);
  const minRaise = getMinRaiseAmount(state);
  const maxRaise = getMaxRaiseAmount(state, player);

  return {
    canCheck: toCall === 0,
    canCall: toCall > 0 && toCall <= player.chips,
    canRaise: minRaise <= maxRaise && minRaise <= player.chips,
    canAllIn: player.chips > 0,
    minRaise: Math.min(minRaise, player.chips),
    maxRaise: Math.min(maxRaise, player.chips),
    callAmount: Math.min(toCall, player.chips)
  };
}

// 获取对手信息
export function getOpponentInfo(state: GameState) {
  return state.players.slice(1).map((ai, index) => ({
    ...ai,
    description: ai.personality && ai.level ? getPersonalityDescription(ai.personality, ai.level) : '',
    handStrength: ai.holeCards.length > 0 ? evaluateHand(ai.holeCards, state.communityCards) : null
  }));
}

// 获取当前阶段标签
export function getPhaseLabel(phase: GamePhase): string {
  switch (phase) {
    case 'SETUP': return '';
    case 'PRE_FLOP': return 'Pre-Flop';
    case 'FLOP': return 'The Flop';
    case 'TURN': return 'The Turn';
    case 'RIVER': return 'The River';
    case 'SHOWDOWN': return 'Showdown';
    case 'END': return 'Hand Complete';
    default: return '';
  }
}
