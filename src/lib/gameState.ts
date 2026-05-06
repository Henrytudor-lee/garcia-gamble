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
  lastBetWasRaise: boolean;    // 本轮是否发生过有效加注（用于判断下注轮是否真正结束）
  justResetRound?: boolean;    // 刚重置过本轮下注，防止 advancePhase 后递归触发 isBettingRoundComplete

  phase: GamePhase;
  actionIndex: number;         // 当前行动玩家 seatIndex
  isPlayerTurn: boolean;

  winner: Player | null;
  isGameOver: boolean;
  isVictory: boolean;
  handCount: number;
  totalProfit: number;
  lastPotWon: number;
  lastAIPotWon: number;
  showdownHands: { player: Player; hand: ReturnType<typeof evaluateHand>; holeCards: Card[] }[];
}

export interface GameAction {
  type: 'fold' | 'check' | 'call' | 'raise' | 'all-in';
  amount?: number;
}

// 边池分配结果
interface PotDistribution {
  player: Player;
  amount: number;
}

// 初始配置
export const DEFAULT_CONFIG: GameConfig = {
  opponentCount: 5,
  playerBuyIn: 10000,
  aiBuyIn: 10000,
  bettingType: 'no-limit',
  smallBlind: 50,
  bigBlind: 100,
  aiPersonalities: ['conservative', 'aggressive', 'opportunistic', 'conservative', 'aggressive'],
  aiLevels: [2, 2, 2, 1, 3]
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
    hasActed: false,
    totalBetInHand: 0
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
      hasActed: false,
      totalBetInHand: 0
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
    lastAIPotWon: 0,
    showdownHands: [],
    lastBetWasRaise: false
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

  // 大盲（按德扑规则，大盲下注在前）
  const bbPlayer = state.players[state.bigBlindIndex];
  const bbAmount = Math.min(bb, bbPlayer.chips);
  bbPlayer.chips -= bbAmount;
  bbPlayer.currentBet = bbAmount;
  state.pot += bbAmount;
  state.currentBet = bbAmount;

  // 小盲
  const sbPlayer = state.players[state.smallBlindIndex];
  const sbAmount = Math.min(sb, sbPlayer.chips);
  sbPlayer.chips -= sbAmount;
  sbPlayer.currentBet = sbAmount;
  state.pot += sbAmount;
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

  // 所有人都已全下 -> 直接结束
  if (canStillBetPlayers.length === 0) {
    return true;
  }

  // 刚从 advancePhase 重置过 -> 跳过此次检查，防止在 advancePhase 内部递归触发 isBettingRoundComplete
  // 重置后默认所有人尚未行动，必须先让玩家表态，不能提前结束
  if (state.justResetRound) {
    return false;
  }

  // 所有还能下注的玩家的 currentBet 都相等，且所有人都已行动
  // 注意：all-in 玩家的 bet 不会重置，所以不能把他们算进 bet 相等检查
  const allHaveEqualBet = canStillBetPlayers.every(p => p.currentBet === state.currentBet);

  // 所有还能下注的玩家都已行动（已行动或已全下）
  const allCanBetPlayersActed = canStillBetPlayers.every(p => p.hasActed || p.isAllIn);

  // 结束条件：所有还能下注的玩家下注相等 且 所有人都已行动（或全下）
  // 注意：不需要额外检查 lastBetWasRaise，因为 allCanBetPlayersActed 已经包含了
  // "所有人都行动了"这个约束——只要没人行动完，即使下注相等也不能结束轮次
  return allHaveEqualBet && allCanBetPlayersActed;
}

// 获取下一个未弃牌且有筹码的玩家索引
function getNextActivePlayerIndex(state: GameState, fromIndex: number): number {
  const n = state.players.length;

  for (let i = 1; i <= n; i++) {
    const nextIndex = (fromIndex + i) % n;
    const player = state.players[nextIndex];
    // 注意：全下玩家 chips=0，但不应该被跳过（他们仍然参与游戏）
    // 只有弃牌玩家才被跳过
    if (!player.isFolded) {
      return nextIndex;
    }
  }

  return -1; // 没有活跃玩家（全部弃牌）
}

// 获取第一个行动玩家（庄家左手边未弃牌玩家）
function getFirstActorIndex(state: GameState): number {
  return getNextActivePlayerIndex(state, state.dealerIndex);
}

