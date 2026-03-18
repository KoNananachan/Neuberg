import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { useAppStore } from '../../stores/use-app-store';

export interface VolatilityData {
  vix: number;
  vixChange: number;
  vixChangePercent: number;
  vix9d: number | null;
  vix3m: number | null;
  vix6m: number | null;
  termStructure: Array<{ tenor: string; value: number }>;
  isContango: boolean;
  hv20: number;
  hv60: number;
  hv252: number;
  vixPercentile: number;
  vixHigh252: number;
  vixLow252: number;
  etfs: Array<{ symbol: string; name: string; price: number; changePercent: number }>;
}

export interface StockVolData {
  symbol: string;
  price: number;
  hv20: number;
  hv60: number;
  hv252: number;
  hvSeries: Array<{ timestamp: number; hv20: number }>;
}

export function useVolatility() {
  return useQuery({
    queryKey: ['volatility'],
    queryFn: () => api.get<VolatilityData>('/volatility'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function useStockVolatility() {
  const symbol = useAppStore((s) => s.selectedSymbol);
  return useQuery({
    queryKey: ['volatility', symbol],
    queryFn: () => api.get<StockVolData>(`/volatility/${symbol}`),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}
