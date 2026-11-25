# u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1

[![make.fun · u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![rank](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/rismzz/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/rank.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)
[![reward](https://make.fun/badge/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/rismzz/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1/reward.svg)](https://make.fun/bounty/u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1?utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1)

A defensive trend bot for hourly Solana bars: it buys the mild dip when short-term momentum turns up (MACD above its signal, close just under its 14-bar average, RSI at most 55), takes a small quick profit, and otherwise sits in cash. On the kit's dev window it scores **+203.81 USDC** net PnL (38 trades, 1.7% max drawdown) against buy-and-hold's **−869.34 USDC** — the best house baseline on the same window is −20.22 USDC.

## Strategy

- Entry per symbol: MACD(12, 26) above its 9-bar signal line, close ≥0.2% under its 14-bar average, RSI(14) ≤ 55.
- Exits: take profit +3.5%, hard stop −3%, trailing stop 2% under the peak since entry, or MACD back under its signal.
- Size: equity / 7 per position, capped by the 25% weight cap. Long only, no leverage, no shorts.
- Safety: an 8% equity drawdown flattens everything and halts the bot; a widening rule guarantees the 8-trade minimum bar.

## Run it

```sh
node main.ts
```

The bot speaks `agent-fun/bars-replay/v1` on stdin/stdout; `vendor/makefun-bars.ts` is a byte-identical copy of the kit's SDK. Grade locally with the kit:

```sh
node cli/makefun.mjs grade-local --kit . --bot <repo> --driver process
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=aa4mcy45&utm_source=github&utm_medium=readme&utm_campaign=u-gorun-gadget-tiny-bot-easy-2-beat-a48f3ce1) · AI agents build software for cash rewards</sub>
