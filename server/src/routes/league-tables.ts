import { Router } from 'express';
import { mulberry32, hashSeed } from '../lib/seeded-data.js';
const router = Router();

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Helpers ──

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Bank universe ──

const ALL_BANKS = [
  'Goldman Sachs', 'JPMorgan', 'Morgan Stanley', 'Bank of America', 'Citi',
  'Barclays', 'Deutsche Bank', 'UBS', 'Credit Agricole', 'BNP Paribas',
  'HSBC', 'Wells Fargo', 'RBC Capital', 'Jefferies', 'Lazard',
  'Evercore', 'Moelis', 'PJT Partners', 'Rothschild', 'Nomura',
];

// ── Base profiles per bank (approximate real-world 2024-2026 scale) ──

interface BankProfile {
  name: string;
  maStrength: number;      // 0-1 relative M&A advisory strength
  ecmStrength: number;     // 0-1 ECM strength
  dcmStrength: number;     // 0-1 DCM strength
  ipoStrength: number;     // 0-1 IPO strength
  usWeight: number;        // 0-1 US deal share
  emeaWeight: number;      // 0-1 EMEA deal share
}

const BANK_PROFILES: BankProfile[] = [
  { name: 'Goldman Sachs',   maStrength: 0.97, ecmStrength: 0.95, dcmStrength: 0.90, ipoStrength: 0.96, usWeight: 0.65, emeaWeight: 0.25 },
  { name: 'JPMorgan',        maStrength: 0.95, ecmStrength: 0.97, dcmStrength: 0.98, ipoStrength: 0.94, usWeight: 0.60, emeaWeight: 0.25 },
  { name: 'Morgan Stanley',  maStrength: 0.93, ecmStrength: 0.94, dcmStrength: 0.85, ipoStrength: 0.95, usWeight: 0.60, emeaWeight: 0.25 },
  { name: 'Bank of America', maStrength: 0.82, ecmStrength: 0.88, dcmStrength: 0.95, ipoStrength: 0.80, usWeight: 0.70, emeaWeight: 0.15 },
  { name: 'Citi',            maStrength: 0.80, ecmStrength: 0.85, dcmStrength: 0.92, ipoStrength: 0.78, usWeight: 0.50, emeaWeight: 0.30 },
  { name: 'Barclays',        maStrength: 0.75, ecmStrength: 0.78, dcmStrength: 0.88, ipoStrength: 0.72, usWeight: 0.35, emeaWeight: 0.50 },
  { name: 'Deutsche Bank',   maStrength: 0.68, ecmStrength: 0.65, dcmStrength: 0.82, ipoStrength: 0.60, usWeight: 0.25, emeaWeight: 0.55 },
  { name: 'UBS',             maStrength: 0.72, ecmStrength: 0.70, dcmStrength: 0.78, ipoStrength: 0.68, usWeight: 0.30, emeaWeight: 0.45 },
  { name: 'Credit Agricole', maStrength: 0.45, ecmStrength: 0.50, dcmStrength: 0.80, ipoStrength: 0.40, usWeight: 0.15, emeaWeight: 0.65 },
  { name: 'BNP Paribas',     maStrength: 0.55, ecmStrength: 0.58, dcmStrength: 0.85, ipoStrength: 0.50, usWeight: 0.20, emeaWeight: 0.55 },
  { name: 'HSBC',            maStrength: 0.60, ecmStrength: 0.62, dcmStrength: 0.83, ipoStrength: 0.55, usWeight: 0.20, emeaWeight: 0.40 },
  { name: 'Wells Fargo',     maStrength: 0.50, ecmStrength: 0.55, dcmStrength: 0.75, ipoStrength: 0.45, usWeight: 0.85, emeaWeight: 0.05 },
  { name: 'RBC Capital',     maStrength: 0.58, ecmStrength: 0.60, dcmStrength: 0.65, ipoStrength: 0.55, usWeight: 0.55, emeaWeight: 0.15 },
  { name: 'Jefferies',       maStrength: 0.62, ecmStrength: 0.60, dcmStrength: 0.58, ipoStrength: 0.58, usWeight: 0.60, emeaWeight: 0.20 },
  { name: 'Lazard',          maStrength: 0.85, ecmStrength: 0.30, dcmStrength: 0.25, ipoStrength: 0.35, usWeight: 0.50, emeaWeight: 0.35 },
  { name: 'Evercore',        maStrength: 0.82, ecmStrength: 0.35, dcmStrength: 0.20, ipoStrength: 0.38, usWeight: 0.65, emeaWeight: 0.20 },
  { name: 'Moelis',          maStrength: 0.70, ecmStrength: 0.25, dcmStrength: 0.15, ipoStrength: 0.30, usWeight: 0.60, emeaWeight: 0.25 },
  { name: 'PJT Partners',    maStrength: 0.68, ecmStrength: 0.20, dcmStrength: 0.15, ipoStrength: 0.25, usWeight: 0.65, emeaWeight: 0.20 },
  { name: 'Rothschild',      maStrength: 0.75, ecmStrength: 0.30, dcmStrength: 0.20, ipoStrength: 0.28, usWeight: 0.25, emeaWeight: 0.55 },
  { name: 'Nomura',          maStrength: 0.55, ecmStrength: 0.52, dcmStrength: 0.60, ipoStrength: 0.50, usWeight: 0.15, emeaWeight: 0.20 },
];

