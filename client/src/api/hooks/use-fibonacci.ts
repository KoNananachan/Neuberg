import { useQuery } from '@tanstack/react-query';
import { api } from '../client';
import { useAppStore } from '../../stores/use-app-store';

export interface FibLevel {
  level: string;
  price: number;
  isExtension: boolean;
}

export interface FibExtension {
  level: string;
  price: number;
}

export interface PriceSeries {
  timestamp: number;
  close: number;
  high: number;
  low: number;
}

export interface FibonacciData {
  symbol: string;
  currentPrice: number;
  swingHigh: number;
  swingHighDate: string;
  swingLow: number;
  swingLowDate: string;
  trend: 'uptrend' | 'downtrend';
  levels: FibLevel[];
  extensions: FibExtension[];
  priceSeries: PriceSeries[];
}

export function useFibonacci(range?: string) {
  const symbol = useAppStore((s) => s.selectedSymbol);
  return useQuery({
    queryKey: ['fibonacci', symbol, range || '6mo'],
    queryFn: () => api.get<FibonacciData>(`/fibonacci/${symbol}?range=${range || '6mo'}`),
    enabled: !!symbol,
    staleTime: 300_000,
  });
}
