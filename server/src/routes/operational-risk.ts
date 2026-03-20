import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Constants --

const BASEL_II_CATEGORIES = [
  'Internal Fraud',
  'External Fraud',
  'Employment Practices & Workplace Safety',
  'Clients, Products & Business Practices',
  'Damage to Physical Assets',
  'Business Disruption & System Failures',
  'Execution, Delivery & Process Management',
] as const;

const BUSINESS_LINES = ['Trading', 'Banking', 'Asset Management', 'Operations', 'Technology'] as const;

const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
const EVENT_STATUSES = ['open', 'investigating', 'resolved', 'mitigated'] as const;
const TRENDS = ['increasing', 'decreasing', 'stable'] as const;
const KRI_STATUSES = ['green', 'amber', 'red'] as const;

const LOSS_EVENT_DESCRIPTIONS: Record<string, string[]> = {
  'Internal Fraud': [
    'Unauthorized trading activity detected in FX desk',
    'Employee misappropriation of client funds',
    'Falsified expense reports across multiple departments',
  ],
  'External Fraud': [
    'Phishing attack compromised employee credentials',
    'Wire transfer fraud via spoofed vendor invoice',
    'ATM skimming ring affecting retail branches',
  ],
  'Employment Practices & Workplace Safety': [
    'Wrongful termination lawsuit settlement',
    'Workplace harassment complaint resulting in regulatory fine',
    'Employee injury due to inadequate safety protocols',
  ],
  'Clients, Products & Business Practices': [
    'Mis-selling of structured products to retail clients',
    'Suitability violation in advisory portfolio allocation',
    'Failure to disclose material conflicts of interest',
  ],
  'Damage to Physical Assets': [
    'Fire damage to secondary data center facility',
    'Flood damage to regional office equipment',
    'Vandalism at branch office during civil unrest',
  ],
  'Business Disruption & System Failures': [
    'Core trading platform outage lasting 4 hours',
    'Payment processing system failure during peak hours',
    'Network infrastructure failure affecting all branches',
  ],
  'Execution, Delivery & Process Management': [
    'Failed trade settlement due to manual entry error',
    'Incorrect corporate action processing on dividend date',
    'Delayed regulatory filing due to data reconciliation failure',
  ],
};

const ROOT_CAUSES = [
  'Process failure',
  'Human error',
  'System malfunction',
  'Inadequate controls',
  'External attack',
  'Vendor failure',
  'Policy violation',
  'Training gap',
  'Communication breakdown',
  'Design flaw',
] as const;

const KRI_DEFINITIONS = [
  { name: 'Failed Trades Count', baseValue: 42, unit: '', amberThreshold: 50, redThreshold: 75 },
  { name: 'System Downtime (minutes)', baseValue: 18, unit: 'min', amberThreshold: 30, redThreshold: 60 },
  { name: 'Customer Complaint Volume', baseValue: 127, unit: '', amberThreshold: 150, redThreshold: 200 },
  { name: 'Trade Processing Error Rate', baseValue: 0.34, unit: '%', amberThreshold: 0.5, redThreshold: 1.0 },
  { name: 'Cybersecurity Incidents', baseValue: 3, unit: '', amberThreshold: 5, redThreshold: 10 },
  { name: 'Manual Process Overrides', baseValue: 85, unit: '', amberThreshold: 100, redThreshold: 150 },
  { name: 'Regulatory Findings Open', baseValue: 7, unit: '', amberThreshold: 10, redThreshold: 15 },
  { name: 'Staff Turnover Rate', baseValue: 8.2, unit: '%', amberThreshold: 12, redThreshold: 18 },
  { name: 'Audit Issues Outstanding', baseValue: 14, unit: '', amberThreshold: 20, redThreshold: 30 },
  { name: 'Vendor SLA Breaches', baseValue: 4, unit: '', amberThreshold: 6, redThreshold: 10 },
] as const;

const STRESS_SCENARIOS = [
  { name: 'Major Cyber Attack', baseEstimatedLoss: 285, baseProbability: 0.08 },
  { name: 'Rogue Trader Event', baseEstimatedLoss: 420, baseProbability: 0.03 },
  { name: 'Pandemic Disruption', baseEstimatedLoss: 195, baseProbability: 0.12 },
  { name: 'Critical Vendor Failure', baseEstimatedLoss: 145, baseProbability: 0.15 },
  { name: 'Regulatory Enforcement Action', baseEstimatedLoss: 230, baseProbability: 0.10 },
] as const;

const CAPITAL_ALLOCATION_BASE: Record<string, { allocated: number; used: number }> = {
  Trading:            { allocated: 180, used: 142 },
  Banking:            { allocated: 125, used: 95 },
  'Asset Management': { allocated: 85, used: 62 },
  Operations:         { allocated: 110, used: 88 },
  Technology:         { allocated: 95, used: 71 },
};

// -- Cache --


let cache: { data: unknown; ts: number } | null = null;

// -- Generator --

