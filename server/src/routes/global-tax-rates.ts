import { Router } from 'express';

const router = Router();

// ── PRNG ──

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

// ── Types ──

interface CorporateTax {
  headline: number;
  effective: number;
  sme: number;
  combined: number;
}

interface PersonalIncomeTax {
  topRate: number;
  middleRate: number;
  lowerRate: number;
  threshold: string;
}

interface VAT {
  standard: number;
  reduced: number;
  exempt: string[];
}

interface CapitalGains {
  shortTerm: number;
  longTerm: number;
  qualified: number;
}

interface DividendTax {
  domestic: number;
  withholding: number;
}

interface SocialSecurity {
  employer: number;
  employee: number;
  cap: string;
}

interface PropertyTax {
  exists: boolean;
  rate: number;
}

interface DigitalServicesTax {
  exists: boolean;
  rate: number;
}

interface MinimumTax {
  exists: boolean;
  rate: number;
  pillar2Compliant: boolean;
}

interface RecentChange {
  change: string;
  effectiveDate: string;
  impact: string;
}

interface CountryTaxData {
  country: string;
  code: string;
  region: string;
  corporateTax: CorporateTax;
  personalIncomeTax: PersonalIncomeTax;
  vat: VAT;
  capitalGains: CapitalGains;
  dividendTax: DividendTax;
  socialSecurity: SocialSecurity;
  propertyTax: PropertyTax;
  digitalServicesTax: DigitalServicesTax;
  minimumTax: MinimumTax;
  taxCompetitiveness: number;
  recentChanges: RecentChange[];
}

interface GlobalAverages {
  avgCorporate: number;
  avgTopIncome: number;
  avgVAT: number;
  avgCapGains: number;
}

interface OECDStats {
  avgCorporate: number;
  avgTopIncome: number;
  medianVAT: number;
}

interface TaxTrend {
  trend: string;
  description: string;
}

interface TaxFreedomDay {
  country: string;
  code: string;
  dayOfYear: number;
  date: string;
}

interface GlobalTaxRatesResponse {
  countries: CountryTaxData[];
  globalAverages: GlobalAverages;
  oecdStats: OECDStats;
  taxTrends: TaxTrend[];
  taxFreedomDay: TaxFreedomDay[];
  timestamp: string;
}

// ── Cache ──

let cache: { data: GlobalTaxRatesResponse | null; ts: number } = {
  data: null,
  ts: 0,
};
const TTL = 5 * 60 * 1000;

// ── Static country tax configurations (2025-2026 values) ──

interface CountryConfig {
  country: string;
  code: string;
  region: string;
  corporateTax: CorporateTax;
  personalIncomeTax: PersonalIncomeTax;
  vat: VAT;
  capitalGains: CapitalGains;
  dividendTax: DividendTax;
  socialSecurity: SocialSecurity;
  propertyTax: PropertyTax;
  digitalServicesTax: DigitalServicesTax;
  minimumTax: MinimumTax;
  baseCompetitiveness: number;
  recentChanges: RecentChange[];
  taxFreedomDayBase: number;
}

