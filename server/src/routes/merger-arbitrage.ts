import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

interface Deal {
  target: string;
  acquirer: string;
  dealType: 'cash' | 'stock' | 'mixed';
  offerPrice: number;
  currentPrice: number;
  spreadPct: number;
  annualizedReturnPct: number;
  dealValueB: number;
  announcedDate: string;
  expectedClose: string;
  status: string;
  completionProbabilityPct: number;
  sector: string;
}

const DEAL_TEMPLATES = [
  { target: 'Pinnacle Data Systems', acquirer: 'Orion Cloud Holdings', dealType: 'cash' as const, offerBase: 84.50, dealValueB: 12.8, sector: 'Technology', status: 'pending regulatory' },
  { target: 'MeridianRx Corp', acquirer: 'Aethon Pharmaceuticals', dealType: 'mixed' as const, offerBase: 142.00, dealValueB: 28.5, sector: 'Healthcare', status: 'shareholder vote' },
  { target: 'Cascadia Energy Partners', acquirer: 'Solstice Power Group', dealType: 'cash' as const, offerBase: 56.75, dealValueB: 9.2, sector: 'Energy', status: 'pending regulatory' },
  { target: 'Silverlake Financial', acquirer: 'Ironforge Bancorp', dealType: 'stock' as const, offerBase: 67.20, dealValueB: 15.4, sector: 'Financials', status: 'extended review' },
  { target: 'BrightPath Logistics', acquirer: 'Vanguard Industrial Corp', dealType: 'cash' as const, offerBase: 38.90, dealValueB: 6.1, sector: 'Industrials', status: 'approved' },
  { target: 'NovaCrest Semiconductors', acquirer: 'Zenith Microelectronics', dealType: 'mixed' as const, offerBase: 195.00, dealValueB: 34.7, sector: 'Technology', status: 'pending regulatory' },
  { target: 'Harborview Consumer Brands', acquirer: 'Crestline Partners', dealType: 'cash' as const, offerBase: 52.30, dealValueB: 7.8, sector: 'Consumer', status: 'shareholder vote' },
  { target: 'TerraVolt Renewables', acquirer: 'Atlas Energy Infrastructure', dealType: 'stock' as const, offerBase: 29.40, dealValueB: 4.5, sector: 'Energy', status: 'pending regulatory' },
  { target: 'Keystone Health Systems', acquirer: 'Meridian Wellness Group', dealType: 'cash' as const, offerBase: 118.50, dealValueB: 21.3, sector: 'Healthcare', status: 'extended review' },
  { target: 'Copperfield Technologies', acquirer: 'Nexus Digital Holdings', dealType: 'mixed' as const, offerBase: 73.80, dealValueB: 11.6, sector: 'Technology', status: 'pending regulatory' },
];

const SECTORS = ['Technology', 'Healthcare', 'Energy', 'Financials', 'Consumer', 'Industrials'];


