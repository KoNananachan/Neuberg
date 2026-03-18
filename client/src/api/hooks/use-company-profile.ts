import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { useAppStore } from '../../stores/use-app-store';

export interface CompanyOfficer {
  name: string;
  title: string;
  age: number | null;
  totalPay: number | null;
}

export interface CompanyProfile {
  symbol: string;
  name: string | null;
  longBusinessSummary: string | null;
  industry: string | null;
  sector: string | null;
  fullTimeEmployees: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  website: string | null;
  officers: CompanyOfficer[];
  marketCap: number | null;
  totalRevenue: number | null;
  revenueGrowth: number | null;
  grossMargins: number | null;
  operatingMargins: number | null;
  profitMargins: number | null;
  returnOnEquity: number | null;
  returnOnAssets: number | null;
  freeCashflow: number | null;
  earningsGrowth: number | null;
  recommendationKey: string | null;
  targetMeanPrice: number | null;
  numberOfAnalysts: number | null;
}

export function useCompanyProfile() {
  const symbol = useAppStore((s) => s.selectedSymbol);
  return useQuery<CompanyProfile>({
    queryKey: ['company-profile', symbol],
    queryFn: () => api.get<CompanyProfile>(`/company-profile/${symbol}`),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}
