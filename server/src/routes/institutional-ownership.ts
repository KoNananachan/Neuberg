import { Router } from 'express';

const router = Router();

// ── Types ──

interface TopHolder {
  institution: string;
  shares: number;
  value: number;
  pctOfFloat: number;
  changeShares: number;
  changePercent: number;
  quarter: string;
}

interface Concentration {
  top10pct: number;
  top25pct: number;
  herfindahl: number;
}

interface StockOwnership {
  ticker: string;
  name: string;
  institutionalOwnership: number;
  insiderOwnership: number;
  totalInstitutions: number;
  newPositions: number;
  closedPositions: number;
  increasedPositions: number;
  decreasedPositions: number;
  topHolders: TopHolder[];
  concentration: Concentration;
}

interface FlowEntry {
  institution: string;
  ticker: string;
  changeShares: number;
  changeValue: number;
}

interface InstitutionalOwnershipResponse {
  stocks: StockOwnership[];
  mostBought: FlowEntry[];
  mostSold: FlowEntry[];
  generatedAt: string;
}

// ── Seeded PRNG ──

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ── Stock Universe ──

interface StockSeed {
  ticker: string;
  name: string;
  marketCap: number; // in billions
  instOwnershipBase: number; // base institutional ownership %
  insiderOwnershipBase: number;
  totalInstitutionsBase: number;
}

const STOCK_SEEDS: StockSeed[] = [
  { ticker: 'AAPL', name: 'Apple Inc.', marketCap: 3200, instOwnershipBase: 74.2, insiderOwnershipBase: 0.07, totalInstitutionsBase: 5400 },
  { ticker: 'MSFT', name: 'Microsoft Corp.', marketCap: 3100, instOwnershipBase: 72.8, insiderOwnershipBase: 1.38, totalInstitutionsBase: 5200 },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', marketCap: 2100, instOwnershipBase: 65.4, insiderOwnershipBase: 5.84, totalInstitutionsBase: 4100 },
  { ticker: 'AMZN', name: 'Amazon.com Inc.', marketCap: 2000, instOwnershipBase: 63.1, insiderOwnershipBase: 9.52, totalInstitutionsBase: 4600 },
  { ticker: 'NVDA', name: 'NVIDIA Corp.', marketCap: 2800, instOwnershipBase: 68.5, insiderOwnershipBase: 3.92, totalInstitutionsBase: 4800 },
  { ticker: 'META', name: 'Meta Platforms Inc.', marketCap: 1500, instOwnershipBase: 77.3, insiderOwnershipBase: 13.12, totalInstitutionsBase: 3900 },
  { ticker: 'TSLA', name: 'Tesla Inc.', marketCap: 800, instOwnershipBase: 66.2, insiderOwnershipBase: 12.88, totalInstitutionsBase: 3500 },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', marketCap: 600, instOwnershipBase: 73.6, insiderOwnershipBase: 0.62, totalInstitutionsBase: 3800 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', marketCap: 380, instOwnershipBase: 71.4, insiderOwnershipBase: 0.18, totalInstitutionsBase: 3400 },
  { ticker: 'V', name: 'Visa Inc.', marketCap: 560, instOwnershipBase: 80.1, insiderOwnershipBase: 0.21, totalInstitutionsBase: 3700 },
  { ticker: 'UNH', name: 'UnitedHealth Group', marketCap: 470, instOwnershipBase: 86.2, insiderOwnershipBase: 0.31, totalInstitutionsBase: 3100 },
  { ticker: 'XOM', name: 'Exxon Mobil Corp.', marketCap: 510, instOwnershipBase: 62.8, insiderOwnershipBase: 0.05, totalInstitutionsBase: 3600 },
  { ticker: 'PG', name: 'Procter & Gamble', marketCap: 370, instOwnershipBase: 69.5, insiderOwnershipBase: 0.08, totalInstitutionsBase: 3300 },
  { ticker: 'HD', name: 'The Home Depot', marketCap: 350, instOwnershipBase: 71.8, insiderOwnershipBase: 0.29, totalInstitutionsBase: 3200 },
  { ticker: 'MA', name: 'Mastercard Inc.', marketCap: 420, instOwnershipBase: 79.4, insiderOwnershipBase: 0.11, totalInstitutionsBase: 3500 },
];

