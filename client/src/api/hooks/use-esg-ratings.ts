import { useQuery } from '@tanstack/react-query';
import { api } from '../client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useEsgRatings() {
  return useQuery({
    queryKey: ['esg-ratings'],
    queryFn: () => api.get<any>('/esg-ratings'),
    staleTime: 60 * 60 * 1000,
  });
}
