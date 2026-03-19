import { Router } from 'express';

const router = Router();

// ── Deterministic seeded RNG ──

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(tag: string) {
  const d = new Date().toISOString().slice(0, 10);
  return mulberry32(hashSeed(tag + d));
}

// ── Helpers ──

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ── Types ──

interface KeyMeasure {
  measure: string;
  description: string;
}

interface TradeImpact {
  preVsPostReductionPct: number;
  estimatedCostBillions: number;
}

interface ComplianceInfo {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dueDiligenceRequired: boolean;
}

interface SanctionsRegime {
  target: string;
  imposedBy: string[];
  type: 'comprehensive' | 'targeted' | 'sectoral';
  sectors: string[];
  startDate: string;
  lastUpdated: string;
  entityCount: number;
  severity: number;
  tradeImpact: TradeImpact;
  keyMeasures: KeyMeasure[];
  exemptions: string[];
  compliance: ComplianceInfo;
}

interface GlobalStats {
  totalRegimes: number;
  totalDesignatedEntities: number;
  newDesignationsThisYear: number;
  removalsThisYear: number;
}

interface RecentAction {
  date: string;
  action: string;
  target: string;
  authority: string;
  description: string;
}

interface TradeFlowImpact {
  totalTradeAffectedTrillions: number;
  pctGlobalTrade: number;
  mostAffectedSectors: string[];
}

interface ComplianceAlert {
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity: string;
  issue: string;
  recommendation: string;
}

interface SanctionsMonitorResponse {
  regimes: SanctionsRegime[];
  globalStats: GlobalStats;
  recentActions: RecentAction[];
  tradeFlowImpact: TradeFlowImpact;
  complianceAlerts: ComplianceAlert[];
  timestamp: string;
}

// ── Seed Data: Sanctions Regimes ──

