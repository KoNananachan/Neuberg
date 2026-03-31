import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// ── Seed Data ──

const DEFAULTED_ENTITIES = [
  { entity: 'Acme Holdings Corp', sector: 'Industrials', seniority: 'senior-unsecured', notional: 2400 },
  { entity: 'Meridian Energy Ltd', sector: 'Energy', seniority: 'senior-unsecured', notional: 1800 },
  { entity: 'Pinnacle Media Group', sector: 'Media', seniority: 'senior-unsecured', notional: 950 },
  { entity: 'Solaris Telecom Inc', sector: 'Telecom', seniority: 'senior-unsecured', notional: 3100 },
  { entity: 'Evergreen Retail Corp', sector: 'Retail', seniority: 'senior-unsecured', notional: 1200 },
  { entity: 'Atlas Shipping Co', sector: 'Transport', seniority: 'senior-secured', notional: 2800 },
  { entity: 'Horizon Healthcare Inc', sector: 'Healthcare', seniority: 'senior-unsecured', notional: 1500 },
  { entity: 'Sterling Financial Group', sector: 'Financials', seniority: 'subordinated', notional: 4200 },
  { entity: 'Nordic Paper AB', sector: 'Industrials', seniority: 'senior-secured', notional: 750 },
  { entity: 'Cascade Mining Corp', sector: 'Mining', seniority: 'senior-unsecured', notional: 1650 },
  { entity: 'Vanguard Airlines LLC', sector: 'Transport', seniority: 'senior-unsecured', notional: 2100 },
  { entity: 'Pacific Realty Trust', sector: 'Real Estate', seniority: 'senior-unsecured', notional: 1350 },
  { entity: 'Apex Pharmaceuticals', sector: 'Healthcare', seniority: 'senior-unsecured', notional: 900 },
  { entity: 'Continental Auto Parts', sector: 'Industrials', seniority: 'senior-secured', notional: 1100 },
  { entity: 'Trident Offshore Ltd', sector: 'Energy', seniority: 'senior-unsecured', notional: 2600 },
];

const PENDING_ENTITIES = [
  { entity: 'Zenith Chemicals AG', sector: 'Chemicals', estimatedNotional: 1400, baseCdsSpread: 2850 },
  { entity: 'Cobalt Resources Inc', sector: 'Mining', estimatedNotional: 980, baseCdsSpread: 3200 },
  { entity: 'Sapphire Leisure Corp', sector: 'Consumer', estimatedNotional: 1750, baseCdsSpread: 4100 },
  { entity: 'Metro Construction Ltd', sector: 'Industrials', estimatedNotional: 2200, baseCdsSpread: 2600 },
  { entity: 'Falcon Logistics PLC', sector: 'Transport', estimatedNotional: 1100, baseCdsSpread: 3700 },
];

const CREDIT_EVENTS = ['Bankruptcy', 'Failure to Pay', 'Restructuring'] as const;
const PROTOCOLS = ['ISDA 2014', 'ISDA 2003'] as const;

const SECTOR_RECOVERY_PROFILES: Record<string, { baseRecovery: number; minRecovery: number; maxRecovery: number }> = {
  Industrials: { baseRecovery: 38, minRecovery: 12, maxRecovery: 62 },
  Energy: { baseRecovery: 35, minRecovery: 8, maxRecovery: 58 },
  Media: { baseRecovery: 28, minRecovery: 5, maxRecovery: 52 },
  Telecom: { baseRecovery: 32, minRecovery: 10, maxRecovery: 55 },
  Retail: { baseRecovery: 25, minRecovery: 4, maxRecovery: 48 },
  Transport: { baseRecovery: 40, minRecovery: 15, maxRecovery: 68 },
  Healthcare: { baseRecovery: 42, minRecovery: 18, maxRecovery: 65 },
  Financials: { baseRecovery: 30, minRecovery: 6, maxRecovery: 55 },
  Mining: { baseRecovery: 36, minRecovery: 10, maxRecovery: 60 },
  'Real Estate': { baseRecovery: 45, minRecovery: 20, maxRecovery: 72 },
  Chemicals: { baseRecovery: 37, minRecovery: 12, maxRecovery: 58 },
  Consumer: { baseRecovery: 29, minRecovery: 8, maxRecovery: 50 },
};

const DEALERS = ['JPM', 'GS', 'MS', 'Citi', 'BofA', 'DB', 'Barclays', 'BNPP'] as const;
let cache: { data: unknown; ts: number } | null = null;

// ── Generator ──

