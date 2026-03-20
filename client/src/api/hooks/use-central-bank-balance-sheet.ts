import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface BalanceSheetEntry {
  centralBank: string;
  code: string;
  totalAssets: number;
  change1m: number;
  change1y: number;
  qePace: number;
  treasuries: number;
  mbs: number;
  pctGdp: number;
}

export interface AssetCompositionItem {
  centralBank: string;
  code: string;
  category: string;
  amount: number;
  share: number;
}

export interface QtTimelineEntry {
  month: string;
  fed: number;
  ecb: number;
  boj: number;
  boe: number;
  total: number;
}

export interface BalanceSheetSummary {
  combinedAssets: number;
  ytdChange: number;
  fastestQtPace: string;
  avgPctGdp: number;
  timestamp: string;
}

export interface CentralBankBalanceSheetData {
  summary: BalanceSheetSummary;
  balanceSheets: BalanceSheetEntry[];
  assetComposition: AssetCompositionItem[];
  qtTimeline: QtTimelineEntry[];
}

export function useCentralBankBalanceSheet() {
  return useQuery<CentralBankBalanceSheetData>({
    queryKey: ['central-bank-balance-sheet'],
    queryFn: () => api.get<CentralBankBalanceSheetData>('/central-bank-balance-sheet'),
    staleTime: 2 * 60_000,
  });
}
