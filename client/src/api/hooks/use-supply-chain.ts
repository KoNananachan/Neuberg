import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface SupplyChainIndicator {
  name: string;
  category: string;
  value: number;
  unit: string;
  change1m: number;
  change3m: number;
  changeYtd: number;
  percentile: number;
  direction: string;
  zScore: number;
  history: number[];
  signal: string | null;
}

export interface SupplyChainSector {
  sector: string;
  pressureScore: number;
  trend: string;
  keyIssue: string;
  leadTime: number;
  leadTimeVsNormal: number;
}

export interface SupplyChainData {
  indicators: SupplyChainIndicator[];
  sectors: SupplyChainSector[];
  compositeIndex: number;
  compositeZScore: number;
  compositeDirection: string;
  timestamp: string;
}

export function useSupplyChain() {
  return useQuery<SupplyChainData>({
    queryKey: ['supply-chain'],
    queryFn: () => api.get<SupplyChainData>('/supply-chain'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}
