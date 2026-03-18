import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface InstitutionHolder {
  name: string;
  shares: number;
  value: number;
  pctHeld: number;
  change: number;
  date: string;
}

export interface FundHolder {
  name: string;
  shares: number;
  value: number;
  pctHeld: number;
  change: number;
  date: string;
}

export interface InsiderHolder {
  name: string;
  relation: string;
  shares: number;
  value: number;
  lastTransaction: string;
  lastDate: string;
  lastShares: number;
}

export interface HoldingsData {
  symbol: string;
  companyName: string;
  price: number;
  marketCap: number | null;
  ownership: {
    insiderPct: number | null;
    institutionPct: number | null;
    institutionCount: number | null;
    institutionFloat: number | null;
  };
  topInstitutions: InstitutionHolder[];
  topFunds: FundHolder[];
  insiders: InsiderHolder[];
  updatedAt: string;
}

export function useHoldings(symbol: string) {
  return useQuery<HoldingsData>({
    queryKey: ['holdings', symbol],
    queryFn: () => api.get<HoldingsData>(`/holdings/${encodeURIComponent(symbol)}`),
    enabled: !!symbol,
    staleTime: 30 * 60_000, // 30 min
    refetchInterval: 30 * 60_000,
  });
}
