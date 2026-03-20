import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface AnomalyFinding {
  label: string;
  avgReturn: number;
  winRate: number;
  sampleSize: number;
  strength: 'strong' | 'moderate' | 'weak' | 'none';
}

export interface Anomaly {
  name: string;
  category: 'calendar' | 'time' | 'structural';
  description: string;
  currentlyActive: boolean;
  findings: AnomalyFinding[];
  insight: string;
}

export interface MarketAnomaliesData {
  timestamp: string;
  anomalies: Anomaly[];
  activeNow: string[];
  summary: string;
}

export function useMarketAnomalies() {
  return useQuery({
    queryKey: ['market-anomalies'],
    queryFn: () => api.get<MarketAnomaliesData>('/market-anomalies'),
    staleTime: 15 * 60_000,
  });
}
