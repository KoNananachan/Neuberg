import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type SignalType = 'golden_cross' | 'death_cross' | 'rsi_overbought' | 'rsi_oversold'
  | 'volume_breakout' | 'near_52w_high' | 'near_52w_low' | 'macd_bullish' | 'macd_bearish';

export interface TechSignal {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  signal: SignalType;
  value: number;
  description: string;
}

export function useScanner() {
  return useQuery({
    queryKey: ['scanner'],
    queryFn: () => api.get<TechSignal[]>('/scanner'),
    refetchInterval: 300_000, // 5 min
    staleTime: 120_000,
  });
}
