import { Router } from 'express';
import { mulberry32, hashSeed, seededRandom } from '../lib/seeded-data.js';
const router = Router();

// ── Types ──

interface IndustryOverview {
  totalAUMTrillions: number;
  dryPowderTrillions: number;
  fundraisingYTDBillions: number;
  dealActivityYTDBillions: number;
  exitVolumeYTDBillions: number;
  avgEntryMultiple: number;
}

interface PEFirm {
  firm: string;
  aumBillions: number;
  latestFundSizeBillions: number;
  latestFundVintage: number;
  netIRR: number;
  netTVPI: number;
  dpiPct: number;
  dealsYTD: number;
  avgDealSizeBillions: number;
  primaryStrategy: 'buyout' | 'growth' | 'credit' | 'infrastructure' | 'technology';
}

interface RecentDeal {
  acquirer: string;
  target: string;
  dealValueBillions: number;
  sector: string;
  entryMultiple: number;
  financingType: 'leveraged' | 'club-deal' | 'consortium' | 'take-private' | 'bolt-on';
  status: string;
  announcedDate: string;
}

interface StrategyBreakdown {
  amount: number;
  count: number;
}

interface FundraisingActivity {
  totalRaisedYTDBillions: number;
  totalFundsClosedYTD: number;
  avgFundSizeBillions: number;
  byStrategy: {
    buyout: StrategyBreakdown;
    growth: StrategyBreakdown;
    venture: StrategyBreakdown;
    credit: StrategyBreakdown;
    'real-estate': StrategyBreakdown;
    infrastructure: StrategyBreakdown;
    secondaries: StrategyBreakdown;
  };
}

interface ExitRecord {
  firm: string;
  company: string;
  exitType: 'IPO' | 'strategic-sale' | 'secondary-buyout' | 'recapitalization';
  entryYear: number;
  exitValueBillions: number;
  multipleOnInvestedCapital: number;
  grossIRR: number;
}

interface VintagePerformance {
  vintageYear: number;
  netIRR: number;
  tvpi: number;
  dpi: number;
  calledPct: number;
  distributedPct: number;
  quartileBreakpoints: {
    top: number;
    median: number;
    bottom: number;
  };
}

interface PrivateEquityResponse {
  industryOverview: IndustryOverview;
  topFirms: PEFirm[];
  recentDeals: RecentDeal[];
  fundraisingActivity: FundraisingActivity;
  exitActivity: ExitRecord[];
  performanceBenchmarks: VintagePerformance[];
  generatedAt: string;
}

// ── Cache ──

let cache: { data: PrivateEquityResponse; ts: number } | null = null;
let staleData: PrivateEquityResponse | null = null;
const TTL = 5 * 60 * 1000;

// ── Static Data ──

