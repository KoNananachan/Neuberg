import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { useAppStore } from '../../stores/use-app-store';

export interface PivotPointsData {
  symbol: string;
  currentPrice: number;
  previousHigh: number;
  previousLow: number;
  previousClose: number;
  previousOpen: number;
  methods: {
    classic: { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number };
    fibonacci: { pivot: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number };
    camarilla: { r1: number; r2: number; r3: number; r4: number; s1: number; s2: number; s3: number; s4: number };
    woodie: { pivot: number; r1: number; r2: number; s1: number; s2: number };
    demark: { r1: number; s1: number };
  };
}

export function usePivotPoints() {
  const symbol = useAppStore((s) => s.selectedSymbol);
  return useQuery({
    queryKey: ['pivot-points', symbol],
    queryFn: () => api.get<PivotPointsData>(`/pivot-points/${symbol}`),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}
