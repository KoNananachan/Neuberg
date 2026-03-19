import { useState } from 'react';
import { useBalanceOfPayments } from '../../api/hooks/use-balance-of-payments';

// ── Constants ──

const BLUE = '#60a5fa'; // blue-400
const GREEN = '#4ade80';
const RED = '#f87171';
const AMBER = '#fbbf24';

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'EU', name: 'Eurozone' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'JP', name: 'Japan' },
  { code: 'CN', name: 'China' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'KR', name: 'South Korea' },
  { code: 'MX', name: 'Mexico' },
  { code: 'CH', name: 'Switzerland' },
] as const;

type CountryCode = (typeof COUNTRIES)[number]['code'];

// ── Interfaces ──

interface CurrentAccountOverview {
  balance: number;
  gdpPct: number;
  prevBalance: number;
  tradeBalance: number;
  primaryIncome: number;
  secondaryIncome: number;
}

interface TradeDetail {
  goodsExports: number;
  goodsImports: number;
  goodsBalance: number;
  goodsYoY: number;
  servicesExports: number;
  servicesImports: number;
  servicesBalance: number;
  servicesYoY: number;
}

interface CapitalAccount {
  fdiInward: number;
  fdiOutward: number;
  fdiNet: number;
  portfolioEquityInflow: number;
  portfolioEquityOutflow: number;
  portfolioDebtInflow: number;
  portfolioDebtOutflow: number;
}

interface Reserves {
  total: number;
  monthsOfImports: number;
  gold: number;
  sdrs: number;
  forex: number;
}

interface TradePartner {
  country: string;
  code: string;
  exports: number;
  imports: number;
  balance: number;
}

interface QuarterlyCA {
  quarter: string;
  value: number;
}

interface CountryBoPData {
  currentAccount: CurrentAccountOverview;
  trade: TradeDetail;
  capital: CapitalAccount;
  reserves: Reserves;
  topPartners: TradePartner[];
  historicalCA: QuarterlyCA[];
}

interface ImbalanceSummary {
  largestSurplus: { code: string; value: number };
  largestDeficit: { code: string; value: number };
}

interface BalanceOfPaymentsData {
  timestamp: string;
  summary: ImbalanceSummary;
  countries: Record<string, CountryBoPData>;
}

// ── Formatting helpers ──

function fmtB(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'T';
  return n.toFixed(1) + 'B';
}

function fmtBSigned(n: number): string {
  const prefix = n > 0 ? '+' : '';
  return prefix + '$' + fmtB(n);
}

