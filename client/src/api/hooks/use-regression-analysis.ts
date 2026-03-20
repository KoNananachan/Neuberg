import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CAPMResult {
  alpha: number;
  beta: number;
  rSquared: number;
  stdError: number;
  tStatAlpha: number;
  tStatBeta: number;
  pValueAlpha: number;
  pValueBeta: number;
}

export interface FamaFrench3Result {
  alpha: number;
  mktRf: number;
  smb: number;
  hml: number;
  rSquared: number;
  adjRSquared: number;
}

export interface Carhart4Result {
  alpha: number;
  mktRf: number;
  smb: number;
  hml: number;
  umd: number;
  rSquared: number;
}

export interface RollingBetaPoint {
  date: string;
  beta60d: number;
  beta120d: number;
  beta252d: number;
}

export interface ResidualStats {
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  jarqueBera: number;
  durbinWatson: number;
}

export interface BenchmarkMetrics {
  correlation: number;
  trackingError: number;
  informationRatio: number;
  treynorRatio: number;
  sortinoRatio: number;
}

export interface RegressionAsset {
  ticker: string;
  name: string;
  capm: CAPMResult;
  famaFrench3: FamaFrench3Result;
  carhart4: Carhart4Result;
  rollingBeta: RollingBetaPoint[];
  residualStats: ResidualStats;
  benchmarkMetrics: BenchmarkMetrics;
}

export interface RegressionAnalysisData {
  assets: RegressionAsset[];
  generatedAt: string;
}

export function useRegressionAnalysis() {
  return useQuery({
    queryKey: ['regression-analysis'],
    queryFn: () => api.get<RegressionAnalysisData>('/regression-analysis'),
    staleTime: 60 * 60_000,
  });
}