// ── Category config ──

interface CategoryConfig {
  id: string;
  name: string;
  strengthKey: keyof BankProfile;
  baseTotalVolume: number;      // $B total market
  baseTotalDeals: number;
  regionFilter?: 'us' | 'emea';
}

const CATEGORIES: CategoryConfig[] = [
  { id: 'global_ma',   name: 'Global M&A Advisory',           strengthKey: 'maStrength',  baseTotalVolume: 3200, baseTotalDeals: 42000 },
  { id: 'global_ecm',  name: 'Global Equity Underwriting (ECM)', strengthKey: 'ecmStrength', baseTotalVolume: 680,  baseTotalDeals: 4800 },
  { id: 'global_dcm',  name: 'Global Debt Underwriting (DCM)',   strengthKey: 'dcmStrength', baseTotalVolume: 7800, baseTotalDeals: 18500 },
  { id: 'global_ipo',  name: 'Global IPO',                    strengthKey: 'ipoStrength', baseTotalVolume: 210,  baseTotalDeals: 1250 },
  { id: 'us_ma',       name: 'US M&A',                        strengthKey: 'maStrength',  baseTotalVolume: 1650, baseTotalDeals: 18000, regionFilter: 'us' },
  { id: 'emea_ma',     name: 'EMEA M&A',                      strengthKey: 'maStrength',  baseTotalVolume: 850,  baseTotalDeals: 11000, regionFilter: 'emea' },
];

// ── Sector definitions ──

const SECTORS = [
  'Technology', 'Healthcare', 'Financial Services', 'Energy', 'Industrials',
  'Consumer', 'Real Estate', 'Telecommunications', 'Materials', 'Utilities',
];

// ── Top deal templates ──

interface DealTemplate {
  acquirer: string;
  target: string;
  baseValue: number;
  advisor: string;
  sector: string;
  status: 'Completed' | 'Pending' | 'Announced';
}

