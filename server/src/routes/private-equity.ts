import { Router } from 'express';

const router = Router();

// ── Seeded PRNG ──

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// ── Types ──

interface RecentDeal {
  sponsor: string;
  target: string;
  sector: string;
  dealValue: number;
  evToEbitda: number;
  debtToEbitda: number;
  equityCheck: number;
  status: 'ANNOUNCED' | 'CLOSED' | 'RUMORED';
  date: string;
}

interface Fundraising {
  firm: string;
  fundName: string;
  vintage: number;
  targetSize: number;
  closedSize: number;
  strategy: 'BUYOUT' | 'GROWTH' | 'VENTURE' | 'DISTRESSED' | 'INFRA' | 'SECONDARY';
  closingDate: string;
}

interface DryPowder {
  strategy: string;
  available: number;
  deployed1y: number;
  ratio: number;
}

interface Summary {
  totalDealVolume: number;
  avgMultiple: number;
  dryPowderTotal: number;
  topSector: string;
  fundraisingYtd: number;
  timestamp: string;
}

interface PrivateEquityResponse {
  recentDeals: RecentDeal[];
  fundraising: Fundraising[];
  dryPowder: DryPowder[];
  summary: Summary;
}

// ── Static data pools ──

const SPONSORS = [
  'Blackstone', 'KKR', 'Apollo', 'Carlyle', 'TPG', 'Warburg Pincus',
  'Thoma Bravo', 'Vista Equity', 'Bain Capital', 'EQT', 'Advent', 'Hellman & Friedman',
];

const SECTORS = ['Technology', 'Healthcare', 'Financial Services', 'Consumer', 'Industrials', 'Energy'];

const TARGETS_BY_SECTOR: Record<string, string[]> = {
  Technology: [
    'Informatica Corp.', 'Zendesk Inc.', 'Citrix Systems', 'Anaplan Inc.', 'Sailpoint Technologies',
    'Coupa Software', 'Ping Identity', 'ForgeRock Inc.', 'Avalara Inc.', 'Cornerstone OnDemand',
    'Proofpoint Inc.', 'Cloudera Inc.',
  ],
  Healthcare: [
    'Athenahealth Inc.', 'Change Healthcare', 'Medline Industries', 'Inovalon Holdings',
    'Cotiviti Holdings', 'Press Ganey Associates', 'Solera Health', 'Advarra Inc.',
    'Netsmart Technologies', 'Signify Health', 'Agiliti Inc.', 'Parexel International',
  ],
  'Financial Services': [
    'Dun & Bradstreet', 'Refinitiv Holdings', 'Worldpay Inc.', 'Paysafe Ltd.',
    'Ipreo Holdings', 'Calypso Technology', 'SS&C Technologies', 'Finastra Ltd.',
    'Ceridian HCM', 'Clearwater Analytics', 'Majesco Ltd.', 'Vertafore Inc.',
  ],
  Consumer: [
    'Petco Health & Wellness', 'Refresco Group', 'Burt\'s Bees', 'Varsity Brands',
    'Hilton Foods Group', 'Tropicana Brands', 'Whataburger Inc.', 'Shearer\'s Foods',
    'Hearthside Food Solutions', 'BJ\'s Wholesale Club', 'Panera Bread Co.', 'Hostess Brands',
  ],
  Industrials: [
    'Gates Industrial Corp.', 'Accudyne Industries', 'Roper Technologies', 'Gardner Denver',
    'Cimpress plc', 'StandardAero Inc.', 'Kaman Aerospace', 'Jason Industries',
    'Ply Gem Holdings', 'Quala Inc.', 'Covia Holdings', 'Arcosa Inc.',
  ],
  Energy: [
    'Talen Energy Corp.', 'Enviva Partners', 'Calpine Corp.', 'Chesapeake Utilities',
    'Liqid Energy', 'TerraForm Power', 'Targa Resources', 'Summit Midstream',
    'Crestwood Equity Partners', 'NextEra Energy Partners', 'Archaea Energy', 'Sunnova Energy',
  ],
};

