import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface BreadthMover {
  symbol: string;
  changePercent: number;
  price: number;
}

export interface BreadthData {
  advancers: number;
  decliners: number;
  unchanged: number;
  adRatio: number;
  adLine: number;
  advanceVolume: number;
  declineVolume: number;
  volumeRatio: number;
  newHighs: number;
  newLows: number;
  aboveSMA50: number;
  aboveSMA200: number;
  upMore5: number;
  up2to5: number;
  up0to2: number;
  down0to2: number;
  down2to5: number;
  downMore5: number;
  avgChange: number;
  medianChange: number;
  totalStocks: number;
  topGainers: BreadthMover[];
  topLosers: BreadthMover[];
}

export function useBreadth() {
  return useQuery({
    queryKey: ['breadth'],
    queryFn: () => api.get<BreadthData>('/breadth'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
