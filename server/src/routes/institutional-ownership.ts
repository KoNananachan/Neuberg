import { Router } from 'express';

const router = Router();

function mulberry32(a: number) { return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}; }
function hashSeed(str: string): number { let hash=0;for(let i=0;i<str.length;i++){const char=str.charCodeAt(i);hash=((hash<<5)-hash)+char;hash|=0;}return Math.abs(hash); }

let cache: { data: any; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

// ── Types ──

interface TopHolder {
  institution: string;
  sharesHeld: number;
  marketValue: number;       // $M
  pctOfPortfolio: number;
  pctSharesOutstanding: number;
  changeShares: number;
  changePct: number;
}

interface OwnershipSummary {
  institutionalOwnershipPct: number;
  totalInstitutions: number;
  newPositions: number;
  increasedPositions: number;
  decreasedPositions: number;
  soldOut: number;
}

interface QuarterlyChange {
  quarter: string;           // e.g. "Q1 2025"
  label: string;             // "Q-4" through "Q0"
  totalInstitutionalShares: number;
  numHolders: number;
  netChange: number;
}

interface TopActivity {
  institution: string;
  ticker: string;
  shares: number;
  value: number;             // $M
}

interface InstitutionalOwnershipResponse {
  topHolders: TopHolder[];
  ownershipSummary: OwnershipSummary;
  quarterlyChanges: QuarterlyChange[];
  topBuys: TopActivity[];
  topSells: TopActivity[];
  generatedAt: string;
}

// ── Institutions ──

const INSTITUTIONS = [
  'Vanguard Group',
  'BlackRock',
  'State Street',
  'Fidelity',
  'Capital Research',
  'T. Rowe Price',
  'Berkshire Hathaway',
  'JP Morgan',
  'Morgan Stanley',
  'Goldman Sachs',
  'Wellington',
  'Geode Capital',
  'Northern Trust',
  'Bank of America',
  'Invesco',
];

// ── Tickers for top buys/sells ──

const TICKERS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
  'JPM', 'V', 'UNH', 'JNJ', 'XOM', 'PG', 'HD', 'MA',
  'BAC', 'PFE', 'ABBV', 'CRM', 'LLY',
];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function getQuarterLabel(offset: number, baseYear: number, baseQ: number): { quarter: string; label: string } {
  let q = baseQ + offset;
  let y = baseYear;
  while (q < 1) { q += 4; y -= 1; }
  while (q > 4) { q -= 4; y += 1; }
  return {
    quarter: `Q${q} ${y}`,
    label: `Q${offset}`,
  };
}

// ── Data Generation ──