// ── Institution Templates ──

interface InstitutionTemplate {
  name: string;
  sizeTier: 'mega' | 'large' | 'mid'; // determines typical holding size
  style: 'passive' | 'active'; // passive = larger, more stable
}

const INSTITUTION_TEMPLATES: InstitutionTemplate[] = [
  { name: 'The Vanguard Group', sizeTier: 'mega', style: 'passive' },
  { name: 'BlackRock Inc.', sizeTier: 'mega', style: 'passive' },
  { name: 'State Street Corp.', sizeTier: 'large', style: 'passive' },
  { name: 'Fidelity Management & Research', sizeTier: 'large', style: 'active' },
  { name: 'Capital Research Global Investors', sizeTier: 'large', style: 'active' },
  { name: 'T. Rowe Price Associates', sizeTier: 'mid', style: 'active' },
  { name: 'Berkshire Hathaway Inc.', sizeTier: 'large', style: 'active' },
  { name: 'JP Morgan Investment Management', sizeTier: 'mid', style: 'active' },
  { name: 'Geode Capital Management', sizeTier: 'mid', style: 'passive' },
  { name: 'Northern Trust Corp.', sizeTier: 'mid', style: 'passive' },
  { name: 'Morgan Stanley Investment', sizeTier: 'mid', style: 'active' },
  { name: 'Wellington Management Group', sizeTier: 'mid', style: 'active' },
  { name: 'Bank of America Corp.', sizeTier: 'mid', style: 'active' },
  { name: 'Goldman Sachs Group', sizeTier: 'mid', style: 'active' },
  { name: 'Charles Schwab Investment', sizeTier: 'mid', style: 'passive' },
];