interface RegimeSeed {
  target: string;
  imposedBy: string[];
  type: 'comprehensive' | 'targeted' | 'sectoral';
  sectors: string[];
  startDate: string;
  baseEntityCount: number;
  severity: number;
  baseReductionPct: number;
  baseCostBillions: number;
  keyMeasures: KeyMeasure[];
  exemptions: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

const REGIME_SEEDS: RegimeSeed[] = [
  {
    target: 'Russia / Belarus',
    imposedBy: ['US/OFAC', 'EU', 'UK', 'Canada', 'Japan', 'Australia', 'Switzerland'],
    type: 'comprehensive',
    sectors: ['energy', 'finance', 'defense', 'technology', 'transportation', 'luxury goods', 'metals'],
    startDate: '2014-03-17',
    baseEntityCount: 2450,
    severity: 5,
    baseReductionPct: 68,
    baseCostBillions: 280,
    keyMeasures: [
      { measure: 'SWIFT disconnection', description: 'Major Russian banks removed from SWIFT messaging system' },
      { measure: 'Central bank asset freeze', description: 'Approximately $300B in CBR reserves frozen in Western jurisdictions' },
      { measure: 'Oil price cap', description: 'G7 price cap of $60/bbl on Russian crude oil exports' },
      { measure: 'Export controls', description: 'Restrictions on advanced semiconductors, avionics, and dual-use technology' },
      { measure: 'Sovereign debt ban', description: 'Prohibition on transactions in new Russian sovereign debt' },
    ],
    exemptions: ['humanitarian aid', 'food and agricultural products', 'medical supplies', 'energy (with price cap)', 'diplomatic channels'],
    riskLevel: 'critical',
  },
  {
    target: 'Iran',
    imposedBy: ['US/OFAC', 'EU', 'UN'],
    type: 'comprehensive',
    sectors: ['energy', 'finance', 'shipping', 'petrochemicals', 'metals', 'automotive'],
    startDate: '1979-11-14',
    baseEntityCount: 1180,
    severity: 5,
    baseReductionPct: 72,
    baseCostBillions: 150,
    keyMeasures: [
      { measure: 'Oil export embargo', description: 'Prohibition on purchase of Iranian crude oil by sanctioning nations' },
      { measure: 'SWIFT disconnection', description: 'Iranian banks cut off from SWIFT financial messaging network' },
      { measure: 'Asset freeze', description: 'Freeze of Iranian government and central bank assets abroad' },
      { measure: 'Secondary sanctions', description: 'Non-US entities face penalties for dealing with sanctioned Iranian parties' },
      { measure: 'Shipping restrictions', description: 'Insurance and flagging bans on vessels carrying Iranian oil' },
    ],
    exemptions: ['humanitarian goods', 'food and medicine', 'personal remittances', 'JCPOA-related (suspended)'],
    riskLevel: 'critical',
  },
  {
    target: 'North Korea',
    imposedBy: ['US/OFAC', 'EU', 'UN', 'Japan', 'South Korea', 'Australia'],
    type: 'comprehensive',
    sectors: ['finance', 'defense', 'energy', 'minerals', 'textiles', 'seafood', 'technology'],
    startDate: '2006-10-14',
    baseEntityCount: 680,
    severity: 5,
    baseReductionPct: 90,
    baseCostBillions: 12,
    keyMeasures: [
      { measure: 'Trade embargo', description: 'Near-total ban on DPRK exports including coal, iron, textiles, and seafood' },
      { measure: 'Financial isolation', description: 'All DPRK banks sanctioned; correspondent banking relationships severed' },
      { measure: 'Petroleum cap', description: 'UN cap on refined petroleum imports at 500,000 barrels/year' },
      { measure: 'Labor export ban', description: 'Repatriation of overseas DPRK workers earning foreign currency' },
      { measure: 'Weapons embargo', description: 'Complete prohibition on arms imports and exports' },
    ],
    exemptions: ['humanitarian aid', 'food aid', 'medical supplies', 'diplomatic activities'],
    riskLevel: 'critical',
  },
  {
    target: 'Syria',
    imposedBy: ['US/OFAC', 'EU', 'UK', 'Arab League'],
    type: 'comprehensive',
    sectors: ['energy', 'finance', 'defense', 'construction', 'telecommunications'],
    startDate: '2011-04-29',
    baseEntityCount: 420,
    severity: 4,
    baseReductionPct: 65,
    baseCostBillions: 18,
    keyMeasures: [
      { measure: 'Caesar Act sanctions', description: 'Broad economic sanctions targeting reconstruction and military supply chains' },
      { measure: 'Oil import ban', description: 'EU and US prohibition on importing Syrian petroleum products' },
      { measure: 'Asset freeze', description: 'Freeze of assets belonging to Assad regime officials and affiliates' },
      { measure: 'Investment ban', description: 'Prohibition on new investment in Syrian energy sector' },
    ],
    exemptions: ['humanitarian assistance', 'food', 'medicine', 'certain NGO activities'],
    riskLevel: 'high',
  },
  {
    target: 'Venezuela',
    imposedBy: ['US/OFAC', 'EU', 'Canada', 'Switzerland'],
    type: 'sectoral',
    sectors: ['energy', 'finance', 'gold', 'defense'],
    startDate: '2017-08-25',
    baseEntityCount: 310,
    severity: 4,
    baseReductionPct: 55,
    baseCostBillions: 32,
    keyMeasures: [
      { measure: 'PdVSA sanctions', description: 'Sanctions on state oil company blocking US property and transactions' },
      { measure: 'Sovereign debt ban', description: 'Prohibition on dealing in new Venezuelan government debt' },
      { measure: 'Gold export restrictions', description: 'Sanctions targeting Venezuelan gold sector and associated entities' },
      { measure: 'Secondary sanctions', description: 'Penalties for non-US persons materially assisting sanctioned entities' },
    ],
    exemptions: ['humanitarian goods', 'food and medicine', 'licensed transactions for certain operations', 'personal remittances'],
    riskLevel: 'high',
  },
  {
    target: 'Myanmar',
    imposedBy: ['US/OFAC', 'EU', 'UK', 'Canada'],
    type: 'targeted',
    sectors: ['defense', 'finance', 'gems and jade', 'timber', 'energy'],
    startDate: '2021-02-11',
    baseEntityCount: 185,
    severity: 3,
    baseReductionPct: 35,
    baseCostBillions: 8,
    keyMeasures: [
      { measure: 'Military entity designations', description: 'SDN listing of military junta leaders, conglomerates MEHL and MEC' },
      { measure: 'Asset freeze', description: 'Freeze of military-linked assets in Western financial institutions' },
      { measure: 'Arms embargo', description: 'Prohibition on arms and dual-use technology exports to Myanmar military' },
      { measure: 'Revenue targeting', description: 'Sanctions on Myanmar Oil and Gas Enterprise (MOGE) revenue flows' },
    ],
    exemptions: ['humanitarian aid', 'food and medicine', 'civilian telecommunications', 'certain agricultural inputs'],
    riskLevel: 'high',
  },
  {
    target: 'Cuba',
    imposedBy: ['US/OFAC'],
    type: 'comprehensive',
    sectors: ['finance', 'trade', 'tourism', 'energy', 'technology'],
    startDate: '1962-02-07',
    baseEntityCount: 250,
    severity: 4,
    baseReductionPct: 80,
    baseCostBillions: 6,
    keyMeasures: [
      { measure: 'Trade embargo', description: 'Near-total prohibition on US trade with Cuba under Trading with the Enemy Act' },
      { measure: 'Financial restrictions', description: 'US persons prohibited from transactions with Cuban government entities' },
      { measure: 'Travel restrictions', description: 'US persons may only travel under specific OFAC license categories' },
      { measure: 'Title III enforcement', description: 'Helms-Burton Act allows lawsuits over confiscated property' },
    ],
    exemptions: ['licensed agricultural exports', 'humanitarian donations', 'informational materials', 'licensed travel categories'],
    riskLevel: 'medium',
  },
  {
    target: 'China (targeted)',
    imposedBy: ['US/OFAC', 'US/BIS', 'UK', 'EU', 'Canada'],
    type: 'targeted',
    sectors: ['technology', 'defense', 'surveillance', 'semiconductors', 'AI', 'quantum computing'],
    startDate: '2020-06-29',
    baseEntityCount: 620,
    severity: 3,
    baseReductionPct: 18,
    baseCostBillions: 95,
    keyMeasures: [
      { measure: 'Entity List restrictions', description: 'BIS Entity List blocking export of advanced chips and EDA tools' },
      { measure: 'Military end-user controls', description: 'Enhanced due diligence for exports to Chinese military-linked entities' },
      { measure: 'Xinjiang-related sanctions', description: 'Sanctions on entities involved in human rights abuses in Xinjiang' },
      { measure: 'Outbound investment screening', description: 'Restrictions on US investment in Chinese AI, quantum, and semiconductor sectors' },
      { measure: 'Hong Kong-related sanctions', description: 'Designations of officials undermining Hong Kong autonomy' },
    ],
    exemptions: ['consumer electronics (most)', 'civilian telecommunications', 'licensed transactions', 'academic research (limited)'],
    riskLevel: 'high',
  },
  {
    target: 'Sudan',
    imposedBy: ['US/OFAC', 'EU', 'UN'],
    type: 'targeted',
    sectors: ['defense', 'finance', 'gold mining', 'energy'],
    startDate: '1997-11-03',
    baseEntityCount: 165,
    severity: 3,
    baseReductionPct: 42,
    baseCostBillions: 5,
    keyMeasures: [
      { measure: 'Arms embargo', description: 'UN arms embargo on Darfur region; US restrictions on military transfers' },
      { measure: 'Asset freeze', description: 'Freeze of assets belonging to designated military and RSF leaders' },
      { measure: 'Travel ban', description: 'Travel restrictions on designated individuals involved in conflict' },
      { measure: 'Gold sector sanctions', description: 'Targeting of gold revenue streams funding armed groups' },
    ],
    exemptions: ['humanitarian aid', 'food and medicine', 'peacebuilding activities', 'basic necessities'],
    riskLevel: 'high',
  },
  {
    target: 'Libya',
    imposedBy: ['US/OFAC', 'EU', 'UN'],
    type: 'targeted',
    sectors: ['energy', 'finance', 'defense'],
    startDate: '2011-02-25',
    baseEntityCount: 130,
    severity: 2,
    baseReductionPct: 28,
    baseCostBillions: 4,
    keyMeasures: [
      { measure: 'Asset freeze', description: 'Freeze of Libyan sovereign wealth fund and central bank assets' },
      { measure: 'Arms embargo', description: 'UN-mandated arms embargo on Libya' },
      { measure: 'Oil export controls', description: 'Restrictions on illicit oil exports outside legitimate government channels' },
      { measure: 'Travel ban', description: 'Travel restrictions on designated individuals' },
    ],
    exemptions: ['humanitarian aid', 'oil exports via legitimate NOC channels', 'food and medicine', 'frozen assets for humanitarian purposes'],
    riskLevel: 'medium',
  },
];

// ── Seed Data: Recent Actions ──

interface RecentActionSeed {
  action: string;
  target: string;
  authority: string;
  description: string;
  dayOffset: [number, number];
}

const RECENT_ACTION_SEEDS: RecentActionSeed[] = [
  { action: 'New Designations', target: 'Russia', authority: 'US/OFAC', description: 'Added 23 entities to SDN list including defense procurement networks and sanctions evasion facilitators', dayOffset: [-1, -5] },
  { action: 'Export Control Update', target: 'China', authority: 'US/BIS', description: 'Expanded Entity List to include 12 additional Chinese semiconductor and AI companies', dayOffset: [-2, -8] },
  { action: 'Sanctions Evasion Alert', target: 'Iran', authority: 'EU', description: 'Identified new shipping network using flag-swapping to circumvent oil export restrictions', dayOffset: [-1, -6] },
  { action: 'Designation Removal', target: 'Venezuela', authority: 'US/OFAC', description: 'Issued specific license authorizing limited oil transactions with PdVSA under conditions', dayOffset: [-3, -10] },
  { action: 'New Designations', target: 'North Korea', authority: 'UN', description: 'Security Council added 5 entities linked to ballistic missile procurement network', dayOffset: [-4, -12] },
  { action: 'Sectoral Sanctions Update', target: 'Russia', authority: 'EU', description: 'Extended oil price cap enforcement measures; added diamond import restrictions', dayOffset: [-2, -7] },
  { action: 'Compliance Advisory', target: 'Myanmar', authority: 'UK/OFSI', description: 'Updated guidance on enhanced due diligence for Myanmar-related transactions', dayOffset: [-5, -15] },
  { action: 'New Designations', target: 'Syria', authority: 'US/OFAC', description: 'Designated 8 individuals and entities supporting chemical weapons program', dayOffset: [-3, -9] },
  { action: 'Enforcement Action', target: 'Russia', authority: 'US/OFAC', description: 'Settled $12M penalty against financial institution for sanctions violations', dayOffset: [-4, -14] },
  { action: 'License Modification', target: 'Cuba', authority: 'US/OFAC', description: 'Modified general licenses for telecommunications and internet services', dayOffset: [-6, -18] },
  { action: 'New Designations', target: 'Iran', authority: 'US/OFAC', description: 'Added 15 entities to SDN list for supporting drone and UAV production', dayOffset: [-2, -8] },
  { action: 'Export Control Update', target: 'Russia', authority: 'US/BIS', description: 'Tightened restrictions on re-export of dual-use items through third countries', dayOffset: [-3, -11] },
  { action: 'Sanctions Evasion Alert', target: 'North Korea', authority: 'UN Panel of Experts', description: 'Report details cryptocurrency theft totaling $1.2B to fund weapons programs', dayOffset: [-5, -16] },
  { action: 'New Designations', target: 'Sudan', authority: 'US/OFAC', description: 'Designated RSF-linked entities involved in gold smuggling operations', dayOffset: [-4, -13] },
  { action: 'Sectoral Sanctions Update', target: 'China', authority: 'US/Treasury', description: 'Finalized outbound investment screening rules for AI and quantum sectors', dayOffset: [-1, -7] },
];

// ── Seed Data: Compliance Alerts ──

interface ComplianceAlertSeed {
  severity: 'low' | 'medium' | 'high' | 'critical';
  entity: string;
  issue: string;
  recommendation: string;
}

const COMPLIANCE_ALERT_SEEDS: ComplianceAlertSeed[] = [
  { severity: 'critical', entity: 'Russian energy sector counterparties', issue: 'Price cap attestation gaps identified in oil cargo documentation', recommendation: 'Immediately audit all price cap attestation records; ensure Tier 1-3 documentation is complete' },
  { severity: 'critical', entity: 'Iranian shipping networks', issue: 'Detected AIS manipulation patterns consistent with sanctions evasion via ship-to-ship transfers', recommendation: 'Screen all tanker movements in Persian Gulf for AIS anomalies; escalate suspicious patterns' },
  { severity: 'high', entity: 'Chinese technology firms', issue: 'Entity List additions may affect existing supply chain contracts', recommendation: 'Review all contracts with newly designated entities; obtain BIS licenses before continuing shipments' },
  { severity: 'high', entity: 'North Korea-linked cyber actors', issue: 'Cryptocurrency wallet addresses linked to DPRK Lazarus Group detected in transaction monitoring', recommendation: 'Block identified wallet addresses; file SAR with FinCEN within 30 days' },
  { severity: 'medium', entity: 'UAE-based trading companies', issue: 'Elevated re-export risk for dual-use goods potentially destined for sanctioned jurisdictions', recommendation: 'Enhance end-user screening for UAE intermediaries; require end-use certificates' },
  { severity: 'medium', entity: 'Turkish financial intermediaries', issue: 'Increased volume of transactions with Russian sanctioned banks routed through Turkish institutions', recommendation: 'Apply enhanced due diligence on Turkey-origin payments; verify ultimate beneficiaries' },
  { severity: 'high', entity: 'Syrian reconstruction contracts', issue: 'Caesar Act prohibitions may apply to infrastructure projects with government connections', recommendation: 'Obtain legal opinion before engaging in any Syria-related construction or engineering work' },
  { severity: 'low', entity: 'Cuban telecommunications sector', issue: 'Recent license modifications may expand permissible activities', recommendation: 'Review updated OFAC general licenses for telecommunications; update compliance procedures' },
];

// ── Data Generation ──

function generateRegimes(rng: () => number): SanctionsRegime[] {
  const today = new Date();

  return REGIME_SEEDS.map((seed) => {
    const entityJitter = Math.floor((rng() - 0.5) * seed.baseEntityCount * 0.06);
    const entityCount = Math.max(10, seed.baseEntityCount + entityJitter);

    const reductionJitter = (rng() - 0.5) * 6;
    const preVsPostReductionPct = clamp(roundTo(seed.baseReductionPct + reductionJitter, 1), 5, 98);

    const costJitter = (rng() - 0.5) * seed.baseCostBillions * 0.08;
    const estimatedCostBillions = roundTo(Math.max(0.5, seed.baseCostBillions + costJitter), 1);

    // lastUpdated: within last 90 days
    const updateDaysAgo = Math.floor(rng() * 90) + 1;
    const lastUpdated = new Date(today);
    lastUpdated.setDate(lastUpdated.getDate() - updateDaysAgo);

    return {
      target: seed.target,
      imposedBy: seed.imposedBy,
      type: seed.type,
      sectors: seed.sectors,
      startDate: seed.startDate,
      lastUpdated: lastUpdated.toISOString().slice(0, 10),
      entityCount,
      severity: seed.severity,
      tradeImpact: {
        preVsPostReductionPct,
        estimatedCostBillions,
      },
      keyMeasures: seed.keyMeasures,
      exemptions: seed.exemptions,
      compliance: {
        riskLevel: seed.riskLevel,
        dueDiligenceRequired: seed.riskLevel !== 'low',
      },
    };
  });
}

function generateGlobalStats(regimes: SanctionsRegime[], rng: () => number): GlobalStats {
  const totalDesignatedEntities = regimes.reduce((sum, r) => sum + r.entityCount, 0);
  const baseNewDesignations = 850;
  const baseRemovals = 120;

  const newJitter = Math.floor((rng() - 0.5) * 200);
  const removalJitter = Math.floor((rng() - 0.5) * 40);

  return {
    totalRegimes: regimes.length,
    totalDesignatedEntities,
    newDesignationsThisYear: Math.max(100, baseNewDesignations + newJitter),
    removalsThisYear: Math.max(20, baseRemovals + removalJitter),
  };
}

function generateRecentActions(rng: () => number): RecentAction[] {
  const today = new Date();

  // Shuffle and pick 10
  const shuffled = [...RECENT_ACTION_SEEDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, 10);

  return selected
    .map((seed) => {
      const daysAgo =
        Math.abs(seed.dayOffset[0]) +
        Math.floor(rng() * (Math.abs(seed.dayOffset[1]) - Math.abs(seed.dayOffset[0])));
      const actionDate = new Date(today);
      actionDate.setDate(actionDate.getDate() - daysAgo);

      return {
        date: actionDate.toISOString().slice(0, 10),
        action: seed.action,
        target: seed.target,
        authority: seed.authority,
        description: seed.description,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function generateTradeFlowImpact(rng: () => number): TradeFlowImpact {
  const baseTotalTradeAffected = 2.8;
  const basePctGlobalTrade = 11.2;

  const tradeJitter = (rng() - 0.5) * 0.4;
  const pctJitter = (rng() - 0.5) * 1.5;

  return {
    totalTradeAffectedTrillions: roundTo(baseTotalTradeAffected + tradeJitter, 2),
    pctGlobalTrade: roundTo(basePctGlobalTrade + pctJitter, 1),
    mostAffectedSectors: [
      'Energy & petroleum',
      'Financial services',
      'Semiconductors & technology',
      'Defense & dual-use goods',
      'Metals & mining',
      'Maritime shipping & insurance',
    ],
  };
}

function generateComplianceAlerts(rng: () => number): ComplianceAlert[] {
  const shuffled = [...COMPLIANCE_ALERT_SEEDS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, 5).map((seed) => ({
    severity: seed.severity,
    entity: seed.entity,
    issue: seed.issue,
    recommendation: seed.recommendation,
  }));
}

function generateSanctionsMonitorData(): SanctionsMonitorResponse {
  const rng = seededRandom('sanctions-monitor');

  const regimes = generateRegimes(rng);
  const globalStats = generateGlobalStats(regimes, rng);
  const recentActions = generateRecentActions(rng);
  const tradeFlowImpact = generateTradeFlowImpact(rng);
  const complianceAlerts = generateComplianceAlerts(rng);

  return {
    regimes,
    globalStats,
    recentActions,
    tradeFlowImpact,
    complianceAlerts,
    timestamp: new Date().toISOString(),
  };
}

// ── Cache (5min TTL, stale fallback) ──

let cache: { data: SanctionsMonitorResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};
const CACHE_TTL = 5 * 60_000;

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generateSanctionsMonitorData();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SanctionsMonitor] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate sanctions monitor data' });
  }
});

export default router;
