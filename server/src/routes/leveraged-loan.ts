import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// ── Types ──

interface LoanIndex {
  lstaReturn1D: number;
  return1W: number;
  return1M: number;
  returnYTD: number;
  yield: number;
  spread: number;
  avgPrice: number;
  duration: number;
  defaultRate12M: number;
}

interface NewIssuanceDeal {
  borrower: string;
  size: number;
  spread: number;
  floor: number;
  tenor: string;
  rating: string;
  purpose: 'LBO' | 'refinancing' | 'M&A' | 'dividend recap';
  flexDirection: 'tighter' | 'wider' | 'none';
  clearingPrice: number;
}

interface PipelineDeal {
  borrower: string;
  expectedSize: number;
  indicatedSpread: number;
  rating: string;
  expectedDate: string;
  leadArrangers: string[];
}

interface SecondaryMarket {
  avgBid: number;
  avgAsk: number;
  bidAskSpread: number;
  distressedCount: number;
  parPlusCount: number;
  totalVolume1W: number;
}

interface CLOMarket {
  newCLOIssuance1M: number;
  cloAAASpread: number;
  cloEquityReturn: number;
  totalCLOAUM: number;
  reinvestmentPeriodEnd: string;
}

interface LoanPerformer {
  borrower: string;
  ticker: string;
  price: number;
  change1W: number;
  yield: number;
  spread: number;
  rating: string;
}

interface SectorExposure {
  sector: string;
  weight: number;
  avgSpread: number;
  avgPrice: number;
  defaultRate: number;
}

interface MarketSummary {
  totalMarketSize: number;
  ytdIssuance: number;
  avgNewDealSpread: number;
  refinancingWall: number;
  defaultForecast: number;
}

interface LeveragedLoanData {
  loanIndex: LoanIndex;
  newIssuance: NewIssuanceDeal[];
  pipelineDeals: PipelineDeal[];
  secondaryMarket: SecondaryMarket;
  cloMarket: CLOMarket;
  topPerformers: LoanPerformer[];
  bottomPerformers: LoanPerformer[];
  sectorExposure: SectorExposure[];
  summary: MarketSummary;
  generatedAt: string;
}

let cache: { data: LeveragedLoanData; ts: number } | null = null;

// ── Static Data ──

const BORROWER_NAMES = [
  'Medline Industries', 'Asurion LLC', 'TransDigm Group', 'Citrix Systems', 'Finastra',
  'Epicor Software', 'PetSmart', 'McAfee Corp', 'Athenahealth', 'Bausch Health',
  'Carnival Corp', 'UKG Inc', 'Dun & Bradstreet', 'Avolon Holdings', 'Weber-Stephen',
  'Intelsat', 'Caesars Entertainment', 'Envision Healthcare', 'SS&C Technologies', 'Veritas Technologies',
  'Solera Holdings', 'Herbalife', 'Vericast Corp', 'Mavis Tire', 'Peraton',
  'Brightspeed', 'Lumen Technologies', 'Altice USA', 'Frontier Communications', 'EG Group',
];

const TICKERS = [
  'MDLN', 'ASUR', 'TDG', 'CTXS', 'FINA', 'EPIC', 'PETM', 'MCFE', 'ATHN', 'BHC',
  'CCL', 'UKG', 'DNB', 'AVOL', 'WEBR', 'INTE', 'CZR', 'EVHC', 'SSNC', 'VRTS',
  'SOLR', 'HLF', 'VERC', 'MAVS', 'PERA', 'BRSP', 'LUMN', 'ATUS', 'FYBR', 'EGGR',
];

const RATINGS = ['BB', 'BB-', 'B+', 'B', 'B-', 'CCC+'];
const PURPOSES: NewIssuanceDeal['purpose'][] = ['LBO', 'refinancing', 'M&A', 'dividend recap'];
const FLEX_DIRS: NewIssuanceDeal['flexDirection'][] = ['tighter', 'wider', 'none'];

const ARRANGERS = [
  'JPMorgan', 'Goldman Sachs', 'Morgan Stanley', 'Bank of America', 'Citi',
  'Barclays', 'Deutsche Bank', 'Credit Suisse', 'Wells Fargo', 'RBC Capital',
  'Jefferies', 'BMO Capital', 'HSBC', 'UBS', 'BNP Paribas',
];

const SECTORS = [
  'Technology', 'Healthcare', 'Consumer Products', 'Industrials', 'Telecommunications',
  'Energy', 'Financial Services', 'Media & Entertainment', 'Retail', 'Transportation',
];

// ── Generator ──