const FUND_TEMPLATES: { firm: string; fundBaseName: string; strategy: Fundraising['strategy'] }[] = [
  { firm: 'Blackstone', fundBaseName: 'Blackstone Capital Partners', strategy: 'BUYOUT' },
  { firm: 'KKR', fundBaseName: 'KKR Americas Fund', strategy: 'BUYOUT' },
  { firm: 'Apollo', fundBaseName: 'Apollo Investment Fund', strategy: 'DISTRESSED' },
  { firm: 'Carlyle', fundBaseName: 'Carlyle Partners', strategy: 'BUYOUT' },
  { firm: 'Thoma Bravo', fundBaseName: 'Thoma Bravo Fund', strategy: 'GROWTH' },
  { firm: 'TPG', fundBaseName: 'TPG Partners', strategy: 'BUYOUT' },
  { firm: 'EQT', fundBaseName: 'EQT Infrastructure', strategy: 'INFRA' },
  { firm: 'Bain Capital', fundBaseName: 'Bain Capital Fund', strategy: 'BUYOUT' },
  { firm: 'Vista Equity', fundBaseName: 'Vista Equity Fund', strategy: 'GROWTH' },
  { firm: 'Warburg Pincus', fundBaseName: 'Warburg Pincus Global Growth', strategy: 'GROWTH' },
  { firm: 'Advent', fundBaseName: 'Advent International GPE', strategy: 'BUYOUT' },
  { firm: 'Hellman & Friedman', fundBaseName: 'Hellman & Friedman Capital Partners', strategy: 'BUYOUT' },
];

const DRY_POWDER_STRATEGIES = [
  'Buyout', 'Growth', 'Venture', 'Distressed', 'Infrastructure', 'Secondaries', 'Real Estate',
];

// ── Helpers ──

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

// ── Generation logic ──

function generateRecentDeals(rng: () => number): RecentDeal[] {
  const deals: RecentDeal[] = [];
  const today = new Date();
  const usedSponsors = new Set<number>();

  for (let i = 0; i < 12; i++) {
    // Ensure each sponsor is used once (12 sponsors, 12 deals)
    let sponsorIdx = Math.floor(rng() * SPONSORS.length);
    while (usedSponsors.has(sponsorIdx)) {
      sponsorIdx = (sponsorIdx + 1) % SPONSORS.length;
    }
    usedSponsors.add(sponsorIdx);
    const sponsor = SPONSORS[sponsorIdx];

    const sector = pick(SECTORS, rng);
    const targets = TARGETS_BY_SECTOR[sector];
    const target = targets[Math.floor(rng() * targets.length)];

    // Deal value: $1.2B - $18.5B (large-cap PE typical range)
    const dealValue = round1(1.2 + rng() * 17.3);

    // EV/EBITDA multiples: 8x - 18x (varies by sector)
    const sectorMultiplePremium = sector === 'Technology' ? 3.0
      : sector === 'Healthcare' ? 2.0
      : sector === 'Consumer' ? 0.5
      : 0;
    const evToEbitda = round1(8.0 + rng() * 7.0 + sectorMultiplePremium);

    // Debt/EBITDA: 4.0x - 7.5x (leveraged buyout typical)
    const debtToEbitda = round1(4.0 + rng() * 3.5);

    // Equity check: typically 30-55% of deal value
    const equityPct = 0.30 + rng() * 0.25;
    const equityCheck = round1(dealValue * equityPct);

    // Status weighted: 50% ANNOUNCED, 35% CLOSED, 15% RUMORED
    const statusRoll = rng();
    const status: RecentDeal['status'] = statusRoll < 0.50 ? 'ANNOUNCED'
      : statusRoll < 0.85 ? 'CLOSED'
      : 'RUMORED';

    // Date within last 45 days
    const daysBack = Math.floor(rng() * 45);
    const dealDate = new Date(today);
    dealDate.setDate(dealDate.getDate() - daysBack);
    const date = formatDate(dealDate);

    deals.push({
      sponsor, target, sector, dealValue, evToEbitda,
      debtToEbitda, equityCheck, status, date,
    });
  }

  // Sort by date descending (most recent first)
  deals.sort((a, b) => b.date.localeCompare(a.date));

  return deals;
}

