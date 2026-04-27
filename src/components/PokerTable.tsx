'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/GameContext';
import { Navigation } from './Navigation';
import { Card, CardHand, CommunityCards } from './Card';
import { getHandDescription } from '@/lib/poker';
import { getPersonalityDescription, getAIDecision } from '@/lib/ai';
import { PlayerAvatar } from './PlayerAvatar';

export function PokerTable() {
  const router = useRouter();
  const { gameState, availableActions, opponentInfo, playerAction, runAIAction, startNextHand } = useGame();
  const [betAmount, setBetAmount] = useState(gameState.config.bigBlind);
  const [showNextHandPrompt, setShowNextHandPrompt] = useState(false);
  const [actionToast, setActionToast] = useState<{ player: string; action: string; amount?: number } | null>(null);
  const [thinkingPlayerIndex, setThinkingPlayerIndex] = useState<number | null>(null);
  const [actionLog, setActionLog] = useState<{ id: number; round: number; phase: string; player: string; action: string; amount?: number; isEvent?: boolean }[]>([]);
  const logIdRef = useRef(0);
  const prevPhaseRef = useRef<string>('SETUP');
  const bettingRoundRef = useRef(0);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevCommunityCountRef = useRef(0);
  const [newCommunityCardIndex, setNewCommunityCardIndex] = useState(-1);

  const { players, communityCards, pot, phase, isPlayerTurn, isGameOver, isVictory, handCount, lastPotWon, showdownHands } = gameState;
  const player = players[0];
  
  // 添加日志的内部函数
  const addLog = useCallback((playerName: string, action: string, amount?: number, isEvent?: boolean) => {
    const newEntry = {
      id: logIdRef.current++,
      round: bettingRoundRef.current,
      phase: getPhaseLabel(),
      player: playerName,
      action,
      amount,
      isEvent: isEvent || false
    };
    setActionLog(prev => [newEntry, ...prev].slice(0, 100));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 显示操作提示并记录到日志
  const showToast = useCallback((playerName: string, action: string, amount?: number) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setActionToast({ player: playerName, action, amount });
    addLog(playerName, action, amount);
    toastTimeoutRef.current = setTimeout(() => {
      setActionToast(null);
    }, 2000);
  }, [addLog]);

  // AI 自动行动
  useEffect(() => {
    if (!isPlayerTurn && phase !== 'END' && phase !== 'SETUP') {
      // 显示正在思考的AI
      const currentAI = players[gameState.actionIndex];
      if (currentAI?.isAI) {
        setThinkingPlayerIndex(gameState.actionIndex);
      }

      const timer = setTimeout(() => {
        const currentPlayer = players[gameState.actionIndex];
        if (currentPlayer?.isAI) {
          // 重要：先计算 AI 实际决定，再显示 toast
          // 不能基于 aiToCall 猜测，因为 AI 可能 fold
          const aiToCall = Math.max(0, gameState.currentBet - currentPlayer.currentBet);
          const minRaise = gameState.minRaise;
          const maxRaise = currentPlayer.chips;
          const activeOpponents = players.filter(p => !p.isFolded && p.id !== currentPlayer.id).length;
          const isPreFlop = phase === 'PRE_FLOP';

          // 使用和 gameState.ts executeAIAction 相同的逻辑获取实际决定
          const aiDecision = getAIDecision(
            currentPlayer,
            gameState.communityCards,
            aiToCall,
            minRaise,
            maxRaise,
            gameState.pot,
            isPreFlop,
            activeOpponents
          );

          let actionName: string;
          if (aiDecision.action === 'fold') {
            actionName = 'Fold';
          } else if (aiDecision.action === 'check') {
            actionName = 'Check';
          } else if (aiDecision.action === 'call') {
            actionName = `Call $${aiToCall}`;
          } else if (aiDecision.action === 'raise') {
            actionName = `Raise $${aiDecision.amount}`;
          } else if (aiDecision.action === 'all-in') {
            actionName = 'All-In';
          } else {
            actionName = 'Fold';
          }

          showToast(currentPlayer.name, actionName);
        }

        runAIAction();
        setThinkingPlayerIndex(null);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setThinkingPlayerIndex(null);
    }
  }, [isPlayerTurn, phase, runAIAction, players, gameState.actionIndex, gameState.currentBet, gameState.currentBet, gameState.pot, gameState.minRaise, availableActions, betAmount, showToast, phase]);

  // 游戏结束检测
  useEffect(() => {
    if (phase === 'END' && !isGameOver) {
      setShowNextHandPrompt(true);
    }
    if (isGameOver) {
      setTimeout(() => {
        router.push('/summary');
      }, 2000);
    }
  }, [phase, isGameOver, router]);

  // 更新下注金额
  useEffect(() => {
    if (availableActions) {
      setBetAmount(Math.max(availableActions.minRaise, gameState.config.bigBlind));
    }
  }, [availableActions, gameState.config.bigBlind]);

  // 追踪阶段变化和下注轮次
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;

    // 检测是否进入新的下注轮（PRE_FLOP之后每个阶段开始都是新的下注轮）
    if (prevPhase !== phase) {
      if (phase !== 'SETUP') {
        // 新的下注轮开始时递增计数
        if (prevPhase !== 'SETUP') {
          bettingRoundRef.current += 1;
        }
        if (prevPhase === 'SETUP' && phase === 'PRE_FLOP') {
          // 新手牌开始，记录日志
          bettingRoundRef.current = 1; // 第一轮下注
          addLog('System', 'New Hand Started', undefined, true);
        }
      }

      // 记录阶段变化事件
      if (phase === 'FLOP' || phase === 'TURN' || phase === 'RIVER' || phase === 'SHOWDOWN') {
        // 生成公共牌详细信息
        let cardInfo = '';
        if (phase === 'FLOP' && communityCards.length >= 3) {
          const flopCards = communityCards.slice(0, 3).map(c => {
            const d = { rank: '', suit: '', color: '' };
            const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
            const rankDisplay: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
            d.rank = rankDisplay[c.rank] || c.rank;
            d.suit = suitSymbols[c.suit] || c.suit;
            d.color = c.suit === 'hearts' || c.suit === 'diamonds' ? '♦♥' : '♣♠';
            return `${d.rank}${d.suit}`;
          });
          cardInfo = ` [${flopCards.join(' ')}]`;
        } else if (phase === 'TURN' && communityCards.length >= 4) {
          const turnCard = communityCards[3];
          const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
          const rankDisplay: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
          cardInfo = ` [Turn: ${rankDisplay[turnCard.rank]}${suitSymbols[turnCard.suit]}]`;
        } else if (phase === 'RIVER' && communityCards.length >= 5) {
          const riverCard = communityCards[4];
          const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
          const rankDisplay: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
          cardInfo = ` [River: ${rankDisplay[riverCard.rank]}${suitSymbols[riverCard.suit]}]`;
        } else if (phase === 'SHOWDOWN') {
          const allCards = communityCards.map(c => {
            const suitSymbols: Record<string, string> = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
            const rankDisplay: Record<string, string> = { '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
            return `${rankDisplay[c.rank]}${suitSymbols[c.suit]}`;
          });
          cardInfo = ` [Board: ${allCards.join(' ')}]`;
        }
        addLog('System', `${getPhaseLabel()}${cardInfo}`, undefined, true);
      }

      // 记录游戏结束
      if (phase === 'END') {
        const winner = showdownHands[0]?.player;
        if (winner) {
          addLog('System', winner.isAI ? `AI Wins $${lastPotWon}` : `You Win $${lastPotWon}`, undefined, true);
        }
      }

      // 检测新公共牌并触发淡入动画
      if (communityCards.length > prevCommunityCountRef.current) {
        const newCardIndex = communityCards.length - 1; // 动画最新那张
        setNewCommunityCardIndex(newCardIndex);
        // 动画结束后清除（500ms = 动画时长）
        setTimeout(() => setNewCommunityCardIndex(-1), 600);
      }
      prevCommunityCountRef.current = communityCards.length;
    }

    // 记录盲注（每次进入 PRE_FLOP 时）
    if (phase === 'PRE_FLOP' && (prevPhase === 'SETUP' || prevPhase === 'END')) {
      const sb = gameState.players[gameState.smallBlindIndex];
      const bb = gameState.players[gameState.bigBlindIndex];
      if (sb && bb) {
        addLog(sb.name, `Small Blind $${gameState.config.smallBlind}`, undefined, true);
        addLog(bb.name, `Big Blind $${gameState.config.bigBlind}`, undefined, true);
      }
    }

    prevPhaseRef.current = phase;
  }, [phase, addLog, gameState, showdownHands, lastPotWon, communityCards.length]);

  const handleFold = useCallback(() => {
    showToast('You', 'Fold');
    playerAction({ type: 'fold' });
  }, [playerAction, showToast]);

  const handleCheck = useCallback(() => {
    showToast('You', 'Check');
    playerAction({ type: 'check' });
  }, [playerAction, showToast]);

  const handleCall = useCallback(() => {
    showToast('You', `Call $${availableActions?.callAmount || 0}`);
    playerAction({ type: 'call' });
  }, [playerAction, showToast, availableActions]);

  const handleRaise = useCallback(() => {
    showToast('You', `Raise $${betAmount}`);
    playerAction({ type: 'raise', amount: betAmount });
  }, [playerAction, betAmount, showToast]);

  const handleAllIn = useCallback(() => {
    showToast('You', `All-In $${player.chips}`);
    playerAction({ type: 'all-in' });
  }, [playerAction, player.chips, showToast]);

  const handleNextHand = useCallback(() => {
    setShowNextHandPrompt(false);
    setActionLog([]); // 清空操作日志
    startNextHand();
  }, [startNextHand]);

  const getPhaseLabel = () => {
    switch (phase) {
      case 'PRE_FLOP': return 'Pre-Flop';
      case 'FLOP': return 'The Flop';
      case 'TURN': return 'The Turn';
      case 'RIVER': return 'The River';
      case 'SHOWDOWN': return 'Showdown';
      case 'END': return 'Hand Complete';
      case 'SETUP': return '';
      default: return '';
    }
  };

  return (
    <>
      <Navigation currentPage="tables" walletAmount={player.chips} />

      <main className="ml-0 lg:ml-64 pt-16 h-screen flex items-center justify-center relative overflow-hidden bg-surface-dim">
        {/* Table Ambient Background Glow */}
        <div className="absolute inset-0 bg-radial from-secondary-container/20 to-transparent opacity-30"></div>

        {/* The Poker Table - Centered oval table */}
        <div className="relative w-full max-w-5xl aspect-[2/1] flex items-center justify-center">
          {/* Table Shadow Layer */}
          <div className="absolute w-[110%] h-[120%] bg-black/40 blur-3xl rounded-full -translate-y-4"></div>

          {/* Table Body - The felt surface */}
          <div className="relative w-[85%] h-full bg-secondary-container rounded-[120px] border-[10px] border-surface-container-high shadow-2xl flex items-center justify-center">
            {/* Felt texture border */}
            <div className="absolute inset-1 rounded-[110px] border-2 border-black/10"></div>

            {/* Community Cards - Center of table */}
            <div className="absolute inset-0 flex items-center justify-center">
              <CommunityCards cards={communityCards} size="md" newCardIndex={newCommunityCardIndex} />
            </div>

            {/* Phase Indicator */}
            {phase !== 'END' && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel px-5 py-1.5 rounded-full border border-white/5">
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">{getPhaseLabel()}</span>
              </div>
            )}

            {/* Pot Info HUD */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 glass-panel px-6 py-2 rounded-full border border-white/5 shadow-xl">
              <span className="text-[10px] text-on-secondary-container/60 font-bold uppercase tracking-[0.15em] mb-0.5 block text-center">Total Pot</span>
              <span className="text-2xl font-headline font-black text-primary">${pot.toLocaleString()}</span>
            </div>

            {/* Dealer Button - 紧邻庄家头像 */}
            <div className="absolute z-30"
              style={{
                // dealerIndex: 0=玩家(bottom), 1=opponent[0](top-left), 2=opponent[1](top-center), 3=opponent[2](top-right), 4=opponent[3](left), 5=opponent[4](right)
                top: gameState.dealerIndex === 0 ? undefined : (gameState.dealerIndex <= 3 ? '-4%' : '42%'),
                bottom: gameState.dealerIndex === 0 ? '2%' : undefined,
                left: gameState.dealerIndex === 1 ? '6%' : (gameState.dealerIndex === 4 ? '1%' : (gameState.dealerIndex === 0 ? '50%' : undefined)),
                right: gameState.dealerIndex === 3 ? '6%' : (gameState.dealerIndex === 5 ? '1%' : undefined),
                transform: gameState.dealerIndex === 0 || gameState.dealerIndex === 4 || gameState.dealerIndex === 5
                  ? (gameState.dealerIndex === 0 ? 'translateX(-50%)' : (gameState.dealerIndex === 4 ? 'translateX(-50%)' : 'translateX(50%)'))
                  : undefined,
              }}
            >
              <img src="/dealer-button.svg" alt="Dealer" className="w-10 h-10" />
            </div>
          </div>

          {/* Player Positions - Outside the table edge */}

          {/* Player 0 (You) - Bottom Center */}
          {/* 玩家头像和信息在牌桌外侧下方 */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pb-4 flex flex-col items-center z-20">
            <PlayerAvatar
              name="You"
              isAI={false}
              isFolded={player.isFolded}
              isAllIn={player.isAllIn}
              isWaiting={isPlayerTurn}
              chips={player.chips}
              size="sm"
            />
            <div className="mt-2 glass-panel px-3 py-1 rounded-lg border border-white/5">
              <p className="text-primary font-headline font-bold text-sm">${player.chips.toLocaleString()}</p>
            </div>
          </div>

          {/* 玩家手牌在牌桌上（内侧） */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
            <CardHand
              cards={[player.holeCards[0] || null, player.holeCards[1] || null]}
              size="md"
            />
          </div>

          {/* Opponents - Positioned around the outer edge of the table */}
          {/* Opponent 1 (index 0) - Top Left */}
          <div className="absolute top-0 left-[6%] -translate-y-full flex flex-col items-center z-20">
            {/* 信息框在上，头像在下 */}
            <div className="mb-2 glass-panel px-3 py-1.5 rounded-xl border border-white/5 min-w-[100px] text-center">
              <h4 className="text-xs font-bold text-on-surface truncate">{opponentInfo[0]?.name}</h4>
              <div className="text-[9px] text-on-surface-variant font-medium flex justify-center items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${opponentInfo[0]?.personality === 'conservative' ? 'bg-blue-400' : opponentInfo[0]?.personality === 'aggressive' ? 'bg-red-400' : 'bg-purple-400'}`}></span>
                <span>{opponentInfo[0]?.description}</span>
              </div>
              <p className="text-primary font-headline font-bold text-xs mt-0.5">${opponentInfo[0]?.chips.toLocaleString()}</p>
            </div>
            <div className="relative group">
              <PlayerAvatar
                name={opponentInfo[0]?.name || 'Opponent'}
                isAI={true}
                isFolded={opponentInfo[0]?.isFolded}
                isAllIn={opponentInfo[0]?.isAllIn}
                isWaiting={thinkingPlayerIndex === 1}
                chips={opponentInfo[0]?.chips || 0}
                size="md"
                showBadge={false}
              />
              {/* SHOWDOWN: 显示 AI 底牌 */}
              {phase === 'SHOWDOWN' && !opponentInfo[0]?.isFolded && opponentInfo[0]?.holeCards?.length === 2 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <Card card={opponentInfo[0].holeCards[0]} size="sm" hidden={false} />
                  <Card card={opponentInfo[0].holeCards[1]} size="sm" hidden={false} />
                </div>
              )}
            </div>
          </div>

          {/* Opponent 2 (index 1) - Top Center */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full flex flex-col items-center z-20">
            {/* 信息框在上，头像在下 */}
            <div className="mb-2 glass-panel px-3 py-1.5 rounded-xl border border-white/5 min-w-[100px] text-center">
              <h4 className="text-xs font-bold text-on-surface truncate">{opponentInfo[1]?.name}</h4>
              <div className="text-[9px] text-on-surface-variant font-medium flex justify-center items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${opponentInfo[1]?.personality === 'conservative' ? 'bg-blue-400' : opponentInfo[1]?.personality === 'aggressive' ? 'bg-red-400' : 'bg-purple-400'}`}></span>
                <span>{opponentInfo[1]?.description}</span>
              </div>
              <p className="text-primary font-headline font-bold text-xs mt-0.5">${opponentInfo[1]?.chips.toLocaleString()}</p>
            </div>
            <div className="relative group">
              <PlayerAvatar
                name={opponentInfo[1]?.name || 'Opponent'}
                isAI={true}
                isFolded={opponentInfo[1]?.isFolded}
                isAllIn={opponentInfo[1]?.isAllIn}
                isWaiting={thinkingPlayerIndex === 2}
                chips={opponentInfo[1]?.chips || 0}
                size="md"
                showBadge={false}
              />
              {/* SHOWDOWN: 显示 AI 底牌 */}
              {phase === 'SHOWDOWN' && !opponentInfo[1]?.isFolded && opponentInfo[1]?.holeCards?.length === 2 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <Card card={opponentInfo[1].holeCards[0]} size="sm" hidden={false} />
                  <Card card={opponentInfo[1].holeCards[1]} size="sm" hidden={false} />
                </div>
              )}
            </div>
          </div>

          {/* Opponent 3 (index 2) - Top Right */}
          <div className="absolute top-0 right-[6%] -translate-y-full flex flex-col items-center z-20">
            {/* 信息框在上，头像在下 */}
            <div className="mb-2 glass-panel px-3 py-1.5 rounded-xl border border-white/5 min-w-[100px] text-center">
              <h4 className="text-xs font-bold text-on-surface truncate">{opponentInfo[2]?.name}</h4>
              <div className="text-[9px] text-on-surface-variant font-medium flex justify-center items-center gap-1 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${opponentInfo[2]?.personality === 'conservative' ? 'bg-blue-400' : opponentInfo[2]?.personality === 'aggressive' ? 'bg-red-400' : 'bg-purple-400'}`}></span>
                <span>{opponentInfo[2]?.description}</span>
              </div>
              <p className="text-primary font-headline font-bold text-xs mt-0.5">${opponentInfo[2]?.chips.toLocaleString()}</p>
            </div>
            <div className="relative group">
              <PlayerAvatar
                name={opponentInfo[2]?.name || 'Opponent'}
                isAI={true}
                isFolded={opponentInfo[2]?.isFolded}
                isAllIn={opponentInfo[2]?.isAllIn}
                isWaiting={thinkingPlayerIndex === 3}
                chips={opponentInfo[2]?.chips || 0}
                size="md"
                showBadge={false}
              />
              {/* SHOWDOWN: 显示 AI 底牌 */}
              {phase === 'SHOWDOWN' && !opponentInfo[2]?.isFolded && opponentInfo[2]?.holeCards?.length === 2 && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex gap-0.5">
                  <Card card={opponentInfo[2].holeCards[0]} size="sm" hidden={false} />
                  <Card card={opponentInfo[2].holeCards[1]} size="sm" hidden={false} />
                </div>
              )}
            </div>
          </div>

          {/* Opponent 4 (index 3) - Left Side */}
          <div className="absolute top-1/2 left-0 -translate-x-full -ml-4 flex flex-col items-center z-20">
            <div className="relative group">
              <PlayerAvatar
                name={opponentInfo[3]?.name || 'Opponent'}
                isAI={true}
                isFolded={opponentInfo[3]?.isFolded}
                isAllIn={opponentInfo[3]?.isAllIn}
                isWaiting={thinkingPlayerIndex === 4}
                chips={opponentInfo[3]?.chips || 0}
                size="sm"
                showBadge={false}
              />
              {/* SHOWDOWN: 显示 AI 底牌 */}
              {phase === 'SHOWDOWN' && !opponentInfo[3]?.isFolded && opponentInfo[3]?.holeCards?.length === 2 && (
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <Card card={opponentInfo[3].holeCards[0]} size="sm" hidden={false} />
                  <Card card={opponentInfo[3].holeCards[1]} size="sm" hidden={false} />
                </div>
              )}
            </div>
            <div className="mt-2 glass-panel px-3 py-1 rounded-lg border border-white/5 min-w-[90px] text-center">
              <h4 className="text-xs font-bold text-on-surface truncate">{opponentInfo[3]?.name}</h4>
              <p className="text-primary font-headline font-bold text-xs">${opponentInfo[3]?.chips.toLocaleString()}</p>
            </div>
          </div>

          {/* Opponent 5 (index 4) - Right Side */}
          <div className="absolute top-1/2 right-0 translate-x-full mr-4 flex flex-col items-center z-20">
            <div className="relative group">
              <PlayerAvatar
                name={opponentInfo[4]?.name || 'Opponent'}
                isAI={true}
                isFolded={opponentInfo[4]?.isFolded}
                isAllIn={opponentInfo[4]?.isAllIn}
                isWaiting={thinkingPlayerIndex === 5}
                chips={opponentInfo[4]?.chips || 0}
                size="sm"
                showBadge={false}
              />
              {/* SHOWDOWN: 显示 AI 底牌 */}
              {phase === 'SHOWDOWN' && !opponentInfo[4]?.isFolded && opponentInfo[4]?.holeCards?.length === 2 && (
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 flex gap-0.5">
                  <Card card={opponentInfo[4].holeCards[0]} size="sm" hidden={false} />
                  <Card card={opponentInfo[4].holeCards[1]} size="sm" hidden={false} />
                </div>
              )}
            </div>
            <div className="mt-2 glass-panel px-3 py-1 rounded-lg border border-white/5 min-w-[90px] text-center">
              <h4 className="text-xs font-bold text-on-surface truncate">{opponentInfo[4]?.name}</h4>
              <p className="text-primary font-headline font-bold text-xs">${opponentInfo[4]?.chips.toLocaleString()}</p>
            </div>
          </div>

          {/* Unified Showdown + Result Overlay */}
          {(phase === 'SHOWDOWN' || (phase === 'END' && showdownHands.length > 0)) && showdownHands.length > 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40">
              <div className="glass-panel rounded-2xl border border-white/10 p-8 max-w-md text-center space-y-6">
                {/* Result Header - only show after END; during SHOWDOWN show who's winning */}
                {phase === 'END' ? (
                  <div className="space-y-1">
                    <h2 className="text-4xl font-black font-headline text-primary">
                      {isVictory ? 'VICTORY!' : 'GAME OVER'}
                    </h2>
                    <p className="text-on-surface-variant text-sm">
                      {isVictory ? `You won $${lastPotWon.toLocaleString()}!` : 'Your chips have run out.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <h2 className="text-2xl font-black font-headline text-primary">Showdown</h2>
                    <p className="text-on-surface-variant text-xs">
                      {showdownHands[0]?.player.name} is winning
                    </p>
                  </div>
                )}

                {/* Divider */}
                <div className="border-t border-white/10" />

                {/* Showdown Section */}
                <div className="space-y-3">
                  <div className="space-y-3">
                    {showdownHands.map((sh, i) => (
                      <div key={sh.player.id} className={`flex items-center gap-3 p-2 rounded-lg ${i === 0 ? 'bg-primary/20 border border-primary/30' : ''}`}>
                        {/* 显示手牌 */}
                        <div className="flex gap-1">
                          <Card card={sh.holeCards[0]} size="sm" hidden={false} />
                          <Card card={sh.holeCards[1]} size="sm" hidden={false} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${i === 0 ? 'text-primary' : 'text-on-surface'}`}>
                              {sh.player.name}
                            </span>
                            {i === 0 && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded font-bold">WINNER</span>}
                          </div>
                          <div className="text-xs text-on-surface-variant">{getHandDescription(sh.hand)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Redirect hint */}
                {phase === 'END' && isGameOver && (
                  <p className="text-on-surface-variant text-xs">Redirecting...</p>
                )}
              </div>
            </div>
          )}

          {/* Legacy Game Over Overlay - only for END without showdown (shouldn't happen) */}
          {phase === 'END' && isGameOver && showdownHands.length === 0 && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-black font-headline text-primary">
                  {isVictory ? 'VICTORY!' : 'GAME OVER'}
                </h2>
                <p className="text-on-surface-variant">
                  {isVictory ? `You won $${lastPotWon.toLocaleString()}!` : 'Your chips have run out.'}
                </p>
                <p className="text-on-surface-variant text-sm">Redirecting...</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Log Panel - Top Right */}
        {actionLog.length > 0 && (
          <div className="absolute top-20 right-4 z-40 w-80 max-h-[70vh] overflow-y-auto">
            <div className="glass-panel rounded-xl border border-white/10 p-3 shadow-2xl">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <span className="material-symbols-outlined text-xs text-primary">history</span>
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Action Log</span>
              </div>
              <div className="space-y-1">
                {actionLog.map((entry, idx) => (
                  <div key={entry.id} className={`flex items-start gap-2 text-xs py-1 ${idx > 0 ? 'border-t border-white/5' : ''}`}>
                    {/* Round badge */}
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${entry.isEvent ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                      {entry.isEvent ? 'EVT' : `R${entry.round}`}
                    </span>
                    {/* Phase label */}
                    <span className="shrink-0 text-[10px] text-on-surface-variant/60">{entry.phase}</span>
                    {/* Player */}
                    <span className={`shrink-0 font-medium min-w-[60px] ${entry.player === 'You' ? 'text-primary' : entry.player === 'System' ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {entry.player}
                    </span>
                    {/* Arrow */}
                    <span className="shrink-0 text-on-surface-variant/40">→</span>
                    {/* Action */}
                    <span className={`font-bold flex-1 ${entry.isEvent ? 'text-secondary' : 'text-primary'}`}>
                      {entry.action}
                    </span>
                    {/* Amount */}
                    {entry.amount !== undefined && (
                      <span className="shrink-0 text-secondary font-bold">${entry.amount.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Toast Notification */}
        {actionToast && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="gold-gradient px-8 py-4 rounded-2xl shadow-2xl border-2 border-primary/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white">account_circle</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">{actionToast.player}</p>
                  <p className="text-xl font-headline font-black text-white">{actionToast.action}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Hand Prompt - 非模态框，显示在底部 */}
        {showNextHandPrompt && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center">
            <div className="glass-panel rounded-t-2xl px-8 py-4 flex items-center gap-6 border border-white/10 shadow-2xl">
              <div className="text-center">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider">Result</p>
                <p className={`text-lg font-headline font-black ${lastPotWon > 0 ? 'text-primary' : 'text-on-surface'}`}>
                  {lastPotWon > 0 ? `+$${lastPotWon.toLocaleString()}` : 'Hand Lost'}
                </p>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <button
                onClick={() => router.push('/summary')}
                className="px-5 py-3 bg-surface-container-high hover:bg-surface-bright text-on-surface rounded-xl font-headline font-bold transition-all text-sm"
              >
                End Session
              </button>
              <button
                onClick={handleNextHand}
                className="px-6 py-3 gold-gradient text-on-primary rounded-xl font-headline font-bold transition-all"
              >
                Next Hand
              </button>
            </div>
          </div>
        )}

        {/* Action HUD (Sticky Bottom) */}
        <div className="fixed bottom-0 w-full lg:pl-64 h-32 px-12 flex items-center justify-center pointer-events-none">
          <div className="w-full max-w-5xl glass-panel border border-white/5 rounded-t-3xl p-6 flex items-center justify-between pointer-events-auto shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            {/* Betting Slider Section */}
            {availableActions && (
              <div className={`w-1/4 flex flex-col space-y-3 ${!isPlayerTurn ? 'opacity-50' : ''}`}>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <span>Min: ${availableActions.minRaise}</span>
                  <span>Max: ${availableActions.maxRaise}</span>
                </div>
                <input
                  type="range"
                  min={availableActions.minRaise}
                  max={availableActions.maxRaise}
                  value={betAmount}
                  onChange={(e) => setBetAmount(parseInt(e.target.value))}
                  disabled={!isPlayerTurn}
                  className={`w-full h-2 bg-surface-container-lowest rounded-full appearance-none ${isPlayerTurn ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  style={{
                    background: `linear-gradient(to right, #e9c349 0%, #e9c349 ${((betAmount - availableActions.minRaise) / (availableActions.maxRaise - availableActions.minRaise)) * 100}%, #0e0e0e ${((betAmount - availableActions.minRaise) / (availableActions.maxRaise - availableActions.minRaise)) * 100}%, #0e0e0e 100%)`
                  }}
                />
                <div className="text-center font-headline font-black text-xl text-primary">${betAmount.toLocaleString()}</div>
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex items-center space-x-4">
              {/* Fold 按钮始终显示（只要有可用操作） */}
              {availableActions && (
                <button
                  onClick={handleFold}
                  disabled={!isPlayerTurn}
                  className={`px-8 py-4 bg-surface-container-highest text-on-surface rounded-xl font-headline font-bold text-sm border border-outline-variant/20 transition-all ${isPlayerTurn ? 'hover:bg-surface-bright active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Fold
                </button>
              )}

              {availableActions?.canCheck && (
                <button
                  onClick={handleCheck}
                  disabled={!isPlayerTurn}
                  className={`px-8 py-4 bg-surface-container-highest text-on-surface rounded-xl font-headline font-bold text-sm border border-outline-variant/20 transition-all ${isPlayerTurn ? 'hover:bg-surface-bright active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Check
                </button>
              )}

              {availableActions?.canCall && (
                <button
                  onClick={handleCall}
                  disabled={!isPlayerTurn}
                  className={`px-8 py-4 bg-primary-container text-primary rounded-xl font-headline font-bold text-sm border border-primary/20 transition-all ${isPlayerTurn ? 'hover:bg-primary/20 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Call ${availableActions.callAmount}
                </button>
              )}

              {availableActions?.canRaise && (
                <button
                  onClick={handleRaise}
                  disabled={!isPlayerTurn}
                  className={`px-10 py-4 gold-gradient text-on-primary rounded-xl font-headline font-black text-sm shadow-[0_8px_20px_rgba(233,195,73,0.2)] transition-all uppercase tracking-widest ${isPlayerTurn ? 'active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  Raise To ${betAmount.toLocaleString()}
                </button>
              )}

              {availableActions?.canAllIn && (
                <button
                  onClick={handleAllIn}
                  disabled={!isPlayerTurn}
                  className={`px-8 py-4 bg-error-container text-error rounded-xl font-headline font-bold text-sm border border-error/20 transition-all ${isPlayerTurn ? 'hover:bg-error/20 active:scale-95 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                >
                  All-In ${player.chips.toLocaleString()}
                </button>
              )}

              {!isPlayerTurn && availableActions && (
                <div className="px-8 py-4 bg-surface-container-low rounded-xl font-headline font-bold text-sm text-on-surface-variant animate-pulse">
                  Waiting for opponents...
                </div>
              )}
            </div>

            {/* Info Display */}
            {availableActions && (
              <div className="w-1/4 flex justify-end items-center space-x-6">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">Current Bet</div>
                  <div className="text-lg font-headline font-black text-on-surface">${gameState.currentBet.toLocaleString()}</div>
                </div>
                <div className="h-12 w-px bg-white/5"></div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">To Call</div>
                  <div className="text-lg font-headline font-black text-secondary">${availableActions.callAmount.toLocaleString()}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