function generateData(): InstitutionalOwnershipResponse {
  const dateStr = new Date().toISOString().slice(0, 10);
  const seed = hashSeed('institutional-ownership-' + dateStr);
  const rng = mulberry32(seed);

  // ── Top Holders Table ──
  const topHolders: TopHolder[] = INSTITUTIONS.map((institution, i) => {
    // Mega holders (Vanguard, BlackRock, State Street) get larger allocations
    const isMega = i < 3;
    const isLarge = i >= 3 && i < 7;

    const baseShares = isMega
      ? 150_000_000 + rng() * 200_000_000
      : isLarge
        ? 40_000_000 + rng() * 80_000_000
        : 10_000_000 + rng() * 40_000_000;

    const sharesHeld = Math.round(baseShares);

    // Approximate price per share around $150-250 range for a broad market average
    const impliedPrice = 150 + rng() * 100;
    const marketValue = round2((sharesHeld * impliedPrice) / 1_000_000); // $M

    const pctOfPortfolio = round2(
      isMega ? 2.0 + rng() * 4.0
        : isLarge ? 0.5 + rng() * 2.5
          : 0.1 + rng() * 1.5
    );

    const pctSharesOutstanding = round2(
      isMega ? 5.0 + rng() * 4.0
        : isLarge ? 2.0 + rng() * 3.0
          : 0.5 + rng() * 2.0
    );

    const direction = rng() > 0.5 ? 1 : -1;
    const changeMagnitude = isMega
      ? rng() * 5_000_000
      : isLarge
        ? rng() * 3_000_000
        : rng() * 2_000_000;
    const changeShares = Math.round(direction * changeMagnitude);
    const changePct = sharesHeld > 0 ? round2((changeShares / sharesHeld) * 100) : 0;

    return {
      institution,
      sharesHeld,
      marketValue,
      pctOfPortfolio,
      pctSharesOutstanding,
      changeShares,
      changePct,
    };
  });

  // Sort by pctSharesOutstanding descending
  topHolders.sort((a, b) => b.pctSharesOutstanding - a.pctSharesOutstanding);

  // ── Ownership Summary ──
  const totalPctOutstanding = topHolders.reduce((s, h) => s + h.pctSharesOutstanding, 0);
  // Top holders represent ~60-70% of total institutional ownership
  const institutionalOwnershipPct = round2(Math.min(95, totalPctOutstanding * (1.4 + rng() * 0.4)));
  const totalInstitutions = Math.round(2800 + rng() * 2400);
  const newPositions = Math.round(80 + rng() * 180);
  const increasedPositions = Math.round(400 + rng() * 600);
  const decreasedPositions = Math.round(300 + rng() * 500);
  const soldOut = Math.round(30 + rng() * 90);

  const ownershipSummary: OwnershipSummary = {
    institutionalOwnershipPct,
    totalInstitutions,
    newPositions,
    increasedPositions,
    decreasedPositions,
    soldOut,
  };

  // ── Quarterly Changes (Q-4 through Q0) ──
  const now = new Date();
  const currentQ = Math.ceil((now.getMonth() + 1) / 3);
  const currentYear = now.getFullYear();

  const baseShares = 4_000_000_000 + rng() * 2_000_000_000;
  const baseHolders = 3000 + rng() * 2000;

  const quarterlyChanges: QuarterlyChange[] = [];
  for (let offset = -4; offset <= 0; offset++) {
    const { quarter, label } = getQuarterLabel(offset, currentYear, currentQ);
    const drift = offset * (rng() * 200_000_000 - 80_000_000);
    const totalInstitutionalShares = Math.round(baseShares + drift);
    const holderDrift = offset * Math.round(rng() * 200 - 80);
    const numHolders = Math.round(baseHolders + holderDrift);
    const netChange = offset === -4
      ? 0
      : Math.round((rng() - 0.4) * 300_000_000);

    quarterlyChanges.push({
      quarter,
      label,
      totalInstitutionalShares,
      numHolders,
      netChange,
    });
  }

  // ── Top Buys This Quarter ──
  const usedBuyInst = new Set<string>();
  const topBuys: TopActivity[] = [];
  for (let i = 0; i < 8; i++) {
    let inst: string;
    do {
      inst = INSTITUTIONS[Math.floor(rng() * INSTITUTIONS.length)];
    } while (usedBuyInst.has(inst) && usedBuyInst.size < INSTITUTIONS.length);
    usedBuyInst.add(inst);

    const ticker = TICKERS[Math.floor(rng() * TICKERS.length)];
    const shares = Math.round((500_000 + rng() * 10_000_000) / 1000) * 1000;
    const value = round2((shares * (120 + rng() * 180)) / 1_000_000);

    topBuys.push({ institution: inst, ticker, shares, value });
  }
  topBuys.sort((a, b) => b.value - a.value);

  // ── Top Sells This Quarter ──
  const usedSellInst = new Set<string>();
  const topSells: TopActivity[] = [];
  for (let i = 0; i < 8; i++) {
    let inst: string;
    do {
      inst = INSTITUTIONS[Math.floor(rng() * INSTITUTIONS.length)];
    } while (usedSellInst.has(inst) && usedSellInst.size < INSTITUTIONS.length);
    usedSellInst.add(inst);

    const ticker = TICKERS[Math.floor(rng() * TICKERS.length)];
    const shares = Math.round((500_000 + rng() * 8_000_000) / 1000) * 1000;
    const value = round2((shares * (120 + rng() * 180)) / 1_000_000);

    topSells.push({ institution: inst, ticker, shares, value });
  }
  topSells.sort((a, b) => b.value - a.value);

  return {
    topHolders,
    ownershipSummary,
    quarterlyChanges,
    topBuys,
    topSells,
    generatedAt: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < TTL) {
      return res.json(cache.data);
    }

    const data = generateData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[InstitutionalOwnership] Error:', message);
    if (cache) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to fetch institutional ownership data' });
  }
});

export default router;
