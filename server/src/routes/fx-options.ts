import { Router } from 'express';

const router = Router();

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Currency Pair Definitions ──

interface PairConfig {
  id: string;
  name: string;
  spot: number;
  baseATM1M: number;
  fwdPoints1M: number;
  pipFactor: number;
}

const PAIRS: PairConfig[] = [
  { id: 'EURUSD', name: 'EUR/USD', spot: 1.0855, baseATM1M: 7.20, fwdPoints1M: -1.2, pipFactor: 10000 },
  { id: 'USDJPY', name: 'USD/JPY', spot: 149.50, baseATM1M: 9.80, fwdPoints1M: -52.0, pipFactor: 100 },
  { id: 'GBPUSD', name: 'GBP/USD', spot: 1.2650, baseATM1M: 7.80, fwdPoints1M: -0.8, pipFactor: 10000 },
  { id: 'AUDUSD', name: 'AUD/USD', spot: 0.6520, baseATM1M: 9.50, fwdPoints1M: 1.5, pipFactor: 10000 },
  { id: 'USDCAD', name: 'USD/CAD', spot: 1.3580, baseATM1M: 6.50, fwdPoints1M: 3.2, pipFactor: 10000 },
  { id: 'USDCHF', name: 'USD/CHF', spot: 0.8750, baseATM1M: 7.00, fwdPoints1M: -8.5, pipFactor: 10000 },
  { id: 'NZDUSD', name: 'NZD/USD', spot: 0.6080, baseATM1M: 10.20, fwdPoints1M: 0.9, pipFactor: 10000 },
  { id: 'EURGBP', name: 'EUR/GBP', spot: 0.8580, baseATM1M: 6.80, fwdPoints1M: -0.4, pipFactor: 10000 },
  { id: 'EURJPY', name: 'EUR/JPY', spot: 162.20, baseATM1M: 10.00, fwdPoints1M: -55.0, pipFactor: 100 },
  { id: 'GBPJPY', name: 'GBP/JPY', spot: 189.10, baseATM1M: 11.50, fwdPoints1M: -60.0, pipFactor: 100 },
];

const TENORS = ['1W', '1M', '3M', '6M', '1Y'] as const;

// Tenor multipliers for ATM vol term structure
const TENOR_FACTORS: Record<string, number> = {
  '1W': 0.85,
  '1M': 1.00,
  '3M': 1.06,
  '6M': 1.11,
  '1Y': 1.18,
};

// ── Data Generation ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-fx-options-panel'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // ── 1. Volatility Surface ──
  // For each pair and tenor: ATM vol, 25D RR, 25D BF, 10D RR, 10D BF
  const volatilitySurface = PAIRS.map(pair => {
    const tenors = TENORS.map(tenor => {
      const tf = TENOR_FACTORS[tenor];
      const atmVol = Math.round(jitter(pair.baseATM1M * tf, 0.06) * 100) / 100;

      // Risk reversals: negative = puts trade richer (skew toward downside protection)
      // Magnitude scales with base vol and tenor
      const baseRR25 = pair.baseATM1M > 9 ? -0.60 : -0.20;
      const rr25 = Math.round(jitter(baseRR25 * tf, 0.25) * 100) / 100;
      const rr10 = Math.round(jitter(baseRR25 * 2.2 * tf, 0.25) * 100) / 100;

      // Butterflies: always positive (wings trade above ATM), increase with tenor
      const baseBF25 = 0.15 + pair.baseATM1M * 0.012;
      const bf25 = Math.round(Math.max(0.05, jitter(baseBF25 * tf, 0.20)) * 100) / 100;
      const bf10 = Math.round(Math.max(0.15, jitter(baseBF25 * 2.8 * tf, 0.20)) * 100) / 100;

      return {
        tenor,
        atmVol,
        rr25,
        bf25,
        rr10,
        bf10,
      };
    });

    return {
      pair: pair.name,
      pairId: pair.id,
      tenors,
    };
  });

  // ── 2. Greeks Monitor ──
  // Simulated portfolio positions with Greeks per pair
  const greeksMonitor = PAIRS.map(pair => {
    const isLong = rng() > 0.45;
    const notionalM = Math.round(jitter(25, 0.60) * 10) / 10; // in millions
    const sign = isLong ? 1 : -1;

    // Delta: expressed in base currency millions, typically +-0.1 to +-5M
    const delta = Math.round(sign * jitter(notionalM * 0.4, 0.30) * 10000) / 10000;

    // Gamma: delta change per 1% spot move, much smaller than delta
    const gamma = Math.round(sign * jitter(notionalM * 0.02, 0.40) * 10000) / 10000;

    // Vega: P&L per 1 vol point move (in thousands)
    const vega = Math.round(sign * jitter(notionalM * 1.5, 0.35) * 100) / 100;

    // Theta: daily time decay (always negative for long options)
    const theta = Math.round(-Math.abs(jitter(notionalM * 0.08, 0.40)) * (isLong ? 1 : -1) * 100) / 100;

    // Rho: sensitivity to 1% rate change
    const rho = Math.round(sign * jitter(notionalM * 0.05, 0.50) * 100) / 100;

    return {
      pair: pair.name,
      pairId: pair.id,
      notionalM,
      direction: isLong ? 'Long' as const : 'Short' as const,
      delta,
      gamma,
      vega,
      theta,
      rho,
    };
  });

  // Portfolio-level aggregate Greeks
  const portfolioGreeks = {
    totalDelta: Math.round(greeksMonitor.reduce((sum, g) => sum + g.delta, 0) * 10000) / 10000,
    totalGamma: Math.round(greeksMonitor.reduce((sum, g) => sum + g.gamma, 0) * 10000) / 10000,
    totalVega: Math.round(greeksMonitor.reduce((sum, g) => sum + g.vega, 0) * 100) / 100,
    totalTheta: Math.round(greeksMonitor.reduce((sum, g) => sum + g.theta, 0) * 100) / 100,
    totalRho: Math.round(greeksMonitor.reduce((sum, g) => sum + g.rho, 0) * 100) / 100,
  };

  // ── 3. Market Snapshot ──
  // Spot, forward points, implied vols, skew for each pair
  const marketSnapshot = PAIRS.map(pair => {
    const spot = Math.round(jitter(pair.spot, 0.004) * pair.pipFactor) / pair.pipFactor;
    const fwdPoints1M = Math.round(jitter(pair.fwdPoints1M, 0.15) * 10) / 10;

    // 1M ATM implied vol
    const atmIV1M = Math.round(jitter(pair.baseATM1M, 0.06) * 100) / 100;

    // 25D put vol is higher than ATM (protective demand), 25D call vol lower
    const putSkewBase = pair.baseATM1M > 9 ? 0.45 : 0.18;
    const callSkewBase = pair.baseATM1M > 9 ? -0.15 : -0.05;
    const put25Vol1M = Math.round((atmIV1M + jitter(putSkewBase, 0.25)) * 100) / 100;
    const call25Vol1M = Math.round((atmIV1M + jitter(callSkewBase, 0.30)) * 100) / 100;
    const putCallSkew = Math.round((put25Vol1M - call25Vol1M) * 100) / 100;

    return {
      pair: pair.name,
      pairId: pair.id,
      spot,
      fwdPoints1M,
      atmIV1M,
      put25Vol1M,
      call25Vol1M,
      putCallSkew,
    };
  });

  return {
    volatilitySurface,
    greeksMonitor: {
      positions: greeksMonitor,
      portfolio: portfolioGreeks,
    },
    marketSnapshot,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route Handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[FXOptions] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate FX options data' });
  }
});

export default router;
