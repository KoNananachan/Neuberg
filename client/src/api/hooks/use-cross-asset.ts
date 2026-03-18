import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export type AssetCategory = 'equity' | 'fixed_income' | 'commodity' | 'currency' | 'crypto';

export interface CrossAssetQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePct: number;
  category: AssetCategory;
}

export interface CrossAssetResponse {
  assets: CrossAssetQuote[];
  updatedAt: string;
}

export function useCrossAsset() {
  return useQuery({
    queryKey: ['cross-asset'],
    queryFn: () => api.get<CrossAssetResponse>('/cross-asset'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
