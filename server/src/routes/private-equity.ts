import { Router } from 'express';
const router = Router();
function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }
let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface MarketOverview {
  totalDryPowder: number;
  globalPEDealVolume: number;
  avgBuyoutMultiple: number;
  avgEntryMultiple: number;
  medianFundSize: number;
  fundraisingYTD: number;
}

interface PEFirm {
  firm: string;
  aum: number;
  dryPowder: number;
  dealsYTD: number;
  avgDealSize: number;
  flagshipFundVintage: number;
  netIRR: number;
  tvpi: number;
  dpi: number;
}

interface ExitActivity {
  type: string;
  count: number;
  totalValue: number;
  avgHoldingPeriod: number;
  avgMOIC: number;
}

interface SectorBreakdown {
  sector: string;
  dealCount: number;
  dealValue: number;
  avgMultiple: number;
  yoyChange: number;
}

interface FundraisingItem {
  fundName: string;
  firm: string;
  target: number;
  raised: number;
  pctOfTarget: number;
  strategy: string;
}

interface PrivateEquityResponse {
  marketOverview: MarketOverview;
  topFirms: PEFirm[];
  exitActivity: ExitActivity[];
  sectorBreakdown: SectorBreakdown[];
  fundraising: FundraisingItem[];
  generatedAt: string;
}

// ── Static data ──

const FIRMS: { name: string; baseAUM: number; baseDry: number; baseDeals: number; baseDealSize: number; vintage: number; baseIRR: number; baseTVPI: number; baseDPI: number }[] = [
  { name: 'Blackstone',          baseAUM: 1010, baseDry: 170, baseDeals: 28, baseDealSize: 2800, vintage: 2020, baseIRR: 18.5, baseTVPI: 1.72, baseDPI: 0.45 },
  { name: 'KKR',                 baseAUM: 528,  baseDry: 110, baseDeals: 24, baseDealSize: 2200, vintage: 2021, baseIRR: 17.2, baseTVPI: 1.65, baseDPI: 0.38 },
  { name: 'Apollo',              baseAUM: 617,  baseDry: 98,  baseDeals: 32, baseDealSize: 1900, vintage: 2022, baseIRR: 19.8, baseTVPI: 1.58, baseDPI: 0.28 },
  { name: 'Carlyle',             baseAUM: 426,  baseDry: 82,  baseDeals: 22, baseDealSize: 1750, vintage: 2021, baseIRR: 16.4, baseTVPI: 1.55, baseDPI: 0.42 },
  { name: 'TPG',                 baseAUM: 222,  baseDry: 52,  baseDeals: 18, baseDealSize: 1500, vintage: 2022, baseIRR: 15.8, baseTVPI: 1.48, baseDPI: 0.32 },
  { name: 'Warburg Pincus',      baseAUM: 83,   baseDry: 22,  baseDeals: 15, baseDealSize: 680,  vintage: 2020, baseIRR: 16.9, baseTVPI: 1.62, baseDPI: 0.52 },
  { name: 'Thoma Bravo',         baseAUM: 138,  baseDry: 35,  baseDeals: 20, baseDealSize: 1200, vintage: 2023, baseIRR: 21.3, baseTVPI: 1.45, baseDPI: 0.18 },
  { name: 'Vista Equity',        baseAUM: 101,  baseDry: 28,  baseDeals: 16, baseDealSize: 950,  vintage: 2022, baseIRR: 20.1, baseTVPI: 1.52, baseDPI: 0.25 },
  { name: 'Hellman & Friedman',  baseAUM: 95,   baseDry: 24,  baseDeals: 10, baseDealSize: 2400, vintage: 2021, baseIRR: 17.6, baseTVPI: 1.68, baseDPI: 0.48 },
  { name: 'Bain Capital',        baseAUM: 185,  baseDry: 42,  baseDeals: 19, baseDealSize: 1350, vintage: 2022, baseIRR: 16.1, baseTVPI: 1.50, baseDPI: 0.35 },
  { name: 'Advent Intl',         baseAUM: 91,   baseDry: 20,  baseDeals: 14, baseDealSize: 980,  vintage: 2021, baseIRR: 15.5, baseTVPI: 1.58, baseDPI: 0.44 },
  { name: 'CVC Capital',         baseAUM: 186,  baseDry: 45,  baseDeals: 21, baseDealSize: 1600, vintage: 2023, baseIRR: 17.8, baseTVPI: 1.42, baseDPI: 0.20 },
];

const EXIT_TYPES = ['IPO', 'Strategic Sale', 'Secondary', 'Recap'];

const SECTORS = ['Technology', 'Healthcare', 'Financials', 'Industrials', 'Consumer', 'Energy'];

const FUND_TEMPLATES: { fundName: string; firm: string; baseTarget: number; strategy: string }[] = [
  { fundName: 'Blackstone Capital Partners IX',    firm: 'Blackstone',         baseTarget: 26.0, strategy: 'Buyout' },
  { fundName: 'KKR North America Fund XIV',       firm: 'KKR',                baseTarget: 19.5, strategy: 'Buyout' },
  { fundName: 'Apollo Investment Fund XI',         firm: 'Apollo',             baseTarget: 22.0, strategy: 'Distressed' },
  { fundName: 'Carlyle Partners VIII',             firm: 'Carlyle',            baseTarget: 14.5, strategy: 'Buyout' },
  { fundName: 'TPG Partners IX',                   firm: 'TPG',                baseTarget: 11.0, strategy: 'Growth' },
  { fundName: 'Thoma Bravo Fund XVI',              firm: 'Thoma Bravo',        baseTarget: 16.0, strategy: 'Buyout' },
  { fundName: 'Vista Equity Fund VIII',            firm: 'Vista Equity',       baseTarget: 12.5, strategy: 'Growth' },
  { fundName: 'Bain Capital Fund XIV',             firm: 'Bain Capital',       baseTarget: 10.0, strategy: 'Buyout' },
  { fundName: 'Advent International GPE X',        firm: 'Advent Intl',        baseTarget: 8.5,  strategy: 'Buyout' },
  { fundName: 'CVC Capital Partners IX',           firm: 'CVC Capital',        baseTarget: 15.0, strategy: 'Buyout' },
  { fundName: 'Warburg Pincus Global Growth 15',   firm: 'Warburg Pincus',     baseTarget: 7.0,  strategy: 'Venture' },
  { fundName: 'H&F Capital Partners XI',           firm: 'Hellman & Friedman', baseTarget: 18.0, strategy: 'Buyout' },
];

