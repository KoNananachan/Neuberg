import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CotEntry {
  symbol: string;
  name: string;
  category: 'equity_index' | 'metal' | 'energy' | 'currency' | 'agriculture' | 'bond';
  commercialLong: number;
  commercialShort: number;
  commercialNet: number;
  commercialNetChange: number;
  specLong: number;
  specShort: number;
  specNet: number;
  specNetChange: number;
  smallLong: number;
  smallShort: number;
  smallNet: number;
  openInterest: number;
  oiChange: number;
  specNetPctOI: number;
  commercialNetPctOI: number;
  specNetPercentile: number;
  extremeSignal: 'EXTREME_LONG' | 'EXTREME_SHORT' | null;
  specNetHistory: number[];
  reportDate: string;
}

export interface CotResponse {
  entries: CotEntry[];
  timestamp: string;
  reportDate: string;
}

export function useCotReport() {
  return useQuery<CotResponse>({
    queryKey: ['cot-report'],
    queryFn: () => api.get<CotResponse>('/cot-report'),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}
