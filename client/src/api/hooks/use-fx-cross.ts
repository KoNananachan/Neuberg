import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FxCrossData {
  currencies: string[];
  rates: number[][];
  updatedAt: string;
}

export function useFxCross() {
  return useQuery({
    queryKey: ['fx-cross', 'matrix'],
    queryFn: () => api.get<FxCrossData>('/fx-cross'),
    refetchInterval: 30 * 60_000, // 5 min to match server cache
    staleTime: 2 * 60_000,
  });
}
