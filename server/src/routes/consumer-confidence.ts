import { Router, Request, Response } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// -- Types --

interface ConsumerIndex {
  index: string;
  value: number;
  prior: number;
  change: number;
  forecast: number;
  surprise: number;
}

interface Component {
  component: string;
  value: number;
  prior: number;
  change: number;
}

interface RetailSales {
  country: string;
  momChange: number;
  yoyChange: number;
  exAuto: number | null;
  control: number | null;
}

interface ConsumerSpending {
  category: string;
  momChange: number;
  yoyChange: number;
  realGrowth: number;
}

interface CreditCardData {
  metric: string;
  value: number;
  change: number;
  trend: 'improving' | 'deteriorating' | 'stable';
}

interface SavingsRate {
  country: string;
  personalSavingsRate: number;
  prior: number;
  historicalAvg: number;
  trend: 'rising' | 'falling' | 'stable';
}

interface ConsumerConfidenceData {
  consumerIndices: ConsumerIndex[];
  components: Component[];
  retailSales: RetailSales[];
  consumerSpending: ConsumerSpending[];
  creditCardData: CreditCardData[];
  savingsRate: SavingsRate[];
  generatedAt: string;
}

// -- Cache --

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: ConsumerConfidenceData; ts: number } | null = null;

// -- Helpers --

const round1 = (v: number): number => Math.round(v * 10) / 10;
const round2 = (v: number): number => Math.round(v * 100) / 100;

// -- Data generation --

