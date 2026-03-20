import { Router } from 'express';

import { mulberry32, hashSeed } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface GDPComponent {
  name: string;
  contribution: number;
  weight: number;
  latestValue: number;
  trend: 'accelerating' | 'stable' | 'decelerating';
}

interface DataInput {
  indicator: string;
  value: string;
  date: string;
  impact: 'positive' | 'negative' | 'neutral';
}

interface HistoricalNowcast {
  quarter: string;
  nowcast: number;
  actual: number;
  error: number;
}

interface EconomyNowcast {
  country: string;
  code: string;
  currency: string;
  currentQuarter: string;
  nowcast: number;
  previousEstimate: number;
  revision: number;
  officialForecast: number;
  consensusForecast: number;
  lastOfficialGDP: number;
  modelConfidence: number;
  components: GDPComponent[];
  dataInputs: DataInput[];
  historicalNowcasts: HistoricalNowcast[];
}

interface GlobalGDPTracker {
  globalGrowth: number;
  advancedEconomies: number;
  emergingMarkets: number;
}

interface SignalStrength {
  positive: number;
  negative: number;
  neutral: number;
}

interface GDPNowcastResponse {
  economies: EconomyNowcast[];
  globalGDPTracker: GlobalGDPTracker;
  signalStrength: SignalStrength;
  lastUpdated: string;
}

// ── Cache ──

