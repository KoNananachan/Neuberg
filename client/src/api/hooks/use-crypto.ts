import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export interface CryptoQuote {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  price: number;
  change24h: number;
  change7d: number | null;
  marketCap: number;
  volume24h: number;
  sparkline7d: number[];
  ath: number;
  athChangePercent: number;
  circulatingSupply: number;
  maxSupply: number | null;
}

export interface GlobalData {
  totalMarketCap: number;
  totalVolume24h: number;
  btcDominance: number;
  ethDominance: number;
  activeCryptos: number;
  marketCapChange24h: number;
}

export interface CryptoData {
  coins: CryptoQuote[];
  global: GlobalData | null;
}

export function useCrypto() {
  return useQuery({
    queryKey: ['crypto'],
    queryFn: () => api.get<CryptoData>('/crypto'),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}
