import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

interface CurrencyStrength {
  code: string;
  strength: number;
  rank: number;
  change: number;
  pairs: Record<string, number>;
}

interface CurrencyStrengthData {
  currencies: CurrencyStrength[];
  updatedAt: string;
}

export type { CurrencyStrength, CurrencyStrengthData };

export function useCurrencyStrength() {
  return useQuery<CurrencyStrengthData>({
    queryKey: ['currency-strength'],
    queryFn: () => api.get<CurrencyStrengthData>('/currency-strength'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