function generate(): LeveragedLoanData {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-leveraged-loan-monitor'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;
  const round0 = (v: number) => Math.round(v);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

  // 1. Loan Index
  const loanIndex: LoanIndex = {
    lstaReturn1D: round2((rng() - 0.45) * 0.12),
    return1W: round2((rng() - 0.4) * 0.35),
    return1M: round2((rng() - 0.35) * 1.2),
    returnYTD: round2(jitter(3.8, 0.15)),
    yield: round2(jitter(8.45, 0.04)),
    spread: round0(jitter(420, 0.06)),
    avgPrice: round2(jitter(97.2, 0.012)),
    duration: round2(jitter(0.45, 0.08)),
    defaultRate12M: round2(jitter(2.4, 0.12)),
  };

  // 2. New Issuance — 12 recent deals
  const usedBorrowers = new Set<number>();
  const pickUniqueBorrower = (): number => {
    let idx: number;
    do { idx = Math.floor(rng() * BORROWER_NAMES.length); } while (usedBorrowers.has(idx));
    usedBorrowers.add(idx);
    return idx;
  };

  const newIssuance: NewIssuanceDeal[] = Array.from({ length: 12 }, () => {
    const idx = pickUniqueBorrower();
    const spread = round0(350 + rng() * 150);
    const floor = round2(0.5 + rng() * 0.75);
    const tenorYears = 5 + Math.floor(rng() * 3);
    const purpose = pick(PURPOSES);
    const flexDir = pick(FLEX_DIRS);
    const clearingPrice = round2(jitter(99.0, 0.015));
    return {
      borrower: BORROWER_NAMES[idx],
      size: round0(200 + rng() * 3800),
      spread,
      floor,
      tenor: `${tenorYears}Y`,
      rating: pick(RATINGS),
      purpose,
      flexDirection: flexDir,
      clearingPrice,
    };
  });

  // 3. Pipeline Deals — 8 upcoming
  const pipelineDeals: PipelineDeal[] = Array.from({ length: 8 }, () => {
    const idx = pickUniqueBorrower();
    const numArrangers = 2 + Math.floor(rng() * 3);
    const arrangerSet = new Set<string>();
    while (arrangerSet.size < numArrangers) { arrangerSet.add(pick(ARRANGERS)); }
    const daysOut = 3 + Math.floor(rng() * 25);
    const expectedDate = new Date(Date.now() + daysOut * 86400000).toISOString().slice(0, 10);
    return {
      borrower: BORROWER_NAMES[idx],
      expectedSize: round0(300 + rng() * 4000),
      indicatedSpread: round0(350 + rng() * 150),
      rating: pick(RATINGS),
      expectedDate,
      leadArrangers: [...arrangerSet],
    };
  });

  // 4. Secondary Market
  const avgBid = round2(jitter(96.8, 0.01));
  const avgAsk = round2(avgBid + 0.15 + rng() * 0.25);
  const secondaryMarket: SecondaryMarket = {
    avgBid,
    avgAsk,
    bidAskSpread: round2(avgAsk - avgBid),
    distressedCount: round0(jitter(42, 0.15)),
    parPlusCount: round0(jitter(185, 0.08)),
    totalVolume1W: round1(jitter(12.5, 0.10)),
  };

  // 5. CLO Market
  const cloMarket: CLOMarket = {
    newCLOIssuance1M: round1(jitter(14.8, 0.10)),
    cloAAASpread: round0(jitter(145, 0.06)),
    cloEquityReturn: round2(jitter(14.5, 0.08)),
    totalCLOAUM: round2(jitter(1.05, 0.04)),
    reinvestmentPeriodEnd: `${2026 + Math.floor(rng() * 3)}-Q${1 + Math.floor(rng() * 4)}`,
  };

  // 6 & 7. Top and Bottom Performers
  const buildPerformers = (direction: 'top' | 'bottom'): LoanPerformer[] => {
    return Array.from({ length: 10 }, (_, i) => {
      const baseIdx = direction === 'top' ? i : i + 10;
      const idx = baseIdx % BORROWER_NAMES.length;
      const basePrice = direction === 'top'
        ? 98 + rng() * 3.5
        : 72 + rng() * 20;
      const price = round2(basePrice);
      const change1W = direction === 'top'
        ? round2(0.2 + rng() * 2.5)
        : round2(-3.0 + rng() * 1.5);
      const spread = direction === 'top'
        ? round0(250 + rng() * 150)
        : round0(500 + rng() * 400);
      const yieldVal = round2(5.33 + spread / 100);
      return {
        borrower: BORROWER_NAMES[idx],
        ticker: TICKERS[idx],
        price,
        change1W,
        yield: yieldVal,
        spread,
        rating: pick(RATINGS),
      };
    });
  };

  const topPerformers = buildPerformers('top');
  const bottomPerformers = buildPerformers('bottom');

  // 8. Sector Exposure — 10 sectors
  let remainingWeight = 100;
  const sectorExposure: SectorExposure[] = SECTORS.map((sector, i) => {
    const isLast = i === SECTORS.length - 1;
    const rawWeight = isLast ? remainingWeight : round1(jitter(10, 0.25));
    const weight = isLast ? round1(remainingWeight) : Math.min(rawWeight, remainingWeight - (SECTORS.length - i - 1) * 2);
    remainingWeight -= weight;
    return {
      sector,
      weight: round1(weight),
      avgSpread: round0(jitter(400, 0.12)),
      avgPrice: round2(jitter(96.5, 0.02)),
      defaultRate: round2(jitter(2.2, 0.25)),
    };
  });

  // 9. Summary
  const avgNewDealSpread = round0(
    newIssuance.reduce((sum, d) => sum + d.spread, 0) / newIssuance.length
  );
  const summary: MarketSummary = {
    totalMarketSize: round2(jitter(1.42, 0.03)),
    ytdIssuance: round1(jitter(285, 0.08)),
    avgNewDealSpread,
    refinancingWall: round1(jitter(320, 0.10)),
    defaultForecast: round2(jitter(2.6, 0.12)),
  };

  return {
    loanIndex,
    newIssuance,
    pipelineDeals,
    secondaryMarket,
    cloMarket,
    topPerformers,
    bottomPerformers,
    sectorExposure,
    summary,
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
    console.error('[LeveragedLoan] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate leveraged loan monitor data' });
  }
});

export default router;
