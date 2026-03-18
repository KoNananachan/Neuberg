import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEsgRatings() {
  return useQuery({
    queryKey: ['esg-ratings'],
    queryFn: () => api.get<any>('/esg-ratings'),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 3 * 60 * 1000,
  });
}