function generate(): ConsumerConfidenceData {
  const rng = seededRandom('consumer-confidence');

  // 1. Consumer Indices
  const indexConfigs: { index: string; base: number; spread: number }[] = [
    { index: 'Conference Board',        base: 105, spread: 10 },
    { index: 'UMich',                   base: 72.5, spread: 7.5 },
    { index: 'EU Economic Sentiment',   base: 97.5, spread: 7.5 },
    { index: 'Japan Consumer Confidence', base: 36, spread: 5 },
    { index: 'UK GfK',                  base: -18, spread: 8 },
  ];

  const consumerIndices: ConsumerIndex[] = indexConfigs.map(cfg => {
    const value = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const prior = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const change = round1(value - prior);
    const forecast = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const surprise = round1(value - forecast);
    return { index: cfg.index, value, prior, change, forecast, surprise };
  });

  // 2. Components (Conference Board sub-indices)
  const componentConfigs: { component: string; base: number; spread: number }[] = [
    { component: 'Present Situation',    base: 145, spread: 15 },
    { component: 'Expectations',         base: 78,  spread: 10 },
    { component: 'Jobs Plentiful',       base: 38,  spread: 5 },
    { component: 'Jobs Hard to Get',     base: 13,  spread: 3 },
    { component: 'Income Expectations',  base: 17,  spread: 3 },
  ];

  const components: Component[] = componentConfigs.map(cfg => {
    const value = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const prior = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const change = round1(value - prior);
    return { component: cfg.component, value, prior, change };
  });

  // 3. Retail Sales
  const retailConfigs: { country: string; momBase: number; momSpread: number; yoyBase: number; yoySpread: number; hasAuto: boolean }[] = [
    { country: 'US',       momBase: 0.3, momSpread: 0.5, yoyBase: 3.5, yoySpread: 1.5, hasAuto: true },
    { country: 'Eurozone', momBase: 0.2, momSpread: 0.4, yoyBase: 2.0, yoySpread: 1.5, hasAuto: false },
    { country: 'UK',       momBase: 0.1, momSpread: 0.5, yoyBase: 1.5, yoySpread: 1.5, hasAuto: false },
    { country: 'Japan',    momBase: 0.2, momSpread: 0.6, yoyBase: 2.5, yoySpread: 2.0, hasAuto: false },
    { country: 'China',    momBase: 0.4, momSpread: 0.5, yoyBase: 5.0, yoySpread: 2.0, hasAuto: false },
  ];

  const retailSales: RetailSales[] = retailConfigs.map(cfg => {
    const momChange = round1(cfg.momBase + (rng() - 0.5) * 2 * cfg.momSpread);
    const yoyChange = round1(cfg.yoyBase + (rng() - 0.5) * 2 * cfg.yoySpread);
    const exAuto = cfg.hasAuto ? round1(momChange + (rng() - 0.5) * 0.4) : null;
    const control = cfg.hasAuto ? round1(momChange + (rng() - 0.5) * 0.3) : null;
    return { country: cfg.country, momChange, yoyChange, exAuto, control };
  });

  // 4. Consumer Spending
  const spendingConfigs: { category: string; momBase: number; momSpread: number; yoyBase: number; yoySpread: number; realBase: number; realSpread: number }[] = [
    { category: 'Durable Goods', momBase: 0.4, momSpread: 0.8, yoyBase: 3.0, yoySpread: 2.0, realBase: 1.5, realSpread: 1.5 },
    { category: 'Nondurable',    momBase: 0.3, momSpread: 0.5, yoyBase: 4.0, yoySpread: 1.5, realBase: 1.0, realSpread: 1.0 },
    { category: 'Services',      momBase: 0.4, momSpread: 0.3, yoyBase: 5.5, yoySpread: 1.0, realBase: 2.5, realSpread: 1.0 },
    { category: 'Total PCE',     momBase: 0.4, momSpread: 0.4, yoyBase: 4.5, yoySpread: 1.0, realBase: 2.0, realSpread: 0.8 },
  ];

  const consumerSpending: ConsumerSpending[] = spendingConfigs.map(cfg => {
    const momChange = round1(cfg.momBase + (rng() - 0.5) * 2 * cfg.momSpread);
    const yoyChange = round1(cfg.yoyBase + (rng() - 0.5) * 2 * cfg.yoySpread);
    const realGrowth = round1(cfg.realBase + (rng() - 0.5) * 2 * cfg.realSpread);
    return { category: cfg.category, momChange, yoyChange, realGrowth };
  });

  // 5. Credit Card Data
  const creditConfigs: { metric: string; base: number; spread: number; changeBase: number; changeSpread: number }[] = [
    { metric: 'Avg Spending YoY',      base: 4.5,  spread: 2.0,  changeBase: 0,    changeSpread: 0.5 },
    { metric: 'Delinquency Rate 30d',  base: 2.8,  spread: 0.5,  changeBase: 0.1,  changeSpread: 0.2 },
    { metric: 'Revolving Balance',     base: 1050, spread: 100,   changeBase: 15,   changeSpread: 20 },
    { metric: 'Utilization Rate',      base: 28,   spread: 4,     changeBase: 0.5,  changeSpread: 1.0 },
    { metric: 'New Accounts',          base: 6.5,  spread: 1.5,   changeBase: -0.2, changeSpread: 0.5 },
  ];

  const creditCardData: CreditCardData[] = creditConfigs.map(cfg => {
    const value = round2(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const change = round2(cfg.changeBase + (rng() - 0.5) * 2 * cfg.changeSpread);
    let trend: 'improving' | 'deteriorating' | 'stable';
    if (change > 0.2) trend = cfg.metric.includes('Delinquency') || cfg.metric.includes('Utilization') ? 'deteriorating' : 'improving';
    else if (change < -0.2) trend = cfg.metric.includes('Delinquency') || cfg.metric.includes('Utilization') ? 'improving' : 'deteriorating';
    else trend = 'stable';
    return { metric: cfg.metric, value, change, trend };
  });

  // 6. Savings Rate
  const savingsConfigs: { country: string; base: number; spread: number; histAvg: number }[] = [
    { country: 'US',       base: 4.5,  spread: 1.5, histAvg: 7.5 },
    { country: 'Eurozone', base: 13.5, spread: 1.5, histAvg: 12.8 },
    { country: 'UK',       base: 10.0, spread: 2.0, histAvg: 8.5 },
    { country: 'Japan',    base: 28.0, spread: 4.0, histAvg: 25.0 },
    { country: 'China',    base: 33.0, spread: 3.0, histAvg: 30.0 },
    { country: 'Canada',   base: 5.5,  spread: 1.5, histAvg: 5.0 },
  ];

  const savingsRate: SavingsRate[] = savingsConfigs.map(cfg => {
    const personalSavingsRate = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const prior = round1(cfg.base + (rng() - 0.5) * 2 * cfg.spread);
    const diff = personalSavingsRate - prior;
    let trend: 'rising' | 'falling' | 'stable';
    if (diff > 0.3) trend = 'rising';
    else if (diff < -0.3) trend = 'falling';
    else trend = 'stable';
    return { country: cfg.country, personalSavingsRate, prior, historicalAvg: cfg.histAvg, trend };
  });

  return {
    consumerIndices,
    components,
    retailSales,
    consumerSpending,
    creditCardData,
    savingsRate,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) {
      res.json(cache.data);
      return;
    }
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[ConsumerConfidence] Error:', (err as Error).message);
    if (cache) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate consumer confidence data' });
  }
});

export default router;
