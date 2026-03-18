import { Router } from 'express';

const router = Router();

// ── Types ──

interface ErpMarket {
  market: string;
  index: string;
  earningsYield: number;
  dividendYield: number;
  riskFreeRate: number;
  erp: number;
  erpDividend: number;
  pe: number;
  forwardPe: number;
  cape: number;
  impliedReturn: number;
  erpHistory: number[];
  percentile: number;
  signal: string | null;
}

interface ErpDecomposition {
  component: string;
  value: number;
}

interface EquityRiskPremiumResponse {
  markets: ErpMarket[];
  decomposition: ErpDecomposition[];
  globalAvgErp: number;
  usErpVs20YrAvg: number;
  timestamp: string;
}

// ── Seed Data ──

interface MarketSeed {
  market: string;
  index: string;
  peBase: number;
  forwardPeBase: number;
  capeBase: number;
  divYieldBase: number;
  rfBase: number;
  growthAssumption: number;
  erpCenter: number;
  erpVol: number;
}

const MARKET_SEEDS: MarketSeed[] = [
  { market: 'US', index: 'S&P 500', peBase: 22.5, forwardPeBase: 20.0, capeBase: 30.2, divYieldBase: 1.45, rfBase: 4.25, growthAssumption: 5.0, erpCenter: 4.5, erpVol: 0.6 },
  { market: 'Europe', index: 'STOXX 600', peBase: 14.8, forwardPeBase: 13.2, capeBase: 17.5, divYieldBase: 3.20, rfBase: 2.55, growthAssumption: 3.5, erpCenter: 5.5, erpVol: 0.8 },
  { market: 'Japan', index: 'Nikkei 225', peBase: 16.5, forwardPeBase: 15.0, capeBase: 22.0, divYieldBase: 2.10, rfBase: 0.95, growthAssumption: 2.5, erpCenter: 5.8, erpVol: 0.9 },
  { market: 'UK', index: 'FTSE 100', peBase: 12.5, forwardPeBase: 11.5, capeBase: 14.8, divYieldBase: 3.80, rfBase: 4.10, growthAssumption: 3.0, erpCenter: 5.2, erpVol: 0.7 },
  { market: 'China', index: 'CSI 300', peBase: 13.0, forwardPeBase: 11.8, capeBase: 15.2, divYieldBase: 2.50, rfBase: 2.30, growthAssumption: 6.0, erpCenter: 7.0, erpVol: 1.2 },
  { market: 'Emerging Markets', index: 'MSCI EM', peBase: 12.2, forwardPeBase: 11.0, capeBase: 13.5, divYieldBase: 3.00, rfBase: 5.50, growthAssumption: 5.5, erpCenter: 7.8, erpVol: 1.5 },
  { market: 'Germany', index: 'DAX 40', peBase: 14.0, forwardPeBase: 12.5, capeBase: 16.0, divYieldBase: 3.10, rfBase: 2.40, growthAssumption: 3.2, erpCenter: 5.6, erpVol: 0.8 },
  { market: 'France', index: 'CAC 40', peBase: 15.2, forwardPeBase: 13.5, capeBase: 18.5, divYieldBase: 2.90, rfBase: 2.95, growthAssumption: 3.3, erpCenter: 5.3, erpVol: 0.7 },
  { market: 'Australia', index: 'ASX 200', peBase: 17.0, forwardPeBase: 15.5, capeBase: 20.5, divYieldBase: 4.10, rfBase: 4.05, growthAssumption: 3.5, erpCenter: 4.8, erpVol: 0.6 },
  { market: 'Canada', index: 'S&P/TSX', peBase: 15.8, forwardPeBase: 14.0, capeBase: 19.0, divYieldBase: 3.20, rfBase: 3.45, growthAssumption: 3.8, erpCenter: 5.0, erpVol: 0.7 },
];

const US_20YR_AVG_ERP = 4.8;

// ── Cache ──

