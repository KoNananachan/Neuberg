import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface IvRankEntry {
  symbol: string;
  name: string;
  sector: string;
  currentIv: number;
  ivRank: number;
  ivPercentile: number;
  iv52High: number;
  iv52Low: number;
  hvCurrent: number;
  ivHvSpread: number;
  ivChange1d: number;
  ivChange5d: number;
  skew: number;
  termStructure: string;
  signal: string | null;
  ivHistory: number[];
  putCallRatio: number;
}

export interface IvRankResponse {
  entries: IvRankEntry[];
  marketIv: number;
  marketIvChange: number;
  timestamp: string;
}

export function useIvRank() {
  return useQuery<IvRankResponse>({
    queryKey: ['iv-rank'],
    queryFn: () => api.get<IvRankResponse>('/iv-rank'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