const FIRM_DATA: { name: string; aum: number; fundSize: number; vintage: number; irr: number; tvpi: number; dpi: number; deals: number; dealSize: number; strategy: PEFirm['primaryStrategy'] }[] = [
  { name: 'Blackstone',     aum: 1050, fundSize: 30.4, vintage: 2023, irr: 18.2, tvpi: 1.74, dpi: 48, deals: 28, dealSize: 3.2,  strategy: 'buyout' },
  { name: 'KKR',            aum: 553,  fundSize: 19.0, vintage: 2022, irr: 17.5, tvpi: 1.68, dpi: 42, deals: 24, dealSize: 2.6,  strategy: 'buyout' },
  { name: 'Apollo',         aum: 631,  fundSize: 24.7, vintage: 2023, irr: 19.1, tvpi: 1.62, dpi: 35, deals: 30, dealSize: 2.1,  strategy: 'credit' },
  { name: 'Carlyle',        aum: 426,  fundSize: 14.8, vintage: 2022, irr: 16.3, tvpi: 1.58, dpi: 44, deals: 22, dealSize: 1.8,  strategy: 'buyout' },
  { name: 'TPG',            aum: 224,  fundSize: 11.5, vintage: 2022, irr: 15.7, tvpi: 1.52, dpi: 38, deals: 18, dealSize: 1.5,  strategy: 'growth' },
  { name: 'Warburg Pincus', aum: 86,   fundSize: 7.3,  vintage: 2021, irr: 17.0, tvpi: 1.65, dpi: 55, deals: 15, dealSize: 0.9,  strategy: 'growth' },
  { name: 'Thoma Bravo',    aum: 142,  fundSize: 16.5, vintage: 2023, irr: 21.4, tvpi: 1.48, dpi: 22, deals: 20, dealSize: 1.3,  strategy: 'technology' },
  { name: 'Vista Equity',   aum: 104,  fundSize: 12.8, vintage: 2022, irr: 20.3, tvpi: 1.55, dpi: 28, deals: 16, dealSize: 1.1,  strategy: 'technology' },
  { name: 'Advent',         aum: 94,   fundSize: 8.8,  vintage: 2021, irr: 15.8, tvpi: 1.60, dpi: 46, deals: 14, dealSize: 1.0,  strategy: 'buyout' },
  { name: 'CVC',            aum: 188,  fundSize: 15.2, vintage: 2023, irr: 17.6, tvpi: 1.45, dpi: 24, deals: 21, dealSize: 1.7,  strategy: 'buyout' },
  { name: 'EQT',            aum: 130,  fundSize: 10.2, vintage: 2022, irr: 16.8, tvpi: 1.56, dpi: 40, deals: 17, dealSize: 1.2,  strategy: 'infrastructure' },
  { name: 'Permira',        aum: 80,   fundSize: 9.5,  vintage: 2022, irr: 18.0, tvpi: 1.60, dpi: 36, deals: 13, dealSize: 1.4,  strategy: 'buyout' },
];

const DEAL_TARGETS = [
  { target: 'Medline Industries',     sector: 'Healthcare',      acquirerIdx: 0, value: 34.0, mult: 17.2, fin: 'consortium' as const },
  { target: 'Citrix Systems',         sector: 'Technology',      acquirerIdx: 6, value: 16.5, mult: 25.4, fin: 'leveraged' as const },
  { target: 'Athenahealth',           sector: 'Healthcare',      acquirerIdx: 1, value: 17.0, mult: 22.8, fin: 'take-private' as const },
  { target: 'Zendesk',               sector: 'Technology',      acquirerIdx: 7, value: 10.2, mult: 18.5, fin: 'take-private' as const },
  { target: 'Nielsen Holdings',       sector: 'Media',           acquirerIdx: 0, value: 16.0, mult: 12.4, fin: 'club-deal' as const },
  { target: 'McAfee',                sector: 'Technology',      acquirerIdx: 2, value: 14.0, mult: 15.8, fin: 'leveraged' as const },
  { target: 'Cotiviti',              sector: 'Healthcare',      acquirerIdx: 3, value: 4.9,  mult: 20.1, fin: 'bolt-on' as const },
  { target: 'Stamps.com',            sector: 'E-Commerce',      acquirerIdx: 6, value: 6.6,  mult: 13.2, fin: 'take-private' as const },
  { target: 'Inovalon',              sector: 'Healthcare IT',   acquirerIdx: 4, value: 7.3,  mult: 24.6, fin: 'take-private' as const },
  { target: 'RealPage',              sector: 'Real Estate Tech', acquirerIdx: 6, value: 10.2, mult: 22.0, fin: 'leveraged' as const },
];

