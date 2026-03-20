import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface DrawdownPoint {
  date: string;
  price: number;
  peak: number;
  drawdown: number;
}

export interface DrawdownEvent {
  peakDate: string;
  troughDate: string;
  recoveryDate: string | null;
  maxDrawdown: number;
  durationDays: number;
  recoveryDays: number | null;
}

export interface DrawdownStats {
  maxDrawdown: number;
  maxDrawdownDate: string;
  currentDrawdown: number;
  distanceFromATH: number;
  avgDrawdown: number;
  avgRecoveryDays: number;
  totalDrawdowns: number;
}

export interface DrawdownData {
  symbol: string;
  period: string;
  series: DrawdownPoint[];
  events: DrawdownEvent[];
  stats: DrawdownStats;
  updatedAt: string;
}

export function useDrawdown(symbol: string, period: string) {
  return useQuery({
    queryKey: ['drawdown', symbol, period],
    queryFn: () => api.get<DrawdownData>(`/drawdown/${encodeURIComponent(symbol)}?period=${period}`),
    enabled: !!symbol,
    refetchInterval: 15 * 60_000,
    staleTime: 60 * 60_000,
  });
}
