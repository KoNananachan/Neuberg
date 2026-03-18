import { useQuery } from '@tanstack/react-query';

export interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartData {
  symbol: string;
  candles: Candle[];
  range: string;
  interval: string;
}

export function useChart(symbol: string, range = '6mo', interval = '1d') {
  return useQuery<ChartData>({
    queryKey: ['chart', symbol, range, interval],
    queryFn: async () => {
      const res = await fetch(`/api/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`);
      if (!res.ok) throw new Error('Failed to fetch chart');
      return res.json();
    },
    refetchInterval: interval.includes('m') ? 60_000 : 5 * 60_000,
    staleTime: 30_000,
    enabled: !!symbol,
  });
}
