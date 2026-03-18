import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types matching server response ──

export interface SectorStock {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  marketCap: number;
  volume: number;
}

export interface SectorEntry {
  name: string;
  etfSymbol: string;
  changePct: number;
  marketCap: number;
  stocks: SectorStock[];
}

export interface SectorHeatmapSummary {
  advancers: number;
  decliners: number;
  marketBreadth: number;
  strongestSector: string;
  weakestSector: string;
}

export interface SectorHeatmapResponse {
  timestamp: string;
  sectors: SectorEntry[];
  summary: SectorHeatmapSummary;
}

export function useSectorHeatmap() {
  return useQuery({
    queryKey: ['sector-heatmap'],
    queryFn: () => api.get<SectorHeatmapResponse>('/sector-heatmap'),
    staleTime: 120_000,       // 2 minutes
    refetchInterval: 180_000, // 3 minutes
  });
}
