import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CorrelationPair {
  asset1: string;
  asset2: string;
  impliedCorr: number;
  realizedCorr30d: number;
  realizedCorr90d: number;
  change1w: number;
}

export interface IcjData {
  current: number;
  change1d: number;
  change1w: number;
  percentile30d: number;
  percentile90d: number;
  min52w: number;
  max52w: number;
}

export interface DispersionInfo {
  current: number;
  avg30d: number;
  avg90d: number;
  zscore: number;
}

export interface SectorCorrelation {
  sector: string;
  intraCorr: number;
  interCorr: number;
}

export interface ImpliedCorrelationData {
  matrix: CorrelationPair[];
  icj: IcjData;
  dispersion: DispersionInfo;
  sectorCorrelations: SectorCorrelation[];
  generatedAt: string;
}

export function useImpliedCorrelation() {
  return useQuery<ImpliedCorrelationData>({
    queryKey: ['implied-correlation'],
    queryFn: () => api.get<ImpliedCorrelationData>('/implied-correlation'),
    refetchInterval: 30 * 60_000,
    staleTime: 10 * 60_000,
  });
}
