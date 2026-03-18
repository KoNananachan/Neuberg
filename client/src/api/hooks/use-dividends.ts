import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface DividendStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  dividendYield: number | null;
  annualDividend: number | null;
  exDividendDate: string | null;
  paymentDate: string | null;
  payoutRatio: number | null;
  fiveYearAvgYield: number | null;
  category: 'aristocrat' | 'reit' | 'etf' | 'other';
}

export function useDividends() {
  return useQuery<DividendStock[]>({
    queryKey: ['dividends'],
    queryFn: () => api.get('/dividends'),
    refetchInterval: 600_000, // 10 min
    staleTime: 300_000,
  });
}