let cache: { data: EquityRiskPremiumResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 15 * 60_000; // 15 minutes

// ── Helpers ──

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateErpHistory(center: number, vol: number, dateSeed: number): number[] {
  const history: number[] = [];
  let current = center;
  for (let i = 0; i < 20; i++) {
    const rnd = seededRandom(dateSeed + i * 137) * 2 - 1;
    current = current + rnd * vol * 0.15;
    // Mean revert slightly toward center
    current = current + (center - current) * 0.05;
    history.push(Math.round(current * 100) / 100);
  }
  return history;
}

function computePercentile(erpHistory: number[], currentErp: number): number {
  // Higher ERP = cheaper = higher percentile
  const sorted = [...erpHistory].sort((a, b) => a - b);
  let rank = 0;
  for (const val of sorted) {
    if (currentErp >= val) rank++;
  }
  return Math.round((rank / sorted.length) * 100);
}

function computeSignal(percentile: number): string | null {
  if (percentile >= 90) return 'EXTREME_CHEAP';
  if (percentile >= 70) return 'CHEAP';
  if (percentile <= 10) return 'EXTREME_RICH';
  if (percentile <= 30) return 'RICH';
  if (percentile >= 40 && percentile <= 60) return 'FAIR';
  return null;
}

function generateData(): EquityRiskPremiumResponse {
  const now = Date.now();
  // Use day-level seed so data is stable within same day
  const daySeed = Math.floor(now / 86_400_000);

  const markets: ErpMarket[] = MARKET_SEEDS.map((seed, idx) => {
    const drift = (seededRandom(daySeed + idx * 31) - 0.5) * 0.4;
    const pe = Math.round((seed.peBase + drift * 2) * 10) / 10;
    const forwardPe = Math.round((seed.forwardPeBase + drift * 1.5) * 10) / 10;
    const cape = Math.round((seed.capeBase + drift * 3) * 10) / 10;

    const earningsYield = Math.round((100 / pe) * 100) / 100;
    const divYield = Math.round((seed.divYieldBase + (seededRandom(daySeed + idx * 53) - 0.5) * 0.3) * 100) / 100;
    const rfRate = Math.round((seed.rfBase + (seededRandom(daySeed + idx * 71) - 0.5) * 0.3) * 100) / 100;

    const erp = Math.round((earningsYield - rfRate) * 100) / 100;
    const erpDividend = Math.round((divYield + seed.growthAssumption - rfRate) * 100) / 100;
    const impliedReturn = Math.round((earningsYield + seed.growthAssumption * 0.5) * 100) / 100;

    const erpHistory = generateErpHistory(seed.erpCenter, seed.erpVol, daySeed + idx * 100);
    const percentile = computePercentile(erpHistory, erp);
    const signal = computeSignal(percentile);

    return {
      market: seed.market,
      index: seed.index,
      earningsYield,
      dividendYield: divYield,
      riskFreeRate: rfRate,
      erp,
      erpDividend,
      pe,
      forwardPe,
      cape,
      impliedReturn,
      erpHistory,
      percentile,
      signal,
    };
  });

  // US market decomposition (building blocks)
  const usMarket = markets.find((m) => m.market === 'US')!;
  const inflationPremium = 2.3;
  const realRiskFree = Math.round((usMarket.riskFreeRate - inflationPremium) * 100) / 100;
  const sizePremium = 1.8;
  const valuePremium = 1.2;
  const totalExpected = Math.round(
    (usMarket.riskFreeRate + usMarket.erp + sizePremium + valuePremium) * 100,
  ) / 100;

  const decomposition: ErpDecomposition[] = [
    { component: 'Risk Free Rate', value: usMarket.riskFreeRate },
    { component: 'Inflation Premium', value: inflationPremium },
    { component: 'Real Risk Free', value: realRiskFree },
    { component: 'Equity Risk Premium', value: usMarket.erp },
    { component: 'Size Premium', value: sizePremium },
    { component: 'Value Premium', value: valuePremium },
    { component: 'Total Expected Return', value: totalExpected },
  ];

  const globalAvgErp = Math.round(
    (markets.reduce((sum, m) => sum + m.erp, 0) / markets.length) * 100,
  ) / 100;

  const usErpVs20YrAvg = Math.round((usMarket.erp - US_20YR_AVG_ERP) * 100) / 100;

  return {
    markets,
    decomposition,
    globalAvgErp,
    usErpVs20YrAvg,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const result = generateData();
    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: any) {
    console.error('[EquityRiskPremium] Error:', err?.message || err);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate equity risk premium data' });
  }
});

export default router;
