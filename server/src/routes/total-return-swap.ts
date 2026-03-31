import { Router } from 'express';

import { mulberry32, hashSeed, CACHE_TTL } from '../lib/seeded-data.js';
const router = Router();

// -- Deterministic seeded RNG --

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// -- Types --

interface EquityTRS {
  underlying: string;
  financingSpread: number;
  totalReturn1M: number;
  totalReturn3M: number;
  notionalOutstanding: number;
  rollDate: string;
  counterpartyCount: number;
}

interface CreditTRS {
  reference: string;
  financingSpread: number;
  totalReturn1M: number;
  notionalOutstanding: number;
  fundingAdvantage: number;
  assetSwapSpread: number;
}

interface FundingRates {
  sofr: number;
  sofrSpread: number;
  term1M: number;
  term3M: number;
  term6M: number;
  haircut_Equity: number;
  haircut_Credit: number;
  haircut_EM: number;
}

interface LeverageMetrics {
  avgHedgeFundLeverage: number;
  grossExposure: number;
  netExposure: number;
  syntheticVsPhysical: number;
  marginCallFrequency: 'low' | 'moderate' | 'elevated';
}

interface CounterpartyExposure {
  dealer: string;
  marketShare: number;
  avgSpread: number;
  creditRating: string;
  cvaCharge: number;
}

interface RegulatoryMetrics {
  initialMarginRequired: number;
  variationMarginDaily: number;
  uncleared: number;
  baselIIICapitalCharge: number;
  reportingCompliance: 'full' | 'partial';
}

interface TotalReturnSwapResponse {
  equityTRS: EquityTRS[];
  creditTRS: CreditTRS[];
  fundingRates: FundingRates;
  leverageMetrics: LeverageMetrics;
  counterpartyExposure: CounterpartyExposure[];
  regulatoryMetrics: RegulatoryMetrics;
  generatedAt: string;
}

// -- Configurations --

const EQUITY_UNDERLYINGS = [
  'S&P 500', 'Euro Stoxx 50', 'Nikkei 225', 'FTSE 100',
  'MSCI EM', 'Russell 2000', 'DAX', 'Hang Seng',
];

const CREDIT_REFERENCES = [
  'CDX.NA.IG', 'CDX.NA.HY', 'iTraxx Main', 'LCDX', 'iTraxx Xover',
];

const DEALER_NAMES = [
  'Goldman Sachs', 'Morgan Stanley', 'JPMorgan',
  'Barclays', 'BNP Paribas', 'Citi',
];

const DEALER_RATINGS = ['AA-', 'A+', 'AA-', 'A', 'A+', 'A+'];

// -- Cache --


let cache: { data: TotalReturnSwapResponse | null; expiresAt: number } = {
  data: null,
  expiresAt: 0,
};

// -- Data generation --

