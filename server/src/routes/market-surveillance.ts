import { Router } from 'express';

const router = Router();

function hashSeed(str: string): number { let h = 0; for (let i = 0; i < str.length; i++) { h = (Math.imul(31, h) + str.charCodeAt(i)) | 0; } return h >>> 0; }
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function seededRandom(tag: string) { const d = new Date().toISOString().slice(0, 10); return mulberry32(hashSeed(tag + d)); }

// --- Types ---

interface AlertSummary {
  totalToday: number;
  bySeverity: { critical: number; high: number; medium: number; low: number };
  byType: Record<string, number>;
  open: number;
  resolved: number;
}

interface RecentAlert {
  id: string;
  timestamp: string;
  ticker: string;
  alertType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  patternDetails: Record<string, number | string>;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  assignedAnalyst: string;
}

interface UnusualActivity {
  ticker: string;
  volumeVs20DAvg: number;
  priceChangePct: number;
  optionsVolumeSpikesPct: number;
  newsFlag: boolean;
  upcomingEventsFlag: boolean;
}

interface CircuitBreakerStatus {
  index: string;
  level1Threshold: number;
  level2Threshold: number;
  level3Threshold: number;
  currentDistancePct: number;
  lastTriggerDate: string;
}

interface CrossMarketAlert {
  id: string;
  pattern: string;
  description: string;
  markets: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  detectedAt: string;
}

interface ComplianceMetrics {
  month: string;
  totalAlertsGenerated: number;
  falsePositiveRate: number;
  avgResolutionTimeHours: number;
  escalationRate: number;
}

// --- Static Data ---

const ALERT_TYPES = [
  'spoofing',
  'layering',
  'wash trading',
  'insider trading',
  'front running',
  'momentum ignition',
  'marking close',
] as const;

const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
const STATUSES = ['open', 'investigating', 'resolved', 'dismissed'] as const;

const TICKERS = [
  'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM',
  'BAC', 'GS', 'MS', 'C', 'AMD', 'INTC', 'CRM', 'NFLX',
  'XOM', 'CVX', 'PFE', 'UNH', 'V', 'MA', 'DIS', 'COIN',
];

const ANALYSTS = [
  'M. Chen', 'S. Patel', 'J. Rodriguez', 'A. Kim', 'R. Thompson',
  'L. Nakamura', 'D. Williams', 'K. Okafor', 'E. Lindgren', 'P. Gupta',
];

const CROSS_MARKET_PATTERNS = [
  { pattern: 'Options-Equity Front Running', description: 'Unusual call options volume detected 2-3 days before M&A announcement in {ticker}. Options volume surged {mult}x normal with concentrated OTM strikes.' },
  { pattern: 'ADR/Local Share Divergence', description: 'Significant price divergence detected between {ticker} ADR and local shares. Spread widened to {spread}bps, exceeding 3-sigma threshold.' },
  { pattern: 'Cross-Venue Layering', description: 'Coordinated layering detected across {count} venues for {ticker}. Spoofed orders placed on dark pools while executing on lit exchanges.' },
  { pattern: 'CDS-Equity Signal', description: 'CDS spreads for {ticker} widened {bps}bps while equity showed no reaction. Historical pattern precedes credit events by 5-10 days.' },
  { pattern: 'Correlated Insider Activity', description: 'Clustered insider selling detected across {count} executives at {ticker} and related supply chain companies within 48-hour window.' },
];

const DESCRIPTION_TEMPLATES: Record<string, string[]> = {
  'spoofing': [
    'Large bid orders placed and canceled within 200ms on {ticker}. {count} instances detected in 30-min window.',
    'Repeated pattern of {count} phantom orders on {ticker} bid side, each canceled before execution. Avg size {size} shares.',
  ],
  'layering': [
    'Multiple price levels stacked with orders on {ticker} ask side. {count} layers detected, all pulled simultaneously.',
    'Systematic layering on {ticker} with {count} resting orders creating false depth. Orders withdrawn within 500ms of price approach.',
  ],
  'wash trading': [
    'Matched trades detected on {ticker} between accounts with common beneficial ownership. {count} trades totaling {volume} shares.',
    'Circular trading pattern identified on {ticker}. Same {count} accounts rotating positions with zero net change.',
  ],
  'insider trading': [
    'Abnormal position buildup in {ticker} options ahead of material announcement. Volume {mult}x average with directional bias.',
    'Concentrated buying in {ticker} from flagged accounts 48 hours before earnings surprise. {count} accounts, {volume} shares total.',
  ],
  'front running': [
    'Client order information potentially leaked for {ticker}. Block order of {volume} shares preceded by smaller directional trades.',
    'Pattern consistent with front running detected on {ticker}. {count} pre-positioned trades ahead of institutional block.',
  ],
  'momentum ignition': [
    'Aggressive {ticker} buying triggered stop-loss cascade. Initiating account reversed position within {time} minutes.',
    'Rapid-fire orders on {ticker} designed to trigger algorithmic momentum signals. {count} orders in {time}-second burst.',
  ],
  'marking close': [
    'Concentrated trading in {ticker} in final 30 seconds pushed close price up {bps}bps. Volume {mult}x normal close auction.',
    'Aggressive buying in {ticker} at market close. {count} orders submitted in last 15 seconds, {pct}% of close auction volume.',
  ],
};

