import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface ShippingRate {
  route: string;
  type: string;
  rate: number;
  change1w: number;
  change1m: number;
  index: number;
  capacity: number;
}

export interface PortCongestion {
  port: string;
  avgWaitDays: number;
  vesselQueue: number;
  throughput: number;
  change1m: number;
  congestion: 'SEVERE' | 'HIGH' | 'MODERATE' | 'LOW';
}

export interface SupplyChainIndicator {
  indicator: string;
  value: number;
  change1m: number;
  percentile: number;
  signal: 'STRESS' | 'ELEVATED' | 'NORMAL' | 'EASING';
}

export interface GlobalSupplyChainSummary {
  avgShippingRate: number;
  avgPortWait: number;
  supplyChainStress: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'NORMAL' | 'LOW';
  bdiLevel: number;
}

export interface GlobalSupplyChainData {
  summary: GlobalSupplyChainSummary;
  shippingRates: ShippingRate[];
  portCongestion: PortCongestion[];
  indicators: SupplyChainIndicator[];
  timestamp: string;
}

export function useGlobalSupplyChain() {
  return useQuery<GlobalSupplyChainData>({
    queryKey: ['global-supply-chain'],
    queryFn: () => api.get<GlobalSupplyChainData>('/global-supply-chain'),
    staleTime: 5 * 60 * 1000,
  });
}
