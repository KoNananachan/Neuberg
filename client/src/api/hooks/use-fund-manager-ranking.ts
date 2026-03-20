import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

export function useFundManagerRanking() {
  return useQuery({
    queryKey: ['fund-manager-ranking'],
    queryFn: () => api.get<any>('/fund-manager-ranking'),
    staleTime: 60 * 60 * 1000,
  });
}
