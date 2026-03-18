import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface TopHolder {
  institution: string;
  shares: number;
  value: number;
  pctOfFloat: number;
  changeShares: number;
  changePercent: number;
  quarter: string;
}

export interface Concentration {
  top10pct: number;
  top25pct: number;
  herfindahl: number;
}

export interface StockOwnership {
  ticker: string;
  name: string;
  institutionalOwnership: number;
  insiderOwnership: number;
  totalInstitutions: number;
  newPositions: number;
  closedPositions: number;
  increasedPositions: number;
  decreasedPositions: number;
  topHolders: TopHolder[];
  concentration: Concentration;
}

export interface FlowEntry {
  institution: string;
  ticker: string;
  changeShares: number;
  changeValue: number;
}

export interface InstitutionalOwnershipData {
  stocks: StockOwnership[];
  mostBought: FlowEntry[];
  mostSold: FlowEntry[];
  generatedAt: string;
}

export function useInstitutionalOwnership() {
  return useQuery<InstitutionalOwnershipData>({
    queryKey: ['institutional-ownership'],
    queryFn: () => api.get<InstitutionalOwnershipData>('/institutional-ownership'),
    refetchInterval: 5 * 60_000,
    staleTime: 3 * 60_000,
  });
}