// ── Helpers ──

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function getCurrentQuarter(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()}`;
}

function getPreviousQuarter(): string {
  const now = new Date();
  const month = now.getMonth(); // 0-based
  let q = Math.ceil((month + 1) / 3) - 1;
  let year = now.getFullYear();
  if (q <= 0) {
    q = 4;
    year -= 1;
  }
  return `Q${q} ${year}`;
}

function buildStockOwnership(seed: StockSeed, rand: () => number): StockOwnership {
  const quarter = getPreviousQuarter();

  // Jitter base ownership
  const instOwnership = roundTo(
    seed.instOwnershipBase + (rand() - 0.5) * 4,
    1,
  );
  const insiderOwnership = roundTo(
    seed.insiderOwnershipBase + (rand() - 0.3) * seed.insiderOwnershipBase * 0.1,
    2,
  );
  const totalInstitutions = Math.round(
    seed.totalInstitutionsBase + (rand() - 0.5) * 400,
  );

  // Activity counts
  const newPositions = Math.round(80 + rand() * 200);
  const closedPositions = Math.round(40 + rand() * 120);
  const increasedPositions = Math.round(300 + rand() * 800);
  const decreasedPositions = Math.round(250 + rand() * 700);

  // Build top holders
  const holders: TopHolder[] = [];
  const totalSharesApprox = (seed.marketCap * 1e9) / (100 + rand() * 200); // rough share price

  // Determine base allocation percentages for each institution tier
  const picked = new Set<number>();
  for (let i = 0; i < 10; i++) {
    // Prefer top institutions first
    let idx: number;
    if (i < 3) {
      // Always pick from mega/large first
      idx = i;
    } else {
      do {
        idx = 3 + Math.floor(rand() * (INSTITUTION_TEMPLATES.length - 3));
      } while (picked.has(idx));
    }
    picked.add(idx);

    const inst = INSTITUTION_TEMPLATES[idx];
    let basePct: number;
    switch (inst.sizeTier) {
      case 'mega':
        basePct = 5.0 + rand() * 4.0; // 5-9%
        break;
      case 'large':
        basePct = 2.0 + rand() * 3.0; // 2-5%
        break;
      case 'mid':
        basePct = 0.5 + rand() * 2.0; // 0.5-2.5%
        break;
    }

    // Passive funds tend to have more stable (smaller) changes
    const changeDirection = rand() > 0.5 ? 1 : -1;
    const changeMagnitude = inst.style === 'passive'
      ? rand() * 3  // 0-3% change for passive
      : rand() * 12; // 0-12% change for active

    const pctOfFloat = roundTo(basePct, 2);
    const shares = Math.round(totalSharesApprox * (pctOfFloat / 100));
    const pricePerShare = (seed.marketCap * 1e9) / totalSharesApprox;
    const value = Math.round(shares * pricePerShare);
    const changePercent = roundTo(changeDirection * changeMagnitude, 2);
    const changeShares = Math.round(shares * (changePercent / 100));

    holders.push({
      institution: inst.name,
      shares,
      value,
      pctOfFloat,
      changeShares,
      changePercent,
      quarter,
    });
  }

  // Sort by pctOfFloat descending
  holders.sort((a, b) => b.pctOfFloat - a.pctOfFloat);

  // Concentration metrics
  const sortedPcts = holders.map(h => h.pctOfFloat).sort((a, b) => b - a);
  const top10pct = roundTo(
    sortedPcts.reduce((sum, p) => sum + p, 0),
    2,
  );
  // Estimate top 25 holders (extrapolate from top 10)
  const top25pct = roundTo(
    Math.min(top10pct + 8 + rand() * 6, instOwnership * 0.95),
    2,
  );
  // Herfindahl index (sum of squared market shares) - lower = more diversified
  const herfindahl = roundTo(
    sortedPcts.reduce((sum, p) => sum + (p / 100) ** 2, 0) * 10000,
    1,
  );

  return {
    ticker: seed.ticker,
    name: seed.name,
    institutionalOwnership: instOwnership,
    insiderOwnership,
    totalInstitutions,
    newPositions,
    closedPositions,
    increasedPositions,
    decreasedPositions,
    topHolders: holders,
    concentration: { top10pct, top25pct, herfindahl },
  };
}

function buildFlowLists(
  stocks: StockOwnership[],
  rand: () => number,
): { mostBought: FlowEntry[]; mostSold: FlowEntry[] } {
  const allBuys: FlowEntry[] = [];
  const allSells: FlowEntry[] = [];

  for (const stock of stocks) {
    for (const holder of stock.topHolders) {
      if (holder.changeShares > 0) {
        allBuys.push({
          institution: holder.institution,
          ticker: stock.ticker,
          changeShares: holder.changeShares,
          changeValue: Math.round(holder.changeShares * (holder.value / holder.shares)),
        });
      } else if (holder.changeShares < 0) {
        allSells.push({
          institution: holder.institution,
          ticker: stock.ticker,
          changeShares: holder.changeShares,
          changeValue: Math.round(holder.changeShares * (holder.value / holder.shares)),
        });
      }
    }
  }

  // Sort buys by value descending, sells by value ascending (most negative)
  allBuys.sort((a, b) => b.changeValue - a.changeValue);
  allSells.sort((a, b) => a.changeValue - b.changeValue);

  // Deduplicate by institution (keep largest move per institution)
  const seenBuy = new Set<string>();
  const uniqueBuys: FlowEntry[] = [];
  for (const entry of allBuys) {
    const key = entry.institution;
    if (!seenBuy.has(key) && uniqueBuys.length < 10) {
      seenBuy.add(key);
      uniqueBuys.push(entry);
    }
  }

  const seenSell = new Set<string>();
  const uniqueSells: FlowEntry[] = [];
  for (const entry of allSells) {
    const key = entry.institution;
    if (!seenSell.has(key) && uniqueSells.length < 10) {
      seenSell.add(key);
      uniqueSells.push(entry);
    }
  }

  return { mostBought: uniqueBuys, mostSold: uniqueSells };
}

// ── Cache ──

let cache: { data: InstitutionalOwnershipResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    // Seed based on current date for deterministic daily data
    const dateStr = new Date().toISOString().split('T')[0];
    const seed = hashSeed('institutional-ownership-' + dateStr);
    const rand = seededRandom(seed);

    const stocks = STOCK_SEEDS.map((s) => buildStockOwnership(s, rand));
    const { mostBought, mostSold } = buildFlowLists(stocks, rand);

    const result: InstitutionalOwnershipResponse = {
      stocks,
      mostBought,
      mostSold,
      generatedAt: new Date().toISOString(),
    };

    cache = { data: result, expiresAt: now + CACHE_TTL };
    res.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InstitutionalOwnership] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch institutional ownership data' });
  }
});

export default router;