// --- Cache ---

const CACHE_TTL = 12 * 60 * 60 * 1000;
let cache: { data: unknown; ts: number } | null = null;

// --- Generator ---

function generate() {
  const rng = seededRandom('market-surveillance');
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const jitter = (base: number, pct: number) => Math.max(0, base * (1 + (rng() - 0.5) * 2 * pct));
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // --- 1. Alert Summary ---
  const totalToday = Math.round(jitter(87, 0.2));
  const criticalCount = Math.round(jitter(4, 0.4));
  const highCount = Math.round(jitter(18, 0.25));
  const mediumCount = Math.round(jitter(35, 0.2));
  const lowCount = Math.max(0, totalToday - criticalCount - highCount - mediumCount);

  const byType: Record<string, number> = {};
  let typeTotal = 0;
  for (const t of ALERT_TYPES) {
    const base = t === 'spoofing' ? 18 : t === 'layering' ? 14 : t === 'wash trading' ? 12 :
      t === 'insider trading' ? 8 : t === 'front running' ? 10 : t === 'momentum ignition' ? 13 : 12;
    const count = Math.round(jitter(base, 0.3));
    byType[t] = count;
    typeTotal += count;
  }
  // Normalize to totalToday
  const typeScale = totalToday / Math.max(1, typeTotal);
  for (const t of ALERT_TYPES) {
    byType[t] = Math.round(byType[t] * typeScale);
  }

  const resolvedCount = Math.round(totalToday * (0.35 + rng() * 0.15));
  const openCount = totalToday - resolvedCount;

  const alertSummary: AlertSummary = {
    totalToday,
    bySeverity: { critical: criticalCount, high: highCount, medium: mediumCount, low: lowCount },
    byType,
    open: openCount,
    resolved: resolvedCount,
  };

  // --- 2. Recent Alerts ---
  const recentAlerts: RecentAlert[] = [];
  for (let i = 0; i < 15; i++) {
    const alertType = pick(ALERT_TYPES);
    const severity = pick(SEVERITIES);
    const ticker = pick(TICKERS);
    const status = pick(STATUSES);
    const analyst = pick(ANALYSTS);

    // Generate timestamp within today
    const hour = Math.floor(9 + rng() * 7.5);
    const minute = Math.floor(rng() * 60);
    const second = Math.floor(rng() * 60);
    const timestamp = `${todayStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`;

    // Build description from template
    const templates = DESCRIPTION_TEMPLATES[alertType];
    const template = templates[Math.floor(rng() * templates.length)];
    const orderCount = Math.round(jitter(25, 0.5));
    const volume = Math.round(jitter(150000, 0.4));
    const mult = Math.round(jitter(4.5, 0.3) * 10) / 10;
    const size = Math.round(jitter(5000, 0.4));
    const time = Math.round(jitter(8, 0.5));
    const bps = Math.round(jitter(35, 0.4));
    const pct = Math.round(jitter(42, 0.3));
    const description = template
      .replace('{ticker}', ticker)
      .replace('{count}', String(orderCount))
      .replace('{volume}', volume.toLocaleString('en-US'))
      .replace('{mult}', String(mult))
      .replace('{size}', size.toLocaleString('en-US'))
      .replace('{time}', String(time))
      .replace('{bps}', String(bps))
      .replace('{pct}', String(pct));

    // Pattern details
    const patternDetails: Record<string, number | string> = {
      orderCount,
      volumeAnomalyPct: Math.round(jitter(185, 0.4)),
      timeWindowMs: Math.round(jitter(500, 0.5)),
      confidenceScore: Math.round(jitter(82, 0.15)),
    };

    if (alertType === 'spoofing' || alertType === 'layering') {
      patternDetails.cancelRate = Math.round(jitter(94, 0.05));
      patternDetails.avgLifetimeMs = Math.round(jitter(180, 0.4));
    }
    if (alertType === 'wash trading') {
      patternDetails.matchedAccountPairs = Math.round(jitter(3, 0.5));
      patternDetails.netPositionChange = 0;
    }
    if (alertType === 'insider trading') {
      patternDetails.daysBeforeEvent = Math.round(1 + rng() * 4);
      patternDetails.abnormalReturnPct = Math.round(jitter(8.5, 0.4) * 10) / 10;
    }

    recentAlerts.push({
      id: `SRV-${todayStr.replace(/-/g, '')}-${String(i + 1).padStart(4, '0')}`,
      timestamp,
      ticker,
      alertType,
      severity,
      description,
      patternDetails,
      status,
      assignedAnalyst: analyst,
    });
  }

  // Sort by timestamp descending
  recentAlerts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // --- 3. Unusual Volume/Price Activity ---
  const unusualActivity: UnusualActivity[] = [];
  const usedTickers = new Set<string>();
  for (let i = 0; i < 10; i++) {
    let ticker: string;
    do {
      ticker = pick(TICKERS);
    } while (usedTickers.has(ticker));
    usedTickers.add(ticker);

    unusualActivity.push({
      ticker,
      volumeVs20DAvg: Math.round(jitter(3.2, 0.5) * 10) / 10,
      priceChangePct: Math.round((rng() - 0.35) * 12 * 100) / 100,
      optionsVolumeSpikesPct: Math.round(jitter(280, 0.5)),
      newsFlag: rng() > 0.55,
      upcomingEventsFlag: rng() > 0.6,
    });
  }

  // Sort by volume multiple descending
  unusualActivity.sort((a, b) => b.volumeVs20DAvg - a.volumeVs20DAvg);

  // --- 4. Circuit Breaker Status ---
  const circuitBreakers: CircuitBreakerStatus[] = [
    {
      index: 'SPX',
      level1Threshold: 7,
      level2Threshold: 13,
      level3Threshold: 20,
      currentDistancePct: Math.round(jitter(6.2, 0.3) * 100) / 100,
      lastTriggerDate: '2020-03-16',
    },
    {
      index: 'NDX',
      level1Threshold: 7,
      level2Threshold: 13,
      level3Threshold: 20,
      currentDistancePct: Math.round(jitter(5.8, 0.3) * 100) / 100,
      lastTriggerDate: '2020-03-16',
    },
    {
      index: 'DJIA',
      level1Threshold: 7,
      level2Threshold: 13,
      level3Threshold: 20,
      currentDistancePct: Math.round(jitter(6.5, 0.3) * 100) / 100,
      lastTriggerDate: '2020-03-16',
    },
  ];

  // --- 5. Cross-Market Surveillance ---
  const crossMarketAlerts: CrossMarketAlert[] = [];
  for (let i = 0; i < 5; i++) {
    const p = CROSS_MARKET_PATTERNS[i];
    const ticker = pick(TICKERS);
    const mult = Math.round(jitter(6.5, 0.4) * 10) / 10;
    const spread = Math.round(jitter(45, 0.4));
    const count = Math.round(jitter(4, 0.4));
    const bps = Math.round(jitter(55, 0.3));

    const desc = p.description
      .replace('{ticker}', ticker)
      .replace('{mult}', String(mult))
      .replace('{spread}', String(spread))
      .replace('{count}', String(count))
      .replace('{bps}', String(bps));

    const hour = Math.floor(9 + rng() * 7);
    const minute = Math.floor(rng() * 60);
    const detectedAt = `${todayStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;

    const marketOptions = ['NYSE', 'NASDAQ', 'CBOE', 'CME', 'LSE', 'TSE', 'HKEX', 'ICE', 'BATS'];
    const markets: string[] = [];
    const numMarkets = 2 + Math.floor(rng() * 2);
    const shuffled = [...marketOptions].sort(() => rng() - 0.5);
    for (let m = 0; m < numMarkets; m++) {
      markets.push(shuffled[m]);
    }

    crossMarketAlerts.push({
      id: `XMK-${todayStr.replace(/-/g, '')}-${String(i + 1).padStart(3, '0')}`,
      pattern: p.pattern,
      description: desc,
      markets,
      severity: pick(['critical', 'high', 'medium'] as const),
      detectedAt,
    });
  }

  // --- 6. Compliance Metrics ---
  const complianceMetrics: ComplianceMetrics[] = [];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = today.getMonth();
  for (let i = 5; i >= 0; i--) {
    const monthIdx = (currentMonth - i + 12) % 12;
    const year = currentMonth - i < 0 ? today.getFullYear() - 1 : today.getFullYear();

    complianceMetrics.push({
      month: `${monthNames[monthIdx]} ${year}`,
      totalAlertsGenerated: Math.round(jitter(2450, 0.15)),
      falsePositiveRate: Math.round(jitter(32, 0.2) * 10) / 10,
      avgResolutionTimeHours: Math.round(jitter(4.8, 0.25) * 10) / 10,
      escalationRate: Math.round(jitter(12, 0.2) * 10) / 10,
    });
  }

  return {
    alertSummary,
    recentAlerts,
    unusualActivity,
    circuitBreakers,
    crossMarketAlerts,
    complianceMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// --- Route ---

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[MarketSurveillance] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate market surveillance data' });
  }
});

export default router;