function generate() {
  const day = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(day + '-credit-auction'));
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };

  // ── Recent Completed Auctions (10) ──
  const shuffled = [...DEFAULTED_ENTITIES].sort(() => rng() - 0.5);
  const selected = shuffled.slice(0, 10);

  const recentAuctions = selected.map((ent, i) => {
    const daysAgoEvent = 10 + Math.floor(rng() * 80);
    const daysAgoAuction = daysAgoEvent - (3 + Math.floor(rng() * 12));
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - daysAgoEvent);
    const auctionDate = new Date();
    auctionDate.setDate(auctionDate.getDate() - Math.max(1, daysAgoAuction));

    const profile = SECTOR_RECOVERY_PROFILES[ent.sector] || SECTOR_RECOVERY_PROFILES['Industrials'];
    const isSecured = ent.seniority === 'senior-secured';
    const baseRecovery = isSecured
      ? profile.baseRecovery + 25 + rng() * 10
      : profile.baseRecovery + (rng() - 0.5) * 15;
    const recoveryRate = roundTo(Math.max(2, Math.min(92, baseRecovery)), 2);
    const finalPrice = roundTo(recoveryRate + (rng() - 0.5) * 3, 2);
    const initialBid = roundTo(finalPrice + (rng() - 0.3) * 5, 2);

    const creditEvent = CREDIT_EVENTS[Math.floor(rng() * CREDIT_EVENTS.length)];
    const protocol = rng() > 0.25 ? 'ISDA 2014' : 'ISDA 2003';
    const notionalOutstanding = roundTo(jitter(ent.notional, 0.1), 0);

    return {
      entity: ent.entity,
      eventDate: eventDate.toISOString().slice(0, 10),
      auctionDate: auctionDate.toISOString().slice(0, 10),
      recoveryRate,
      finalPrice,
      initialBid,
      sector: ent.sector,
      notionalOutstanding,
      protocol,
      creditEvent,
    };
  });

  recentAuctions.sort((a, b) => b.auctionDate.localeCompare(a.auctionDate));

  // ── Pending Auctions (3) ──
  const pendingShuffled = [...PENDING_ENTITIES].sort(() => rng() - 0.5);
  const pendingAuctions = pendingShuffled.slice(0, 3).map(ent => {
    const daysAhead = 3 + Math.floor(rng() * 21);
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + daysAhead);

    const triggerIdx = Math.floor(rng() * CREDIT_EVENTS.length);
    const currentCdsSpread = roundTo(jitter(ent.baseCdsSpread, 0.12), 0);
    const estimatedNotional = roundTo(jitter(ent.estimatedNotional, 0.08), 0);

    return {
      entity: ent.entity,
      expectedDate: expectedDate.toISOString().slice(0, 10),
      trigger: CREDIT_EVENTS[triggerIdx],
      sector: ent.sector,
      estimatedNotional,
      currentCdsSpread,
    };
  });

  pendingAuctions.sort((a, b) => a.expectedDate.localeCompare(b.expectedDate));

  // ── Historical Recovery by Sector (6 sectors) ──
  const sectorKeys = Object.keys(SECTOR_RECOVERY_PROFILES).slice(0, 6);
  const historicalRecovery = sectorKeys.map(sector => {
    const profile = SECTOR_RECOVERY_PROFILES[sector];
    const count = 8 + Math.floor(rng() * 25);
    const avgRecovery = roundTo(profile.baseRecovery + (rng() - 0.5) * 8, 1);
    const min = roundTo(profile.minRecovery + rng() * 5, 1);
    const max = roundTo(profile.maxRecovery - rng() * 5, 1);
    const range = max - min;
    const stdDev = roundTo(range * (0.18 + rng() * 0.08), 1);

    return { sector, avgRecovery, count, min, max, stdDev };
  });

  // ── Participant Bids (for most recent auction, 8 dealers) ──
  const latestAuction = recentAuctions[0];
  const participantBids = DEALERS.map(dealer => {
    const bidVariance = (rng() - 0.5) * 6;
    const initialBid = roundTo(latestAuction.finalPrice + bidVariance + (rng() - 0.4) * 3, 2);
    const finalBid = roundTo(latestAuction.finalPrice + (rng() - 0.5) * 2, 2);
    const notionalSubmitted = roundTo(50 + rng() * 450, 0);

    return { dealer, initialBid, finalBid, notionalSubmitted };
  });

  // ── Summary ──
  const totalNotional = roundTo(
    recentAuctions.reduce((sum, a) => sum + a.notionalOutstanding, 0) / 1000,
    1,
  );
  const avgRecoveryRate = roundTo(
    recentAuctions.reduce((sum, a) => sum + a.recoveryRate, 0) / recentAuctions.length,
    2,
  );
  const totalAuctions = recentAuctions.length + Math.floor(rng() * 8) + 5;

  const summary = {
    totalAuctions,
    avgRecoveryRate,
    totalNotional,
    pendingAuctions: pendingAuctions.length,
  };

  return {
    summary,
    recentAuctions,
    pendingAuctions,
    historicalRecovery,
    participantBids,
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
    console.error('[CreditAuction] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate credit auction data' });
  }
});

export default router;
