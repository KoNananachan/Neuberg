import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();


// ── Static Definitions ──

interface RegionConfig {
  name: string;
  capacityBcf: number;
  baseBcf: number;
  fiveYrAvgBcf: number;
  yearAgoBcf: number;
  subRegions?: { name: string; baseBcf: number }[];
}

const REGIONS: RegionConfig[] = [
  { name: 'East', capacityBcf: 1020, baseBcf: 185, fiveYrAvgBcf: 198, yearAgoBcf: 192 },
  { name: 'Midwest', capacityBcf: 1180, baseBcf: 420, fiveYrAvgBcf: 445, yearAgoBcf: 435 },
  { name: 'Mountain', capacityBcf: 220, baseBcf: 92, fiveYrAvgBcf: 100, yearAgoBcf: 97 },
  { name: 'Pacific', capacityBcf: 420, baseBcf: 245, fiveYrAvgBcf: 260, yearAgoBcf: 255 },
  {
    name: 'South Central',
    capacityBcf: 1350,
    baseBcf: 820,
    fiveYrAvgBcf: 870,
    yearAgoBcf: 850,
    subRegions: [
      { name: 'Salt', baseBcf: 310 },
      { name: 'Non-salt', baseBcf: 510 },
    ],
  },
];

// Total US base = sum of region bases = 1762 Bcf (within typical range)
// Total capacity ~ 4190 Bcf
let cache: { data: unknown; ts: number } | null = null;

// ── Helpers ──

function round1(n: number): number { return Math.round(n * 10) / 10; }
function round2(n: number): number { return Math.round(n * 100) / 100; }

// ── Data Generation ──

