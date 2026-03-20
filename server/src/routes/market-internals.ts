import { Router } from 'express';

import { mulberry32, CACHE_TTL } from '../lib/seeded-data';
function dateSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function randRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(randRange(rng, min, max + 1));
}

function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Divergence = 'Bullish' | 'Bearish' | 'None';
type TrinInterpretation = 'Oversold' | 'Neutral' | 'Overbought';

interface AdvanceDecline {
  advancing: number;
  declining: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  adLine5dMA: number;
  adLine20dMA: number;
}

interface NewHighsLows {
  newHighs: number;
  newLows: number;
  hlRatio: number;
  hlDiff: number;
  hlDiff10dMA: number;
}

interface VolumeData {
  upVolume: number;
  downVolume: number;
  unchangedVolume: number;
  uvdvRatio: number;
}

interface McClellan {
  oscillator: number;
  summationIndex: number;
  signal: number;
  divergence: Divergence;
}

interface Trin {
  value: number;
  interpretation: TrinInterpretation;
  ma5d: number;
}

interface TickIndex {
  current: number;
  high: number;
  low: number;
  close: number;
}

interface PercentAboveMA {
  above20dMA: number;
  above50dMA: number;
  above200dMA: number;
}

interface BreadthThrust {
  value: number;
  thrustSignal: boolean;
  lastThrustDate: string | null;
}

interface ExchangeData {
  exchange: string;
  advanceDecline: AdvanceDecline;
  newHighsLows: NewHighsLows;
  volume: VolumeData;
  mcclellan: McClellan;
  trin: Trin;
  tickIndex: TickIndex;
  percentAboveMA: PercentAboveMA;
  breadthThrust: BreadthThrust;
}

interface HistoryEntry {
  date: string;
  adRatio: number;
  mcclellanOsc: number;
  trin: number;
  pctAbove200MA: number;
}

interface MarketInternalsResponse {
  exchanges: ExchangeData[];
  history: HistoryEntry[];
  generatedAt: string;
}

// ── Data Generation ───────────────────────────────────────────────────────────
const EXCHANGE_CONFIGS: { name: string; totalStocks: number; seed_offset: number }[] = [
  { name: 'NYSE', totalStocks: 3200, seed_offset: 0 },
  { name: 'NASDAQ', totalStocks: 3400, seed_offset: 1000 },
  { name: 'COMBINED', totalStocks: 6600, seed_offset: 2000 },
];