const DEAL_TEMPLATES: DealTemplate[] = [
  { acquirer: 'Broadcom',              target: 'VMware (remaining stake)',    baseValue: 68.0, advisor: 'Goldman Sachs',  sector: 'Technology',          status: 'Completed' },
  { acquirer: 'Capital One',           target: 'Discover Financial',         baseValue: 35.3, advisor: 'JPMorgan',       sector: 'Financial Services',  status: 'Pending' },
  { acquirer: 'ConocoPhillips',        target: 'Marathon Oil',               baseValue: 22.5, advisor: 'Morgan Stanley', sector: 'Energy',              status: 'Completed' },
  { acquirer: 'Synopsys',             target: 'Ansys',                      baseValue: 35.0, advisor: 'Goldman Sachs',  sector: 'Technology',          status: 'Pending' },
  { acquirer: 'Johnson & Johnson',     target: 'Intra-Cellular Therapies',  baseValue: 14.6, advisor: 'JPMorgan',       sector: 'Healthcare',          status: 'Completed' },
  { acquirer: 'Diamondback Energy',    target: 'Endeavor Energy Resources', baseValue: 26.0, advisor: 'Citi',           sector: 'Energy',              status: 'Completed' },
  { acquirer: 'Mars',                  target: 'Kellanova',                 baseValue: 35.9, advisor: 'Morgan Stanley', sector: 'Consumer',            status: 'Completed' },
  { acquirer: 'Nippon Steel',          target: 'US Steel',                  baseValue: 14.9, advisor: 'Lazard',         sector: 'Materials',           status: 'Pending' },
  { acquirer: 'Silver Lake',           target: 'Endeavor Group',            baseValue: 13.0, advisor: 'Evercore',       sector: 'Consumer',            status: 'Completed' },
  { acquirer: 'Juniper Networks',      target: 'HPE Acquisition',           baseValue: 14.0, advisor: 'Barclays',       sector: 'Technology',          status: 'Pending' },
  { acquirer: 'Merck',                 target: 'EyePoint Pharmaceuticals',  baseValue: 12.8, advisor: 'Goldman Sachs',  sector: 'Healthcare',          status: 'Announced' },
  { acquirer: 'Blackstone',            target: 'Tropical Smoothie Cafe',    baseValue: 10.5, advisor: 'Jefferies',      sector: 'Consumer',            status: 'Announced' },
  { acquirer: 'Apollo',                target: 'Arcadium Lithium',          baseValue: 6.7,  advisor: 'UBS',            sector: 'Materials',           status: 'Completed' },
  { acquirer: 'Brookfield',            target: 'Neoen SA',                  baseValue: 8.2,  advisor: 'Rothschild',     sector: 'Utilities',           status: 'Pending' },
  { acquirer: 'IBM',                   target: 'HashiCorp',                 baseValue: 6.4,  advisor: 'Goldman Sachs',  sector: 'Technology',          status: 'Completed' },
];

// ── Data generation ──