// 计算边池（用于多人全下金额不同的情况）
// 返回 { mainPot, sidePots }，边池按从大到小排序
export function calculateSidePots(state: GameState): { mainPot: number; sidePots: number[] } {
  const activePlayers = state.players.filter(p => !p.isFolded);

  if (activePlayers.length <= 1) {
    return { mainPot: state.pot, sidePots: [] };
  }

  // 按本手牌总投入升序排列
  const sorted = [...activePlayers].sort((a, b) => a.totalBetInHand - b.totalBetInHand);

  // 最低投入者形成主池，所有人等额部分归主池
  const mainPot = sorted[0].totalBetInHand * sorted.length;

  // 计算每个玩家超出主池的部分，这些金额形成边池
  const sidePotContributions: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    // 当前玩家超出最低投入的金额 × 有资格竞争这部分的人数
    const excessPerPlayer = sorted[i].totalBetInHand - sorted[0].totalBetInHand;
    const eligiblePlayers = sorted.length - i; // 只有投入 >= 当前档位的玩家才能竞争
    sidePotContributions.push(excessPerPlayer * eligiblePlayers);
  }

  // 过滤掉 0 值的边池，并按从大到小排序
  const sidePots = sidePotContributions.filter(v => v > 0).sort((a, b) => b - a);

  return { mainPot, sidePots };
}

// 重置本轮下注状态
function resetBettingRound(state: GameState): void {
  for (const player of state.players) {
    player.currentBet = 0;
    player.hasActed = false;
  }
  state.currentBet = 0;
  state.minRaise = state.config.bigBlind;
  state.lastBetWasRaise = false;
  // 标记刚重置过，防止 moveToNextPlayer 在 advancePhase 后立即错误触发 isBettingRoundComplete
  state.justResetRound = true;
}