function generateExchange(
  name: string,
  totalStocks: number,
  rng: () => number,
): ExchangeData {
  // Advance / Decline
  const advPct = randRange(rng, 0.30, 0.65);
  const decPct = randRange(rng, 0.25, 0.60);
  const remaining = 1 - Math.min(advPct + decPct, 0.98);
  const advancing = Math.round(totalStocks * advPct);
  const declining = Math.round(totalStocks * decPct);
  const unchanged = Math.max(0, totalStocks - advancing - declining);
  const adRatio = declining > 0 ? round(advancing / declining) : 999;
  const adLine = advancing - declining;
  const adLine5dMA = round(adLine * randRange(rng, 0.85, 1.15));
  const adLine20dMA = round(adLine * randRange(rng, 0.70, 1.30));

  // New Highs / Lows
  const newHighs = randInt(rng, 20, 250);
  const newLows = randInt(rng, 10, 180);
  const hlRatio = newLows > 0 ? round(newHighs / newLows) : 999;
  const hlDiff = newHighs - newLows;
  const hlDiff10dMA = round(hlDiff * randRange(rng, 0.75, 1.25));

  // Volume
  const upVolume = randInt(rng, 800_000_000, 3_500_000_000);
  const downVolume = randInt(rng, 600_000_000, 3_000_000_000);
  const unchangedVolume = randInt(rng, 50_000_000, 400_000_000);
  const uvdvRatio = downVolume > 0 ? round(upVolume / downVolume) : 999;

  // McClellan
  const oscillator = round(randRange(rng, -120, 120));
  const summationIndex = round(randRange(rng, -1500, 2500));
  const signal = round(oscillator * randRange(rng, 0.6, 1.1));
  let divergence: Divergence = 'None';
  if (oscillator > 0 && adLine < 0) divergence = 'Bullish';
  else if (oscillator < 0 && adLine > 0) divergence = 'Bearish';

  // TRIN (Arms Index)
  const trinValue = round(randRange(rng, 0.4, 2.5));
  let interpretation: TrinInterpretation = 'Neutral';
  if (trinValue > 1.5) interpretation = 'Oversold';
  else if (trinValue < 0.7) interpretation = 'Overbought';
  const ma5d = round(trinValue * randRange(rng, 0.85, 1.15));

  // Tick Index
  const tickCurrent = randInt(rng, -800, 800);
  const tickHigh = randInt(rng, Math.max(tickCurrent, 200), 1200);
  const tickLow = randInt(rng, -1200, Math.min(tickCurrent, -200));
  const tickClose = randInt(rng, tickLow, tickHigh);

  // Percent Above MA
  const above20dMA = round(randRange(rng, 25, 85));
  const above50dMA = round(randRange(rng, 20, 78));
  const above200dMA = round(randRange(rng, 30, 75));

  // Breadth Thrust
  const thrustValue = round(randRange(rng, 0.35, 0.75));
  const thrustSignal = thrustValue > 0.614; // classic Zweig breadth thrust threshold
  const daysBack = randInt(rng, 30, 365);
  const thrustDate = new Date();
  thrustDate.setDate(thrustDate.getDate() - daysBack);
  const lastThrustDate = thrustSignal
    ? thrustDate.toISOString().slice(0, 10)
    : null;

  return {
    exchange: name,
    advanceDecline: {
      advancing, declining, unchanged, adRatio, adLine, adLine5dMA, adLine20dMA,
    },
    newHighsLows: { newHighs, newLows, hlRatio, hlDiff, hlDiff10dMA },
    volume: { upVolume, downVolume, unchangedVolume, uvdvRatio },
    mcclellan: { oscillator, summationIndex, signal, divergence },
    trin: { value: trinValue, interpretation, ma5d },
    tickIndex: { current: tickCurrent, high: tickHigh, low: tickLow, close: tickClose },
    percentAboveMA: { above20dMA, above50dMA, above200dMA },
    breadthThrust: { value: thrustValue, thrustSignal, lastThrustDate },
  };
}

function generateHistory(rng: () => number): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  const now = new Date();

  for (let i = 19; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    // Skip weekends
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue;

    entries.push({
      date: d.toISOString().slice(0, 10),
      adRatio: round(randRange(rng, 0.5, 2.5)),
      mcclellanOsc: round(randRange(rng, -100, 100)),
      trin: round(randRange(rng, 0.5, 2.2)),
      pctAbove200MA: round(randRange(rng, 30, 75)),
    });
  }

  // Ensure exactly 20 entries (fill gaps from weekends)
  while (entries.length < 20) {
    const d = new Date(now);
    d.setDate(d.getDate() - (20 + entries.length));
    entries.unshift({
      date: d.toISOString().slice(0, 10),
      adRatio: round(randRange(rng, 0.5, 2.5)),
      mcclellanOsc: round(randRange(rng, -100, 100)),
      trin: round(randRange(rng, 0.5, 2.2)),
      pctAbove200MA: round(randRange(rng, 30, 75)),
    });
  }

  return entries.slice(0, 20);
}

function generateMarketInternals(): MarketInternalsResponse {
  const today = new Date();
  const seed = dateSeed(today);

  const exchanges = EXCHANGE_CONFIGS.map((cfg) => {
    const rng = mulberry32(seed + cfg.seed_offset);
    return generateExchange(cfg.name, cfg.totalStocks, rng);
  });

  const historyRng = mulberry32(seed + 5000);
  const history = generateHistory(historyRng);

  return {
    exchanges,
    history,
    generatedAt: today.toISOString(),
  };
}
let cache: MarketInternalsResponse | null = null;
let cacheTime = 0;

// ── Router ────────────────────────────────────────────────────────────────────
const router = Router();

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json(cache);
    }

    cache = generateMarketInternals();
    cacheTime = now;
    res.json(cache);
  } catch (err) {
    console.error('[MarketInternals] Error:', err instanceof Error ? err.message : err);
    // Stale fallback
    if (cache) return res.json(cache);
    res.status(503).json({ error: 'Market internals data temporarily unavailable' });
  }
});

export default router;
