import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface EarningsSurpriseHistoryEntry {
  date: string;
  quarter: string;
  epsActual: number | null;
  epsEstimate: number | null;
  surprisePct: number | null;
  beat: boolean;
  dayReturn: number | null;
  fiveDayReturn: number | null;
  tenDayReturn: number | null;
  twentyDayReturn: number | null;
}

export interface EarningsSurpriseStats {
  beatRate: number | null;
  avgSurprise: number | null;
  beatStreak: number;
  avgBeatDayReturn: number | null;
  avgMissDayReturn: number | null;
  avgDrift20d: number | null;
  nextEarningsDate: string | null;
  epsTrend: 'up' | 'down' | 'flat' | null;
}

export interface DriftPoint {
  day: number;
  beatAvg: number | null;
  missAvg: number | null;
}

export interface EarningsSurpriseData {
  symbol: string;
  name: string;
  history: EarningsSurpriseHistoryEntry[];
  stats: EarningsSurpriseStats;
  driftCurve: DriftPoint[];
}

export function useEarningsSurprise(symbol: string) {
  return useQuery<EarningsSurpriseData>({
    queryKey: ['earnings-surprise', symbol],
    queryFn: () => api.get(`/earnings-surprise/${encodeURIComponent(symbol)}`),
    enabled: !!symbol && symbol.length > 0,
    staleTime: 15 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}
