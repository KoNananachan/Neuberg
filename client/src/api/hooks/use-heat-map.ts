import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface HeatMapStock {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: number | null;
  volume: number;
}

export interface SectorData {
  sector: string;
  sectorSymbol: string;
  sectorChange: number;
  stocks: HeatMapStock[];
}

export function useHeatMap() {
  return useQuery({
    queryKey: ['heat-map'],
    queryFn: () => api.get<SectorData[]>('/heat-map'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