function generate() {
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('natural-gas-storage-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Determine current month/day for seasonal context
  const month = now.getMonth(); // 0-indexed
  const dayOfMonth = now.getDate();
  // Injection season: Apr(3) - Oct(9), Withdrawal season: Nov(10) - Mar(2)
  const isInjectionSeason = month >= 3 && month <= 9;

  // Seasonal multiplier: storage is lowest ~Mar, highest ~Oct
  // Map month to a seasonal factor for total US storage
  // Mar: ~1800, Apr-Oct ramp up to ~3600, Nov-Mar draw down
  const seasonalFactors: Record<number, number> = {
    0: 0.68, 1: 0.58, 2: 0.52, 3: 0.55, 4: 0.62, 5: 0.70,
    6: 0.78, 7: 0.85, 8: 0.92, 9: 0.98, 10: 0.92, 11: 0.82,
  };
  const seasonFactor = seasonalFactors[month] + (dayOfMonth / 31) * ((seasonalFactors[(month + 1) % 12] ?? seasonalFactors[month]) - seasonalFactors[month]);
  // Total US capacity is about 4,900 Bcf; typical range 1,800-3,800
  const totalCapacity = 4900;
  const baseTotalBcf = totalCapacity * seasonFactor;
  const totalCurrentBcf = Math.round(jitter(baseTotalBcf, 0.04));

  // Net weekly change: injection season = positive, withdrawal season = negative
  const weeklyChangeMagnitude = isInjectionSeason
    ? 40 + rng() * 80   // injection: +40 to +120 Bcf
    : -(50 + rng() * 120); // withdrawal: -50 to -170 Bcf
  const netChange = Math.round(jitter(weeklyChangeMagnitude, 0.15));

  // 5-year average and year-ago for this week
  const fiveYrAvgTotal = Math.round(jitter(baseTotalBcf * 1.02, 0.03));
  const yearAgoTotal = Math.round(jitter(baseTotalBcf * 0.97, 0.04));
  const vsAvgBcf = totalCurrentBcf - fiveYrAvgTotal;
  const vsAvgPct = round2((vsAvgBcf / fiveYrAvgTotal) * 100);
  const vsYearAgoBcf = totalCurrentBcf - yearAgoTotal;
  const vsYearAgoPct = round2((vsYearAgoBcf / yearAgoTotal) * 100);

  // ── 1. Total US Storage ──
  const total = {
    currentBcf: totalCurrentBcf,
    netChangeBcf: netChange,
    fiveYearAvgBcf: fiveYrAvgTotal,
    vsAvgBcf,
    vsAvgPct,
    yearAgoBcf: yearAgoTotal,
    vsYearAgoBcf,
    vsYearAgoPct,
    percentFull: round1((totalCurrentBcf / totalCapacity) * 100),
    totalCapacityBcf: totalCapacity,
    reportWeekEnding: day,
    season: isInjectionSeason ? 'Injection (Apr-Oct)' : 'Withdrawal (Nov-Mar)',
  };

  // ── 2. Regional Breakdown ──
  // Distribute total proportionally to region bases, then jitter
  const totalBase = REGIONS.reduce((s, r) => s + r.baseBcf, 0);
  const regions = REGIONS.map(r => {
    const proportion = r.baseBcf / totalBase;
    const currentBcf = Math.round(totalCurrentBcf * proportion * jitter(1, 0.06));
    const regionNetChange = Math.round(netChange * proportion * jitter(1, 0.2));
    const fiveYrAvg = Math.round(jitter(r.fiveYrAvgBcf * seasonFactor / 0.52, 0.04));
    const yearAgo = Math.round(jitter(r.yearAgoBcf * seasonFactor / 0.52, 0.04));
    const pctOfCapacity = round1((currentBcf / r.capacityBcf) * 100);

    const result: any = {
      region: r.name,
      currentBcf,
      netChangeBcf: regionNetChange,
      fiveYearAvgBcf: fiveYrAvg,
      yearAgoBcf: yearAgo,
      capacityBcf: r.capacityBcf,
      percentOfCapacity: Math.min(pctOfCapacity, 99.5),
    };

    if (r.subRegions) {
      const subTotal = r.subRegions.reduce((s, sr) => s + sr.baseBcf, 0);
      result.subRegions = r.subRegions.map(sr => {
        const subProportion = sr.baseBcf / subTotal;
        const subCurrentBcf = Math.round(currentBcf * subProportion * jitter(1, 0.04));
        const subNetChange = Math.round(regionNetChange * subProportion * jitter(1, 0.15));
        return {
          name: sr.name,
          currentBcf: subCurrentBcf,
          netChangeBcf: subNetChange,
        };
      });
    }

    return result;
  });

  // ── 3. Weekly History (last 12 weeks) ──
  const weeklyHistory = [];
  let rollingStorage = totalCurrentBcf;
  for (let w = 0; w < 12; w++) {
    const weekDate = new Date(now);
    weekDate.setDate(weekDate.getDate() - w * 7);
    const weekStr = weekDate.toISOString().slice(0, 10);

    const weekMonth = weekDate.getMonth();
    const weekIsInjection = weekMonth >= 3 && weekMonth <= 9;

    const actualChange = w === 0 ? netChange : Math.round(
      (weekIsInjection ? 1 : -1) * (30 + rng() * 100) * (weekIsInjection ? 1 : 1.2)
    );
    // Analyst estimate differs from actual by a modest amount
    const estimateError = Math.round((rng() - 0.5) * 20);
    const analystEstimate = actualChange + estimateError;
    const surprise = actualChange - analystEstimate;

    weeklyHistory.push({
      weekEnding: weekStr,
      actualBcf: actualChange,
      analystEstimateBcf: analystEstimate,
      surpriseBcf: surprise,
      totalStorageBcf: rollingStorage,
      type: actualChange >= 0 ? 'Injection' : 'Withdrawal',
    });

    rollingStorage -= actualChange; // go backwards in time
  }

  // ── 4. Five-Year Range (current week position within historical min/max/avg) ──
  const weekOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
  const fiveYearRange = [];
  for (let wk = 0; wk < 52; wk++) {
    const midpoint = totalCapacity * (seasonalFactors[Math.floor((wk / 52) * 12)] ?? 0.7);
    const min = Math.round(midpoint * jitter(0.82, 0.03));
    const max = Math.round(midpoint * jitter(1.18, 0.03));
    const avg = Math.round(midpoint * jitter(1.0, 0.02));
    const entry: any = {
      week: wk + 1,
      minBcf: min,
      maxBcf: max,
      avgBcf: avg,
    };
    if (wk === weekOfYear) {
      entry.currentBcf = totalCurrentBcf;
      entry.isCurrent = true;
      entry.positionInRange = round1(((totalCurrentBcf - min) / (max - min)) * 100);
    }
    fiveYearRange.push(entry);
  }

  // ── 5. Forward Storage Path ──
  // Project end-of-injection (Oct 31) and end-of-withdrawal (Mar 31)
  const eoisMonth = 9; // October (0-indexed)
  const eowsMonth = 2; // March
  let projectedEOIS = totalCurrentBcf;
  let projectedEOWS = totalCurrentBcf;

  if (month <= eoisMonth) {
    // Still before or during injection season
    const weeksToOct31 = Math.max(0, Math.round(((new Date(now.getFullYear(), 10, 1).getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000))));
    const avgWeeklyInjection = 50 + rng() * 30;
    projectedEOIS = Math.round(totalCurrentBcf + weeksToOct31 * avgWeeklyInjection);
  } else {
    projectedEOIS = Math.round(jitter(3700, 0.06)); // already past, estimate final
  }

  // Project end-of-withdrawal (next March 31)
  const weeksToMar31 = (() => {
    const targetYear = month >= 3 ? now.getFullYear() + 1 : now.getFullYear();
    const mar31 = new Date(targetYear, 3, 1);
    return Math.max(0, Math.round((mar31.getTime() - now.getTime()) / (7 * 24 * 60 * 60 * 1000)));
  })();
  const avgWeeklyWithdrawal = 80 + rng() * 40;
  if (month >= 10 || month <= 2) {
    projectedEOWS = Math.round(totalCurrentBcf - weeksToMar31 * avgWeeklyWithdrawal);
  } else {
    // In injection season, project from EOIS
    const withdrawalWeeks = 22; // ~Nov to Mar
    projectedEOWS = Math.round(projectedEOIS - withdrawalWeeks * avgWeeklyWithdrawal);
  }
  projectedEOWS = Math.max(projectedEOWS, 1200); // floor at historically low level

  const forwardPath = {
    projectedEndOfInjectionBcf: Math.min(projectedEOIS, Math.round(totalCapacity * 0.95)),
    endOfInjectionDate: `${now.getFullYear()}-10-31`,
    projectedEndOfWithdrawalBcf: projectedEOWS,
    endOfWithdrawalDate: month >= 3
      ? `${now.getFullYear() + 1}-03-31`
      : `${now.getFullYear()}-03-31`,
    fiveYearAvgEOIS: Math.round(jitter(3650, 0.03)),
    fiveYearAvgEOWS: Math.round(jitter(1750, 0.04)),
    impliedTotalWithdrawal: Math.round(Math.min(projectedEOIS, totalCapacity * 0.95) - projectedEOWS),
    impliedTotalInjection: Math.round(Math.min(projectedEOIS, totalCapacity * 0.95) - totalCurrentBcf),
  };

  // ── 6. Price Context ──
  const henryHubSpot = round2(jitter(2.85, 0.15));
  const nearbyFutures = round2(henryHubSpot + jitter(0.12, 0.5));
  const prompt12MonthSpread = round2(jitter(0.45, 0.3));
  const winterPremium = round2(jitter(1.20, 0.25));
  const storageDelta = vsAvgBcf;
  // Higher storage => lower price; correlation is negative
  const storagePriceCorrelation = round2(jitter(-0.72, 0.1));

  const priceContext = {
    henryHubSpot,
    nearbyFutures,
    prompt12MonthSpread,
    winterPremium,
    storagePriceCorrelation,
    priceChangeOnReport: round2((rng() - 0.5) * 0.30),
    impliedVolatility: round1(jitter(45, 0.15)),
    calendarSpread: {
      summerWinter: round2(jitter(-0.85, 0.3)),
      marchApril: round2(jitter(-0.35, 0.4)),
    },
  };

  // ── 7. Heating/Cooling Degree Days ──
  const isHeating = month >= 9 || month <= 4;
  const normalHDD = isHeating ? Math.round(jitter(180, 0.15)) : Math.round(jitter(12, 0.3));
  const actualHDD = Math.round(jitter(normalHDD, 0.2));
  const normalCDD = !isHeating ? Math.round(jitter(75, 0.15)) : Math.round(jitter(3, 0.4));
  const actualCDD = Math.round(jitter(normalCDD, 0.2));
  const totalDD = actualHDD + actualCDD;
  const normalTotalDD = normalHDD + normalCDD;

  const degreeDays = {
    heatingDegreeDays: {
      actual: actualHDD,
      normal: normalHDD,
      deviation: actualHDD - normalHDD,
      deviationPct: normalHDD > 0 ? round1(((actualHDD - normalHDD) / normalHDD) * 100) : 0,
    },
    coolingDegreeDays: {
      actual: actualCDD,
      normal: normalCDD,
      deviation: actualCDD - normalCDD,
      deviationPct: normalCDD > 0 ? round1(((actualCDD - normalCDD) / normalCDD) * 100) : 0,
    },
    totalWeatherDemandImpact: totalDD > normalTotalDD ? 'Above Normal' : totalDD < normalTotalDD ? 'Below Normal' : 'Normal',
    demandImplication: totalDD > normalTotalDD * 1.05 ? 'Bullish' : totalDD < normalTotalDD * 0.95 ? 'Bearish' : 'Neutral',
    forecastNextWeek: {
      hdd: Math.round(jitter(normalHDD, 0.25)),
      cdd: Math.round(jitter(normalCDD, 0.25)),
      trend: rng() > 0.5 ? 'Warmer than normal' : 'Colder than normal',
    },
  };

  // ── 8. Supply/Demand Balance ──
  // All in Bcf/d (billion cubic feet per day)
  const dryGasProduction = round1(jitter(103.5, 0.03));
  const supplementalGas = round1(jitter(0.2, 0.15));
  const pipelineImportsCanada = round1(jitter(5.8, 0.08));
  const lngImports = round1(jitter(0.1, 0.4));
  const totalSupply = round1(dryGasProduction + supplementalGas + pipelineImportsCanada + lngImports);

  const residentialCommercial = round1(jitter(isHeating ? 28.5 : 8.2, 0.1));
  const industrial = round1(jitter(22.8, 0.05));
  const electricPower = round1(jitter(isHeating ? 25.5 : 38.2, 0.08));
  const pipelineExportsMexico = round1(jitter(6.2, 0.08));
  const lngExports = round1(jitter(13.5, 0.06));
  const leaseAndPlantFuel = round1(jitter(5.8, 0.05));
  const vehicleFuel = round1(jitter(0.2, 0.1));
  const totalDemand = round1(residentialCommercial + industrial + electricPower + pipelineExportsMexico + lngExports + leaseAndPlantFuel + vehicleFuel);
  const balanceBcfD = round1(totalSupply - totalDemand);

  const supplyDemand = {
    supply: {
      dryGasProduction,
      supplementalGas,
      pipelineImportsCanada,
      lngImports,
      totalSupply,
    },
    demand: {
      residentialCommercial,
      industrial,
      electricPower,
      pipelineExportsMexico,
      lngExports,
      leaseAndPlantFuel,
      vehicleFuel,
      totalDemand,
    },
    balance: {
      netBalanceBcfD: balanceBcfD,
      impliedWeeklyChangeBcf: Math.round(balanceBcfD * 7),
      status: balanceBcfD > 0 ? 'Injection' : 'Withdrawal',
    },
    keyMetrics: {
      productionYoYChangePct: round1(jitter(1.8, 0.5)),
      lngExportUtilizationPct: round1(jitter(85, 0.08)),
      lngFeedgasCapacityBcfD: round1(jitter(15.8, 0.03)),
      powerBurnYoYChangePct: round1(jitter(3.2, 0.6)),
      mexicoExportTrend: rng() > 0.5 ? 'Rising' : 'Stable',
    },
  };

  return {
    total,
    regions,
    weeklyHistory,
    fiveYearRange,
    forwardPath,
    priceContext,
    degreeDays,
    supplyDemand,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[NaturalGasStorage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate natural gas storage data' });
  }
});

export default router;
