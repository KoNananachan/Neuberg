import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useLuxuryCollectiblesIndex() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['luxury-collectibles-index'],
    queryFn: () => api.get<any>('/luxury-collectibles-index'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
  return { data, isLoading, refetch };
}
