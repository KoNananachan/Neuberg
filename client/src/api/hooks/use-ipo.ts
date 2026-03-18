import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface IPOEntry {
  symbol: string;
  name: string;
  ipoDate: string;
  ipoPrice: number | null;
  currentPrice: number | null;
  changeFromIPO: number | null;
  exchange: string;
  status: 'upcoming' | 'priced' | 'trading';
  sector: string;
}

export function useIPO() {
  return useQuery<IPOEntry[]>({
    queryKey: ['ipo'],
    queryFn: () => api.get('/ipo'),
    refetchInterval: 600_000, // 10 min
    staleTime: 300_000,
  });
}
