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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Realistic seasonal bias per commodity per month (avg return %)
// Positive = historically bullish, negative = historically bearish
const SEASONAL_PROFILES: Record<string, { symbol: string; name: string; bias: number[] }> = {
  WTI: {
    symbol: 'CL', name: 'WTI Crude Oil',
    //       Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct   Nov   Dec
    bias: [ -1.2,  1.8,  2.1,  2.5,  0.3, -1.5, -0.8,  1.4,  0.6, -1.0, -0.5,  0.9 ],
  },
  Brent: {
    symbol: 'CO', name: 'Brent Crude',
    bias: [ -0.9,  1.5,  2.3,  2.8,  0.1, -1.8, -1.0,  1.6,  0.4, -0.7, -0.3,  1.1 ],
  },
  NatGas: {
    symbol: 'NG', name: 'Natural Gas',
    bias: [ 4.2,  -3.5, -2.8, -1.2, -0.5,  0.8,  1.5,  1.0,  2.2,  3.8,  5.1,  3.6 ],
  },
  Gold: {
    symbol: 'GC', name: 'Gold',
    bias: [  2.8,  1.2,  -0.5, -0.3,  0.4, -1.0,  0.8,  2.5,  3.1,  0.2, -0.8,  0.6 ],
  },
  Silver: {
    symbol: 'SI', name: 'Silver',
    bias: [  1.5,  2.0,  -0.8, -1.2,  0.3, -1.5,  1.2,  3.2,  2.8,  0.5, -1.0,  0.4 ],
  },
  Copper: {
    symbol: 'HG', name: 'Copper',
    bias: [  2.1,  1.8,  1.5,  2.2,  -0.6, -1.2, -0.4,  0.8,  -1.5, -0.9,  0.3,  1.4 ],
  },
  Corn: {
    symbol: 'ZC', name: 'Corn',
    bias: [ -0.5, -1.0, -0.8,  0.5,  2.2,  3.8,  4.1,  -1.5, -2.2, -1.8,  0.3, -0.2 ],
  },
  Soybeans: {
    symbol: 'ZS', name: 'Soybeans',
    bias: [  0.8,  1.2, -0.6,  0.9,  2.5,  3.2,  2.8, -1.0, -2.5, -1.6,  0.4,  0.1 ],
  },
  Wheat: {
    symbol: 'ZW', name: 'Wheat',
    bias: [ -1.2,  1.5,  2.4,  1.8,  0.9, -0.4, -2.0, -1.8,  0.3,  0.8,  1.2, -0.5 ],
  },
  Coffee: {
    symbol: 'KC', name: 'Coffee',
    bias: [ -1.8,  2.5,  1.2,  0.6, -1.5, -2.2,  1.8,  0.4,  1.0,  2.8,  3.5, -0.8 ],
  },
};

const COMMODITY_KEYS = Object.keys(SEASONAL_PROFILES);

