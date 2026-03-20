import { Router } from 'express';

const router = Router();

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return h >>> 0;
}
function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ── Basket Definitions ──

interface BasketDef {
  id: string;
  name: string;
  strategy: 'Long Only' | 'Long-Short' | 'Market Neutral';
  direction: 'Long' | 'Short';
  baseNotional: number;       // $M
  baseSpread: number;         // bps over SOFR
  constituentsCount: number;
  rebalanceFreq: 'Monthly' | 'Quarterly';
  inceptionDate: string;
  topHoldings: { ticker: string; baseWeight: number }[];
}

const BASKETS: BasketDef[] = [
  {
    id: 'BSK-001', name: 'US Tech Mega Cap', strategy: 'Long Only', direction: 'Long',
    baseNotional: 480, baseSpread: 25, constituentsCount: 30, rebalanceFreq: 'Quarterly',
    inceptionDate: '2022-03-15',
    topHoldings: [
      { ticker: 'AAPL', baseWeight: 18.5 },
      { ticker: 'MSFT', baseWeight: 16.2 },
      { ticker: 'NVDA', baseWeight: 14.8 },
      { ticker: 'GOOGL', baseWeight: 11.3 },
      { ticker: 'META', baseWeight: 9.7 },
    ],
  },
  {
    id: 'BSK-002', name: 'European Banks', strategy: 'Long-Short', direction: 'Long',
    baseNotional: 320, baseSpread: 38, constituentsCount: 25, rebalanceFreq: 'Monthly',
    inceptionDate: '2023-01-10',
    topHoldings: [
      { ticker: 'BNP.PA', baseWeight: 14.2 },
      { ticker: 'SAN.MC', baseWeight: 12.8 },
      { ticker: 'HSBA.L', baseWeight: 11.5 },
      { ticker: 'DBK.DE', baseWeight: 10.3 },
      { ticker: 'INGA.AS', baseWeight: 9.1 },
    ],
  },
  {
    id: 'BSK-003', name: 'Global Healthcare', strategy: 'Long Only', direction: 'Long',
    baseNotional: 410, baseSpread: 28, constituentsCount: 35, rebalanceFreq: 'Quarterly',
    inceptionDate: '2021-09-01',
    topHoldings: [
      { ticker: 'UNH', baseWeight: 15.6 },
      { ticker: 'LLY', baseWeight: 13.4 },
      { ticker: 'JNJ', baseWeight: 11.8 },
      { ticker: 'ABBV', baseWeight: 10.2 },
      { ticker: 'MRK', baseWeight: 8.9 },
    ],
  },
  {
    id: 'BSK-004', name: 'Asia Semiconductor', strategy: 'Long Only', direction: 'Long',
    baseNotional: 280, baseSpread: 45, constituentsCount: 20, rebalanceFreq: 'Quarterly',
    inceptionDate: '2022-06-20',
    topHoldings: [
      { ticker: 'TSM', baseWeight: 22.4 },
      { ticker: '005930.KS', baseWeight: 16.1 },
      { ticker: 'ASML', baseWeight: 14.7 },
      { ticker: '6723.T', baseWeight: 10.5 },
      { ticker: '2330.TW', baseWeight: 8.8 },
    ],
  },
  {
    id: 'BSK-005', name: 'US Clean Energy', strategy: 'Long-Short', direction: 'Long',
    baseNotional: 180, baseSpread: 52, constituentsCount: 22, rebalanceFreq: 'Monthly',
    inceptionDate: '2023-04-05',
    topHoldings: [
      { ticker: 'ENPH', baseWeight: 14.8 },
      { ticker: 'FSLR', baseWeight: 13.2 },
      { ticker: 'NEE', baseWeight: 11.6 },
      { ticker: 'SEDG', baseWeight: 10.4 },
      { ticker: 'PLUG', baseWeight: 8.7 },
    ],
  },
  {
    id: 'BSK-006', name: 'US Value Factor', strategy: 'Market Neutral', direction: 'Long',
    baseNotional: 350, baseSpread: 32, constituentsCount: 50, rebalanceFreq: 'Monthly',
    inceptionDate: '2021-11-15',
    topHoldings: [
      { ticker: 'BRK.B', baseWeight: 12.3 },
      { ticker: 'JPM', baseWeight: 10.8 },
      { ticker: 'XOM', baseWeight: 9.6 },
      { ticker: 'BAC', baseWeight: 8.4 },
      { ticker: 'CVX', baseWeight: 7.9 },
    ],
  },
  {
    id: 'BSK-007', name: 'EM Consumer', strategy: 'Long Only', direction: 'Long',
    baseNotional: 220, baseSpread: 48, constituentsCount: 28, rebalanceFreq: 'Quarterly',
    inceptionDate: '2022-08-12',
    topHoldings: [
      { ticker: 'BABA', baseWeight: 15.3 },
      { ticker: 'PDD', baseWeight: 12.7 },
      { ticker: 'MELI', baseWeight: 11.4 },
      { ticker: 'JD', baseWeight: 9.8 },
      { ticker: 'RELIANCE.NS', baseWeight: 8.2 },
    ],
  },
  {
    id: 'BSK-008', name: 'Japan Quality', strategy: 'Market Neutral', direction: 'Long',
    baseNotional: 260, baseSpread: 35, constituentsCount: 30, rebalanceFreq: 'Monthly',
    inceptionDate: '2023-02-28',
    topHoldings: [
      { ticker: '7203.T', baseWeight: 14.1 },
      { ticker: '6758.T', baseWeight: 12.6 },
      { ticker: '6861.T', baseWeight: 10.9 },
      { ticker: '8306.T', baseWeight: 9.3 },
      { ticker: '9984.T', baseWeight: 8.5 },
    ],
  },
  {
    id: 'BSK-009', name: 'US REIT Select', strategy: 'Long Only', direction: 'Long',
    baseNotional: 150, baseSpread: 30, constituentsCount: 18, rebalanceFreq: 'Quarterly',
    inceptionDate: '2022-01-20',
    topHoldings: [
      { ticker: 'PLD', baseWeight: 16.8 },
      { ticker: 'AMT', baseWeight: 14.3 },
      { ticker: 'EQIX', baseWeight: 12.1 },
      { ticker: 'SPG', baseWeight: 10.7 },
      { ticker: 'O', baseWeight: 9.4 },
    ],
  },
  {
    id: 'BSK-010', name: 'Global Dividend Aristocrats', strategy: 'Long Only', direction: 'Long',
    baseNotional: 380, baseSpread: 22, constituentsCount: 40, rebalanceFreq: 'Quarterly',
    inceptionDate: '2021-06-01',
    topHoldings: [
      { ticker: 'KO', baseWeight: 8.4 },
      { ticker: 'PG', baseWeight: 7.9 },
      { ticker: 'JNJ', baseWeight: 7.5 },
      { ticker: 'PEP', baseWeight: 6.8 },
      { ticker: 'ABBV', baseWeight: 6.3 },
    ],
  },
];