function generateFundraising(rng: () => number): Fundraising[] {
  const funds: Fundraising[] = [];
  const today = new Date();

  // Pick 8 unique fund templates
  const indices = Array.from({ length: FUND_TEMPLATES.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const selected = indices.slice(0, 8);

  for (const idx of selected) {
    const tmpl = FUND_TEMPLATES[idx];

    // Fund number: Roman numeral suffix (VIII-XIV range)
    const fundNum = 8 + Math.floor(rng() * 7);
    const romanNumerals = ['VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV'];
    const fundName = `${tmpl.fundBaseName} ${romanNumerals[fundNum - 8]}`;

    // Vintage: current year or last year
    const vintage = rng() > 0.4
      ? new Date().getFullYear()
      : new Date().getFullYear() - 1;

    // Target size: $5B - $28B (mega funds)
    const targetSize = round1(5.0 + rng() * 23.0);

    // Closed size: 70-115% of target (some exceed targets)
    const closedPct = 0.70 + rng() * 0.45;
    const closedSize = round1(targetSize * closedPct);

    // Closing date within last 90 days
    const daysBack = Math.floor(rng() * 90);
    const closeDate = new Date(today);
    closeDate.setDate(closeDate.getDate() - daysBack);
    const closingDate = formatDate(closeDate);

    funds.push({
      firm: tmpl.firm,
      fundName,
      vintage,
      targetSize,
      closedSize,
      strategy: tmpl.strategy,
      closingDate,
    });
  }

  // Sort by closing date descending
  funds.sort((a, b) => b.closingDate.localeCompare(a.closingDate));

  return funds;
}

function generateDryPowder(rng: () => number): DryPowder[] {
  return DRY_POWDER_STRATEGIES.map((strategy) => {
    // Available dry powder by strategy (in $B)
    // Buyout has the most, Venture/Secondaries the least
    const baseAvailable = strategy === 'Buyout' ? 320
      : strategy === 'Growth' ? 180
      : strategy === 'Venture' ? 250
      : strategy === 'Distressed' ? 90
      : strategy === 'Infrastructure' ? 150
      : strategy === 'Secondaries' ? 110
      : 130; // Real Estate

    const available = round1(baseAvailable * (0.85 + rng() * 0.30));

    // Deployed in last year: 30-70% of available (deployment pace varies)
    const deployedPct = 0.30 + rng() * 0.40;
    const deployed1y = round1(available * deployedPct);

    // Ratio: available / deployed
    const ratio = round2(available / deployed1y);

    return { strategy, available, deployed1y, ratio };
  });
}

function generateSummary(
  deals: RecentDeal[],
  fundraising: Fundraising[],
  dryPowder: DryPowder[],
  rng: () => number,
): Summary {
  // Total deal volume: sum of all deal values
  const totalDealVolume = round1(deals.reduce((sum, d) => sum + d.dealValue, 0));

  // Average EV/EBITDA multiple across deals
  const avgMultiple = round1(
    deals.reduce((sum, d) => sum + d.evToEbitda, 0) / deals.length
  );

  // Total dry powder in $T
  const dryPowderTotal = round2(
    dryPowder.reduce((sum, dp) => sum + dp.available, 0) / 1000
  );

  // Top sector by deal volume
  const sectorVolume: Record<string, number> = {};
  for (const deal of deals) {
    sectorVolume[deal.sector] = (sectorVolume[deal.sector] || 0) + deal.dealValue;
  }
  const topSector = Object.entries(sectorVolume)
    .sort((a, b) => b[1] - a[1])[0][0];

  // YTD fundraising: sum of closed sizes + additional market estimate
  const closedTotal = fundraising.reduce((sum, f) => sum + f.closedSize, 0);
  const fundraisingYtd = round1(closedTotal + 80 + rng() * 120);

  return {
    totalDealVolume,
    avgMultiple,
    dryPowderTotal,
    topSector,
    fundraisingYtd,
    timestamp: new Date().toISOString(),
  };
}

function buildPrivateEquityData(): PrivateEquityResponse {
  const rng = seededRandom('private-equity');

  const recentDeals = generateRecentDeals(rng);
  const fundraising = generateFundraising(rng);
  const dryPowder = generateDryPowder(rng);
  const summary = generateSummary(recentDeals, fundraising, dryPowder, rng);

  return { recentDeals, fundraising, dryPowder, summary };
}

// ── Cache ──

let cachedData: { data: PrivateEquityResponse; ts: number } | null = null;
let staleData: PrivateEquityResponse | null = null;
const CACHE_TTL = 5 * 60_000; // 5 minutes

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still fresh
    if (cachedData && now - cachedData.ts < CACHE_TTL) {
      res.json(cachedData.data);
      return;
    }

    // Generate fresh data
    const data = buildPrivateEquityData();

    // Update cache
    staleData = cachedData?.data ?? staleData;
    cachedData = { data, ts: now };

    res.json(data);
  } catch (err) {
    console.error('[PrivateEquity] Error:', err instanceof Error ? err.message : err);

    // Stale fallback
    if (staleData) {
      res.json(staleData);
      return;
    }
    if (cachedData) {
      res.json(cachedData.data);
      return;
    }

    res.status(500).json({ error: 'Failed to generate private equity data' });
  }
});

export default router;