// 开始新手牌
export function startNewHand(state: GameState): GameState {
  // 重置本手状态（isVictory 和 isGameOver 必须重置，因为它们是"本手是否赢了"和"游戏是否已结束"的标志）
  state.isVictory = false;
  state.isGameOver = false;
  state.winner = null;
  state.lastPotWon = 0;
  state.lastAIPotWon = 0;
  state.isPlayerTurn = true; // 必须在 startNewHand 中重置，否则玩家永远失去操作权

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
    player.totalBetInHand = 0;
  }

  // 重置公共牌
  state.communityCards = [];
  state.burnedCards = [];
  state.showdownHands = [];

  // 重置下注状态
  state.pot = 0;
  state.sidePots = [];
  state.currentBet = 0;
  state.lastPotWon = 0;
  state.lastAIPotWon = 0;

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
      player.totalBetInHand += callAmount;
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
        player.totalBetInHand += allInAmount;
        state.pot += allInAmount;
      } else {
        player.chips -= raiseAmount;
        player.currentBet += raiseAmount;
        player.totalBetInHand += raiseAmount;
        state.pot += raiseAmount;
      }

      state.currentBet = player.currentBet;
      state.minRaise = getMinRaiseAmount(state);
      state.lastBetWasRaise = true;

      // 重新设置其他玩家的 hasActed = false（因为有人加注，需要再次表态）
      for (const p of state.players) {
        if (!p.isFolded && !p.isAllIn && p.currentBet < state.currentBet) {
          p.hasActed = false;
        }
      }
      break;

    case 'all-in':
      const allInAmount = player.chips;
      const previousBet = state.currentBet; // 记录加注前的最高注
      player.chips = 0;
      player.isAllIn = true;
      player.currentBet += allInAmount;
      state.pot += allInAmount;

      if (player.currentBet > state.currentBet) {
        state.currentBet = player.currentBet;

        // 只有当全下增加量 >= minRaise 时才视为有效加注，重新开放表态
        const betIncrease = player.currentBet - previousBet;
        if (betIncrease >= state.minRaise) {
          state.minRaise = getMinRaiseAmount(state);
          state.lastBetWasRaise = true;
          for (const p of state.players) {
            if (!p.isFolded && !p.isAllIn && p.currentBet < state.currentBet) {
              p.hasActed = false;
            }
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
  // 清除刚重置标记，任何对 moveToNextPlayer 的调用都说明重置已处理完毕
  state.justResetRound = false;

  // 获取所有未弃牌玩家（包括全下的）
  const activePlayers = state.players.filter(p => !p.isFolded);
  console.log('[moveToNextPlayer] activePlayers count=', activePlayers.length);

  // 检查是否只剩一人
  if (activePlayers.length === 1) {
    // 只有一个玩家了，赢得底池
    const winner = activePlayers[0];
    winner.chips += state.pot;
    if (winner.isAI) {
      state.lastAIPotWon = state.pot;
    } else {
      state.lastPotWon = state.pot;
    }
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

// 判定获胜者（支持边池分配）
function determineWinner(state: GameState): void {
  const activePlayers = state.players.filter(p => !p.isFolded);

  // 计算每个玩家的手牌强度
  state.showdownHands = activePlayers.map(player => ({
    player,
    hand: evaluateHand(player.holeCards, state.communityCards),
    holeCards: player.holeCards
  }));

  // 排序找最强手牌
  state.showdownHands.sort((a, b) => compareHands(b.hand, a.hand));

  const winner = state.showdownHands[0].player;

  if (activePlayers.length === 1) {
    endHand(state, winner);
    return;
  }

  endHand(state, winner);
}

// 分配边池：找出有资格竞争每个底池的玩家，然后分配给获胜者
function distributePots(state: GameState): PotDistribution[] {
  const activePlayers = state.players.filter(p => !p.isFolded);
  const { mainPot, sidePots } = calculateSidePots(state);
  const allPots = [mainPot, ...sidePots];

  // 为每个玩家确定其最高能竞争的底池索引（基于总投入）
  // 投入最少的玩家只能竞争主池（index 0），投入第二少的只能竞争主池+边池1（index 0-1），以此类推
  const sortedByBet = [...activePlayers].sort((a, b) => a.totalBetInHand - b.totalBetInHand);
  const playerEligibleUpTo: Map<string, number> = new Map();
  sortedByBet.forEach((player, i) => {
    // 投入第 i 少的玩家（i=0最少），最多能竞争到 index = allPots.length - 1 - i 的底池
    // sorted=[A(100),H(200),B(300)], length=3: i=0→A eligibleUpTo=2, i=1→H eligibleUpTo=1, i=2→B eligibleUpTo=0
    // 投入越多的玩家能参与越大的边池（eligibleUpTo 越大）
    playerEligibleUpTo.set(player.id, allPots.length - 1 - i);
  });

  const distributions: PotDistribution[] = [];

  // 从最大的边池开始分配（最大的边池是投入最多的玩家形成的）
  for (let potIndex = allPots.length - 1; potIndex >= 0; potIndex--) {
    const potSize = allPots[potIndex];
    if (potSize <= 0) continue;

    // 找出有资格竞争此底池的玩家（eligibleUpTo >= potIndex）
    const eligible = state.showdownHands.filter(({ player }) => {
      const maxIdx = playerEligibleUpTo.get(player.id) ?? 0;
      return maxIdx >= potIndex;
    });

    if (eligible.length === 0) continue;

    // 取最强手牌（已排序，第一个是最强的）
    const bestHand = eligible[0];
    const winners = eligible.filter(
      ({ hand }) => compareHands(hand, bestHand.hand) === 0
    );

    // 平分底池
    const share = Math.floor(potSize / winners.length);
    for (const { player } of winners) {
      distributions.push({ player, amount: share });
    }
    // 余数归第一个赢家（实际中余数很小，这里简化处理）
    if (winners.length > 0 && potSize % winners.length !== 0) {
      distributions[0].amount += potSize - distributions.reduce((s, d) => s + d.amount, 0);
    }
  }

  return distributions;
}

// 结束手牌
function endHand(state: GameState, winner: Player): void {
  state.phase = 'END';

  // 计算并分配底池
  if (state.pot > 0) {
    const distributions = distributePots(state);
    for (const { player, amount } of distributions) {
      if (amount > 0) {
        player.chips += amount;
        if (!player.isAI) {
          state.lastPotWon += amount;
        } else {
          state.lastAIPotWon += amount;
        }
      }
    }
    state.pot = 0;
  }

  // 在 UI 显示 lastPotWon 之后再重置（由 startNewHand 完全重置）
  // 注意：保留 lastPotWon 到本局结束，供 UI 显示 "Result" 使用

  // 更新统计
  state.handCount++;
  // 使用 lastPotWon 判断玩家是否赢了（而不是 winner.isAI），因为边池情况下
  // winner 可能是 AI 但玩家仍从自己的边池份额中赢钱
  if (state.lastPotWon > 0) {
    state.totalProfit += state.lastPotWon;
    state.isVictory = true;
  } else {
    state.isVictory = false;
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
  return state.players.slice(1).map((ai) => ({
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
