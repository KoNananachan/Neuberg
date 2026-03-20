import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// -- CDS Curve types --

export interface CDSTenor {
  tenor: string;        // e.g. '6M', '1Y', '2Y', '3Y', '5Y', '7Y', '10Y'
  spread: number;       // bps
  change1d: number;     // bps daily change
  change1w: number;     // bps weekly change
  upfront: number;      // upfront points (%)
}

export interface CDSEntity {
  name: string;
  ticker: string;
  rating: string;
  sector: string;
  docClause: string;    // e.g. 'CR14', 'MM14'
  recoveryRate: number;
  tenors: CDSTenor[];
}

// -- Hazard Rate types --

export interface HazardRatePoint {
  tenor: string;
  hazardRate: number;         // annualized %
  cumulativeDefault: number;  // cumulative PD %
  survivalProb: number;       // %
}

export interface HazardRateData {
  recoveryAssumption: number;
  points: HazardRatePoint[];
}

// -- Curve Analytics types --

export interface CurveAnalytics {
  slope5s10s: number;         // bps
  slope1s5s: number;          // bps
  curvature: number;          // butterfly metric
  rollDown3m: number;         // bps
  rollDown6m: number;         // bps
  carry3m: number;            // bps
  carry6m: number;            // bps
  dv01: number;               // $ per 1bp
  convexity: number;
}

// -- Basis Analysis types --

export interface BasisPoint {
  tenor: string;
  cdsBasis: number;           // bps (CDS - bond spread)
  zSpread: number;            // bps
  assetSwapSpread: number;    // bps
  trend: 'widening' | 'tightening' | 'stable';
  change1w: number;           // bps
}

export interface BasisAnalysis {
  points: BasisPoint[];
  avgBasis: number;
  basisTrend: 'positive' | 'negative' | 'neutral';
}

// -- Root response --

export interface CreditCurveBuilderData {
  timestamp: string;
  entity: CDSEntity;
  hazardRates: HazardRateData;
  analytics: CurveAnalytics;
  basis: BasisAnalysis;
}

export function useCreditCurveBuilder() {
  return useQuery({
    queryKey: ['credit-curve-builder'],
    queryFn: () => api.get<CreditCurveBuilderData>('/credit-curve-builder'),
    staleTime: 10 * 60_000,
    refetchInterval: 30 * 60_000,
  });
}
