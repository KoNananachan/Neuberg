import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// ── Types ──

export interface AltmanZComponents {
  workingCapital: number;
  retainedEarnings: number;
  ebit: number;
  marketEquity: number;
  sales: number;
}

export interface AltmanZ {
  score: number;
  zone: 'Safe' | 'Grey' | 'Distress';
  components: AltmanZComponents;
}

export interface BeneishMComponents {
  dsri: number;
  gmi: number;
  aqi: number;
  sgi: number;
  depi: number;
  sgai: number;
  tata: number;
  lvgi: number;
}

export interface BeneishM {
  score: number;
  manipulation: 'Unlikely' | 'Possible' | 'Likely';
  components: BeneishMComponents;
}

export interface PiotroskiFComponents {
  roa: boolean;
  cfo: boolean;
  deltaRoa: boolean;
  accrual: boolean;
  deltaLeverage: boolean;
  deltaLiquidity: boolean;
  equityOffer: boolean;
  deltaMargin: boolean;
  deltaTurnover: boolean;
}

export interface PiotroskiF {
  score: number;
  grade: 'Strong' | 'Moderate' | 'Weak';
  components: PiotroskiFComponents;
}

export interface EarningsQualityStock {
  ticker: string;
  name: string;
  sector: string;
  marketCap: number;
  altmanZ: AltmanZ;
  beneishM: BeneishM;
  piotroskiF: PiotroskiF;
  accrualRatio: number;
  earningsPersistence: number;
  cashFlowToIncome: number;
  revenueQuality: number;
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface EarningsQualityResponse {
  stocks: EarningsQualityStock[];
  generatedAt: string;
}

// ── Hook ──

export function useEarningsQuality() {
  return useQuery({
    queryKey: ['earnings-quality'],
    queryFn: () => api.get<EarningsQualityResponse>('/earnings-quality'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