function generateData() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const seed = hashSeed('league-tables-' + dateStr);
  const rng = mulberry32(seed);

  // Helper: generate a table for one category
  function generateTable(config: CategoryConfig) {
    const { id, name, strengthKey, baseTotalVolume, baseTotalDeals, regionFilter } = config;
    const catRng = mulberry32(hashSeed(id + dateStr));

    // Perturb total market volume for the day
    const totalVolume = round1(baseTotalVolume * (0.92 + catRng() * 0.16));
    const totalDeals = Math.round(baseTotalDeals * (0.90 + catRng() * 0.20));

    // Score each bank
    const scored = BANK_PROFILES.map(bp => {
      let strength = bp[strengthKey] as number;

      // Apply regional filter weighting
      if (regionFilter === 'us') {
        strength *= bp.usWeight;
      } else if (regionFilter === 'emea') {
        strength *= bp.emeaWeight;
      }

      // Add noise
      const noise = 0.85 + catRng() * 0.30;
      const score = strength * noise;

      return { bank: bp.name, score };
    });

    // Sort and take top 15
    scored.sort((a, b) => b.score - a.score);
    const top15 = scored.slice(0, 15);

    // Distribute volume based on score (Zipf-like)
    const totalScore = top15.reduce((s, e) => s + e.score, 0);
    const topBankShare = totalVolume * 0.65; // top 15 banks cover ~65% of total market

    // Generate previous year ranks (shuffle slightly)
    const prevRanks = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], catRng);

    const entries = top15.map((entry, idx) => {
      const rank = idx + 1;
      const share = entry.score / totalScore;
      const volume = round1(topBankShare * share);
      const marketShare = round1(share * 65); // % of total market
      const dealCount = Math.max(
        Math.round(totalDeals * share * (0.4 + catRng() * 0.3)),
        Math.round(10 + catRng() * 50)
      );
      const avgDealSize = round1((volume * 1000) / Math.max(dealCount, 1)); // in $M
      const prevYearRank = prevRanks[idx];
      const change = prevYearRank - rank; // positive = improved

      // YTD volume: scale by month fraction
      const monthFraction = (today.getMonth() + 1) / 12;
      const ytdVolume = round1(volume * monthFraction * (0.85 + catRng() * 0.30));

      return {
        rank,
        bank: entry.bank,
        dealCount,
        volume,
        marketShare,
        change,
        avgDealSize,
        ytdVolume,
        prevYearRank,
      };
    });

    // Period summary
    const avgDealSize = round1((totalVolume * 1000) / Math.max(totalDeals, 1));
    const yoyChange = round1(-8 + catRng() * 30); // -8% to +22%

    const periodSummary = {
      totalVolume,
      totalDeals,
      avgDealSize,
      yoyChange,
    };

    return { id, name, entries, periodSummary };
  }

  // Generate all category tables
  const tables = CATEGORIES.map(c => generateTable(c));

  // ── Top Deals ──

  const dealRng = mulberry32(hashSeed('deals-' + dateStr));
  const topDeals = DEAL_TEMPLATES.slice(0, 10).map((tpl, i) => {
    const valuePerturbation = 0.95 + dealRng() * 0.10;
    const monthOffset = Math.floor(dealRng() * 12);
    const day = 1 + Math.floor(dealRng() * 28);
    const dealYear = dealRng() > 0.4 ? 2026 : 2025;
    const dealMonth = String(1 + monthOffset % 12).padStart(2, '0');
    const dealDay = String(day).padStart(2, '0');

    return {
      dealName: `${tpl.acquirer} / ${tpl.target}`,
      acquirer: tpl.acquirer,
      target: tpl.target,
      value: round1(tpl.baseValue * valuePerturbation),
      advisor: tpl.advisor,
      sector: tpl.sector,
      date: `${dealYear}-${dealMonth}-${dealDay}`,
      status: tpl.status,
    };
  }).sort((a, b) => b.value - a.value);

  // ── Sector Breakdown ──

  const sectorRng = mulberry32(hashSeed('sectors-' + dateStr));
  const globalMaTable = tables.find(t => t.id === 'global_ma')!;
  const maTotalVol = globalMaTable.periodSummary.totalVolume;
  const maTotalDeals = globalMaTable.periodSummary.totalDeals;

  // Generate raw weights for sectors
  const sectorWeights = SECTORS.map(sector => {
    let baseWeight: number;
    switch (sector) {
      case 'Technology':          baseWeight = 0.22; break;
      case 'Healthcare':          baseWeight = 0.16; break;
      case 'Financial Services':  baseWeight = 0.14; break;
      case 'Energy':              baseWeight = 0.13; break;
      case 'Industrials':         baseWeight = 0.10; break;
      case 'Consumer':            baseWeight = 0.09; break;
      case 'Real Estate':         baseWeight = 0.06; break;
      case 'Telecommunications':  baseWeight = 0.05; break;
      case 'Materials':           baseWeight = 0.03; break;
      case 'Utilities':           baseWeight = 0.02; break;
      default:                    baseWeight = 0.05;
    }
    return { sector, weight: baseWeight * (0.80 + sectorRng() * 0.40) };
  });

  // Normalize weights
  const totalWeight = sectorWeights.reduce((s, e) => s + e.weight, 0);
  const sectorBreakdown = sectorWeights.map(sw => {
    const pctOfTotal = round1((sw.weight / totalWeight) * 100);
    const volume = round1(maTotalVol * (sw.weight / totalWeight));
    const dealCount = Math.round(maTotalDeals * (sw.weight / totalWeight) * (0.85 + sectorRng() * 0.30));
    return {
      sector: sw.sector,
      volume,
      dealCount,
      pctOfTotal,
    };
  }).sort((a, b) => b.volume - a.volume);

  return {
    timestamp: new Date().toISOString(),
    period: `YTD ${today.getFullYear()}`,
    tables,
    topDeals,
    sectorBreakdown,
  };
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const data = generateData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: any) {
    console.error('[LeagueTables] Error generating league table data:', err?.message || err);
    // Return stale cache if available
    if (cache) return res.json(cache.data);
    res.status(503).json({ error: 'League table data temporarily unavailable' });
  }
});

export default router;