const EXIT_RECORDS_STATIC: { firm: string; company: string; exitType: ExitRecord['exitType']; entryYear: number; baseExitValue: number; baseMOIC: number; baseIRR: number }[] = [
  { firm: 'Blackstone',     company: 'Refinitiv',             exitType: 'strategic-sale',    entryYear: 2018, baseExitValue: 27.0, baseMOIC: 3.2, baseIRR: 42.5 },
  { firm: 'KKR',            company: 'PetVet Care Centers',   exitType: 'secondary-buyout',  entryYear: 2019, baseExitValue: 4.6,  baseMOIC: 2.8, baseIRR: 35.2 },
  { firm: 'Apollo',         company: 'Rackspace Technology',  exitType: 'IPO',               entryYear: 2016, baseExitValue: 8.5,  baseMOIC: 1.4, baseIRR: 8.2 },
  { firm: 'Thoma Bravo',    company: 'SailPoint Technologies', exitType: 'IPO',              entryYear: 2020, baseExitValue: 6.9,  baseMOIC: 3.5, baseIRR: 52.0 },
  { firm: 'Carlyle',        company: 'StandardAero',          exitType: 'strategic-sale',    entryYear: 2019, baseExitValue: 5.4,  baseMOIC: 2.4, baseIRR: 28.6 },
  { firm: 'Vista Equity',   company: 'Datto',                 exitType: 'IPO',               entryYear: 2017, baseExitValue: 4.0,  baseMOIC: 4.2, baseIRR: 38.0 },
  { firm: 'EQT',            company: 'Dechra Pharmaceuticals', exitType: 'strategic-sale',   entryYear: 2021, baseExitValue: 5.5,  baseMOIC: 1.8, baseIRR: 22.4 },
  { firm: 'Permira',        company: 'Genesys',               exitType: 'recapitalization',  entryYear: 2020, baseExitValue: 8.0,  baseMOIC: 2.6, baseIRR: 32.0 },
];

const DEAL_STATUSES = ['Completed', 'Pending Regulatory Approval', 'Signed', 'Announced'];

// ── Helpers ──

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Generator ──

