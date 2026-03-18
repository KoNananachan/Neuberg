import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface EarningsEvent {
  symbol: string;
  name: string;
  date: string;
  time: string;
  quarter: string;
  epsEstimate: number;
  epsActual: number | null;
  epsSurprise: number | null;
  revenueEstimate: number;
  revenueActual: number | null;
  revenueSurprise: number | null;
  expectedMove: number;
  avgHistoricalMove: number;
  lastQuarterSurprise: number;
  marketCap: number;
  sector: string;
  reported: boolean;
  surpriseHistory: number[];
  priceReaction: number | null;
}

export interface EarningsCalendarResponse {
  events: EarningsEvent[];
  weekStart: string;
  weekEnd: string;
  totalThisWeek: number;
  timestamp: string;
}

export function useEarningsCalendarHeatmap() {
  return useQuery<EarningsCalendarResponse>({
    queryKey: ['earnings-calendar-heatmap'],
    queryFn: () => api.get('/earnings-calendar'),
    refetchInterval: 5 * 60_000, // 5 min
    staleTime: 2 * 60_000, // 2 min
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEarningsCalendar() {
  return useQuery({
    queryKey: ['earnings-calendar'],
    queryFn: () => api.get<any>('/earnings-calendar'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
