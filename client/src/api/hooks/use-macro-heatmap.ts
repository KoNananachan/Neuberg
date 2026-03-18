import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types matching server response ──

export type MacroSignal = 'strong_up' | 'up' | 'flat' | 'down' | 'strong_down';
export type MacroCategory = 'equity' | 'rate' | 'credit' | 'fx' | 'vol' | 'commodity' | 'crypto';
export type RegionSentiment = 'bullish' | 'neutral' | 'bearish';
export type GlobalSentiment = 'risk_on' | 'mixed' | 'risk_off';

export interface MacroIndicator {
  name: string;
  symbol: string;
  price: number;
  changePct: number;
  change5d: number;
  signal: MacroSignal;
  category: MacroCategory;
}

export interface MacroRegion {
  name: string;
  indicators: MacroIndicator[];
  avgChange: number;
  sentiment: RegionSentiment;
}

export interface MacroHeatmapResponse {
  timestamp: string;
  regions: MacroRegion[];
  globalSentiment: GlobalSentiment;
  riskScore: number;
}

export function useMacroHeatmap() {
  return useQuery({
    queryKey: ['macro-heatmap'],
    queryFn: () => api.get<MacroHeatmapResponse>('/macro-heatmap'),
    staleTime: 120_000,       // 2 minutes
    refetchInterval: 180_000, // 3 minutes
  });
}
