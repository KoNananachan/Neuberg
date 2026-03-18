import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type SentimentSignal = 'bullish' | 'bearish' | 'neutral';

export interface CompositeScore {
  value: number;
  label: string;
  dailyChange: number;
  weeklyChange: number;
  percentile: number;
}

export interface SentimentComponent {
  name: string;
  value: number;
  signal: SentimentSignal;
  contribution: number;
  description: string;
}

export interface PositioningEntry {
  symbol: string;
  name: string;
  netPosition: number;
  change: number;
  percentile: number;
  extreme: 'long' | 'short' | null;
}

export interface HistoricalComparison {
  period: string;
  score: number;
  label: string;
}

export interface SentimentExtreme {
  date: string;
  score: number;
  label: string;
  outcome: string;
}

export interface MarketSentimentIndexData {
  timestamp: string;
  composite: CompositeScore;
  components: SentimentComponent[];
  positioning: PositioningEntry[];
  historicalComparisons: HistoricalComparison[];
  notableExtremes: SentimentExtreme[];
}

export function useMarketSentimentIndex() {
  return useQuery<MarketSentimentIndexData>({
    queryKey: ['market-sentiment-index'],
    queryFn: () => api.get<MarketSentimentIndexData>('/market-sentiment-index'),
    refetchInterval: 3 * 60_000,
    staleTime: 2 * 60_000,
  });
}
