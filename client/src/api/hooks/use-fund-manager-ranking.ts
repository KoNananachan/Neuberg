import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundManagerRanking() {
  return useQuery({
    queryKey: ['fund-manager-ranking'],
    queryFn: () => api.get<any>('/fund-manager-ranking'),
    refetchInterval: 30 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
  });
}
