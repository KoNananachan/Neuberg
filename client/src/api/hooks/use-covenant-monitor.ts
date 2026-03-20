import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export type CovenantStatus = 'Compliant' | 'Warning' | 'Breach' | 'Waived';
export type IssuerCategory = 'IG' | 'HY';

export interface Covenant {
  name: string;
  threshold: number;
  currentValue: number;
  headroom: number;
  status: CovenantStatus;
  lastTestDate: string;
}

export interface DebtMetrics {
  totalDebt: number;
  ebitda: number;
  leverage: number;
  interestCoverage: number;
  freeCashFlow: number;
  netDebt: number;
}

export interface MaturityProfile {
  year: number;
  amount: number;
}

export interface CovenantEvent {
  date: string;
  issuer: string;
  ticker: string;
  type: 'BREACH' | 'WAIVER' | 'AMENDMENT' | 'TEST' | 'DOWNGRADE' | 'UPGRADE' | 'MATURITY' | 'REFINANCE';
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface Issuer {
  name: string;
  ticker: string;
  rating: string;
  sector: string;
  category: IssuerCategory;
  covenants: Covenant[];
  overallStatus: CovenantStatus;
  debtMetrics: DebtMetrics;
  maturityProfile: MaturityProfile[];
  recentEvents: CovenantEvent[];
}

export interface CovenantSummary {
  totalIssuers: number;
  compliant: number;
  warning: number;
  breach: number;
  avgLeverage: number;
  avgCoverage: number;
}

export interface CovenantMonitorData {
  issuers: Issuer[];
  summary: CovenantSummary;
  generatedAt: string;
}

export function useCovenantMonitor() {
  return useQuery({
    queryKey: ['covenant-monitor'],
    queryFn: () => api.get<CovenantMonitorData>('/covenant-monitor'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
