import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLuxuryCollectiblesIndex() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['luxury-collectibles-index'],
    queryFn: () => api.get<any>('/luxury-collectibles-index'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
