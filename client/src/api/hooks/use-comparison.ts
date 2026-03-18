import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface ComparisonDataPoint {
  timestamp: number;
  normalizedReturn: number;
}

export interface ComparisonSeries {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  dataPoints: ComparisonDataPoint[];
}

export interface ComparisonData {
  symbols: string[];
  range: string;
  series: ComparisonSeries[];
}

export function useComparison(symbols: string[], range: string) {
  return useQuery<ComparisonData>({
    queryKey: ['comparison', symbols.join(','), range],
    queryFn: () => api.get<ComparisonData>(`/comparison?symbols=${symbols.join(',')}&range=${range}`),
    enabled: symbols.length >= 2,
    staleTime: 300_000,
    refetchInterval: 300_000,
  });
}