const CACHE_TTL = 5 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-commodity-seasonality'));
  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * 2 * spread;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const currentMonth = new Date().getMonth(); // 0-11

  // Generate commodity data
  const commodities = COMMODITY_KEYS.map(key => {
    const profile = SEASONAL_PROFILES[key];
    const monthlyReturns = profile.bias.map((bias, i) => {
      const avgReturn = round2(jitter(bias, 0.4));
      // Win rate correlates with average return direction/magnitude
      const baseWinRate = 50 + bias * 3.5;
      const winRate = round2(Math.min(75, Math.max(55, jitter(baseWinRate, 3))));
      const bestYear = round2(jitter(Math.abs(bias) * 4 + 8, 3));
      const worstYear = round2(jitter(-Math.abs(bias) * 3 - 5, 2));
      return {
        month: MONTH_NAMES[i],
        avgReturn,
        winRate,
        bestYear: round2(bestYear),
        worstYear: round2(worstYear),
      };
    });

    const currentReturn = monthlyReturns[currentMonth].avgReturn;
    const signal: 'Bullish' | 'Bearish' | 'Neutral' =
      currentReturn > 1.0 ? 'Bullish' : currentReturn < -1.0 ? 'Bearish' : 'Neutral';

    return {
      symbol: profile.symbol,
      name: profile.name,
      monthlyReturns,
      currentMonth: { signal },
    };
  });

  // Summary: find strongest/weakest months across all commodities
  let strongestVal = -Infinity;
  let strongestLabel = '';
  let weakestVal = Infinity;
  let weakestLabel = '';
  let totalReturn = 0;
  let totalCount = 0;

  for (const c of commodities) {
    for (const mr of c.monthlyReturns) {
      totalReturn += mr.avgReturn;
      totalCount++;
      if (mr.avgReturn > strongestVal) {
        strongestVal = mr.avgReturn;
        strongestLabel = `${mr.month} - ${c.name}`;
      }
      if (mr.avgReturn < weakestVal) {
        weakestVal = mr.avgReturn;
        weakestLabel = `${mr.month} - ${c.name}`;
      }
    }
  }

  // Top opportunity: best current-month signal
  const bestCurrentMonth = [...commodities]
    .sort((a, b) => {
      const aRet = a.monthlyReturns[currentMonth].avgReturn;
      const bRet = b.monthlyReturns[currentMonth].avgReturn;
      return Math.abs(bRet) - Math.abs(aRet);
    })[0];

  const summary = {
    strongestMonth: strongestLabel,
    weakestMonth: weakestLabel,
    avgSeasonalReturn: round2(totalReturn / totalCount),
    topOpportunity: `${bestCurrentMonth.name} (${bestCurrentMonth.monthlyReturns[currentMonth].avgReturn > 0 ? 'Long' : 'Short'})`,
  };

  // Current opportunities: top 5 seasonal trades right now
  // Look at current and next 2 months for holding periods
  const opportunityCandidates = commodities.map(c => {
    const curRet = c.monthlyReturns[currentMonth].avgReturn;
    const nextRet = c.monthlyReturns[(currentMonth + 1) % 12].avgReturn;
    const next2Ret = c.monthlyReturns[(currentMonth + 2) % 12].avgReturn;
    const totalRet = curRet + nextRet + next2Ret;
    const avgWinRate = round2(
      (c.monthlyReturns[currentMonth].winRate +
       c.monthlyReturns[(currentMonth + 1) % 12].winRate +
       c.monthlyReturns[(currentMonth + 2) % 12].winRate) / 3
    );
    const startMonth = MONTH_NAMES[currentMonth];
    const endMonth = MONTH_NAMES[(currentMonth + 2) % 12];
    return {
      commodity: c.name,
      direction: totalRet > 0 ? 'Long' as const : 'Short' as const,
      historicalWinRate: avgWinRate,
      avgReturn: round2(Math.abs(totalRet)),
      holdingPeriod: `${startMonth}-${endMonth}`,
      confidence: (Math.abs(totalRet) > 6 ? 'High' : Math.abs(totalRet) > 3 ? 'Medium' : 'Low') as 'High' | 'Medium' | 'Low',
      _sortScore: Math.abs(totalRet) * avgWinRate,
    };
  });

  const currentOpportunities = opportunityCandidates
    .sort((a, b) => b._sortScore - a._sortScore)
    .slice(0, 5)
    .map(({ _sortScore, ...rest }) => rest);

  // Year over year: top 4 commodities by current activity
  const yoyTop4 = [...commodities]
    .sort((a, b) => {
      const aAbs = Math.abs(a.monthlyReturns[currentMonth].avgReturn);
      const bAbs = Math.abs(b.monthlyReturns[currentMonth].avgReturn);
      return bAbs - aAbs;
    })
    .slice(0, 4);

  const yearOverYear = yoyTop4.map(c => {
    // Sum returns from Jan through current month for YTD
    let ytd = 0;
    let seasonalExpected = 0;
    for (let m = 0; m <= currentMonth; m++) {
      ytd += c.monthlyReturns[m].avgReturn;
      // Seasonal expected is the bias (without jitter)
      const key = COMMODITY_KEYS.find(k => SEASONAL_PROFILES[k].symbol === c.symbol)!;
      seasonalExpected += SEASONAL_PROFILES[key].bias[m];
    }
    const ytdReturn = round2(jitter(ytd, 1.5));
    const seasonalExp = round2(seasonalExpected);
    const deviation = round2(ytdReturn - seasonalExp);
    return {
      commodity: c.name,
      ytdReturn,
      seasonalExpected: seasonalExp,
      deviation,
      onTrack: Math.abs(deviation) < 3,
    };
  });

  return {
    summary,
    commodities,
    currentOpportunities,
    yearOverYear,
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
    console.error('[CommoditySeasonality] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate commodity seasonality data' });
  }
});

export default router;