const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    country: 'United States',
    code: 'US',
    region: 'North America',
    corporateTax: { headline: 21, effective: 17.8, sme: 21, combined: 25.8 },
    personalIncomeTax: { topRate: 37, middleRate: 24, lowerRate: 12, threshold: '$578,126+' },
    vat: { standard: 0, reduced: 0, exempt: ['No federal VAT/GST'] },
    capitalGains: { shortTerm: 37, longTerm: 20, qualified: 20 },
    dividendTax: { domestic: 20, withholding: 30 },
    socialSecurity: { employer: 7.65, employee: 7.65, cap: '$168,600 (SS portion)' },
    propertyTax: { exists: true, rate: 1.1 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 68,
    recentChanges: [
      { change: 'Pillar Two QDMTT under consideration', effectiveDate: '2026-01-01', impact: 'May affect multinationals with >750M EUR revenue' },
      { change: 'TCJA individual provisions set to expire', effectiveDate: '2025-12-31', impact: 'Top rate may revert to 39.6% without extension' },
      { change: 'Corporate AMT 15% on book income', effectiveDate: '2024-01-01', impact: 'Applies to corps with avg $1B+ adjusted financial statement income' },
    ],
    taxFreedomDayBase: 105,
  },
  {
    country: 'United Kingdom',
    code: 'GB',
    region: 'Europe',
    corporateTax: { headline: 25, effective: 22.1, sme: 19, combined: 25 },
    personalIncomeTax: { topRate: 45, middleRate: 40, lowerRate: 20, threshold: 'GBP 125,140+' },
    vat: { standard: 20, reduced: 5, exempt: ['Food', 'Children clothing', 'Books'] },
    capitalGains: { shortTerm: 24, longTerm: 24, qualified: 10 },
    dividendTax: { domestic: 33.75, withholding: 0 },
    socialSecurity: { employer: 13.8, employee: 8, cap: 'No upper limit (2% above UEL)' },
    propertyTax: { exists: true, rate: 0.75 },
    digitalServicesTax: { exists: true, rate: 2 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 60,
    recentChanges: [
      { change: 'Corporate rate increased from 19% to 25%', effectiveDate: '2023-04-01', impact: 'Small profits rate of 19% retained for companies with <50K profits' },
      { change: 'Capital gains tax rates raised', effectiveDate: '2024-10-30', impact: 'Lower rate 18% to 24%, higher rate 28% to 24% (unified)' },
      { change: 'Pillar Two multinational top-up tax enacted', effectiveDate: '2024-01-01', impact: '15% minimum for groups with >750M EUR revenue' },
    ],
    taxFreedomDayBase: 150,
  },
  {
    country: 'Germany',
    code: 'DE',
    region: 'Europe',
    corporateTax: { headline: 15, effective: 27.5, sme: 15, combined: 29.9 },
    personalIncomeTax: { topRate: 45, middleRate: 42, lowerRate: 14, threshold: 'EUR 277,826+' },
    vat: { standard: 19, reduced: 7, exempt: ['Medical services', 'Financial services', 'Education'] },
    capitalGains: { shortTerm: 26.375, longTerm: 26.375, qualified: 26.375 },
    dividendTax: { domestic: 26.375, withholding: 26.375 },
    socialSecurity: { employer: 20.7, employee: 20.4, cap: 'EUR 90,600 (pension, West)' },
    propertyTax: { exists: true, rate: 0.5 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 55,
    recentChanges: [
      { change: 'Solidarity surcharge largely abolished for individuals', effectiveDate: '2021-01-01', impact: 'Still applies to high earners and corporations (5.5% on CIT)' },
      { change: 'Pillar Two minimum tax implemented', effectiveDate: '2024-01-01', impact: 'IIR and UTPR rules for large multinationals' },
      { change: 'Trade tax reform discussions ongoing', effectiveDate: '2026-01-01', impact: 'Potential reduction in combined rate to attract investment' },
    ],
    taxFreedomDayBase: 183,
  },
  {
    country: 'France',
    code: 'FR',
    region: 'Europe',
    corporateTax: { headline: 25, effective: 23.2, sme: 15, combined: 25.83 },
    personalIncomeTax: { topRate: 45, middleRate: 30, lowerRate: 11, threshold: 'EUR 177,106+' },
    vat: { standard: 20, reduced: 5.5, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 30, longTerm: 30, qualified: 12.8 },
    dividendTax: { domestic: 30, withholding: 25 },
    socialSecurity: { employer: 45, employee: 11.3, cap: 'EUR 46,368 (base, some uncapped)' },
    propertyTax: { exists: true, rate: 0.9 },
    digitalServicesTax: { exists: true, rate: 3 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 48,
    recentChanges: [
      { change: 'Corporate rate fully reduced to 25%', effectiveDate: '2022-01-01', impact: 'Down from 33.3% over multi-year schedule' },
      { change: 'Extraordinary contribution on large companies', effectiveDate: '2025-01-01', impact: 'Temporary surtax on companies with >1B EUR revenue' },
      { change: 'Digital services tax maintained at 3%', effectiveDate: '2019-01-01', impact: 'Applies to tech companies with >750M global / 25M FR revenue' },
    ],
    taxFreedomDayBase: 192,
  },
  {
    country: 'Japan',
    code: 'JP',
    region: 'Asia-Pacific',
    corporateTax: { headline: 23.2, effective: 29.7, sme: 15, combined: 29.74 },
    personalIncomeTax: { topRate: 45, middleRate: 33, lowerRate: 10, threshold: 'JPY 40,000,000+' },
    vat: { standard: 10, reduced: 8, exempt: ['Housing rent', 'Medical', 'Education'] },
    capitalGains: { shortTerm: 20.315, longTerm: 20.315, qualified: 20.315 },
    dividendTax: { domestic: 20.315, withholding: 20.42 },
    socialSecurity: { employer: 16.5, employee: 16.5, cap: 'JPY 6,500,000 (health varies)' },
    propertyTax: { exists: true, rate: 1.4 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 53,
    recentChanges: [
      { change: 'Defense tax surcharge proposed', effectiveDate: '2026-04-01', impact: 'Additional 1% corporate surtax for defense spending' },
      { change: 'NISA (tax-free investment) expanded', effectiveDate: '2024-01-01', impact: 'Annual limit raised to JPY 3.6M, lifetime 18M' },
      { change: 'Invoice system for consumption tax', effectiveDate: '2023-10-01', impact: 'Qualified invoice required for input tax credit claims' },
    ],
    taxFreedomDayBase: 160,
  },
  {
    country: 'China',
    code: 'CN',
    region: 'Asia-Pacific',
    corporateTax: { headline: 25, effective: 21.5, sme: 5, combined: 25 },
    personalIncomeTax: { topRate: 45, middleRate: 25, lowerRate: 3, threshold: 'CNY 960,000+' },
    vat: { standard: 13, reduced: 9, exempt: ['Agriculture inputs', 'Contraceptives', 'Antique books'] },
    capitalGains: { shortTerm: 20, longTerm: 20, qualified: 0 },
    dividendTax: { domestic: 20, withholding: 10 },
    socialSecurity: { employer: 30.5, employee: 10.5, cap: 'Local average salary x 3' },
    propertyTax: { exists: true, rate: 1.2 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 58,
    recentChanges: [
      { change: 'SME preferential tax rate extended', effectiveDate: '2025-01-01', impact: 'Effective 5% rate on first CNY 3M for qualifying small enterprises' },
      { change: 'R&D super deduction increased to 120%', effectiveDate: '2024-01-01', impact: 'Manufacturing and tech sectors eligible for enhanced deduction' },
      { change: 'Pillar Two QDMTT under implementation', effectiveDate: '2025-01-01', impact: 'Applies to multinationals with >750M EUR global revenue' },
    ],
    taxFreedomDayBase: 145,
  },
  {
    country: 'India',
    code: 'IN',
    region: 'Asia-Pacific',
    corporateTax: { headline: 25.17, effective: 22.5, sme: 25.17, combined: 25.17 },
    personalIncomeTax: { topRate: 30, middleRate: 20, lowerRate: 5, threshold: 'INR 1,500,000+' },
    vat: { standard: 18, reduced: 5, exempt: ['Unprocessed food', 'Healthcare', 'Education'] },
    capitalGains: { shortTerm: 20, longTerm: 12.5, qualified: 12.5 },
    dividendTax: { domestic: 0, withholding: 20 },
    socialSecurity: { employer: 12, employee: 12, cap: 'INR 15,000/month (EPF base)' },
    propertyTax: { exists: true, rate: 0.5 },
    digitalServicesTax: { exists: true, rate: 2 },
    minimumTax: { exists: false, rate: 0, pillar2Compliant: false },
    baseCompetitiveness: 55,
    recentChanges: [
      { change: 'New manufacturing company rate of 15%', effectiveDate: '2019-10-01', impact: 'Available for new manufacturing companies incorporated after Oct 2019' },
      { change: 'Capital gains tax reformed', effectiveDate: '2024-07-23', impact: 'LTCG on equity raised from 10% to 12.5%, STCG from 15% to 20%' },
      { change: 'Equalization levy (digital tax) under review', effectiveDate: '2025-04-01', impact: 'May be withdrawn if Pillar One adopted' },
    ],
    taxFreedomDayBase: 118,
  },
  {
    country: 'Canada',
    code: 'CA',
    region: 'North America',
    corporateTax: { headline: 15, effective: 24.5, sme: 9, combined: 26.2 },
    personalIncomeTax: { topRate: 33, middleRate: 26, lowerRate: 15, threshold: 'CAD 235,675+' },
    vat: { standard: 5, reduced: 0, exempt: ['Basic groceries', 'Medical devices', 'Childcare'] },
    capitalGains: { shortTerm: 26.76, longTerm: 26.76, qualified: 16.5 },
    dividendTax: { domestic: 15.02, withholding: 25 },
    socialSecurity: { employer: 6.4, employee: 6.4, cap: 'CAD 73,200 (CPP)' },
    propertyTax: { exists: true, rate: 1.0 },
    digitalServicesTax: { exists: true, rate: 3 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 62,
    recentChanges: [
      { change: 'Capital gains inclusion rate increased', effectiveDate: '2024-06-25', impact: 'Inclusion raised from 50% to 66.7% on gains above CAD 250K' },
      { change: 'Digital services tax enacted', effectiveDate: '2024-01-01', impact: '3% on revenue from digital services exceeding CAD 20M' },
      { change: 'Pillar Two Global Minimum Tax Act', effectiveDate: '2024-01-01', impact: 'IIR and domestic top-up tax for large multinationals' },
    ],
    taxFreedomDayBase: 152,
  },
  {
    country: 'Australia',
    code: 'AU',
    region: 'Asia-Pacific',
    corporateTax: { headline: 30, effective: 27.0, sme: 25, combined: 30 },
    personalIncomeTax: { topRate: 45, middleRate: 37, lowerRate: 16, threshold: 'AUD 190,001+' },
    vat: { standard: 10, reduced: 0, exempt: ['Fresh food', 'Healthcare', 'Education'] },
    capitalGains: { shortTerm: 45, longTerm: 22.5, qualified: 22.5 },
    dividendTax: { domestic: 0, withholding: 30 },
    socialSecurity: { employer: 11.5, employee: 0, cap: 'No cap (super guarantee)' },
    propertyTax: { exists: true, rate: 0.6 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 58,
    recentChanges: [
      { change: 'Stage 3 tax cuts implemented', effectiveDate: '2024-07-01', impact: 'Reduced 32.5% bracket to 30%, new 16% lower rate' },
      { change: 'Superannuation rate increased to 11.5%', effectiveDate: '2024-07-01', impact: 'Rising to 12% by July 2025' },
      { change: 'Pillar Two global minimum tax legislation', effectiveDate: '2024-01-01', impact: 'IIR effective, UTPR from 2025' },
    ],
    taxFreedomDayBase: 137,
  },
  {
    country: 'South Korea',
    code: 'KR',
    region: 'Asia-Pacific',
    corporateTax: { headline: 24, effective: 22.0, sme: 9, combined: 26.4 },
    personalIncomeTax: { topRate: 45, middleRate: 35, lowerRate: 6, threshold: 'KRW 1,000,000,000+' },
    vat: { standard: 10, reduced: 0, exempt: ['Unprocessed food', 'Medical', 'Education'] },
    capitalGains: { shortTerm: 45, longTerm: 20, qualified: 20 },
    dividendTax: { domestic: 14, withholding: 22 },
    socialSecurity: { employer: 9.7, employee: 9.7, cap: 'KRW 5,900,000/month (NPS)' },
    propertyTax: { exists: true, rate: 0.4 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 57,
    recentChanges: [
      { change: 'Corporate tax rate cut from 25% to 24%', effectiveDate: '2023-01-01', impact: 'Top rate reduced, lowest bracket rate cut from 10% to 9%' },
      { change: 'Financial investment income tax deferred', effectiveDate: '2027-01-01', impact: 'Proposed 20-25% tax on investment income postponed' },
      { change: 'Pillar Two legislation enacted', effectiveDate: '2024-01-01', impact: 'QDMTT and IIR for qualifying multinationals' },
    ],
    taxFreedomDayBase: 142,
  },
  {
    country: 'Brazil',
    code: 'BR',
    region: 'South America',
    corporateTax: { headline: 15, effective: 30.5, sme: 15, combined: 34 },
    personalIncomeTax: { topRate: 27.5, middleRate: 22.5, lowerRate: 7.5, threshold: 'BRL 55,976.16+/yr' },
    vat: { standard: 17, reduced: 12, exempt: ['Basic food basket', 'Medicine'] },
    capitalGains: { shortTerm: 22.5, longTerm: 15, qualified: 15 },
    dividendTax: { domestic: 0, withholding: 0 },
    socialSecurity: { employer: 20, employee: 14, cap: 'BRL 8,786.75/month' },
    propertyTax: { exists: true, rate: 1.0 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: false, rate: 0, pillar2Compliant: false },
    baseCompetitiveness: 42,
    recentChanges: [
      { change: 'Major tax reform (IBS + CBS replacing multiple taxes)', effectiveDate: '2026-01-01', impact: 'Unified dual VAT system replacing PIS, COFINS, IPI, ICMS, ISS' },
      { change: 'Dividend taxation proposed', effectiveDate: '2026-01-01', impact: 'Proposed 15% withholding on dividends, offset by CIT cut' },
      { change: 'Transfer pricing rules aligned with OECD', effectiveDate: '2024-01-01', impact: 'Arms-length principle now mandatory for related-party transactions' },
    ],
    taxFreedomDayBase: 153,
  },
  {
    country: 'Mexico',
    code: 'MX',
    region: 'North America',
    corporateTax: { headline: 30, effective: 27.0, sme: 30, combined: 30 },
    personalIncomeTax: { topRate: 35, middleRate: 23.52, lowerRate: 6.4, threshold: 'MXN 3,898,141+' },
    vat: { standard: 16, reduced: 0, exempt: ['Food', 'Medicine', 'Books'] },
    capitalGains: { shortTerm: 35, longTerm: 10, qualified: 10 },
    dividendTax: { domestic: 10, withholding: 10 },
    socialSecurity: { employer: 26.5, employee: 4.8, cap: 'MXN 2,613.75/day (25x UMA)' },
    propertyTax: { exists: true, rate: 0.3 },
    digitalServicesTax: { exists: true, rate: 16 },
    minimumTax: { exists: false, rate: 0, pillar2Compliant: false },
    baseCompetitiveness: 45,
    recentChanges: [
      { change: 'Digital platforms VAT obligation', effectiveDate: '2020-06-01', impact: '16% VAT on digital services by foreign providers' },
      { change: 'Employer social security contributions increased', effectiveDate: '2023-01-01', impact: 'Gradual increase through 2030 for pension reform' },
      { change: 'Tax compliance measures strengthened', effectiveDate: '2025-01-01', impact: 'Enhanced electronic invoicing and reporting requirements' },
    ],
    taxFreedomDayBase: 130,
  },
  {
    country: 'Switzerland',
    code: 'CH',
    region: 'Europe',
    corporateTax: { headline: 8.5, effective: 14.7, sme: 8.5, combined: 14.7 },
    personalIncomeTax: { topRate: 13.2, middleRate: 8.0, lowerRate: 2.0, threshold: 'CHF 895,900+ (federal + cantonal varies)' },
    vat: { standard: 8.1, reduced: 2.6, exempt: ['Healthcare', 'Education', 'Cultural'] },
    capitalGains: { shortTerm: 0, longTerm: 0, qualified: 0 },
    dividendTax: { domestic: 0, withholding: 35 },
    socialSecurity: { employer: 6.4, employee: 6.4, cap: 'CHF 88,200 (AHV/IV/EO)' },
    propertyTax: { exists: true, rate: 0.3 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 82,
    recentChanges: [
      { change: 'OECD minimum tax implemented via constitutional amendment', effectiveDate: '2024-01-01', impact: 'Supplementary tax to bring effective rate to 15% for large multinationals' },
      { change: 'VAT rate increased to 8.1%', effectiveDate: '2024-01-01', impact: 'Increase from 7.7% to fund AHV pension reform' },
      { change: 'Qualified domestic minimum top-up tax', effectiveDate: '2024-01-01', impact: 'Revenue stays in Switzerland rather than going to other jurisdictions' },
    ],
    taxFreedomDayBase: 105,
  },
  {
    country: 'Ireland',
    code: 'IE',
    region: 'Europe',
    corporateTax: { headline: 12.5, effective: 11.5, sme: 12.5, combined: 12.5 },
    personalIncomeTax: { topRate: 40, middleRate: 40, lowerRate: 20, threshold: 'EUR 42,000+ (single)' },
    vat: { standard: 23, reduced: 13.5, exempt: ['Financial services', 'Insurance', 'Education'] },
    capitalGains: { shortTerm: 33, longTerm: 33, qualified: 10 },
    dividendTax: { domestic: 25, withholding: 25 },
    socialSecurity: { employer: 11.05, employee: 4, cap: 'No upper limit' },
    propertyTax: { exists: true, rate: 0.18 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 76,
    recentChanges: [
      { change: 'Pillar Two 15% minimum tax for large groups', effectiveDate: '2024-01-01', impact: 'Affects multinationals with >750M EUR revenue; 12.5% retained for others' },
      { change: 'R&D tax credit enhanced to 30%', effectiveDate: '2024-01-01', impact: 'Increased from 25% to incentivize domestic innovation' },
      { change: 'Participation exemption for foreign dividends', effectiveDate: '2025-01-01', impact: 'New territorial regime for qualifying foreign dividend income' },
    ],
    taxFreedomDayBase: 120,
  },
  {
    country: 'Singapore',
    code: 'SG',
    region: 'Asia-Pacific',
    corporateTax: { headline: 17, effective: 13.5, sme: 8.5, combined: 17 },
    personalIncomeTax: { topRate: 24, middleRate: 15, lowerRate: 3.5, threshold: 'SGD 1,000,000+' },
    vat: { standard: 9, reduced: 0, exempt: ['Financial services', 'Residential property', 'Digital payment tokens'] },
    capitalGains: { shortTerm: 0, longTerm: 0, qualified: 0 },
    dividendTax: { domestic: 0, withholding: 0 },
    socialSecurity: { employer: 17, employee: 20, cap: 'SGD 6,800/month (ordinary wages)' },
    propertyTax: { exists: true, rate: 0.5 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 88,
    recentChanges: [
      { change: 'GST increased to 9%', effectiveDate: '2024-01-01', impact: 'Second stage of increase from 7% (8% in 2023, 9% in 2024)' },
      { change: 'Top personal income tax rate raised to 24%', effectiveDate: '2024-01-01', impact: 'New top bracket for income exceeding SGD 1M' },
      { change: 'Domestic top-up tax for Pillar Two', effectiveDate: '2025-01-01', impact: 'Ensures minimum 15% effective rate for qualifying MNEs' },
    ],
    taxFreedomDayBase: 88,
  },
  {
    country: 'Hong Kong',
    code: 'HK',
    region: 'Asia-Pacific',
    corporateTax: { headline: 16.5, effective: 14.0, sme: 8.25, combined: 16.5 },
    personalIncomeTax: { topRate: 15, middleRate: 12, lowerRate: 2, threshold: 'HKD (standard rate 15% on net income)' },
    vat: { standard: 0, reduced: 0, exempt: ['No VAT/GST system'] },
    capitalGains: { shortTerm: 0, longTerm: 0, qualified: 0 },
    dividendTax: { domestic: 0, withholding: 0 },
    socialSecurity: { employer: 5, employee: 5, cap: 'HKD 1,500/month (MPF)' },
    propertyTax: { exists: true, rate: 1.2 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 90,
    recentChanges: [
      { change: 'Foreign-sourced income exemption refined', effectiveDate: '2024-01-01', impact: 'Economic substance requirements for FSIE regime tightened' },
      { change: 'Pillar Two top-up tax enacted', effectiveDate: '2025-01-01', impact: 'QDMTT for MNEs with >750M EUR revenue' },
      { change: 'Two-tiered profits tax maintained', effectiveDate: '2018-04-01', impact: 'First HKD 2M at 8.25%, remainder at 16.5%' },
    ],
    taxFreedomDayBase: 75,
  },
  {
    country: 'United Arab Emirates',
    code: 'AE',
    region: 'Middle East',
    corporateTax: { headline: 9, effective: 7.5, sme: 0, combined: 9 },
    personalIncomeTax: { topRate: 0, middleRate: 0, lowerRate: 0, threshold: 'No personal income tax' },
    vat: { standard: 5, reduced: 0, exempt: ['Financial services', 'Residential property', 'Local transport'] },
    capitalGains: { shortTerm: 0, longTerm: 0, qualified: 0 },
    dividendTax: { domestic: 0, withholding: 0 },
    socialSecurity: { employer: 12.5, employee: 5, cap: 'UAE nationals only; varies by emirate' },
    propertyTax: { exists: false, rate: 0 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 92,
    recentChanges: [
      { change: 'Federal corporate income tax introduced', effectiveDate: '2023-06-01', impact: 'First CIT in UAE history; 0% on first AED 375K, 9% above' },
      { change: 'Domestic minimum top-up tax under consideration', effectiveDate: '2026-01-01', impact: 'To align with OECD Pillar Two for qualifying MNEs' },
      { change: 'Free zone qualifying income at 0%', effectiveDate: '2023-06-01', impact: 'Qualifying free zone companies retain 0% on qualifying income' },
    ],
    taxFreedomDayBase: 30,
  },
  {
    country: 'Netherlands',
    code: 'NL',
    region: 'Europe',
    corporateTax: { headline: 25.8, effective: 23.0, sme: 19, combined: 25.8 },
    personalIncomeTax: { topRate: 49.5, middleRate: 36.97, lowerRate: 36.97, threshold: 'EUR 75,518+' },
    vat: { standard: 21, reduced: 9, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 36, longTerm: 36, qualified: 36 },
    dividendTax: { domestic: 15, withholding: 15 },
    socialSecurity: { employer: 18.2, employee: 27.65, cap: 'EUR 66,956 (social insurance)' },
    propertyTax: { exists: true, rate: 0.5 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 59,
    recentChanges: [
      { change: 'Box 3 savings tax reformed', effectiveDate: '2027-01-01', impact: 'Moving from deemed return to actual return basis (delayed)' },
      { change: 'Pillar Two minimum tax implemented', effectiveDate: '2024-01-01', impact: 'IIR effective, UTPR from 2025' },
      { change: 'Conditional withholding tax on interest/royalties', effectiveDate: '2021-01-01', impact: '25.8% on payments to low-tax jurisdictions' },
    ],
    taxFreedomDayBase: 162,
  },
  {
    country: 'Sweden',
    code: 'SE',
    region: 'Europe',
    corporateTax: { headline: 20.6, effective: 19.5, sme: 20.6, combined: 20.6 },
    personalIncomeTax: { topRate: 52.3, middleRate: 32, lowerRate: 32, threshold: 'SEK 598,500+ (state tax 20% on top)' },
    vat: { standard: 25, reduced: 12, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 30, longTerm: 30, qualified: 25 },
    dividendTax: { domestic: 30, withholding: 30 },
    socialSecurity: { employer: 31.42, employee: 7, cap: 'SEK 599,250 (reduced above)' },
    propertyTax: { exists: true, rate: 0.75 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 52,
    recentChanges: [
      { change: 'State income tax threshold adjusted', effectiveDate: '2025-01-01', impact: 'Threshold for 20% state tax raised to SEK 598,500' },
      { change: 'Corporate rate stable at 20.6%', effectiveDate: '2021-01-01', impact: 'Reduced from 21.4% in 2021, competitive for Nordic region' },
      { change: 'Pillar Two minimum tax enacted', effectiveDate: '2024-01-01', impact: 'Transposition of EU Minimum Tax Directive' },
    ],
    taxFreedomDayBase: 188,
  },
  {
    country: 'Norway',
    code: 'NO',
    region: 'Europe',
    corporateTax: { headline: 22, effective: 20.5, sme: 22, combined: 22 },
    personalIncomeTax: { topRate: 47.4, middleRate: 34.0, lowerRate: 22, threshold: 'NOK 1,350,000+ (bracket tax)' },
    vat: { standard: 25, reduced: 15, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 37.84, longTerm: 37.84, qualified: 37.84 },
    dividendTax: { domestic: 37.84, withholding: 25 },
    socialSecurity: { employer: 14.1, employee: 7.9, cap: 'No cap' },
    propertyTax: { exists: true, rate: 0.7 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 50,
    recentChanges: [
      { change: 'Dividend/capital gains gross-up factor increased', effectiveDate: '2023-01-01', impact: 'Effective rate on dividends raised to ~37.84% (1.72x factor)' },
      { change: 'Wealth tax threshold and rates adjusted', effectiveDate: '2025-01-01', impact: '1.0% on net wealth above NOK 1.7M, 1.1% above NOK 20M' },
      { change: 'Exit tax on unrealized gains', effectiveDate: '2024-01-01', impact: 'Tax on unrealized gains when relocating abroad (12-year installment)' },
    ],
    taxFreedomDayBase: 175,
  },
  {
    country: 'Italy',
    code: 'IT',
    region: 'Europe',
    corporateTax: { headline: 24, effective: 24.5, sme: 24, combined: 27.81 },
    personalIncomeTax: { topRate: 43, middleRate: 35, lowerRate: 23, threshold: 'EUR 50,000+' },
    vat: { standard: 22, reduced: 10, exempt: ['Healthcare', 'Education', 'Insurance'] },
    capitalGains: { shortTerm: 26, longTerm: 26, qualified: 26 },
    dividendTax: { domestic: 26, withholding: 26 },
    socialSecurity: { employer: 29.4, employee: 10.49, cap: 'EUR 119,650 (INPS)' },
    propertyTax: { exists: true, rate: 0.86 },
    digitalServicesTax: { exists: true, rate: 3 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 47,
    recentChanges: [
      { change: 'IRPEF brackets reduced to three', effectiveDate: '2024-01-01', impact: 'Simplified from 4 to 3 brackets (23%, 35%, 43%)' },
      { change: 'Flat tax for new residents (impatriates)', effectiveDate: '2024-01-01', impact: 'EUR 200K annual lump sum for high net worth individuals' },
      { change: 'Digital services tax maintained at 3%', effectiveDate: '2020-01-01', impact: 'Applies to companies with >750M global / 5.5M IT digital revenue' },
    ],
    taxFreedomDayBase: 168,
  },
  {
    country: 'Spain',
    code: 'ES',
    region: 'Europe',
    corporateTax: { headline: 25, effective: 22.0, sme: 23, combined: 25 },
    personalIncomeTax: { topRate: 47, middleRate: 37, lowerRate: 19, threshold: 'EUR 300,000+ (varies by region)' },
    vat: { standard: 21, reduced: 10, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 28, longTerm: 28, qualified: 28 },
    dividendTax: { domestic: 28, withholding: 19 },
    socialSecurity: { employer: 30.5, employee: 6.5, cap: 'EUR 56,652 (max base)' },
    propertyTax: { exists: true, rate: 0.7 },
    digitalServicesTax: { exists: true, rate: 3 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 50,
    recentChanges: [
      { change: 'Capital gains top rate raised to 28%', effectiveDate: '2023-01-01', impact: 'New bracket for gains above EUR 300K' },
      { change: 'Temporary solidarity tax on wealth', effectiveDate: '2023-01-01', impact: '1.7%-3.5% on net assets above EUR 3M (Beckham law)' },
      { change: 'SME corporate rate reduced to 23%', effectiveDate: '2023-01-01', impact: 'For companies with revenue below EUR 1M' },
    ],
    taxFreedomDayBase: 170,
  },
  {
    country: 'Israel',
    code: 'IL',
    region: 'Middle East',
    corporateTax: { headline: 23, effective: 21.0, sme: 23, combined: 23 },
    personalIncomeTax: { topRate: 50, middleRate: 35, lowerRate: 10, threshold: 'ILS 698,281+' },
    vat: { standard: 18, reduced: 0, exempt: ['Fruits/vegetables (0%)', 'Financial services'] },
    capitalGains: { shortTerm: 25, longTerm: 25, qualified: 25 },
    dividendTax: { domestic: 25, withholding: 25 },
    socialSecurity: { employer: 7.6, employee: 12.0, cap: 'ILS 49,030/month' },
    propertyTax: { exists: true, rate: 0.5 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: false, rate: 0, pillar2Compliant: false },
    baseCompetitiveness: 63,
    recentChanges: [
      { change: 'VAT increased from 17% to 18%', effectiveDate: '2025-01-01', impact: 'Increase to fund post-conflict fiscal gap' },
      { change: 'Surtax on high earners maintained', effectiveDate: '2017-01-01', impact: '3% surtax on income above ILS 698,281 (effective 50% top rate)' },
      { change: 'Innovation box regime for tech companies', effectiveDate: '2017-01-01', impact: 'Reduced 6-12% rate for qualifying IP income' },
    ],
    taxFreedomDayBase: 140,
  },
  {
    country: 'New Zealand',
    code: 'NZ',
    region: 'Asia-Pacific',
    corporateTax: { headline: 28, effective: 25.5, sme: 28, combined: 28 },
    personalIncomeTax: { topRate: 39, middleRate: 33, lowerRate: 10.5, threshold: 'NZD 180,000+' },
    vat: { standard: 15, reduced: 0, exempt: ['Financial services', 'Residential rent'] },
    capitalGains: { shortTerm: 0, longTerm: 0, qualified: 0 },
    dividendTax: { domestic: 5, withholding: 15 },
    socialSecurity: { employer: 0, employee: 0, cap: 'No mandatory (KiwiSaver voluntary 3-10%)' },
    propertyTax: { exists: true, rate: 0.6 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: false, rate: 0, pillar2Compliant: false },
    baseCompetitiveness: 65,
    recentChanges: [
      { change: 'Top personal rate of 39% introduced', effectiveDate: '2021-04-01', impact: 'New bracket for income above NZD 180K' },
      { change: 'Interest deductibility on residential property removed', effectiveDate: '2021-10-01', impact: 'Phased out over 4 years for existing properties' },
      { change: 'Bright-line test shortened to 2 years', effectiveDate: '2024-07-01', impact: 'Reduced from 10 years; gains on property sold within 2 years taxed' },
    ],
    taxFreedomDayBase: 115,
  },
  {
    country: 'Poland',
    code: 'PL',
    region: 'Europe',
    corporateTax: { headline: 19, effective: 17.5, sme: 9, combined: 19 },
    personalIncomeTax: { topRate: 32, middleRate: 32, lowerRate: 12, threshold: 'PLN 120,000+' },
    vat: { standard: 23, reduced: 8, exempt: ['Healthcare', 'Education', 'Financial services'] },
    capitalGains: { shortTerm: 19, longTerm: 19, qualified: 19 },
    dividendTax: { domestic: 19, withholding: 19 },
    socialSecurity: { employer: 20.5, employee: 13.71, cap: 'PLN 234,720 (pension/disability)' },
    propertyTax: { exists: true, rate: 0.3 },
    digitalServicesTax: { exists: false, rate: 0 },
    minimumTax: { exists: true, rate: 15, pillar2Compliant: true },
    baseCompetitiveness: 61,
    recentChanges: [
      { change: 'Polish Deal tax reform', effectiveDate: '2022-01-01', impact: 'Tax-free amount raised to PLN 30K, health contribution non-deductible' },
      { change: '9% CIT rate for small taxpayers maintained', effectiveDate: '2019-01-01', impact: 'Applies to companies with revenue below EUR 2M' },
      { change: 'Pillar Two minimum tax transposed', effectiveDate: '2025-01-01', impact: 'IIR and QDMTT for qualifying multinationals' },
    ],
    taxFreedomDayBase: 148,
  },
];

// ── Tax trends ──

const TAX_TRENDS: TaxTrend[] = [
  { trend: 'Global minimum tax adoption', description: 'Over 140 jurisdictions agreed on a 15% minimum corporate tax (Pillar Two). Most OECD nations have enacted legislation effective 2024-2025, with UTPR rules phasing in.' },
  { trend: 'Digital services tax expansion', description: 'Countries continue unilateral DSTs (2-3%) on tech giants while Pillar One negotiations stall. France, UK, Italy, Spain, Canada, India, and Mexico all maintain active DSTs.' },
  { trend: 'Capital gains tax increases', description: 'Multiple nations raised capital gains rates in 2023-2025: UK unified at 24%, Canada increased inclusion to 66.7%, Spain added 28% top bracket, Norway raised effective rate to 37.84%.' },
  { trend: 'Corporate rate convergence', description: 'After decades of a race to the bottom, corporate rates are converging around 20-25%. The Pillar Two floor of 15% has reduced incentives for ultra-low rate competition.' },
  { trend: 'Green tax incentives', description: 'Major economies are expanding tax credits for renewable energy, EV adoption, and carbon capture. The US IRA provides substantial clean energy credits through 2032.' },
  { trend: 'Wealth tax resurgence', description: 'Norway expanded wealth tax, Spain introduced solidarity tax, and Colombia enacted new wealth taxes. G20 discussions on global minimum wealth tax ongoing.' },
  { trend: 'VAT/GST rate increases', description: 'Post-pandemic fiscal pressures driving VAT hikes: Singapore (7% to 9%), Switzerland (7.7% to 8.1%), Israel (17% to 18%). Trend expected to continue.' },
  { trend: 'Remote work tax complications', description: 'Cross-border remote work creating new permanent establishment risks and dual taxation issues. OECD and EU working on updated guidance for digital nomad taxation.' },
];

// ── Generator ──

function generateTaxData(): GlobalTaxRatesResponse {
  const today = new Date().toISOString().slice(0, 10);
  const rng = mulberry32(hashSeed(today));

  const jitter = (base: number, range: number): number => {
    const j = (rng() - 0.5) * 2 * range;
    return Math.round((base + j) * 100) / 100;
  };

  const countries: CountryTaxData[] = COUNTRY_CONFIGS.map((cfg) => ({
    country: cfg.country,
    code: cfg.code,
    region: cfg.region,
    corporateTax: {
      headline: cfg.corporateTax.headline,
      effective: jitter(cfg.corporateTax.effective, 0.3),
      sme: cfg.corporateTax.sme,
      combined: jitter(cfg.corporateTax.combined, 0.2),
    },
    personalIncomeTax: {
      topRate: cfg.personalIncomeTax.topRate,
      middleRate: cfg.personalIncomeTax.middleRate,
      lowerRate: cfg.personalIncomeTax.lowerRate,
      threshold: cfg.personalIncomeTax.threshold,
    },
    vat: {
      standard: cfg.vat.standard,
      reduced: cfg.vat.reduced,
      exempt: cfg.vat.exempt,
    },
    capitalGains: {
      shortTerm: cfg.capitalGains.shortTerm,
      longTerm: cfg.capitalGains.longTerm,
      qualified: cfg.capitalGains.qualified,
    },
    dividendTax: {
      domestic: cfg.dividendTax.domestic,
      withholding: cfg.dividendTax.withholding,
    },
    socialSecurity: {
      employer: cfg.socialSecurity.employer,
      employee: cfg.socialSecurity.employee,
      cap: cfg.socialSecurity.cap,
    },
    propertyTax: cfg.propertyTax,
    digitalServicesTax: cfg.digitalServicesTax,
    minimumTax: cfg.minimumTax,
    taxCompetitiveness: Math.min(100, Math.max(0, Math.round(jitter(cfg.baseCompetitiveness, 1.5)))),
    recentChanges: cfg.recentChanges,
  }));

  // Global averages
  const corporateRates = countries.map((c) => c.corporateTax.headline);
  const topIncomeRates = countries.map((c) => c.personalIncomeTax.topRate);
  const vatRates = countries.filter((c) => c.vat.standard > 0).map((c) => c.vat.standard);
  const capGainsRates = countries.map((c) => c.capitalGains.longTerm);

  const avg = (arr: number[]): number => Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
  const median = (arr: number[]): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
  };

  const globalAverages: GlobalAverages = {
    avgCorporate: avg(corporateRates),
    avgTopIncome: avg(topIncomeRates),
    avgVAT: avg(vatRates),
    avgCapGains: avg(capGainsRates),
  };

  // OECD stats (subset of OECD members from our list)
  const oecdCodes = new Set(['US', 'GB', 'DE', 'FR', 'JP', 'CA', 'AU', 'KR', 'MX', 'CH', 'IE', 'NL', 'SE', 'NO', 'IT', 'ES', 'IL', 'NZ', 'PL']);
  const oecdCountries = countries.filter((c) => oecdCodes.has(c.code));
  const oecdCorporate = oecdCountries.map((c) => c.corporateTax.headline);
  const oecdIncome = oecdCountries.map((c) => c.personalIncomeTax.topRate);
  const oecdVAT = oecdCountries.filter((c) => c.vat.standard > 0).map((c) => c.vat.standard);

  const oecdStats: OECDStats = {
    avgCorporate: avg(oecdCorporate),
    avgTopIncome: avg(oecdIncome),
    medianVAT: median(oecdVAT),
  };

  // Tax freedom day
  const taxFreedomDay: TaxFreedomDay[] = COUNTRY_CONFIGS.map((cfg) => {
    const dayOfYear = Math.round(jitter(cfg.taxFreedomDayBase, 1));
    const d = new Date(new Date().getFullYear(), 0, dayOfYear);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    return {
      country: cfg.country,
      code: cfg.code,
      dayOfYear,
      date: `${month} ${day}`,
    };
  });

  return {
    countries,
    globalAverages,
    oecdStats,
    taxTrends: TAX_TRENDS,
    taxFreedomDay,
    timestamp: new Date().toISOString(),
  };
}

// ── Route ──

router.get('/', (_req, res) => {
  try {
    const now = Date.now();
    if (cache.data && now - cache.ts < TTL) {
      res.json(cache.data);
      return;
    }

    const data = generateTaxData();
    cache = { data, ts: now };
    res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[GlobalTaxRates] Error:', message);
    // Stale fallback
    if (cache.data) {
      res.json(cache.data);
      return;
    }
    res.status(500).json({ error: 'Failed to generate global tax rates data' });
  }
});

export default router;