const SOFR_RATE = 4.30;
const CACHE_TTL = 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('equity-basket-swaps-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round4 = (v: number) => Math.round(v * 10000) / 10000;

  // ── Generate basket data ──

  const baskets = BASKETS.map((b) => {
    const notional = Math.round(jitter(b.baseNotional, 0.15));
    const financingSpread = Math.round(jitter(b.baseSpread, 0.2));

    // Performance figures
    const perf1d = round2((rng() - 0.48) * 2.5);
    const perf1w = round2((rng() - 0.46) * 5.0);
    const perf1m = round2((rng() - 0.44) * 8.0);
    const perfYTD = round2((rng() - 0.40) * 18.0);

    // Inception performance — longer-running baskets tend to have bigger absolute returns
    const inceptionDate = new Date(b.inceptionDate);
    const today = new Date();
    const yearsActive = (today.getTime() - inceptionDate.getTime()) / (365.25 * 86400000);
    const perfInception = round2((rng() - 0.35) * 15.0 * yearsActive);

    // Top holdings with contribution to return
    const topHoldings = b.topHoldings.map((h) => {
      const weight = round2(jitter(h.baseWeight, 0.08));
      const contribution = round2((rng() - 0.42) * weight * 0.15);
      return { ticker: h.ticker, weight, contribution };
    });

    return {
      id: b.id,
      name: b.name,
      strategy: b.strategy,
      notional,
      notionalUnit: 'M USD',
      financingSpread,
      financingSpreadUnit: 'bps over SOFR',
      direction: b.direction,
      inceptionDate: b.inceptionDate,
      performance: { '1d': perf1d, '1w': perf1w, '1m': perf1m, ytd: perfYTD, inception: perfInception },
      constituentsCount: b.constituentsCount,
      rebalanceFreq: b.rebalanceFreq,
      topHoldings,
    };
  });

  // ── Summary ──

  const totalNotional = round2(baskets.reduce((a, b) => a + b.notional, 0) / 1000);
  const activeBaskets = baskets.length;
  const avgFinancingSpread = Math.round(baskets.reduce((a, b) => a + b.financingSpread, 0) / baskets.length);
  const avgBasketSize = Math.round(baskets.reduce((a, b) => a + b.constituentsCount, 0) / baskets.length);

  // Weighted average YTD performance (weighted by notional)
  const totalNotionalM = baskets.reduce((a, b) => a + b.notional, 0);
  const weightedYTD = totalNotionalM > 0
    ? round2(baskets.reduce((a, b) => a + b.performance.ytd * b.notional, 0) / totalNotionalM)
    : 0;

  const summary = {
    totalNotional,
    totalNotionalUnit: 'B USD',
    activeBaskets,
    avgFinancingSpread,
    avgFinancingSpreadUnit: 'bps over SOFR',
    avgBasketSize,
    weightedAvgPerformanceYTD: weightedYTD,
    weightedAvgPerformanceYTDUnit: '%',
  };

  // ── Financing Summary ──

  const strategies = ['Long Only', 'Long-Short', 'Market Neutral'] as const;
  const avgSpreadByStrategy = strategies.map((strat) => {
    const matching = baskets.filter((b) => b.strategy === strat);
    const avg = matching.length > 0
      ? Math.round(matching.reduce((a, b) => a + b.financingSpread, 0) / matching.length)
      : 0;
    return { strategy: strat, avgSpread: avg, spreadUnit: 'bps over SOFR', count: matching.length };
  });

  const totalFinancingCost = round2(
    baskets.reduce((a, b) => a + (b.notional * (SOFR_RATE / 100 + b.financingSpread / 10000)), 0) / 1000,
  );

  const financingSummary = {
    sofrRate: SOFR_RATE,
    sofrRateUnit: '%',
    avgSpreadByStrategy,
    totalFinancingCost,
    totalFinancingCostUnit: 'M USD annualized',
  };

  // ── Performance Attribution ──

  const performanceAttribution = baskets.map((b) => {
    const alpha = round2((rng() - 0.40) * 6.0);
    const trackingError = round2(2.0 + rng() * 8.0);
    const informationRatio = trackingError > 0 ? round2(alpha / trackingError) : 0;
    const maxDrawdown = round2(-(1.5 + rng() * 12.0));

    // Benchmark depends on strategy
    let benchmark = 'S&P 500';
    if (b.name.includes('European')) benchmark = 'Euro Stoxx 50';
    else if (b.name.includes('Asia') || b.name.includes('Japan')) benchmark = 'MSCI AC Asia Pacific';
    else if (b.name.includes('EM')) benchmark = 'MSCI Emerging Markets';
    else if (b.name.includes('REIT')) benchmark = 'FTSE NAREIT All Equity REITs';
    else if (b.name.includes('Healthcare')) benchmark = 'MSCI World Healthcare';
    else if (b.name.includes('Dividend')) benchmark = 'S&P Global Dividend Aristocrats';
    else if (b.name.includes('Clean Energy')) benchmark = 'S&P Global Clean Energy';
    else if (b.name.includes('Value')) benchmark = 'Russell 1000 Value';

    return {
      basketId: b.id,
      basketName: b.name,
      benchmark,
      alpha,
      alphaUnit: '%',
      trackingError,
      trackingErrorUnit: '%',
      informationRatio,
      maxDrawdown,
      maxDrawdownUnit: '%',
    };
  });

  // ── Rebalance Calendar ──

  const today = new Date();
  const rebalanceCalendar: {
    basketId: string;
    basketName: string;
    date: string;
    expectedTurnover: number;
    expectedTurnoverUnit: string;
    lastRebalanceCost: number;
    lastRebalanceCostUnit: string;
  }[] = [];

  // Generate next 5 rebalance events across all baskets
  const futureEvents: { date: Date; basket: typeof baskets[0] }[] = [];
  for (const b of baskets) {
    const intervalMonths = b.rebalanceFreq === 'Monthly' ? 1 : 3;
    // Find next rebalance date based on inception and frequency
    const inception = new Date(b.inceptionDate);
    let nextDate = new Date(inception);
    while (nextDate <= today) {
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + intervalMonths, nextDate.getDate());
    }
    // Add up to 2 future dates per basket
    for (let k = 0; k < 2; k++) {
      futureEvents.push({ date: new Date(nextDate), basket: b });
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + intervalMonths, nextDate.getDate());
    }
  }

  // Sort by date and take the nearest 5
  futureEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
  const next5 = futureEvents.slice(0, 5);

  for (const ev of next5) {
    const expectedTurnover = round2(3.0 + rng() * 15.0);
    const lastRebalanceCost = round2(1.5 + rng() * 6.0);
    rebalanceCalendar.push({
      basketId: ev.basket.id,
      basketName: ev.basket.name,
      date: ev.date.toISOString().slice(0, 10),
      expectedTurnover,
      expectedTurnoverUnit: '%',
      lastRebalanceCost,
      lastRebalanceCostUnit: 'bps',
    });
  }

  return {
    summary,
    baskets,
    financingSummary,
    performanceAttribution,
    rebalanceCalendar,
    generatedAt: new Date().toISOString(),
  };
}

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[EquityBasketSwaps] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate equity basket swap data' });
  }
});

export default router;