function generate(): TotalReturnSwapResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed('total-return-swap-' + today));

  const lerp = (min: number, max: number) => min + rng() * (max - min);

  // -- 1. Equity TRS --

  const rollMonths = ['2026-04-18', '2026-06-19', '2026-09-18', '2026-12-18'];

  const equityTRS: EquityTRS[] = EQUITY_UNDERLYINGS.map((underlying) => {
    const financingSpread = round(lerp(-20, 80), 1);
    const totalReturn1M = round(lerp(-5, 6), 2);
    const totalReturn3M = round(lerp(-10, 15), 2);
    const notionalOutstanding = round(lerp(15, 180), 1);
    const rollDate = rollMonths[Math.floor(rng() * rollMonths.length)];
    const counterpartyCount = Math.floor(lerp(3, 18));

    return {
      underlying,
      financingSpread,
      totalReturn1M,
      totalReturn3M,
      notionalOutstanding,
      rollDate,
      counterpartyCount,
    };
  });

  // -- 2. Credit TRS --

  const creditTRS: CreditTRS[] = CREDIT_REFERENCES.map((reference) => {
    const financingSpread = round(lerp(10, 120), 1);
    const totalReturn1M = round(lerp(-3, 4), 2);
    const notionalOutstanding = round(lerp(5, 60), 1);
    const fundingAdvantage = round(lerp(-10, 40), 1);
    const assetSwapSpread = round(lerp(20, 200), 1);

    return {
      reference,
      financingSpread,
      totalReturn1M,
      notionalOutstanding,
      fundingAdvantage,
      assetSwapSpread,
    };
  });

  // -- 3. Funding Rates --

  const sofr = round(lerp(4.80, 5.40), 4);
  const sofrSpread = round(lerp(-5, 15), 1);
  const term1M = round(lerp(4.85, 5.35), 4);
  const term3M = round(lerp(4.80, 5.30), 4);
  const term6M = round(lerp(4.70, 5.25), 4);
  const haircut_Equity = round(clamp(lerp(5, 20), 5, 20), 1);
  const haircut_Credit = round(clamp(lerp(2, 10), 2, 10), 1);
  const haircut_EM = round(clamp(lerp(10, 30), 10, 30), 1);

  const fundingRates: FundingRates = {
    sofr,
    sofrSpread,
    term1M,
    term3M,
    term6M,
    haircut_Equity,
    haircut_Credit,
    haircut_EM,
  };

  // -- 4. Leverage Metrics --

  const avgHedgeFundLeverage = round(clamp(lerp(2, 6), 2, 6), 2);
  const grossExposure = round(lerp(180, 350), 1);
  const netExposure = round(lerp(30, 80), 1);
  const syntheticVsPhysical = round(lerp(0.5, 2.5), 2);
  const mcfVal = rng();
  const marginCallFrequency: 'low' | 'moderate' | 'elevated' =
    mcfVal < 0.4 ? 'low' : mcfVal < 0.75 ? 'moderate' : 'elevated';

  const leverageMetrics: LeverageMetrics = {
    avgHedgeFundLeverage,
    grossExposure,
    netExposure,
    syntheticVsPhysical,
    marginCallFrequency,
  };

  // -- 5. Counterparty Exposure --

  const rawShares = DEALER_NAMES.map(() => lerp(8, 25));
  const totalRaw = rawShares.reduce((s, v) => s + v, 0);

  const counterpartyExposure: CounterpartyExposure[] = DEALER_NAMES.map((dealer, i) => {
    const marketShare = round((rawShares[i] / totalRaw) * 100, 1);
    const avgSpread = round(lerp(15, 65), 1);
    const creditRating = DEALER_RATINGS[i];
    const cvaCharge = round(lerp(2, 12), 1);

    return { dealer, marketShare, avgSpread, creditRating, cvaCharge };
  });

  // -- 6. Regulatory Metrics --

  const initialMarginRequired = round(lerp(40, 120), 1);
  const variationMarginDaily = round(lerp(2, 15), 1);
  const uncleared = round(lerp(15, 45), 1);
  const baselIIICapitalCharge = round(lerp(5, 18), 1);
  const rcVal = rng();
  const reportingCompliance: 'full' | 'partial' = rcVal < 0.65 ? 'full' : 'partial';

  const regulatoryMetrics: RegulatoryMetrics = {
    initialMarginRequired,
    variationMarginDaily,
    uncleared,
    baselIIICapitalCharge,
    reportingCompliance,
  };

  return {
    equityTRS,
    creditTRS,
    fundingRates,
    leverageMetrics,
    counterpartyExposure,
    regulatoryMetrics,
    generatedAt: new Date().toISOString(),
  };
}

// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now < cache.expiresAt) {
      return res.json(cache.data);
    }

    const data = generate();
    cache = { data, expiresAt: now + CACHE_TTL };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[TotalReturnSwap] Error:', message);
    if (cache.data) {
      return res.json(cache.data);
    }
    res.status(500).json({ error: 'Failed to generate total return swap data' });
  }
});

export default router;