// ── Helpers ──

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

// ── Generator ──

function generate(): PrivateEquityResponse {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('private-equity-' + day));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);

  // 1. Top PE Firms
  const topFirms: PEFirm[] = FIRMS.map(f => ({
    firm: f.name,
    aum: round1(jitter(f.baseAUM, 0.06)),
    dryPowder: round1(jitter(f.baseDry, 0.10)),
    dealsYTD: Math.round(jitter(f.baseDeals, 0.15)),
    avgDealSize: Math.round(jitter(f.baseDealSize, 0.12)),
    flagshipFundVintage: f.vintage,
    netIRR: round1(jitter(f.baseIRR, 0.08)),
    tvpi: round2(jitter(f.baseTVPI, 0.06)),
    dpi: round2(jitter(f.baseDPI, 0.10)),
  }));

  // 2. Market Overview
  const totalDryPowder = round1(topFirms.reduce((s, f) => s + f.dryPowder, 0) + jitter(580, 0.08));
  const globalPEDealVolume = round1(jitter(820, 0.10));
  const avgBuyoutMultiple = round1(jitter(11.8, 0.06));
  const avgEntryMultiple = round1(jitter(13.2, 0.06));
  const medianFundSize = Math.round(jitter(1250, 0.10));
  const fundraisingYTD = round1(jitter(385, 0.08));

  const marketOverview: MarketOverview = {
    totalDryPowder,
    globalPEDealVolume,
    avgBuyoutMultiple,
    avgEntryMultiple,
    medianFundSize,
    fundraisingYTD,
  };

  // 3. Exit Activity
  const exitBaseData: { type: string; baseCount: number; baseValue: number; baseHold: number; baseMOIC: number }[] = [
    { type: 'IPO',             baseCount: 42,  baseValue: 68,  baseHold: 4.8, baseMOIC: 3.2 },
    { type: 'Strategic Sale',  baseCount: 128, baseValue: 195, baseHold: 5.2, baseMOIC: 2.6 },
    { type: 'Secondary',       baseCount: 85,  baseValue: 112, baseHold: 4.1, baseMOIC: 2.1 },
    { type: 'Recap',           baseCount: 58,  baseValue: 74,  baseHold: 3.5, baseMOIC: 1.8 },
  ];

  const exitActivity: ExitActivity[] = exitBaseData.map(e => ({
    type: e.type,
    count: Math.round(jitter(e.baseCount, 0.12)),
    totalValue: round1(jitter(e.baseValue, 0.10)),
    avgHoldingPeriod: round1(jitter(e.baseHold, 0.08)),
    avgMOIC: round1(jitter(e.baseMOIC, 0.10)),
  }));

  // 4. Sector Breakdown
  const sectorBaseData: { sector: string; baseDealCount: number; baseDealValue: number; baseMultiple: number; baseYoY: number }[] = [
    { sector: 'Technology',   baseDealCount: 145, baseDealValue: 285, baseMultiple: 14.8, baseYoY: 12.5 },
    { sector: 'Healthcare',   baseDealCount: 112, baseDealValue: 198, baseMultiple: 13.2, baseYoY: 8.3 },
    { sector: 'Financials',   baseDealCount: 78,  baseDealValue: 142, baseMultiple: 10.5, baseYoY: -3.2 },
    { sector: 'Industrials',  baseDealCount: 95,  baseDealValue: 128, baseMultiple: 9.8,  baseYoY: 5.1 },
    { sector: 'Consumer',     baseDealCount: 68,  baseDealValue: 96,  baseMultiple: 11.2, baseYoY: -6.8 },
    { sector: 'Energy',       baseDealCount: 52,  baseDealValue: 78,  baseMultiple: 8.5,  baseYoY: 15.2 },
  ];

  const sectorBreakdown: SectorBreakdown[] = sectorBaseData.map(s => ({
    sector: s.sector,
    dealCount: Math.round(jitter(s.baseDealCount, 0.10)),
    dealValue: round1(jitter(s.baseDealValue, 0.10)),
    avgMultiple: round1(jitter(s.baseMultiple, 0.06)),
    yoyChange: round1(jitter(s.baseYoY, 0.15)),
  }));

  // 5. Fundraising
  const fundraising: FundraisingItem[] = FUND_TEMPLATES.map(ft => {
    const target = round1(jitter(ft.baseTarget, 0.08));
    const raisedPct = 0.55 + rng() * 0.55; // 55% to 110% of target
    const raised = round1(target * raisedPct);
    const pctOfTarget = Math.round((raised / target) * 100);
    return {
      fundName: ft.fundName,
      firm: ft.firm,
      target,
      raised,
      pctOfTarget,
      strategy: ft.strategy,
    };
  });

  return {
    marketOverview,
    topFirms,
    exitActivity,
    sectorBreakdown,
    fundraising,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

let staleData: any = null;

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
