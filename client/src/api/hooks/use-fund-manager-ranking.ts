import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundManagerRanking() {
  return useQuery({
    queryKey: ['fund-manager-ranking'],
    queryFn: () => api.get<any>('/fund-manager-ranking'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
