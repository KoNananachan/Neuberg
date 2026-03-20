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
    staleTime: 2 * 60_000,
  });
}