function fmtPct(n: number): string {
  return (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
}

// ── Color helpers ──

function valColor(n: number): string {
  if (n > 0) return GREEN;
  if (n < 0) return RED;
  return 'rgba(255,255,255,0.3)';
}

function trendArrow(current: number, prev: number): string {
  if (current > prev) return '\u25B2';
  if (current < prev) return '\u25BC';
  return '\u25C6';
}

// ── Fallback data ──

function buildFallback(): BalanceOfPaymentsData {
  const countryData: Record<string, CountryBoPData> = {
    US: {
      currentAccount: { balance: -266.8, gdpPct: -3.1, prevBalance: -251.4, tradeBalance: -289.3, primaryIncome: 42.1, secondaryIncome: -19.6 },
      trade: { goodsExports: 174.2, goodsImports: 318.6, goodsBalance: -144.4, goodsYoY: -3.2, servicesExports: 98.4, servicesImports: 73.5, servicesBalance: 24.9, servicesYoY: 4.1 },
      capital: { fdiInward: 82.4, fdiOutward: 67.1, fdiNet: 15.3, portfolioEquityInflow: 54.2, portfolioEquityOutflow: 38.6, portfolioDebtInflow: 128.3, portfolioDebtOutflow: 42.7 },
      reserves: { total: 242.3, monthsOfImports: 0.8, gold: 11041.0, sdrs: 164.8, forex: 42.3 },
      topPartners: [
        { country: 'Canada', code: 'CA', exports: 31.4, imports: 39.5, balance: -8.1 },
        { country: 'Mexico', code: 'MX', exports: 26.7, imports: 39.5, balance: -12.8 },
        { country: 'China', code: 'CN', exports: 12.2, imports: 43.6, balance: -31.4 },
        { country: 'Japan', code: 'JP', exports: 8.1, imports: 16.2, balance: -8.1 },
        { country: 'Germany', code: 'DE', exports: 7.4, imports: 15.4, balance: -8.0 },
        { country: 'South Korea', code: 'KR', exports: 6.8, imports: 12.7, balance: -5.9 },
        { country: 'United Kingdom', code: 'GB', exports: 8.9, imports: 8.3, balance: 0.6 },
        { country: 'India', code: 'IN', exports: 4.2, imports: 10.6, balance: -6.4 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -238.2 }, { quarter: 'Q2 24', value: -245.6 },
        { quarter: 'Q3 24', value: -251.4 }, { quarter: 'Q4 24', value: -258.9 },
        { quarter: 'Q1 25', value: -262.1 }, { quarter: 'Q2 25', value: -270.3 },
        { quarter: 'Q3 25', value: -266.8 }, { quarter: 'Q4 25', value: -272.5 },
      ],
    },
    EU: {
      currentAccount: { balance: 312.4, gdpPct: 2.1, prevBalance: 298.7, tradeBalance: 224.8, primaryIncome: 102.3, secondaryIncome: -14.7 },
      trade: { goodsExports: 612.3, goodsImports: 548.2, goodsBalance: 64.1, goodsYoY: 2.8, servicesExports: 342.1, servicesImports: 281.4, servicesBalance: 60.7, servicesYoY: 5.2 },
      capital: { fdiInward: 124.5, fdiOutward: 158.3, fdiNet: -33.8, portfolioEquityInflow: 82.1, portfolioEquityOutflow: 96.4, portfolioDebtInflow: 148.2, portfolioDebtOutflow: 112.6 },
      reserves: { total: 1284.6, monthsOfImports: 2.8, gold: 505.7, sdrs: 218.4, forex: 560.5 },
      topPartners: [
        { country: 'United States', code: 'US', exports: 52.8, imports: 38.4, balance: 14.4 },
        { country: 'China', code: 'CN', exports: 28.6, imports: 54.2, balance: -25.6 },
        { country: 'United Kingdom', code: 'GB', exports: 44.2, imports: 36.8, balance: 7.4 },
        { country: 'Switzerland', code: 'CH', exports: 22.4, imports: 18.6, balance: 3.8 },
        { country: 'Japan', code: 'JP', exports: 14.2, imports: 12.8, balance: 1.4 },
        { country: 'South Korea', code: 'KR', exports: 8.6, imports: 12.4, balance: -3.8 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 278.4 }, { quarter: 'Q2 24', value: 286.1 },
        { quarter: 'Q3 24', value: 298.7 }, { quarter: 'Q4 24', value: 305.2 },
        { quarter: 'Q1 25', value: 308.6 }, { quarter: 'Q2 25', value: 315.8 },
        { quarter: 'Q3 25', value: 312.4 }, { quarter: 'Q4 25', value: 318.2 },
      ],
    },
    UK: {
      currentAccount: { balance: -28.6, gdpPct: -3.2, prevBalance: -26.4, tradeBalance: -48.2, primaryIncome: 24.8, secondaryIncome: -5.2 },
      trade: { goodsExports: 42.8, goodsImports: 68.4, goodsBalance: -25.6, goodsYoY: -4.1, servicesExports: 48.2, servicesImports: 25.6, servicesBalance: 22.6, servicesYoY: 3.8 },
      capital: { fdiInward: 42.6, fdiOutward: 28.4, fdiNet: 14.2, portfolioEquityInflow: 18.4, portfolioEquityOutflow: 22.6, portfolioDebtInflow: 62.4, portfolioDebtOutflow: 28.2 },
      reserves: { total: 198.4, monthsOfImports: 3.5, gold: 13.8, sdrs: 28.4, forex: 156.2 },
      topPartners: [
        { country: 'United States', code: 'US', exports: 12.4, imports: 8.6, balance: 3.8 },
        { country: 'Germany', code: 'DE', exports: 6.2, imports: 12.8, balance: -6.6 },
        { country: 'Netherlands', code: 'NL', exports: 8.4, imports: 10.2, balance: -1.8 },
        { country: 'France', code: 'FR', exports: 5.8, imports: 8.4, balance: -2.6 },
        { country: 'China', code: 'CN', exports: 4.2, imports: 14.6, balance: -10.4 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -22.4 }, { quarter: 'Q2 24', value: -24.8 },
        { quarter: 'Q3 24', value: -26.4 }, { quarter: 'Q4 24', value: -25.2 },
        { quarter: 'Q1 25', value: -27.8 }, { quarter: 'Q2 25', value: -29.4 },
        { quarter: 'Q3 25', value: -28.6 }, { quarter: 'Q4 25', value: -30.2 },
      ],
    },
    JP: {
      currentAccount: { balance: 186.2, gdpPct: 4.2, prevBalance: 178.4, tradeBalance: -12.8, primaryIncome: 212.4, secondaryIncome: -13.4 },
      trade: { goodsExports: 78.4, goodsImports: 84.2, goodsBalance: -5.8, goodsYoY: 8.4, servicesExports: 24.6, servicesImports: 31.6, servicesBalance: -7.0, servicesYoY: -2.1 },
      capital: { fdiInward: 12.8, fdiOutward: 48.6, fdiNet: -35.8, portfolioEquityInflow: 42.8, portfolioEquityOutflow: 28.4, portfolioDebtInflow: 62.4, portfolioDebtOutflow: 84.6 },
      reserves: { total: 1238.4, monthsOfImports: 17.6, gold: 846.0, sdrs: 42.8, forex: 349.6 },
      topPartners: [
        { country: 'China', code: 'CN', exports: 16.8, imports: 22.4, balance: -5.6 },
        { country: 'United States', code: 'US', exports: 18.2, imports: 12.4, balance: 5.8 },
        { country: 'South Korea', code: 'KR', exports: 6.4, imports: 4.8, balance: 1.6 },
        { country: 'Taiwan', code: 'TW', exports: 5.8, imports: 4.2, balance: 1.6 },
        { country: 'Australia', code: 'AU', exports: 2.4, imports: 8.6, balance: -6.2 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 162.4 }, { quarter: 'Q2 24', value: 168.8 },
        { quarter: 'Q3 24', value: 178.4 }, { quarter: 'Q4 24', value: 182.6 },
        { quarter: 'Q1 25', value: 184.2 }, { quarter: 'Q2 25', value: 188.4 },
        { quarter: 'Q3 25', value: 186.2 }, { quarter: 'Q4 25', value: 190.8 },
      ],
    },
    CN: {
      currentAccount: { balance: 352.8, gdpPct: 1.9, prevBalance: 338.2, tradeBalance: 426.4, primaryIncome: -58.2, secondaryIncome: -15.4 },
      trade: { goodsExports: 324.6, goodsImports: 218.4, goodsBalance: 106.2, goodsYoY: 5.8, servicesExports: 42.8, servicesImports: 86.4, servicesBalance: -43.6, servicesYoY: -8.2 },
      capital: { fdiInward: 28.4, fdiOutward: 42.6, fdiNet: -14.2, portfolioEquityInflow: 18.6, portfolioEquityOutflow: 32.4, portfolioDebtInflow: 24.8, portfolioDebtOutflow: 48.2 },
      reserves: { total: 3242.8, monthsOfImports: 17.8, gold: 2264.0, sdrs: 48.6, forex: 930.2 },
      topPartners: [
        { country: 'United States', code: 'US', exports: 52.4, imports: 18.6, balance: 33.8 },
        { country: 'EU', code: 'EU', exports: 48.2, imports: 28.4, balance: 19.8 },
        { country: 'ASEAN', code: 'AS', exports: 42.6, imports: 38.4, balance: 4.2 },
        { country: 'Japan', code: 'JP', exports: 18.4, imports: 22.8, balance: -4.4 },
        { country: 'South Korea', code: 'KR', exports: 14.2, imports: 24.6, balance: -10.4 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 312.4 }, { quarter: 'Q2 24', value: 324.6 },
        { quarter: 'Q3 24', value: 338.2 }, { quarter: 'Q4 24', value: 342.8 },
        { quarter: 'Q1 25', value: 348.4 }, { quarter: 'Q2 25', value: 356.2 },
        { quarter: 'Q3 25', value: 352.8 }, { quarter: 'Q4 25', value: 358.6 },
      ],
    },
    IN: {
      currentAccount: { balance: -24.6, gdpPct: -0.7, prevBalance: -22.8, tradeBalance: -68.4, primaryIncome: -12.8, secondaryIncome: 56.6 },
      trade: { goodsExports: 38.4, goodsImports: 62.8, goodsBalance: -24.4, goodsYoY: -6.2, servicesExports: 42.6, servicesImports: 18.2, servicesBalance: 24.4, servicesYoY: 12.4 },
      capital: { fdiInward: 18.4, fdiOutward: 6.2, fdiNet: 12.2, portfolioEquityInflow: 8.4, portfolioEquityOutflow: 4.2, portfolioDebtInflow: 12.6, portfolioDebtOutflow: 6.8 },
      reserves: { total: 642.8, monthsOfImports: 12.2, gold: 62.4, sdrs: 18.6, forex: 561.8 },
      topPartners: [
        { country: 'China', code: 'CN', exports: 2.8, imports: 14.2, balance: -11.4 },
        { country: 'United States', code: 'US', exports: 8.4, imports: 5.2, balance: 3.2 },
        { country: 'UAE', code: 'AE', exports: 6.2, imports: 8.4, balance: -2.2 },
        { country: 'Saudi Arabia', code: 'SA', exports: 2.4, imports: 8.6, balance: -6.2 },
        { country: 'Iraq', code: 'IQ', exports: 0.8, imports: 6.4, balance: -5.6 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -18.4 }, { quarter: 'Q2 24', value: -20.2 },
        { quarter: 'Q3 24', value: -22.8 }, { quarter: 'Q4 24', value: -21.4 },
        { quarter: 'Q1 25', value: -23.6 }, { quarter: 'Q2 25', value: -25.8 },
        { quarter: 'Q3 25', value: -24.6 }, { quarter: 'Q4 25', value: -26.2 },
      ],
    },
    BR: {
      currentAccount: { balance: -32.4, gdpPct: -1.6, prevBalance: -28.6, tradeBalance: 18.4, primaryIncome: -42.8, secondaryIncome: -8.0 },
      trade: { goodsExports: 34.2, goodsImports: 24.8, goodsBalance: 9.4, goodsYoY: 6.8, servicesExports: 6.4, servicesImports: 12.8, servicesBalance: -6.4, servicesYoY: -3.2 },
      capital: { fdiInward: 16.4, fdiOutward: 4.8, fdiNet: 11.6, portfolioEquityInflow: 4.2, portfolioEquityOutflow: 6.8, portfolioDebtInflow: 8.4, portfolioDebtOutflow: 4.2 },
      reserves: { total: 358.4, monthsOfImports: 17.4, gold: 8.4, sdrs: 18.2, forex: 331.8 },
      topPartners: [
        { country: 'China', code: 'CN', exports: 12.4, imports: 8.2, balance: 4.2 },
        { country: 'United States', code: 'US', exports: 4.8, imports: 6.4, balance: -1.6 },
        { country: 'Argentina', code: 'AR', exports: 2.4, imports: 1.8, balance: 0.6 },
        { country: 'Netherlands', code: 'NL', exports: 2.8, imports: 1.2, balance: 1.6 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -24.6 }, { quarter: 'Q2 24', value: -26.8 },
        { quarter: 'Q3 24', value: -28.6 }, { quarter: 'Q4 24', value: -30.2 },
        { quarter: 'Q1 25', value: -31.4 }, { quarter: 'Q2 25', value: -33.8 },
        { quarter: 'Q3 25', value: -32.4 }, { quarter: 'Q4 25', value: -34.6 },
      ],
    },
    CA: {
      currentAccount: { balance: -8.4, gdpPct: -0.4, prevBalance: -6.8, tradeBalance: 4.2, primaryIncome: -8.4, secondaryIncome: -4.2 },
      trade: { goodsExports: 52.4, goodsImports: 48.6, goodsBalance: 3.8, goodsYoY: 2.4, servicesExports: 14.2, servicesImports: 18.8, servicesBalance: -4.6, servicesYoY: -1.8 },
      capital: { fdiInward: 18.2, fdiOutward: 24.6, fdiNet: -6.4, portfolioEquityInflow: 12.4, portfolioEquityOutflow: 8.6, portfolioDebtInflow: 28.4, portfolioDebtOutflow: 14.2 },
      reserves: { total: 106.8, monthsOfImports: 2.6, gold: 0.0, sdrs: 14.2, forex: 92.6 },
      topPartners: [
        { country: 'United States', code: 'US', exports: 38.4, imports: 32.6, balance: 5.8 },
        { country: 'China', code: 'CN', exports: 4.2, imports: 8.4, balance: -4.2 },
        { country: 'United Kingdom', code: 'GB', exports: 2.8, imports: 1.6, balance: 1.2 },
        { country: 'Japan', code: 'JP', exports: 2.4, imports: 2.8, balance: -0.4 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -4.2 }, { quarter: 'Q2 24', value: -5.6 },
        { quarter: 'Q3 24', value: -6.8 }, { quarter: 'Q4 24', value: -7.2 },
        { quarter: 'Q1 25', value: -7.8 }, { quarter: 'Q2 25', value: -9.2 },
        { quarter: 'Q3 25', value: -8.4 }, { quarter: 'Q4 25', value: -9.6 },
      ],
    },
    AU: {
      currentAccount: { balance: 12.8, gdpPct: 0.7, prevBalance: 14.2, tradeBalance: 28.4, primaryIncome: -12.6, secondaryIncome: -3.0 },
      trade: { goodsExports: 42.8, goodsImports: 28.4, goodsBalance: 14.4, goodsYoY: -4.2, servicesExports: 8.6, servicesImports: 12.4, servicesBalance: -3.8, servicesYoY: 6.8 },
      capital: { fdiInward: 14.2, fdiOutward: 8.6, fdiNet: 5.6, portfolioEquityInflow: 6.4, portfolioEquityOutflow: 12.8, portfolioDebtInflow: 18.4, portfolioDebtOutflow: 8.2 },
      reserves: { total: 68.4, monthsOfImports: 2.9, gold: 6.8, sdrs: 8.4, forex: 53.2 },
      topPartners: [
        { country: 'China', code: 'CN', exports: 18.4, imports: 8.6, balance: 9.8 },
        { country: 'Japan', code: 'JP', exports: 8.2, imports: 2.8, balance: 5.4 },
        { country: 'South Korea', code: 'KR', exports: 4.6, imports: 2.4, balance: 2.2 },
        { country: 'United States', code: 'US', exports: 2.8, imports: 4.2, balance: -1.4 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 18.6 }, { quarter: 'Q2 24', value: 16.4 },
        { quarter: 'Q3 24', value: 14.2 }, { quarter: 'Q4 24', value: 13.8 },
        { quarter: 'Q1 25', value: 14.6 }, { quarter: 'Q2 25', value: 13.2 },
        { quarter: 'Q3 25', value: 12.8 }, { quarter: 'Q4 25', value: 11.4 },
      ],
    },
    KR: {
      currentAccount: { balance: 82.4, gdpPct: 4.8, prevBalance: 78.6, tradeBalance: 68.4, primaryIncome: 18.2, secondaryIncome: -4.2 },
      trade: { goodsExports: 62.4, goodsImports: 48.2, goodsBalance: 14.2, goodsYoY: 8.6, servicesExports: 12.8, servicesImports: 18.4, servicesBalance: -5.6, servicesYoY: -2.4 },
      capital: { fdiInward: 8.4, fdiOutward: 14.6, fdiNet: -6.2, portfolioEquityInflow: 12.4, portfolioEquityOutflow: 8.2, portfolioDebtInflow: 18.6, portfolioDebtOutflow: 12.4 },
      reserves: { total: 418.6, monthsOfImports: 10.4, gold: 4.8, sdrs: 12.4, forex: 401.4 },
      topPartners: [
        { country: 'China', code: 'CN', exports: 14.2, imports: 12.8, balance: 1.4 },
        { country: 'United States', code: 'US', exports: 12.4, imports: 8.6, balance: 3.8 },
        { country: 'Vietnam', code: 'VN', exports: 6.8, imports: 4.2, balance: 2.6 },
        { country: 'Japan', code: 'JP', exports: 4.2, imports: 6.4, balance: -2.2 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 68.4 }, { quarter: 'Q2 24', value: 72.8 },
        { quarter: 'Q3 24', value: 78.6 }, { quarter: 'Q4 24', value: 80.2 },
        { quarter: 'Q1 25', value: 81.4 }, { quarter: 'Q2 25', value: 84.6 },
        { quarter: 'Q3 25', value: 82.4 }, { quarter: 'Q4 25', value: 86.2 },
      ],
    },
    MX: {
      currentAccount: { balance: -14.8, gdpPct: -1.1, prevBalance: -12.6, tradeBalance: -8.4, primaryIncome: -18.2, secondaryIncome: 11.8 },
      trade: { goodsExports: 48.6, goodsImports: 42.8, goodsBalance: 5.8, goodsYoY: 4.2, servicesExports: 6.2, servicesImports: 14.6, servicesBalance: -8.4, servicesYoY: -5.6 },
      capital: { fdiInward: 12.4, fdiOutward: 4.2, fdiNet: 8.2, portfolioEquityInflow: 2.8, portfolioEquityOutflow: 4.6, portfolioDebtInflow: 8.4, portfolioDebtOutflow: 4.2 },
      reserves: { total: 218.4, monthsOfImports: 6.1, gold: 0.0, sdrs: 12.8, forex: 205.6 },
      topPartners: [
        { country: 'United States', code: 'US', exports: 38.4, imports: 24.6, balance: 13.8 },
        { country: 'China', code: 'CN', exports: 2.4, imports: 12.8, balance: -10.4 },
        { country: 'Canada', code: 'CA', exports: 2.8, imports: 1.4, balance: 1.4 },
        { country: 'Germany', code: 'DE', exports: 1.2, imports: 2.8, balance: -1.6 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: -10.2 }, { quarter: 'Q2 24', value: -11.4 },
        { quarter: 'Q3 24', value: -12.6 }, { quarter: 'Q4 24', value: -13.2 },
        { quarter: 'Q1 25', value: -13.8 }, { quarter: 'Q2 25', value: -15.4 },
        { quarter: 'Q3 25', value: -14.8 }, { quarter: 'Q4 25', value: -16.2 },
      ],
    },
    CH: {
      currentAccount: { balance: 68.4, gdpPct: 7.2, prevBalance: 64.8, tradeBalance: 42.6, primaryIncome: 32.4, secondaryIncome: -6.6 },
      trade: { goodsExports: 38.6, goodsImports: 28.4, goodsBalance: 10.2, goodsYoY: 3.4, servicesExports: 22.4, servicesImports: 16.8, servicesBalance: 5.6, servicesYoY: 2.8 },
      capital: { fdiInward: 24.8, fdiOutward: 32.4, fdiNet: -7.6, portfolioEquityInflow: 18.4, portfolioEquityOutflow: 22.6, portfolioDebtInflow: 42.8, portfolioDebtOutflow: 38.4 },
      reserves: { total: 862.4, monthsOfImports: 36.4, gold: 1040.0, sdrs: 8.4, forex: -186.0 },
      topPartners: [
        { country: 'Germany', code: 'DE', exports: 8.4, imports: 6.2, balance: 2.2 },
        { country: 'United States', code: 'US', exports: 6.8, imports: 4.2, balance: 2.6 },
        { country: 'France', code: 'FR', exports: 4.2, imports: 3.8, balance: 0.4 },
        { country: 'Italy', code: 'IT', exports: 3.8, imports: 4.6, balance: -0.8 },
      ],
      historicalCA: [
        { quarter: 'Q1 24', value: 58.4 }, { quarter: 'Q2 24', value: 62.2 },
        { quarter: 'Q3 24', value: 64.8 }, { quarter: 'Q4 24', value: 66.4 },
        { quarter: 'Q1 25', value: 67.2 }, { quarter: 'Q2 25', value: 70.4 },
        { quarter: 'Q3 25', value: 68.4 }, { quarter: 'Q4 25', value: 72.8 },
      ],
    },
  };

  return {
    timestamp: new Date().toISOString(),
    summary: {
      largestSurplus: { code: 'CN', value: 352.8 },
      largestDeficit: { code: 'US', value: -266.8 },
    },
    countries: countryData,
  };
}

const FALLBACK = buildFallback();

// ── Section header ──

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1 bg-white/[0.02] border-b border-border/20">
      <div className="w-1 h-2.5" style={{ backgroundColor: BLUE, opacity: 0.6 }} />
      <span className="text-[7px] font-mono font-black uppercase tracking-wider text-white/40">
        {label}
      </span>
    </div>
  );
}

