// Tiny Bot, Easy $2: Beat Buy-and-Hold on Solana.
// Speaks agent-fun/bars-replay/v1: the harness sends hello once, then one
// batch per hourly bar, and this bot answers every batch with its orders.
// Orders decided on a bar fill at the next bar's open.
//
// Strategy — buy the mild dip when short-term momentum turns up, long
// only, mostly cash. Two earlier designs lost on the dev window, and the
// diagnosis is in the data:
//   - A bare EMA(8)/EMA(21) crossover buys breakouts: 28 trades, 12% win
//     rate, -172 USDC. In a down market every cross is a dead-cat bounce.
//   - A 3% dip inside an EMA uptrend never fires at all: when the trend
//     is up the close sits above its average, so the two conditions
//     almost never coincide (0 signals in 952 bars).
// What does fire is short-term momentum turning up while the price is
// still just under its own average — a mild pullback, typically 0.04 to
// 1.7% under the 14-bar mean, not a crash. So, per symbol:
//   - Entry: MACD(12, 26) above its 9-bar signal line (short-term
//     momentum turned up) AND the close at least 0.2% under its 14-bar
//     average (still a pullback, not a chase) AND RSI(14) at or under 55
//     (not overbought). All three must hold.
//   - Exits (whole position): take profit at 3.5% over cost, hard stop at
//     3% under cost, trailing stop 2% under the peak since entry, or
//     MACD crossing back under its signal line (the momentum broke).
//   - Size: equity / 7 per position, capped by the 25% weight cap and by
//     the cash this reply has not spent yet. Sells never fund buys of the
//     same reply; proceeds land at the next open.
//   - Safety: an 8% equity drawdown from peak flattens everything and
//     halts the bot. The guardrail allows 25%; staying far inside it
//     keeps a bad final window from ranking the bot below the entries
//     that meet the guardrails.
//   - Trade-count guardrail: the minimum bar is 8 trades. If fewer than
//     8 buys have been sent by seq 48, entries widen to any pullback
//     (close under its average) with RSI at or under 60, so the bot never
//     finishes a 72-bar final window short of the minimum.
// Indicators follow TA-Lib's seeding: EMA(26) starts as the mean of the
// first 26 closes, EMA(12) as the mean of the 12 closes up to that bar,
// the signal line as the mean of the first 9 MACD values. All arithmetic
// is float64 on the closes, deterministic run after run: no clock, no
// environment, no randomness. Slippage is capped at 100 bps (1%) past the
// close an order was decided on, so a fill into a liquidity gap is
// refused rather than filled for almost nothing.

import { BPS, runBars, type Bar, type BarsState, type BuyInput, type OrderInput, type SellInput } from './vendor/makefun-bars.ts';

const FAST_BARS = 12;
const SLOW_BARS = 26;
const SIGNAL_BARS = 9;
const MEAN_BARS = 14;
const RSI_PERIOD = 14;
const DIP_PCT = 0.002; // close this far under its 14-bar average
const RSI_MAX = 55; // not overbought: the dip must still have room to bounce
const WIDE_RSI_MAX = 60;
const STOP_RATIO = 0.97; // sell at 3% under cost
const TAKE_RATIO = 1.035; // sell at 3.5% over cost
const TRAIL_RATIO = 0.98; // sell at 2% under the peak since entry
const EQUITY_DD_HALT = 0.08; // flatten + halt at 8% equity drawdown
const WIDEN_SEQ = 48; // widen entries if fewer than 8 buys sent by here
const MIN_TRADES = 8;
const MAX_SLIPPAGE_BPS = 100;

/** One symbol's MACD state, seeded the way TA-Lib seeds it. */
interface Series {
  /** The first SLOW_BARS closes, until the EMAs start. */
  warm: number[];
  fast: number | null;
  slow: number | null;
  /** The first SIGNAL_BARS MACD values, until the signal line starts. */
  macds: number[];
  signal: number | null;
  /** Highest value/cost ratio seen while holding this symbol. */
  peakRatio: number;
}

const series = new Map<string, Series>();
const closes = new Map<string, number[]>();
let priceScales = new Map<string, number>();
let peakEquity = 0n;
let halted = false;
let buysSent = 0;

const mean = (xs: readonly number[]): number => xs.reduce((a, x) => a + x, 0) / xs.length;
const emaStep = (last: number, x: number, bars: number): number => (x - last) * (2 / (bars + 1)) + last;

