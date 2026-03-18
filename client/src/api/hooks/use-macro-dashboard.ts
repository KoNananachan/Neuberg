import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface MacroQuoteItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
}

export interface MacroDerivedMetrics {
  yieldSpread: number | null;
  yieldCurveStatus: string;
  dollarIndex: number | null;
  goldOilRatio: number | null;
  copperGoldRatio: number | null;
  realYieldEstimate: number | null;
  riskAppetite: 'Risk On' | 'Neutral' | 'Risk Off';
}

export interface MacroDashboardData {
  timestamp: string;
  indices: MacroQuoteItem[];
  bonds: MacroQuoteItem[];
  commodities: MacroQuoteItem[];
  fx: MacroQuoteItem[];
  volatility: {
    vix: number;
    change: number;
    changePct: number;
    percentile: number;
  };
  crypto: MacroQuoteItem[];
  realEstate: MacroQuoteItem[];
  derived: MacroDerivedMetrics;
}

export function useMacroDashboard() {
  return useQuery({
    queryKey: ['macro-dashboard'],
    queryFn: () => api.get<MacroDashboardData>('/macro-dashboard'),
    staleTime: 2 * 60_000,
    refetchInterval: 3 * 60_000,
  });
}