// ── Breakdown bar ──

function BreakdownBar({
  segments,
}: {
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, seg) => s + Math.abs(seg.value), 0);
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-px h-[6px] w-full overflow-hidden bg-white/[0.02]">
      {segments.map((seg) => {
        const pct = (Math.abs(seg.value) / total) * 100;
        return (
          <div
            key={seg.label}
            className="h-full relative group"
            style={{
              width: `${pct}%`,
              backgroundColor: seg.color,
              opacity: 0.5,
            }}
            title={`${seg.label}: $${fmtB(seg.value)}`}
          />
        );
      })}
    </div>
  );
}

// ── Historical CA bar chart (last 8 quarters) ──

function HistoricalCAChart({ data }: { data: QuarterlyCA[] }) {
  if (data.length === 0) return null;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)), 1);
  const barH = 40;
  const midY = barH / 2;

  return (
    <div className="px-2 py-1">
      <svg viewBox={`0 0 ${data.length * 28} ${barH + 12}`} className="w-full" style={{ maxHeight: 56 }}>
        {/* Zero line */}
        <line x1={0} y1={midY} x2={data.length * 28} y2={midY} stroke="rgba(255,255,255,0.06)" strokeWidth={0.5} />
        {data.map((d, i) => {
          const x = i * 28 + 2;
          const w = 22;
          const scale = (midY - 2) / maxAbs;
          const h = Math.abs(d.value) * scale;
          const y = d.value >= 0 ? midY - h : midY;
          const color = d.value >= 0 ? 'rgba(96,165,250,0.5)' : 'rgba(248,113,113,0.5)';

          return (
            <g key={d.quarter}>
              <rect x={x} y={y} width={w} height={Math.max(h, 0.5)} fill={color} />
              <text
                x={x + w / 2}
                y={barH + 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.25)"
                fontSize={5}
                fontFamily="monospace"
              >
                {d.quarter}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Main Panel ──

export function BalanceOfPaymentsPanel() {
  const { data: hookData, isLoading } = useBalanceOfPayments();
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');

  const data: BalanceOfPaymentsData = hookData ?? FALLBACK;
  const countryData = data?.countries?.[selectedCountry];
  const summary = data?.summary;

  const countryName = COUNTRIES.find((c) => c.code === selectedCountry)?.name ?? selectedCountry;

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden text-[9px] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#050505] border-b border-border/20 shrink-0">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4">
            <circle cx="8" cy="8" r="6" fill="none" stroke={BLUE} strokeWidth="0.8" opacity="0.4" />
            <path d="M4 8H12" stroke={BLUE} strokeWidth="0.6" opacity="0.3" />
            <path d="M8 4V12" stroke={BLUE} strokeWidth="0.6" opacity="0.3" />
            <path d="M5 5.5Q8 4 11 5.5" fill="none" stroke={BLUE} strokeWidth="0.8" />
            <path d="M5 10.5Q8 12 11 10.5" fill="none" stroke={BLUE} strokeWidth="0.8" />
          </svg>
          <span className="text-[9px] font-black uppercase tracking-tighter" style={{ color: BLUE }}>
            BALANCE OF PAYMENTS
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {summary && (
            <>
              <span className="text-[6px] text-white/20">SURPLUS:</span>
              <span className="text-[7px] font-bold" style={{ color: GREEN }}>
                {summary.largestSurplus?.code} {fmtBSigned(summary.largestSurplus?.value ?? 0)}
              </span>
              <span className="text-[6px] text-white/15">|</span>
              <span className="text-[6px] text-white/20">DEFICIT:</span>
              <span className="text-[7px] font-bold" style={{ color: RED }}>
                {summary.largestDeficit?.code} {fmtBSigned(summary.largestDeficit?.value ?? 0)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Country tabs */}
      <div className="flex items-center border-b border-border/20 shrink-0 overflow-x-auto scrollbar-thin bg-[#030303]">
        {COUNTRIES.map((c) => (
          <button
            key={c.code}
            onClick={() => setSelectedCountry(c.code)}
            className={`px-2.5 py-1 text-[8px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
              selectedCountry === c.code
                ? 'text-blue-400 border-blue-400 bg-blue-400/[0.04]'
                : 'text-white/30 border-transparent hover:text-white/50 hover:bg-blue-400/[0.02]'
            }`}
          >
            {c.code}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading && !hookData ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Loading...</span>
            </div>
          </div>
        ) : !countryData ? (
          <div className="flex items-center justify-center h-full text-[10px] text-white/40 uppercase">
            No data available for {countryName}
          </div>
        ) : (
          <>
            {/* ── Current Account Overview ── */}
            <SectionHeader label="Current Account Overview" />
            <div className="px-2 py-1.5 border-b border-border/20">
              {/* Large balance number */}
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[16px] font-black"
                  style={{ color: valColor(countryData.currentAccount.balance) }}
                >
                  {fmtBSigned(countryData.currentAccount.balance)}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[7px] text-white/30">
                    {fmtPct(countryData.currentAccount.gdpPct)} GDP
                  </span>
                  <span
                    className="text-[7px] font-bold"
                    style={{
                      color: valColor(
                        countryData.currentAccount.balance - countryData.currentAccount.prevBalance
                      ),
                    }}
                  >
                    {trendArrow(countryData.currentAccount.balance, countryData.currentAccount.prevBalance)}{' '}
                    {fmtBSigned(
                      countryData.currentAccount.balance - countryData.currentAccount.prevBalance
                    )}{' '}
                    vs prev
                  </span>
                </div>
              </div>

              {/* Breakdown bar */}
              <div className="mb-1">
                <BreakdownBar
                  segments={[
                    { label: 'Trade Balance', value: countryData.currentAccount.tradeBalance, color: valColor(countryData.currentAccount.tradeBalance) },
                    { label: 'Primary Income', value: countryData.currentAccount.primaryIncome, color: '#60a5fa' },
                    { label: 'Secondary Income', value: countryData.currentAccount.secondaryIncome, color: '#a78bfa' },
                  ]}
                />
              </div>
              <div className="flex items-center gap-3 text-[6px] text-white/25">
                <span>
                  <span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ backgroundColor: valColor(countryData.currentAccount.tradeBalance), opacity: 0.5 }} />
                  TRADE {fmtBSigned(countryData.currentAccount.tradeBalance)}
                </span>
                <span>
                  <span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ backgroundColor: '#60a5fa', opacity: 0.5 }} />
                  PRIMARY {fmtBSigned(countryData.currentAccount.primaryIncome)}
                </span>
                <span>
                  <span className="inline-block w-1.5 h-1.5 mr-0.5" style={{ backgroundColor: '#a78bfa', opacity: 0.5 }} />
                  SECONDARY {fmtBSigned(countryData.currentAccount.secondaryIncome)}
                </span>
              </div>
            </div>

            {/* ── Trade Balance Detail ── */}
            <SectionHeader label="Trade Balance Detail" />
            <div className="border-b border-border/20">
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="w-16 shrink-0">TYPE</span>
                <span className="w-14 shrink-0 text-right">EXPORTS</span>
                <span className="w-14 shrink-0 text-right">IMPORTS</span>
                <span className="w-14 shrink-0 text-right">BALANCE</span>
                <span className="w-10 shrink-0 text-right">YOY</span>
              </div>
              {[
                { type: 'GOODS', exp: countryData.trade.goodsExports, imp: countryData.trade.goodsImports, bal: countryData.trade.goodsBalance, yoy: countryData.trade.goodsYoY },
                { type: 'SERVICES', exp: countryData.trade.servicesExports, imp: countryData.trade.servicesImports, bal: countryData.trade.servicesBalance, yoy: countryData.trade.servicesYoY },
                { type: 'TOTAL', exp: countryData.trade.goodsExports + countryData.trade.servicesExports, imp: countryData.trade.goodsImports + countryData.trade.servicesImports, bal: countryData.trade.goodsBalance + countryData.trade.servicesBalance, yoy: 0 },
              ].map((row) => {
                const isTotal = row.type === 'TOTAL';
                return (
                  <div
                    key={row.type}
                    className={`flex items-center px-2 py-[3px] border-b hover:bg-blue-400/[0.02] transition-colors ${
                      isTotal ? 'border-white/[0.08] bg-white/[0.02]' : 'border-white/[0.03]'
                    }`}
                  >
                    <span className={`w-16 shrink-0 text-[8px] ${isTotal ? 'font-black text-white/80' : 'text-white/50'}`}>
                      {row.type}
                    </span>
                    <span className="w-14 shrink-0 text-right text-[7px] text-green-400/60">
                      ${fmtB(row.exp)}
                    </span>
                    <span className="w-14 shrink-0 text-right text-[7px] text-red-400/60">
                      ${fmtB(row.imp)}
                    </span>
                    <span
                      className={`w-14 shrink-0 text-right text-[8px] font-bold ${isTotal ? 'font-black' : ''}`}
                      style={{ color: valColor(row.bal) }}
                    >
                      {fmtBSigned(row.bal)}
                    </span>
                    <span
                      className="w-10 shrink-0 text-right text-[7px] font-bold"
                      style={{ color: isTotal ? 'rgba(255,255,255,0.2)' : valColor(row.yoy) }}
                    >
                      {isTotal ? '--' : fmtPct(row.yoy)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Capital Account ── */}
            <SectionHeader label="Capital Account" />
            <div className="border-b border-border/20">
              {/* FDI */}
              <div className="px-2 py-1 border-b border-white/[0.04]">
                <div className="text-[6px] text-white/20 uppercase tracking-wider mb-0.5">
                  Foreign Direct Investment
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="text-[6px] text-white/20">INWARD</span>
                    <span className="text-[8px] font-bold text-green-400/70">
                      ${fmtB(countryData.capital.fdiInward)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] text-white/20">OUTWARD</span>
                    <span className="text-[8px] font-bold text-red-400/70">
                      ${fmtB(countryData.capital.fdiOutward)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[6px] text-white/20">NET</span>
                    <span
                      className="text-[8px] font-black"
                      style={{ color: valColor(countryData.capital.fdiNet) }}
                    >
                      {fmtBSigned(countryData.capital.fdiNet)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Portfolio Flows */}
              <div className="px-2 py-1">
                <div className="text-[6px] text-white/20 uppercase tracking-wider mb-0.5">
                  Portfolio Flows
                </div>
                <div className="flex items-center px-0 py-0.5 text-[6px] font-mono text-white/15 uppercase tracking-wider border-b border-white/[0.04]">
                  <span className="w-14 shrink-0">TYPE</span>
                  <span className="w-14 shrink-0 text-right">INFLOW</span>
                  <span className="w-14 shrink-0 text-right">OUTFLOW</span>
                  <span className="w-14 shrink-0 text-right">NET</span>
                </div>
                {[
                  {
                    type: 'EQUITY',
                    inflow: countryData.capital.portfolioEquityInflow,
                    outflow: countryData.capital.portfolioEquityOutflow,
                  },
                  {
                    type: 'DEBT',
                    inflow: countryData.capital.portfolioDebtInflow,
                    outflow: countryData.capital.portfolioDebtOutflow,
                  },
                ].map((row) => {
                  const net = row.inflow - row.outflow;
                  return (
                    <div
                      key={row.type}
                      className="flex items-center py-[3px] border-b border-white/[0.03] hover:bg-blue-400/[0.02] transition-colors"
                    >
                      <span className="w-14 shrink-0 text-[8px] text-white/50">{row.type}</span>
                      <span className="w-14 shrink-0 text-right text-[7px] text-green-400/60">
                        ${fmtB(row.inflow)}
                      </span>
                      <span className="w-14 shrink-0 text-right text-[7px] text-red-400/60">
                        ${fmtB(row.outflow)}
                      </span>
                      <span
                        className="w-14 shrink-0 text-right text-[8px] font-bold"
                        style={{ color: valColor(net) }}
                      >
                        {fmtBSigned(net)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Reserves ── */}
            <SectionHeader label="Reserves" />
            <div className="border-b border-border/20 px-2 py-1.5">
              <div className="flex items-center gap-4 mb-1">
                <div className="flex flex-col">
                  <span className="text-[6px] text-white/20 uppercase">TOTAL RESERVES</span>
                  <span className="text-[12px] font-black text-blue-400">
                    ${fmtB(countryData.reserves.total)}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[6px] text-white/20 uppercase">MONTHS OF IMPORTS</span>
                  <span className="text-[12px] font-black text-white/60">
                    {countryData.reserves.monthsOfImports.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Composition */}
              <div className="text-[6px] text-white/20 uppercase tracking-wider mb-0.5">
                COMPOSITION
              </div>
              <div className="flex items-center gap-3">
                {[
                  { label: 'GOLD', value: countryData.reserves.gold, color: AMBER },
                  { label: 'SDRS', value: countryData.reserves.sdrs, color: '#a78bfa' },
                  { label: 'FOREX', value: countryData.reserves.forex, color: BLUE },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col">
                    <span className="text-[6px] text-white/20">{item.label}</span>
                    <span className="text-[8px] font-bold" style={{ color: item.color }}>
                      ${fmtB(item.value)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Composition bar */}
              <div className="mt-1">
                <BreakdownBar
                  segments={[
                    { label: 'Gold', value: countryData.reserves.gold, color: AMBER },
                    { label: 'SDRs', value: countryData.reserves.sdrs, color: '#a78bfa' },
                    { label: 'Forex', value: countryData.reserves.forex, color: BLUE },
                  ]}
                />
              </div>
            </div>

            {/* ── Top Trade Partners ── */}
            <SectionHeader label="Top Trade Partners" />
            <div className="border-b border-border/20">
              <div className="flex items-center px-2 py-0.5 border-b border-border/20 text-[6px] font-mono text-white/20 uppercase tracking-wider">
                <span className="w-16 shrink-0">PARTNER</span>
                <span className="w-14 shrink-0 text-right">EXPORTS</span>
                <span className="w-14 shrink-0 text-right">IMPORTS</span>
                <span className="w-14 shrink-0 text-right">BALANCE</span>
              </div>
              {(countryData.topPartners ?? []).map((p) => (
                <div
                  key={p.code}
                  className="flex items-center px-2 py-[3px] border-b border-white/[0.03] hover:bg-blue-400/[0.02] transition-colors"
                >
                  <div className="w-16 shrink-0 flex flex-col">
                    <span className="text-[8px] font-bold text-white/70">{p.code}</span>
                    <span className="text-[6px] text-white/25 truncate">{p.country}</span>
                  </div>
                  <span className="w-14 shrink-0 text-right text-[7px] text-green-400/60">
                    ${fmtB(p.exports)}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[7px] text-red-400/60">
                    ${fmtB(p.imports)}
                  </span>
                  <span
                    className="w-14 shrink-0 text-right text-[8px] font-bold"
                    style={{ color: valColor(p.balance) }}
                  >
                    {fmtBSigned(p.balance)}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Historical CA (last 8 quarters) ── */}
            <SectionHeader label="Historical Current Account (8Q)" />
            <div className="border-b border-border/20">
              <HistoricalCAChart data={countryData.historicalCA ?? []} />
            </div>

            {/* Footer */}
            <div className="px-2 py-1 border-t border-border/20 bg-white/[0.01]">
              <div className="flex items-center justify-between">
                <span className="text-[6px] text-white/15 uppercase tracking-wider">
                  Source: IMF / BEA / National Central Banks
                </span>
                <span className="text-[6px] text-white/15">
                  {data?.timestamp
                    ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '--:--'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