/** Fold a bar into its symbol's indicators; returns MACD minus signal, or null. */
function push(bar: Bar): number | null {
  let s = series.get(bar.symbol);
  if (s === undefined) {
    s = { warm: [], fast: null, slow: null, macds: [], signal: null, peakRatio: 0 };
    series.set(bar.symbol, s);
  }
  const c = Number(bar.c) / 10 ** (priceScales.get(bar.symbol) ?? 0);
  if (s.slow === null || s.fast === null) {
    s.warm.push(c);
    if (s.warm.length === SLOW_BARS) {
      s.slow = mean(s.warm);
      s.fast = mean(s.warm.slice(SLOW_BARS - FAST_BARS));
    }
    return null;
  }
  s.fast = emaStep(s.fast, c, FAST_BARS);
  s.slow = emaStep(s.slow, c, SLOW_BARS);
  const macd = s.fast - s.slow;
  if (s.signal !== null) {
    s.signal = emaStep(s.signal, macd, SIGNAL_BARS);
  } else {
    s.macds.push(macd);
    if (s.macds.length === SIGNAL_BARS) s.signal = mean(s.macds);
  }
  return s.signal === null ? null : macd - s.signal;
}

/** RSI over the closes seen so far (mean of the last 14 changes). */
function rsi(values: number[], period: number): number | null {
  if (values.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  const avgGain = gain / period;
  const avgLoss = loss / period;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

await runBars({
  onHello(state) {
    for (const s of state.hello.symbols) priceScales.set(s.symbol, s.price_scale);
  },
  onBatch(state, batch) {
    if (state.equity > peakEquity) peakEquity = state.equity;
    if (halted) return [];
    // Equity drawdown halt: flatten everything once, then stop trading.
    if (peakEquity > 0n && state.equity * 100n < peakEquity * BigInt(Math.round((1 - EQUITY_DD_HALT) * 100))) {
      halted = true;
      const sells: SellInput[] = [];
      for (const [symbol, pos] of state.positions) {
        sells.push({ side: 'sell', symbol, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
      return sells;
    }

    const momentum = new Map<string, number | null>();
    for (const bar of batch.bars) {
      const list = closes.get(bar.symbol) ?? [];
      list.push(Number(bar.c) / 10 ** (priceScales.get(bar.symbol) ?? 0));
      closes.set(bar.symbol, list);
      momentum.set(bar.symbol, push(bar));
    }

    const orders: OrderInput[] = [];
    const { caps, fees } = state.hello;
    const minNotional = BigInt(fees.min_notional_quote_units);
    let cashLeft = state.cash;
    const widen = buysSent < MIN_TRADES && state.seq >= WIDEN_SEQ;

    // Reset the trailing peak for symbols with no position, so a later
    // re-entry starts its trail fresh instead of tripping on an old peak.
    for (const [symbol, s] of series) {
      if (!state.positions.has(symbol)) s.peakRatio = 0;
    }

    // Sells first: exits never fund buys of the same reply.
    for (const [symbol, pos] of state.positions) {
      const s = series.get(symbol);
      const value = state.value(symbol, pos.qty);
      const cost = pos.cost;
      if (s === undefined || cost === 0n || value === 0n) continue;
      const ratio = Number(value) / Number(cost);
      if (ratio > s.peakRatio) s.peakRatio = ratio;
      const momentumBroke = momentum.get(symbol) !== undefined && (momentum.get(symbol) ?? 1) < 0;
      if (momentumBroke || ratio <= STOP_RATIO || ratio >= TAKE_RATIO || ratio <= s.peakRatio * TRAIL_RATIO) {
        orders.push({ side: 'sell', symbol, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
      }
    }
    const sold = new Set(orders.filter((o) => o.side === 'sell').map((o) => o.symbol));

    // Buys: one slot per symbol, equity / 7, capped by the weight cap.
    const slots = Math.min(state.hello.symbols.length, caps.max_open_positions);
    const held = state.positions.size - sold.size;
    for (const { symbol } of state.hello.symbols) {
      if (orders.length >= caps.max_orders_per_bar) break;
      if (held + orders.filter((o) => o.side === 'buy').length >= slots) break;
      if (state.positions.has(symbol) && !sold.has(symbol)) continue;
      const s = series.get(symbol);
      const hist = closes.get(symbol) ?? [];
      if (s === undefined || s.signal === null) continue;
      if (hist.length < MEAN_BARS) continue;
      const mom = momentum.get(symbol);
      if (mom === null || mom === undefined || mom <= 0) continue;
      const mean14 = mean(hist.slice(hist.length - MEAN_BARS));
      const close = hist[hist.length - 1]!;
      const dipPct = widen ? 0 : DIP_PCT;
      if (close > mean14 * (1 - dipPct)) continue;
      const r = rsi(hist, RSI_PERIOD);
      if (r === null) continue;
      const rsiMax = widen ? WIDE_RSI_MAX : RSI_MAX;
      if (r > rsiMax) continue;
      const bySlots = state.equity / BigInt(slots);
      const byWeight = (BigInt(caps.max_weight_bps) * state.equity) / BPS;
      let notional = bySlots < byWeight ? bySlots : byWeight;
      if (notional > cashLeft) notional = cashLeft;
      if (notional < minNotional) continue;
      cashLeft -= notional;
      buysSent++;
      orders.push({ side: 'buy', symbol, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS });
    }
    return orders;
  },
});
