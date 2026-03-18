import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface FearGreedCurrent {
  value: number;
  classification: string;
  timestamp: string;
}

export interface FearGreedHistory {
  value: number;
  classification: string;
  date: string;
}

export interface FearGreedData {
  current: FearGreedCurrent;
  history: FearGreedHistory[];
}

export function useFearGreed() {
  return useQuery({
    queryKey: ['fear-greed'],
    queryFn: () => api.get<FearGreedData>('/fear-greed'),
    refetchInterval: 15 * 60 * 1000, // 15 minutes
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
