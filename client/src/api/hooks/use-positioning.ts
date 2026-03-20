import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type SignalLevel = 'EXTREME_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'EXTREME_BEARISH';
export type IndicatorCategory = 'options' | 'sentiment' | 'leverage' | 'flows' | 'breadth';

export interface PositioningIndicator {
  name: string;
  category: IndicatorCategory;
  currentValue: number;
  previousValue: number;
  change: number;
  percentile: number;
  signal: SignalLevel;
  interpretation: string;
  history: number[];
  unit: string;
}

export interface FlowData {
  category: string;
  weeklyFlow: number;
  monthlyFlow: number;
  ytdFlow: number;
  trend: 'inflow' | 'outflow' | 'neutral';
}

export interface PositioningResponse {
  indicators: PositioningIndicator[];
  flows: FlowData[];
  overallSentiment: {
    score: number;
    label: string;
    bullCount: number;
    bearCount: number;
    neutralCount: number;
  };
  timestamp: string;
}

export function usePositioning() {
  return useQuery({
    queryKey: ['positioning'],
    queryFn: () => api.get<PositioningResponse>('/positioning'),
    staleTime: 2 * 60_000, // 2 minutes
  });
}
