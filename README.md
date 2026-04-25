# High-Stakes Digital - Texas Hold'em Poker

一个高端德州扑克人机对战网页应用，保留原型的深色毛玻璃+金色设计风格。

## 技术栈

- **框架**: Next.js 16 (App Router)
- **样式**: Tailwind CSS v4
- **字体**: Manrope (标题) + Inter (正文)
- **图标**: Material Symbols
- **部署**: Vercel Ready

## 核心功能

### 德州扑克逻辑
- 扑克牌组管理 (52张牌)
- 发牌系统
- 手牌强度评估 (同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌)
- 公共牌判定
- 摊牌比较

### AI 对战系统
- 三种人格类型:
  - **Conservative (保守)**: 紧弱策略，只玩优质牌
  - **Aggressive (激进)**: 松凶策略，高3-bet频率和诈唬
  - **Opportunistic (机会)**: 自适应策略，动态GTO决策
- 三个等级 (G1-G3) 控制难度

### 游戏流程
- Lobby (大厅) - 游戏入口
- Game Setup (游戏配置) - 设置对手数、买入、盲注、下注类型、AI配置
- Poker Table (扑克桌) - 核心对战界面
- Game Summary (结算) - 战绩统计

### 下注系统
- 有限注 / 无限注 支持
- Fold (弃牌) / Check (过牌) / Call (跟注) / Raise (加注) / All-in (全下)

### 胜利/失败条件
- 赢光所有AI筹码 → 胜利
- 玩家筹码归零 → 失败
- 手动开始下一手

## 项目结构

```
high-stakes-digital/
├── src/
│   ├── app/
│   │   ├── globals.css      # 设计系统 (颜色、字体、组件)
│   │   ├── layout.tsx       # 根布局
│   │   ├── page.tsx         # Lobby 页面
│   │   ├── setup/page.tsx   # 游戏配置页面
│   │   ├── game/page.tsx    # 扑克桌页面
│   │   └── summary/page.tsx # 结算页面
│   ├── components/
│   │   ├── Navigation.tsx    # 导航组件
│   │   ├── Card.tsx         # 扑克牌组件
│   │   ├── Lobby.tsx        # 大厅组件
│   │   ├── GameSetup.tsx    # 配置组件
│   │   ├── PokerTable.tsx   # 扑克桌组件
│   │   └── GameSummary.tsx  # 结算组件
│   └── lib/
│       ├── poker.ts         # 扑克核心逻辑
│       ├── ai.ts            # AI决策系统
│       ├── gameState.ts     # 游戏状态管理
│       └── GameContext.tsx  # React Context
└── package.json
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 生产预览
npm run start
```

## 部署到 Vercel

1. Push 到 GitHub
2. 在 Vercel Import 项目
3. Deploy

## 设计系统

遵循 `page_proto/empire_felt/DESIGN.md` 的规范:
- 主色: `#e9c349` (金色)
- 背景: `#131313` (深黑)
- 牌桌: `#29513f` (森林绿)
- 无硬边框分隔，使用背景色阶和毛玻璃效果
