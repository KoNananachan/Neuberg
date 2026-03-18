import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { useAppStore } from '../../stores/use-app-store';

export interface FinancialStatement {
  date: string;
  period: 'annual' | 'quarterly';
  // Income Statement
  revenue: number | null;
  costOfRevenue: number | null;
  grossProfit: number | null;
  operatingExpenses: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  ebitda: number | null;
  // Balance Sheet
  totalAssets: number | null;
  totalLiabilities: number | null;
  stockholderEquity: number | null;
  cash: number | null;
  totalCurrentAssets: number | null;
  totalCurrentLiabilities: number | null;
  longTermDebt: number | null;
  // Cash Flow
  operatingCashFlow: number | null;
  capitalExpenditure: number | null;
  freeCashFlow: number | null;
  financingCashFlow: number | null;
  investingCashFlow: number | null;
  dividendsPaid: number | null;
}

export interface FinancialsResponse {
  symbol: string;
  annual: FinancialStatement[];
  quarterly: FinancialStatement[];
}

export function useFinancials() {
  const symbol = useAppStore((s) => s.selectedSymbol);
  return useQuery({
    queryKey: ['financials', symbol],
    queryFn: () => api.get<FinancialsResponse>(`/financials/${symbol}`),
    enabled: !!symbol,
    staleTime: 300_000,
    refetchInterval: false,
  });
}
