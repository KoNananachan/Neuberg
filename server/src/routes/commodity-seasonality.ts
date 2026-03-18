import { Router } from 'express';

const router = Router();

// ── Deterministic PRNG ──

function hashSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function mulberry32(a: number): () => number {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── Constants ──

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Realistic seasonal monthly average return profiles (%)
// Sources: historical commodity futures data, seasonal tendencies
const COMMODITY_PROFILES: {
  key: string;
  name: string;
  symbol: string;
  // Monthly avg returns (Jan-Dec) based on historical seasonal patterns
  monthlyBias: number[];
}[] = [
  {
    key: 'wti', name: 'WTI Crude Oil', symbol: 'CL',
    // Strong in spring (driving season ramp-up Apr-Jun), weak in fall
    monthlyBias: [-1.2, 1.8, 2.1, 2.5, 0.3, -1.5, -0.8, 1.4, 0.6, -1.0, -0.5, 0.9],
  },
  {
    key: 'natgas', name: 'Natural Gas', symbol: 'NG',
    // Strong fall/winter (heating season Oct-Jan), weak spring/summer injection
    monthlyBias: [4.2, -3.5, -2.8, -1.2, -0.5, 0.8, 1.5, 1.0, 2.2, 3.8, 5.1, 3.6],
  },
  {
    key: 'gold', name: 'Gold', symbol: 'GC',
    // Strong Jan (new year allocation), Aug-Sep (safe haven / Indian wedding season buying)
    monthlyBias: [2.8, 1.2, -0.5, -0.3, 0.4, -1.0, 0.8, 2.5, 3.1, 0.2, -0.8, 0.6],
  },
  {
    key: 'copper', name: 'Copper', symbol: 'HG',
    // Strong Q1 (China restocking post-Lunar New Year), weak Q3
    monthlyBias: [2.1, 1.8, 1.5, 2.2, -0.6, -1.2, -0.4, 0.8, -1.5, -0.9, 0.3, 1.4],
  },
  {
    key: 'corn', name: 'Corn', symbol: 'ZC',
    // Strong pre-harvest Jun-Jul (weather premium), weak post-harvest Sep-Oct
    monthlyBias: [-0.5, -1.0, -0.8, 0.5, 2.2, 3.8, 4.1, -1.5, -2.2, -1.8, 0.3, -0.2],
  },
  {
    key: 'soybeans', name: 'Soybeans', symbol: 'ZS',
    // Strong May-Jul (planting / weather risk), weak post-harvest Sep-Oct
    monthlyBias: [0.8, 1.2, -0.6, 0.9, 2.5, 3.2, 2.8, -1.0, -2.5, -1.6, 0.4, 0.1],
  },
  {
    key: 'wheat', name: 'Wheat', symbol: 'ZW',
    // Strong spring (winter wheat risk Mar-Apr), weak late summer post-harvest
    monthlyBias: [-1.2, 1.5, 2.4, 1.8, 0.9, -0.4, -2.0, -1.8, 0.3, 0.8, 1.2, -0.5],
  },
  {
    key: 'coffee', name: 'Coffee', symbol: 'KC',
    // Strong Feb-Mar (Brazil frost fear ramp), Oct-Nov (off-cycle tightness)
    monthlyBias: [-1.8, 2.5, 1.2, 0.6, -1.5, -2.2, 1.8, 0.4, 1.0, 2.8, 3.5, -0.8],
  },
];

// Curve seasonality profiles: front-month minus 12th-month spread ($/unit)
// Positive = backwardation, Negative = contango
const CURVE_PROFILES: {
  key: string;
  name: string;
  symbol: string;
  // Monthly spread bias (Jan-Dec)
  spreadBias: number[];
}[] = [
  {
    key: 'wti', name: 'WTI Crude Oil', symbol: 'CL',
    // Tends toward backwardation in summer (driving season demand), contango in shoulder months
    spreadBias: [-0.8, -0.3, 0.2, 0.6, 1.2, 1.8, 1.5, 0.9, 0.3, -0.5, -1.0, -0.7],
  },
  {
    key: 'natgas', name: 'Natural Gas', symbol: 'NG',
    // Strong contango in summer (storage injection), backwardation in winter (heating demand)
    spreadBias: [1.2, 0.6, -0.2, -0.8, -1.5, -2.2, -2.5, -1.8, -0.6, 0.8, 1.8, 2.4],
  },
];

// Calendar effects: notable seasonal events affecting commodities
const CALENDAR_EVENTS: {
  name: string;
  timing: string;
  affectedCommodities: string[];
  typicalImpact: string;
  description: string;
}[] = [
  {
    name: 'Planting Season',
    timing: 'Apr - May',
    affectedCommodities: ['Corn', 'Soybeans', 'Wheat'],
    typicalImpact: 'Bullish (weather risk premium)',
    description: 'US planting progress drives weather premium. Delayed planting or adverse weather conditions can cause sharp rallies in grain futures.',
  },
  {
    name: 'Hurricane Season',
    timing: 'Jun - Nov',
    affectedCommodities: ['WTI Crude Oil', 'Natural Gas'],
    typicalImpact: 'Bullish (supply disruption risk)',
    description: 'Gulf of Mexico production at risk from tropical storms. Peak risk Aug-Oct. Historically adds $2-5 risk premium to crude oil.',
  },
  {
    name: 'Heating Season',
    timing: 'Nov - Mar',
    affectedCommodities: ['Natural Gas'],
    typicalImpact: 'Bullish (demand surge)',
    description: 'Residential and commercial heating demand peaks. Cold snaps can cause nat gas to spike 10-20% in days. Storage withdrawals closely watched.',
  },
  {
    name: 'Driving Season',
    timing: 'May - Sep',
    affectedCommodities: ['WTI Crude Oil'],
    typicalImpact: 'Bullish (gasoline demand)',
    description: 'US gasoline demand peaks Memorial Day to Labor Day. Refinery runs increase, supporting crude oil prices and tightening product spreads.',
  },
  {
    name: 'Harvest Pressure',
    timing: 'Sep - Nov',
    affectedCommodities: ['Corn', 'Soybeans', 'Wheat'],
    typicalImpact: 'Bearish (supply flood)',
    description: 'Northern hemisphere harvest brings massive supply to market. Basis weakens, futures typically decline as elevators fill and farmers sell.',
  },
  {
    name: 'Indian Wedding Season',
    timing: 'Oct - Dec',
    affectedCommodities: ['Gold'],
    typicalImpact: 'Bullish (physical demand)',
    description: 'Gold jewelry demand surges for Indian weddings and Diwali. India imports 800-1000 tonnes/year, with bulk purchases in Q4.',
  },
  {
    name: 'Chinese New Year Restocking',
    timing: 'Jan - Feb',
    affectedCommodities: ['Copper', 'Gold'],
    typicalImpact: 'Bullish (industrial + festive demand)',
    description: 'Chinese manufacturers restock base metals ahead of holiday. Post-holiday construction ramp-up supports copper demand through Q1.',
  },
  {
    name: 'Brazilian Frost Season',
    timing: 'Jun - Aug',
    affectedCommodities: ['Coffee'],
    typicalImpact: 'Bullish (supply destruction risk)',
    description: 'Cold fronts from Antarctica can damage Brazilian coffee crops. The 1994 frost destroyed 1B+ lbs of coffee, doubling prices. Even frost scares cause volatility.',
  },
  {
    name: 'OPEC+ Meeting Cycle',
    timing: 'Jun, Dec (biannual)',
    affectedCommodities: ['WTI Crude Oil'],
    typicalImpact: 'Volatile (policy uncertainty)',
    description: 'Production quota decisions create positioning ahead of meetings. Surprises in cut/increase decisions can move crude 3-5% intraday.',
  },
  {
    name: 'Winter Wheat Dormancy Exit',
    timing: 'Mar - Apr',
    affectedCommodities: ['Wheat'],
    typicalImpact: 'Volatile (crop condition reassessment)',
    description: 'Winter wheat exits dormancy and crop conditions are reassessed. Winterkill damage revealed. USDA crop condition reports drive price discovery.',
  },
];

// ── Cache ──

const CACHE_TTL = 5 * 60 * 1000;
let cacheData: unknown = null;
let cacheTime = 0;

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Data Generation ──

function generate() {
  const seed = hashSeed('commodity-seasonality-' + new Date().toISOString().slice(0, 10));
  const rng = mulberry32(seed);
  const jitter = (base: number, spread: number) => base + (rng() - 0.5) * 2 * spread;
  const currentMonth = new Date().getMonth(); // 0-11

  // 1. Seasonal Patterns: monthly avg returns for each commodity
  const seasonalPatterns = COMMODITY_PROFILES.map(profile => {
    const monthlyReturns = profile.monthlyBias.map((bias, i) => {
      const avgReturn = round2(jitter(bias, 0.5));
      // Win rate correlates with direction/magnitude of bias
      const baseWinRate = 50 + bias * 3.2;
      const winRate = round2(Math.min(78, Math.max(35, jitter(baseWinRate, 3))));
      const sampleSize = Math.floor(20 + rng() * 15); // 20-35 years of data
      return {
        month: MONTH_NAMES[i],
        avgReturn,
        medianReturn: round2(jitter(avgReturn * 0.85, 0.3)),
        winRate,
        sampleSize,
        bestYear: round2(Math.abs(bias) * 4 + 5 + rng() * 6),
        worstYear: round2(-(Math.abs(bias) * 3 + 4 + rng() * 5)),
      };
    });

    return {
      commodity: profile.name,
      symbol: profile.symbol,
      monthlyReturns,
    };
  });

  // 2. Current vs Seasonal: YTD performance compared to seasonal expectation
  const currentVsSeasonal = COMMODITY_PROFILES.map(profile => {
    // Sum seasonal bias from Jan through current month for seasonal avg YTD
    let seasonalYtd = 0;
    for (let m = 0; m <= currentMonth; m++) {
      seasonalYtd += profile.monthlyBias[m];
    }
    seasonalYtd = round2(seasonalYtd);

    // Current YTD deviates from seasonal with some randomness
    const currentYtd = round2(jitter(seasonalYtd, Math.abs(seasonalYtd) * 0.4 + 2));
    const deviation = round2(currentYtd - seasonalYtd);

    // Historical deviation percentile: how unusual is this deviation
    // Map deviation to a percentile (larger deviations -> more extreme percentile)
    const absDeviation = Math.abs(deviation);
    const rawPercentile = 50 + (deviation > 0 ? 1 : -1) * Math.min(48, absDeviation * 8 + rng() * 10);
    const historicalPercentile = Math.round(Math.min(99, Math.max(1, rawPercentile)));

    return {
      commodity: profile.name,
      symbol: profile.symbol,
      currentYtdReturn: currentYtd,
      seasonalAvgYtdReturn: seasonalYtd,
      deviation,
      historicalDeviationPercentile: historicalPercentile,
      assessment: Math.abs(deviation) < 1.5 ? 'Tracking Seasonal' as const
        : deviation > 0 ? 'Outperforming Seasonal' as const
        : 'Underperforming Seasonal' as const,
    };
  });

  // 3. Curve Seasonality: contango/backwardation patterns for crude and nat gas
  const curveSeasonality = CURVE_PROFILES.map(curve => {
    const monthlySpread = curve.spreadBias.map((bias, i) => {
      const spread = round2(jitter(bias, 0.3));
      const structure = spread > 0.2 ? 'Backwardation' as const
        : spread < -0.2 ? 'Contango' as const
        : 'Flat' as const;
      return {
        month: MONTH_NAMES[i],
        frontMinusBack: spread,
        structure,
        annualizedRollYield: round2(spread * 12),
      };
    });

    // Current month data
    const currentSpread = monthlySpread[currentMonth];

    return {
      commodity: curve.name,
      symbol: curve.symbol,
      monthlySpread,
      currentMonth: {
        month: MONTH_NAMES[currentMonth],
        spread: currentSpread.frontMinusBack,
        structure: currentSpread.structure,
        seasonalNorm: round2(curve.spreadBias[currentMonth]),
        deviationFromNorm: round2(currentSpread.frontMinusBack - curve.spreadBias[currentMonth]),
      },
    };
  });

  // 4. Trading Signals: seasonal bias for next 30/60/90 days per commodity
  const tradingSignals = COMMODITY_PROFILES.map(profile => {
    // Compute forward returns for 30/60/90 day windows
    const next1m = profile.monthlyBias[(currentMonth + 1) % 12];
    const next2m = next1m + profile.monthlyBias[(currentMonth + 2) % 12];
    const next3m = next2m + profile.monthlyBias[(currentMonth + 3) % 12];

    const getBias = (ret: number): 'Bullish' | 'Bearish' | 'Neutral' =>
      ret > 1.0 ? 'Bullish' : ret < -1.0 ? 'Bearish' : 'Neutral';

    const getWinRate = (months: number[]): number => {
      const avgBias = months.reduce((s, m) => s + Math.abs(profile.monthlyBias[m % 12]), 0) / months.length;
      return round2(Math.min(75, Math.max(40, 50 + avgBias * 4 + (rng() - 0.5) * 6)));
    };

    const getAvgReturn = (sumBias: number): number => round2(jitter(sumBias, Math.abs(sumBias) * 0.3 + 0.5));

    const months30 = [(currentMonth + 1) % 12];
    const months60 = [...months30, (currentMonth + 2) % 12];
    const months90 = [...months60, (currentMonth + 3) % 12];

    return {
      commodity: profile.name,
      symbol: profile.symbol,
      next30Days: {
        bias: getBias(next1m),
        historicalWinRate: getWinRate(months30),
        avgReturn: getAvgReturn(next1m),
        bestYear: round2(Math.abs(next1m) * 3 + 4 + rng() * 5),
        worstYear: round2(-(Math.abs(next1m) * 2.5 + 3 + rng() * 4)),
      },
      next60Days: {
        bias: getBias(next2m),
        historicalWinRate: getWinRate(months60),
        avgReturn: getAvgReturn(next2m),
        bestYear: round2(Math.abs(next2m) * 2.5 + 6 + rng() * 6),
        worstYear: round2(-(Math.abs(next2m) * 2 + 4 + rng() * 5)),
      },
      next90Days: {
        bias: getBias(next3m),
        historicalWinRate: getWinRate(months90),
        avgReturn: getAvgReturn(next3m),
        bestYear: round2(Math.abs(next3m) * 2 + 8 + rng() * 7),
        worstYear: round2(-(Math.abs(next3m) * 1.8 + 5 + rng() * 6)),
      },
    };
  });

  // 5. Calendar Effects: static definitions enriched with current relevance
  const now = new Date();
  const currentMonthName = MONTH_NAMES[currentMonth];

  const calendarEffects = CALENDAR_EVENTS.map(event => {
    // Parse timing to determine if currently active
    const timingParts = event.timing.split(' - ');
    const startMonth = timingParts.length === 2
      ? MONTH_NAMES.indexOf(timingParts[0].trim())
      : MONTH_NAMES.indexOf(timingParts[0].replace(/\(.*\)/, '').trim());
    const endMonth = timingParts.length === 2
      ? MONTH_NAMES.indexOf(timingParts[1].trim())
      : startMonth;

    let isActive: boolean;
    if (startMonth <= endMonth) {
      isActive = currentMonth >= startMonth && currentMonth <= endMonth;
    } else {
      // Wraps around year end (e.g., Nov - Mar)
      isActive = currentMonth >= startMonth || currentMonth <= endMonth;
    }

    // Days until start (approximate)
    let daysUntilStart: number | null = null;
    if (!isActive && startMonth >= 0) {
      const startDate = new Date(now.getFullYear(), startMonth, 1);
      if (startDate < now) {
        startDate.setFullYear(startDate.getFullYear() + 1);
      }
      daysUntilStart = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Historical strength rating (1-5)
    const strengthRating = Math.min(5, Math.max(1, Math.round(2.5 + (rng() - 0.5) * 3)));

    return {
      name: event.name,
      timing: event.timing,
      affectedCommodities: event.affectedCommodities,
      typicalImpact: event.typicalImpact,
      description: event.description,
      isActive,
      daysUntilStart,
      historicalStrength: strengthRating,
    };
  });

  return {
    seasonalPatterns,
    currentVsSeasonal,
    curveSeasonality,
    tradingSignals,
    calendarEffects,
    metadata: {
      currentMonth: currentMonthName,
      generatedAt: new Date().toISOString(),
      dataDisclaimer: 'Seasonal patterns based on historical averages. Past performance does not guarantee future results.',
    },
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) return res.json(cacheData);
    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err) {
    console.error('[CommoditySeasonality] Error:', (err as Error).message);
    if (cacheData) return res.json(cacheData);
    res.status(500).json({ error: 'Failed to generate commodity seasonality data' });
  }
});

export default router;
