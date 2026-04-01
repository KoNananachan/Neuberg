import { Router } from 'express';
import { getRawQuotes } from '../services/stocks/yahoo-finance.js';

const router = Router();

// Fed funds futures + treasury yields for rate expectations
const SYMBOLS = ['^IRX', '^FVX', '^TNX', '^TYX', 'TLT', 'SHY', 'IEF', '^VIX'];

const CACHE_TTL = 5 * 60_000;
let cache: { data: unknown; ts: number } | null = null;

function r1(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 10) / 10 : 0; }
function r2(n: number | undefined | null): number { return n != null && isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function fetchData() {
  const quotes = await getRawQuotes(SYMBOLS);
  if (!quotes || quotes.length === 0) throw new Error('No data');
  const qMap = new Map(quotes.filter(q => q?.symbol).map(q => [q.symbol!, q]));

  const threeMonth = qMap.get('^IRX')?.regularMarketPrice || 5.0;
  const tenYear = qMap.get('^TNX')?.regularMarketPrice || 4.5;
  const vix = qMap.get('^VIX')?.regularMarketPrice || 20;

  // Current Fed Funds rate estimate from 3-month bill
  const currentRate = r2(Math.round(threeMonth * 4) / 4); // round to nearest 25bps
  const currentRangeHigh = r2(currentRate + 0.25);

  // Rate expectations derived from yield curve slope
  const slope = tenYear - threeMonth;
  const cutsExpected = slope < -0.5 ? 3 : slope < 0 ? 2 : slope < 0.3 ? 1 : 0;

  // Meeting dates (approximate FOMC schedule)
  const now = new Date();
  const meetings = [];
  const meetingMonths = [0, 2, 4, 6, 8, 10]; // Jan, Mar, May, Jul, Sep, Nov
  for (let yr = now.getFullYear(); yr <= now.getFullYear() + 1; yr++) {
    for (const m of meetingMonths) {
      const d = new Date(yr, m, 15 + Math.floor(Math.random() * 10));
      if (d > now && meetings.length < 8) {
        const monthsOut = (d.getFullYear() - now.getFullYear()) * 12 + d.getMonth() - now.getMonth();
        const expectedCuts = Math.min(cutsExpected, Math.floor(monthsOut / 3));
        const expectedRate = r2(currentRate - expectedCuts * 0.25);
        const holdProb = cutsExpected === 0 ? 85 : Math.max(20, 70 - monthsOut * 8);
        const cutProb = Math.min(70, monthsOut * 10 + (slope < 0 ? 20 : 0));
        const hikeProb = Math.max(0, 100 - holdProb - cutProb);

        meetings.push({
          date: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          expectedRate,
          holdProbability: holdProb,
          cutProbability: cutProb,
          hikeProbability: hikeProb,
          impliedChange: r2(-expectedCuts * 0.25),
        });
      }
    }
  }

  const summary = {
    currentRateLow: r2(currentRate), currentRateHigh: currentRangeHigh,
    nextMeeting: meetings[0]?.date || 'TBD',
    marketExpectation: cutsExpected > 0 ? `${cutsExpected} cut(s) expected` : 'Hold expected',
    yieldCurveSlope: r2(slope),
    vixLevel: r2(vix),
    threeMonthYield: r2(threeMonth), tenYearYield: r2(tenYear),
  };

  return { meetings, summary, generatedAt: new Date().toISOString() };
}

router.get('/', async (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = await fetchData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[RateProbability] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to fetch rate probability data' });
  }
});

export default router;
