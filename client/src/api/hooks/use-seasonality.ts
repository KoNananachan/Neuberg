import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface MonthlyEntry {
  month: number;
  name: string;
  avgReturn: number;
  medianReturn: number;
  winRate: number;
  bestYear: { year: number; return: number };
  worstYear: { year: number; return: number };
}

export interface WeekdayEntry {
  day: number;
  name: string;
  avgReturn: number;
  winRate: number;
}

export interface YearMonthEntry {
  year: number;
  returns: (number | null)[];
}

export interface SellInMay {
  mayOct: number;
  novApr: number;
}

export interface SeasonalityData {
  symbol: string;
  years: number;
  dataYears: number;
  monthly: MonthlyEntry[];
  weekday: WeekdayEntry[];
  yearMonth: YearMonthEntry[];
  sellInMay: SellInMay;
}

export function useSeasonality(symbol: string, years = 10) {
  return useQuery({
    queryKey: ['seasonality', symbol, years],
    queryFn: () => api.get<SeasonalityData>(`/seasonality/${encodeURIComponent(symbol)}?years=${years}`),
    enabled: !!symbol,
    staleTime: 30 * 60_000,
    refetchInterval: 60 * 60_000,
  });
}
