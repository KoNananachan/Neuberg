import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type SentimentLevel = 'extreme_fear' | 'fear' | 'neutral' | 'greed' | 'extreme_greed';

export interface SentimentIndicator {
  name: string;
  category: 'fear_greed' | 'positioning';
  score: number;
  level: SentimentLevel;
  value: number;
  description: string;
  sparkline: number[];
}

export interface SentimentHistoryEntry {
  date: string;
  composite: number;
  fearGreed: number;
  positioning: number;
}

export interface ContrarianSignal {
  signal: 'buy' | 'sell' | 'neutral';
  description: string;
  confidence: number;
}

export interface SentimentDashboardData {
  timestamp: string;
  compositeScore: number;
  level: SentimentLevel;
  previousClose: number;
  indicators: SentimentIndicator[];
  history: SentimentHistoryEntry[];
  contrarian: ContrarianSignal;
}

export function useSentimentDashboard() {
  return useQuery({
    queryKey: ['sentiment-dashboard'],
    queryFn: () => api.get<SentimentDashboardData>('/sentiment-dashboard'),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // 3 minutes
  });
}