let cache: { data: GDPNowcastResponse; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Economy base data (realistic 2026 conditions) ──

interface EconomyBase {
  country: string;
  code: string;
  currency: string;
  gdpBase: number;
  officialForecast: number;
  consensusForecast: number;
  lastOfficial: number;
  confidenceBase: number;
  componentWeights: {
    consumer: number;
    business: number;
    government: number;
    netExports: number;
    inventory: number;
    housing: number;
  };
  indicators: { name: string; valueFmt: (rng: () => number) => string }[];
}

const COMPONENT_NAMES = [
  'Consumer Spending',
  'Business Investment',
  'Government Spending',
  'Net Exports',
  'Inventory Change',
  'Housing',
];

const ECONOMIES: EconomyBase[] = [
  {
    country: 'United States', code: 'US', currency: 'USD',
    gdpBase: 2.3, officialForecast: 2.1, consensusForecast: 2.2, lastOfficial: 2.5, confidenceBase: 82,
    componentWeights: { consumer: 0.38, business: 0.22, government: 0.17, netExports: 0.08, inventory: 0.05, housing: 0.10 },
    indicators: [
      { name: 'Retail Sales', valueFmt: (r) => `${(r() * 0.8 - 0.2).toFixed(1)}% m/m` },
      { name: 'ISM Manufacturing PMI', valueFmt: (r) => `${(50 + (r() - 0.3) * 6).toFixed(1)}` },
      { name: 'Initial Jobless Claims', valueFmt: (r) => `${Math.round(200 + r() * 40)}K` },
      { name: 'Nonfarm Payrolls', valueFmt: (r) => `+${Math.round(120 + r() * 130)}K` },
      { name: 'Industrial Production', valueFmt: (r) => `${(r() * 0.8 - 0.2).toFixed(1)}% m/m` },
    ],
  },
  {
    country: 'Eurozone', code: 'EZ', currency: 'EUR',
    gdpBase: 1.1, officialForecast: 1.0, consensusForecast: 1.0, lastOfficial: 0.8, confidenceBase: 72,
    componentWeights: { consumer: 0.33, business: 0.20, government: 0.21, netExports: 0.12, inventory: 0.04, housing: 0.10 },
    indicators: [
      { name: 'EZ Composite PMI', valueFmt: (r) => `${(48 + r() * 5).toFixed(1)}` },
      { name: 'EZ Retail Sales', valueFmt: (r) => `${(r() * 0.6 - 0.2).toFixed(1)}% m/m` },
      { name: 'German IFO Business Climate', valueFmt: (r) => `${(85 + r() * 8).toFixed(1)}` },
      { name: 'EZ Industrial Production', valueFmt: (r) => `${(r() * 1.0 - 0.6).toFixed(1)}% m/m` },
      { name: 'EZ Unemployment Rate', valueFmt: (r) => `${(6.2 + r() * 0.5).toFixed(1)}%` },
    ],
  },
  {
    country: 'United Kingdom', code: 'GB', currency: 'GBP',
    gdpBase: 1.3, officialForecast: 1.2, consensusForecast: 1.2, lastOfficial: 1.0, confidenceBase: 74,
    componentWeights: { consumer: 0.36, business: 0.19, government: 0.20, netExports: 0.09, inventory: 0.05, housing: 0.11 },
    indicators: [
      { name: 'UK Composite PMI', valueFmt: (r) => `${(49 + r() * 5).toFixed(1)}` },
      { name: 'UK Retail Sales', valueFmt: (r) => `${(r() * 0.8 - 0.3).toFixed(1)}% m/m` },
      { name: 'UK CPI', valueFmt: (r) => `${(2.5 + r() * 1.0).toFixed(1)}% y/y` },
      { name: 'UK Industrial Output', valueFmt: (r) => `${(r() * 0.8 - 0.4).toFixed(1)}% m/m` },
      { name: 'UK Claimant Count', valueFmt: (r) => `${(r() * 30 - 10).toFixed(1)}K` },
    ],
  },
  {
    country: 'Japan', code: 'JP', currency: 'JPY',
    gdpBase: 1.0, officialForecast: 0.9, consensusForecast: 0.9, lastOfficial: 1.1, confidenceBase: 70,
    componentWeights: { consumer: 0.30, business: 0.22, government: 0.20, netExports: 0.14, inventory: 0.06, housing: 0.08 },
    indicators: [
      { name: 'Tankan Manufacturing Index', valueFmt: (r) => `${Math.round(5 + r() * 10)}` },
      { name: 'Japan Core CPI', valueFmt: (r) => `${(2.0 + r() * 1.0).toFixed(1)}% y/y` },
      { name: 'Japan Industrial Production', valueFmt: (r) => `${(r() * 1.2 - 0.5).toFixed(1)}% m/m` },
      { name: 'Japan Retail Sales', valueFmt: (r) => `${(r() * 1.0 - 0.2).toFixed(1)}% m/m` },
      { name: 'Japan PMI Composite', valueFmt: (r) => `${(49 + r() * 4).toFixed(1)}` },
    ],
  },
  {
    country: 'China', code: 'CN', currency: 'CNY',
    gdpBase: 4.7, officialForecast: 5.0, consensusForecast: 4.6, lastOfficial: 4.9, confidenceBase: 65,
    componentWeights: { consumer: 0.28, business: 0.26, government: 0.18, netExports: 0.15, inventory: 0.06, housing: 0.07 },
    indicators: [
      { name: 'Caixin Manufacturing PMI', valueFmt: (r) => `${(49.5 + r() * 3).toFixed(1)}` },
      { name: 'China Retail Sales', valueFmt: (r) => `${(3.0 + r() * 3.0).toFixed(1)}% y/y` },
      { name: 'China Industrial Production', valueFmt: (r) => `${(4.0 + r() * 3.0).toFixed(1)}% y/y` },
      { name: 'China Fixed Asset Investment', valueFmt: (r) => `${(3.0 + r() * 2.0).toFixed(1)}% y/y` },
      { name: 'China Trade Balance', valueFmt: (r) => `$${(60 + r() * 40).toFixed(1)}B` },
    ],
  },
  {
    country: 'India', code: 'IN', currency: 'INR',
    gdpBase: 6.5, officialForecast: 6.5, consensusForecast: 6.3, lastOfficial: 6.8, confidenceBase: 68,
    componentWeights: { consumer: 0.35, business: 0.21, government: 0.18, netExports: 0.10, inventory: 0.06, housing: 0.10 },
    indicators: [
      { name: 'India Manufacturing PMI', valueFmt: (r) => `${(54 + r() * 5).toFixed(1)}` },
      { name: 'India CPI', valueFmt: (r) => `${(4.2 + r() * 1.5).toFixed(1)}% y/y` },
      { name: 'India Industrial Production', valueFmt: (r) => `${(3.0 + r() * 5.0).toFixed(1)}% y/y` },
      { name: 'India GST Collections', valueFmt: (r) => `INR ${(1.6 + r() * 0.3).toFixed(2)}T` },
      { name: 'India Auto Sales', valueFmt: (r) => `${(r() * 15 - 3).toFixed(1)}% y/y` },
    ],
  },
  {
    country: 'Brazil', code: 'BR', currency: 'BRL',
    gdpBase: 2.0, officialForecast: 1.8, consensusForecast: 1.9, lastOfficial: 2.2, confidenceBase: 64,
    componentWeights: { consumer: 0.34, business: 0.18, government: 0.20, netExports: 0.12, inventory: 0.06, housing: 0.10 },
    indicators: [
      { name: 'Brazil PMI Composite', valueFmt: (r) => `${(50 + r() * 4).toFixed(1)}` },
      { name: 'Brazil Retail Sales', valueFmt: (r) => `${(r() * 1.2 - 0.4).toFixed(1)}% m/m` },
      { name: 'Brazil IPCA Inflation', valueFmt: (r) => `${(4.0 + r() * 1.5).toFixed(1)}% y/y` },
      { name: 'Brazil Industrial Production', valueFmt: (r) => `${(r() * 1.0 - 0.3).toFixed(1)}% m/m` },
      { name: 'Brazil Trade Balance', valueFmt: (r) => `$${(5 + r() * 5).toFixed(1)}B` },
    ],
  },
  {
    country: 'Canada', code: 'CA', currency: 'CAD',
    gdpBase: 1.8, officialForecast: 1.7, consensusForecast: 1.7, lastOfficial: 1.5, confidenceBase: 76,
    componentWeights: { consumer: 0.34, business: 0.20, government: 0.21, netExports: 0.10, inventory: 0.05, housing: 0.10 },
    indicators: [
      { name: 'Canada Ivey PMI', valueFmt: (r) => `${(50 + r() * 8).toFixed(1)}` },
      { name: 'Canada Retail Sales', valueFmt: (r) => `${(r() * 0.8 - 0.2).toFixed(1)}% m/m` },
      { name: 'Canada Employment Change', valueFmt: (r) => `${(r() * 50 - 10).toFixed(1)}K` },
      { name: 'Canada CPI', valueFmt: (r) => `${(2.0 + r() * 0.8).toFixed(1)}% y/y` },
      { name: 'Canada Housing Starts', valueFmt: (r) => `${Math.round(210 + r() * 40)}K` },
    ],
  },
  {
    country: 'Australia', code: 'AU', currency: 'AUD',
    gdpBase: 2.0, officialForecast: 1.9, consensusForecast: 1.9, lastOfficial: 1.8, confidenceBase: 73,
    componentWeights: { consumer: 0.32, business: 0.21, government: 0.22, netExports: 0.11, inventory: 0.05, housing: 0.09 },
    indicators: [
      { name: 'Australia PMI Composite', valueFmt: (r) => `${(49 + r() * 5).toFixed(1)}` },
      { name: 'Australia Retail Sales', valueFmt: (r) => `${(r() * 0.6 - 0.1).toFixed(1)}% m/m` },
      { name: 'Australia Employment Change', valueFmt: (r) => `${(r() * 40 - 5).toFixed(1)}K` },
      { name: 'Australia CPI', valueFmt: (r) => `${(2.8 + r() * 1.0).toFixed(1)}% y/y` },
      { name: 'Australia Trade Balance', valueFmt: (r) => `A$${(8 + r() * 6).toFixed(1)}B` },
    ],
  },
  {
    country: 'South Korea', code: 'KR', currency: 'KRW',
    gdpBase: 2.2, officialForecast: 2.0, consensusForecast: 2.1, lastOfficial: 2.1, confidenceBase: 71,
    componentWeights: { consumer: 0.28, business: 0.24, government: 0.18, netExports: 0.16, inventory: 0.06, housing: 0.08 },
    indicators: [
      { name: 'Korea Manufacturing PMI', valueFmt: (r) => `${(49 + r() * 4).toFixed(1)}` },
      { name: 'Korea Exports', valueFmt: (r) => `${(r() * 12 - 2).toFixed(1)}% y/y` },
      { name: 'Korea Industrial Production', valueFmt: (r) => `${(r() * 1.4 - 0.4).toFixed(1)}% m/m` },
      { name: 'Korea Consumer Confidence', valueFmt: (r) => `${Math.round(95 + r() * 12)}` },
      { name: 'Korea Semiconductor Exports', valueFmt: (r) => `${(r() * 20 + 5).toFixed(1)}% y/y` },
    ],
  },
  {
    country: 'Mexico', code: 'MX', currency: 'MXN',
    gdpBase: 1.8, officialForecast: 1.7, consensusForecast: 1.7, lastOfficial: 2.0, confidenceBase: 63,
    componentWeights: { consumer: 0.34, business: 0.19, government: 0.17, netExports: 0.14, inventory: 0.06, housing: 0.10 },
    indicators: [
      { name: 'Mexico Manufacturing PMI', valueFmt: (r) => `${(50 + r() * 4).toFixed(1)}` },
      { name: 'Mexico Retail Sales', valueFmt: (r) => `${(r() * 1.0 - 0.2).toFixed(1)}% m/m` },
      { name: 'Mexico CPI', valueFmt: (r) => `${(3.8 + r() * 1.0).toFixed(1)}% y/y` },
      { name: 'Mexico Industrial Production', valueFmt: (r) => `${(r() * 1.2 - 0.5).toFixed(1)}% m/m` },
      { name: 'Mexico Remittances', valueFmt: (r) => `$${(4.5 + r() * 1.5).toFixed(1)}B` },
    ],
  },
  {
    country: 'Indonesia', code: 'ID', currency: 'IDR',
    gdpBase: 5.0, officialForecast: 5.1, consensusForecast: 4.9, lastOfficial: 5.0, confidenceBase: 66,
    componentWeights: { consumer: 0.33, business: 0.22, government: 0.17, netExports: 0.12, inventory: 0.06, housing: 0.10 },
    indicators: [
      { name: 'Indonesia Manufacturing PMI', valueFmt: (r) => `${(51 + r() * 4).toFixed(1)}` },
      { name: 'Indonesia CPI', valueFmt: (r) => `${(2.5 + r() * 1.5).toFixed(1)}% y/y` },
      { name: 'Indonesia Retail Sales', valueFmt: (r) => `${(2.0 + r() * 4.0).toFixed(1)}% y/y` },
      { name: 'Indonesia Trade Balance', valueFmt: (r) => `$${(1.5 + r() * 3.0).toFixed(1)}B` },
      { name: 'Indonesia Consumer Confidence', valueFmt: (r) => `${Math.round(120 + r() * 10)}` },
    ],
  },
];

// ── Quarter utilities ──

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getPastQuarters(count: number): string[] {
  const quarters: string[] = [];
  const now = new Date();
  let year = now.getFullYear();
  let q = Math.ceil((now.getMonth() + 1) / 3);
  for (let i = 0; i < count; i++) {
    q--;
    if (q === 0) { q = 4; year--; }
    quarters.push(`Q${q} ${year}`);
  }
  return quarters.reverse();
}

// ── Data Generation ──

function generate(): GDPNowcastResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-gdp-nowcast'));

  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  const currentQuarter = getCurrentQuarter();
  const pastQuarters = getPastQuarters(8);

  let totalPositive = 0;
  let totalNegative = 0;
  let totalNeutral = 0;

  const economies: EconomyNowcast[] = ECONOMIES.map((eco) => {
    // Nowcast with small daily jitter around base
    const nowcast = round2(eco.gdpBase + (rng() - 0.5) * 0.6);
    const previousEstimate = round2(nowcast + (rng() - 0.5) * 0.3);
    const revision = round2(nowcast - previousEstimate);
    const officialForecast = round2(eco.officialForecast + (rng() - 0.5) * 0.2);
    const consensusForecast = round2(eco.consensusForecast + (rng() - 0.5) * 0.2);
    const lastOfficialGDP = round2(eco.lastOfficial + (rng() - 0.5) * 0.15);
    const modelConfidence = Math.round(
      Math.max(40, Math.min(95, eco.confidenceBase + (rng() - 0.5) * 16))
    );

    // Components
    const weights = eco.componentWeights;
    const weightArr = [
      weights.consumer,
      weights.business,
      weights.government,
      weights.netExports,
      weights.inventory,
      weights.housing,
    ];
    const trends: Array<'accelerating' | 'stable' | 'decelerating'> = [
      'accelerating', 'stable', 'decelerating',
    ];

    const components: GDPComponent[] = COMPONENT_NAMES.map((name, idx) => {
      const weight = round2(weightArr[idx]);
      // Contribution roughly proportional to weight * nowcast, with noise
      const contribution = round2(nowcast * weight * (0.7 + rng() * 0.6));
      // Latest value: for spending/investment -> growth %, for net exports -> could be negative
      let latestValue: number;
      if (name === 'Net Exports') {
        latestValue = round1((rng() - 0.5) * 3.0);
      } else if (name === 'Inventory Change') {
        latestValue = round1((rng() - 0.4) * 2.0);
      } else {
        latestValue = round1(1.0 + rng() * 4.0);
      }
      const trendIdx = Math.floor(rng() * 3);
      return {
        name,
        contribution,
        weight,
        latestValue,
        trend: trends[trendIdx],
      };
    });

    // Data inputs
    const dataInputs: DataInput[] = eco.indicators.map((ind) => {
      const daysAgo = Math.floor(rng() * 21) + 1;
      const inputDate = new Date();
      inputDate.setDate(inputDate.getDate() - daysAgo);
      const val = ind.valueFmt(rng);
      const impactRoll = rng();
      let impact: 'positive' | 'negative' | 'neutral';
      if (impactRoll < 0.4) {
        impact = 'positive';
        totalPositive++;
      } else if (impactRoll < 0.7) {
        impact = 'negative';
        totalNegative++;
      } else {
        impact = 'neutral';
        totalNeutral++;
      }
      return {
        indicator: ind.name,
        value: val,
        date: inputDate.toISOString().slice(0, 10),
        impact,
      };
    });

    // Sort data inputs by date descending
    dataInputs.sort((a, b) => b.date.localeCompare(a.date));

    // Historical nowcasts for past 8 quarters
    const historicalNowcasts: HistoricalNowcast[] = pastQuarters.map((quarter) => {
      const qRng = mulberry32(hashSeed(eco.code + '-hist-' + quarter));
      const actual = round2(eco.gdpBase * (0.6 + qRng() * 0.8));
      const nowcastEst = round2(actual + (qRng() - 0.5) * 0.8);
      const error = round2(nowcastEst - actual);
      return { quarter, nowcast: nowcastEst, actual, error };
    });

    return {
      country: eco.country,
      code: eco.code,
      currency: eco.currency,
      currentQuarter,
      nowcast,
      previousEstimate,
      revision,
      officialForecast,
      consensusForecast,
      lastOfficialGDP,
      modelConfidence,
      components,
      dataInputs,
      historicalNowcasts,
    };
  });

  // Global GDP tracker
  const advancedCodes = new Set(['US', 'EZ', 'GB', 'JP', 'CA', 'AU', 'KR']);
  const advancedEcons = economies.filter((e) => advancedCodes.has(e.code));
  const emergingEcons = economies.filter((e) => !advancedCodes.has(e.code));

  const avgNowcast = (arr: EconomyNowcast[]): number =>
    round1(arr.reduce((s, e) => s + e.nowcast, 0) / arr.length);

  const globalGDPTracker: GlobalGDPTracker = {
    globalGrowth: round1(
      economies.reduce((s, e) => s + e.nowcast, 0) / economies.length
    ),
    advancedEconomies: avgNowcast(advancedEcons),
    emergingMarkets: avgNowcast(emergingEcons),
  };

  const signalStrength: SignalStrength = {
    positive: totalPositive,
    negative: totalNegative,
    neutral: totalNeutral,
  };

  return {
    economies,
    globalGDPTracker,
    signalStrength,
    lastUpdated: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[GDPNowcast] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate GDP nowcast data' });
  }
});

export default router;