function generate() {
  const rng = seededRandom('operational-risk');
  const jitter = (base: number, pct: number) => base * (1 + (rng() - 0.5) * 2 * pct);
  const roundTo = (v: number, d: number) => { const f = 10 ** d; return Math.round(v * f) / f; };
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

  // -- 1. OpRisk Summary --

  const totalLossesYTD = roundTo(jitter(347.8, 0.15), 1);
  const lossEventCount = Math.floor(jitter(89, 0.12));
  const avgLossSeverity = roundTo(totalLossesYTD / lossEventCount, 2);
  const topLossCategory = BASEL_II_CATEGORIES[Math.floor(rng() * 3) + 3]; // bias toward clients/products or execution
  const operationalVaR = roundTo(jitter(142.5, 0.10), 1);
  const capitalCharge = roundTo(jitter(215.3, 0.08), 1);

  const summary = {
    totalLossesYTD_M: totalLossesYTD,
    lossEventCount,
    avgLossSeverity_M: avgLossSeverity,
    topLossCategory,
    operationalVaR_999_M: operationalVaR,
    capitalCharge_M: capitalCharge,
  };

  // -- 2. Loss Events (15) --

  const today = new Date();
  const lossEvents = Array.from({ length: 15 }, (_, i) => {
    const category = BASEL_II_CATEGORIES[Math.floor(rng() * BASEL_II_CATEGORIES.length)];
    const descriptions = LOSS_EVENT_DESCRIPTIONS[category];
    const description = descriptions[Math.floor(rng() * descriptions.length)];
    const daysAgo = Math.floor(rng() * 180);
    const eventDate = new Date(today.getTime() - daysAgo * 86400000);
    const severity = pick(SEVERITY_LEVELS);
    const baseLossMap: Record<string, number> = { low: 50000, medium: 350000, high: 1800000, critical: 8500000 };
    const lossAmount = Math.round(jitter(baseLossMap[severity], 0.40));

    return {
      id: `OPR-${String(2024000 + i * 7 + Math.floor(rng() * 5)).slice(0, 7)}`,
      date: eventDate.toISOString().slice(0, 10),
      category,
      description,
      lossAmount,
      businessLine: pick(BUSINESS_LINES),
      severity,
      status: pick(EVENT_STATUSES),
      rootCause: pick(ROOT_CAUSES),
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  // -- 3. Loss Distribution by Category --

  const lossDistribution = BASEL_II_CATEGORIES.map(category => {
    const eventCount = Math.floor(jitter(12, 0.35)) + 1;
    const avgLoss = roundTo(jitter(2.8, 0.50), 1);
    const totalLosses = roundTo(avgLoss * eventCount, 1);
    const maxSingleLoss = roundTo(avgLoss * jitter(3.2, 0.30), 1);
    const trend = pick(TRENDS);

    return {
      category,
      eventCount,
      totalLosses_M: totalLosses,
      avgLoss_M: avgLoss,
      maxSingleLoss_M: maxSingleLoss,
      trend,
    };
  });

  // -- 4. Key Risk Indicators --

  const keyRiskIndicators = KRI_DEFINITIONS.map(kri => {
    const currentValue = roundTo(jitter(kri.baseValue, 0.25), kri.baseValue < 1 ? 2 : 0);
    let status: typeof KRI_STATUSES[number];
    if (currentValue >= kri.redThreshold) {
      status = 'red';
    } else if (currentValue >= kri.amberThreshold) {
      status = 'amber';
    } else {
      status = 'green';
    }
    const trend = pick(TRENDS);

    return {
      name: kri.name,
      currentValue,
      unit: kri.unit,
      threshold: { amber: kri.amberThreshold, red: kri.redThreshold },
      status,
      trend,
    };
  });

  // -- 5. Scenario Analysis --

  const scenarioAnalysis = STRESS_SCENARIOS.map(scenario => {
    const estimatedLoss = roundTo(jitter(scenario.baseEstimatedLoss, 0.15), 1);
    const probability = roundTo(jitter(scenario.baseProbability, 0.20), 3);
    const expectedLoss = roundTo(estimatedLoss * probability, 2);

    return {
      scenario: scenario.name,
      estimatedLoss_M: estimatedLoss,
      probability,
      expectedLoss_M: expectedLoss,
    };
  });

  // -- 6. Risk Capital Allocation --

  const riskCapitalAllocation = BUSINESS_LINES.map(line => {
    const base = CAPITAL_ALLOCATION_BASE[line];
    const allocated = roundTo(jitter(base.allocated, 0.08), 1);
    const used = roundTo(jitter(base.used, 0.12), 1);
    const utilization = roundTo((used / allocated) * 100, 1);

    return {
      businessLine: line,
      allocatedCapital_M: allocated,
      usedCapital_M: used,
      utilization,
    };
  });

  return {
    summary,
    lossEvents,
    lossDistribution,
    keyRiskIndicators,
    scenarioAnalysis,
    riskCapitalAllocation,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cache.ts < CACHE_TTL) return res.json(cache.data);
    const data = generate();
    cache = { data, ts: now };
    res.json(data);
  } catch (err) {
    console.error('[OperationalRisk] Error:', (err as Error).message);
    if (cache) return res.json(cache.data);
    res.status(500).json({ error: 'Failed to generate operational risk data' });
  }
});

export default router;