function generate(): PrivateEquityResponse {
  const rng = seededRandom('private-equity');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Top Firms
  const topFirms: PEFirm[] = FIRM_DATA.map(f => ({
    firm: f.name,
    aumBillions: round1(jitter(f.aum, 0.06)),
    latestFundSizeBillions: round1(jitter(f.fundSize, 0.08)),
    latestFundVintage: f.vintage,
    netIRR: round1(jitter(f.irr, 0.08)),
    netTVPI: round2(jitter(f.tvpi, 0.06)),
    dpiPct: round1(jitter(f.dpi, 0.10)),
    dealsYTD: Math.round(jitter(f.deals, 0.15)),
    avgDealSizeBillions: round2(jitter(f.dealSize, 0.12)),
    primaryStrategy: f.strategy,
  }));

  // 2. Industry Overview
  const totalAUM = topFirms.reduce((s, f) => s + f.aumBillions, 0);
  const industryOverview: IndustryOverview = {
    totalAUMTrillions: round1(jitter(8.2, 0.05)),
    dryPowderTrillions: round1(jitter(2.6, 0.06)),
    fundraisingYTDBillions: round1(jitter(420, 0.08)),
    dealActivityYTDBillions: round1(jitter(680, 0.10)),
    exitVolumeYTDBillions: round1(jitter(350, 0.10)),
    avgEntryMultiple: round1(jitter(13.0, 0.06)),
  };

  // 3. Recent Deals
  const today = new Date();
  const recentDeals: RecentDeal[] = DEAL_TARGETS.map((d, i) => {
    const daysAgo = Math.floor(rng() * 90);
    const date = new Date(today.getTime() - daysAgo * 86400000);
    return {
      acquirer: FIRM_DATA[d.acquirerIdx].name,
      target: d.target,
      dealValueBillions: round1(jitter(d.value, 0.10)),
      sector: d.sector,
      entryMultiple: round1(jitter(d.mult, 0.08)),
      financingType: d.fin,
      status: DEAL_STATUSES[Math.floor(rng() * DEAL_STATUSES.length)],
      announcedDate: date.toISOString().slice(0, 10),
    };
  });

  // 4. Fundraising Activity
  const strategyData: { key: string; baseAmount: number; baseCount: number }[] = [
    { key: 'buyout',          baseAmount: 165, baseCount: 42 },
    { key: 'growth',          baseAmount: 72,  baseCount: 28 },
    { key: 'venture',         baseAmount: 55,  baseCount: 65 },
    { key: 'credit',          baseAmount: 58,  baseCount: 22 },
    { key: 'real-estate',     baseAmount: 38,  baseCount: 18 },
    { key: 'infrastructure',  baseAmount: 42,  baseCount: 15 },
    { key: 'secondaries',     baseAmount: 32,  baseCount: 12 },
  ];

  const byStrategy: Record<string, StrategyBreakdown> = {};
  let totalRaised = 0;
  let totalFunds = 0;
  for (const s of strategyData) {
    const amount = round1(jitter(s.baseAmount, 0.10));
    const count = Math.round(jitter(s.baseCount, 0.12));
    byStrategy[s.key] = { amount, count };
    totalRaised += amount;
    totalFunds += count;
  }

  const fundraisingActivity: FundraisingActivity = {
    totalRaisedYTDBillions: round1(totalRaised),
    totalFundsClosedYTD: totalFunds,
    avgFundSizeBillions: round2(totalRaised / totalFunds),
    byStrategy: byStrategy as FundraisingActivity['byStrategy'],
  };

  // 5. Exit Activity
  const exitActivity: ExitRecord[] = EXIT_RECORDS_STATIC.map(e => ({
    firm: e.firm,
    company: e.company,
    exitType: e.exitType,
    entryYear: e.entryYear,
    exitValueBillions: round1(jitter(e.baseExitValue, 0.10)),
    multipleOnInvestedCapital: round1(jitter(e.baseMOIC, 0.08)),
    grossIRR: round1(jitter(e.baseIRR, 0.10)),
  }));

  // 6. Performance Benchmarks
  const vintages = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
  const vintageBase: { irr: number; tvpi: number; dpi: number; called: number; distributed: number }[] = [
    { irr: 16.8, tvpi: 1.82, dpi: 1.45, called: 95, distributed: 85 },
    { irr: 18.5, tvpi: 1.78, dpi: 1.28, called: 92, distributed: 72 },
    { irr: 22.1, tvpi: 1.95, dpi: 1.05, called: 88, distributed: 55 },
    { irr: 14.2, tvpi: 1.52, dpi: 0.68, called: 82, distributed: 38 },
    { irr: 12.5, tvpi: 1.35, dpi: 0.32, called: 72, distributed: 18 },
    { irr: 10.8, tvpi: 1.18, dpi: 0.12, called: 55, distributed: 6 },
    { irr: 8.2,  tvpi: 1.05, dpi: 0.02, called: 32, distributed: 1 },
  ];

  const performanceBenchmarks: VintagePerformance[] = vintages.map((year, i) => {
    const b = vintageBase[i];
    const irr = round1(jitter(b.irr, 0.08));
    const topQ = round1(irr + jitter(6.5, 0.10));
    const median = round1(irr - jitter(2.0, 0.10));
    const bottomQ = round1(irr - jitter(7.0, 0.10));
    return {
      vintageYear: year,
      netIRR: irr,
      tvpi: round2(jitter(b.tvpi, 0.06)),
      dpi: round2(jitter(b.dpi, 0.08)),
      calledPct: round1(jitter(b.called, 0.04)),
      distributedPct: round1(jitter(b.distributed, 0.06)),
      quartileBreakpoints: {
        top: topQ,
        median,
        bottom: bottomQ,
      },
    };
  });

  return {
    industryOverview,
    topFirms,
    recentDeals,
    fundraisingActivity,
    exitActivity,
    performanceBenchmarks,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) return res.json(cache.data);
    const data = generate();
    staleData = cache?.data ?? staleData;
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[PrivateEquity] Error:', (err as Error).message);
    if (staleData) return res.json(staleData);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate private equity data' });
  }
});

export default router;
