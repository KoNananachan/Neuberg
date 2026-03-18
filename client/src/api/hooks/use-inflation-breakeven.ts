import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface BreakevenEntry {
  tenor: string;
  nominalYield: number;
  realYield: number;
  breakeven: number;
  change1d: number;
  change1w: number;
  change1m: number;
  high52w: number;
  low52w: number;
  percentile: number;
  history: number[];
}

export interface InflationIndicator {
  name: string;
  value: number;
  previousValue: number;
  change: number;
  trend: 'rising' | 'falling' | 'stable';
  target: number | null;
  history: number[];
}

export interface InflationBreakevenData {
  breakevens: BreakevenEntry[];
  indicators: InflationIndicator[];
  fiveYearFiveYear: number;
  realYieldCurve: { tenor: string; rate: number }[];
  nominalCurve: { tenor: string; rate: number }[];
  timestamp: string;
}

export function useInflationBreakeven() {
  return useQuery<InflationBreakevenData>({
    queryKey: ['inflation-breakeven'],
    queryFn: () => api.get<InflationBreakevenData>('/inflation-breakeven'),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}
