import { Router } from 'express';

const router = Router();

// In-memory cache (15 min TTL)
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 15 * 60_000;
function cached<T>(key: string, fn: () => T): T {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T;
  const data = fn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

// ── Types ──

interface CorporateEvent {
  id: string;
  type: string;
  headline: string;
  target: string;
  targetTicker: string;
  acquirer: string | null;
  acquirerTicker: string | null;
  sector: string;
  announcedDate: string;
  expectedCloseDate: string | null;
  status: string;
  dealValue: number | null;
  premium: number | null;
  currentSpread: number | null;
  annualizedReturn: number | null;
  probability: number | null;
  targetPrice: number;
  offerPrice: number | null;
  daysToClose: number | null;
  catalyst: string;
  catalystDate: string | null;
  riskLevel: string;
  signal: string | null;
  spreadHistory: number[];
}

interface SectorBreakdown {
  sector: string;
  count: number;
  avgPremium: number;
}

interface EventDrivenResponse {
  events: CorporateEvent[];
  summary: {
    totalDeals: number;
    avgSpread: number;
    avgAnnualizedReturn: number;
    newThisWeek: number;
    closedThisMonth: number;
    atRisk: number;
  };
  sectorBreakdown: SectorBreakdown[];
  timestamp: string;
}

// ── Helpers ──

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateSpreadHistory(baseSpread: number): number[] {
  const points: number[] = [];
  let current = baseSpread + randomBetween(-1, 1);
  for (let i = 0; i < 20; i++) {
    current += randomBetween(-0.3, 0.3);
    current = Math.max(0.1, Math.min(current, 12));
    points.push(Math.round(current * 100) / 100);
  }
  return points;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

// ── Static event data generator ──

function generateEvents(): CorporateEvent[] {
  const events: CorporateEvent[] = [
    // M&A deals
    {
      id: 'evt-001',
      type: 'M&A',
      headline: 'Synopsys to acquire Ansys in $35B all-stock deal',
      target: 'Ansys Inc',
      targetTicker: 'ANSS',
      acquirer: 'Synopsys Inc',
      acquirerTicker: 'SNPS',
      sector: 'Technology',
      announcedDate: daysAgo(45),
      expectedCloseDate: daysFromNow(120),
      status: 'REGULATORY_REVIEW',
      dealValue: 35.0,
      premium: 29.3,
      currentSpread: 3.2,
      annualizedReturn: 9.7,
      probability: 82,
      targetPrice: 348.50,
      offerPrice: 390.00,
      daysToClose: 120,
      catalyst: 'EU antitrust ruling expected',
      catalystDate: daysFromNow(30),
      riskLevel: 'MODERATE',
      signal: 'SPREAD_WIDENING',
      spreadHistory: generateSpreadHistory(3.2),
    },
    {
      id: 'evt-002',
      type: 'M&A',
      headline: 'Capital One to acquire Discover Financial for $35.3B',
      target: 'Discover Financial Services',
      targetTicker: 'DFS',
      acquirer: 'Capital One Financial',
      acquirerTicker: 'COF',
      sector: 'Financials',
      announcedDate: daysAgo(90),
      expectedCloseDate: daysFromNow(60),
      status: 'REGULATORY_REVIEW',
      dealValue: 35.3,
      premium: 26.6,
      currentSpread: 1.8,
      annualizedReturn: 11.0,
      probability: 90,
      targetPrice: 147.20,
      offerPrice: 149.88,
      daysToClose: 60,
      catalyst: 'DOJ review completion',
      catalystDate: daysFromNow(20),
      riskLevel: 'MODERATE',
      signal: 'SPREAD_TIGHTENING',
      spreadHistory: generateSpreadHistory(1.8),
    },
    {
      id: 'evt-003',
      type: 'M&A',
      headline: 'Juniper Networks to be acquired by HPE for $14B',
      target: 'Juniper Networks',
      targetTicker: 'JNPR',
      acquirer: 'Hewlett Packard Enterprise',
      acquirerTicker: 'HPE',
      sector: 'Technology',
      announcedDate: daysAgo(150),
      expectedCloseDate: daysFromNow(30),
      status: 'PENDING',
      dealValue: 14.0,
      premium: 32.4,
      currentSpread: 0.8,
      annualizedReturn: 9.7,
      probability: 95,
      targetPrice: 39.80,
      offerPrice: 40.12,
      daysToClose: 30,
      catalyst: 'Final regulatory clearance',
      catalystDate: daysFromNow(15),
      riskLevel: 'LOW',
      signal: 'SPREAD_TIGHTENING',
      spreadHistory: generateSpreadHistory(0.8),
    },
    {
      id: 'evt-004',
      type: 'M&A',
      headline: 'Albertsons-Kroger merger blocked by FTC',
      target: 'Albertsons Companies',
      targetTicker: 'ACI',
      acquirer: 'Kroger Co',
      acquirerTicker: 'KR',
      sector: 'Consumer Staples',
      announcedDate: daysAgo(400),
      expectedCloseDate: null,
      status: 'TERMINATED',
      dealValue: 24.6,
      premium: 33.0,
      currentSpread: null,
      annualizedReturn: null,
      probability: 0,
      targetPrice: 18.90,
      offerPrice: 34.10,
      daysToClose: null,
      catalyst: 'Deal terminated after FTC injunction',
      catalystDate: null,
      riskLevel: 'HIGH',
      signal: null,
      spreadHistory: generateSpreadHistory(6.0),
    },
    {
      id: 'evt-005',
      type: 'M&A',
      headline: 'ConocoPhillips to acquire Marathon Oil for $22.5B',
      target: 'Marathon Oil Corp',
      targetTicker: 'MRO',
      acquirer: 'ConocoPhillips',
      acquirerTicker: 'COP',
      sector: 'Energy',
      announcedDate: daysAgo(60),
      expectedCloseDate: daysFromNow(45),
      status: 'PENDING',
      dealValue: 22.5,
      premium: 18.5,
      currentSpread: 1.2,
      annualizedReturn: 9.8,
      probability: 93,
      targetPrice: 28.30,
      offerPrice: 28.64,
      daysToClose: 45,
      catalyst: 'Shareholder vote scheduled',
      catalystDate: daysFromNow(10),
      riskLevel: 'LOW',
      signal: null,
      spreadHistory: generateSpreadHistory(1.2),
    },
    {
      id: 'evt-006',
      type: 'M&A',
      headline: 'Nippon Steel bid for US Steel faces CFIUS review',
      target: 'United States Steel',
      targetTicker: 'X',
      acquirer: 'Nippon Steel',
      acquirerTicker: null,
      sector: 'Materials',
      announcedDate: daysAgo(180),
      expectedCloseDate: daysFromNow(90),
      status: 'REGULATORY_REVIEW',
      dealValue: 14.1,
      premium: 40.2,
      currentSpread: 7.8,
      annualizedReturn: 31.6,
      probability: 45,
      targetPrice: 36.50,
      offerPrice: 55.00,
      daysToClose: 90,
      catalyst: 'CFIUS national security decision',
      catalystDate: daysFromNow(45),
      riskLevel: 'HIGH',
      signal: 'REGULATORY_RISK',
      spreadHistory: generateSpreadHistory(7.8),
    },
    // SPINOFF
    {
      id: 'evt-007',
      type: 'SPINOFF',
      headline: 'Johnson & Johnson completes Kenvue consumer health spinoff',
      target: 'Kenvue Inc',
      targetTicker: 'KVUE',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Healthcare',
      announcedDate: daysAgo(200),
      expectedCloseDate: null,
      status: 'CLOSED',
      dealValue: 40.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 100,
      targetPrice: 20.80,
      offerPrice: null,
      daysToClose: null,
      catalyst: 'Post-spinoff JNJ share exchange complete',
      catalystDate: null,
      riskLevel: 'LOW',
      signal: null,
      spreadHistory: generateSpreadHistory(0.5),
    },
    {
      id: 'evt-008',
      type: 'SPINOFF',
      headline: 'Honeywell to spin off Advanced Materials division',
      target: 'Honeywell Advanced Materials',
      targetTicker: 'HON',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Industrials',
      announcedDate: daysAgo(30),
      expectedCloseDate: daysFromNow(180),
      status: 'ANNOUNCED',
      dealValue: 12.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 85,
      targetPrice: 210.40,
      offerPrice: null,
      daysToClose: 180,
      catalyst: 'Form 10 filing expected',
      catalystDate: daysFromNow(60),
      riskLevel: 'LOW',
      signal: 'NEW_DEAL',
      spreadHistory: generateSpreadHistory(1.0),
    },
    // ACTIVIST
    {
      id: 'evt-009',
      type: 'ACTIVIST',
      headline: 'Elliott Management takes $2B stake in Texas Instruments',
      target: 'Texas Instruments',
      targetTicker: 'TXN',
      acquirer: 'Elliott Management',
      acquirerTicker: null,
      sector: 'Technology',
      announcedDate: daysAgo(10),
      expectedCloseDate: null,
      status: 'ANNOUNCED',
      dealValue: 2.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: null,
      targetPrice: 192.50,
      offerPrice: null,
      daysToClose: null,
      catalyst: 'Board engagement / capital allocation review',
      catalystDate: daysFromNow(45),
      riskLevel: 'MODERATE',
      signal: 'ACTIVIST_ENTRY',
      spreadHistory: generateSpreadHistory(2.0),
    },
    {
      id: 'evt-010',
      type: 'ACTIVIST',
      headline: 'Starboard Value pushes for Pfizer board seats',
      target: 'Pfizer Inc',
      targetTicker: 'PFE',
      acquirer: 'Starboard Value',
      acquirerTicker: null,
      sector: 'Healthcare',
      announcedDate: daysAgo(20),
      expectedCloseDate: null,
      status: 'PENDING',
      dealValue: 1.5,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: null,
      targetPrice: 26.80,
      offerPrice: null,
      daysToClose: null,
      catalyst: 'Proxy fight deadline / annual meeting',
      catalystDate: daysFromNow(75),
      riskLevel: 'MODERATE',
      signal: 'ACTIVIST_ENTRY',
      spreadHistory: generateSpreadHistory(1.5),
    },
    // BUYBACK
    {
      id: 'evt-011',
      type: 'BUYBACK',
      headline: 'Apple announces additional $110B share buyback program',
      target: 'Apple Inc',
      targetTicker: 'AAPL',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Technology',
      announcedDate: daysAgo(5),
      expectedCloseDate: null,
      status: 'ANNOUNCED',
      dealValue: 110.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 100,
      targetPrice: 228.50,
      offerPrice: null,
      daysToClose: null,
      catalyst: 'Q2 earnings report',
      catalystDate: daysFromNow(80),
      riskLevel: 'LOW',
      signal: 'NEW_DEAL',
      spreadHistory: generateSpreadHistory(0.3),
    },
    {
      id: 'evt-012',
      type: 'BUYBACK',
      headline: 'Alphabet authorizes $70B in share repurchases',
      target: 'Alphabet Inc',
      targetTicker: 'GOOGL',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Technology',
      announcedDate: daysAgo(15),
      expectedCloseDate: null,
      status: 'ANNOUNCED',
      dealValue: 70.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 100,
      targetPrice: 178.30,
      offerPrice: null,
      daysToClose: null,
      catalyst: 'Ongoing execution',
      catalystDate: null,
      riskLevel: 'LOW',
      signal: null,
      spreadHistory: generateSpreadHistory(0.2),
    },
    // RESTRUCTURING
    {
      id: 'evt-013',
      type: 'RESTRUCTURING',
      headline: '3M restructuring into two public companies',
      target: '3M Company',
      targetTicker: 'MMM',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Industrials',
      announcedDate: daysAgo(120),
      expectedCloseDate: daysFromNow(60),
      status: 'PENDING',
      dealValue: null,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 90,
      targetPrice: 135.60,
      offerPrice: null,
      daysToClose: 60,
      catalyst: 'Healthcare spin completion',
      catalystDate: daysFromNow(30),
      riskLevel: 'LOW',
      signal: null,
      spreadHistory: generateSpreadHistory(1.0),
    },
    // IPO_LOCK_EXPIRY
    {
      id: 'evt-014',
      type: 'IPO_LOCK_EXPIRY',
      headline: 'Arm Holdings 180-day lock-up expiry approaching',
      target: 'Arm Holdings',
      targetTicker: 'ARM',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Technology',
      announcedDate: daysAgo(160),
      expectedCloseDate: daysFromNow(20),
      status: 'PENDING',
      dealValue: null,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 100,
      targetPrice: 155.20,
      offerPrice: null,
      daysToClose: 20,
      catalyst: 'Lock-up expiration date',
      catalystDate: daysFromNow(20),
      riskLevel: 'MODERATE',
      signal: null,
      spreadHistory: generateSpreadHistory(2.0),
    },
    // TENDER_OFFER
    {
      id: 'evt-015',
      type: 'TENDER_OFFER',
      headline: 'Danaher launches tender offer for Abcam at $24/share',
      target: 'Abcam plc',
      targetTicker: 'ABCM',
      acquirer: 'Danaher Corp',
      acquirerTicker: 'DHR',
      sector: 'Healthcare',
      announcedDate: daysAgo(25),
      expectedCloseDate: daysFromNow(15),
      status: 'PENDING',
      dealValue: 5.7,
      premium: 36.8,
      currentSpread: 0.5,
      annualizedReturn: 12.2,
      probability: 97,
      targetPrice: 23.88,
      offerPrice: 24.00,
      daysToClose: 15,
      catalyst: 'Tender offer expiration',
      catalystDate: daysFromNow(15),
      riskLevel: 'LOW',
      signal: 'SPREAD_TIGHTENING',
      spreadHistory: generateSpreadHistory(0.5),
    },
    // RIGHTS_ISSUE
    {
      id: 'evt-016',
      type: 'RIGHTS_ISSUE',
      headline: 'Vodafone announces GBP2.4B rights issue for debt reduction',
      target: 'Vodafone Group',
      targetTicker: 'VOD',
      acquirer: null,
      acquirerTicker: null,
      sector: 'Communication Services',
      announcedDate: daysAgo(7),
      expectedCloseDate: daysFromNow(40),
      status: 'ANNOUNCED',
      dealValue: 3.0,
      premium: null,
      currentSpread: null,
      annualizedReturn: null,
      probability: 95,
      targetPrice: 9.45,
      offerPrice: null,
      daysToClose: 40,
      catalyst: 'Rights subscription period opens',
      catalystDate: daysFromNow(14),
      riskLevel: 'LOW',
      signal: 'NEW_DEAL',
      spreadHistory: generateSpreadHistory(0.8),
    },
    // More M&A
    {
      id: 'evt-017',
      type: 'M&A',
      headline: 'Chevron acquisition of Hess faces Exxon arbitration',
      target: 'Hess Corporation',
      targetTicker: 'HES',
      acquirer: 'Chevron Corp',
      acquirerTicker: 'CVX',
      sector: 'Energy',
      announcedDate: daysAgo(200),
      expectedCloseDate: daysFromNow(150),
      status: 'REGULATORY_REVIEW',
      dealValue: 53.0,
      premium: 22.8,
      currentSpread: 5.4,
      annualizedReturn: 13.1,
      probability: 65,
      targetPrice: 156.20,
      offerPrice: 171.00,
      daysToClose: 150,
      catalyst: 'Guyana arbitration ruling',
      catalystDate: daysFromNow(90),
      riskLevel: 'HIGH',
      signal: 'REGULATORY_RISK',
      spreadHistory: generateSpreadHistory(5.4),
    },
    {
      id: 'evt-018',
      type: 'M&A',
      headline: 'Novo Nordisk agrees to acquire Catalent for $16.5B',
      target: 'Catalent Inc',
      targetTicker: 'CTLT',
      acquirer: 'Novo Nordisk',
      acquirerTicker: 'NVO',
      sector: 'Healthcare',
      announcedDate: daysAgo(55),
      expectedCloseDate: daysFromNow(75),
      status: 'PENDING',
      dealValue: 16.5,
      premium: 24.1,
      currentSpread: 2.1,
      annualizedReturn: 10.2,
      probability: 88,
      targetPrice: 61.40,
      offerPrice: 63.50,
      daysToClose: 75,
      catalyst: 'FTC decision on pharma CDMO concentration',
      catalystDate: daysFromNow(40),
      riskLevel: 'MODERATE',
      signal: null,
      spreadHistory: generateSpreadHistory(2.1),
    },
  ];

  return events;
}

// ── Route handler ──

router.get('/', (_req, res) => {
  try {
    const result = cached<EventDrivenResponse>('event-driven', () => {
      const events = generateEvents();

      // Calculate summary
      const maAndTender = events.filter(e => (e.type === 'M&A' || e.type === 'TENDER_OFFER') && e.currentSpread != null);
      const avgSpread = maAndTender.length > 0
        ? Math.round(maAndTender.reduce((s, e) => s + (e.currentSpread ?? 0), 0) / maAndTender.length * 100) / 100
        : 0;
      const withAnnReturn = maAndTender.filter(e => e.annualizedReturn != null);
      const avgAnnualizedReturn = withAnnReturn.length > 0
        ? Math.round(withAnnReturn.reduce((s, e) => s + (e.annualizedReturn ?? 0), 0) / withAnnReturn.length * 100) / 100
        : 0;

      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
      const newThisWeek = events.filter(e => new Date(e.announcedDate).getTime() >= oneWeekAgo).length;
      const closedThisMonth = events.filter(e => e.status === 'CLOSED' && new Date(e.announcedDate).getTime() >= oneMonthAgo).length;
      const atRisk = events.filter(e => e.riskLevel === 'HIGH').length;

      // Sector breakdown
      const sectorMap = new Map<string, { count: number; premiums: number[] }>();
      for (const event of events) {
        const entry = sectorMap.get(event.sector) || { count: 0, premiums: [] };
        entry.count++;
        if (event.premium != null) entry.premiums.push(event.premium);
        sectorMap.set(event.sector, entry);
      }
      const sectorBreakdown: SectorBreakdown[] = [...sectorMap.entries()]
        .map(([sector, data]) => ({
          sector,
          count: data.count,
          avgPremium: data.premiums.length > 0
            ? Math.round(data.premiums.reduce((s, v) => s + v, 0) / data.premiums.length * 100) / 100
            : 0,
        }))
        .sort((a, b) => b.count - a.count);

      return {
        events,
        summary: {
          totalDeals: events.length,
          avgSpread,
          avgAnnualizedReturn,
          newThisWeek,
          closedThisMonth,
          atRisk,
        },
        sectorBreakdown,
        timestamp: new Date().toISOString(),
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[EventDriven] Error:', err instanceof Error ? err.message : err);
    res.status(500).json({ error: 'Failed to fetch event-driven data' });
  }
});

export default router;
