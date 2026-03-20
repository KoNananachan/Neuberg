import { Router } from 'express';

import { mulberry32, hashSeed, seededRandom, CACHE_TTL } from '../lib/seeded-data';
const router = Router();

// -- Helpers --

function roundTo(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

function jitter(rng: () => number, base: number, pct: number): number {
  return base * (1 + (rng() - 0.5) * 2 * pct);
}

// -- Interfaces --

interface MarketOverview {
  globalDigitalPaymentsVolumeTn: number;
  fintechFundingYTDBn: number;
  totalNeobankUsersM: number;
  averageBNPLTakeRatePct: number;
  realTimePaymentsGrowthYoYPct: number;
  digitalWalletUsersGlobalBn: number;
  embeddedFinanceMarketSizeBn: number;
  crossBorderPaymentsVolumeTn: number;
}

interface PaymentProcessor {
  company: string;
  quarterlyTPVBn: number;
  revenueQBn: number;
  takeRatePct: number;
  revenueGrowthYoYPct: number;
  marketCapBn: number;
  psRatio: number;
  activeAccountsM: number;
  processorType: string;
}

interface Neobank {
  company: string;
  country: string;
  usersM: number;
  depositsBn: number;
  revenueM: number;
  valuationBn: number;
  lastFundingRound: string;
  breakevenStatus: string;
  nimPct: number;
  cacUSD: number;
  ltvUSD: number;
}

interface BNPLProvider {
  company: string;
  gmvBn: number;
  revenueM: number;
  takeRatePct: number;
  lossRatePct: number;
  activeUsersM: number;
  merchantCount: number;
}

interface FundingDeal {
  company: string;
  round: string;
  amountM: number;
  valuationBn: number;
  leadInvestor: string;
  date: string;
  category: string;
}

interface RealTimePaymentNetwork {
  country: string;
  network: string;
  monthlyVolumesBn: number;
  yoyGrowthPct: number;
  adoptionRatePct: number;
  launchYear: number;
  avgTransactionUSD: number;
}

interface FintechDigitalPaymentsResponse {
  marketOverview: MarketOverview;
  paymentProcessors: PaymentProcessor[];
  neobanks: Neobank[];
  bnplMarket: BNPLProvider[];
  fundingAndDeals: FundingDeal[];
  realTimePayments: RealTimePaymentNetwork[];
  generatedAt: string;
}

// -- Seed Data --

const PAYMENT_PROCESSOR_SEEDS = [
  { company: 'Visa', tpvBn: 3420, revBn: 9.3, takeRatePct: 0.27, growthPct: 10.2, marketCapBn: 595, psRatio: 16.0, accountsM: 4200, type: 'Card Network' },
  { company: 'Mastercard', tpvBn: 2380, revBn: 7.1, takeRatePct: 0.30, growthPct: 12.5, marketCapBn: 430, psRatio: 15.2, accountsM: 3100, type: 'Card Network' },
  { company: 'PayPal', tpvBn: 410, revBn: 7.8, takeRatePct: 1.90, growthPct: 6.8, marketCapBn: 72, psRatio: 2.3, accountsM: 428, type: 'Digital Wallet' },
  { company: 'Square (Block)', tpvBn: 62, revBn: 5.9, takeRatePct: 2.75, growthPct: 18.4, marketCapBn: 44, psRatio: 1.9, accountsM: 56, type: 'Merchant Acquirer' },
  { company: 'Stripe (est.)', tpvBn: 320, revBn: 5.2, takeRatePct: 1.62, growthPct: 25.0, marketCapBn: 95, psRatio: 4.6, accountsM: 4.5, type: 'Payment Infrastructure' },
  { company: 'Adyen', tpvBn: 310, revBn: 2.1, takeRatePct: 0.68, growthPct: 22.3, marketCapBn: 52, psRatio: 6.2, accountsM: 0.012, type: 'Unified Commerce' },
  { company: 'Fiserv', tpvBn: 580, revBn: 5.1, takeRatePct: 0.88, growthPct: 8.7, marketCapBn: 95, psRatio: 4.7, accountsM: 1800, type: 'Financial Technology' },
  { company: 'Global Payments', tpvBn: 290, revBn: 2.5, takeRatePct: 0.86, growthPct: 5.9, marketCapBn: 26, psRatio: 2.6, accountsM: 950, type: 'Merchant Solutions' },
];

const NEOBANK_SEEDS = [
  { company: 'Nubank', country: 'Brazil', usersM: 105, depositsBn: 22.5, revenueM: 2800, valuationBn: 58, lastRound: 'Public (NYSE: NU)', breakeven: 'Profitable', nimPct: 18.2, cacUSD: 5.0, ltvUSD: 380 },
  { company: 'Revolut', country: 'UK', usersM: 45, depositsBn: 18.2, revenueM: 2200, valuationBn: 45, lastRound: 'Secondary $500M', breakeven: 'Profitable', nimPct: 5.8, cacUSD: 28, ltvUSD: 420 },
  { company: 'Chime', country: 'US', usersM: 22, depositsBn: 14.5, revenueM: 1850, valuationBn: 25, lastRound: 'Series G $750M', breakeven: 'Near breakeven', nimPct: 3.2, cacUSD: 42, ltvUSD: 510 },
  { company: 'N26', country: 'Germany', usersM: 8, depositsBn: 4.8, revenueM: 380, valuationBn: 3.5, lastRound: 'Series E $900M', breakeven: 'Not yet', nimPct: 2.8, cacUSD: 65, ltvUSD: 290 },
  { company: 'Monzo', country: 'UK', usersM: 9.5, depositsBn: 6.2, revenueM: 620, valuationBn: 5.2, lastRound: 'Series I $430M', breakeven: 'Profitable', nimPct: 4.5, cacUSD: 35, ltvUSD: 340 },
  { company: 'WeBank', country: 'China', usersM: 380, depositsBn: 52.0, revenueM: 4100, valuationBn: 32, lastRound: 'Private (Tencent-backed)', breakeven: 'Profitable', nimPct: 6.1, cacUSD: 2.5, ltvUSD: 95 },
  { company: 'KakaoBank', country: 'South Korea', usersM: 24, depositsBn: 28.0, revenueM: 1420, valuationBn: 15, lastRound: 'Public (KRX: 323410)', breakeven: 'Profitable', nimPct: 2.1, cacUSD: 12, ltvUSD: 260 },
  { company: 'SoFi', country: 'US', usersM: 9.4, depositsBn: 21.5, revenueM: 2450, valuationBn: 14, lastRound: 'Public (NASDAQ: SOFI)', breakeven: 'Profitable', nimPct: 5.9, cacUSD: 55, ltvUSD: 620 },
];

const BNPL_SEEDS = [
  { company: 'Klarna', gmvBn: 98, revenueM: 2600, takeRatePct: 2.65, lossRatePct: 0.68, activeUsersM: 150, merchantCount: 575000 },
  { company: 'Affirm', gmvBn: 28, revenueM: 2100, takeRatePct: 7.50, lossRatePct: 2.10, activeUsersM: 19, merchantCount: 303000 },
  { company: 'Afterpay (Block)', gmvBn: 25, revenueM: 780, takeRatePct: 3.12, lossRatePct: 1.05, activeUsersM: 24, merchantCount: 122000 },
  { company: 'Zip', gmvBn: 9.5, revenueM: 620, takeRatePct: 6.53, lossRatePct: 2.45, activeUsersM: 6.3, merchantCount: 78000 },
  { company: 'Sezzle', gmvBn: 2.8, revenueM: 230, takeRatePct: 8.21, lossRatePct: 1.80, activeUsersM: 4.1, merchantCount: 48000 },
  { company: 'PayPal Pay Later', gmvBn: 32, revenueM: 950, takeRatePct: 2.97, lossRatePct: 0.82, activeUsersM: 35, merchantCount: 430000 },
];

const FUNDING_DEAL_SEEDS = [
  { company: 'Stripe', round: 'Secondary Sale', amountM: 694, valuationBn: 91.5, leadInvestor: 'Sequoia Capital', dateOffset: 18, category: 'Payment Infrastructure' },
  { company: 'Plaid', round: 'Series D Extension', amountM: 425, valuationBn: 15.0, leadInvestor: 'Ribbit Capital', dateOffset: 32, category: 'Open Banking' },
  { company: 'Rapyd', round: 'Series E', amountM: 610, valuationBn: 12.0, leadInvestor: 'General Atlantic', dateOffset: 45, category: 'Payments-as-a-Service' },
  { company: 'Nuvei', round: 'Take-Private', amountM: 6300, valuationBn: 6.3, leadInvestor: 'Advent International', dateOffset: 60, category: 'Payment Processing' },
  { company: 'Zepz (WorldRemit)', round: 'Series F', amountM: 380, valuationBn: 4.8, leadInvestor: 'Accel Partners', dateOffset: 75, category: 'Cross-Border Remittance' },
  { company: 'MoonPay', round: 'Series B', amountM: 555, valuationBn: 3.4, leadInvestor: 'Tiger Global', dateOffset: 90, category: 'Crypto Payments' },
];

const RTP_SEEDS = [
  { country: 'India', network: 'UPI', monthlyVolBn: 16.8, yoyGrowthPct: 42, adoptionPct: 78, launchYear: 2016, avgTxUSD: 12 },
  { country: 'Brazil', network: 'Pix', monthlyVolBn: 5.2, yoyGrowthPct: 65, adoptionPct: 72, launchYear: 2020, avgTxUSD: 45 },
  { country: 'Thailand', network: 'PromptPay', monthlyVolBn: 2.1, yoyGrowthPct: 38, adoptionPct: 65, launchYear: 2017, avgTxUSD: 28 },
  { country: 'UK', network: 'Faster Payments (FPS)', monthlyVolBn: 0.85, yoyGrowthPct: 18, adoptionPct: 88, launchYear: 2008, avgTxUSD: 620 },
  { country: 'US', network: 'FedNow / RTP', monthlyVolBn: 0.42, yoyGrowthPct: 185, adoptionPct: 12, launchYear: 2023, avgTxUSD: 850 },
  { country: 'EU', network: 'SEPA Instant', monthlyVolBn: 1.35, yoyGrowthPct: 52, adoptionPct: 34, launchYear: 2017, avgTxUSD: 480 },
  { country: 'Nigeria', network: 'NIP (NIBSS)', monthlyVolBn: 1.1, yoyGrowthPct: 28, adoptionPct: 45, launchYear: 2011, avgTxUSD: 18 },
];

// -- Data Generation --

function generate(): FintechDigitalPaymentsResponse {
  const rng = seededRandom('fintech-payments');

  // -- Market Overview --
  const marketOverview: MarketOverview = {
    globalDigitalPaymentsVolumeTn: roundTo(jitter(rng, 11.6, 0.04), 1),
    fintechFundingYTDBn: roundTo(jitter(rng, 42.5, 0.08), 1),
    totalNeobankUsersM: Math.round(jitter(rng, 480, 0.05)),
    averageBNPLTakeRatePct: roundTo(jitter(rng, 4.15, 0.06), 2),
    realTimePaymentsGrowthYoYPct: roundTo(jitter(rng, 38.5, 0.08), 1),
    digitalWalletUsersGlobalBn: roundTo(jitter(rng, 3.6, 0.04), 2),
    embeddedFinanceMarketSizeBn: roundTo(jitter(rng, 138, 0.06), 1),
    crossBorderPaymentsVolumeTn: roundTo(jitter(rng, 1.9, 0.05), 2),
  };

  // -- Payment Processors --
  const paymentProcessors: PaymentProcessor[] = PAYMENT_PROCESSOR_SEEDS.map(p => ({
    company: p.company,
    quarterlyTPVBn: roundTo(jitter(rng, p.tpvBn, 0.06), 1),
    revenueQBn: roundTo(jitter(rng, p.revBn, 0.05), 2),
    takeRatePct: roundTo(jitter(rng, p.takeRatePct, 0.04), 3),
    revenueGrowthYoYPct: roundTo(jitter(rng, p.growthPct, 0.1), 1),
    marketCapBn: roundTo(jitter(rng, p.marketCapBn, 0.06), 1),
    psRatio: roundTo(jitter(rng, p.psRatio, 0.08), 1),
    activeAccountsM: roundTo(jitter(rng, p.accountsM, 0.04), 1),
    processorType: p.type,
  }));

  // -- Neobanks & Digital Banks --
  const neobanks: Neobank[] = NEOBANK_SEEDS.map(n => ({
    company: n.company,
    country: n.country,
    usersM: roundTo(jitter(rng, n.usersM, 0.06), 1),
    depositsBn: roundTo(jitter(rng, n.depositsBn, 0.08), 1),
    revenueM: Math.round(jitter(rng, n.revenueM, 0.07)),
    valuationBn: roundTo(jitter(rng, n.valuationBn, 0.1), 1),
    lastFundingRound: n.lastRound,
    breakevenStatus: n.breakeven,
    nimPct: roundTo(jitter(rng, n.nimPct, 0.08), 2),
    cacUSD: roundTo(jitter(rng, n.cacUSD, 0.1), 1),
    ltvUSD: Math.round(jitter(rng, n.ltvUSD, 0.08)),
  }));

  // -- BNPL Market --
  const bnplMarket: BNPLProvider[] = BNPL_SEEDS.map(b => ({
    company: b.company,
    gmvBn: roundTo(jitter(rng, b.gmvBn, 0.07), 1),
    revenueM: Math.round(jitter(rng, b.revenueM, 0.06)),
    takeRatePct: roundTo(jitter(rng, b.takeRatePct, 0.05), 2),
    lossRatePct: roundTo(jitter(rng, b.lossRatePct, 0.12), 2),
    activeUsersM: roundTo(jitter(rng, b.activeUsersM, 0.06), 1),
    merchantCount: Math.round(jitter(rng, b.merchantCount, 0.05)),
  }));

  // -- Funding & Deals --
  const now = new Date();
  const fundingAndDeals: FundingDeal[] = FUNDING_DEAL_SEEDS.map(f => {
    const dealDate = new Date(now);
    dealDate.setDate(dealDate.getDate() - Math.round(jitter(rng, f.dateOffset, 0.15)));
    return {
      company: f.company,
      round: f.round,
      amountM: Math.round(jitter(rng, f.amountM, 0.08)),
      valuationBn: roundTo(jitter(rng, f.valuationBn, 0.1), 1),
      leadInvestor: f.leadInvestor,
      date: dealDate.toISOString().slice(0, 10),
      category: f.category,
    };
  });

  // -- Real-Time Payments --
  const realTimePayments: RealTimePaymentNetwork[] = RTP_SEEDS.map(r => ({
    country: r.country,
    network: r.network,
    monthlyVolumesBn: roundTo(jitter(rng, r.monthlyVolBn, 0.08), 2),
    yoyGrowthPct: roundTo(jitter(rng, r.yoyGrowthPct, 0.1), 1),
    adoptionRatePct: roundTo(Math.min(99, jitter(rng, r.adoptionPct, 0.06)), 1),
    launchYear: r.launchYear,
    avgTransactionUSD: Math.round(jitter(rng, r.avgTxUSD, 0.08)),
  }));

  return {
    marketOverview,
    paymentProcessors,
    neobanks,
    bnplMarket,
    fundingAndDeals,
    realTimePayments,
    generatedAt: new Date().toISOString(),
  };
}

// -- Cache (5min TTL, stale fallback) --

let cacheData: FintechDigitalPaymentsResponse | null = null;
let cacheTime = 0;


// -- Route --

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cacheData && now - cacheTime < CACHE_TTL) {
      return res.json(cacheData);
    }

    const data = generate();
    cacheData = data;
    cacheTime = now;
    res.json(data);
  } catch (err: unknown) {
    console.error('[FintechDigitalPayments] Error:', err instanceof Error ? err.message : String(err));
    if (cacheData) {
      return res.json(cacheData);
    }
    res.status(500).json({ error: 'Failed to generate fintech digital payments data' });
  }
});

export default router;
