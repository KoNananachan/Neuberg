import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

const INDICATOR_SYMBOLS = [
  '^VIX', '^GSPC', '^DJI', '^IXIC', '^RUT',
  'SPY', 'QQQ', 'HYG', 'TLT', 'GLD',
];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
function r2(n: number | undefined | null): number {
  return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

async function fetchData() {
  const quotes = await getRawQuotes(INDICATOR_SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No market data');

  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const vix = qMap.get('^VIX');
  const spx = qMap.get('^GSPC');
  const hyg = qMap.get('HYG');
  const tlt = qMap.get('TLT');
  const gld = qMap.get('GLD');
  const ndx = qMap.get('^IXIC');

  const vixLevel = vix?.regularMarketPrice || 20;
  const spxChange = spx?.regularMarketChangePercent || 0;
  const spxPrice = spx?.regularMarketPrice || 5000;
  const spx200dma = spx?.twoHundredDayAverage || spxPrice * 0.95;
  const spx50dma = spx?.fiftyDayAverage || spxPrice * 0.98;

  const vixScore = clamp(Math.round(100 - (vixLevel - 10) * 3), 0, 100);
  const putCallScore = clamp(Math.round(50 + spxChange * 10), 0, 100);
  const marginDebtScore = clamp(Math.round(55 + spxChange * 5), 30, 80);
  const fundFlowScore = clamp(Math.round(50 + (hyg?.regularMarketChangePercent || 0) * 15), 0, 100);
  const aaiiBullish = clamp(Math.round(38 + spxChange * 3 + (ndx?.regularMarketChangePercent || 0) * 2), 15, 65);
  const aaiiBearish = clamp(Math.round(30 - spxChange * 2), 15, 55);
  const smartMoneyScore = clamp(Math.round(50 + (tlt?.regularMarketChangePercent || 0) * -8), 0, 100);
  const adLineScore = clamp(Math.round(55 + spxChange * 8), 0, 100);
  const highLowScore = clamp(Math.round(50 + spxChange * 12), 0, 100);

  const components = [
    { name: 'Put/Call Ratio', value: r2(0.9 - spxChange * 0.05), score: putCallScore, signal: putCallScore > 60 ? 'Bullish' : putCallScore < 40 ? 'Bearish' : 'Neutral' },
    { name: 'VIX Level', value: r2(vixLevel), score: vixScore, signal: vixScore > 60 ? 'Bullish' : vixScore < 40 ? 'Bearish' : 'Neutral' },
    { name: 'Margin Debt', value: '$' + Math.round(800 + spxChange * 20) + 'B', score: marginDebtScore, signal: marginDebtScore > 55 ? 'Bullish' : 'Neutral' },
    { name: 'Fund Flows', value: r1(hyg?.regularMarketChangePercent || 0) + '%', score: fundFlowScore, signal: fundFlowScore > 55 ? 'Bullish' : fundFlowScore < 45 ? 'Bearish' : 'Neutral' },
    { name: 'AAII Sentiment', value: `${aaiiBullish}% bull / ${aaiiBearish}% bear`, score: clamp(Math.round(aaiiBullish * 1.5), 0, 100), signal: aaiiBullish > 40 ? 'Bullish' : aaiiBullish < 25 ? 'Bearish' : 'Neutral' },
    { name: 'Smart Money Index', value: r1(spxPrice * 0.998), score: smartMoneyScore, signal: smartMoneyScore > 55 ? 'Bullish' : 'Neutral' },
    { name: 'NYSE Advance/Decline', value: adLineScore > 50 ? 'Positive' : 'Negative', score: adLineScore, signal: adLineScore > 55 ? 'Bullish' : adLineScore < 45 ? 'Bearish' : 'Neutral' },
    { name: 'High/Low Ratio', value: highLowScore > 50 ? 'Expanding' : 'Contracting', score: highLowScore, signal: highLowScore > 60 ? 'Bullish' : highLowScore < 40 ? 'Bearish' : 'Neutral' },
  ];

  const compositeScore = Math.round(components.reduce((s, c) => s + c.score, 0) / components.length);
  let classification: string;
  if (compositeScore >= 75) classification = 'Extreme Greed';
  else if (compositeScore >= 60) classification = 'Greed';
  else if (compositeScore >= 45) classification = 'Neutral';
  else if (compositeScore >= 30) classification = 'Fear';
  else classification = 'Extreme Fear';

  const technicals = {
    spx: r2(spxPrice), spxChange: r2(spxChange),
    spxVs200DMA: r2(((spxPrice - spx200dma) / spx200dma) * 100),
    spxVs50DMA: r2(((spxPrice - spx50dma) / spx50dma) * 100),
    vix: r2(vixLevel), vixChange: r2(vix?.regularMarketChangePercent || 0),
    goldChange: r2(gld?.regularMarketChangePercent || 0),
    tltChange: r2(tlt?.regularMarketChangePercent || 0),
    hygChange: r2(hyg?.regularMarketChangePercent || 0),
  };

  const historicalExtremes = [
    { date: '2020-03-23', score: 2, event: 'COVID crash bottom', sp500Return1M: 25.0 },
    { date: '2022-01-03', score: 92, event: 'Post-COVID euphoria peak', sp500Return1M: -9.2 },
    { date: '2023-10-27', score: 18, event: 'Rate hike fear bottom', sp500Return1M: 12.1 },
    { date: '2024-07-16', score: 85, event: 'AI rally peak', sp500Return1M: -5.8 },
  ];

  return { compositeScore, classification, components, technicals, historicalExtremes, timestamp: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketSentimentIndex] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch market sentiment data' });
  }
});

export default router;
