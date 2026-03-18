import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

type PeriodKey = '1d' | '1w' | '1m' | '3m' | '6m' | 'ytd' | '1y';

export interface SectorPerformanceEntry {
  symbol: string;
  name: string;
  price: number | null;
  returns: Record<PeriodKey, number | null>;
  relativeToSpy: Record<PeriodKey, number | null>;
}

export interface SectorPerformanceResponse {
  sectors: SectorPerformanceEntry[];
  spy: SectorPerformanceEntry;
  updatedAt: string;
}

export function useSectorPerformance() {
  return useQuery<SectorPerformanceResponse>({
    queryKey: ['sector-performance'],
    queryFn: () => api.get('/sector-performance'),
    refetchInterval: 10 * 60_000, // 10 min
  });
}