let cache: { data: unknown; ts: number } | null = null;

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('merger-arbitrage-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // Generate announced/expected dates relative to today
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);

  const activeDeals: Deal[] = DEAL_TEMPLATES.map(tmpl => {
    const offerPrice = Math.round(jitter(tmpl.offerBase, 0.03) * 100) / 100;
    // Current price trades below offer (the spread)
    const spreadRaw = 0.5 + rng() * 8; // 0.5% to 8.5% spread
    const currentPrice = Math.round(offerPrice * (1 - spreadRaw / 100) * 100) / 100;
    const spreadPct = Math.round((offerPrice / currentPrice - 1) * 100 * 100) / 100;

    // Days to expected close: 30-270 days from now
    const daysToClose = 30 + Math.floor(rng() * 240);
    const annualizedReturnPct = Math.round(spreadPct * (365 / daysToClose) * 100) / 100;

    // Announced date: 10-180 days ago
    const daysAgo = 10 + Math.floor(rng() * 170);
    const announcedDate = new Date(today);
    announcedDate.setDate(announcedDate.getDate() - daysAgo);

    const expectedClose = new Date(today);
    expectedClose.setDate(expectedClose.getDate() + daysToClose);

    const completionProbabilityPct = Math.round((70 + rng() * 25) * 10) / 10;

    return {
      target: tmpl.target,
      acquirer: tmpl.acquirer,
      dealType: tmpl.dealType,
      offerPrice,
      currentPrice,
      spreadPct,
      annualizedReturnPct,
      dealValueB: Math.round(jitter(tmpl.dealValueB, 0.05) * 10) / 10,
      announcedDate: formatDate(announcedDate),
      expectedClose: formatDate(expectedClose),
      status: tmpl.status,
      completionProbabilityPct,
      sector: tmpl.sector,
    };
  });

  // Spread Analysis
  const spreads = activeDeals.map(d => d.spreadPct);
  const sortedSpreads = [...spreads].sort((a, b) => a - b);
  const avgSpread = Math.round(spreads.reduce((a, b) => a + b, 0) / spreads.length * 100) / 100;
  const medianSpread = sortedSpreads.length % 2 === 0
    ? Math.round((sortedSpreads[sortedSpreads.length / 2 - 1] + sortedSpreads[sortedSpreads.length / 2]) / 2 * 100) / 100
    : sortedSpreads[Math.floor(sortedSpreads.length / 2)];

  const tightestIdx = spreads.indexOf(Math.min(...spreads));
  const widestIdx = spreads.indexOf(Math.max(...spreads));

  const spreadAnalysis = {
    avgSpread,
    medianSpread,
    tightestDeal: { name: activeDeals[tightestIdx].target, spread: sortedSpreads[0] },
    widestDeal: { name: activeDeals[widestIdx].target, spread: sortedSpreads[sortedSpreads.length - 1] },
    spreadVs6mAgo: Math.round((rng() - 0.4) * 200) / 100, // -0.8 to +1.2 ppt change
    spreadVs1yrAgo: Math.round((rng() - 0.3) * 300) / 100, // -0.9 to +2.1 ppt change
    indexReturnYTD: Math.round((2 + rng() * 6) * 100) / 100, // 2-8% YTD
  };

  // Risk Monitors (first 5 deals)
  const riskLevels = ['low', 'medium', 'high'] as const;
  const antitrustFilings = ['HSR', 'EU', 'CMA'] as const;

  const riskMonitors = activeDeals.slice(0, 5).map(deal => {
    const regIdx = Math.floor(rng() * 3);
    const antitrustCount = 1 + Math.floor(rng() * 3); // 1-3 filings
    const filings: string[] = [];
    const usedIdxs = new Set<number>();
    for (let i = 0; i < antitrustCount; i++) {
      let idx = Math.floor(rng() * 3);
      while (usedIdxs.has(idx)) idx = (idx + 1) % 3;
      usedIdxs.add(idx);
      filings.push(antitrustFilings[idx]);
    }

    return {
      dealName: deal.target,
      regulatoryRisk: riskLevels[regIdx],
      antitrustFiling: filings,
      financingRisk: riskLevels[Math.floor(rng() * 3)],
      shareholderApprovalNeeded: rng() > 0.4,
      litigationRisk: riskLevels[Math.floor(rng() * 3)],
      breakFeePct: Math.round((2 + rng() * 5) * 10) / 10, // 2-7%
    };
  });

  // Recent Events
  const eventTypes = [
    'Deal announced',
    'Regulatory filing submitted',
    'Shareholder vote scheduled',
    'Regulatory approval received',
    'Review period extended',
    'Deal terminated',
  ];

  const recentEvents = eventTypes.map((event, i) => {
    const dealIdx = Math.floor(rng() * activeDeals.length);
    const daysAgoEvent = Math.floor(rng() * 30);
    const eventDate = new Date(today);
    eventDate.setDate(eventDate.getDate() - daysAgoEvent);

    // Spread impact in bps: positive = widening, negative = tightening
    let spreadImpact: number;
    if (event === 'Regulatory approval received' || event === 'Deal announced') {
      spreadImpact = -Math.round((10 + rng() * 80)); // tightening
    } else if (event === 'Deal terminated') {
      spreadImpact = Math.round(200 + rng() * 500); // massive widening
    } else if (event === 'Review period extended') {
      spreadImpact = Math.round(15 + rng() * 60); // widening
    } else {
      spreadImpact = Math.round((rng() - 0.5) * 40); // mixed
    }

    return {
      dealName: activeDeals[dealIdx].target,
      event,
      date: formatDate(eventDate),
      spreadImpactBps: spreadImpact,
    };
  });

  // Sector Breakdown
  const sectorBreakdown = SECTORS.map(sector => {
    const sectorDeals = activeDeals.filter(d => d.sector === sector);
    const count = sectorDeals.length;
    if (count === 0) {
      return {
        sector,
        count: 0,
        avgSpread: 0,
        avgAnnualizedReturn: 0,
        totalDealValueB: 0,
      };
    }
    const sAvgSpread = Math.round(sectorDeals.reduce((a, d) => a + d.spreadPct, 0) / count * 100) / 100;
    const sAvgAnnualized = Math.round(sectorDeals.reduce((a, d) => a + d.annualizedReturnPct, 0) / count * 100) / 100;
    const sTotalValue = Math.round(sectorDeals.reduce((a, d) => a + d.dealValueB, 0) * 10) / 10;

    return {
      sector,
      count,
      avgSpread: sAvgSpread,
      avgAnnualizedReturn: sAvgAnnualized,
      totalDealValueB: sTotalValue,
    };
  });

  return {
    activeDeals,
    spreadAnalysis,
    riskMonitors,
    recentEvents,
    sectorBreakdown,
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
    console.error('[MergerArbitrage] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate merger arbitrage data' });
  }
});

export default router;
