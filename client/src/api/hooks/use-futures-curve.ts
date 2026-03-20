import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CurvePoint {
  month: string;
  symbol: string;
  price: number;
  change: number | null;
  changePct: number | null;
  daysToExpiry: number;
}

export interface SpreadEntry {
  pair: string;
  spread: number;
}

export interface FuturesCurveData {
  commodity: string;
  name: string;
  unit: string;
  spotSymbol: string;
  spotPrice: number | null;
  spotChange: number | null;
  spotChangePct: number | null;
  curve: CurvePoint[];
  shape: 'contango' | 'backwardation' | 'mixed' | 'flat';
  frontBackSpread: number | null;
  spreads: SpreadEntry[];
  updatedAt: string;
}

export interface CommodityOption {
  key: string;
  name: string;
  symbol: string;
  unit: string;
}

export function useFuturesCurve(commodity: string) {
  return useQuery({
    queryKey: ['futures-curve', commodity],
    queryFn: () => api.get<FuturesCurveData>(`/futures-curve/${commodity}`),
    enabled: !!commodity,
    staleTime: 60 * 60_000,
  });
}

export function useFuturesCurveCommodities() {
  return useQuery({
    queryKey: ['futures-curve-commodities'],
    queryFn: () => api.get<CommodityOption[]>('/futures-curve'),
    staleTime: 60 * 60_000,
  });
}
